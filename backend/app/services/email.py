import smtplib
from email.message import EmailMessage
from typing import Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, html_body: Optional[str] = None):
    if not settings.SMTP_SERVER:
        logger.warning(f"SMTP not configured. Skipping email to {to_email}. Subject: {subject}")
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = to_email

    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")

def send_password_reset_email(to_email: str, reset_token: str):
    subject = "Reset Your Growpido CRM Password"
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    body = f"Hello,\n\nPlease use the following link to reset your password:\n{reset_link}\n\nIf you did not request a password reset, please ignore this email.\n\nGrowpido Team"
    
    html_body = f"""
    <html>
      <body style="font-family: 'Inter', sans-serif; color: #1A1A2E; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <p style="margin: 25px 0;">
            <a href="{reset_link}" style="background-color: #0A2463; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        <p>Best regards,<br>The Growpido Team</p>
      </body>
    </html>
    """
    
    send_email(to_email, subject, body, html_body)

def send_task_assignment_email(to_email: str, task_title: str, lead_name: Optional[str] = None):
    subject = f"New Task Assigned: {task_title}"
    
    lead_text = f" for lead '{lead_name}'" if lead_name else ""
    body = f"Hello,\n\nYou have been assigned a new task: '{task_title}'{lead_text}.\n\nPlease log in to your Growpido CRM dashboard to view the details.\n\nGrowpido Team"
    
    html_body = f"""
    <html>
      <body style="font-family: 'Inter', sans-serif; color: #1A1A2E; padding: 20px;">
        <h2>New Task Assigned</h2>
        <p>Hello,</p>
        <p>You have been assigned a new task: <strong>{task_title}</strong>{lead_text}.</p>
        <p style="margin: 25px 0;">
            <a href="{settings.FRONTEND_URL}/tasks" style="background-color: #0A2463; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Tasks</a>
        </p>
        <p>Best regards,<br>The Growpido Team</p>
      </body>
    </html>
    """
    
    send_email(to_email, subject, body, html_body)

def send_new_user_credentials_email(to_email: str, user_name: str, raw_password: str):
    subject = "Welcome to Growpido CRM - Your Account Details"
    
    body = f"Hello {user_name},\n\nAn administrator has created a Growpido CRM account for you.\n\nYour login details are:\nEmail: {to_email}\nPassword: {raw_password}\n\nPlease log in at {settings.FRONTEND_URL} and change your password immediately.\n\nGrowpido Team"
    
    html_body = f"""
    <html>
      <body style="font-family: 'Inter', sans-serif; color: #1A1A2E; padding: 20px;">
        <h2>Welcome to Growpido CRM</h2>
        <p>Hello {user_name},</p>
        <p>An administrator has set up your account. Here are your temporary login credentials:</p>
        <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> {to_email}</p>
            <p style="margin: 0;"><strong>Password:</strong> {raw_password}</p>
        </div>
        <p style="color: #DC2626; font-size: 14px;"><strong>Important:</strong> Please change your password immediately after logging in.</p>
        <p style="margin: 25px 0;">
            <a href="{settings.FRONTEND_URL}/login" style="background-color: #0A2463; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
        </p>
        <p>Best regards,<br>The Growpido Team</p>
      </body>
    </html>
    """
    
    send_email(to_email, subject, body, html_body)
