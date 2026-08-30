# Policy Scheduler

A visual scheduling tool for Automox patch policies. Month and week calendar
views, drag-and-drop rescheduling, deferral/deadline blackout windows, and
collision detection when overlapping policies target the same computer group.

## Running it locally (macOS or any machine with Node 20+)

```bash
npm install
npm run dev
```

Open the URL Vite prints (defaults to `http://localhost:5173`).

Other useful commands:

```bash
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
npm test          # run the scheduling/collision logic test suite
npm run lint      # oxlint
```

No backend/database — all state lives in the browser tab (React state). Refreshing
the page resets to the seed schedule below.

## The seeded weekly cadence

| Day | Policy | Notes |
|---|---|---|
| Monday, 9:00am | Silent 3rd-Party Patching | Fully silent, all computers, no deferral |
| Patch Tuesday (2nd Tue/mo), 9:00am | Windows Update | 9-hour deferral window |
| Wednesday | — | Deliberate no-patch day |
| Thursday, 9:00am | 3rd-Party Patching (App Close Required) | User notified, app must close, **no deferral** |
| Friday, 9:00am | Office Update | 9-hour deferral window |

All four policies currently target **All Computers** (laptops + desktops), so
the app's collision engine is watching that group for any accidental overlap.

## Core concepts

- **Blackout window** — for any policy with a deferral (or deadline), no other
  policy may run against the same target group between the scheduled run time
  and the end of the deferral window. Policies with zero deferral still get a
  1-hour nominal window, since a patch install itself takes time.
- **Collision** — two occurrences collide when their target groups intersect
  *and* their windows overlap. Colliding chips get a red outline both in the
  calendar and the side panel. See `src/lib/schedule.ts`.
- **Patch Tuesday** — modeled as `nth_weekday` (2nd Tuesday), not a fixed
  weekday, so it lands correctly on any month. See `src/lib/dates.ts`.
- **Drag-and-drop** — in Week view, chips for `weekly`-cadence policies can be
  dragged to a different day column, which updates that policy's `dayOfWeek`
  and re-runs collision detection immediately. `nth_weekday` (Patch Tuesday)
  policies are intentionally not draggable in this first cut — moving a
  monthly cadence to an arbitrary day needs a one-off exception model this
  version doesn't build yet; edit its deferral from the side panel instead.
- **Collision notifications** — a banner across the top of the app lists every
  active collision (which two policies, which shared target group, when),
  looking 8 weeks ahead regardless of which day/week/month you're currently
  viewing. Click an entry to jump straight to that occurrence. See
  `src/components/CollisionBanner.tsx`.

## Importing policies from production Automox

Click **Import policies** and either paste JSON or upload a `.json` file. There
are two ways to get bulk JSON out of Automox itself:

1. **Automox API** — `GET https://console.automox.com/api/policies?o=<org_id>`
   (paginate with `?page=`/`limit=` if you have more than one page's worth)
   returns every policy as JSON. Automox also publishes a
   [PowerShell script](https://help.automox.com/hc/en-us/articles/5351963440532-Retrieve-Policy-List-and-Schedules-Using-PowerShell)
   that does this same pull if you'd rather not hit the API by hand.
2. Paste the **entire response body** into the import box — array, or
   wrapped in `{ "policies": [...] }` / `{ "data": [...] }` (both common
   list-endpoint envelopes), it's auto-unwrapped. All policies in it import in
   one shot; you don't need to split it up per-policy.

The importer accepts two shapes:

**Native schema** (recommended for hand-written policies):

```json
[
  {
    "name": "Silent 3rd-Party Patching",
    "category": "third_party",
    "targetGroups": ["All Computers"],
    "schedule": { "type": "weekly", "dayOfWeek": 1, "time": "09:00" },
    "silent": true,
    "requiresAppClose": false,
    "notifyUser": false,
    "deferralHours": 0
  }
]
```

`schedule.type` is `"weekly"` (`dayOfWeek` 0=Sun..6=Sat) or `"nth_weekday"`
(`dayOfWeek` + `nth`, e.g. Patch Tuesday = `{ "dayOfWeek": 2, "nth": 2 }`).

**Automox policy export** — recognized automatically (detected by the presence
of `schedule_days`, checked both at the top level and nested under
`configuration`, since that's where Automox's real `GET /policies` response
puts most scheduling/behavior fields): `name`, `policy_type_name`,
`schedule_days` (7-digit binary, Sun-first), `schedule_weeks_of_month`
(5-digit binary, 5th-week-first — used to detect a 2nd-week/Patch-Tuesday
cadence), `schedule_time`, `notify_user`, `deferral_minutes` /
`custom_notification_deferment_periods`, and
`groups`/`device_groups`/`device_filters`. See `src/lib/importPolicies.ts`.
Anything Automox sends that this loose adapter doesn't recognize falls back to
sane defaults (weekly, 9am, "All Computers") rather than failing the whole
batch — check each imported policy's card in the side panel against your
source data after a big import.

## Automox best-practice notes baked into the seed schedule

Sourced from Automox's own docs/community guidance while building this:

- Patch Tuesday is the 2nd Tuesday of the month (Microsoft's monthly security
  release) — that's why it's modeled as a monthly cadence, not a weekly one.
- A deferral window that lets users postpone a disruptive patch (with a hard
  deadline behind it) is a standard pattern for anything that interrupts
  someone's work — used here for Windows Update and Office Update.
- Patching at least weekly reduces emergency/out-of-band patch events; the
  seed schedule patches 4 of 5 weekdays.
- Silent installs are reserved for low-disruption 3rd-party updates; anything
  that needs the user to close an app should notify them first — reflected in
  Monday (silent) vs. Thursday (notify + app close) here.

## Project structure

```
src/
  types.ts               domain model (Policy, PolicyOccurrence, schedule types)
  data/seedPolicies.ts   the starting weekly cadence described above
  lib/dates.ts           calendar grid + weekday/nth-weekday date math
  lib/schedule.ts        occurrence expansion + blackout/collision detection
  lib/importPolicies.ts  native + Automox-shaped JSON import (single, array, or enveloped)
  lib/categoryStyle.ts   sage/off-white category color mapping
  components/            Header, MonthView, WeekView, PolicyChip, Sidebar,
                          ImportModal, CollisionBanner
  App.tsx                state + layout
```

## Known limitations (first cut)

- Everything is client-side/in-memory — there's no persistence or Automox API
  connection; import/export is manual JSON.
- Only `weekly` policies are draggable; `nth_weekday` (Patch Tuesday) policies
  are edited via the side panel.
- Verified with `npm run build`, `npm run lint`, and the `src/lib/schedule.test.ts`
  suite in CI-less local runs; the sandbox this was built in had no browser
  runtime available to capture a live screenshot, so give the dev server a
  once-over locally before relying on it.
