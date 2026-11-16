"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";

export type LoginState = { step: "email" | "code"; email?: string; error?: string; info?: string };

function allowed(email: string): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || list.includes(email);
}

function friendly(message: string): string {
  if (/JSON|fetch failed|Failed to fetch|ENOTFOUND|URL and Key are required/i.test(message)) {
    return `Can't reach Supabase (${message}). Open /api/status to see which setting is wrong.`;
  }
  return message;
}

export async function sendCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { step: "email", error: "Enter your email." };
  if (!allowed(email)) return { step: "email", error: "That email isn't allowed to sign in." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
    });
    if (error) return { step: "email", error: friendly(error.message) };
  } catch (e) {
    return { step: "email", error: friendly(e instanceof Error ? e.message : String(e)) };
  }
  return { step: "code", email, info: "Check your email for a 6-digit code." };
}

export async function verifyCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email) return { step: "email", error: "Start again with your email." };
  if (!/^\d{6,10}$/.test(token)) return { step: "code", email, error: "Enter the code from the email." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { step: "code", email, error: friendly(error.message) };
  } catch (e) {
    return { step: "code", email, error: friendly(e instanceof Error ? e.message : String(e)) };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
