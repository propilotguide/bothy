"use client";

import { useState, useTransition } from "react";
import { toggleHabit } from "./actions";
import { STEPS_GOAL, type HabitView } from "@/lib/types";

type Props = {
  day: string;
  dateLabel: string;
  heading: string;
  habits: HabitView[];
  steps: number | null;
};

export default function HabitGrid({ day, dateLabel, heading, habits, steps }: Props) {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(habits.map((h) => [h.id, h.done]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const doneCount = habits.filter((h) => done[h.id]).length;

  function toggle(h: HabitView) {
    const next = !done[h.id];
    setDone((d) => ({ ...d, [h.id]: next })); // optimistic
    setBusy(h.id);
    setError(null);
    startTransition(async () => {
      try {
        await toggleHabit(h.id, day, next);
      } catch {
        setDone((d) => ({ ...d, [h.id]: !next }));
        setError("Couldn't save. Check your connection and tap again.");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">{dateLabel}</div>
          <h1 className="title">{heading}</h1>
        </div>
        <div>
          <div className="score" aria-label={`${doneCount} of ${habits.length} done`}>
            {doneCount}
            <span>/{habits.length}</span>
          </div>
          <div className="score-label">done</div>
        </div>
      </div>

      <div className="grid">
        {habits.map((h) => {
          const isDone = !!done[h.id];
          const count = h.weekOther + (isDone ? 1 : 0);
          const hit = count >= h.target;
          let sub = `${count} of ${h.target} this week`;
          if (h.auto === "steps" && !isDone && steps != null) {
            sub = `${steps.toLocaleString()} of ${(STEPS_GOAL / 1000).toFixed(0)}k so far`;
          }
          const tag = h.auto ? "AUTO" : hit ? "TARGET HIT" : "";
          return (
            <button
              key={h.id}
              type="button"
              className={`tile${isDone ? " done" : ""}`}
              aria-pressed={isDone}
              aria-busy={busy === h.id}
              onClick={() => toggle(h)}
            >
              <span className="tile-row">
                <span className="check" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="tag">{tag}</span>
              </span>
              <span>
                <span className="tile-name" style={{ display: "block" }}>{h.name}</span>
                <span className="tile-sub" style={{ display: "block" }}>{sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
