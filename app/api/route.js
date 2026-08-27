import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

export async function POST(req) {
  const supabase = getServerClient();
  if (!supabase) return Response.json({ error: "Supabase not configured on server" }, { status: 501 });
  const { name, files, dependencies } = await req.json();
  if (!name || !files) return Response.json({ error: "name and files are required" }, { status: 400 });
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, files, dependencies: dependencies || {} })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ project: data });
}

export async function GET(req) {
  const supabase = getServerClient();
  if (!supabase) return Response.json({ error: "Supabase not configured on server" }, { status: 501 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const publicOnly = searchParams.get("public") === "true";

  if (id) {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json({ project: data });
  }

  let query = supabase
    .from("projects")
    .select("id, name, created_at, is_public, deployed_url")
    .order("created_at", { ascending: false })
    .limit(50);
  if (publicOnly) query = query.eq("is_public", true).not("deployed_url", "is", null);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ projects: data });
}

export async function PATCH(req) {
  const supabase = getServerClient();
  if (!supabase) return Response.json({ error: "Supabase not configured on server" }, { status: 501 });
  const { id, files, dependencies, is_public, deployed_url } = await req.json();
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const update = {};
  if (files) update.files = files;
  if (dependencies) update.dependencies = dependencies;
  if (typeof is_public === "boolean") update.is_public = is_public;
  if (deployed_url) update.deployed_url = deployed_url;

  const { data, error } = await supabase.from("projects").update(update).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ project: data });
}
