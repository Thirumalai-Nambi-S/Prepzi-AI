"use client";

import React, { useEffect, useRef, useState } from "react";

interface AptitudeRoundProps {
  questions: AptitudeQuestion[];
  timePerQuestionSeconds: number;
  onComplete: (score: number, total: number) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

const AptitudeRound = ({ questions, timePerQuestionSeconds, onComplete }: AptitudeRoundProps) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestionSeconds);
  const scoreRef = useRef(0);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const goToNext = () => {
    if (isLast) {
      onComplete(scoreRef.current, questions.length);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setLocked(false);
    setTimeLeft(timePerQuestionSeconds);
  };

  // Submitting grades the currently selected option (or "no answer" if time ran out).
  const submitAnswer = () => {
    if (locked) return;
    setLocked(true);
    if (selected !== null && selected === question.correctIndex) {
      scoreRef.current += 1;
    }
  };

  // Per-question countdown; auto-submits as unanswered when it hits 0, but
  // still waits for the user to hit Next so they can see the result first.
  useEffect(() => {
    if (locked) return;
    if (timeLeft <= 0) {
      submitAnswer();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, locked]);

  if (!question) return null;

  const pct = Math.max(0, (timeLeft / timePerQuestionSeconds) * 100);
  const timeCritical = timeLeft <= 10;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-row justify-between items-center text-sm opacity-80">
        <p>
          Question {index + 1} of {questions.length}
        </p>
        <p className={timeCritical && !locked ? "text-red-400 font-bold" : ""}>{locked ? "Time's up" : `${timeLeft}s`}</p>
      </div>

      <div className="w-full h-2 rounded-full bg-dark-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 linear ${timeCritical ? "bg-red-400" : "bg-primary-200"}`}
          style={{ width: locked ? "0%" : `${pct}%` }}
        />
      </div>

      <div className="card-border w-full">
        <div className="card-content !items-start !justify-start gap-6 p-8">
          <h3>{question.question}</h3>

          <div className="flex flex-col gap-3 w-full">
            {question.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const isCorrectOption = question.correctIndex === optionIndex;

              let extraClasses = isSelected
                ? "border-primary-200 bg-primary-200/10"
                : "border-input hover:bg-dark-200/60";
              if (locked && isCorrectOption) extraClasses = "border-success-100 bg-success-100/10";
              else if (locked && isSelected && !isCorrectOption) extraClasses = "border-destructive-100 bg-destructive-100/10";

              return (
                <button
                  key={optionIndex}
                  disabled={locked}
                  onClick={() => setSelected(optionIndex)}
                  className={`text-left px-5 py-3 rounded-full border transition-colors flex flex-row gap-3 items-center disabled:cursor-default ${extraClasses}`}
                >
                  <span className="font-bold opacity-70">{OPTION_LABELS[optionIndex]}.</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        {!locked ? (
          <button
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={selected === null}
            onClick={submitAnswer}
          >
            Submit Answer
          </button>
        ) : (
          <button className="btn-primary" onClick={goToNext}>
            {isLast ? "Finish Round" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
};

export default AptitudeRound;
