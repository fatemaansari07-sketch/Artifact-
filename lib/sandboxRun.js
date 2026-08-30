// Uses Piston (emkc.org) — a free, public code-execution API. No account,
// no API key, no card. Trade-off vs a full sandbox: it has no internet
// access to install packages, so it only has each language's standard
// library preinstalled — great for catching syntax/logic errors, but a bot
// that needs e.g. "python-telegram-bot" or "discord.js" will fail with a
// "module not found" here even though the code itself may be fine. That's
// still useful signal (real error, not a guess) — just not full deploy-grade
// execution. If real package installs are needed later, swap this out for a
// paid sandbox (E2B, CodeSandbox SDK, etc.) behind the same function shape.

export async function runInSandbox({ files, runtime }) {
  const language = runtime === "python" ? "python" : "javascript";
  const mainName = runtime === "python" ? "main.py" : "index.js";

  const fileList = Object.entries(files)
    .filter(([p]) => {
      const lower = p.replace(/^\//, "").toLowerCase();
      return lower !== "requirements.txt" && lower !== "package.json";
    })
    .map(([p, content]) => ({ name: p.replace(/^\//, ""), content }));

  if (fileList.length === 0) {
    throw new Error("Koi runnable file nahi mili (sirf requirements.txt/package.json tha)");
  }

  // Piston runs the first file in the array as the entry point.
  fileList.sort((a, b) => (a.name === mainName ? -1 : b.name === mainName ? 1 : 0));

  const res = await fetch("https://emkc.org/api/v2/piston/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language,
      version: "*",
      files: fileList,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Piston error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const stderr = [data.compile?.stderr, data.run?.stderr].filter(Boolean).join("\n");

  return {
    exitCode: data.run?.code ?? (stderr ? 1 : 0),
    stdout: data.run?.stdout || "",
    stderr,
  };
}
