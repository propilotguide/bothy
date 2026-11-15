import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateTimeZone } from "../actions";
import { signOut } from "../login/actions";
import TokenPanel from "./TokenPanel";

export const dynamic = "force-dynamic";

const ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: habits }, { count }] = await Promise.all([
    supabase.from("profiles").select("tz").maybeSingle(),
    supabase.from("habits").select("name, slug").eq("archived", false).order("sort"),
    supabase.from("api_tokens").select("id", { count: "exact", head: true }),
  ]);
  const tz = profile?.tz ?? "America/Los_Angeles";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <div>
        <Link href="/" className="eyebrow">← Today</Link>
        <h1 className="title">Settings</h1>
      </div>

      <section className="section">
        <h2 className="section-title">Shortcuts token</h2>
        <TokenPanel hasTokens={(count ?? 0) > 0} />
        <p className="muted">
          Log a habit: <code>POST {site}/api/log</code>
          <br />
          Today&apos;s remaining habits: <code>GET {site}/api/today</code>
          <br />
          Health sync: <code>POST {site}/api/health</code>
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Habit names for Shortcuts</h2>
        <div className="card">
          <table className="table">
            <tbody>
              {(habits ?? []).map((h) => (
                <tr key={h.slug}>
                  <td>{h.name}</td>
                  <td>{h.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Home time zone</h2>
        <form action={updateTimeZone} className="section">
          <div className="field">
            <label htmlFor="tz">Decides when your day starts and ends</label>
            <select id="tz" name="tz" defaultValue={tz}>
              {(ZONES.includes(tz) ? ZONES : [tz, ...ZONES]).map((z) => (
                <option key={z} value={z}>{z.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <button className="btn secondary" type="submit">Save time zone</button>
        </form>
      </section>

      <form action={signOut}>
        <button className="btn secondary" type="submit" style={{ width: "100%" }}>Sign out</button>
      </form>
    </>
  );
}
