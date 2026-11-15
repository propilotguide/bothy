import "server-only";
import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return "bothy_" + randomBytes(24).toString("base64url");
}

export type ApiUser = { userId: string; tz: string };

/** Matches the request's `Authorization: Bearer <token>` header to a user. */
export async function authenticate(request: Request): Promise<ApiUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;

  const admin = createAdminClient();
  const { data: token } = await admin
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", hashToken(match[1]))
    .maybeSingle();
  if (!token) return null;

  await admin.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);

  const { data: profile } = await admin.from("profiles").select("tz").eq("id", token.user_id).maybeSingle();
  return { userId: token.user_id, tz: profile?.tz ?? "America/Los_Angeles" };
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}
