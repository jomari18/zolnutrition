/* Optional integration check. See README. Uses only mocked Supabase/OFF endpoints. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5180";
const today = new Date().toLocaleDateString("en-CA");
const prior = (() => {
  const d = new Date(today + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
})();
const uid = "11111111-1111-4111-8111-111111111111";
const user = {
  id: uid,
  email: "test@example.com",
  aud: "authenticated",
  identities: [{ id: uid }],
};
const token = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  Buffer.from(
    JSON.stringify({
      sub: uid,
      exp: Math.floor(Date.now() / 1000) + 3600,
      role: "authenticated",
    }),
  ).toString("base64url"),
  "signature",
].join(".");
const session = {
  access_token: token,
  refresh_token: "mock-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: "bearer",
  user,
};
const defaultGoal = {
  user_id: uid,
  daily_calories: 2000,
  daily_protein: 140,
  daily_carbs: 250,
  daily_fat: 65,
  goal_type: "maintain",
  training_days: [1, 3, 5],
  target_weight_kg: 72,
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--use-gl=disabled",
      "--disable-software-rasterizer",
    ],
  });
  async function harness({ signedIn = true, fresh = false, metadata = {} } = {}) {
    const account = { ...user, user_metadata: { ...metadata } };
    const accountSession = { ...session, user: account };
    const context = await browser.newContext({
        viewport: { width: 1280, height: 950 },
      }),
      page = await context.newPage(),
      errors = [],
      calls = [];
    let counter = 100,
      failure = null,
      state = {
        nutrition_goals: fresh ? null : { ...defaultGoal },
        meal_entries: fresh
          ? []
          : [
              {
                id: 1,
                user_id: uid,
                food_id: 1,
                food_name: "Chicken breast",
                quantity_g: 150,
                calories: 247,
                protein: 46,
                carbs: 0,
                fat: 5,
                meal_type: "lunch",
                logged_date: today,
                created_at: today + "T12:00:00Z",
              },
              {
                id: 2,
                user_id: uid,
                food_name: "Rice yesterday",
                quantity_g: 100,
                calories: 130,
                protein: 2.7,
                carbs: 28,
                fat: 0.3,
                meal_type: "lunch",
                logged_date: prior,
                created_at: prior + "T12:00:00Z",
              },
            ],
        foods: [
          {
            id: 1,
            user_id: uid,
            name: "Chicken breast",
            serving_size_g: 150,
            calories: 247,
            protein: 46,
            carbs: 0,
            fat: 5,
          },
        ],
        saved_meals: [],
        saved_meal_items: [],
        weight_logs: fresh
          ? []
          : [
              { user_id: uid, weight_kg: 70, logged_date: "2026-09-01" },
              { user_id: uid, weight_kg: 74, logged_date: today },
            ],
        profiles: {
          id: uid,
          age: 25,
          sex: "male",
          height_cm: 170,
          workouts_per_week: 3,
          activity_level: "light",
        },
      };
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error" && /ReferenceError|TypeError|above error|Minified React/.test(m.text())) errors.push(m.text()); });
    await page.route(/https:\/\/(fonts.googleapis.com|fonts.gstatic.com)\//, route => route.abort());
    await page.route(
      "https://vceaixsnmqlwzddnhrqh.supabase.co/**",
      async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          name = url.pathname.split("/").pop(),
          method = req.method(),
          body = req.postData() ? req.postDataJSON() : null;
        calls.push({ name, method, body });
        if (failure && failure.name === name && failure.method === method) {
          const f = failure;
          failure = null;
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              code: f.code || "42501",
              message: f.code === "unexpected_failure" && name === "signup" ? "Database error saving new user" : "raw secret server detail",
            }),
          });
          return;
        }
        let data = [];
        if (name === "zn_registration_username_available_v1") data = !["mojxd", "taken"].includes(body.p_username.trim().toLowerCase());
        else if (url.pathname.includes("/auth/")) {
          if (name === "signup") { account.user_metadata = { ...body.data }; data = { user: account, session: null }; }
          else if (name === "verify" || name === "token") data = accountSession;
          else if (name === "user") {
            if (method === "PUT") account.user_metadata = { ...account.user_metadata, ...body.data };
            data = account;
          }
          else data = {};
        } else if (name === "profiles") {
          if (method === "PATCH") Object.assign(state.profiles, body);
          data = state.profiles;
        } else if (name === "nutrition_goals") {
          if (method !== "GET")
            state.nutrition_goals = { ...state.nutrition_goals, ...body };
          data = state.nutrition_goals;
        } else if (Array.isArray(state[name])) {
          const matches = (row) =>
            [...url.searchParams].every(([key, value]) => {
              if (
                ["select", "order", "offset", "limit", "on_conflict"].includes(
                  key,
                )
              )
                return true;
              const [op, ...parts] = value.split("."),
                v = parts.join(".");
              if (op === "eq") return String(row[key]) === v;
              if (op === "gte") return row[key] >= v;
              if (op === "lte") return row[key] <= v;
              return true;
            });
          if (method === "GET") {
            data = state[name].filter(matches);
            const order = url.searchParams.get("order") || "";
            if (order.includes("created_at.desc"))
              data.sort((a, b) => b.created_at.localeCompare(a.created_at));
            if (order.includes("logged_date"))
              data.sort((a, b) => a.logged_date.localeCompare(b.logged_date));
            const offset = Number(url.searchParams.get("offset") || 0),
              limit = Number(url.searchParams.get("limit") || 1000);
            data = data.slice(offset, offset + limit);
          }
          if (method === "POST") {
            const rows = Array.isArray(body) ? body : [body];
            data = rows.map((row) => {
              if (name === "meal_entries")
                assert.ok(!("id" in row), "old entry ID leaked into insert");
              if (name === "weight_logs")
                state[name] = state[name].filter(
                  (w) => w.logged_date !== row.logged_date,
                );
              return {
                ...row,
                id: counter++,
                created_at: new Date().toISOString(),
              };
            });
            state[name].push(...data);
          }
          if (method === "PATCH") {
            data = state[name].filter(matches);
            data.forEach((r) => Object.assign(r, body));
          }
          if (method === "DELETE") {
            data = state[name].filter(matches);
            state[name] = state[name].filter((r) => !matches(r));
            if (name === "saved_meals")
              state.saved_meal_items = state.saved_meal_items.filter(
                (i) => !data.some((s) => s.id === i.saved_meal_id),
              );
          }
          if (req.headers().accept?.includes("vnd.pgrst.object"))
            data = data[0] || null;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      },
    );
    await page.route("https://world.openfoodfacts.org/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          products: [
            {
              product_name: "Mock oats",
              nutriments: {
                "energy-kcal_100g": 380,
                proteins_100g: 13,
                carbohydrates_100g: 60,
                fat_100g: 7,
              },
            },
          ],
        }),
      }),
    );
    if (signedIn)
      await page.addInitScript(
        (s) => {
          const key = "sb-vceaixsnmqlwzddnhrqh-auth-token";
          if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s));
        },
        accountSession,
      );
    await page.goto(base);
    return {
      context,
      page,
      state,
      calls,
      errors,
      account,
      fail: (name, method, code) => {
        failure = { name, method, code };
      },
    };
  }
  const h = await harness(),
    { page, state, calls } = h;
  if (process.env.REGISTRATION_CHECK) {
    const fresh = await harness({signedIn:false,fresh:true});
    const p = fresh.page;
    await p.getByRole('button',{name:'Create an account',exact:true}).click();
    await p.getByLabel('Full name',{exact:true}).fill('Test User');
    await p.getByLabel('Display name',{exact:true}).fill('Test');
    await p.getByLabel('Username',{exact:true}).fill('  Mojxd  ');
    await p.getByLabel('Email',{exact:true}).fill('fresh@example.com');
    await p.getByLabel('Password',{exact:true}).fill('Password123');
    await p.getByLabel('Confirm password',{exact:true}).fill('Password123');
    await p.getByRole('button',{name:'Create Account',exact:true}).click();
    await p.getByText('Username already taken. Choose another.',{exact:true}).waitFor();
    assert.equal(fresh.calls.filter(c=>c.name==='signup').length,0);
    assert.equal(await p.getByLabel('Username',{exact:true}).inputValue(),'  Mojxd  ');
    assert.equal(await p.getByLabel('Password',{exact:true}).inputValue(),'Password123');
    assert.equal(await p.locator('input[name=password]').getAttribute('type'),'password');
    assert.equal(await p.getByLabel('Verification code').count(),0);
    await p.getByLabel('Username',{exact:true}).fill('available');
    fresh.fail('signup','POST','unexpected_failure');
    await p.getByRole('button',{name:'Create Account',exact:true}).click();
    await p.getByText(/Your username may already be taken/).waitFor();
    assert.equal(await p.getByLabel('Verification code').count(),0);
    fresh.fail('zn_registration_username_available_v1','POST','PGRST202');
    await p.getByRole('button',{name:'Create Account',exact:true}).click();
    await p.getByLabel('Verification code').waitFor();
    assert.equal(await p.getByLabel('Verification code').inputValue(),'');
    assert.equal(fresh.account.user_metadata.username,'available');
    assert.deepEqual(fresh.errors,[]);
    console.log('PASS: duplicate/mixed-case username blocks signup, inputs preserved, safe generic failure, optional-RPC fallback, empty OTP');
    await browser.close();return;
  }
  if (process.env.ALERT_CHECK) {
    await page.getByRole("heading", {name:"Today",exact:true}).waitFor();
    await page.getByRole("button", {name:"Account settings",exact:true}).click();
    const account = page.getByRole("dialog", {name:"Account settings"});
    await account.getByLabel("Display name",{exact:true}).fill("Draft");
    await account.getByRole("button", {name:"Cancel",exact:true}).click();
    const alert = page.getByRole("dialog", {name:"Discard your unsaved name?"});
    await alert.waitFor();
    assert.equal(await page.locator('dialog[open]').count(), 0, 'native editor suspended');
    assert.equal(await page.getByRole('dialog').count(), 1);
    for (let i=0; i<6; i++) {
      await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
      assert.ok(await page.evaluate(() => !!document.activeElement.closest('.swal2-popup')));
    }
    for(const theme of ['dark','light']) {
      await page.evaluate(t => document.documentElement.dataset.theme=t, theme);
      for(const width of [320,390,430,768,1280]) {
        await page.setViewportSize({width,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        const bounds=await alert.boundingBox(); assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width+1);
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>document.documentElement.dataset.theme='dark');
    await page.screenshot({path:'/tmp/zn-alert-mobile.png'});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await alert.evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.evaluate(() => window.dispatchEvent(new Event('zolnutrition:alert-back',{cancelable:true})));
    await alert.waitFor({state:'hidden'});
    await account.waitFor();
    assert.equal(await account.getByLabel('Display name',{exact:true}).inputValue(),'Draft');
    await account.getByRole('button',{name:'Cancel',exact:true}).click();
    await alert.waitFor(); await page.keyboard.press('Escape'); await alert.waitFor({state:'hidden'});
    await account.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Discard changes'}).click();
    await account.waitFor({state:'hidden'});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Account settings');
    h.fail('nutrition_goals','GET'); await page.reload();
    await page.getByRole('button',{name:'Retry',exact:true}).click();
    const recovery=page.getByRole('dialog',{name:'Unable to load your targets'});
    await recovery.waitFor();
    assert.equal(await page.locator('.notice.bad').count(),0,'no duplicate background error');
    await recovery.getByRole('button',{name:'Not now'}).click();
    await page.getByRole('button',{name:'Retry',exact:true}).click();
    const writes=calls.filter(c=>c.method!=='GET').length;
    await recovery.getByRole('button',{name:'Retry',exact:true}).click();
    await page.getByRole('heading',{name:'Today',exact:true}).waitFor();
    assert.equal(calls.filter(c=>c.method!=='GET').length,writes,'retry only reads');
    await page.getByRole('button',{name:'Save meal',exact:true}).first().click();
    const save=page.getByRole('dialog',{name:'Save meal'});
    await save.getByLabel('Meal name').fill('   ');
    await save.getByRole('button',{name:'Save meal',exact:true}).click();
    await save.getByText('Enter a meal name.').waitFor();
    await page.keyboard.press('Escape');
    state.weight_logs = Array.from({length:6},(_,i)=>({user_id:uid,weight_kg:70+i,logged_date:new Date(Date.now()-(5-i)*86400000).toISOString().slice(0,10)}));
    await page.reload();
    await page.locator('.main-tabs').getByRole('button',{name:'Progress',exact:true}).click();
    await page.getByRole('button',{name:'Apply -100 kcal',exact:true}).click();
    const adjustment=page.getByRole('dialog',{name:'Adjust calorie targets?'});
    await adjustment.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(state.nutrition_goals.rest_day_calories,undefined);
    await page.getByRole('button',{name:'Apply -100 kcal',exact:true}).click();
    await adjustment.getByRole('button',{name:'Apply adjustment'}).click();
    await page.getByText('Targets saved.',{exact:true}).waitFor();
    assert.equal(state.nutrition_goals.rest_day_calories,1900);
    assert.equal(state.nutrition_goals.training_day_calories,1900);
    assert.deepEqual(h.errors,[]);
    console.log('PASS: SweetAlert focus, Back/Escape, restoration, dark/light mobile, reduced motion, safe read recovery, name validation');
    await browser.close();return;
  }
  if (process.env.PROFILE_CHECK) {
    await page.getByRole("heading", {name:"Today",exact:true}).waitFor();
    await page.getByText("Welcome back",{exact:true}).waitFor();
    const trigger=page.getByRole("button",{name:"Account settings",exact:true});
    await trigger.click();
    const d=page.getByRole("dialog",{name:"Account settings"});
    await d.getByLabel("Display name",{exact:true}).fill("  Jomari   M.  ");
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", {name:"Discard your unsaved name?"}).waitFor();
    await page.getByRole("button",{name:"Keep editing"}).click();
    h.fail("user","PUT","unexpected_failure");
    await d.getByRole("button",{name:"Save name"}).click();
    await d.locator(".toast.bad").waitFor();
    assert.equal(await page.locator(".toast.bad").count(),1,"error is not duplicated outside dialog");
    await page.waitForTimeout(3800);
    assert.equal(await d.locator(".toast.bad").count(),1,"errors persist");
    await d.getByRole("button",{name:"Save name"}).click();
    await d.waitFor({state:"hidden"});
    await page.getByText("Hi, Jomari M.",{exact:true}).waitFor();
    assert.equal(h.account.user_metadata.display_name,"Jomari M.");
    assert.equal(await page.locator(".toast.bad").count(),1,"success does not erase error");
    assert.equal(await page.locator(".toast.success").count(),1);
    await page.waitForTimeout(3800);
    assert.equal(await page.locator(".toast.success").count(),0,"success auto-dismisses");
    await page.getByRole("button",{name:"Dismiss error"}).click();
    await page.reload();
    await page.getByText("Hi, Jomari M.",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Account settings",exact:true}).click();
    await d.getByLabel("Display name",{exact:true}).fill("Unsaved name");
    await d.getByRole("button",{name:"Cancel",exact:true}).click();
    await page.getByRole("button",{name:"Discard changes"}).click();
    await page.getByText("Hi, Jomari M.",{exact:true}).waitFor();
    for(const width of [320,390,430,768,1280]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("button",{name:"Account settings",exact:true}).click();
    await d.getByLabel("Display name",{exact:true}).fill("A".repeat(50));
    await d.getByRole("button",{name:"Save name"}).click();
    await d.waitFor({state:"hidden"});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:"/tmp/zn-profile-mobile.png",fullPage:false});
    const legacy=await harness({metadata:{full_name:"Legacy User",username:"legacy"}});
    await legacy.page.getByText("Hi, Legacy User",{exact:true}).waitFor();
    await legacy.page.getByRole("button",{name:"Account settings",exact:true}).click();
    await legacy.page.getByLabel("Display name",{exact:true}).fill("Legacy");
    await legacy.page.getByRole("button",{name:"Save name"}).click();
    await legacy.page.getByText("Hi, Legacy",{exact:true}).waitFor();
    assert.equal(legacy.account.user_metadata.full_name,"Legacy User");
    assert.equal(legacy.account.user_metadata.username,"legacy");
    assert.deepEqual([...h.errors,...legacy.errors],[]);
    console.log("PASS: no-name and legacy accounts; name edit, save failure/retry, discard, refresh persistence, feedback lifetime, mobile layout");
    await browser.close();return;
  }
  if (process.env.NATIVE_CHECK) {
    await page.setViewportSize({width:390,height:844});
    await page.getByRole("heading",{name:"Today",exact:true}).waitFor();
    await page.locator(".main-tabs").getByRole("button",{name:"Progress",exact:true}).click();
    await page.getByRole("heading",{name:"Progress",exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.dispatchEvent(new Event("zolnutrition:back",{cancelable:true}))),false);
    await page.getByRole("heading",{name:"Today",exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.dispatchEvent(new Event("zolnutrition:back",{cancelable:true}))),true);
    await page.getByRole("button",{name:"Log food",exact:true}).last().click();
    await page.locator("dialog[open]").waitFor();
    await page.locator("dialog[open]").evaluate(d=>d.dispatchEvent(new Event("cancel",{cancelable:true})));
    await page.locator("dialog[open]").waitFor({state:"hidden"});
    for (const width of [320,390,430,768]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);
    }
    const a=await harness({signedIn:false,fresh:true});
    await a.page.getByRole("button",{name:"Create an account"}).click();
    await a.page.getByLabel("Password",{exact:true}).fill("Mock-password123!");
    await a.page.getByRole("button",{name:"Show password",exact:true}).click();
    assert.equal(await a.page.evaluate(()=>window.dispatchEvent(new Event("zolnutrition:back",{cancelable:true}))),false);
    await a.page.getByRole("heading",{name:"Welcome back"}).waitFor();
    assert.equal(await a.page.getByLabel("Password",{exact:true}).inputValue(),"");
    assert.equal(await a.page.getByLabel("Password",{exact:true}).getAttribute("type"),"password");
    assert.deepEqual([...h.errors,...a.errors],[]);
    console.log("Android Back simulation, dialog close, password reset and mobile widths passed");
    await browser.close(); return;
  }
  if (process.env.DESIGN_PREVIEW) {
    // Illustrative account data for screenshots only; all endpoints stay mocked.
    await page.setViewportSize({ width: 1536, height: 1000 });
    state.weight_logs = Array.from({ length: 10 }, (_, i) => ({ user_id: uid, weight_kg: +(70.8 + i * .025 + Math.sin(i) * .13).toFixed(1), logged_date: (() => { const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - 18 + i * 2); return d.toLocaleDateString("en-CA"); })() }));
    state.meal_entries = [];
    let id = 1000;
    for (let j = -6; j <= 0; j++) {
      const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() + j); const date = d.toLocaleDateString("en-CA");
      const foods = [{ food_name: "Oatmeal with banana", quantity_g: 250, calories: 380, protein: 16, carbs: 62, fat: 8, meal_type: "breakfast" }, { food_name: "Boiled egg", quantity_g: 50, calories: 78, protein: 6, carbs: 1, fat: 5, meal_type: "breakfast" }, { food_name: "Grilled chicken breast", quantity_g: 180, calories: 297, protein: 56, carbs: 0, fat: 6.5, meal_type: "lunch" }, { food_name: "Steamed white rice", quantity_g: 250, calories: 325, protein: 6, carbs: 70, fat: .7, meal_type: "lunch" }];
      for (const f of foods) state.meal_entries.push({ ...f, id: id++, user_id: uid, logged_date: date, created_at: date + "T12:00:00Z" });
      if (j < 0) state.meal_entries.push({ food_name: "Dinner", quantity_g: 300, calories: 550 + j * 35, protein: 35, carbs: 65, fat: 15, meal_type: "dinner", id: id++, user_id: uid, logged_date: date, created_at: date + "T18:00:00Z" });
    }
    state.saved_meals = [{id: 2001, user_id: uid, name: "Chicken & rice lunch", created_at: today + "T12:00:00Z"}, {id: 2002, user_id: uid, name: "Breakfast routine", created_at: today + "T08:00:00Z"}];
    state.saved_meal_items = state.meal_entries.filter(i => i.logged_date === today).map(i => ({...i, saved_meal_id: i.meal_type === "breakfast" ? 2002 : 2001, sort_order: i.id}));
    await page.reload();
    await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
    await page.locator(".macro-cards").waitFor();
    await page.waitForTimeout(400);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".log-panel").screenshot({animations: "disabled", path:"/tmp/zolnutrition-logger-polish.png"});
    await page.screenshot({animations: "disabled",  path: process.env.DESKTOP_SCREENSHOT || "/tmp/zolnutrition-dashboard-desktop.png", fullPage: true });
    await page.getByRole("button", {name:"Search",exact:true}).click();
    await page.getByLabel("Search foods").fill("steak cooked");
    await page.getByRole("region", {name:"Basic food results"}).getByRole("button").first().waitFor();
    for (const width of [320,390,768,1024,1536]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"food search overflow "+width);
    }
    await page.waitForTimeout(350);
    await page.evaluate(()=>document.querySelector('.sticky-summary').style.display='none');
    await page.locator(".log-panel .food-browser").screenshot({animations:"disabled",path:"/tmp/zolnutrition-food-search.png"});
    await page.evaluate(()=>document.querySelector('.sticky-summary').style.removeProperty('display'));
    await page.getByLabel("Search foods").fill("chicken breast");
    await page.getByLabel("Preparation", {exact:true}).selectOption("Raw");
    assert.ok(await page.getByRole("region", {name:"Basic food results"}).getByRole("button").count() > 0);
    await page.getByRole("button", {name:"Recent",exact:true}).click();
    for (const width of [390, 320, 768, 1024, 1280, 1536]) {
      await page.setViewportSize({ width, height: 844 });
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) { console.log("overflow", width, await page.evaluate(() => [...document.querySelectorAll("*")].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => [e.tagName,e.className,e.getBoundingClientRect().width]).slice(0,25))); await page.screenshot({animations: "disabled", path:"/tmp/zn-overflow.png",fullPage:true}); }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    await page.screenshot({animations: "disabled",  path: "/tmp/zolnutrition-mobile-overview.png" });
    await page.screenshot({animations: "disabled",  path: process.env.MOBILE_SCREENSHOT || "/tmp/zolnutrition-dashboard-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Log food", exact: true }).last().click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(350);
    await page.screenshot({animations: "disabled",  path: "/tmp/zolnutrition-logging-sheet.png" });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Change color theme" }).click();
    await page.waitForTimeout(350);
    await page.screenshot({animations: "disabled",  path: "/tmp/zolnutrition-dashboard-light.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.locator(".tab-content").evaluate(e => getComputedStyle(e).animationName), "none");
    const fs = require("node:fs");
    const previews = process.env.PREVIEW_DIR || "/tmp/zn-redesign-previews";
    fs.mkdirSync(previews, { recursive: true });
    await page.getByRole("button", { name: "Change color theme" }).click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const section of ["Saved meals", "Progress", "Targets"]) {
      await page.setViewportSize({width:1536,height:1000});
      await page.getByRole("button", {name: section, exact:true}).click();
      await page.getByRole("heading", {name: section, exact:true,level:1}).waitFor();
      if(section === "Progress") await page.getByLabel("Explore weigh-ins").waitFor();
      if(section === "Targets") await page.getByRole("button", {name:"Save schedule & targets"}).waitFor();
      await page.waitForTimeout(350);
      await page.screenshot({animations: "disabled", path:previews+"/"+section.toLowerCase().replace(" ","-")+"-desktop.png",fullPage:true});
      for(const width of [320,390,768,1024,1280,1536]) {
        await page.setViewportSize({width,height:844});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false, section+" overflow at "+width);
      }
      await page.setViewportSize({width:390,height:844});
      const short = await page.locator("button:visible").evaluateAll(es=>es.filter(e=>!e.disabled && e.getBoundingClientRect().height<43.5).map(e=>e.textContent));
      assert.deepEqual(short,[],section+" small tap controls");
      await page.screenshot({animations: "disabled", path:previews+"/"+section.toLowerCase().replace(" ","-")+"-mobile.png",fullPage:true});
      await page.getByRole("button",{name:"Change color theme"}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,section+" light overflow");
      await page.getByRole("button",{name:"Change color theme"}).click();
    }
    assert.deepEqual(h.errors, []);
    await h.context.close();
    const f = await harness({ signedIn:false, fresh:true }), a=f.page;
    await a.getByRole("heading",{name:"Welcome back"}).waitFor();
    await a.evaluate(()=>document.fonts.ready);
    await a.screenshot({animations: "disabled", path:previews+"/login-desktop.png",fullPage:true});
    await a.setViewportSize({width:390,height:844});
    await a.screenshot({animations: "disabled", path:previews+"/login-mobile.png",fullPage:true});
    await a.getByRole("button",{name:"Create an account"}).click();
    await a.getByLabel("Full name").fill("Test User");
  await a.getByLabel("Display name", {exact:true}).fill("Test");
    await a.getByLabel("Username").fill("testuser");
    await a.getByLabel("Email",{exact:true}).fill("test@example.com");
    await a.getByLabel("Password",{exact:true}).fill("test-password");
    await a.getByLabel("Confirm password", {exact:true}).fill("test-password");
    await a.screenshot({animations: "disabled", path:previews+"/register-mobile.png",fullPage:true});
    await a.getByRole("button",{name:"Create Account",exact:true}).click();
    await a.getByRole("heading",{name:"Verify your email"}).waitFor();
    await a.screenshot({animations: "disabled", path:previews+"/otp-mobile.png",fullPage:true});
    await a.getByLabel("Verification code").fill("12345678");
    await a.getByRole("button",{name:"Verify Email",exact:true}).click();
    await a.getByRole("heading",{name:"Set your daily targets"}).waitFor();
    for(let step=0;step<3;step++) {
      for(const width of [320,390,768,1280]) {
        await a.setViewportSize({width,height:900});
        assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"onboarding overflow "+step+":"+width);
      }
      await a.waitForTimeout(350);
      await a.screenshot({animations: "disabled", path:previews+"/onboarding-"+step+"-desktop.png",fullPage:true});
      if(step<2) await a.getByRole("button",{name:"Continue",exact:true}).click();
    }
    assert.deepEqual(f.errors,[]);
    await f.context.close();
    const emailContext = await browser.newContext(), emailPage=await emailContext.newPage();
    const html=fs.readFileSync("supabase/confirm-signup-otp.html","utf8");
    assert.equal((html.match(/{{ \.Token }}/g)||[]).length,1);
    assert.ok(!html.includes("ConfirmationURL"));
    for(const scheme of ["dark","light"]) {
      await emailPage.emulateMedia({colorScheme:scheme});
      for(const width of [320,390,520,1200]) {
        await emailPage.setViewportSize({width,height:1000});
        await emailPage.setContent(html.replace("{{ .Token }}","1330968210"));
        assert.equal(await emailPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"email overflow "+width+":"+scheme);
      }
    }
    await emailPage.setContent(html.replace("{{ .Token }}","13309682"));
    await emailPage.screenshot({animations: "disabled", path:previews+"/email-desktop.png",fullPage:true});
    await emailPage.setViewportSize({width:390,height:900});
    await emailPage.screenshot({animations: "disabled", path:previews+"/email-mobile.png",fullPage:true});
    await emailContext.close(); await browser.close();
    console.log("PASS: design preview, six viewport widths, mobile sheet, light theme, reduced motion, no runtime errors.");
    return;
  }
  const toast = (text) =>
    page.locator(".toast").filter({ hasText: text }).waitFor();
  await page.getByRole("heading", { name: "Today", exact: true }).waitFor();
  await page.getByRole("button", { name: /Chicken breast.*247 kcal/ }).click();
  await toast("Food logged.");
  assert.equal(state.meal_entries.length, 3);
  await page
    .getByRole("button", { name: "Edit Chicken breast", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByLabel("Amount (g)").fill("500");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await toast("Amount updated.");
  await page.locator('.macro[data-k="protein"] .over').waitFor();
  assert.match(
    await page
      .locator('.macro[data-k="protein"] [role="progressbar"]')
      .getAttribute("aria-valuetext"),
    /over/,
  );
  const editButton = page
    .getByRole("button", { name: "Edit Chicken breast", exact: true })
    .first();
  await editButton.click();
  await dialog.waitFor();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () => document.activeElement.closest("dialog") !== null,
    ),
    true,
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForTimeout(80);
  assert.equal(
    await editButton.evaluate((e) => e === document.activeElement),
    true,
  );
  const before = state.meal_entries.length;
  await page
    .getByRole("button", { name: "Delete Chicken breast", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(state.meal_entries.length, before);
  await page
    .getByRole("button", { name: "Delete Chicken breast", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Undo", exact: true })
    .waitFor({ state: "hidden", timeout: 8000 });
  assert.equal(state.meal_entries.length, before - 1);
  // Failed deletion restores the entry and leaves a friendly error.
  h.fail("meal_entries", "DELETE");
  await page
    .getByRole("button", { name: "Delete Chicken breast", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Undo", exact: true })
    .waitFor({ state: "hidden", timeout: 8000 });
  await page.locator(".toast.bad").waitFor();
  assert.ok(
    !(await page.locator(".toast.bad").innerText()).includes("raw secret"),
  );
  assert.equal(state.meal_entries.length, before - 1);
  await page.locator(".toast.bad").getByRole("button", { name: "Dismiss error" }).click();
  // Existing destination prompts, cancellation does not claim success, repeat copy is guarded.
  const copy = page
    .getByRole("button", { name: "Copy " + prior, exact: true })
    .first();
  await copy.click();
  await dialog
    .getByRole("heading", { name: "Add to existing meals?" })
    .waitFor();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(state.meal_entries.length, before - 1);
  await copy.click();
  await dialog.getByRole("button", { name: "Copy anyway" }).click();
  await toast("Meals copied.");
  const copied = state.meal_entries.length;
  await copy.click();
  await toast("Already copied");
  assert.equal(state.meal_entries.length, copied);
  await page.locator(".toast.bad").getByRole("button", { name: "Dismiss error" }).click();
  // Saving a collection updates local state without refetching foods.
  const foodReads = calls.filter(
    (c) => c.name === "foods" && c.method === "GET",
  ).length;
  await page
    .getByRole("button", { name: "Save meal", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Meal name").fill("My lunch");
  await dialog.getByRole("button", { name: "Save meal", exact: true }).click();
  await toast("Meal saved.");
  assert.equal(state.saved_meals.length, 1);
  assert.equal(
    calls.filter((c) => c.name === "foods" && c.method === "GET").length,
    foodReads,
  );
  await page.getByRole("button", { name: "Saved meals", exact: true }).click();
  await page.getByLabel("Find a saved meal").fill("missing meal");
  await page.getByRole("heading", {name:"No matching meals"}).waitFor();
  await page.getByRole("button", {name:"Clear search"}).click();
  await page.getByRole("button", { name: "Add My lunch", exact: true }).click();
  await toast("Saved meal logged.");
  await page
    .getByRole("button", { name: "Delete saved meal My lunch" })
    .click();
  await page.getByRole("button", { name: "Undo" }).click();
  assert.equal(state.saved_meals.length, 1);
  // Selected-date weight edit; chart labels/target and review proposal.
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.getByLabel("Explore weigh-ins").waitFor();
  await page.getByLabel("Log date").fill(prior);
  await page.getByLabel("Weight for " + prior + " (kg)").fill("71");
  await page.getByRole("button", { name: "Log weight", exact: true }).click();
  await toast("Weight logged.");
  assert.equal(
    state.weight_logs.find((w) => w.logged_date === prior).weight_kg,
    71,
  );
  await page
    .getByRole("button", { name: "Review targets", exact: true })
    .click();
  await page.getByRole("button", { name: "Use estimate in editor" }).waitFor();
  assert.equal(state.nutrition_goals.daily_calories, 2000);
  await page.getByRole("button", { name: "Use estimate in editor" }).click();
  await page.getByRole("button", { name: "Save schedule & targets" }).click();
  await toast("Targets saved.");
  // A failed meal insert compensates a newly saved reusable food.
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByLabel("Food name", { exact: true }).fill("Test banana");
  for (const [k, v] of [
    ["calories", "89"],
    ["protein", "1"],
    ["carbs", "23"],
    ["fat", ".3"],
  ])
    await page
      .getByLabel(k + (k === "calories" ? " (kcal)" : " (g)"), { exact: true })
      .fill(v);
  await page.getByLabel("Save this food for reuse").check();
  const foodCount = state.foods.length;
  h.fail("meal_entries", "POST");
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page.locator(".toast.bad").waitFor();
  assert.equal(state.foods.length, foodCount);
  assert.equal(
    await page.getByLabel("Food name", { exact: true }).inputValue(),
    "Test banana",
  );
  // External food search and amount scaling.
  await page.getByLabel("Save this food for reuse").uncheck();
  await page.getByLabel("Search foods").fill("chicken breast cooked");
  await page.getByRole("region", {name:"Basic food results"}).getByRole("button", {name:/Chicken, breast, meat only, cooked, roasted/}).click();
  await page.getByLabel("Amount (g)").fill("200");
  assert.equal(await page.getByLabel("calories (kcal)", {exact:true}).inputValue(), "330");
  assert.ok(await page.getByRole("link", {name:/USDA SR Legacy · FDC 171477/}).isVisible());
  await page.getByLabel("Food name", {exact:true}).fill("steak cooked");
  assert.ok(await page.locator("form .suggestions button").count() > 0);
  await page.getByRole("button", {name:"Packaged / brands",exact:true}).click();
  await page.getByLabel("Search foods").fill("oats");
  await page.getByRole("button", {name:"Search products",exact:true}).click();
  await page.getByRole("button", { name: /Mock oats.*380/ }).click();
  await page.getByLabel("Amount (g)").fill("200");
  assert.equal(
    await page.getByLabel("calories (kcal)", { exact: true }).inputValue(),
    "760",
  );
  await page.locator(".toast.bad").getByRole("button", { name: "Dismiss error" }).click();
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await toast("Food logged.");
  // Two-tap repeat logging on mobile, reduced motion, themes and overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Log food", exact: true })
    .last()
    .click();
  await dialog.waitFor();
  await dialog.getByRole("button", { name: /Mock oats.*760 kcal/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await toast("Food logged.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Targets", exact: true }).click();
  assert.equal(
    await page
      .locator(".tab-content")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  for (const light of [false, true]) {
    if (light)
      await page.getByRole("button", { name: "Change color theme" }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const small = await page
      .locator("button:visible")
      .evaluateAll((es) =>
        es
          .filter((e) => !e.disabled && e.getBoundingClientRect().height < 43.5)
          .map((e) => e.textContent),
      );
    assert.deepEqual(small, []);
  }
  await page.screenshot({animations: "disabled", 
    path: process.env.UI_SCREENSHOT || "/tmp/platelog-quality-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(h.errors, []);
  await h.context.close();
  // Mock signup/OTP reaches the real three-step onboarding component.
  const fresh = await harness({ signedIn: false, fresh: true }),
    p = fresh.page;
  await p.getByRole("button", { name: "Create an account" }).click();
  await p.getByLabel("Full name").fill("Test User");
  await p.getByLabel("Display name", {exact:true}).fill("Test");
  await p.getByLabel("Username").fill("testuser");
  await p.getByLabel("Email", { exact: true }).fill("test@example.com");
  await p.getByLabel("Password", { exact: true }).fill("test-password");
  await p.getByLabel("Confirm password", {exact:true}).fill("test-password");
  assert.equal(await p.getByLabel("Password", {exact:true}).getAttribute("type"), "password");
  await p.getByRole("button", {name:"Show password",exact:true}).click();
  assert.equal(await p.getByLabel("Password", {exact:true}).getAttribute("type"), "text");
  assert.equal(await p.getByLabel("Confirm password", {exact:true}).getAttribute("type"), "password");
  await p.getByRole("button", {name:"Hide password",exact:true}).click();
  assert.equal(await p.getByLabel("Password", {exact:true}).getAttribute("type"), "password");

  await p.getByRole("button", { name: "Create Account", exact: true }).click();
  await p.getByRole("heading", { name: "Verify your email" }).waitFor();
  assert.equal(await p.getByLabel("Verification code").inputValue(), "", "password never carries into OTP field");
  assert.equal(await p.getByLabel("Password", {exact:true}).count(), 0);

  assert.equal(
    await p.getByRole("button", { name: /Resend Code/ }).isDisabled(),
    true,
  );
  await p.getByLabel("Verification code").fill("12345678");
  await p.getByRole("button", { name: "Verify Email", exact: true }).click();
  await p.getByRole("heading", { name: "Set your daily targets" }).waitFor();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p
    .getByLabel("Daily activity outside workouts")
    .selectOption("very_active");
  await p.getByRole("radio", { name: /Gain weight/ }).check();
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByText("How we calculated this", { exact: true }).waitFor();
  await p.getByRole("button", { name: "Customize", exact: true }).click();
  await p.getByLabel("calories (kcal)", { exact: true }).fill("2600");
  await p.getByRole("button", { name: "Save & Continue" }).click();
  await p.getByRole("heading", { name: "Today", exact: true }).waitFor();
  assert.equal(fresh.state.nutrition_goals.daily_calories, 2600);
  await p.getByText("Hi, Test", {exact:true}).waitFor();
  assert.equal(fresh.calls.find(c=>c.name==="signup").body.data.display_name,"Test");
  assert.deepEqual(fresh.errors, []);
  await fresh.context.close();
  await browser.close();
  console.log(
    "PASS: mocked signup/OTP/onboarding; logging, scaling, overages, focus trap/return, undo/failure recovery, guarded copy, saved meals, weight date, target review, orphan cleanup, OFF, mobile, reduced motion, light/dark, no runtime errors.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
