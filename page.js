"use client";

import { useEffect, useState } from "react";
import AdSlot from "../../components/AdSlot";

export default function Gallery() {
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    fetch("/api/projects?public=true")
      .then((res) => res.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => setProjects([]));
  }, []);

  return (
    <div className="min-h-screen bg-ink px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_16px_2px_#F5A62366]" />
          <span className="font-display text-xl font-semibold tracking-tight text-bone">
            Forge — Apps Hub
          </span>
        </div>

        <AdSlot label="Sponsored" />

        <div className="mt-6 space-y-3">
          {projects === null && <p className="text-sm text-mist">Load ho raha hai...</p>}
          {projects?.length === 0 && (
            <p className="text-sm text-mist">Abhi koi public app nahi hai. Apna project "Public" kar ke yahan add kar sakta hai.</p>
          )}
          {projects?.map((p) => (
            <a
              key={p.id}
              href={p.deployed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-line bg-panel px-4 py-3 transition-colors hover:border-amber/40"
            >
              <div className="text-sm font-medium text-bone">{p.name}</div>
              <div className="mt-1 text-xs text-mist">{p.deployed_url}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
