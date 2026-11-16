"use client";

import { useState, useTransition } from "react";
import { addHabit, reorderHabits, updateHabit, type HabitPatch } from "./actions";

export type EditableHabit = {
  id: string;
  slug: string;
  name: string;
  weekly_target: number;
  travel_ok: boolean;
  auto_source: "steps" | null;
  archived: boolean;
  sort: number;
};

export default function HabitEditor({ habits: initial }: { habits: EditableHabit[] }) {
  const [habits, setHabits] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const active = habits.filter((h) => !h.archived).sort((a, b) => a.sort - b.sort);
  const archived = habits.filter((h) => h.archived);

  function patch(id: string, p: HabitPatch) {
    const before = habits;
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, ...p } : h)));
    setError(null);
    start(async () => {
      try {
        await updateHabit(id, p);
      } catch (e) {
        setHabits(before);
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  }

  function move(id: string, dir: -1 | 1) {
    const ids = active.map((h) => h.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setHabits((hs) => hs.map((h) => (ids.includes(h.id) ? { ...h, sort: ids.indexOf(h.id) + 1 } : h)));
    start(async () => {
      try {
        await reorderHabits(ids);
      } catch {
        setError("Couldn't save the new order.");
      }
    });
  }

  return (
    <>
      {error && <p className="error" role="alert">{error}</p>}

      <section className="section">
        <h2 className="section-title">Active · {active.length}</h2>
        {active.map((h, i) => (
          <HabitRow
            key={h.id}
            habit={h}
            first={i === 0}
            last={i === active.length - 1}
            onPatch={(p) => patch(h.id, p)}
            onMove={(d) => move(h.id, d)}
          />
        ))}
      </section>

      <AddHabit onError={setError} />

      {archived.length > 0 && (
        <section className="section">
          <h2 className="section-title">Archived</h2>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {archived.map((h) => (
              <div key={h.id} className="arch-row">
                <span>{h.name}</span>
                <button type="button" className="link-btn" onClick={() => patch(h.id, { archived: false })}>
                  Restore
                </button>
              </div>
            ))}
          </div>
          <p className="muted" style={{ margin: 0 }}>Archived habits keep their history and can come back any time.</p>
        </section>
      )}
    </>
  );
}

function HabitRow({
  habit: h,
  first,
  last,
  onPatch,
  onMove,
}: {
  habit: EditableHabit;
  first: boolean;
  last: boolean;
  onPatch: (p: HabitPatch) => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [name, setName] = useState(h.name);
  const [confirmArchive, setConfirmArchive] = useState(false);

  function saveName() {
    const n = name.trim();
    if (!n) {
      setName(h.name);
      return;
    }
    if (n !== h.name) onPatch({ name: n });
  }

  return (
    <div className="card edit-card">
      <div className="edit-top">
        <label className="sr-only" htmlFor={`name-${h.id}`}>Habit name</label>
        <input
          id={`name-${h.id}`}
          className="edit-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <div className="order-btns">
          <button type="button" aria-label={`Move ${h.name} up`} disabled={first} onClick={() => onMove(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button type="button" aria-label={`Move ${h.name} down`} disabled={last} onClick={() => onMove(1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </div>
      </div>

      <div className="edit-line">
        <span className="muted">Weekly target</span>
        <div className="stepper" role="group" aria-label={`Weekly target for ${h.name}`}>
          <button type="button" aria-label="Fewer per week" disabled={h.weekly_target <= 1} onClick={() => onPatch({ weekly_target: h.weekly_target - 1 })}>−</button>
          <span aria-live="polite">{h.weekly_target} / week</span>
          <button type="button" aria-label="More per week" disabled={h.weekly_target >= 7} onClick={() => onPatch({ weekly_target: h.weekly_target + 1 })}>+</button>
        </div>
      </div>

      <div className="edit-line">
        <label htmlFor={`travel-${h.id}`} className="muted">Show on travel days</label>
        <input
          id={`travel-${h.id}`}
          type="checkbox"
          role="switch"
          className="switch"
          checked={h.travel_ok}
          onChange={(e) => onPatch({ travel_ok: e.target.checked })}
        />
      </div>

      <div className="edit-foot">
        <span className="slug">
          {h.auto_source === "steps" ? "Auto from Apple Health · " : ""}Shortcut name: {h.slug}
        </span>
        {confirmArchive ? (
          <span style={{ display: "flex", gap: 12 }}>
            <button type="button" className="link-btn" onClick={() => setConfirmArchive(false)}>Cancel</button>
            <button type="button" className="link-btn danger" onClick={() => onPatch({ archived: true })}>Archive</button>
          </span>
        ) : (
          <button type="button" className="link-btn" onClick={() => setConfirmArchive(true)}>Archive</button>
        )}
      </div>
    </div>
  );
}

function AddHabit({ onError }: { onError: (msg: string | null) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState(3);
  const [travel, setTravel] = useState(true);
  const [pending, start] = useTransition();

  return (
    <section className="section">
      <h2 className="section-title">Add a habit</h2>
      <form
        className="card edit-card"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim();
          if (!n) return;
          onError(null);
          start(async () => {
            const res = await addHabit({ name: n, weekly_target: target, travel_ok: travel });
            if (res.error) {
              onError(res.error);
              return;
            }
            // Reload so the new habit appears with its Shortcut name.
            window.location.reload();
          });
        }}
      >
        <label className="sr-only" htmlFor="new-name">New habit name</label>
        <input
          id="new-name"
          className="edit-name"
          placeholder="e.g. Sleep score 85+"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="edit-line">
          <span className="muted">Weekly target</span>
          <div className="stepper" role="group" aria-label="Weekly target for new habit">
            <button type="button" aria-label="Fewer per week" disabled={target <= 1} onClick={() => setTarget(target - 1)}>−</button>
            <span aria-live="polite">{target} / week</span>
            <button type="button" aria-label="More per week" disabled={target >= 7} onClick={() => setTarget(target + 1)}>+</button>
          </div>
        </div>
        <div className="edit-line">
          <label htmlFor="new-travel" className="muted">Show on travel days</label>
          <input id="new-travel" type="checkbox" role="switch" className="switch" checked={travel} onChange={(e) => setTravel(e.target.checked)} />
        </div>
        <button className="btn" type="submit" disabled={pending || !name.trim()}>
          {pending ? "Adding…" : "Add habit"}
        </button>
      </form>
    </section>
  );
}
