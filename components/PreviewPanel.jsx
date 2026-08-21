"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import { useState } from "react";

export default function PreviewPanel({ files, dependencies }) {
  const [tab, setTab] = useState("preview"); // preview | code | console

  return (
    <div className="flex h-full flex-col bg-panel">
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
