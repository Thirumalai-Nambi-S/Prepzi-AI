// Thin fetch wrapper around the FastAPI backend. All requests go through
// Next's /api/* rewrite proxy (see next.config.ts) so the httpOnly session
// cookie set by FastAPI is treated as same-origin by the browser.

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {
      /* no-op */
    }
    throw new Error(detail);
  }

  return res.json();
}

// ---------- Auth ----------

export const apiSignUp = (params: { uid: string; name: string; email: string }) =>
  request<{ success: boolean; message: string }>("/api/auth/sign-up", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiSignIn = (params: { email: string; idToken: string }) =>
  request<{ success: boolean; message: string }>("/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiSignOut = () => request<{ success: boolean }>("/api/auth/sign-out", { method: "POST" });

export const apiGetCurrentUser = () => request<{ user: User | null }>("/api/auth/me");

// ---------- Interviews ----------

export const apiGenerateInterview = (params: {
  role: string;
  level: string;
  company?: string;
  type?: string;
  techstack: string;
  amount: number;
  aptitudeCount?: number;
  userid: string;
}) =>
  request<{ success: boolean; interview: Interview }>("/api/interviews/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiGetMyInterviews = () => request<{ interviews: Interview[] }>("/api/interviews/mine");

export const apiGetLatestInterviews = () => request<{ interviews: Interview[] }>("/api/interviews/latest");

export const apiGetInterviewById = (id: string) =>
  request<{ interview: Interview }>(`/api/interviews/${id}`);

export const apiGetAttendedInterviews = () =>
  request<{ attended: { interview: Interview; feedback: Feedback }[] }>("/api/interviews/attended");

export const apiGetTurnTransition = (params: {
  previousQuestion?: string;
  previousAnswer?: string;
  nextQuestion: string;
  mode?: "interview" | "setup" | "technical" | "behavioral";
}) =>
  request<{ text: string }>("/api/interviews/turn-transition", {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiSubmitFullFeedback = (params: {
  interviewId: string;
  userId: string;
  aptitudeScore: number;
  aptitudeTotal: number;
  technicalTranscript: { role: string; content: string }[];
  behavioralTranscript: { role: string; content: string }[];
}) =>
  request<{ success: boolean; feedback: Feedback }>(`/api/interviews/${params.interviewId}/full-feedback`, {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiCreateFeedback = (params: CreateFeedbackParams) =>
  request<{ success: boolean; feedback: Feedback }>(`/api/interviews/${params.interviewId}/feedback`, {
    method: "POST",
    body: JSON.stringify(params),
  });

export const apiGetFeedback = (interviewId: string, userId: string) =>
  request<{ feedback: Feedback | null }>(
    `/api/interviews/${interviewId}/feedback?userId=${encodeURIComponent(userId)}`
  );
