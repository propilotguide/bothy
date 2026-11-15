import { authenticate, json } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listHabits } from "@/lib/habits-server";
import { addDays, isIsoDay, todayIn } from "@/lib/dates";
import { STEPS_GOAL } from "@/lib/types";

/**
 * Apple Health sync from a Shortcut automation. Send any of these:
 * POST /api/health
 * Authorization: Bearer <token>
 * {
 *   "sleep_minutes": 372,          // or "sleep_hours": 6.2; stored on "date" (default today = the morning you woke)
 *   "date": "YYYY-MM-DD",
 *   "steps": 10432,                // stored on "steps_date" (default today)
 *   "steps_date": "YYYY-MM-DD"
 * }
 * Steps at or above 10,000 check off the "10k steps" habit for that day.
 */
function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return json({ ok: false, message: "Bad or missing token" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Send JSON" }, 400);
  }

  const today = todayIn(auth.tz);
  const date = body.date ? body.date : today;
  const stepsDate = body.steps_date === "yesterday" ? addDays(today, -1) : body.steps_date ? body.steps_date : today;
  if (!isIsoDay(date) || !isIsoDay(stepsDate)) return json({ ok: false, message: "Dates must look like 2026-11-14" }, 400);

  const hours = num(body.sleep_hours);
  const minutesRaw = num(body.sleep_minutes) ?? (hours != null ? hours * 60 : null);
  const sleepMinutes = minutesRaw != null && minutesRaw <= 24 * 60 ? Math.round(minutesRaw) : null;
  const steps = num(body.steps) != null ? Math.round(num(body.steps)!) : null;

  if (sleepMinutes == null && steps == null) return json({ ok: false, message: "Nothing to save" }, 400);

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const parts: string[] = [];

  if (sleepMinutes != null) {
    await admin.from("days").upsert({ user_id: auth.userId, day: date, sleep_minutes: sleepMinutes, updated_at: now }, { onConflict: "user_id,day" });
    parts.push(`Sleep ${Math.floor(sleepMinutes / 60)}h ${String(sleepMinutes % 60).padStart(2, "0")}m`);
  }

  if (steps != null) {
    await admin.from("days").upsert({ user_id: auth.userId, day: stepsDate, steps, updated_at: now }, { onConflict: "user_id,day" });
    parts.push(`${steps.toLocaleString("en-US")} steps`);
    if (steps >= STEPS_GOAL) {
      const habits = await listHabits(admin, auth.userId);
      const stepsHabit = habits.find((h) => h.auto_source === "steps");
      if (stepsHabit) {
        await admin
          .from("checkins")
          .upsert({ user_id: auth.userId, habit_id: stepsHabit.id, day: stepsDate, source: "auto" }, { onConflict: "habit_id,day", ignoreDuplicates: true });
        parts.push(`${stepsHabit.name} ✓`);
      }
    }
  }

  return json({ ok: true, message: parts.join(" · ") });
}
