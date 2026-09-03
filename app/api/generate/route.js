import { callJSONWithFallback, callJSONWithImageFallback, callWithFallback, extractJSON } from "../../../lib/llm";

export const runtime = "nodejs";

const BUILD_SYSTEM_PROMPT = `You are Forge, an expert full-stack engineer having a conversation with someone building an app. You generate complete, working project files OR just discuss/answer their question — whichever fits what they said.

Reply with ONLY a single JSON object. No prose outside it, no markdown fences.

If they're asking a question, reporting a bug, or discussing something (not asking you to build/change something yet):
  { "type": "chat", "reply": "Your Hinglish response — explain, ask what they mean, discuss the problem, suggest options." }

If they want you to build or change something:
  {
    "type": "build",
    "plan": ["short bullet of what you're building/changing", "another bullet", "..."],
    "runtime": "browser", "node", or "python",
    "files": { "/App.js": "...", "/components/Foo.js": "..." },
    "dependencies": { "package-name": "version" },
    "explanation": "One short friendly sentence in Hinglish describing what you built."
  }
"plan" is 2-4 short bullets (Hinglish OK) of what you're about to build/change — written BEFORE you reason through the files, like you're telling the person your approach first.

If this is an automatic error-fix request (the message will say so explicitly):
  {
    "type": "build",
    "plan": ["Error ki wajah: ...", "Fix: ..."],
    "runtime": "browser", "node", or "python",
    "files": { only the files you changed to fix it },
    "dependencies": {},
    "explanation": "One short sentence in Hinglish about what was wrong and what you fixed."
  }

Rules for "build":
- Set "runtime": "browser" for anything with a visual UI — Sandpack "react" template conventions (/App.js is the entry, /index.js and /public/index.html already exist).
- Set "runtime": "node" for backend services, CLIs, or bots with no browser UI.
- Every file must be complete, valid, runnable code — no placeholders like "// rest unchanged".
- Prefer plain inline styles over Tailwind unless asked (Sandpack's react template has no Tailwind).
- Keep dependencies minimal, only from npm's public registry.
- If given current files, modify them — keep unrelated files intact, only include changed/new files.
- Match the existing runtime unless asked to change it.
- SCROLLING: never set a fixed "height: 100vh" with "overflow: hidden" on the outer container if content can grow (lists, long text, forms). Use "minHeight: 100vh" on the outer wrapper so the page scrolls naturally. If you build a fixed-height layout (header/footer), the scrollable middle section must have "overflowY: 'auto'" with an explicit height/flex.`;

const REVIEW_SYSTEM_PROMPT = `You are a meticulous code reviewer for a Sandpack "react" template app. Check for: syntax errors, missing imports, undefined variables/components, mismatched JSX tags, obviously broken logic.

Reply with ONLY a single JSON object, no prose outside it:
{
  "ok": true or false,
  "fixedFiles": { "/App.js": "..." },
  "note": "One short sentence in Hinglish: 'Sab sahi laga' or what you fixed."
}`;

export async function POST(req) {
  try {
    const { messages, currentFiles, image } = await req.json();
    if (!messages?.length) {
      return Response.json({ error: "Missing messages" }, { status: 400 });
    }

    const userTurns = [...messages];
    if (currentFiles && Object.keys(currentFiles).length) {
      userTurns.push({
        role: "user",
        content: `Current files in the project (for context, may need edits):\n${JSON.stringify(currentFiles).slice(0, 12000)}`,
      });
    }

    let parsed, providerUsed;
    try {
      if (image) {
        const lastUserText = messages[messages.length - 1]?.content || "Is design jaisa bana do";
        const imagePrompt = `${lastUserText}\n\nBuild a React app whose UI is inspired by the attached image — match the general layout, color palette, spacing, and component structure. Do not claim it is an exact pixel-perfect copy of any specific real product or reproduce any identifiable logos/brand marks verbatim; treat this as "inspired by" reference for original code you write.`;
        const result = await callJSONWithImageFallback(BUILD_SYSTEM_PROMPT, imagePrompt, image, { maxTokens: 4000 });
        parsed = result.parsed;
        providerUsed = result.providerUsed;
      } else {
        const result = await callJSONWithFallback(BUILD_SYSTEM_PROMPT, userTurns, { maxTokens: 4000 });
        parsed = result.parsed;
        providerUsed = result.providerUsed;
      }
    } catch (e) {
      return Response.json({ error: `Model response wasn't valid JSON: ${e.message}` }, { status: 502 });
    }

    if (parsed.type === "chat") {
      return Response.json({ type: "chat", reply: parsed.reply || "...", providerUsed });
    }

    if (!parsed.files || typeof parsed.files !== "object") {
      return Response.json({ error: "Model response had no files object" }, { status: 502 });
    }

    let selfCheckNote = null;
    try {
      const mergedFiles = { ...currentFiles, ...parsed.files };
      const { parsed: review } = await callJSONWithFallback(
        REVIEW_SYSTEM_PROMPT,
        [{ role: "user", content: JSON.stringify(mergedFiles).slice(0, 12000) }],
        { maxTokens: 2000 }
      );
      selfCheckNote = review.note || null;
      if (review.fixedFiles && typeof review.fixedFiles === "object") {
        parsed.files = { ...parsed.files, ...review.fixedFiles };
      }
    } catch (e) {
      selfCheckNote = "Self-check skip hua (koi baat nahi, code phir bhi neeche hai).";
    }

    return Response.json({
      type: "build",
      plan: Array.isArray(parsed.plan) ? parsed.plan : [],
      files: parsed.files,
      dependencies: parsed.dependencies || {},
      explanation: parsed.explanation || "Ban gaya.",
      runtime: ["node", "python"].includes(parsed.runtime) ? parsed.runtime : "browser",
      selfCheckNote,
      providerUsed,
    });
  } catch (e) {
    return Response.json({ error: e.message || "Unknown server error" }, { status: 500 });
  }
}
