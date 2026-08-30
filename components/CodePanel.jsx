"use client";

import { useState } from "react";

export default function CodePanel({ files, runtime, onError }) {
  const paths = Object.keys(files);
  const [active, setActive] = useState(paths[0] || "");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null); // { exitCode, stdout, stderr } | { error }

  async function handleRun() {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, runtime }),
      });
      const data = await res.json();
      setOutput(data);
    } catch (e) {
      setOutput({ error: e.message });
    } finally {
      setRunning(false);
    }
  }

  function handleAutoFix() {
    if (!output?.stderr) return;
    onError?.(output.stderr);
  }

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="text-xs text-mist">
          {runtime === "python" ? "Python" : "Node.js"} project — real sandbox mein chala ke test kar sakta hai.
        </p>
        <button
          onClick={handleRun}
          disabled={running}
          className="rounded-md bg-amber px-3 py-1 text-xs font-semibold text-ink disabled:opacity-40"
        >
          {running ? "Run ho raha..." : "▶ Run"}
        </button>
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
        <div className="flex flex-1 flex-col overflow-hidden">
          <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-bone">
            {files[active]}
          </pre>

          {output && (
            <div className="max-h-56 shrink-0 overflow-y-auto border-t border-line bg-ink p-3">
              {output.error && <p className="text-xs text-ember">{output.error}</p>}
              {!output.error && (
                <>
                  <p className={`mb-1 text-xs font-medium ${output.exitCode === 0 ? "text-amber" : "text-ember"}`}>
                    Exit code: {output.exitCode} {output.exitCode === 0 ? "(sahi chala)" : "(error aaya)"}
                  </p>
                  {output.stdout && (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-mist">{output.stdout}</pre>
                  )}
                  {output.stderr && (
                    <pre className="whitespace-pre-wrap font-mono text-xs text-ember">{output.stderr}</pre>
                  )}
                  {output.exitCode !== 0 && output.stderr && (
                    <button
                      onClick={handleAutoFix}
                      className="mt-2 rounded-md border border-amber/40 px-2.5 py-1 text-xs text-amber"
                    >
                      Is error ko fix karo
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
