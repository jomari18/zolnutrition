import React, { memo, useEffect, useRef, useState } from "react";
import { AnimatedNumber, NutritionBar, Skeleton } from "./Motion";
import { balance } from "./lib";
import { macros, round } from "./ui";
import Icon from "./Icon";
import { WeeklyIntake } from "./DashboardInsights";
function DailySummary({
  day,
  type,
  sum,
  target,
  loading,
  failed,
  busy,
  switchDay,
  history,
}) {
  const b = balance(sum.calories, target.calories);
  const overview = useRef(null),
    [sticky, setSticky] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setSticky(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0),
    );
    observer.observe(overview.current);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div
        className="sticky-summary"
        data-visible={sticky}
        aria-hidden={!sticky}
        aria-label="Daily nutrition summary"
      >
        {loading || failed ? (
          <span>
            {failed ? "Summary unavailable — reload data" : "Updating summary…"}
          </span>
        ) : (
          <>
            <b className={b.over ? "over" : ""}>
              {round(b.over || b.remaining)} kcal {b.over ? "over" : "left"}
            </b>
            <div className="mini-macros">
              {macros.slice(1).map((k) => (
                <div data-k={k} key={k}>
                  <span>
                    {k} {round(sum[k])}/{round(target[k])}g
                  </span>
                  <NutritionBar
                    name={k}
                    consumed={sum[k]}
                    target={target[k]}
                    pulse={false}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <section ref={overview} className="overview">
        <div className="panel calorie-hero">
          <div className="spread"><div className="eyebrow">{b.over ? "CALORIES OVER TARGET" : "CALORIES REMAINING"}</div><span className="day-badge"><Icon name={type === "training" ? "protein" : "clock"} />{type} day</span></div>
          {failed ? (
            <p className="bad">
              Couldn't load your meals. Reload data to see an accurate remaining
              amount.
            </p>
          ) : loading ? (
            <Skeleton label="Loading calories" />
          ) : (
            <>
              <div className={`big ${b.over ? "over" : ""}`}>
                <AnimatedNumber value={b.over || b.remaining} />
                <small> kcal {b.over ? "over" : "left"}</small>
              </div>
              <NutritionBar
                key={day + "calories"}
                name="calories"
                consumed={sum.calories}
                target={target.calories}
              />
              <div className="calorie-stats">
                <div><Icon name="flame" /><span><b>{round(target.calories)}</b><small>Daily target</small></span></div>
                <div><Icon name="meal" /><span><b>{round(sum.calories)}</b><small>Consumed</small></span></div>
                <div className={b.over ? "over" : ""}><Icon name="clock" /><span><b>{round(b.over || b.remaining)}</b><small>{b.over ? "Over target" : "Remaining"}</small></span></div>
              </div>
            </>
          )}
          <button className="day-switch" disabled={busy} onClick={switchDay}>
            Switch to {type === "training" ? "rest" : "training"} day
          </button>
          <p className="muted browser-note">
            Day overrides are saved on this browser only; they don't sync across
            devices.
          </p>
        </div>
        <div className="panel macro-panel">
          <div className="spread"><h2>Macronutrients</h2><span className="muted">Your daily balance</span></div>
          {loading ? (
            <Skeleton label="Loading macros" />
          ) : failed ? (
            <p className="muted">Reload data to see your macros.</p>
          ) : (
            <div className="macro-cards">{macros.slice(1).map((k) => {
              const m = balance(sum[k], target[k]);
              return (
                <div className="macro" data-k={k} key={k}>
                  <div className="spread">
                    <span className="macro-name"><Icon name={k} />{k}</span>

                  </div>
                  <p className="macro-amount"><b>{round(sum[k])}</b><span> / {round(target[k])} g</span><span className="sr-only"> consumed / target</span></p>
                  <NutritionBar
                    key={day + k}
                    name={k}
                    consumed={sum[k]}
                    target={target[k]}
                  />
                  <p className={m.over ? "over" : "macro-remaining"}>{round(m.over || m.remaining)} g {m.over ? "over" : "left"}</p>
                </div>
              );
            })}</div>
          )}
          {!loading && !failed && history && <WeeklyIntake history={history} day={day} />}
        </div>
      </section>
    </>
  );
}
export default memo(DailySummary);
