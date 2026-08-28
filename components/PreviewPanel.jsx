"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useRef, useState } from "react";

// Lives inside SandpackProvider so it can read live compile/runtime errors.
// Reports each *new* error text up to the parent (once) so it can trigger an
// auto-fix — never reports the same error twice in a row.
function ErrorBridge({ onError }) {
  const { sandpack } = useSandpack();
  const lastReported = useRef(null);

  useEffect(() => {
    const errorText = sandpack.error?.message || null;
    if (errorText && errorText !== lastReported.current) {
      lastReported.current = errorText;
      onError?.(errorText);
    }
    if (!errorText) {
      lastReported.current = null;
    }
  }, [sandpack.error, onError]);

  return null;
}

export default function PreviewPanel({ files, dependencies, onError }) {
  const [tab, setTab] = useState("preview"); // preview | code | console
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={`flex h-full flex-col bg-panel ${fullscreen ? "fixed inset-0 z-50" : ""}`}>
      <div className="flex items-center gap-1 border-b border-line px-3 py-2">
        {[
          ["preview", "Preview"],
          ["code", "Code"],
          ["console", "Console"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-panel2 text-amber"
                : "text-mist hover:text-bone"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setFullscreen((f) => !f)}
          className="ml-auto rounded-md border border-line px-2.5 py-1 text-xs text-mist hover:text-bone"
        >
          {fullscreen ? "Chhota kar" : "Fullscreen"}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <SandpackProvider
          template="react"
          theme="dark"
          files={files}
          customSetup={{ dependencies }}
          options={{ recompileMode: "delayed", recompileDelay: 300 }}
          style={{ height: "100%" }}
        >
          <ErrorBridge onError={onError} />
          <SandpackLayout style={{ height: "100%", border: "none" }}>
            {tab === "preview" && (
              <SandpackPreview
                style={{ height: "100%" }}
                showOpenInCodeSandbox={false}
                showRefreshButton={true}
              />
            )}
            {tab === "code" && (
              <SandpackCodeEditor
                style={{ height: "100%" }}
                showTabs
                showLineNumbers
                wrapContent
              />
            )}
            {tab === "console" && (
              <SandpackConsole style={{ height: "100%" }} />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}
