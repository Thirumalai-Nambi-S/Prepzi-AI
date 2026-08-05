interface AptitudeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface InterviewRounds {
  aptitude: { questions: AptitudeQuestion[]; timePerQuestionSeconds: number };
  technical: { questions: string[] };
  behavioral: { questions: string[] };
}

interface RoundScores {
  aptitude: number;
  technical: number;
  behavioral: number;
}

interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  roundScores?: RoundScores;
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  finalAssessment: string;
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  company?: string;
  questions: string[];
  rounds?: InterviewRounds;
  techstack: string[];
  coverImage?: string;
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string }[];
  feedbackId?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface InterviewCardProps {
  id?: string;
  userId?: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
  coverImage?: string;
  feedback?: Feedback | null;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  type: "generate" | "interview";
  questions?: string[];
  personaMode?: "interview" | "technical" | "behavioral";
  onRoundComplete?: (transcript: { role: string; content: string }[]) => void;
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}
