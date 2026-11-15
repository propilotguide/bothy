# Bothy

A habit tracker and nightly journal. Tap as it happens, sweep at night, read it on Sunday.

Phase 1: Today screen, eight habits with weekly targets, a quick journal (rate the day 1–5,
one line about it, a Sunday question, and a monthly Journal page), "one year ago today",
and Apple Shortcuts for logging from Control Center, the lock screen,
the Action button and Apple Watch, plus a daily Apple Health sync for sleep and steps.

Stack: Next.js 16 (App Router) · Supabase (Postgres, Auth) · Vercel.

---

## 1. Supabase (about 10 minutes)

1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, click **Run**.
   This creates the tables, locks every row to its owner, and gives every new account the
   starting eight habits. It's safe to run again: if you ran an earlier version, it adds the
   new journal columns and removes the old photo column.
3. **Authentication → Emails → Magic Link** template: add the code so you can sign in
   from the home-screen app (links open in Safari, not the app). For example:
   ```html
   <h2>Your sign-in code</h2>
   <p style="font-size:28px;font-weight:700">{{ .Token }}</p>
   <p>Or <a href="{{ .ConfirmationURL }}">sign in with this link</a>.</p>
   ```
4. **Authentication → URL Configuration**: set Site URL to your Vercel URL and add
   `https://YOUR-APP.vercel.app/auth/callback` to Redirect URLs.
5. **Project Settings → API**: copy the URL, the anon/publishable key, and the
   service_role/secret key.

## 2. Vercel

1. Push this folder to a GitHub repo and import it in Vercel.
2. Add the environment variables from `.env.example`:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (server only) |
   | `ALLOWED_EMAILS` | your email, so nobody else can sign in |
   | `NEXT_PUBLIC_SITE_URL` | `https://YOUR-APP.vercel.app` |

3. Deploy, open the site on your iPhone, sign in with the emailed code.
4. Back in Supabase: **Authentication → Sign In / Providers**, turn off
   **Allow new users to sign up**. Your account is the only one.
5. In Safari: **Share → Add to Home Screen**. It opens full screen like an app.

Local development: `cp .env.example .env.local`, fill it in, `npm install`, `npm run dev`.

## 3. Your habits

| Habit | Weekly target | Shortcut name |
|---|---|---|
| Lights out | 5 | `lights-out` |
| Train | 3 | `train` |
| 10k steps (automatic) | 5 | `steps` |
| Top 3 for tomorrow | 5 | `top-3` |
| Deep work block | 3 (hidden on travel days, phase 2) | `deep-work` |
| Read | 5 | `read` |
| Try something new | 1 | `try-new` |
| Call family | 1 | `call-family` |

To rename one or change a target before the editing screen exists, edit the row in
Supabase **Table Editor → habits**.

Weeks run Sunday to Saturday. The **Yesterday** tab covers a sweep after midnight.

## Journal

All of it happens in the nightly sweep on the Today screen, in a few seconds:

- **How was the day?** One tap, 1 (rough) to 5 (great). Tap it again to clear it.
- **One line about today.** Saves when you tap away from the box.
- **Sunday question.** On Sundays only: "What do you want more of this week?" One line.
- **Journal page** (link at the bottom of Today): each month's lines and ratings, grouped
  by week with that week's Sunday answer on top, plus days written and your average day.

---

## 4. Apple Shortcuts

First, in the app: **Settings & Shortcuts → New token**, and copy it. Every Shortcut below
sends it as a header:

- Key: `Authorization`
- Value: `Bearer ` then your token (one space after Bearer)

Replace `YOUR-APP.vercel.app` with your address throughout.

### A. "Log a habit": one button for Control Center, lock screen, Action button and Watch

Shows what's left today; pick one or more and they're logged.

1. Shortcuts app → **+** → name it **Log a habit**.
2. **Get Contents of URL** → `https://YOUR-APP.vercel.app/api/today`
   Tap the arrow: Method **GET**, add the Authorization header.
3. **Get Dictionary Value** → Get **Value** for **remaining** in *Contents of URL*.
4. **Choose from List** → *Dictionary Value*. Prompt: "Log which?" Turn on **Select Multiple**.
5. **Repeat with Each** → *Chosen Item*. Inside the repeat:
   - **Get Contents of URL** → `https://YOUR-APP.vercel.app/api/log`
     Method **POST**, Authorization header, Request Body **JSON**, add field
     `habit` (Text) = *Repeat Item*.
6. After the repeat: **Show Notification** → "Logged".
7. Shortcut settings (ⓘ): turn on **Show on Apple Watch**.

Put it where your thumb is:
- **Control Center**: swipe down → **+** → Add a Control → Shortcuts → *Log a habit*.
- **Lock screen**: long-press the lock screen → Customize → tap one of the bottom
  controls → Shortcut → *Log a habit*.
- **Action button** (iPhone 15 Pro and later): Settings → Action Button → Shortcut.
- **Apple Watch**: open Shortcuts on the Watch, or add the Shortcuts complication to a face.

### B. One-tap Shortcut per habit (optional)

Same as step 5 above on its own, with `habit` = `train` (or any name from the table), then
**Get Dictionary Value** for **message** → **Show Notification**. You'll see something like
"Train ✓ · 2 of 3 this week". Great for the Action button or a Watch complication.

### C. Health sync: sleep every morning

Shortcuts → **Automation → + → Time of Day**, 8:00 AM, Daily, **Run Immediately**.

1. **Find Health Samples** where **Type** is *Sleep*, **Start Date** is in the last
   *18 hours*, **Value** is not *In Bed*, and **Value** is not *Awake*.
2. **Get Details of Health Samples** → **Duration**.
3. **Calculate Statistics** → **Sum**.
4. **Get Contents of URL** → `https://YOUR-APP.vercel.app/api/health`, Method **POST**,
   Authorization header, Request Body **JSON**: `sleep_minutes` (Number) = *Statistics*.

Check the first run: the Today screen should show something like "Slept 6h 12m". If the
number is 60 times too big, your Shortcuts reports seconds: add **Calculate** ÷ 60 before
step 4. If it's tiny, it reports hours: send it as `sleep_hours` instead.

### D. Health sync: steps every evening

Automation → **Time of Day**, 9:30 PM, Daily, **Run Immediately**.

1. **Find Health Samples** where **Type** is *Steps*, **Start Date** is *today*,
   **Group By** *Day*. (Grouping uses Health's own daily total, so iPhone and Watch steps
   aren't counted twice. Compare with the Health app the first time.)
2. **Get Details of Health Samples** → **Value**.
3. **Calculate Statistics** → **Sum**.
4. **Get Contents of URL** → `/api/health`, POST, Authorization header,
   JSON: `steps` (Number) = *Statistics*.

10,000 or more checks off **10k steps** automatically.

---

## API reference

All endpoints need `Authorization: Bearer <token>`. Dates are `YYYY-MM-DD` and default to
today in your home time zone (Settings).

| Endpoint | Body / query | Does |
|---|---|---|
| `POST /api/log` | `{ "habit": "train", "date"?: "...", "done"?: false }` | Logs (or un-logs) a habit. `habit` can be the short name or the full name. |
| `GET /api/today` | `?date=` optional | `{ remaining: [...], done: [...], summary }` |
| `POST /api/health` | `{ "sleep_minutes" \| "sleep_hours", "date"?, "steps", "steps_date"? }` | Saves sleep/steps; ≥10k steps checks the steps habit. `steps_date` also accepts `"yesterday"`. |

## Coming in phase 2

Travel mode (location-based, hides `deep-work` and any habit with `travel_ok = false`),
the Sunday weekly summary with patterns (including which habits line up with your
better-rated days) and a suggestion, smart nudges via web push, and a screen for editing habits.
