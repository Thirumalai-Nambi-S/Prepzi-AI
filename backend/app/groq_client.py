"""
Replaces the old `generateText({ model: google('gemini-2.0-flash-001') })`
calls with Groq's OpenAI-compatible chat completion API.
"""
import json
import re

from groq import Groq

from app.config import settings

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set in the backend .env file")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


# Known-good models to fall back to, in order, if the configured model is
# ever unavailable (deprecated, decommissioned, wrong access tier, a typo in
# .env, etc). This is what actually keeps question/feedback generation
# working even if Groq changes its lineup again in the future - a single bad
# model string no longer takes down the whole app.
_FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
]

_MODEL_ISSUE_MARKERS = (
    "model_not_found",
    "does not exist",
    "decommissioned",
    "model_decommissioned",
    "invalid_request_error",
)


def _create_completion(**kwargs):
    """Wraps `client.chat.completions.create`, trying the configured
    GROQ_MODEL first and automatically retrying with known-good fallback
    models if the configured one turns out to be unavailable. Any other kind
    of error (rate limit, network, bad prompt, etc.) is raised immediately
    without wasting retries on a problem that swapping models won't fix."""
    client = get_client()
    candidates = [settings.GROQ_MODEL] + [m for m in _FALLBACK_MODELS if m != settings.GROQ_MODEL]

    last_error: Exception | None = None
    for model in candidates:
        try:
            return client.chat.completions.create(model=model, **kwargs)
        except Exception as e:
            message = str(e).lower()
            last_error = e
            if any(marker in message for marker in _MODEL_ISSUE_MARKERS):
                continue  # try the next candidate model
            raise
    raise last_error  # every candidate failed for model-availability reasons


def _extract_json(text: str):
    """Groq sometimes wraps JSON in prose or code fences - pull the JSON out."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # Fallback: grab the first [...] or {...} block
    start_candidates = [i for i in (text.find("["), text.find("{")) if i != -1]
    if start_candidates and not (text.startswith("[") or text.startswith("{")):
        start = min(start_candidates)
        end = max(text.rfind("]"), text.rfind("}")) + 1
        text = text[start:end]
    return json.loads(text)


def generate_interview_questions(
    role: str, level: str, type_: str, techstack: str, amount: int, company: str | None = None
) -> list[str]:
    company_line = f"The target company is {company}.\n" if company else ""
    prompt = f"""Prepare questions for a job interview.
The job role is {role}.
The job experience level is {level}.
{company_line}The tech stack used in the job is: {techstack}.
The focus between behavioural and technical questions should lean towards: {type_}.
The amount of questions required is: {amount}.
Please return only the questions, without any additional text.
The questions are going to be read out loud by a voice assistant, so do not use "/" or "*" or any other special characters which might break the voice assistant.
Return ONLY a raw JSON array of strings, formatted exactly like this, and nothing else:
["Question 1", "Question 2", "Question 3"]
"""
    completion = _create_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    text = completion.choices[0].message.content
    questions = _extract_json(text)
    if not isinstance(questions, list):
        raise ValueError("Groq did not return a JSON array of questions")
    return [str(q) for q in questions]


def _generate_aptitude_batch(amount: int, role: str) -> list[dict]:
    """Round 1: quantitative/logical aptitude MCQs, used as a timed pre-screen
    before the technical and behavioral rounds - similar to what real
    hiring pipelines (and campus placement tests like TCS NQT, Infosys, etc.)
    run before the interview proper. Pitched at genuine moderate-to-hard
    difficulty, not simple arithmetic."""
    prompt = f"""Generate {amount} multiple-choice quantitative aptitude questions to use as a timed pre-screening
test before a job interview for a {role} position, at the difficulty level of a real corporate campus placement
aptitude test (like TCS NQT, Infosys, Accenture, or Amazon OA quant sections) - moderately hard, not trivial
arithmetic.

Draw from a genuine mix of these topics, varying across the set (don't repeat the same topic more than 2-3 times):
- Percentages, profit & loss, and successive discounts (multi-step, not one-liners)
- Ratio & proportion, mixtures and alligations
- Time, speed & distance and time & work (including relative speed, pipes and cisterns)
- Simple and compound interest
- Permutations, combinations, and basic probability
- Number series, pattern completion, and logical/coding-decoding puzzles
- Data interpretation from a short described table or scenario (described in words, since this is read aloud/displayed as text)

Each question should require 2-3 steps of reasoning to solve, not be answerable by inspection, but still be solvable
without a calculator in under a minute by someone who knows the method. Avoid trick questions with ambiguous wording.

Return ONLY a raw JSON array, formatted exactly like this and nothing else:
[
  {{"question": "...", "options": ["option A", "option B", "option C", "option D"], "correctIndex": 0}},
  ...
]
Each question must have exactly 4 options, with plausible distractors (not obviously wrong). correctIndex is the
0-based index of the correct option. Do not use "/" or "*" or other symbols that would break text-to-speech if read aloud.
"""
    completion = _create_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
    )
    text = completion.choices[0].message.content
    questions = _extract_json(text)
    if not isinstance(questions, list):
        raise ValueError("Groq did not return a JSON array of aptitude questions")

    cleaned = []
    for q in questions:
        options = [str(o) for o in q.get("options", [])][:4]
        while len(options) < 4:
            options.append("N/A")
        try:
            correct_index = int(q.get("correctIndex", 0))
        except (TypeError, ValueError):
            correct_index = 0
        correct_index = max(0, min(3, correct_index))
        cleaned.append({"question": str(q.get("question", "")), "options": options, "correctIndex": correct_index})
    return cleaned


def generate_aptitude_questions(amount: int, role: str) -> list[dict]:
    """Generates `amount` aptitude questions, batching into chunks of <=20 for
    larger counts (e.g. 60) so a single Groq completion doesn't risk getting
    truncated mid-JSON."""
    BATCH_SIZE = 20
    if amount <= BATCH_SIZE:
        return _generate_aptitude_batch(amount, role)

    questions: list[dict] = []
    remaining = amount
    while remaining > 0:
        batch_amount = min(BATCH_SIZE, remaining)
        questions.extend(_generate_aptitude_batch(batch_amount, role))
        remaining -= batch_amount
    return questions


def generate_turn_transition(
    previous_question: str | None, previous_answer: str | None, next_question: str, mode: str = "interview"
) -> str:
    """Generates a short, natural spoken reaction to the candidate's last answer
    before moving on to the next question - this is what makes the interview
    (or the interview-setup conversation) feel like a conversation instead of
    a fixed script being read aloud."""
    if not previous_answer:
        return next_question

    if mode == "setup":
        persona = (
            "You are a friendly, professional recruiting coordinator on a LIVE voice call, "
            "collecting a few quick details so you can put together a mock interview for the candidate."
        )
        reaction_hint = (
            'Briefly and naturally acknowledge what they told you in a few words (e.g. repeat back the key '
            'detail so they know you caught it, vary the phrasing each time - don\'t just say "got it" every time).'
        )
    elif mode == "technical":
        persona = (
            "You are a sharp, professional technical interviewer conducting the LIVE technical round of a job "
            "interview. You keep a focused, competent, no-nonsense but respectful tone - like a senior engineer "
            "running a real technical screen."
        )
        reaction_hint = (
            'Briefly and naturally react to the technical substance of their answer in 1 short sentence '
            '(acknowledge something specific and correct, or note a gap without being harsh - vary your reactions).'
        )
    elif mode == "behavioral":
        persona = (
            "You are a warm, empathetic HR interviewer conducting the LIVE behavioral round of a job interview, "
            "focused on past experiences, soft skills, and cultural fit. Your tone is personable and encouraging, "
            "the way a good HR partner puts a candidate at ease."
        )
        reaction_hint = (
            'Briefly and naturally react to what they shared in 1 short sentence, showing you were listening '
            '(vary your reactions - it is fine to reflect back a feeling or theme from their story).'
        )
    else:
        persona = "You are a warm, professional AI job interviewer conducting a LIVE voice interview."
        reaction_hint = (
            'Briefly and naturally react to their answer in 1 short sentence (genuine, specific if possible, '
            'never generic filler like "great answer" every time - vary your reactions, and it\'s fine to ask '
            'a very short natural follow-up remark instead of pure praise).'
        )

    prompt = f"""{persona}
You just asked: "{previous_question}"
The candidate answered: "{previous_answer}"

Write what you would say next, out loud, right now. It should:
- {reaction_hint}
- Then smoothly transition into asking this next question, rephrased slightly so it doesn't sound copy-pasted: "{next_question}"
- Total length: 1-2 short sentences, under 35 words total.
- No stage directions, no quotation marks, no labels like "Interviewer:" - return ONLY the exact words to be spoken aloud.
- Do not use "/" or "*" or other symbols that break voice synthesis.
"""
    try:
        completion = _create_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=80,
        )
        text = completion.choices[0].message.content.strip().strip('"')
        return text or next_question
    except Exception:
        # If Groq hiccups mid-interview, don't stall the interview - fall back to the raw question.
        return next_question


FEEDBACK_CATEGORIES = [
    "Communication Skills",
    "Technical Knowledge",
    "Problem Solving",
    "Cultural Fit",
    "Confidence and Clarity",
]


def generate_feedback(transcript: list[dict], round_context: str = "") -> dict:
    # Number the exchanges so the model can point back at "Q3" etc. instead of
    # paraphrasing vaguely, and so we can sanity-check it actually engaged with content.
    lines = []
    q_num = 0
    for m in transcript:
        if m["role"] in ("assistant", "interviewer", "system"):
            q_num += 1
            lines.append(f"[Q{q_num}] Interviewer: {m['content']}")
        else:
            lines.append(f"      Candidate: {m['content']}")
    formatted_transcript = "\n".join(lines)
    context_line = f"This transcript is from the {round_context} round specifically.\n" if round_context else ""

    prompt = f"""You are a senior hiring manager reviewing a mock interview transcript. Your feedback will be read
directly by the candidate, so it must be specific enough that they know EXACTLY what they did well or wrong and
what to do differently next time. Generic, one-line verdicts like "lacked clarity" or "limited understanding" are
useless and NOT acceptable - every comment must be traceable to something concrete that was actually said in the
transcript below.
{context_line}
Transcript (questions are tagged [Q1], [Q2], ... in the order they were asked):
{formatted_transcript}

For EACH of the 5 categories below, write a comment of 3-5 sentences that:
1. References at least one specific question (by its topic or [Q#] tag) and briefly states what the candidate
   actually answered (paraphrase, don't invent details that aren't in the transcript).
2. Names precisely what was missing, wrong, or weak in that answer - e.g. which concept they misunderstood, which
   step of reasoning they skipped, which part of the question they never addressed, or how their delivery fell
   short (rambling, no structure, over-hedging, one-word answers, etc).
3. Gives one concrete, actionable suggestion for how they could improve that specific answer or skill next time
   (not generic advice like "be more confident" - say what to actually do, e.g. "structure answers using
   situation-task-action-result" or "review how binary search partitions the array before the interview").
4. If the candidate genuinely did well on that category, say so specifically (cite what made it good) rather than
   forcing criticism - but if the transcript shows they engaged barely or not at all (one-word, off-topic, or empty
   answers), say that plainly and score accordingly low; do not soften it.

Categories to score 0-100 with a detailed comment as described above:
- Communication Skills: Clarity, articulation, structure of responses.
- Technical Knowledge: Accuracy and depth of understanding of concepts relevant to the role.
- Problem Solving: Ability to break down problems, reason through tradeoffs, and reach solutions.
- Cultural Fit: Alignment with the role and any values/motivation signals shown in their answers.
- Confidence and Clarity: Composure, engagement, and directness in how they answered under pressure.

Also produce:
- "strengths": 2-4 bullet points, each citing a SPECIFIC moment or answer that was genuinely strong (name the
  topic/question). If nothing was genuinely strong, it is fine to return fewer items or note that no clear
  strengths stood out this round - do not invent generic praise.
- "areasForImprovement": 3-5 bullet points, each naming a specific, actionable fix tied to something that actually
  happened in the transcript (e.g. "When asked about X in [Q2], you didn't mention Y - review Z before your next
  interview" rather than "improve technical knowledge").
- "finalAssessment": 2-3 sentences summarizing the round's overall trajectory and the single highest-priority thing
  to fix before the next interview.

Return ONLY raw JSON, with no extra prose, no markdown fences, in EXACTLY this shape:
{{
  "totalScore": number,
  "categoryScores": [
    {{"name": "Communication Skills", "score": number, "comment": string}},
    {{"name": "Technical Knowledge", "score": number, "comment": string}},
    {{"name": "Problem Solving", "score": number, "comment": string}},
    {{"name": "Cultural Fit", "score": number, "comment": string}},
    {{"name": "Confidence and Clarity", "score": number, "comment": string}}
  ],
  "strengths": [string, ...],
  "areasForImprovement": [string, ...],
  "finalAssessment": string
}}
"""
    completion = _create_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=3000,
    )
    text = completion.choices[0].message.content
    data = _extract_json(text)

    # Basic shape safety-net in case the model drifts slightly
    data.setdefault("categoryScores", [])
    data.setdefault("strengths", [])
    data.setdefault("areasForImprovement", [])
    data.setdefault("finalAssessment", "")
    if "totalScore" not in data:
        scores = [c.get("score", 0) for c in data["categoryScores"]]
        data["totalScore"] = round(sum(scores) / len(scores)) if scores else 0

    return data
