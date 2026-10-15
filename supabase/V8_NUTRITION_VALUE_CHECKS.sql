-- ZolNutrition: reject impossible nutrition values in the database.
--
-- The app validates inputs, but rows are written straight from the browser,
-- so these checks make the database the final guard. Checked against the live
-- project first: no existing row violates them. If any did, the transaction
-- would fail and nothing would change.

begin;

alter table public.meal_entries
  drop constraint if exists meal_entries_values_non_negative,
  add constraint meal_entries_values_non_negative check (
    coalesce(quantity_g, 0) >= 0 and coalesce(calories, 0) >= 0 and coalesce(protein, 0) >= 0
    and coalesce(carbs, 0) >= 0 and coalesce(fat, 0) >= 0
  );

alter table public.saved_meal_items
  drop constraint if exists saved_meal_items_values_non_negative,
  add constraint saved_meal_items_values_non_negative check (
    coalesce(quantity_g, 0) >= 0 and coalesce(calories, 0) >= 0 and coalesce(protein, 0) >= 0
    and coalesce(carbs, 0) >= 0 and coalesce(fat, 0) >= 0
  );

alter table public.foods
  drop constraint if exists foods_values_non_negative,
  add constraint foods_values_non_negative check (
    coalesce(serving_size_g, 0) >= 0 and coalesce(calories, 0) >= 0 and coalesce(protein, 0) >= 0
    and coalesce(carbs, 0) >= 0 and coalesce(fat, 0) >= 0
  );

alter table public.weight_logs
  drop constraint if exists weight_logs_weight_range,
  add constraint weight_logs_weight_range check (weight_kg > 0 and weight_kg <= 500);

alter table public.nutrition_goals
  drop constraint if exists nutrition_goals_values_non_negative,
  add constraint nutrition_goals_values_non_negative check (
    coalesce(daily_calories, 0) >= 0 and coalesce(daily_protein, 0) >= 0
    and coalesce(daily_carbs, 0) >= 0 and coalesce(daily_fat, 0) >= 0
    and coalesce(training_day_calories, 0) >= 0 and coalesce(training_day_protein, 0) >= 0
    and coalesce(training_day_carbs, 0) >= 0 and coalesce(training_day_fat, 0) >= 0
    and coalesce(rest_day_calories, 0) >= 0 and coalesce(rest_day_protein, 0) >= 0
    and coalesce(rest_day_carbs, 0) >= 0 and coalesce(rest_day_fat, 0) >= 0
    and (target_weight_kg is null or (target_weight_kg > 0 and target_weight_kg <= 500))
  );

commit;

-- Verification (read-only): lists the new constraints.
select conrelid::regclass as table_name, conname, convalidated
from pg_constraint
where conname in ('meal_entries_values_non_negative', 'saved_meal_items_values_non_negative',
  'foods_values_non_negative', 'weight_logs_weight_range', 'nutrition_goals_values_non_negative')
order by 1;
