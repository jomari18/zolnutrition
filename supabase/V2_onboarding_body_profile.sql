-- ZolNutrition Onboarding v2
-- Adds body/activity inputs used by the recommendation calculator.

alter table public.profiles
  add column if not exists age integer,
  add column if not exists sex text,
  add column if not exists height_cm numeric,
  add column if not exists workouts_per_week integer,
  add column if not exists activity_level text;

alter table public.profiles
  drop constraint if exists profiles_age_check,
  add constraint profiles_age_check check (age is null or age between 16 and 100);

alter table public.profiles
  drop constraint if exists profiles_sex_check,
  add constraint profiles_sex_check check (sex is null or sex in ('male','female'));

alter table public.profiles
  drop constraint if exists profiles_height_cm_check,
  add constraint profiles_height_cm_check check (height_cm is null or height_cm between 120 and 230);

alter table public.profiles
  drop constraint if exists profiles_workouts_per_week_check,
  add constraint profiles_workouts_per_week_check check (workouts_per_week is null or workouts_per_week between 0 and 7);

alter table public.profiles
  drop constraint if exists profiles_activity_level_check,
  add constraint profiles_activity_level_check check (
    activity_level is null or activity_level in ('sedentary','light','moderate','very_active')
  );

grant select, insert, update on table public.profiles to authenticated;
