"use client";

import React, { useEffect, useState } from "react";
import { cn, getTechLogos } from "@/lib/utils";

const FALLBACK_ICON = "/tech.svg";

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
  const [techIcons, setTechIcons] = useState<{ tech: string; url: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTechLogos(techStack).then((icons) => {
      if (!cancelled) setTechIcons(icons);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(techStack)]);

  return (
    <div className="flex flex-row">
      {techIcons.slice(0, 3).map(({ tech, url }, index) => (
        <div
          key={tech}
          className={cn(
            "relative group bg-dark-300 rounded-full p-2 flex-center transition-transform duration-200 hover:scale-110 hover:z-10",
            index >= 1 && "-ml-3"
          )}
        >
          <span className="tech-tooltip"> {tech} </span>
          {/* Plain <img>, not next/image: these come from a third-party CDN
              with unpredictable slugs, so we can't rely on Next's remote-
              domain allowlist here - and if the specific icon 404s, we swap
              to the generic fallback client-side rather than showing nothing. */}
          <img
            src={url}
            alt={tech}
            width={20}
            height={20}
            className="size-5"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.endsWith(FALLBACK_ICON)) return;
              img.src = FALLBACK_ICON;
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
