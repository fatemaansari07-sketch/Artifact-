"use client";

import { useEffect, useState } from "react";

export default function HistoryModal({ projectId, onClose, onRestore }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/versions?projectId=${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        setVersions(data.versions || []);
      })
      .catch((e) => setError(e.message));
  }, [projectId]);

  async function handleRestore(versionId) {
    setError("");
    try {
      const res = await fetch(`/api/projects/versions?versionId=${versionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Version load nahi hui");
      onRestore(data.version);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-bone">Purane versions</h2>
          <button onClick={onClose} className="text-mist hover:text-bone">
            ✕
          </button>
        </div>

        {versions === null && <p className="text-sm text-mist">Load ho raha hai...</p>}
        {versions?.length === 0 && (
          <p className="text-sm text-mist">Abhi koi purana version nahi hai — jab bhi tu "Save" dabata hai kisi existing project pe, uska pehle wala state yahan aa jayega.</p>
        )}
        {error && <p className="mb-3 text-sm text-ember">{error}</p>}

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {versions?.map((v) => (
            <button
              key={v.id}
              onClick={() => handleRestore(v.id)}
              className="flex w-full items-center justify-between rounded-lg border border-line bg-ink px-4 py-3 text-left transition-colors hover:border-amber/40"
            >
              <span className="text-sm text-bone">
                {new Date(v.created_at).toLocaleString()}
              </span>
              <span className="text-xs text-amber">Restore →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
