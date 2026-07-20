"""Entry point for local development."""
import os
import uvicorn

if __name__ == "__main__":
    # Run database migrations automatically
    try:
        import alembic.config
        alembic.config.main(argv=["--raiseerr", "upgrade", "head"])
    except Exception as e:
        print(f"Warning: Failed to run migrations: {e}")

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
