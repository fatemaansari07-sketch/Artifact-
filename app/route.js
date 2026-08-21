import { callModel, extractJSON } from "../../../lib/llm";

export const runtime = "nodejs";

const BUILD_SYSTEM_PROMPT = `You are Forge, an expert React engineer. You generate small, complete, working apps for a Sandpack "react" template (CRA-style: /App.js is the entry, /index.js and /public/index.html already exist and should not be redeclared unless asked).

Rules:
- Reply with ONLY a single JSON object. No prose outside it, no markdown fences.
- JSON shape:
  {
    "files": { "/App.js": "...", "/components/Foo.js": "..." },
    "dependencies": { "package-name": "version" },
    "explanation": "One short friendly sentence in Hindi+English mix (Hinglish) describing what you built."
  }
- Every file must be complete, valid, runnable code — no "// rest of code unchanged" placeholders.
- Prefer plain inline styles or simple CSS-in-JS over Tailwind unless the user asks for Tailwind (Sandpack's react template has no Tailwind configured).
- Keep dependencies minimal and only from npm's public registry.
- If the user is asking for a change to an existing app, you will be given the current files — modify them, keep unrelated files intact, and only include changed/new files in your "files" output.
- Never include explanations, apologies, or notes outside the JSON.`;

const REVIEW_SYSTEM_PROMPT = `You are a meticulous code reviewer for a Sandpack "react" template app. You will be given a set of files. Check for: syntax errors, missing imports, undefined variables/components, mismatched JSX tags, and obviously broken logic.

Reply with ONLY a single JSON object, no prose outside it:
{
  "ok": true or false,
  "fixedFiles": { "/App.js": "..." },   // only include files you changed; omit key entirely if nothing needed fixing
  "note": "One short sentence in Hinglish: either 'Sab sahi laga' or what you fixed."
}`;

export async function POST(req) {
  try {
    const { provider, messages, currentFiles } = await req.json();

    if (!provider || !messages?.length) {
      return Response.json({ error: "Missing provider or messages" }, { status: 400 });
    }

    const userTurns = [...messages];
    if (currentFiles && Object.keys(currentFiles).length) {
      userTurns.push({
        role: "user",
        content: `Current files in the project (for context, may need edits):\n${JSON.stringify(currentFiles).slice(0, 12000)}`,
      });
    }

    const raw = await callModel(provider, BUILD_SYSTEM_PROMPT, userTurns, { maxTokens: 4000 });
    let parsed;
    try {
      parsed = extractJSON(raw);
    } catch (e) {
      return Response.json(
        { error: `Model response wasn't valid JSON: ${e.message}` },
        { status: 502 }
      );
    }

    if (!parsed.files || typeof parsed.files !== "object") {
      return Response.json({ error: "Model response had no files object" }, { status: 502 });
    }

    // Self-review pass: ask the model to check its own output for bugs.
    let selfCheckNote = null;
    try {
      const mergedFiles = { ...currentFiles, ...parsed.files };
      const reviewRaw = await callModel(
        provider,
        REVIEW_SYSTEM_PROMPT,
        [{ role: "user", content: JSON.stringify(mergedFiles).slice(0, 12000) }],
        { maxTokens: 2000 }
      );
      const review = extractJSON(reviewRaw);
      selfCheckNote = review.note || null;
      if (review.fixedFiles && typeof review.fixedFiles === "object") {
        parsed.files = { ...parsed.files, ...review.fixedFiles };
      }
    } catch (e) {
      // Self-review is best-effort — if it fails, still return the build.
      selfCheckNote = "Self-check skip hua (koi baat nahi, code phir bhi neeche hai).";
    }

    return Response.json({
      files: parsed.files,
      dependencies: parsed.dependencies || {},
      explanation: parsed.explanation || "Ban gaya.",
      selfCheckNote,
    });
  } catch (e) {
    return Response.json({ error: e.message || "Unknown server error" }, { status: 500 });
  }
}
