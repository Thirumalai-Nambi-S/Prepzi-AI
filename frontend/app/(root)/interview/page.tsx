"use client";

import React from "react";
import Agent from "@/components/Agent";
import { useUser } from "@/lib/UserContext";
import Reveal from "@/components/Reveal";
import { Sparkles, ListChecks, Mic, Award } from "lucide-react";

const STEPS = [
  { icon: ListChecks, label: "Tell us about the role, level, company & tech stack" },
  { icon: Mic, label: "Talk through 3 rounds with your AI interviewer" },
  { icon: Award, label: "Get a detailed, evidence-based feedback report" },
];

const Page = () => {
  const user = useUser();

  return (
    <div className="flex flex-col gap-10">
      <Reveal>
        <div className="flex flex-col gap-4 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-dark-200 px-4 py-1.5 text-xs font-medium text-primary-200 shadow-sm w-fit">
            <Sparkles className="size-3.5" />
            New interview
          </span>
          <h3>Create an Interview</h3>
          <p className="opacity-80">
            Tap Start and tell the AI about the role, experience level, company, tech stack, and how many
            questions you want. It&apos;ll build you a full 3-round interview: a timed aptitude test, a
            technical round, and a behavioral round.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="flex flex-wrap gap-3">
          {STEPS.map((step, i) => (
            <div
              key={step.label}
              className="flex items-center gap-3 rounded-2xl bg-dark-200/60 border border-light-600/15 px-4 py-3 shadow-sm flex-1 min-w-[220px]"
            >
              <div className="flex items-center justify-center size-9 rounded-full bg-primary-200/15 text-primary-200 shrink-0">
                <step.icon className="size-4" />
              </div>
              <p className="text-sm opacity-80">
                <span className="text-primary-200 font-semibold mr-1">{i + 1}.</span>
                {step.label}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="rounded-3xl border border-light-600/15 bg-dark-200/30 px-6 py-10 sm:px-12 sm:py-14 shadow-lg shadow-black/10">
          <Agent userName={user?.name || ""} userId={user?.id || ""} type="generate" />
        </div>
      </Reveal>
    </div>
  );
};

export default Page;
