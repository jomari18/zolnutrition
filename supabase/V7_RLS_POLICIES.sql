-- ZolNutrition row-level security, recorded from the live project (Oct 2026).
--
-- These policies were created in the Supabase dashboard and are already
-- applied. This file documents them and recreates them identically on a fresh
-- project. Every table is private to its owner; foods also exposes shared
-- system foods (user_id IS NULL). Updates use WITH CHECK so rows cannot be
-- moved to another account.

begin;

alter table public.foods enable row level security;
alter table public.meal_entries enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.profiles enable row level security;
alter table public.weight_logs enable row level security;
-- saved_meals and saved_meal_items: see V5_zolnutrition_v3.sql

-- foods: system foods (user_id IS NULL) plus your own custom foods
drop policy if exists "Users can view system and own foods" on public.foods;
create policy "Users can view system and own foods" on public.foods
  for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
drop policy if exists "Users can create own custom foods" on public.foods;
create policy "Users can create own custom foods" on public.foods
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own custom foods" on public.foods;
create policy "Users can update own custom foods" on public.foods
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own custom foods" on public.foods;
create policy "Users can delete own custom foods" on public.foods
  for delete to authenticated using ((select auth.uid()) = user_id);

-- meal_entries
drop policy if exists "Users can view own meal entries" on public.meal_entries;
create policy "Users can view own meal entries" on public.meal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own meal entries" on public.meal_entries;
create policy "Users can create own meal entries" on public.meal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own meal entries" on public.meal_entries;
create policy "Users can update own meal entries" on public.meal_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own meal entries" on public.meal_entries;
create policy "Users can delete own meal entries" on public.meal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- nutrition_goals
drop policy if exists "Users can view own nutrition goals" on public.nutrition_goals;
create policy "Users can view own nutrition goals" on public.nutrition_goals
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own nutrition goals" on public.nutrition_goals;
create policy "Users can create own nutrition goals" on public.nutrition_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own nutrition goals" on public.nutrition_goals;
create policy "Users can update own nutrition goals" on public.nutrition_goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own nutrition goals" on public.nutrition_goals;
create policy "Users can delete own nutrition goals" on public.nutrition_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

-- profiles (keyed by id = auth user id; no delete policy)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- weight_logs
drop policy if exists "Users can view own weight logs" on public.weight_logs;
create policy "Users can view own weight logs" on public.weight_logs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own weight logs" on public.weight_logs;
create policy "Users can create own weight logs" on public.weight_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own weight logs" on public.weight_logs;
create policy "Users can update own weight logs" on public.weight_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own weight logs" on public.weight_logs;
create policy "Users can delete own weight logs" on public.weight_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
