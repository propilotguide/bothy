import { supabasePublicKey, supabaseServiceKey, supabaseUrl, siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Names the kind of key without revealing it. */
function keyKind(key: string): string {
  if (!key) return "missing";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload.role === "anon") return "legacy anon";
      if (payload.role === "service_role") return "legacy service_role";
      return `legacy key (role: ${String(payload.role)})`;
    } catch {
      return "unrecognized";
    }
  }
  return "unrecognized";
}

/**
 * Setup check. Open /api/status in a browser. Shows which settings look wrong,
 * never the keys themselves.
 */
export async function GET() {
  const url = supabaseUrl();
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const pub = supabasePublicKey();
  const svc = supabaseServiceKey();
  const pubKind = keyKind(pub);
  const svcKind = keyKind(svc);
  const problems: string[] = [];

  if (!url) problems.push("NEXT_PUBLIC_SUPABASE_URL is missing in Vercel.");
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))
    problems.push(`NEXT_PUBLIC_SUPABASE_URL should look like https://abcd1234.supabase.co, but it's "${raw}".`);

  if (pubKind === "missing") problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in Vercel.");
  else if (pubKind === "secret" || pubKind === "legacy service_role")
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY holds your SECRET key. Swap it for the publishable key (and create a new secret key in Supabase, since this one was exposed to browsers).");
  else if (pubKind === "unrecognized") problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY doesn't look like a Supabase key. Copy the publishable key again.");

  if (svcKind === "missing") problems.push("SUPABASE_SERVICE_ROLE_KEY is missing in Vercel (only needed for Shortcuts).");
  else if (svcKind === "publishable" || svcKind === "legacy anon")
    problems.push("SUPABASE_SERVICE_ROLE_KEY holds the publishable key. It needs the secret key.");
  else if (svcKind === "unrecognized") problems.push("SUPABASE_SERVICE_ROLE_KEY doesn't look like a Supabase key. Copy the secret key again.");

  if (pubKind.startsWith("legacy") !== svcKind.startsWith("legacy") && pubKind !== "missing" && svcKind !== "missing")
    problems.push("One key is a new-style key and the other is a legacy key. Use both from the same tab in Supabase.");

  // Can we reach Supabase's sign-in service with the public key?
  let auth: Record<string, unknown> = { checked: false };
  if (url && pub) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: pub }, cache: "no-store" });
      const text = await res.text();
      let body: Record<string, unknown> | null = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      auth = {
        checked: true,
        http_status: res.status,
        got_json: body !== null,
        email_sign_in_enabled: (body?.external as Record<string, unknown> | undefined)?.email ?? null,
        new_sign_ups_disabled: body?.disable_signup ?? null,
      };
      if (res.status === 401 || res.status === 403) problems.push("Supabase rejected the publishable key. Copy it again from Settings → API Keys.");
      else if (!body) problems.push(`Supabase sign-in didn't answer properly (HTTP ${res.status}, empty or non-JSON reply). The URL is probably wrong, or the project is paused.`);
      else if (body.external && (body.external as Record<string, unknown>).email === false)
        problems.push("Email sign-in is turned off in Supabase: Authentication → Sign In / Providers → Email.");
    } catch (e) {
      auth = { checked: true, error: e instanceof Error ? e.message : String(e) };
      problems.push("Couldn't connect to the Supabase URL at all. Check NEXT_PUBLIC_SUPABASE_URL.");
    }
  }

  // Did schema.sql run? Uses the secret key, server side only.
  let database: Record<string, unknown> = { checked: false };
  if (url && svc && (svcKind === "secret" || svcKind === "legacy service_role")) {
    try {
      const res = await fetch(`${url}/rest/v1/habits?select=id&limit=1`, {
        headers: { apikey: svc, Authorization: `Bearer ${svc}` },
        cache: "no-store",
      });
      database = { checked: true, http_status: res.status, tables_exist: res.ok };
      if (res.status === 404) problems.push("The habits table doesn't exist. Run supabase/schema.sql in the Supabase SQL Editor.");
      else if (res.status === 401 || res.status === 403) problems.push("Supabase rejected the secret key. Copy it again.");
    } catch (e) {
      database = { checked: true, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return Response.json(
    {
      ok: problems.length === 0,
      problems,
      supabase_url: url || null,
      publishable_key: pubKind,
      secret_key: svcKind,
      site_url: siteUrl(),
      allowed_emails_set: Boolean((process.env.ALLOWED_EMAILS ?? "").trim()),
      auth,
      database,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
