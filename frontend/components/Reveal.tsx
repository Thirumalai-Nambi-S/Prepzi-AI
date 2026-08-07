"use client";

import React, { useEffect, useRef, useState } from "react";

/** Wraps children in a fade+slide transition that plays every time the
 * element crosses into or out of the viewport - fades/slides in while
 * scrolling down into view, and fades/slides back out while scrolling up
 * out of view (and vice versa), rather than a one-shot entrance animation. */
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all ease-out will-change-transform ${
        visible ? "opacity-100 translate-y-0 duration-700" : "opacity-0 translate-y-8 duration-500"
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
};

export default Reveal;
