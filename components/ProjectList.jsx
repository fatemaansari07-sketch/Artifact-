"use client";

import { useEffect, useState } from "react";

export default function ProjectList({ onOpen, onNew }) {
  const [projects, setProjects] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // Supabase not configured — that's fine, just means no saved list.
          setProjects([]);
        } else {
          setProjects(data.projects || []);
        }
      })
      .catch(() => setProjects([]));
  }, []);

  async function openProject(id) {
    setError("");
    try {
      const res = await fetch(`/api/projects?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Project load nahi hui");
      onOpen(data.project);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="flex h-screen flex-col items-center bg-ink px-5 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_16px_2px_#F5A62366]" />
        <span className="font-display text-xl font-semibold tracking-tight">Forge</span>
      </div>

      <div className="w-full max-w-md space-y-3">
        <button
          onClick={onNew}
          className="w-full rounded-lg bg-amber py-3 text-sm font-semibold text-ink"
        >
          + New Project
        </button>

        <a
          href="/gallery"
          className="block w-full rounded-lg border border-line py-2.5 text-center text-sm text-mist hover:text-bone"
        >
          Apps Hub dekho →
        </a>

        {error && <p className="text-sm text-ember">{error}</p>}

        <div className="pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mist">
            Saved projects
          </p>

          {projects === null && (
            <p className="text-sm text-mist">Load ho raha hai...</p>
          )}

          {projects?.length === 0 && (
            <p className="text-sm text-mist">Abhi koi saved project nahi hai — naya bana ke "Save" dabana.</p>
          )}

          <div className="space-y-2">
            {projects?.map((p) => (
              <button
                key={p.id}
                onClick={() => openProject(p.id)}
                className="flex w-full items-center justify-between rounded-lg border border-line bg-panel px-4 py-3 text-left transition-colors hover:border-amber/40"
              >
                <span className="text-sm text-bone">{p.name}</span>
                <span className="text-xs text-mist">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
