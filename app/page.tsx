import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatLong, formatSleep, isIsoDay, todayIn, weekStart } from "@/lib/dates";
import type { Habit, HabitView } from "@/lib/types";
import HabitGrid from "./HabitGrid";
import DayEntry from "./DayEntry";
import Reflection from "./Reflection";

export const dynamic = "force-dynamic";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy redirects to /login

  const { data: profile } = await supabase.from("profiles").select("tz").eq("id", user.id).maybeSingle();
  const tz = profile?.tz ?? "America/Los_Angeles";
  const today = todayIn(tz);
  const yesterday = addDays(today, -1);

  // Only today and yesterday are editable here: yesterday covers a sweep after midnight.
  const requested = (await searchParams).day;
  const day = requested && isIsoDay(requested) && requested === yesterday ? yesterday : today;

  const start = weekStart(day);
  const end = addDays(start, 6);
  const sameDayLastYear = `${Number(day.slice(0, 4)) - 1}${day.slice(4)}`;
  const lastYear = isIsoDay(sameDayLastYear) ? sameDayLastYear : addDays(day, -365); // Feb 29

  const isSunday = new Date(day + "T00:00:00Z").getUTCDay() === 0;

  const [{ data: habits }, { data: checkins }, { data: dayRows }, { data: week }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, slug, name, weekly_target, travel_ok, auto_source, sort")
      .eq("archived", false)
      .order("sort"),
    supabase.from("checkins").select("habit_id, day").gte("day", start).lte("day", end),
    supabase.from("days").select("day, words, rating, sleep_minutes, steps").in("day", [day, lastYear]),
    supabase.from("weeks").select("reflection").eq("week_start", start).maybeSingle(),
  ]);

  const entry = dayRows?.find((d) => d.day === day);
  const memory = dayRows?.find((d) => d.day === lastYear && d.words);

  const views: HabitView[] = ((habits ?? []) as Habit[]).map((h) => {
    const mine = (checkins ?? []).filter((c) => c.habit_id === h.id);
    const done = mine.some((c) => c.day === day);
    return {
      id: h.id,
      name: h.name,
      slug: h.slug,
      target: h.weekly_target,
      done,
      weekOther: mine.length - (done ? 1 : 0),
      auto: h.auto_source,
    };
  });

  const sleep = formatSleep(entry?.sleep_minutes);

  return (
    <>
      <nav className="daytabs" aria-label="Day">
        <Link href="/" aria-current={day === today ? "page" : undefined} replace>
          Today
        </Link>
        <Link href={`/?day=${yesterday}`} aria-current={day === yesterday ? "page" : undefined} replace>
          Yesterday
        </Link>
      </nav>

      <HabitGrid
        key={day}
        day={day}
        dateLabel={formatLong(day)}
        heading={day === today ? "Today" : "Yesterday"}
        habits={views}
        steps={entry?.steps ?? null}
      />

      {sleep && (
        <div className="chips">
          <span className="chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
            Slept {sleep} · auto
          </span>
        </div>
      )}

      <DayEntry
        key={`entry-${day}`}
        day={day}
        initialWords={entry?.words ?? ""}
        initialRating={entry?.rating ?? null}
      />

      {isSunday && <Reflection key={`week-${start}`} weekStart={start} initial={week?.reflection ?? ""} />}

      {memory && (
        <div className="card">
          <div className="memory-label">One year ago today</div>
          <div className="memory-text">{memory.words}</div>
        </div>
      )}

      <div className="links">
        <Link href="/journal">Journal</Link>
        <Link href="/habits">Edit habits</Link>
        <Link href="/settings">Settings</Link>
      </div>
    </>
  );
}
