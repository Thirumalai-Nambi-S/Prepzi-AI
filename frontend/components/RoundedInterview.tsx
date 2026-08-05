"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Agent from "@/components/Agent";
import AptitudeRound from "@/components/AptitudeRound";
import { apiSubmitFullFeedback } from "@/lib/api";

interface RoundedInterviewProps {
  interview: Interview;
  userName: string;
  userId: string;
}

type RoundStage = "aptitude" | "technical" | "behavioral" | "submitting";

const ROUND_META: Record<RoundStage, { label: string; step: number }> = {
  aptitude: { label: "Round 1 - Quantitative Aptitude", step: 1 },
  technical: { label: "Round 2 - Technical Interview", step: 2 },
  behavioral: { label: "Round 3 - Behavioral Interview", step: 3 },
  submitting: { label: "Finishing up", step: 4 },
};

const RoundedInterview = ({ interview, userName, userId }: RoundedInterviewProps) => {
  const router = useRouter();
  const [stage, setStage] = useState<RoundStage>("aptitude");
  const [aptitudeScore, setAptitudeScore] = useState<number | null>(null);
  const [aptitudeTotal, setAptitudeTotal] = useState<number>(0);
  const [technicalTranscript, setTechnicalTranscript] = useState<{ role: string; content: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const rounds = interview.rounds!;

  const handleAptitudeComplete = (score: number, total: number) => {
    setAptitudeScore(score);
    setAptitudeTotal(total);
    setStage("technical");
  };

  const handleTechnicalComplete = (transcript: { role: string; content: string }[]) => {
    setTechnicalTranscript(transcript);
    setStage("behavioral");
  };

  const handleBehavioralComplete = async (behavioralTranscript: { role: string; content: string }[]) => {
    setStage("submitting");
    try {
      await apiSubmitFullFeedback({
        interviewId: interview.id,
        userId,
        aptitudeScore: aptitudeScore ?? 0,
        aptitudeTotal: aptitudeTotal || rounds.aptitude.questions.length,
        technicalTranscript,
        behavioralTranscript,
      });
      router.push(`/interview/${interview.id}/feedback`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Something went wrong generating your feedback.");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-2">
        <p className="text-red-400">Failed to generate feedback: {error}</p>
        <p className="opacity-70 text-sm">Your answers weren&apos;t lost - try refreshing this page to retry.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-row gap-2 items-center flex-wrap">
        {(["aptitude", "technical", "behavioral"] as const).map((r) => {
          const meta = ROUND_META[r];
          const isActive = stage === r;
          const isDone = ROUND_META[stage].step > meta.step;
          return (
            <div
              key={r}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                isActive ? "bg-primary-200 text-dark-100" : isDone ? "bg-success-100/20 text-success-100" : "bg-dark-200 text-light-100/60"
              }`}
            >
              {meta.label}
              {isDone ? " ✓" : ""}
            </div>
          );
        })}
      </div>

      {stage === "aptitude" && (
        <AptitudeRound
          questions={rounds.aptitude.questions}
          timePerQuestionSeconds={rounds.aptitude.timePerQuestionSeconds || 60}
          onComplete={handleAptitudeComplete}
        />
      )}

      {stage === "technical" && (
        <Agent
          userName={userName}
          userId={userId}
          interviewId={interview.id}
          type="interview"
          questions={rounds.technical.questions}
          personaMode="technical"
          onRoundComplete={handleTechnicalComplete}
        />
      )}

      {stage === "behavioral" && (
        <Agent
          userName={userName}
          userId={userId}
          interviewId={interview.id}
          type="interview"
          questions={rounds.behavioral.questions}
          personaMode="behavioral"
          onRoundComplete={handleBehavioralComplete}
        />
      )}

      {stage === "submitting" && (
        <div className="flex items-center justify-center min-h-[30vh]">
          <p>Generating your combined feedback across all 3 rounds...</p>
        </div>
      )}
    </div>
  );
};

export default RoundedInterview;
