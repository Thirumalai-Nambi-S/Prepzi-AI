import os
from dotenv import load_dotenv

# override=True: .env should always win over a stale value that might already
# be sitting in the shell/OS environment (e.g. from an old `export GROQ_MODEL=...`
# left over from before this model was deprecated) - otherwise updating .env
# silently does nothing and the app keeps hitting the dead model.
load_dotenv(override=True)


class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    # llama-3.3-70b-versatile was decommissioned by Groq (June 2026) - openai/gpt-oss-120b
    # is Groq's recommended replacement (see https://console.groq.com/docs/deprecations).
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    FIREBASE_SERVICE_ACCOUNT_FILE: str | None = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE") or None
    FIREBASE_PROJECT_ID: str | None = os.getenv("FIREBASE_PROJECT_ID") or None
    FIREBASE_CLIENT_EMAIL: str | None = os.getenv("FIREBASE_CLIENT_EMAIL") or None
    FIREBASE_PRIVATE_KEY: str | None = os.getenv("FIREBASE_PRIVATE_KEY") or None

    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "session")
    SESSION_EXPIRES_DAYS: int = int(os.getenv("SESSION_EXPIRES_DAYS", "7"))

    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()
    ]

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")


settings = Settings()
