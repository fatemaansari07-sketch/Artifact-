"use client";

import { useState, useRef, useEffect } from "react";
import PreviewPanel from "./PreviewPanel";
import CodePanel from "./CodePanel";
import ImportModal from "./ImportModal";
import AdSlot from "./AdSlot";

export default function BuildConsole({
  initialProjectId,
  initialName,
  initialFiles,
  initialDependencies,
  onBack,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Bata kya banau — app, website, bot, kuch bhi. Ya upar se koi existing project import kar le, main padh ke bataunga kya bana hai.",
    },
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState(initialFiles);
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [runtime, setRuntime] = useState("browser"); // browser | node
  const [loading, setLoading] = useState(false);
  const [autoFix, setAutoFix] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [projectName, setProjectName] = useState(initialName);
  const [isPublic, setIsPublic] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSave() {
    let name = projectName;
    if (!name) {
      name = window.prompt("Project ka naam?");
      if (!name) return;
      setProjectName(name);
    }
    setSaving(true);
    try {
      if (projectId) {
        const res = await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: projectId, files, dependencies }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save fail hua");
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, files, dependencies }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save fail hua");
        setProjectId(data.project.id);
      }
      setMessages((prev) => [...prev, { role: "assistant", text: `Saved: "${name}"` }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Save nahi hua: ${e.message}` }]);
    } finally {
      setSaving(false);
    }
  }

  function handleImported({ files: importedFiles, analysis, truncated }) {
    setFiles(importedFiles);
    setRuntime(analysis.runtime === "node" ? "node" : "browser");
    setShowImport(false);

    const builtList = (analysis.built || []).map((b) => `✓ ${b}`).join("\n");
    const incompleteList = (analysis.incomplete || []).map((b) => `• ${b}`).join("\n");

    const parts = [analysis.summary];
    if (builtList) parts.push(`\nBana hua hai:\n${builtList}`);
    if (incompleteList) parts.push(`\nAdhoora / missing:\n${incompleteList}`);
    if (analysis.note) parts.push(`\n${analysis.note}`);
    if (truncated) parts.push("\n(Bada project hai, kuch files skip ki context limit ke liye.)");

    setMessages((prev) => [...prev, { role: "assistant", text: parts.join("\n") }]);
  }

  async function callGenerate(promptMessages) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: promptMessages, currentFiles: files }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    return res.json();
  }

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");
    const nextMessages = [...messages, { role: "user", text: prompt }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const result = await callGenerate(
        nextMessages.map((m) => ({ role: m.role, content: m.text }))
      );

      if (result.type === "chat") {
        setMessages((prev) => [...prev, { role: "assistant", text: result.reply }]);
        setLoading(false);
        return;
      }

      setFiles((prev) => ({ ...prev, ...result.files }));
      if (result.dependencies) {
        setDependencies((prev) => ({ ...prev, ...result.dependencies }));
      }
      if (result.runtime) setRuntime(result.runtime);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.explanation || "Ban gaya." },
      ]);

      if (autoFix && result.selfCheckNote) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Self-check: ${result.selfCheckNote}` },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error aaya: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy() {
    if (deploying) return;
    const name = projectName || window.prompt("Project ka naam? (URL mein use hoga)", "my-app");
    if (!name) return;
    setDeploying(true);
    setMessages((prev) => [...prev, { role: "assistant", text: "Deploy ho raha hai, thoda ruk (30-60 sec lagenge)..." }]);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, dependencies, runtime, projectName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deploy fail hua");
      if (projectId) {
        await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: projectId, deployed_url: data.url }),
        });
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Live ho gaya: ${data.url}\n(Build hone mein 30-60 sec aur lag sakte hain, thoda wait karke khol.)` },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Deploy nahi hua: ${e.message}` }]);
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] bg-ink">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="mr-1 text-mist hover:text-bone" title="Projects list">
            ←
          </button>
          <div className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_16px_2px_#F5A62366]" />
          <span className="font-display text-lg font-semibold tracking-tight">
            {projectName || "Forge"}
          </span>
          {runtime === "node" && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-mist">
              node / backend
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-mist transition-colors hover:text-bone"
          >
            Import
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-mist transition-colors hover:text-bone disabled:opacity-40"
          >
            {saving ? "Save ho raha..." : "Save"}
          </button>
          <button
            onClick={async () => {
              const next = !isPublic;
              setIsPublic(next);
              if (projectId) {
                await fetch("/api/projects", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: projectId, is_public: next }),
                });
              }
            }}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              isPublic ? "border-amber/50 bg-amber/10 text-amber" : "border-line text-mist"
            }`}
            title="Public karega to ye Gallery mein sabko dikhega"
          >
            {isPublic ? "Public" : "Private"}
          </button>
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="rounded-md bg-amber px-2.5 py-1 text-xs font-semibold text-ink transition-opacity disabled:opacity-40"
          >
            {deploying ? "Deploy ho raha..." : "Deploy"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 overflow-hidden md:grid-cols-[380px_1fr]">
        <div className="flex flex-col border-r border-line bg-panel">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] whitespace-pre-line rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user" ? "ml-auto bg-amber/15 text-bone" : "bg-panel2 text-mist"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[92%] rounded-lg bg-panel2 px-3 py-2 text-sm text-mist">
                Likh raha hoon<span className="animate-pulse">...</span>
              </div>
            )}
            <div ref={logEndRef} />
          </div>

          <div className="border-t border-line p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Jaise: ek todo list app bana, dark theme, categories ke saath..."
              rows={3}
              className="w-full resize-none rounded-md border border-line bg-ink px-3 py-2 text-sm text-bone placeholder:text-mist/60 focus:border-amber/50"
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-mist">
                <input
                  type="checkbox"
                  checked={autoFix}
                  onChange={(e) => setAutoFix(e.target.checked)}
                  className="accent-amber"
                />
                Self-check note dikhao
              </label>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-md bg-amber px-4 py-1.5 text-sm font-semibold text-ink transition-opacity disabled:opacity-40"
              >
                Bhej
              </button>
            </div>
          </div>

          <div className="border-t border-line p-3">
            <AdSlot />
          </div>
        </div>

        {runtime === "node" ? (
          <CodePanel files={files} />
        ) : (
          <PreviewPanel files={files} dependencies={dependencies} />
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
}
