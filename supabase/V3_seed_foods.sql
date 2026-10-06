-- Optional starter food database (system foods, visible to all users). Values are approximate, per 100 g.
-- Run once in the Supabase SQL editor.
insert into public.foods (user_id,name,serving_size_g,calories,protein,carbs,fat) values
(null,'Chicken breast, cooked',100,165,31,0,3.6),
(null,'White rice, cooked',100,130,2.7,28,0.3),
(null,'Egg, whole',100,143,12.6,0.7,9.5),
(null,'Oats, dry',100,389,16.9,66,6.9),
(null,'Banana',100,89,1.1,23,0.3),
(null,'Greek yogurt, nonfat',100,59,10,3.6,0.4),
(null,'Salmon, cooked',100,206,22,0,12),
(null,'Tuna, canned in water',100,116,26,0,0.8),
(null,'Tofu, firm',100,144,16,2.8,8.7),
(null,'Sweet potato, baked',100,90,2,21,0.2),
(null,'Broccoli, cooked',100,35,2.4,7.2,0.4),
(null,'Whole milk',100,61,3.2,4.8,3.3),
(null,'Peanut butter',100,588,25,20,50),
(null,'White bread',100,265,9,49,3.2),
(null,'Olive oil',100,884,0,0,100);
