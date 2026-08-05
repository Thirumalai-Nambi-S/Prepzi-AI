"use client";

import React, { useState } from "react";
import InterviewCard from "@/components/InterviewCard";

const DEFAULT_VISIBLE_COUNT = 3;

interface InterviewSectionProps {
  title: string;
  interviews: (Interview & { feedback?: Feedback | null })[];
  emptyMessage: string;
}

/** Renders a section of interview cards as a single horizontally-scrollable
 * row by default. If there are more cards than fit, a "Show more" button
 * expands the section into a full wrapped grid showing every interview in
 * that section; "Show less" collapses it back to a single row. */
const InterviewSection = ({ title, interviews, emptyMessage }: InterviewSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = interviews.length > DEFAULT_VISIBLE_COUNT;
  const visibleInterviews = expanded ? interviews : interviews.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <section className="flex flex-col gap-6 mt-8">
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

      {interviews.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        <div className={expanded ? "interviews-section" : "interviews-row"}>
          {visibleInterviews.map((interview) => (
            <InterviewCard {...interview} feedback={interview.feedback} key={interview.id} />
          ))}
        </div>
      )}
    </section>
  );
};

export default InterviewSection;
