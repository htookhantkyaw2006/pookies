/**
 * The live Pookies project, used when the build has no Supabase settings of
 * its own (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * in .env.local or on Vercel take priority).
 *
 * Both are safe to ship: a publishable key is made to be public. It's sent to
 * every visitor's browser anyway, and grants nothing on its own; row-level
 * security in the database decides what anyone can read or change. Never put
 * the project's secret key (sb_secret_...) here.
 */
export const PROJECT_URL = "https://zgjtpqokajcuynrzsvwo.supabase.co";
export const PROJECT_PUBLISHABLE_KEY = "sb_publishable_xvNEOUAFsY4177HJDXp9WA_PbFe-ca4";
