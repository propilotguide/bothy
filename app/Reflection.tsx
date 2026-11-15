"use client";

import { useState } from "react";
import { saveReflection } from "./actions";

/** Sunday's one question, answered in a line. */
export default function Reflection({ weekStart, initial }: { weekStart: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [lastSaved, setLastSaved] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    if (text === lastSaved) return;
    setStatus("saving");
    try {
      await saveReflection(weekStart, text);
      setLastSaved(text);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="reflect">
      <div className="reflect-eyebrow">Sunday question</div>
      <label htmlFor="reflection" className="reflect-q">What do you want more of this week?</label>
      <input
        id="reflection"
        value={text}
        maxLength={300}
        placeholder="One line"
        onChange={(e) => {
          setText(e.target.value);
          setStatus("idle");
        }}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <div className="reflect-status" aria-live="polite">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved. You'll see it at the top of this week in your journal." : status === "error" ? "Not saved. Try again." : ""}
      </div>
    </section>
  );
}
