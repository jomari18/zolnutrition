import React, { memo, useId, useMemo, useState } from "react";
import { number } from "./lib";
function WeightChart({ weights, target }) {
  const title = useId(),
    description = useId(),
    [selected, setSelected] = useState(null);
  const points = useMemo(
    () =>
      weights.map((row, i) => ({
        ...row,
        smooth:
          weights
            .slice(Math.max(0, i - 6), i + 1)
            .reduce((s, w) => s + number(w.weight_kg), 0) / Math.min(i + 1, 7),
        time: Date.parse(row.logged_date + "T12:00:00Z"),
      })),
    [weights],
  );
  if (!points.length)
    return (
      <div className="empty">
        <h3>See how your weight is trending</h3>
        <p>Log a weigh-in above to start your chart.</p>
      </div>
    );
  const lo =
      Math.min(
        ...points.map((p) => number(p.weight_kg)),
        ...(number(target) > 0 ? [number(target)] : []),
      ) - 1,
    hi =
      Math.max(
        ...points.map((p) => number(p.weight_kg)),
        ...(number(target) > 0 ? [number(target)] : []),
      ) + 1;
  const start = points[0].time,
    end = points.at(-1).time,
    x = (p) =>
      48 + (end === start ? 0.5 : (p.time - start) / (end - start)) * 276,
    y = (v) => 190 - ((v - lo) / (hi - lo)) * 150;
  const line = (key) =>
    points.map((p) => `${x(p)},${y(number(p[key]))}`).join(" ");
  const active =
    points[Math.min(selected ?? points.length - 1, points.length - 1)];
  return (
    <div className="weight-chart">
      <svg
        viewBox="0 0 360 235"
        aria-labelledby={`${title} ${description}`}
        role="img"
      >
        <title id={title}>Weight history in kilograms</title>
        <desc id={description}>
          Recorded weight, seven-weigh-in average
          {number(target) > 0 ? ", and target weight" : ""}. Use the selector or
          table below for exact values.
        </desc>
        {[0, 1, 2, 3].map((i) => {
          const v = lo + ((hi - lo) * i) / 3;
          return (
            <g key={i}>
              <line
                className="chart-grid"
                x1="48"
                x2="324"
                y1={y(v)}
                y2={y(v)}
              />
              <text x="42" y={y(v) + 4} textAnchor="end">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x="12" y="20">
          kg
        </text>
        <text x="48" y="215">
          {points[0].logged_date.slice(5)}
        </text>
        <text x="324" y="215" textAnchor="end">
          {points.at(-1).logged_date.slice(5)}
        </text>
        {number(target) > 0 && (
          <line
            className="chart-target"
            x1="48"
            x2="324"
            y1={y(number(target))}
            y2={y(number(target))}
          />
        )}
        <polyline className="chart-weight" points={line("weight_kg")} />
        <polyline className="chart-average" points={line("smooth")} />
        {points.map((p, i) => (
          <circle
            className="chart-point"
            key={p.logged_date}
            cx={x(p)}
            cy={y(number(p.weight_kg))}
            r={active === p ? 5 : 3}
            onPointerEnter={() => setSelected(i)}
            onClick={() => setSelected(i)}
          >
            <title>
              {p.logged_date}: {p.weight_kg} kg; average {p.smooth.toFixed(1)}{" "}
              kg
            </title>
          </circle>
        ))}
        <circle
          className="chart-average-point"
          cx={x(active)}
          cy={y(active.smooth)}
          r="4"
        />
      </svg>
      <div className="chart-legend">
        <span className="weight-key">Weight</span>
        <span className="average-key">7-weigh-in average</span>
        {number(target) > 0 && (
          <span className="target-key">Target {target} kg</span>
        )}
      </div>
      <p className="chart-tooltip" role="status">
        {active.logged_date}: <b>{active.weight_kg} kg</b> · Average{" "}
        {active.smooth.toFixed(1)} kg
      </p>
      {points.length > 1 && (
        <label>
          Explore weigh-ins
          <input
            type="range"
            min="0"
            max={points.length - 1}
            step="1"
            value={Math.min(selected ?? points.length - 1, points.length - 1)}
            aria-valuetext={`${active.logged_date}: ${active.weight_kg} kilograms, average ${active.smooth.toFixed(1)}`}
            onChange={(e) => setSelected(Number(e.target.value))}
          />
        </label>
      )}
      <details>
        <summary>View weight data</summary>
        <div className="table-scroll">
          <table>
            <caption>Weigh-ins and rolling average</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">kg</th>
                <th scope="col">7-weigh-in average</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.logged_date}>
                  <th scope="row">{p.logged_date}</th>
                  <td>{p.weight_kg}</td>
                  <td>{p.smooth.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
export default memo(WeightChart);
