import { createClient } from "@supabase/supabase-js";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://vceaixsnmqlwzddnhrqh.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6-8kjQ7Qth90g-0ztaHLcA_vlTLJ0O6";
export const sb = createClient(supabaseUrl, supabaseKey);
// Recovery must never become the persisted nutrition account session.
export const recoverySb = createClient(supabaseUrl, supabaseKey, {
  auth: { storageKey: 'zolnutrition-recovery', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
// Range through long histories instead of silently hitting PostgREST's row cap.
export async function allRows(makeQuery) {
  const rows = [],
    pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    const page = await result(makeQuery().range(start, start + pageSize - 1));
    rows.push(...(page || []));
    if (!page || page.length < pageSize) return rows;
  }
}
