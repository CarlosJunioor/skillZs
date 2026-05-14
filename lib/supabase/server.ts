import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _service: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/** Service-role client. Server-only. Bypasses RLS. */
export function supabaseService(): SupabaseClient {
  if (_service) return _service;
  _service = createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_KEY"), {
    auth: { persistSession: false },
  });
  return _service;
}

/** Anon (public) client for reads. */
export function supabaseAnon(): SupabaseClient {
  if (_anon) return _anon;
  _anon = createClient(need("SUPABASE_URL"), need("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
  });
  return _anon;
}
