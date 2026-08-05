from typing import List, Optional
from pydantic import BaseModel


class SignUpRequest(BaseModel):
    uid: str
    name: str
    email: str


class SignInRequest(BaseModel):
    email: str
    idToken: str


class GenerateInterviewRequest(BaseModel):
    role: str
    level: str
    company: Optional[str] = None
    type: Optional[str] = "Mixed"  # kept for display/back-compat; rounds always cover technical + behavioral
    techstack: str  # comma separated string, same as the original app
    amount: int
    aptitudeCount: Optional[int] = 10  # must be 10, 25, or 60 - snapped to nearest by the caller
    userid: str


class TranscriptMessage(BaseModel):
    role: str
    content: str


class TurnTransitionRequest(BaseModel):
    previousQuestion: Optional[str] = None
    previousAnswer: Optional[str] = None
    nextQuestion: str
    mode: Optional[str] = "interview"  # "interview" | "setup" | "technical" | "behavioral"


class CreateFeedbackRequest(BaseModel):
    interviewId: str
    userId: str
    transcript: List[TranscriptMessage]
    feedbackId: Optional[str] = None


class FullFeedbackRequest(BaseModel):
    """Combined feedback across all 3 rounds of a rounded interview."""
    interviewId: str
    userId: str
    aptitudeScore: int
    aptitudeTotal: int
    technicalTranscript: List[TranscriptMessage] = []
    behavioralTranscript: List[TranscriptMessage] = []
    feedbackId: Optional[str] = None


class CategoryScore(BaseModel):
    name: str
    score: int
    comment: str


class Feedback(BaseModel):
    id: str
    interviewId: str
    userId: str
    totalScore: int
    roundScores: Optional[dict] = None  # {"aptitude": int, "technical": int, "behavioral": int}
    categoryScores: List[CategoryScore]
    strengths: List[str]
    areasForImprovement: List[str]
    finalAssessment: str
    createdAt: str


class AptitudeQuestion(BaseModel):
    question: str
    options: List[str]
    correctIndex: int


class AptitudeRound(BaseModel):
    questions: List[AptitudeQuestion]
    timePerQuestionSeconds: int = 60


class TextRound(BaseModel):
    questions: List[str]


class InterviewRounds(BaseModel):
    aptitude: AptitudeRound
    technical: TextRound
    behavioral: TextRound


class Interview(BaseModel):
    id: str
    role: str
    level: str
    company: Optional[str] = None
    type: str
    techstack: List[str]
    questions: List[str]
    rounds: Optional[InterviewRounds] = None
    userId: str
    finalized: bool
    coverImage: str
    createdAt: str


class User(BaseModel):
    id: str
    name: str
    email: str
