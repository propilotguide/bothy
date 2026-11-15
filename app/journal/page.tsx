import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayIn, weekStart } from "@/lib/dates";

export const dynamic = "force-dynamic";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const label = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(first + "T00:00:00Z"));
  return { first, last, prev, next, label };
}

function dayLabel(day: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", day: "numeric" }).format(new Date(day + "T00:00:00Z"));
}

function weekLabel(sunday: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(sunday + "T00:00:00Z"));
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("tz").maybeSingle();
  const today = todayIn(profile?.tz ?? "America/Los_Angeles");
  const thisMonth = today.slice(0, 7);

  const requested = (await searchParams).month;
  const month = requested && MONTH.test(requested) && requested <= thisMonth ? requested : thisMonth;
  const { first, last, prev, next, label } = monthBounds(month);

  const [{ data: days }, { data: weeks }] = await Promise.all([
    supabase
      .from("days")
      .select("day, words, rating")
      .gte("day", first)
      .lte("day", last)
      .order("day", { ascending: false }),
    supabase.from("weeks").select("week_start, reflection").gte("week_start", weekStart(first)).lte("week_start", last),
  ]);

  const entries = (days ?? []).filter((d) => (d.words && d.words.trim()) || d.rating);
  const rated = entries.filter((d) => d.rating);
  const avg = rated.length ? rated.reduce((s, d) => s + (d.rating as number), 0) / rated.length : null;
  const reflections = new Map((weeks ?? []).filter((w) => w.reflection?.trim()).map((w) => [w.week_start, w.reflection as string]));

  // Group by week (Sunday start), newest first. Include weeks that only have a reflection.
  const groups = new Map<string, typeof entries>();
  for (const sunday of reflections.keys()) groups.set(sunday, []);
  for (const e of entries) {
    const w = weekStart(e.day);
    if (!groups.has(w)) groups.set(w, []);
    groups.get(w)!.push(e);
  }
  const ordered = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <>
      <div className="top">
        <div>
          <Link href="/" className="eyebrow">← Today</Link>
          <h1 className="title">Journal</h1>
        </div>
      </div>

      <nav className="month-nav" aria-label="Month">
        <Link href={`/journal?month=${prev}`} aria-label="Previous month">‹</Link>
        <span>{label}</span>
        {month < thisMonth ? (
          <Link href={`/journal?month=${next}`} aria-label="Next month">›</Link>
        ) : (
          <span aria-hidden="true" style={{ width: 44 }} />
        )}
      </nav>

      <div className="stats">
        <div className="card">
          <div className="stat-n">{entries.length}</div>
          <div className="stat-l">days written</div>
        </div>
        <div className="card">
          <div className="stat-n">{avg ? avg.toFixed(1) : "–"}</div>
          <div className="stat-l">average day</div>
        </div>
      </div>

      {ordered.length === 0 && (
        <p className="muted">Nothing yet for {label}. Your one line and day rating from the Today screen show up here.</p>
      )}

      {ordered.map(([sunday, items]) => (
        <section key={sunday} className="section">
          <h2 className="section-title">Week of {weekLabel(sunday)}</h2>
          {reflections.get(sunday) && (
            <div className="intent">
              <span className="intent-l">More of</span> {reflections.get(sunday)}
            </div>
          )}
          {items.length > 0 && (
            <ol className="entries">
              {items.map((e) => (
                <li key={e.day} className="entry">
                  <div className="entry-day">{dayLabel(e.day)}</div>
                  <div className={`entry-rating${e.rating ? ` r${e.rating}` : ""}`} aria-label={e.rating ? `Rated ${e.rating} of 5` : "Not rated"}>
                    {e.rating ?? "·"}
                  </div>
                  <div className="entry-words">{e.words?.trim() || <span className="muted">No line</span>}</div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      <div className="links">
        <Link href="/">Today</Link>
        {month !== thisMonth && <Link href="/journal">This month</Link>}
      </div>
    </>
  );
}
