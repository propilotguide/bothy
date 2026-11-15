import { authenticate, json } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { findHabit, listHabits, weekCounts } from "@/lib/habits-server";
import { isIsoDay, todayIn } from "@/lib/dates";

/**
 * Log a habit from a Shortcut.
 * POST /api/log
 * Authorization: Bearer <token>
 * { "habit": "train" | "Train", "date"?: "YYYY-MM-DD", "done"?: true }
 * Replies with a short message the Shortcut can show, e.g. "Train ✓ · 2 of 3 this week".
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return json({ ok: false, message: "Bad or missing token" }, 401);

  let body: { habit?: unknown; date?: unknown; done?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Send JSON with a habit" }, 400);
  }

  const day = body.date === undefined || body.date === "" ? todayIn(auth.tz) : body.date;
  if (!isIsoDay(day)) return json({ ok: false, message: "date must look like 2026-11-14" }, 400);
  if (typeof body.habit !== "string" || !body.habit.trim()) return json({ ok: false, message: "Which habit?" }, 400);
  const done = body.done === undefined ? true : body.done === true || body.done === "true" || body.done === 1;

  const admin = createAdminClient();
  const habits = await listHabits(admin, auth.userId);
  const habit = findHabit(habits, body.habit);
  if (!habit) return json({ ok: false, message: `No habit called "${body.habit}"` }, 404);

  if (done) {
    const { error } = await admin
      .from("checkins")
      .upsert({ user_id: auth.userId, habit_id: habit.id, day, source: "shortcut" }, { onConflict: "habit_id,day", ignoreDuplicates: true });
    if (error) return json({ ok: false, message: "Couldn't save" }, 500);
  } else {
    await admin.from("checkins").delete().eq("user_id", auth.userId).eq("habit_id", habit.id).eq("day", day);
  }

  const { counts } = await weekCounts(admin, auth.userId, day);
  const count = counts[habit.id] ?? 0;
  const message = `${habit.name} ${done ? "✓" : "undone"} · ${count} of ${habit.weekly_target} this week`;
  return json({ ok: true, message, habit: habit.slug, date: day, week_count: count, target: habit.weekly_target });
}
