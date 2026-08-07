import React from "react";
import HourglassLoader from "@/components/HourglassLoader";

const Spinner = ({ label = "Loading...", size = 64 }: { label?: string; size?: number }) => (
  <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh] w-full">
    <div className="animate-hourglass-flip text-primary-200">
      <HourglassLoader size={size} />
    </div>
    {label && <p className="opacity-70 text-base">{label}</p>}
  </div>
);

export default Spinner;
