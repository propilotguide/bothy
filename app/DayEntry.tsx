"use client";

import { useState, useTransition } from "react";
import { saveWords, setRating } from "./actions";

type Props = { day: string; initialWords: string; initialRating: number | null };

const LABELS = ["Rough", "Meh", "Okay", "Good", "Great"];

export default function DayEntry({ day, initialWords, initialRating }: Props) {
  const [rating, setLocalRating] = useState<number | null>(initialRating);
  const [words, setWords] = useState(initialWords);
  const [lastSaved, setLastSaved] = useState(initialWords);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function rate(n: number) {
    const next = rating === n ? null : n; // tap the same one again to clear
    const prev = rating;
    setLocalRating(next);
    setError(null);
    startTransition(async () => {
      try {
        await setRating(day, next);
      } catch {
        setLocalRating(prev);
        setError("Rating didn't save. Tap again.");
      }
    });
  }

  async function save() {
    if (words === lastSaved) return;
    setStatus("saving");
    try {
      await saveWords(day, words);
      setLastSaved(words);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="section">
      <h2 className="section-title">How was the day?</h2>
      <div className="rating" role="group" aria-label="Rate the day from 1 to 5">
        {LABELS.map((label, i) => {
          const n = i + 1;
          const on = rating === n;
          return (
            <button
              key={n}
              type="button"
              className={`rate${on ? " on" : ""}`}
              aria-pressed={on}
              aria-label={`${n}, ${label}`}
              onClick={() => rate(n)}
            >
              <span className="rate-n">{n}</span>
              <span className="rate-l">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="words">
        <label htmlFor="words">
          <span>One line about today</span>
          <span aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Not saved" : ""}
          </span>
        </label>
        <textarea
          id="words"
          rows={2}
          value={words}
          maxLength={500}
          placeholder="What do you want to remember?"
          onChange={(e) => {
            setWords(e.target.value);
            setStatus("idle");
          }}
          onBlur={save}
        />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
