"use client";

import { useState, useRef, useEffect } from "react";
import PreviewPanel from "./PreviewPanel";
import { STARTER_FILES, STARTER_DEPS } from "../lib/starterFiles";

const PROVIDERS = [
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "GPT" },
  { id: "deepseek", label: "DeepSeek" },
];

export default function BuildConsole() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Bata kya banau — app, website, dashboard, kuch bhi. Jitna detail utna accha result.",
    },
  ]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState(STARTER_FILES);
  const [dependencies, setDependencies] = useState(STARTER_DEPS);
  const [provider, setProvider] = useState("anthropic");
  const [loading, setLoading] = useState(false);
  const [autoFix, setAutoFix] = useState(true);
  const [saving, setSaving] = useState(false);
  const logEndRef = useRef(null);

  async function handleSave() {
    const name = window.prompt("Project ka naam?");
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, files, dependencies }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save fail hua");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Saved: "${name}"` },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Save nahi hua: ${e.message}` },
      ]);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callGenerate(promptMessages) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        messages: promptMessages,
        currentFiles: files,
      }),
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

      setFiles((prev) => ({ ...prev, ...result.files }));
      if (result.dependencies) {
        setDependencies((prev) => ({ ...prev, ...result.dependencies }));
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.explanation || "Ban gaya. Preview check kar." },
      ]);

      if (autoFix && result.selfCheckNote) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Self-check: ${result.selfCheckNote}` },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Error aaya: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] bg-ink">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_16px_2px_#F5A62366]" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Forge
          </span>
        </div>
        <div className="flex items-center gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                provider === p.id
                  ? "border-amber/50 bg-amber/10 text-amber"
                  : "border-line text-mist hover:text-bone"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-line" />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-mist transition-colors hover:text-bone disabled:opacity-40"
          >
            {saving ? "Save ho raha..." : "Save"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 overflow-hidden md:grid-cols-[380px_1fr]">
        <div className="flex flex-col border-r border-line bg-panel">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-amber/15 text-bone"
                    : "bg-panel2 text-mist"
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
        </div>

        <PreviewPanel files={files} dependencies={dependencies} />
      </div>
    </div>
  );
}
