// Thin abstraction so the app can call Claude, GPT, or DeepSeek with the same
// interface. Add more providers here later (Groq, OpenRouter, etc.) — they
// mostly speak the OpenAI-compatible chat format anyway.

async function callAnthropic(systemPrompt, messages, { maxTokens = 4000 } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing on server");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.content?.map((b) => b.text || "").join("\n") || "";
}

async function callOpenAICompatible(baseUrl, apiKeyEnv, model, systemPrompt, messages, { maxTokens = 4000 } = {}) {
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) throw new Error(`${apiKeyEnv} missing on server`);

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${apiKeyEnv} provider error (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Picks whichever provider actually has a key configured — in this order.
// No user-facing choice: whatever key is in the server's env vars is what runs.
const PROVIDER_ORDER = ["anthropic", "openai", "deepseek", "groq"];
const PROVIDER_ENV = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
};

export function resolveProvider() {
  for (const p of PROVIDER_ORDER) {
    if (process.env[PROVIDER_ENV[p]]) return p;
  }
  throw new Error(
    "Koi bhi model API key set nahi hai server pe. Vercel env vars mein ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, ya GROQ_API_KEY mein se ek daal ke redeploy kar."
  );
}

export async function callModel(provider, systemPrompt, messages, opts) {
  switch (provider) {
    case "anthropic":
      return callAnthropic(systemPrompt, messages, opts);
    case "openai":
      return callOpenAICompatible(
        "https://api.openai.com/v1/chat/completions",
        "OPENAI_API_KEY",
        process.env.OPENAI_MODEL || "gpt-4.1",
        systemPrompt,
        messages,
        opts
      );
    case "deepseek":
      return callOpenAICompatible(
        "https://api.deepseek.com/chat/completions",
        "DEEPSEEK_API_KEY",
        process.env.DEEPSEEK_MODEL || "deepseek-chat",
        systemPrompt,
        messages,
        opts
      );
    case "groq":
      return callOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        "GROQ_API_KEY",
        process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        systemPrompt,
        messages,
        opts
      );
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Models return prose + a JSON block sometimes wrapped in ``` fences.
// Pull the JSON out defensively.
export function extractJSON(raw) {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Model response had no JSON object");
  }
  const candidate = text.slice(start, end + 1);
  return JSON.parse(candidate);
}
