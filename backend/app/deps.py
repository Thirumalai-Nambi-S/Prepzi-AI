from fastapi import Request, HTTPException

from app.config import settings
from app.firebase_setup import get_auth, get_db


def get_current_user(request: Request) -> dict | None:
    """Same behaviour as the old getCurrentUser() server action: reads the
    'session' cookie, verifies it with Firebase, and loads the user doc from
    Firestore. Returns None (not an error) if there's no valid session -
    routes decide whether that's acceptable."""
    session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_cookie:
        return None

    try:
        decoded_claims = get_auth().verify_session_cookie(session_cookie, check_revoked=True)
        uid = decoded_claims["uid"]
        user_doc = get_db().collection("users").document(uid).get()
        if not user_doc.exists:
            return None
        data = user_doc.to_dict()
        return {"id": uid, "name": data.get("name"), "email": data.get("email")}
    except Exception:
        return None


def require_current_user(request: Request) -> dict:
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
