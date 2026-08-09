from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, interviews, tts

app = FastAPI(title="PrepWise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(interviews.router)
app.include_router(tts.router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def home():
    return {"message": "Prepzi AI API running successfully!"}
