# bKash subscription startDate — timezone bug and fix

Documentation for the `START_DATE_IS_PREVIOUS` error on bKash recurring subscription create APIs when requests were made shortly after midnight Bangladesh time.

---

## Table of contents

1. [Symptom](#symptom)
2. [Root cause](#root-cause)
3. [When it happened](#when-it-happened)
4. [Affected endpoints](#affected-endpoints)
5. [What was not the problem](#what-was-not-the-problem)
6. [Fix](#fix)
7. [Files changed](#files-changed)
8. [How to verify after deploy](#how-to-verify-after-deploy)
9. [Out of scope](#out-of-scope)
10. [Residual risk](#residual-risk)

---

## Symptom

Clients calling bKash create-subscription APIs sometimes received:

```json
{ "data": "START_DATE_IS_PREVIOUS" }
```

This maps to bKash gateway error code **2002** via `StatusCheck.checkStatus()` in `src/utils/status-code-check.js`.

Example payload that triggered the error:

```json
{
  "AMOUNT": "250",
  "FIRSTPAYMENTAMOUNT": "250",
  "CURRENCY": "BDT",
  "FREQUENCY": "ONE_EIGHTY_DAYS",
  "STARTDATE": "2026-08-26",
  "EXPIRYDATE": "2028-08-25",
  "USERID": "1977146",
  "PACKAGEID": "2",
  "subscripRequestFrom": "bkash-app-in-app",
  "promo_code": null
}
```

The client sent `STARTDATE` equal to the local Bangladesh calendar date, but the API still failed.

---

## Root cause

Two create-subscription code paths computed `startDate` and `expiryDate` on the server using:

```js
moment().format("YYYY-MM-DD")
```

`moment()` uses the **Node process timezone**, which on production is typically **UTC**, not `Asia/Dhaka`.

bKash validates subscription dates against the **Bangladesh calendar**. When the server was still on “yesterday” in UTC but Bangladesh had already rolled to a new day, the gateway received a `startDate` one day in the past and returned error **2002**.

Flow before the fix:

```
Client (BD)     Server (UTC)              bKash gateway (BD calendar)
─────────     ────────────              ─────────────────────────────
STARTDATE     moment() → yesterday      compares to BD “today”
2026-08-26    e.g. 2026-08-25           → START_DATE_IS_PREVIOUS
(ignored)     sent as startDate
```

For `/v3/bkash/bkash-create-subscription-request-mc`, client `STARTDATE` and `EXPIRYDATE` were **never used** — the handler always overwrote them with server-computed values.

---

## When it happened

Only during a **6-hour window each night** in Bangladesh, when UTC is still on the previous calendar date:

| Bangladesh time (UTC+6) | UTC date vs BD date | Bug? |
|-------------------------|---------------------|------|
| 00:00 – 05:59           | UTC = yesterday     | Yes  |
| 06:00 – 23:59           | UTC = same BD date  | No   |

Example: **2026-08-26 01:50 AM** in Bangladesh = **2026-08-25 19:50 UTC**. Server sent `startDate: "2026-08-25"` while bKash expected `"2026-08-26"`.

If the server process timezone were already `Asia/Dhaka`, this specific bug would not appear.

---

## Affected endpoints

Fixed in this change:

| Route | Model method |
|-------|----------------|
| `POST /v3/bkash/bkash-create-subscription-request-mc` | `bkashCreateMicrositeRecurringSubscription` |
| `POST /v3/bkash/bkash-create-subscription-request-app` | `bkashCreateSubscriptionRequestApp` |

Not changed (still pass client `STARTDATE` / `EXPIRYDATE` through to bKash):

| Route | Model method |
|-------|----------------|
| `POST /v3/bkash/bkash-create-subscription-request` | `bkashCreateSubscriptionRequest` |
| `POST /v3/bkash/bkash-create-subscription-request-app-bkash-microsite` | `bkashCreateSubscriptionRequestAppBkashMicrosite` |

Wrong client dates on those routes can still produce **2001** (`START_DATE_EXCEEDS_CURRENT_DATE`) or **2002**.

---

## What was not the problem

- Client sending a wrong `STARTDATE` on the MC route — that field was ignored before and after the fix.
- Amount, frequency, package ID, or promo logic.
- bKash API keys or merchant configuration.

---

## Fix

All server-computed subscription dates for the two fixed paths now use the **Asia/Dhaka calendar** via shared helpers in `src/utils/date-utils.js`:

| Helper | Purpose |
|--------|---------|
| `calendarDateInZone('Asia/Dhaka')` | Today’s date as `YYYY-MM-DD` in Bangladesh |
| `addCalendarDaysInZone('Asia/Dhaka', days)` | Add calendar days (free trial start offset) |
| `subscriptionExpiryDateInZone('Asia/Dhaka', instant, extraDays)` | Expiry = +2 years −2 days (+ optional free-trial days) |

Rules after fix:

- **Normal subscription:** `startDate` = Dhaka today; `expiryDate` = Dhaka today + 2 years − 2 days.
- **Free trial:** `startDate` = Dhaka today + `free_trial_in_day`; `expiryDate` = base expiry + same trial offset.
- Client `STARTDATE` / `EXPIRYDATE` remain **ignored** on MC and app create paths (intentional).

`moment-timezone` was already a project dependency; `bkash-model.js` no longer uses bare `moment()` for these dates.

---

## Files changed

| File | Change |
|------|--------|
| `src/utils/date-utils.js` | Added `DHAKA_TZ`, `calendarDateInZone`, `addCalendarDaysInZone`, `subscriptionExpiryDateInZone` |
| `src/utils/date-utils.test.js` | Tests for BD midnight window, expiry offset, leap-year edge |
| `src/data/models/bkash-model.js` | Wired helpers into MC and app create-subscription methods |

---

## How to verify after deploy

1. Call `POST /v3/bkash/bkash-create-subscription-request-mc` between **00:00 and 05:59 Bangladesh time** with a valid package payload.
2. Confirm the response is not `START_DATE_IS_PREVIOUS`.
3. Inspect `bkash_mc_invoice.request_payload` for the new row: `startDate` must match the **Bangladesh calendar date**, not UTC yesterday.

Unit tests:

```bash
npm test
```

`src/utils/date-utils.test.js` includes the regression cases (e.g. `2026-08-25T19:50:00.000Z` → `2026-08-26` in Dhaka).

---

## Out of scope

- Setting global `process.env.TZ = 'Asia/Dhaka'` (would affect other UTC-based logic).
- Fixing pass-through routes that still use client-supplied `STARTDATE`.
- Auto-retry or bumping start date to “tomorrow” if bKash still rejects a correct Dhaka today.

---

## Residual risk

If bKash compares `startDate` as a **datetime** at `00:00:00` against “now” (not pure calendar date), a correct Dhaka **today** could still fail with **2002** immediately after midnight. That behavior was not confirmed. If it appears in production, the next step would be to document bKash’s rule and consider sending Dhaka **tomorrow** as start date (with risk of **2001** if that is treated as future-dated).
