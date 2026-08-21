"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useVoiceAgent } from "@/lib/useVoiceAgent";
import { apiGenerateInterview, apiCreateFeedback, apiGetTurnTransition } from "@/lib/api";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  type: "generate" | "interview";
  questions?: string[];
  personaMode?: "interview" | "technical" | "behavioral";
  onRoundComplete?: (transcript: SavedMessage[]) => void;
}

const sayThenSet = (setter: (m: SavedMessage) => void, role: SavedMessage["role"], content: string) => {
  if (content) setter({ role, content });
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};

/** Speech recognition often transcribes spoken numbers as words ("three")
 * rather than digits, so a plain regex-strip-non-digits parse silently fails
 * and falls back to a default. This handles both digits and number words. */
const parseSpokenNumber = (text: string): number | null => {
  const digitMatch = text.match(/\d+/);
  if (digitMatch) return parseInt(digitMatch[0], 10);

  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/);
  for (const word of words) {
    if (word in NUMBER_WORDS) return NUMBER_WORDS[word];
  }
  return null;
};

const Agent = ({ userName, userId, interviewId, type, questions, personaMode = "interview", onRoundComplete }: AgentProps) => {
  const router = useRouter();
  const { speak, interrupt, listen, stop, reset, isSpeaking, isSupported } = useVoiceAgent();

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [statusText, setStatusText] = useState("");
  const stoppedRef = useRef(false);
  const messagesRef = useRef<SavedMessage[]>([]);

  const pushMessage = (msg: SavedMessage) => {
    messagesRef.current = [...messagesRef.current, msg];
    setMessages(messagesRef.current);
  };

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askAndCapture = async (spokenText: string, transcriptQuestion?: string, ttsMode?: string): Promise<string> => {
    pushMessage({ role: "assistant", content: transcriptQuestion || spokenText });
    await speak(spokenText, ttsMode || personaMode);
    if (stoppedRef.current) return "";
    setStatusText("Listening...");
    const answer = await listen();
    setStatusText("");
    if (stoppedRef.current) return "";
    if (answer) pushMessage({ role: "user", content: answer });
    return answer;
  };

  const finishAndGoHome = () => {
    setCallStatus(CallStatus.FINISHED);
    router.push("/dashboard");
  };

  const runGenerateFlow = async () => {
    setCallStatus(CallStatus.ACTIVE);

    await askIntro(
      `Hi ${userName || "there"}, thanks for hopping on! I just need a few quick details and I'll put together a tailored mock interview for you.`,
      "setup"
    );
    if (stoppedRef.current) return;

    const steps: { key: string; question: string }[] = [
      { key: "role", question: "First, what job role would you like to prepare for?" },
      { key: "level", question: "Got it. What experience level should it target - entry level, mid level, or senior?" },
      { key: "company", question: "Is there a specific company you're targeting? Say the name, or just say skip." },
      { key: "techstack", question: "What technologies, tools, or skills should I focus on? A few is fine, like React, Node, and SQL." },
      { key: "amount", question: "How many technical and behavioral questions would you like per round?" },
      { key: "aptitudeCount", question: "For the timed aptitude round, would you like 10, 25, or 60 questions?" },
    ];

    const answers: Record<string, string> = {};
    let previousQuestion: string | undefined;
    let previousAnswer: string | undefined;

    for (const step of steps) {
      if (stoppedRef.current) break;

      let spoken = step.question;
      try {
        setStatusText("Thinking...");
        const { text } = await apiGetTurnTransition({
          previousQuestion,
          previousAnswer,
          nextQuestion: step.question,
          mode: "setup",
        });
        spoken = text || step.question;
      } catch {
        spoken = step.question;
      } finally {
        setStatusText("");
      }
      if (stoppedRef.current) break;

      const answer = await askAndCapture(spoken, step.question, "setup");
      answers[step.key] = answer;
      previousQuestion = step.question;
      previousAnswer = answer;
    }
    if (stoppedRef.current) return;

    const role = answers.role;
    const level = answers.level;
    const companyRaw = answers.company || "";
    const company = /^(skip|no|none|n\/?a)$/i.test(companyRaw.trim()) ? undefined : companyRaw;
    const techstack = answers.techstack;
    const parsedAmount = parseSpokenNumber(answers.amount || "");
    const amount = parsedAmount && parsedAmount > 0 ? parsedAmount : 5;

    const ALLOWED_APTITUDE_COUNTS = [10, 25, 60];
    const parsedAptitudeCount = parseSpokenNumber(answers.aptitudeCount || "");
    const aptitudeCount = parsedAptitudeCount
      ? ALLOWED_APTITUDE_COUNTS.reduce((closest, candidate) =>
          Math.abs(candidate - parsedAptitudeCount) < Math.abs(closest - parsedAptitudeCount) ? candidate : closest
        )
      : 10;

    await speak(`Perfect, generating your interview now with a ${aptitudeCount}-question aptitude round. Give me just a moment.`, "setup");
    setStatusText("Generating interview...");

    try {
      await apiGenerateInterview({
        role: role || "Software Engineer",
        level: level || "Mid",
        company,
        type: "Mixed",
        techstack: techstack || "General",
        amount,
        aptitudeCount,
        userid: userId || "",
      });
      await speak("All done! Your new interview has been created. You can find it under Your Interviews.", "setup");
    } catch (e: any) {
      await speak("Sorry, something went wrong while generating your interview.", "setup");
      console.error(e);
    } finally {
      setStatusText("");
      finishAndGoHome();
    }
  };

  const askIntro = async (text: string, ttsMode?: string) => {
    pushMessage({ role: "assistant", content: text });
    await speak(text, ttsMode || personaMode);
  };

  const runInterviewFlow = async () => {
    setCallStatus(CallStatus.ACTIVE);
    const qs = questions && questions.length > 0 ? questions : ["Tell me about yourself."];

    const intros: Record<string, string> = {
      technical: `Hi ${userName || "there"}, I'm running the technical round today. I'll ask you ${qs.length} questions - take your time.`,
      behavioral: `Hi ${userName || "there"}, thanks for making it to this round! I'm here to get to know a bit more about you and how you work. I've got ${qs.length} questions for you.`,
      interview: `Hello ${userName || "there"}! Thank you for taking the time to speak with me today. I'll ask you ${qs.length} questions, take your time with each answer.`,
    };
    await askIntro(intros[personaMode] || intros.interview);
    if (stoppedRef.current) return;

    let previousQuestion: string | undefined;
    let previousAnswer: string | undefined;

    for (const question of qs) {
      if (stoppedRef.current) break;

      // Ask the AI interviewer to react to the last answer and lead naturally
      // into this question, instead of just reciting the next line of a script.
      let spoken = question;
      try {
        setStatusText("Thinking...");
        const { text } = await apiGetTurnTransition({
          previousQuestion,
          previousAnswer,
          nextQuestion: question,
          mode: personaMode,
        });
        spoken = text || question;
      } catch {
        spoken = question;
      } finally {
        setStatusText("");
      }
      if (stoppedRef.current) break;

      const answer = await askAndCapture(spoken, question);
      previousQuestion = question;
      previousAnswer = answer;
    }

    if (!stoppedRef.current) {
      const closings: Record<string, string> = {
        technical: "That wraps up the technical round. Thanks for walking me through your thinking.",
        behavioral: "That's everything for this round - thanks so much for sharing all of that.",
        interview: "Thank you, that's all the questions I have. Generating your feedback now.",
      };
      await speak(closings[personaMode] || closings.interview, personaMode);
    }

    await generateFeedbackAndRoute();
  };

  const generateFeedbackAndRoute = async () => {
    setCallStatus(CallStatus.FINISHED);

    // Round-controlled usage (part of a multi-round interview): hand the
    // transcript back to the orchestrator instead of generating feedback
    // and navigating ourselves - the orchestrator combines all rounds first.
    if (onRoundComplete) {
      onRoundComplete(messagesRef.current);
      return;
    }

    if (!interviewId || !userId || messagesRef.current.length === 0) {
      router.push("/dashboard");
      return;
    }

    setStatusText("Generating feedback...");
    try {
      await apiCreateFeedback({
        interviewId,
        userId,
        transcript: messagesRef.current,
      });
      router.push(`/interview/${interviewId}/feedback`);
    } catch (e) {
      console.error("Error saving feedback", e);
      router.push("/dashboard");
    } finally {
      setStatusText("");
    }
  };

  const handleCall = async () => {
    if (!isSupported) {
      alert(
        "Your browser doesn't support the Web Speech API needed for the voice interview. Please use Chrome or Edge on desktop."
      );
      return;
    }
    stoppedRef.current = false;
    reset();
    setCallStatus(CallStatus.CONNECTING);
    messagesRef.current = [];
    setMessages([]);

    if (type === "generate") {
      await runGenerateFlow();
    } else {
      await runInterviewFlow();
    }
  };

  const handleDisconnect = async () => {
    stoppedRef.current = true;
    stop();
    if (type === "generate") {
      finishAndGoHome();
    } else {
      await generateFeedbackAndRoute();
    }
  };

  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;
  const interviewerLabel =
    personaMode === "technical" ? "Technical Interviewer" : personaMode === "behavioral" ? "HR Interviewer" : "AI Interviewer";

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <img src="/ai-avatar.png" alt="ai interviewer" width={65} height={54} className="object-cover" />
            {isSpeaking && <span className="animate-speak"></span>}
          </div>
          <h3>{interviewerLabel}</h3>
        </div>
        <div className="card-border">
          <div className="card-content">
            <img
              src="/user-avatar.png"
              alt="user avatar"
              width={540}
              height={540}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {statusText && <p className="text-center mt-2 text-sm opacity-70">{statusText}</p>}

      {isSpeaking && callStatus === CallStatus.ACTIVE && (
        <div className="w-full flex justify-center mt-2">
          <button
            type="button"
            onClick={interrupt}
            className="text-xs px-3 py-1.5 rounded-full border border-primary-200/40 text-primary-200 hover:bg-primary-200/10 transition-colors"
          >
            Already know your answer? Tap to jump in
          </button>
        </div>
      )}

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            {messages.slice(-2).map((m, i, arr) => {
              const isLatest = i === arr.length - 1;
              const isAI = m.role === "assistant" || m.role === "system";
              return (
                <div
                  key={`${messages.length - arr.length + i}-${m.content}`}
                  className={cn(
                    "flex flex-col items-center gap-1 w-full transition-all duration-500",
                    isLatest ? "opacity-100" : "opacity-45 scale-[0.97]"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      isAI ? "text-primary-200" : "text-success-100"
                    )}
                  >
                    {isAI ? interviewerLabel : userName || "You"}
                  </span>
                  <p key={m.content} className="animate-fadeIn">
                    {m.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75 ",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />
            <span>{isCallInactiveOrFinished ? "Start" : ". . ."}</span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>

      {!isSupported && (
        <p className="text-center mt-4 text-sm text-red-400">
          Voice isn&apos;t supported in this browser. Try the latest Chrome or Edge on desktop.
        </p>
      )}
    </>
  );
};

export default Agent;
