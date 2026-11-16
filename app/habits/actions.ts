"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/settings");
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 40);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "habit"
  );
}

export type HabitPatch = { name?: string; weekly_target?: number; travel_ok?: boolean; archived?: boolean };

/** Renaming keeps the habit's short name (slug), so existing Shortcuts keep working. */
export async function updateHabit(id: string, patch: HabitPatch) {
  const { supabase, user } = await requireUser();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = cleanName(patch.name);
    if (!name) throw new Error("Name can't be empty");
    update.name = name;
  }
  if (patch.weekly_target !== undefined) {
    const t = Math.round(patch.weekly_target);
    if (t < 1 || t > 7) throw new Error("Target must be 1 to 7");
    update.weekly_target = t;
  }
  if (patch.travel_ok !== undefined) update.travel_ok = Boolean(patch.travel_ok);
  if (patch.archived !== undefined) update.archived = Boolean(patch.archived);
  if (!Object.keys(update).length) return;

  const { error } = await supabase.from("habits").update(update).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function addHabit(input: { name: string; weekly_target: number; travel_ok: boolean }): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const name = cleanName(input.name);
  if (!name) return { error: "Give the habit a name." };
  const target = Math.min(7, Math.max(1, Math.round(input.weekly_target || 1)));

  const { data: existing } = await supabase.from("habits").select("slug, sort");
  const slugs = new Set((existing ?? []).map((h) => h.slug));
  const base = slugify(name);
  let slug = base;
  for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;
  const sort = Math.max(0, ...(existing ?? []).map((h) => h.sort ?? 0)) + 1;

  const { error } = await supabase
    .from("habits")
    .insert({ user_id: user.id, slug, name, weekly_target: target, travel_ok: input.travel_ok, sort });
  if (error) return { error: error.message };
  refresh();
  return {};
}

/** Saves a new order for the active habits (ids top to bottom). */
export async function reorderHabits(ids: string[]) {
  const { supabase, user } = await requireUser();
  await Promise.all(
    ids.map((id, i) => supabase.from("habits").update({ sort: i + 1 }).eq("id", id).eq("user_id", user.id))
  );
  refresh();
}
