"use client";

import { useState } from "react";

export function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;

  return (
    <div>
      <p className={`text-[14px] leading-relaxed text-ink-2 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
        {text}
      </p>
      {isLong && (
        <button
          className="mt-1 text-[14px] font-semibold text-accent"
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? "show less" : "read more"}
        </button>
      )}
    </div>
  );
}
