import { createClient } from "@supabase/supabase-js";
export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL ||
    "https://vceaixsnmqlwzddnhrqh.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_6-8kjQ7Qth90g-0ztaHLcA_vlTLJ0O6",
);
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
