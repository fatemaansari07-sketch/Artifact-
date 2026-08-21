import { createClient } from "@supabase/supabase-js";

let browserClient = null;

// Client-side client — uses the public anon key, safe to expose.
export function getSupabaseBrowser() {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null; // Supabase not configured — save/load just won't be available.
  browserClient = createClient(url, anonKey);
  return browserClient;
}
