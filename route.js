export const runtime = "nodejs";

export async function GET() {
  const providers = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    google: !!process.env.GOOGLE_API_KEY,
  };
  const activeProvider =
    Object.entries(providers).find(([, on]) => on)?.[0] || "NONE CONFIGURED";

  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    model_providers_configured: providers,
    provider_that_will_be_used: activeProvider,
    supabase_configured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    vercel_deploy_configured: !!process.env.VERCEL_API_TOKEN,
    adsense_configured: !!(
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT && process.env.NEXT_PUBLIC_ADSENSE_SLOT
    ),
  });
}
