import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function GET(req) {
  const supabase = getServerClient();
  if (!supabase) return Response.json({ error: "Supabase not configured on server" }, { status: 501 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const versionId = searchParams.get("versionId");

  if (versionId) {
    const { data, error } = await supabase
      .from("project_versions")
      .select("*")
      .eq("id", versionId)
      .single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json({ version: data });
  }

  if (!projectId) return Response.json({ error: "projectId chahiye" }, { status: 400 });

  const { data, error } = await supabase
    .from("project_versions")
    .select("id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ versions: data });
}
