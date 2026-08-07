"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { apiGetInterviewById, apiGetFeedback } from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import Spinner from "@/components/Spinner";

const Page = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ interview }, { feedback }] = await Promise.all([
          apiGetInterviewById(id),
          apiGetFeedback(id, user.id),
        ]);
        setInterview(interview);
        setFeedback(feedback);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }
  if (!interview) return null;

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="capitalize">No feedback yet for {interview.role} Interview</h2>
        <p className="opacity-80">Take the interview first to get your personalized feedback.</p>
        <Button asChild className="btn-primary">
          <Link href={`/interview/${id}`}>Take the Interview</Link>
        </Button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h2 className="capitalize">Feedback on your {interview.role} Interview</h2>
        <div className="flex flex-row gap-5 items-center">
          <div className="flex flex-row gap-2 items-center">
            <img src="/star.svg" alt="star" width={22} height={22} />
            <p>
              Overall Impression: <span className="font-bold">{feedback.totalScore}</span>/100
            </p>
          </div>
          <div className="flex flex-row gap-2 items-center">
            <img src="/calendar.svg" alt="calendar" width={22} height={22} />
            <p>{dayjs(feedback.createdAt).format("MMM D, YYYY - h:mm A")}</p>
          </div>
        </div>
      </div>

      <p className="opacity-90">{feedback.finalAssessment}</p>

      {feedback.roundScores && (
        <div className="flex flex-col gap-4">
          <h3>Round-by-Round Breakdown</h3>
          <div className="flex flex-row gap-4 flex-wrap">
            {(
              [
                { key: "aptitude", label: "Round 1 - Aptitude" },
                { key: "technical", label: "Round 2 - Technical" },
                { key: "behavioral", label: "Round 3 - Behavioral" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="bg-dark-200 rounded-2xl px-6 py-4 flex-1 min-w-[160px]">
                <p className="opacity-70 text-sm">{label}</p>
                <p className="text-2xl font-bold">{feedback.roundScores![key]}/100</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h3>Breakdown of Evaluation</h3>
        {feedback.categoryScores.map((category, index) => (
          <div key={`${category.name}-${index}`} className="flex flex-col gap-1 border-b border-white/10 pb-4">
            <p className="font-bold">
              {index + 1}. {category.name} ({category.score}/100)
            </p>
            <p className="opacity-80">{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3>Strengths</h3>
        <ul className="list-disc list-inside flex flex-col gap-1">
          {feedback.strengths.map((s, index) => (
            <li key={`strength-${index}`}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Areas for Improvement</h3>
        <ul className="list-disc list-inside flex flex-col gap-1">
          {feedback.areasForImprovement.map((a, index) => (
            <li key={`improvement-${index}`}>{a}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-row gap-4">
        <Button asChild className="btn-secondary flex-1">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
        <Button asChild className="btn-primary flex-1">
          <Link href={`/interview/${id}`}>Retake Interview</Link>
        </Button>
      </div>
    </section>
  );
};

export default Page;
