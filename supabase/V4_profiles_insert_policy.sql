-- Fixes: new row violates row-level security policy for table "profiles"
-- profiles had SELECT and UPDATE policies but no INSERT policy, so upsert() was blocked.
create policy "Users can create own profile" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);
