"use client";

import React, { useState } from "react";
import InterviewCard from "@/components/InterviewCard";
import Reveal from "@/components/Reveal";

const DEFAULT_VISIBLE_COUNT = 3;

interface InterviewSectionProps {
  title: string;
  interviews: (Interview & { feedback?: Feedback | null })[];
  emptyMessage: string;
}

/** Renders a section of interview cards as a single horizontally-scrollable
 * row by default. If there are more cards than fit, a "Show more" button
 * expands the section into a full wrapped grid showing every interview in
 * that section; "Show less" collapses it back to a single row. Each card
 * fades/slides in individually with a short stagger as it scrolls into
 * view, rather than the whole row popping in as one block. */
const InterviewSection = ({ title, interviews, emptyMessage }: InterviewSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = interviews.length > DEFAULT_VISIBLE_COUNT;
  const visibleInterviews = expanded ? interviews : interviews.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <section className="flex flex-col gap-6 mt-8">
      <Reveal>
        <div className="flex items-center justify-between gap-4">
          <h2>{title}</h2>
          {hasOverflow && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-sm font-semibold text-primary-200 hover:underline cursor-pointer shrink-0"
            >
              {expanded ? "Show less" : `Show more (${interviews.length})`}
            </button>
          )}
        </div>
      </Reveal>

      {interviews.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className={expanded ? "interviews-section" : "interviews-row"}>
          {visibleInterviews.map((interview, i) => (
            <Reveal key={interview.id} delay={Math.min(i, 6) * 70} className="shrink-0 w-[360px] max-sm:w-full">
              <InterviewCard {...interview} feedback={interview.feedback} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
};

export default InterviewSection;
