"""
Free, no-API-key text-to-speech using edge-tts (Microsoft Edge's neural
voice engine, used unofficially - the same voices behind Edge's "Read Aloud").
This is what actually fixes the "robotic" voice complaint: browser
speechSynthesis defaults to low-quality voices, these are the same neural
voices behind commercial products.

If this endpoint is unreachable (no internet, corporate firewall, etc.) the
frontend automatically falls back to the browser's built-in speechSynthesis,
so voice always works - it just sounds better here when available.
"""
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

import edge_tts

router = APIRouter(prefix="/api/tts", tags=["tts"])

# One voice per interviewer persona so each round has a distinct, consistent voice.
VOICE_BY_MODE = {
    "setup": "en-US-AriaNeural",
    "technical": "en-US-GuyNeural",
    "behavioral": "en-US-JennyNeural",
    "interview": "en-US-JennyNeural",
}


class TTSRequest(BaseModel):
    text: str
    mode: str = "interview"


@router.post("")
async def synthesize_speech(body: TTSRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    voice = VOICE_BY_MODE.get(body.mode, VOICE_BY_MODE["interview"])

    try:
        communicate = edge_tts.Communicate(body.text, voice=voice)
        audio_bytes = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes.extend(chunk["data"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS generation failed: {e}")

    if not audio_bytes:
        raise HTTPException(status_code=502, detail="TTS produced no audio")

    return Response(content=bytes(audio_bytes), media_type="audio/mpeg")
