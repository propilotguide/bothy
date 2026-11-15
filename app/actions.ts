"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashToken, newToken } from "@/lib/api-auth";
import { isIsoDay } from "@/lib/dates";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

export async function toggleHabit(habitId: string, day: string, done: boolean) {
  if (!isIsoDay(day)) throw new Error("Bad date");
  const { supabase, user } = await requireUser();

  if (done) {
    const { error } = await supabase
      .from("checkins")
      .upsert({ user_id: user.id, habit_id: habitId, day, source: "app" }, { onConflict: "habit_id,day", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("checkins").delete().eq("habit_id", habitId).eq("day", day).eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/");
}

export async function saveWords(day: string, words: string) {
  if (!isIsoDay(day)) throw new Error("Bad date");
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("days")
    .upsert({ user_id: user.id, day, words: words.slice(0, 500), updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
}

export async function setRating(day: string, rating: number | null) {
  if (!isIsoDay(day)) throw new Error("Bad date");
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) throw new Error("Bad rating");
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("days")
    .upsert({ user_id: user.id, day, rating, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
}

/** The Sunday question, stored against the week it starts (weeks run Sunday to Saturday). */
export async function saveReflection(weekStartDay: string, text: string) {
  if (!isIsoDay(weekStartDay) || new Date(weekStartDay + "T00:00:00Z").getUTCDay() !== 0) throw new Error("Bad week");
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("weeks")
    .upsert(
      { user_id: user.id, week_start: weekStartDay, reflection: text.slice(0, 300), updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" }
    );
  if (error) throw new Error(error.message);
  revalidatePath("/journal");
}

export async function updateTimeZone(formData: FormData) {
  const tz = String(formData.get("tz") ?? "");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error("Unknown time zone");
  }
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").upsert({ id: user.id, tz });
  revalidatePath("/");
  revalidatePath("/settings");
}

/** Creates a Shortcuts token. The plain token is returned once and only its hash is stored. */
export async function createApiToken(): Promise<string> {
  const { supabase, user } = await requireUser();
  const token = newToken();
  const { error } = await supabase.from("api_tokens").insert({ user_id: user.id, token_hash: hashToken(token) });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  return token;
}

export async function revokeApiTokens() {
  const { supabase, user } = await requireUser();
  await supabase.from("api_tokens").delete().eq("user_id", user.id);
  revalidatePath("/settings");
}
