import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key && !url.includes("YOUR_PROJECT"));
export const supabase = isSupabaseConfigured ? createClient(url!, key!) : null;

export const collegeDomain = (import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN as string | undefined)
 ?.trim().toLowerCase().replace(/^@/, "") ?? "muj.manipal.edu";

export function isCollegeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${collegeDomain}`) && normalized.indexOf("@") > 0;
}
