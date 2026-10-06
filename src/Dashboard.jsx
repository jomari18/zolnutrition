import { createPortal } from "react-dom";
import DisplayNameEditor from "./DisplayNameEditor";
import { displayName, validateDisplayName } from "./displayName.js";
import useAndroidBack from "./useAndroidBack";
import React, { lazy, Suspense, useMemo, useState } from "react";
import { sb, result } from "./client";
import {
  dayType,
  goalSignature,
  localDate,
  number,
  recommend,
  shiftDate,
  targets,
  totals,
} from "./lib";
import { stored, round } from "./ui";
import { Dialog, useDialog } from "./Dialog";
import { Skeleton } from "./Motion";
import { userError } from "./errors";
import useFeedback from "./useFeedback";
import useNutritionData from "./useNutritionData";
import useMealActions from "./useMealActions";
import useUndoDelete from "./useUndoDelete";
import DailySummary from "./DailySummary";
import MealsList from "./MealsList";
import EditEntry from "./EditEntry";
import Logger from "./Logger";
import SavedMeals from "./SavedMeals";
import Notifications from "./Notifications";
import Icon from "./Icon";
import { DashboardRail } from "./DashboardInsights";
const Progress = lazy(() => import("./Progress"));
const TargetEditor = lazy(() => import("./TargetEditor"));
const tabs = ["Meals", "Saved meals", "Progress", "Targets"];
export default function Dashboard({ uid, user, goal, setGoal }) {
  const [day, setDay] = useState(localDate),
    [tab, setTab] = useState("Meals"),
    [sheet, setSheet] = useState(false),
    [edit, setEdit] = useState(null),
    [proposal, setProposal] = useState(null),
    [editingName, setEditingName] = useState(false);
  const name = displayName(user);
  const [overrides, setOverrides] = useState(() =>
      stored("znDayTypes:" + uid, {}),
    ),
    [baseline, setBaseline] = useState(() =>
      stored("znTargetBaseline:" + uid, null),
    );
  const ask = useDialog(),
    feedback = useFeedback(),
    { busy, run, notify } = feedback;
  useAndroidBack(() => {
    if (busy) return true;
    if (tab !== "Meals") { setTab("Meals"); window.scrollTo(0, 0); return true; }
    return false;
  });
  const data = useNutritionData(uid, day, notify),
    {
      history,
      setHistory,
      foods,
      setFoods,
      saved,
      setSaved,
      items,
      setItems,
      weights,
      setWeights,
      loading,
      historyError,
      libraryLoading,
      weightsLoading,
      reload,
    } = data;
  const { pending, schedule, undo } = useUndoDelete(notify);
  const entries = useMemo(
    () => history.filter((i) => i.logged_date === day),
    [history, day],
  );
  const visibleHistory = useMemo(
    () =>
      history.filter(
        (i) => !(pending?.kind === "entry" && pending.id === i.id),
      ),
    [history, pending],
  );
  const visibleEntries = useMemo(
    () => visibleHistory.filter((i) => i.logged_date === day),
    [visibleHistory, day],
  );
  const sum = useMemo(() => totals(visibleEntries), [visibleEntries]),
    type = dayType(goal, day, overrides),
    target = useMemo(() => targets(goal, type), [goal, type]);
  const actions = useMealActions({
    uid,
    day,
    entries: visibleEntries,
    items,
    setHistory,
    setFoods,
    setSaved,
    setItems,
    ask,
  });
  const [recent, frequent] = useMemo(() => {
    const counts = new Map();
    for (const i of visibleHistory) {
      const key = i.food_id || i.food_name.toLowerCase();
      const value = counts.get(key) || { entry: i, count: 0 };
      value.count++;
      counts.set(key, value);
    }
    return [
      [...counts.values()].slice(0, 6).map((x) => x.entry),
      [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map((x) => x.entry),
    ];
  }, [visibleHistory]);
  const blocked = busy || loading || historyError || !!pending;
  const loggerProps = {
    foods,
    recent,
    frequent,
    saved: saved.filter(
      (s) => !(pending?.kind === "saved" && pending.id === s.id),
    ),
    items,
    busy: blocked || libraryLoading,
    add: (d, s) => run(() => actions.add(d, s), "Food logged."),
    addSaved: (id, m) =>
      run(() => actions.logSaved(id, m), "Saved meal logged."),
  };
  const latestWeight = number(weights.at(-1)?.weight_kg),
    knownBaseline = baseline?.signature === goalSignature(goal),
    referenceWeight = knownBaseline
      ? number(baseline.weight)
      : number(weights[0]?.weight_kg);
  const weightChanged =
    !weightsLoading &&
    referenceWeight > 0 &&
    Math.abs(latestWeight / referenceWeight - 1) >= 0.05;
  const rememberBaseline = (nextGoal) => {
    if (!latestWeight) return;
    const next = { weight: latestWeight, signature: goalSignature(nextGoal) };
    setBaseline(next);
    try {
      localStorage.setItem("znTargetBaseline:" + uid, JSON.stringify(next));
    } catch {
      /* optional */
    }
  };
  const saveTargets = (patch) =>
    run(async () => {
      await result(sb.from("nutrition_goals").update(patch).eq("user_id", uid));
      const next = { ...goal, ...patch };
      setGoal(next);
      rememberBaseline(next);
      setProposal(null);
    }, "Targets saved.");
  const reviewTargets = () =>
    run(async () => {
      setTab("Targets");
      const profile = await result(
        sb
          .from("profiles")
          .select("age,sex,height_cm,workouts_per_week,activity_level")
          .eq("id", uid)
          .single(),
      );
      if (
        !profile?.age ||
        !profile.height_cm ||
        !["sedentary", "light", "moderate", "very_active"].includes(
          profile.activity_level,
        )
      )
        throw userError(
          "Review your targets below. We don't have enough body details to calculate a new estimate.",
        );
      setProposal(
        recommend(
          {
            age: profile.age,
            sex: profile.sex,
            height: profile.height_cm,
            workouts: profile.workouts_per_week,
            activity: profile.activity_level,
            weight: latestWeight,
          },
          goal.goal_type,
        ),
      );
    }, "Starting estimate ready to review. Nothing has been changed.");
  const notifications = inline => <Notifications notices={feedback.notices} dismiss={feedback.dismiss} reload={editingName ? undefined : reload} pending={pending} undo={undo} inline={inline} />;
  return (
    <main className="dashboard">
      <aside className="desktop-sidebar">
        <a className="brand" href="/"><span className="brand-mark" aria-hidden="true">Z</span>Zol<span>Nutrition</span></a>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Desktop dashboard sections">
          {tabs.map((t, i) => <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}><Icon name={["home", "saved", "progress", "target"][i]} /><span>{t === "Meals" ? "Dashboard" : t}</span></button>)}
        </nav>
        <div className="sidebar-poster"><p>Track smarter.<br /><span>Progress better.</span></p><small>ONE MEAL AT A TIME</small></div>
      </aside>
      <div className="account-greeting">
        <p>{name ? `Hi, ${name}` : "Welcome back"}</p>
        {document.getElementById("account-settings-action") && createPortal(<button className="account-settings-action" aria-label="Account settings" title="Account settings" disabled={busy || !!pending} onClick={() => setEditingName(true)}><Icon name="account" /></button>, document.getElementById("account-settings-action"))}
      </div>
      <div className="pageheading">
        <div>
          <div className="eyebrow">YOUR DAILY NUTRITION</div>
          <h1>{tab === "Meals" ? (day === localDate() ? "Today" : day) : tab}</h1>
          {tab !== "Meals" && <p className="page-description">{tab === "Saved meals" ? "Your go-to meals, ready for another day." : tab === "Progress" ? "Small steps. A clearer view of your progress." : "Fuel your training. Support your recovery."}</p>}
        </div>
        <div className="actions">
          <button
            aria-label="Previous date"
            disabled={busy}
            onClick={() => setDay(shiftDate(day, -1))}
          >
            ‹
          </button>
          <input
            aria-label="Log date"
            type="date"
            max={localDate()}
            value={day}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value && e.target.value <= localDate())
                setDay(e.target.value);
            }}
          />
          <button
            aria-label="Next date"
            disabled={busy || day >= localDate()}
            onClick={() => setDay(shiftDate(day, 1))}
          >
            ›
          </button>
          <button disabled={busy} onClick={() => setDay(localDate())}>
            Today
          </button>
        </div>
      </div>
      {tab === "Meals" ? <DailySummary
        history={visibleHistory}
        day={day}
        type={type}
        sum={sum}
        target={target}
        loading={loading}
        failed={historyError}
        busy={busy}
        switchDay={() => {
          const next = {
            ...overrides,
            [day]: type === "training" ? "rest" : "training",
          };
          setOverrides(next);
          try {
            localStorage.setItem("znDayTypes:" + uid, JSON.stringify(next));
          } catch {
            notify(
              userError(
                "Day changed for this visit, but browser storage is unavailable.",
              ),
              true,
            );
          }
        }}
      /> : <div className="section-context"><span>{day} · {type} day</span><span>{loading || historyError ? "Summary unavailable" : `${round(sum.calories)} / ${round(target.calories)} kcal · ${sum.calories > target.calories ? round(sum.calories - target.calories) + " over" : round(target.calories - sum.calories) + " left"}`}</span></div>}
      {weightChanged && (
        <aside className="notice">
          <div>
            Your weight has changed by at least 5%{" "}
            {knownBaseline
              ? "since targets were last saved on this browser"
              : "since your first recorded weigh-in"}
            . Would you like to review your targets?
            <p className="muted">
              Suggestions only. Targets change only when you save. This
              reminder's baseline is stored on this browser.
            </p>
          </div>
          <div className="actions">
            <button disabled={busy} onClick={reviewTargets}>
              Review targets
            </button>
            <button onClick={() => rememberBaseline(goal)}>Keep current</button>
          </div>
        </aside>
      )}
      <nav
        className="main-tabs"
        aria-label="Dashboard sections"
        style={{ "--tab-index": tabs.indexOf(tab) }}
      >
        <span className="tab-indicator" aria-hidden="true" />
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="tab-content" key={tab}>
        <Suspense
          fallback={<Skeleton label={`Loading ${tab.toLowerCase()}`} />}
        >
          {tab === "Meals" && (
            <div className="meal-workspace">
              <section className="panel log-panel">
                <div className="spread"><h2>Log a food</h2><button className="icon-badge" aria-label="Open food logger" onClick={() => setSheet(true)}><Icon name="plus" /></button></div>
                {libraryLoading ? (
                  <Skeleton label="Loading your food library" />
                ) : (
                  <Logger {...loggerProps} />
                )}
              </section>
              <MealsList
                entries={entries}
                day={day}
                busy={busy}
                loading={loading}
                failed={historyError}
                pending={pending}
                onCopy={(m) => run(() => actions.copy(m), "Meals copied.")}
                onSave={(m) => run(() => actions.saveMeal(m), "Meal saved.")}
                onEdit={setEdit}
                onDelete={(i) =>
                  schedule("entry", i.id, "Food", () =>
                    actions.deleteEntry(i.id),
                  )
                }
                onStart={() => setSheet(true)}
                onRetry={reload}
              />
              <DashboardRail weights={weights} target={target} loading={weightsLoading} onProgress={() => setTab("Progress")} onTargets={() => setTab("Targets")} />
            </div>
          )}
          {tab === "Saved meals" && (
            <section className="saved-page">
              {libraryLoading ? (
                <Skeleton label="Loading saved meals" />
              ) : (
                <SavedMeals
                  saved={saved}
                  items={items}
                  busy={blocked}
                  removingId={pending?.kind === "saved" ? pending.id : null}
                  add={loggerProps.addSaved}
                  remove={(id) =>
                    schedule("saved", id, "Saved meal", () =>
                      actions.deleteSaved(id),
                    )
                  }
                  onEmpty={() => setSheet(true)}
                />
              )}
            </section>
          )}
          {tab === "Progress" &&
            (weightsLoading || loading ? (
              <Skeleton label="Loading progress" />
            ) : (
              <Progress
                history={visibleHistory}
                weights={weights}
                goal={goal}
                day={day}
                typeFor={(d) => dayType(goal, d, overrides)}
                busy={busy}
                log={(weight) =>
                  run(async () => {
                    const entry = {
                      user_id: uid,
                      weight_kg: weight,
                      logged_date: day,
                    };
                    await result(
                      sb
                        .from("weight_logs")
                        .upsert(entry, { onConflict: "user_id,logged_date" }),
                    );
                    setWeights((old) =>
                      [...old.filter((w) => w.logged_date !== day), entry].sort(
                        (a, b) => a.logged_date.localeCompare(b.logged_date),
                      ),
                    );
                  }, "Weight logged.")
                }
                adjust={(adj) => {
                  const patch = {};
                  for (const t of ["training", "rest"])
                    patch[t + "_day_calories"] = Math.max(
                      500,
                      targets(goal, t).calories + adj,
                    );
                  return saveTargets(patch);
                }}
              />
            ))}
          {tab === "Targets" && (
            <TargetEditor
              goal={goal}
              day={day}
              type={type}
              proposal={proposal}
              busy={busy}
              save={saveTargets}
            />
          )}
        </Suspense>
      </div>
      <button
        className="fab primary"
        aria-label="Log food"
        onClick={() => setSheet(true)}
      >
        +
      </button>
      {sheet && (
        <Dialog
          sheet
          title={`Log food · ${day}`}
          onClose={() => setSheet(false)}
        >
          {libraryLoading ? (
            <Skeleton label="Loading food library" />
          ) : (
            <Logger {...loggerProps} onDone={() => setSheet(false)} />
          )}
          {notifications(true)}
        </Dialog>
      )}
      {edit && (
        <EditEntry
          entry={edit}
          busy={busy}
          feedback={notifications(true)}
          onClose={() => setEdit(null)}
          save={(patch, error) =>
            run(async () => {
              if (error) throw error;
              await result(
                sb
                  .from("meal_entries")
                  .update(patch)
                  .eq("id", edit.id)
                  .eq("user_id", uid),
              );
              setHistory((old) =>
                old.map((i) => (i.id === edit.id ? { ...i, ...patch } : i)),
              );
            }, "Amount updated.")
          }
        />
      )}
      {editingName && <DisplayNameEditor name={name} busy={busy} onClose={() => setEditingName(false)} feedback={notifications(true)} save={draft => run(async () => {
        const value = validateDisplayName(draft);
        await result(sb.auth.updateUser({ data: { display_name: value } }));
      }, "Display name saved.")} />}
      {!sheet && !edit && !editingName && notifications(false)}
    </main>
  );
}
