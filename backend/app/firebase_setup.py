"""
Initializes firebase-admin (Auth + Firestore) exactly the way the old
firebase/admin.ts did, just in Python.

Keeps the SAME data model as the original app:
  - collection "users"   -> { name, email }  (doc id = firebase uid)
  - collection "interviews" -> { role, type, level, techstack, questions,
                                  userId, finalized, coverImage, createdAt }
  - collection "feedback"   -> { interviewId, userId, totalScore,
                                  categoryScores, strengths,
                                  areasForImprovement, finalAssessment,
                                  createdAt }
"""
import json

import firebase_admin
from firebase_admin import credentials, auth, firestore

from app.config import settings


def _build_credentials():
    if settings.FIREBASE_SERVICE_ACCOUNT_FILE:
        return credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_FILE)

    if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
        private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
        cert_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        return credentials.Certificate(cert_dict)

    raise RuntimeError(
        "Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_FILE "
        "or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in your .env"
    )


def init_firebase():
    """Lazily initializes firebase-admin so the server can still boot (and
    e.g. serve /health) even before Firebase credentials are configured."""
    if not firebase_admin._apps:
        cred = _build_credentials()
        firebase_admin.initialize_app(cred)


def get_auth():
    init_firebase()
    return auth


def get_db():
    init_firebase()
    return firestore.client()
