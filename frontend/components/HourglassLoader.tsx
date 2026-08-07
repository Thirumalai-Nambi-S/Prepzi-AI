import React from "react";

/** A hand-drawn hourglass with sand that visibly drains from the top
 * chamber into the bottom one, resetting in sync with the flip animation
 * applied by the parent (Spinner). Pure CSS/SVG, no dependencies. */
const HourglassLoader = ({ size = 56, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    {/* top sand - shrinks toward the neck as it "drains" */}
    <polygon
      points="7,5 17,5 12,10.6"
      fill="currentColor"
      style={{ transformOrigin: "12px 10.6px", transformBox: "fill-box" }}
      className="animate-sand-drain-top"
    />

    {/* bottom sand - grows upward from the neck as it "fills" */}
    <polygon
      points="7,19 17,19 12,13.4"
      fill="currentColor"
      style={{ transformOrigin: "12px 13.4px", transformBox: "fill-box" }}
      className="animate-sand-drain-bottom"
    />

    {/* falling grains in the neck */}
    <circle cx="12" cy="12" r="0.6" fill="currentColor" className="animate-sand-fall" />

    {/* glass frame */}
    <path
      d="M5 3h14 M5 21h14 M6 3.5c0 3 0 5 6 8 6-3 6-5 6-8 M6 20.5c0-3 0-5 6-8 6 3 6 5 6 8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.9"
    />
  </svg>
);

export default HourglassLoader;
