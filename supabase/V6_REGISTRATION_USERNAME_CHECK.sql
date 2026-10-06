-- OPTIONAL: run manually in Supabase SQL Editor for friendly pre-signup checks.
-- No table, index, constraint, trigger, existing function or RLS policy changes.
-- Username availability is public; this function returns only one boolean.
-- The existing profiles_username_unique constraint remains the final authority.
BEGIN;
CREATE FUNCTION public.zn_registration_username_available_v1(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN p_username IS NULL OR length(btrim(p_username)) NOT BETWEEN 3 AND 30
    THEN false
    ELSE NOT EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE lower(btrim(p.username)) = lower(btrim(p_username))
    ) END;
$$;
REVOKE ALL ON FUNCTION public.zn_registration_username_available_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zn_registration_username_available_v1(text) TO anon, authenticated;
COMMIT;
-- Read-only check after installation:
-- SELECT public.zn_registration_username_available_v1('mojxd');
-- This is a UX check, not a cross-request reservation. Concurrent signup can
-- still lose a race to the existing unique constraint; the UI handles failure.
