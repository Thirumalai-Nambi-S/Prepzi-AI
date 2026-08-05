import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.deps import require_current_user, get_current_user
from app.firebase_setup import get_db
from app.groq_client import (
    generate_interview_questions,
    generate_aptitude_questions,
    generate_feedback,
    generate_turn_transition,
)
from app.schemas import GenerateInterviewRequest, CreateFeedbackRequest, TurnTransitionRequest, FullFeedbackRequest

APTITUDE_QUESTION_COUNT = 10

router = APIRouter(prefix="/api/interviews", tags=["interviews"])

INTERVIEW_COVERS = [
    "/covers/adobe.png",
    "/covers/amazon.png",
    "/covers/facebook.png",
    "/covers/hostinger.png",
    "/covers/pinterest.png",
    "/covers/quora.png",
    "/covers/reddit.png",
    "/covers/skype.png",
    "/covers/spotify.png",
    "/covers/telegram.png",
    "/covers/tiktok.png",
    "/covers/yahoo.png",
]


def get_random_cover() -> str:
    return random.choice(INTERVIEW_COVERS)


def _serialize(doc) -> dict:
    data = doc.to_dict()
    data["id"] = doc.id
    return data


@router.post("/generate")
def generate_interview(body: GenerateInterviewRequest):
    """Builds a full 3-round interview:
    - Round 1: quantitative aptitude MCQs (fixed default of 10, timed)
    - Round 2: technical questions (professional tone)
    - Round 3: behavioral questions (HR tone)
    Round 2 and 3 each get `amount` questions, same as the original single-round behavior."""
    allowed_counts = (10, 25, 60)
    aptitude_count = body.aptitudeCount if body.aptitudeCount in allowed_counts else APTITUDE_QUESTION_COUNT
    try:
        aptitude_questions = generate_aptitude_questions(amount=aptitude_count, role=body.role)
        technical_questions = generate_interview_questions(
            role=body.role,
            level=body.level,
            type_="Technical",
            techstack=body.techstack,
            amount=body.amount,
            company=body.company,
        )
        behavioral_questions = generate_interview_questions(
            role=body.role,
            level=body.level,
            type_="Behavioural",
            techstack=body.techstack,
            amount=body.amount,
            company=body.company,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {e}")

    interview = {
        "role": body.role,
        "type": "Mixed",
        "level": body.level,
        "company": body.company,
        "techstack": [t.strip() for t in body.techstack.split(",") if t.strip()],
        # Legacy flat field, kept for anything still reading it directly.
        "questions": technical_questions + behavioral_questions,
        "rounds": {
            "aptitude": {"questions": aptitude_questions, "timePerQuestionSeconds": 60},
            "technical": {"questions": technical_questions},
            "behavioral": {"questions": behavioral_questions},
        },
        "userId": body.userid,
        "finalized": True,
        "coverImage": get_random_cover(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    db = get_db()
    _, doc_ref = db.collection("interviews").add(interview)
    interview["id"] = doc_ref.id

    return {"success": True, "interview": interview}


@router.get("/mine")
def get_my_interviews(user: dict = Depends(require_current_user)):
    db = get_db()
    docs = db.collection("interviews").where("userId", "==", user["id"]).stream()
    interviews = [_serialize(d) for d in docs]
    interviews.sort(key=lambda i: i.get("createdAt", ""), reverse=True)
    return {"interviews": interviews}


@router.get("/latest")
def get_latest_interviews(limit: int = 20, user: dict = Depends(require_current_user)):
    db = get_db()
    docs = db.collection("interviews").where("finalized", "==", True).stream()
    interviews = [_serialize(d) for d in docs if d.to_dict().get("userId") != user["id"]]
    interviews.sort(key=lambda i: i.get("createdAt", ""), reverse=True)
    return {"interviews": interviews[:limit]}


@router.get("/attended")
def get_attended_interviews(user: dict = Depends(require_current_user)):
    """Every interview this user has ever completed - regardless of whether
    they created it or someone else did - deduped to one card per interview
    (keeping the most recent feedback if they retook it)."""
    db = get_db()
    feedback_docs = db.collection("feedback").where("userId", "==", user["id"]).stream()
    feedbacks = [_serialize(d) for d in feedback_docs]
    feedbacks.sort(key=lambda f: f.get("createdAt", ""), reverse=True)

    seen_interview_ids: set[str] = set()
    attended = []
    for fb in feedbacks:
        interview_id = fb.get("interviewId")
        if not interview_id or interview_id in seen_interview_ids:
            continue
        seen_interview_ids.add(interview_id)

        doc = db.collection("interviews").document(interview_id).get()
        if not doc.exists:
            continue
        attended.append({"interview": _serialize(doc), "feedback": fb})

    return {"attended": attended}


@router.post("/turn-transition")
def turn_transition(body: TurnTransitionRequest):
    """Called between questions during a live interview so the AI reacts to
    the candidate's last answer instead of just reading the next question."""
    text = generate_turn_transition(body.previousQuestion, body.previousAnswer, body.nextQuestion, body.mode or "interview")
    return {"text": text}


@router.get("/{interview_id}")
def get_interview(interview_id: str):
    db = get_db()
    doc = db.collection("interviews").document(interview_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"interview": _serialize(doc)}


@router.post("/{interview_id}/feedback")
def create_feedback(interview_id: str, body: CreateFeedbackRequest):
    """Generates genuine, structured feedback from the interview transcript
    using Groq, then stores/updates it in the 'feedback' collection."""
    if body.interviewId != interview_id:
        raise HTTPException(status_code=400, detail="interviewId mismatch")

    if not body.transcript:
        raise HTTPException(status_code=400, detail="Empty transcript, nothing to grade")

    try:
        feedback_data = generate_feedback([m.model_dump() for m in body.transcript])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback generation failed: {e}")

    feedback_doc = {
        "interviewId": interview_id,
        "userId": body.userId,
        "totalScore": feedback_data["totalScore"],
        "categoryScores": feedback_data["categoryScores"],
        "strengths": feedback_data["strengths"],
        "areasForImprovement": feedback_data["areasForImprovement"],
        "finalAssessment": feedback_data["finalAssessment"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    db = get_db()
    if body.feedbackId:
        ref = db.collection("feedback").document(body.feedbackId)
        ref.set(feedback_doc)
        feedback_id = body.feedbackId
    else:
        _, ref = db.collection("feedback").add(feedback_doc)
        feedback_id = ref.id

    feedback_doc["id"] = feedback_id
    return {"success": True, "feedback": feedback_doc}


@router.post("/{interview_id}/full-feedback")
def create_full_feedback(interview_id: str, body: FullFeedbackRequest):
    """Combines all 3 rounds into one feedback report:
    - Aptitude: objective score, already graded client-side, passed in.
    - Technical / Behavioral: graded here via Groq from their transcripts.
    Weighting: aptitude 20%, technical 45%, behavioral 35% - the two live
    rounds count for more, same as a real hiring process would weight them."""
    if body.interviewId != interview_id:
        raise HTTPException(status_code=400, detail="interviewId mismatch")

    try:
        tech_feedback = (
            generate_feedback([m.model_dump() for m in body.technicalTranscript], round_context="technical")
            if body.technicalTranscript
            else None
        )
        beh_feedback = (
            generate_feedback([m.model_dump() for m in body.behavioralTranscript], round_context="behavioral")
            if body.behavioralTranscript
            else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback generation failed: {e}")

    aptitude_pct = round((body.aptitudeScore / body.aptitudeTotal) * 100) if body.aptitudeTotal else 0
    technical_score = tech_feedback["totalScore"] if tech_feedback else 0
    behavioral_score = beh_feedback["totalScore"] if beh_feedback else 0
    total_score = round(aptitude_pct * 0.20 + technical_score * 0.45 + behavioral_score * 0.35)

    category_scores = []
    if tech_feedback:
        category_scores += [
            {"name": f"Technical Round - {c['name']}", "score": c["score"], "comment": c["comment"]}
            for c in tech_feedback["categoryScores"]
        ]
    if beh_feedback:
        category_scores += [
            {"name": f"Behavioral Round - {c['name']}", "score": c["score"], "comment": c["comment"]}
            for c in beh_feedback["categoryScores"]
        ]

    strengths = (tech_feedback["strengths"] if tech_feedback else []) + (
        beh_feedback["strengths"] if beh_feedback else []
    )
    improvements = (tech_feedback["areasForImprovement"] if tech_feedback else []) + (
        beh_feedback["areasForImprovement"] if beh_feedback else []
    )

    final_parts = [f"Aptitude round: scored {body.aptitudeScore} out of {body.aptitudeTotal} ({aptitude_pct}/100)."]
    if tech_feedback:
        final_parts.append(f"Technical round: {tech_feedback['finalAssessment']}")
    if beh_feedback:
        final_parts.append(f"Behavioral round: {beh_feedback['finalAssessment']}")

    feedback_doc = {
        "interviewId": interview_id,
        "userId": body.userId,
        "totalScore": total_score,
        "roundScores": {
            "aptitude": aptitude_pct,
            "technical": technical_score,
            "behavioral": behavioral_score,
        },
        "categoryScores": category_scores,
        "strengths": strengths,
        "areasForImprovement": improvements,
        "finalAssessment": " ".join(final_parts),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    db = get_db()
    if body.feedbackId:
        ref = db.collection("feedback").document(body.feedbackId)
        ref.set(feedback_doc)
        feedback_id = body.feedbackId
    else:
        _, ref = db.collection("feedback").add(feedback_doc)
        feedback_id = ref.id

    feedback_doc["id"] = feedback_id
    return {"success": True, "feedback": feedback_doc}


@router.get("/{interview_id}/feedback")
def get_feedback(interview_id: str, userId: str):
    db = get_db()
    docs = (
        db.collection("feedback")
        .where("interviewId", "==", interview_id)
        .where("userId", "==", userId)
        .limit(1)
        .stream()
    )
    docs = list(docs)
    if not docs:
        return {"feedback": None}
    return {"feedback": _serialize(docs[0])}
