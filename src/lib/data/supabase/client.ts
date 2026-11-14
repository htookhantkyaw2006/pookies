import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** True when the app should talk to the real backend instead of sample data. */
export const hasSupabaseConfig =
  URL !== "" && KEY !== "" && process.env.NEXT_PUBLIC_DATA_SOURCE !== "sample";

let client: SupabaseClient<Database> | null = null;

/** The one Supabase client for this browser tab. Browser only. */
export function getSupabase(): SupabaseClient<Database> {
  client ??= createClient<Database>(URL, KEY, {
    // Keep the live connection's heartbeat in a worker, so browsers that slow
    // down background tabs don't drop people out of the office.
    realtime: { worker: true },
  });
  return client;
}
