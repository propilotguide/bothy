import { authenticate, json } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listHabits, weekCounts } from "@/lib/habits-server";
import { isIsoDay, todayIn } from "@/lib/dates";

/**
 * What's left today, for a one-button "Log a habit" Shortcut.
 * GET /api/today?date=YYYY-MM-DD   (date optional)
 * { "date": "...", "remaining": ["Read", "Call family"], "done": ["Train"], "summary": "5 of 8 done" }
 */
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return json({ ok: false, message: "Bad or missing token" }, 401);

  const q = new URL(request.url).searchParams.get("date");
  const day = q && isIsoDay(q) ? q : todayIn(auth.tz);

  const admin = createAdminClient();
  const habits = await listHabits(admin, auth.userId);
  const { doneOnDay } = await weekCounts(admin, auth.userId, day);

  // Auto habits (steps) fill in from the Health sync, so they're not offered for tapping.
  const remaining = habits.filter((h) => !doneOnDay.has(h.id) && !h.auto_source).map((h) => h.name);
  const done = habits.filter((h) => doneOnDay.has(h.id)).map((h) => h.name);

  return json({ ok: true, date: day, remaining, done, summary: `${done.length} of ${habits.length} done` });
}
