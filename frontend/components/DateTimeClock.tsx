"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Small live clock: date + time, ticking every second. Renders nothing
 * until mounted so server and client markup always match (avoids hydration
 * mismatches from server time vs. client time). */
const DateTimeClock = ({ className = "" }: { className?: string }) => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={`flex items-center gap-2 rounded-full bg-dark-200 px-3.5 py-1.5 text-xs sm:text-sm shadow-sm ${className}`}
    >
      <Clock className="size-3.5 text-primary-200 shrink-0" />
      <span className="opacity-80 whitespace-nowrap">
        {dateStr} &middot; {timeStr}
      </span>
    </div>
  );
};

export default DateTimeClock;
