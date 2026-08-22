"use client";

import { useState } from "react";

export default function ImportModal({ onClose, onImported, provider }) {
  const [tab, setTab] = useState("github"); // github | zip
  const [repoUrl, setRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runImport(fetchFilesFn) {
    setBusy(true);
    setError("");
    try {
      const { files, truncated } = await fetchFilesFn();

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, files }),
      });
      const analysis = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analysis.error || "Analyze fail hua");

      onImported({ files, analysis, truncated });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGithubImport() {
    if (!repoUrl.trim()) return;
    await runImport(async () => {
      const res = await fetch("/api/import/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "GitHub import fail hua");
      return data;
    });
  }

  async function handleZipImport() {
    if (!zipFile) return;
    await runImport(async () => {
      const form = new FormData();
      form.append("file", zipFile);
      const res = await fetch("/api/import/zip", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Zip import fail hua");
      return data;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Existing project import kar</h2>
          <button onClick={onClose} className="text-mist hover:text-bone">
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-1">
          <button
            onClick={() => setTab("github")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === "github" ? "bg-panel2 text-amber" : "text-mist"
            }`}
          >
            GitHub link
          </button>
          <button
            onClick={() => setTab("zip")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === "zip" ? "bg-panel2 text-amber" : "text-mist"
            }`}
          >
            Zip upload
          </button>
        </div>

        {tab === "github" ? (
          <div className="space-y-3">
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full rounded-md border border-line bg-ink px-3 py-2 text-sm text-bone placeholder:text-mist/60 focus:border-amber/50"
            />
            <p className="text-xs text-mist">Sirf public repos kaam karenge.</p>
            <button
              onClick={handleGithubImport}
              disabled={busy || !repoUrl.trim()}
              className="w-full rounded-md bg-amber py-2 text-sm font-semibold text-ink disabled:opacity-40"
            >
              {busy ? "Padh raha hoon..." : "Import kar"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-mist file:mr-3 file:rounded-md file:border-0 file:bg-panel2 file:px-3 file:py-1.5 file:text-bone"
            />
            <button
              onClick={handleZipImport}
              disabled={busy || !zipFile}
              className="w-full rounded-md bg-amber py-2 text-sm font-semibold text-ink disabled:opacity-40"
            >
              {busy ? "Padh raha hoon..." : "Import kar"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-ember">{error}</p>}
      </div>
    </div>
  );
}
