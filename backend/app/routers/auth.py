from datetime import timedelta

from fastapi import APIRouter, Request, Response, Depends
from firebase_admin import auth as fb_auth_module

from app.config import settings
from app.deps import get_current_user
from app.firebase_setup import get_auth, get_db
from app.schemas import SignUpRequest, SignInRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/sign-up")
def sign_up(body: SignUpRequest):
    db = get_db()
    user_ref = db.collection("users").document(body.uid)

    if user_ref.get().exists:
        return {"success": False, "message": "User already exists. Please sign in instead."}

    user_ref.set({"name": body.name, "email": body.email})
    return {"success": True, "message": "Account created successfully. Please sign in."}


@router.post("/sign-in")
def sign_in(body: SignInRequest, response: Response):
    auth_client = get_auth()

    try:
        user_record = auth_client.get_user_by_email(body.email)
    except fb_auth_module.UserNotFoundError:
        return {"success": False, "message": "User does not exist. Create an account instead."}

    if not user_record:
        return {"success": False, "message": "User does not exist. Create an account instead."}

    try:
        expires_in = timedelta(days=settings.SESSION_EXPIRES_DAYS)
        session_cookie = auth_client.create_session_cookie(body.idToken, expires_in=expires_in)
    except Exception as e:
        return {"success": False, "message": f"Failed to log into an account: {e}"}

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_cookie,
        max_age=settings.SESSION_EXPIRES_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path="/",
    )
    return {"success": True, "message": "Signed in successfully."}


@router.post("/sign-out")
def sign_out(response: Response):
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    return {"success": True}


@router.get("/me")
def me(request: Request):
    user = get_current_user(request)
    return {"user": user}
