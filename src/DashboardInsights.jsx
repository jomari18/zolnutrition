import React, { memo, useMemo } from "react";
import { number, shiftDate, totals } from "./lib";
import { macros, round } from "./ui";
import Icon from "./Icon";

export const WeeklyIntake = memo(function WeeklyIntake({ history, day }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(day, i - 6);
    const rows = history.filter(r => r.logged_date === date);
    return { date, logged: rows.length > 0, ...totals(rows) };
  }), [history, day]);
  const max = Math.max(1, ...days.map(d => d.calories));
  const logged = days.filter(d => d.logged);
  const average = logged.length ? totals(logged).calories / logged.length : 0;
  return <section className="weekly-intake" aria-label="Calorie intake for the last seven days">
    <div className="spread"><h3>Calorie intake <span>· last 7 days</span></h3><p><b>{round(average)}</b> avg kcal <span className="sr-only">on logged days</span></p></div>
    <div className="intake-bars">{days.map((d, i) => <div key={d.date} aria-label={`${d.date}: ${d.logged ? round(d.calories) + " kcal" : "No meals logged"}`} title={`${d.date}: ${d.logged ? round(d.calories) + " kcal" : "No meals logged"}`}>
      <span>{d.logged ? round(d.calories) : "—"}</span>
      <div className="intake-track"><i className={i === 6 ? "selected" : ""} style={{ transform: `scaleY(${d.calories / max})` }} /></div>
      <small>{new Date(d.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}</small>
    </div>)}</div>
    <p className="intake-caption">{logged.length}/7 days logged · average includes logged days only</p>
  </section>;
});

export const DashboardRail = memo(function DashboardRail({ weights, target, loading, onProgress, onTargets }) {
  const recent = weights.slice(-14), latest = recent.at(-1);
  const lo = Math.min(...recent.map(w => number(w.weight_kg))) - 0.5;
  const hi = Math.max(...recent.map(w => number(w.weight_kg))) + 0.5;
  const start = recent.length ? Date.parse(recent[0].logged_date) : 0;
  const end = recent.length ? Date.parse(latest.logged_date) : 0;
  const x = w => 35 + (end === start ? 0.5 : (Date.parse(w.logged_date) - start) / (end - start)) * 220;
  const y = w => 112 - (number(w.weight_kg) - lo) / (hi - lo) * 80;
  return <aside className="dashboard-rail">
    <section className="panel weight-preview">
      <div className="spread"><h2>Weight progress</h2><button className="text-button" onClick={onProgress} aria-label="View weight progress"><Icon name="arrow" /></button></div>
      <span className="muted">Latest weigh-in</span>
      <p className="rail-number">{loading ? "—" : latest ? number(latest.weight_kg).toFixed(1) : "—"}<small> kg</small></p>
      {latest && !loading ? <>
        <svg className="mini-weight-chart" viewBox="0 0 280 146" role="img" aria-label={`Weight from ${recent[0].logged_date} to ${latest.logged_date}. Latest ${latest.weight_kg} kilograms.`}>
          {[lo, (lo + hi) / 2, hi].map(v => <g key={v}><line className="chart-grid" x1="35" x2="255" y1={112 - (v - lo) / (hi - lo) * 80} y2={112 - (v - lo) / (hi - lo) * 80} /><text x="28" y={116 - (v - lo) / (hi - lo) * 80} textAnchor="end">{v.toFixed(1)}</text></g>)}
          <polyline className="preview-line" points={recent.map(w => `${x(w)},${y(w)}`).join(" ")} />
          {recent.map(w => <circle className="preview-point" key={w.logged_date} cx={x(w)} cy={y(w)} r="3"><title>{w.logged_date}: {w.weight_kg} kg</title></circle>)}
          <text x="35" y="138">{recent[0].logged_date.slice(5)}</text><text x="255" y="138" textAnchor="end">{latest.logged_date.slice(5)}</text>
        </svg>
        <p className="muted">Recorded {latest.logged_date}</p>
      </> : <p className="muted">Log a weigh-in to start seeing your trend.</p>}
      <button onClick={onProgress}>Log or edit weight <Icon name="arrow" /></button>
    </section>
    <section className="panel target-preview">
      <div className="spread"><h2>Daily targets</h2><button className="text-button" aria-label="Edit daily targets" onClick={onTargets}><Icon name="arrow" /></button></div>
      <div className="target-mini-grid">{macros.map(k => <div key={k} data-k={k}><Icon name={k === "calories" ? "flame" : k} /><div><span>{k}</span><b>{round(target[k])}<small> {k === "calories" ? "kcal" : "g"}</small></b></div></div>)}</div>
      <p className="muted">Built around your training and rest days.</p>
    </section>
  </aside>;
});
