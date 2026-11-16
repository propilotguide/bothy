import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HabitEditor, { type EditableHabit } from "./HabitEditor";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("habits")
    .select("id, slug, name, weekly_target, travel_ok, auto_source, archived, sort")
    .order("sort");

  const habits = (data ?? []) as EditableHabit[];

  return (
    <>
      <div>
        <Link href="/" className="eyebrow">← Today</Link>
        <h1 className="title">Edit habits</h1>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Changes save as you make them. Renaming keeps each habit&apos;s Shortcut name, so your Shortcuts keep working.
      </p>
      <HabitEditor habits={habits} />
    </>
  );
}
