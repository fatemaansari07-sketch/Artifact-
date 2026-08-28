import { callJSONWithFallback } from "../../../lib/llm";

export const runtime = "nodejs";

const ANALYZE_SYSTEM_PROMPT = `You are Forge, reviewing a codebase someone dropped in front of you.

Look at the files given and reply with ONLY a single JSON object, no prose outside it:
{
  "summary": "2-4 sentences in Hinglish: what this project is, what stack it uses.",
  "built": ["short bullet of a feature that already works", "..."],
  "incomplete": ["short bullet of something that looks unfinished or broken", "..."],
  "runtime": "browser" or "node",
  "note": "One short Hinglish sentence telling the user what they can ask you to do next."
}
"runtime" should be "browser" if this looks like a web UI app (React/HTML/CSS), or "node" if it's a backend service, CLI, or bot (e.g. Telegram bot, Discord bot, API server) with no browser UI.
Base "built" and "incomplete" only on what you can actually see in the files — don't guess at things not present.`;

export async function POST(req) {
  try {
    const { files } = await req.json();
    if (!files) {
      return Response.json({ error: "files chahiye" }, { status: 400 });
    }

    const { parsed } = await callJSONWithFallback(
      ANALYZE_SYSTEM_PROMPT,
      [{ role: "user", content: JSON.stringify(files).slice(0, 20000) }],
      { maxTokens: 1200 }
    );

    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: e.message || "Analyze fail hua" }, { status: 500 });
  }
}
