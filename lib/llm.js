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

async function callGoogleAI(systemPrompt, messages, { maxTokens = 4000 } = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY missing on server");
  const model = process.env.GOOGLE_MODEL || "gemma-4-12b-it";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GOOGLE_API_KEY provider error (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
}

// Picks whichever provider actually has a key configured — in this order.
// No user-facing choice: whatever key is in the server's env vars is what runs.
const PROVIDER_ORDER = ["anthropic", "openai", "deepseek", "groq", "google", "openrouter"];
const PROVIDER_ENV = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
  google: "GOOGLE_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export function resolveProvider() {
  for (const p of PROVIDER_ORDER) {
    if (process.env[PROVIDER_ENV[p]]) return p;
  }
  throw new Error(
    "Koi bhi model API key set nahi hai server pe. Vercel env vars mein ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY, GOOGLE_API_KEY, ya OPENROUTER_API_KEY mein se ek daal ke redeploy kar."
  );
}

function configuredProviders() {
  return PROVIDER_ORDER.filter((p) => process.env[PROVIDER_ENV[p]]);
}

// Tries every configured provider in priority order, moving to the next one
// if the current one errors (rate limit, no balance, bad key, etc.) — so a
// single provider running dry doesn't break the app.
export async function callWithFallback(systemPrompt, messages, opts) {
  const providers = configuredProviders();
  if (providers.length === 0) {
    throw new Error(
      "Koi bhi model API key set nahi hai server pe. Vercel env vars mein ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY, GOOGLE_API_KEY, ya OPENROUTER_API_KEY mein se ek daal ke redeploy kar."
    );
  }
  let lastError;
  for (const provider of providers) {
    try {
      const text = await callModel(provider, systemPrompt, messages, opts);
      return { text, providerUsed: provider };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// Same as callWithFallback, but also requires the response to contain valid
// JSON — a weaker/free model replying with plain prose (no JSON) counts as a
// failure here too, so we move on to the next configured provider instead of
// surfacing a parse error to the user.
export async function callJSONWithFallback(systemPrompt, messages, opts) {
  const providers = configuredProviders();
  if (providers.length === 0) {
    throw new Error(
      "Koi bhi model API key set nahi hai server pe. Vercel env vars mein ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY, GOOGLE_API_KEY, ya OPENROUTER_API_KEY mein se ek daal ke redeploy kar."
    );
  }
  let lastError;
  for (const provider of providers) {
    try {
      const text = await callModel(provider, systemPrompt, messages, opts);
      const parsed = extractJSON(text);
      return { parsed, providerUsed: provider };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
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
        process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        systemPrompt,
        messages,
        opts
      );
    case "google":
      return callGoogleAI(systemPrompt, messages, opts);
    case "openrouter":
      return callOpenAICompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        "OPENROUTER_API_KEY",
        process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1:free",
        systemPrompt,
        messages,
        opts
      );
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ---- Vision (image-based "clone this design") support ----
// Only Claude, GPT, and Gemini can actually see images — Groq/DeepSeek/
// OpenRouter free models mostly can't, so an image request only tries
// whichever of those three are configured.
const VISION_PROVIDERS = ["anthropic", "openai", "google"];

function configuredVisionProviders() {
  return VISION_PROVIDERS.filter((p) => process.env[PROVIDER_ENV[p]]);
}

async function callWithImage(provider, systemPrompt, textPrompt, imageDataUrl, opts) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) throw new Error("Image data URL format galat hai");
  const mediaType = match[1];
  const base64Data = match[2];

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: opts?.maxTokens || 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
              { type: "text", text: textPrompt },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic vision error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.content?.map((b) => b.text || "").join("\n") || "";
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1",
        max_tokens: opts?.maxTokens || 4000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: textPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI vision error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  if (provider === "google") {
    const apiKey = process.env.GOOGLE_API_KEY;
    const model = process.env.GOOGLE_MODEL || "gemma-4-12b-it";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: mediaType, data: base64Data } },
                { text: textPrompt },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: opts?.maxTokens || 4000 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Google vision error (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
  }

  throw new Error(`${provider} vision support nahi karta`);
}

export async function callJSONWithImageFallback(systemPrompt, textPrompt, imageDataUrl, opts) {
  const providers = configuredVisionProviders();
  if (providers.length === 0) {
    throw new Error(
      "Image se banane ke liye Claude, GPT, ya Gemini mein se koi ek key chahiye (Groq/DeepSeek images nahi dekh sakte). ANTHROPIC_API_KEY, OPENAI_API_KEY, ya GOOGLE_API_KEY daal ke redeploy kar."
    );
  }
  let lastError;
  for (const provider of providers) {
    try {
      const text = await callWithImage(provider, systemPrompt, textPrompt, imageDataUrl, opts);
      const parsed = extractJSON(text);
      return { parsed, providerUsed: provider };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
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
