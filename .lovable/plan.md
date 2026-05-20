# Daily hours warning — 16h cap / 8h rest

Add a non-blocking warning whenever a clock-in event would result in:
1. **≥16 total hours** recorded on the same `work_date` for that employee, OR
2. A new clock-in occurring **within 8 hours** of that employee's most recent `clock_out_at`.

The user picked "warn only, don't block" and "enforce for everyone" — so the rule is surfaced as a toast in every UI entry point, but no database trigger blocks the insert.

## Where the warning fires (all in `src/pages/Portal.tsx`)

1. **Employee self clock-in** — the kiosk/portal clock-in flow.
2. **Admin "Add Manual Entry"** — Hours Report → Day view.
3. **Admin "Bulk week entry"** dialog — when a row's hours would breach the cap for that date.
4. **Admin edit of existing entry** — if changes push totals past 16h.

In each case: compute `existing_minutes_for_date + new_entry_minutes`. If ≥ 960 minutes, fire `toast.warning(...)`. Separately, look up the latest `clock_out_at` for that employee; if the new `clock_in_at` is within 8 hours of it, fire a second warning toast. The save proceeds either way.

## Warning copy

- 16h cap: `"Heads up: {Name} will have {X}h logged on {date} — over the 16-hour daily limit."`
- 8h rest: `"Heads up: {Name} is clocking in {Xh Ym} after their last clock-out (under the 8-hour rest period)."`

## Technical notes

- No schema changes, no migration, no trigger.
- Helper added near the existing time-entry save logic in `Portal.tsx`:
  ```ts
  function checkDailyHoursWarnings(employeeUserId, workDate, newMinutes, newClockInAt, existingEntries) { ... }
  ```
  Returns `{ overCap?: string; tooSoon?: string }` and the caller dispatches `toast.warning` for each present message.
- Reuses already-loaded `time_entries` data in Portal state — no extra round-trip in the common case. For employee self clock-in, falls back to a quick `supabase.from('time_entries').select('total_minutes, clock_out_at').eq(...)` query scoped to that employee + date.
- Uses `sonner`'s `toast.warning` (already used elsewhere in the file).

## Out of scope

- No hard block, no DB constraint, no override UI (per user choice).
- Overtime/payroll calculations untouched.
