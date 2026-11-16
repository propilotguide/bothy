// Cleans up the Supabase settings so small paste mistakes (spaces, a trailing
// slash, a copied /rest/v1 or /auth/v1 path) don't break sign-in.

export function supabaseUrl(): string {
  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/^["']|["']$/g, "");
  url = url.replace(/\/+(rest|auth)\/v1\/?.*$/i, "").replace(/\/+$/, "");
  if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

export function supabasePublicKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, "");
}

export function supabaseServiceKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim().replace(/^["']|["']$/g, "");
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
}
