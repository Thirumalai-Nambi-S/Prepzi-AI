"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import InterviewSection from "@/components/InterviewSection";
import {
  apiGetMyInterviews,
  apiGetLatestInterviews,
  apiGetAttendedInterviews,
} from "@/lib/api";
import { useUser } from "@/lib/UserContext";
import Spinner from "@/components/Spinner";

const Page = () => {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInterviews, setUserInterviews] = useState<(Interview & { feedback?: Feedback | null })[]>([]);
  const [latestInterviews, setLatestInterviews] = useState<(Interview & { feedback?: Feedback | null })[]>([]);
  const [attendedInterviews, setAttendedInterviews] = useState<(Interview & { feedback?: Feedback | null })[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [mine, latest, attended] = await Promise.all([
          apiGetMyInterviews(),
          apiGetLatestInterviews(),
          apiGetAttendedInterviews(),
        ]);

        // Map of interviewId -> feedback, from every interview this user has
        // ever completed (whether they created it or someone else did).
        const feedbackByInterviewId = new Map(
          attended.attended.map((a) => [a.interview.id, a.feedback])
        );

        const mineWithFeedback = mine.interviews.map((interview) => ({
          ...interview,
          feedback: feedbackByInterviewId.get(interview.id) ?? null,
        }));

        const latestWithFeedback = latest.interviews.map((interview) => ({
          ...interview,
          feedback: feedbackByInterviewId.get(interview.id) ?? null,
        }));

        const attendedCards = attended.attended.map((a) => ({ ...a.interview, feedback: a.feedback }));

        setUserInterviews(mineWithFeedback);
        setLatestInterviews(latestWithFeedback);
        setAttendedInterviews(attendedCards);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Something went wrong loading your interviews.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-2">
        <p className="text-red-400">Failed to load: {error}</p>
        <p className="opacity-70 text-sm">Check the backend terminal and the browser Network tab for details.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2>Please sign in to view your interviews</h2>
        <Button asChild className="mt-4">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">Practice on real interview questions & get instant feedback</p>
          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Create an Interview</Link>
          </Button>
        </div>
        <img src="/robot.png" alt="robo-dude" width={400} height={400} className="max-sm:hidden" />
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>How Your Interview Works</h2>
        <p className="opacity-80 -mt-2">
          Every interview you create runs through 3 rounds, just like a real hiring process.
        </p>
        <div className="interviews-section">
          <div className="card-border w-[360px] max-sm:w-full">
            <div className="card p-6 flex flex-col gap-3">
              <p className="badge-text text-primary-200">Round 1</p>
              <h3>Quantitative Aptitude</h3>
              <p className="opacity-80">
                10 timed multiple-choice questions - arithmetic, logical reasoning, and data interpretation. 60
                seconds per question, auto-scored.
              </p>
            </div>
          </div>
          <div className="card-border w-[360px] max-sm:w-full">
            <div className="card p-6 flex flex-col gap-3">
              <p className="badge-text text-primary-200">Round 2</p>
              <h3>Technical Interview</h3>
              <p className="opacity-80">
                A focused, professional-tone voice interview on your role and tech stack, with an AI interviewer
                that reacts to your answers in real time.
              </p>
            </div>
          </div>
          <div className="card-border w-[360px] max-sm:w-full">
            <div className="card p-6 flex flex-col gap-3">
              <p className="badge-text text-primary-200">Round 3</p>
              <h3>Behavioral Interview</h3>
              <p className="opacity-80">
                A warmer voice conversation with an HR-style interviewer covering past experience, soft skills, and
                culture fit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <InterviewSection
        title="Your Interviews"
        interviews={userInterviews}
        emptyMessage="You haven't created any interviews yet"
      />

      <InterviewSection
        title="Attended Interviews"
        interviews={attendedInterviews}
        emptyMessage="You haven't attended any interviews yet. Take one below to see it here."
      />

      <InterviewSection
        title="Take an Interview"
        interviews={latestInterviews}
        emptyMessage="There are no new interviews available"
      />
    </>
  );
};

export default Page;
