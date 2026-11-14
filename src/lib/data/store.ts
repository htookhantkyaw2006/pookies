import { mockStore } from "./mock/store";
import { hasSupabaseConfig } from "./supabase/client";
import { supabaseStore } from "./supabase/store";
import type { OfficeStore } from "./types";

/**
 * The single place that decides which backend the app talks to: the real one
 * when Supabase is configured (see .env.example), otherwise the sample office.
 */
export const officeStore: OfficeStore = hasSupabaseConfig ? supabaseStore : mockStore;
