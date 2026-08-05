import React from "react";
import { Hourglass } from "lucide-react";

const Spinner = ({ label = "Loading...", size = 36 }: { label?: string; size?: number }) => (
  <div className="flex flex-col items-center justify-center gap-3">
    <Hourglass
      size={size}
      className="text-primary-200 animate-hourglass-flip"
      aria-hidden="true"
    />
    {label && <p className="opacity-70 text-sm">{label}</p>}
  </div>
);

export default Spinner;
