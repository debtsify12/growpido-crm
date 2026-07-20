from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserResponse
from app.core.auth import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

from pydantic import BaseModel, EmailStr
from app.services.email import send_password_reset_email
from app.core.auth import get_password_hash
from datetime import timedelta

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user and user.is_active:
        # Create a special token that expires in 2 days
        reset_token = create_access_token({"sub": user.id, "type": "reset"}, expires_delta=timedelta(days=2))
        # In a background task or directly send email
        send_password_reset_email(user.email, reset_token)
    
    # Always return success to prevent email enumeration
    return {"message": "If an account exists, a reset link has been sent."}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    from app.core.auth import ALGORITHM, SECRET_KEY
    from jose import jwt, JWTError

    try:
        payload_data = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload_data.get("sub")
        token_type: str = payload_data.get("type")
        if user_id is None or token_type != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}
