import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, weekStart } from "@/lib/dates";
import type { Habit } from "@/lib/types";

export async function listHabits(admin: SupabaseClient, userId: string): Promise<Habit[]> {
  const { data } = await admin
    .from("habits")
    .select("id, slug, name, weekly_target, travel_ok, auto_source, sort")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("sort");
  return (data ?? []) as Habit[];
}

/** Matches by slug ("call-family") or by name ("Call family"), ignoring case. */
export function findHabit(habits: Habit[], key: string): Habit | undefined {
  const k = key.trim().toLowerCase();
  return habits.find((h) => h.slug === k || h.name.toLowerCase() === k);
}

/** Check-in counts per habit for the Sunday-to-Saturday week containing `day`. */
export async function weekCounts(admin: SupabaseClient, userId: string, day: string) {
  const start = weekStart(day);
  const { data } = await admin
    .from("checkins")
    .select("habit_id, day")
    .eq("user_id", userId)
    .gte("day", start)
    .lte("day", addDays(start, 6));
  const counts: Record<string, number> = {};
  const doneOnDay = new Set<string>();
  for (const c of data ?? []) {
    counts[c.habit_id] = (counts[c.habit_id] ?? 0) + 1;
    if (c.day === day) doneOnDay.add(c.habit_id);
  }
  return { counts, doneOnDay };
}
