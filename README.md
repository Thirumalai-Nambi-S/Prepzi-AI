# PrepWise — FastAPI + Next.js Mock Interview Platform

This is a rewrite of the original Next.js-only PrepWise app:

| Piece              | Before                          | Now                                                              |
|---------------------|----------------------------------|-------------------------------------------------------------------|
| Backend             | Next.js server actions + API route | **FastAPI** (Python) — `/backend`                                  |
| Question generation | Google Gemini                   | **Groq** (`llama-3.3-70b-versatile`, OpenAI-compatible SDK)         |
| Feedback generation | (was only a TODO stub)          | **Groq**, fully implemented                                       |
| Voice interview     | VAPI                             | **Browser Web Speech API** (`SpeechRecognition` + `SpeechSynthesis`) — free, no signup, no API key |
| Database / Auth     | Firebase (Firestore + Auth)      | **Unchanged** — same Firebase project, same collections, just called from Python instead of Node |
| Frontend            | Next.js (App Router)             | **Next.js** (App Router), now a pure client talking to the FastAPI backend |

The Firestore data model is untouched: `users`, `interviews`, and a new `feedback` collection (the old app never actually finished this part — `Agent.tsx` had a `TODO: Create a server action that generates feedback`, and `getFeedbackByInterviewId` didn't exist yet).

## How the 5 flows map to the new code

1. **Sign up / sign in** — `components/AuthForm.tsx` uses the Firebase **client** SDK to create/verify the user, then calls the FastAPI backend (`/api/auth/sign-up`, `/api/auth/sign-in`) which writes the Firestore `users` doc and issues an httpOnly session cookie (same mechanism as before, just implemented with `firebase-admin` for Python).
2. **Create Interview** — `/interview` page renders `<Agent type="generate" />`. Tapping **Call** starts a voice wizard (Web Speech API) that asks for role → experience level → target company → interview type → tech stack → number of questions, then calls `POST /api/interviews/generate`, which asks Groq for the questions and stores the interview in Firestore. It then shows up under **Your Interviews**.
3. **Take an Interview** (yours or someone else's) — `/interview/[id]` renders `<Agent type="interview" questions={...} />`, which reads each question aloud and records your spoken answer.
4. **Storage** — identical Firestore collections/fields as the original app (`interviews.userId`, `.finalized`, `.techstack`, etc.), just written via the Python `firebase-admin` SDK instead of the Node one.
5. **Feedback** — when the interview ends, the full transcript is sent to `POST /api/interviews/{id}/feedback`, which asks Groq to score Communication, Technical Knowledge, Problem Solving, Cultural Fit, and Confidence/Clarity, plus strengths, areas for improvement, and a final written assessment. It's stored in Firestore and rendered on the new `/interview/[id]/feedback` page.

## 1. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Firebase Admin credentials (required — this is what lets the Python backend read/write Firestore and verify sessions):

1. Firebase Console → your `prepwise-991e9` project → **Project settings → Service accounts → Generate new private key**.
2. Save the downloaded JSON as `backend/firebase-service-account.json`.
3. `.env` already points `FIREBASE_SERVICE_ACCOUNT_FILE=./firebase-service-account.json` at it. (Alternatively fill in `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` directly, useful for deployment platforms that don't like file uploads.)

`GROQ_API_KEY` is already filled in `backend/.env` with the key you gave me. **Since that key was pasted into this chat, treat it as exposed — generate a fresh one at https://console.groq.com/keys and swap it in before you rely on this for anything real.**

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` for interactive API docs.

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`. The Next dev server proxies `/api/*` to `http://localhost:8000` (configured in `next.config.ts`), so the session cookie set by FastAPI works seamlessly in the browser.

Firebase **client** config (in `firebase/client.ts`) is unchanged from the original app — it's public config, not a secret, so it's fine as-is.

## 3. Voice interview notes

- Uses the browser's native `SpeechRecognition` (STT) and `speechSynthesis` (TTS) — **completely free, no API key, no signup**.
- Works best in **Chrome or Edge on desktop**. Safari/Firefox have partial/no `SpeechRecognition` support as of early 2026 — the UI will show a fallback message if unsupported.
- Requires microphone permission in the browser.
- If you'd rather have a more robust/cross-browser voice pipeline later, the natural free-tier upgrades are: Deepgram (free STT tier) or AssemblyAI (free STT tier) + `edge-tts` (free, unofficial Microsoft Edge TTS) or ElevenLabs' free tier for TTS. The current architecture keeps `lib/useVoiceAgent.ts` as a single swappable module if you want to do that later.

## 4. What changed vs. the original app, in detail

- Removed: `@vapi-ai/web`, `@ai-sdk/google`, `ai`, `firebase-admin` (moved to the Python backend) from `package.json`.
- Removed: `app/api/vapi/generate/route.ts`, `lib/vapi.sdk.ts`, `lib/actions/*`, `firebase/admin.ts`, `types/vapi.d.ts`.
- Added: `backend/` (FastAPI), `lib/api.ts`, `lib/useVoiceAgent.ts`, `app/(root)/interview/[id]/feedback/page.tsx` (didn't exist before).
- Fixed a couple of pre-existing bugs while porting: a duplicate `type` prop passed to `<Agent />` in the interview page, and `InterviewCard` always rendering `feedback = null`.
- Added an optional `company` field end-to-end (interview generation request → Groq prompt → Firestore → UI), since you asked for it to be part of the interview-creation conversation.
