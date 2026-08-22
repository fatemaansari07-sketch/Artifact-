"use client";

import { useState } from "react";

export default function CodePanel({ files }) {
  const paths = Object.keys(files);
  const [active, setActive] = useState(paths[0] || "");

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="border-b border-line px-4 py-2.5 text-xs text-mist">
        Ye ek backend/bot project hai — browser mein visually preview nahi ho sakta. Code neeche hai, run karne ka tarika chat mein bataya gaya hai.
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 shrink-0 overflow-y-auto border-r border-line py-2">
          {paths.map((p) => (
            <button
              key={p}
              onClick={() => setActive(p)}
              className={`block w-full truncate px-3 py-1.5 text-left font-mono text-xs ${
                active === p ? "bg-panel2 text-amber" : "text-mist hover:text-bone"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-bone">
          {files[active]}
        </pre>
      </div>
    </div>
  );
}
