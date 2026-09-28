# Payment API — Business Logic & Implementation

Multi-gateway payment system for Kabbik subscriptions, audiobook rent, category bundles, courses, store orders, and quiz access. Gateways include SurjoPay (legacy), bKash, Google Pay, Nagad, Upay, Robi, Banglalink DCB (MyBL), AmrPay, Stripe, Grameenphone DCB (GP), and City Bank (City Pay).

Rent **catalog browsing** (`/api/v4/rent/*`) is documented separately in [rent.md](./rent.md). This document covers **payment initiation, verification, fulfillment, renewals, and admin flows**.

---

## Table of contents

1. [Overview](#overview)
2. [Domain concepts](#domain-concepts)
3. [Mount points](#mount-points)
4. [Shared infrastructure](#shared-infrastructure)
5. [Purchase types & fulfillment](#purchase-types--fulfillment)
6. [Package IDs](#package-ids)
7. [V1 — SurjoPay, Banglalink DCB, RevenueCat](#v1--surjopay-banglalink-dcb-revenuecat)
8. [V3 — bKash](#v3--bkash)
9. [V3 — Google Pay](#v3--google-pay)
10. [V4 — Nagad](#v4--nagad)
11. [V4 — Upay](#v4--upay)
12. [V4 — Robi](#v4--robi)
13. [V4 — MyBL (Banglalink DCB callbacks)](#v4--mybl-banglalink-dcb-callbacks)
14. [V4 — AmrPay](#v4--amrpay)
15. [V4 — Stripe](#v4--stripe)
16. [V4 — GP (Grameenphone DCB)](#v4--gp-grameenphone-dcb)
17. [V4 — City Pay](#v4--city-pay)
18. [Payment-adjacent user & home APIs](#payment-adjacent-user--home-apis)
19. [Cron jobs & renewals](#cron-jobs--renewals)
20. [Database dependencies](#database-dependencies)
21. [Authentication & access control](#authentication--access-control)
22. [Architecture & file map](#architecture--file-map)
23. [Operational notes](#operational-notes)
24. [Out of scope](#out-of-scope)

---

## Overview

Payment flows follow a common pattern across modern gateways:

1. **Init** — client calls a `create-payment` (or gateway-specific) endpoint; backend writes a gateway invoice row + optional `store_log` entry.
2. **Redirect / webhook** — gateway calls back with success/failure; backend verifies and fulfills.
3. **Fulfillment** — depending on `purchase_type`:
   - **Subscription** → update `users` (`is_subscribed`, `package_id`, `next_purchase_time`, etc.) + `user_payment_log`
   - **Rent / audiobook** → insert `audiobooks_rent`
   - **Category** → insert `purchased_category`
   - **Course** → insert `course_purchase_table`
   - **Store** → insert `store_order`
   - **Quiz** → insert `quiz_access`

Legacy SurjoPay (v1) uses the `payments` table and ShurjoPay API directly. bKash recurring renewals are driven by bKash webhooks; GP and Robi run server-side renewal crons.

---

## Domain concepts

### Subscription package

Rows in `subscription_packages` define catalog items (`subscriptionItemId`, `rawPrice`, duration in days, Google/Apple product IDs). Package IDs are referenced throughout gateway models — not centralized in `constants.js`.

### Payment audit log

`user_payment_log` is the canonical audit trail, populated via stored procedure `create_user_payment_log`. Called from `PaymentHelper.insertUserPaymentLog()` (and duplicate in `payment_log_utils.js`) after successful payments. Also triggers reward points, affiliate/refer earnings, and CPA postbacks.

### One-time purchase ledger

`store_log` is the shared ledger for one-time purchases across Nagad, Upay, Robi, GP, AmrPay, bKash one-time, and City Pay rent flows. Columns include `user_id`, `payment_id`, `transaction_id`, `amount`, `purchase_type`, `product_id`, `payment_method`, `is_succeed`.

### Gateway invoice tables

Each gateway maintains its own invoice/webhook tables (e.g. `bkash_invoice`, `nagad_payment`, `gp_payments`). These hold gateway reference IDs, request payloads, and status before fulfillment.

### Banglalink DCB split

- **Initiation:** v1 `/api/v1/payment/create-bl-subscription` → writes `dcb_invoice`, calls BL SDP API.
- **Callback:** v4 `/api/v4/mybl/payment-callback` → writes `dcb_webhook`, activates `users` on status `A`.

---

## Mount points

From `app.js`:

| Base path | Router file |
|-----------|-------------|
| `/api/v1/payment` | `src/routers/v1/payment-router.js` |
| `/api/v3/bkash` | `src/routers/v3/bkash-router.js` |
| `/api/v3/googlepay` | `src/routers/v3/googlepay-router.js` |
| `/api/v4/nagad` | `src/routers/v4/nagad-router.js` |
| `/api/v4/upay` | `src/routers/v4/upay-router.js` |
| `/api/v4/robi` | `src/routers/v4/robi-router.js` |
| `/api/v4/mybl` | `src/routers/v4/mybl-router.js` |
| `/api/v4/amrpay` | `src/routers/v4/amrpay-router.js` |
| `/api/v4/stripe` | `src/routers/v4/stripe-router.js` |
| `/api/v4/send-webhook-stripe` | `src/routers/v4/stripe-router.js` (mounted **before** `express.json()`) |
| `/api/v4/gp` | `src/routers/v4/gp-router.js` |
| `/api/v4/city-pay` | `src/routers/v4/city-payment-router.js` |

Payment-adjacent mounts:

| Base path | Purpose |
|-----------|---------|
| `/api/v4/user` | Payment method lists, iOS/Google Pay subscription sync |
| `/api/v4/home` | Dynamic payment method list |
| `/api/v1/auth` | bKash token save/validate/delete, MyBL login |

---

## Shared infrastructure

### Files

| File | Role |
|------|------|
| `src/data/models/payment-model.js` | SurjoPay CRUD, BL DCB, RevenueCat webhook; core table `payments` |
| `src/controllers/payment-controller.js` | v1 payment router handlers |
| `src/utils/payment-helper.js` | Order ID generation, SurjoPay callback, `create_user_payment_log`, rewards, CPA |
| `src/utils/payment_log_utils.js` | Near-duplicate of payment-helper logging (used by BL DCB in payment-model) |
| `src/utils/payment-urls.js` | Gateway callback/redirect URLs from `KABBIK_BACKEND_API` env |
| `src/utils/constants.js` | Re-exports `payment-urls`; gateway credentials (bKash, Robi, GP, etc.) |

### Stored procedures

| Procedure | Purpose |
|-----------|---------|
| `create_user_payment_log` | Unified payment audit log |
| `create_payment` | Insert SurjoPay one-time row into `payments` |
| `create_payment_subscribe` | Insert SurjoPay subscription row |
| `update_payment` | Update SurjoPay transaction status |
| `insert_cpa_marketing_record` | CPA click attribution |
| `affiliate_earn_log_insert` | Affiliate commission on rent/subscription |
| `create_or_return_user` | User provisioning during bKash flows |

### Callback URLs (`payment-urls.js`)

Built from `KABBIK_BACKEND_API` (default `https://api.kabbik.com`):

| Constant | Path suffix |
|----------|-------------|
| `MERCHENT_CALLBACK_URL` | `/v4/nagad/nagad-redirect` |
| `UPAY_PAYMENT_CALLBACK_URL` | `/v4/upay/upay-redirect` |
| `ROBI_CALLBACK_URL` | `/v4/robi/robi-redirect` |
| `URL_REDIRECT_BKASH_ONETIME` | `/v3/bkash/bkash-onetime-callback` |
| `URL_REDIRECT_BKASH_ONETIME_Audiobook_Purchase` | `/v3/bkash/bkash-onetime-audiobook-purchase-callback` |
| `URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE` | `/v3/bkash/bkash-onetime-course-purchase-callback` |
| `URL_BKASH_REDIRECT` | `/v3/bkash/bkash-redirect` |
| `URL_BKASH_REDIRECT_BKASHAPP` | `/v3/bkash/bkash-redirect-bkashapp` |
| `URL_BKASH_REDIRECT_MC` | `/v3/bkash/bkash-redirect-mc` |
| `URL_BKASH_REDIRECT_BKASH_MICROSITE` | `/v3/bkash/bkash-redirect-bkash-microsite` |
| `URL_BKASH_ONETIME_CALLBACK_BKASH_MICROSITE` | `/v3/bkash/bkash-onetime-callback-bkash-microsite` |
| `AMRPAY_REDIRECT_URL` | `/v4/amrpay/redirect-url-amrpay` |
| `STRIPE_REDIRECT_URL` | `/v4/stripe/redirect-url-stripe` |

Express routes are mounted under `/api` + version prefix (e.g. full Nagad redirect: `/api/v4/nagad/nagad-redirect`).

---

## Purchase types & fulfillment

| Purchase type | Gateways | Fulfillment table(s) |
|---------------|----------|----------------------|
| `subscription` / `Subscription` | All gateways | `users`, `user_payment_log` |
| `audiobook` / `Audiobook` / `rent` | bKash, Nagad, Upay, Robi, GP, AmrPay, City Pay | `audiobooks_rent` |
| `category` | bKash, Nagad, Upay, Robi, GP, AmrPay | `purchased_category` |
| `Course` / `course` | bKash, Nagad, Upay, AmrPay | `course_purchase_table` |
| `store` | bKash, Nagad, Upay, AmrPay | `store_order` |
| `quiz` | Robi, GP | `quiz_access` |
| Voice Academy / `ebook` | bKash | `bkashVoiceAcademy`, `enrollment` |

**Reward points** (`payment-helper.js`):

- Rent / audiobook / category → task ID `5`
- Subscription first payment → task IDs `13` (daily/4), `14` (monthly/1), `15` (half-yearly/2), `16` (yearly/3)

---

## Package IDs

Not defined in `constants.js`. Canonical source: `subscription_packages.subscriptionItemId`.

| ID | Name | Duration | Notes |
|----|------|----------|-------|
| `1` | Monthly | 30 days | Auto-renew on Robi, GP, BL DCB |
| `2` | Half-Yearly | 180 days | One-off or auto-renew (`fromRenewal` / `from_autorenewal`) |
| `3` | Yearly | 365 days | Typically one-off |
| `4` | Daily | 1 day | Auto-renew; e.g. BDT 4 |
| `5` | Yearly (GP) | 365 days | GP non-auto-renewal variant |
| `12` | Monthly free trial | — | RevenueCat `kabbik_99_free_trial` |
| `19` | Robi monthly variant | 31 days | Maps to `Kabbik 30 Days R` |
| `20` | Robi 6-month auto-renew | 181 days | Maps to `Kabbik 6 months R` |
| `21` | Robi yearly | 366 days | Maps to `Kabbik 1 Year` |

### Banglalink DCB offer IDs (`payment-model.createBlSubscription`)

| `packageId` | `fromRenewal` | Offer ID | Charge (BDT) |
|-------------|---------------|----------|--------------|
| 1 | — | `9922610005` | 50 |
| 2 | 1 | `9922610006` | 250 |
| 2 | 0 | `9922610007` | 250 |
| 3 | — | `9922610008` | 450 |
| 4 | — | `9922610003` | 4 |

### RevenueCat product → package (`payment-model.revenueCatWebhook`)

| Product ID | Package ID |
|------------|------------|
| `kabbik_99`, `monthly_pack_kabbik:monthly-pack-kabbik` | 1 |
| `kabbik_99_free_trial`, `monthly_pack_free_trail:...` | 12 |
| `kabbik_499_6m`, `half_yearly_pack:half-yearly-pack` | 2 |
| `yearly_pack:yearly-pack`, `kabbik_999_1y` | 3 |
| (default) | 3 |

### Robi subscription ID strings (`robi-model`)

| packageId | Subscription ID |
|-----------|-----------------|
| 4 | `KabbiqDailyRcrr` |
| 3, 21 | `Kabbik 1 Year` |
| 2 + autorenewal, 20 | `Kabbik 6 months R` |
| 2 one-off | `Kabbik 6 months` |
| 1, 19 | `Kabbik 30 Days R` |

### GP subscription period (ISO 8601)

| packageId | Period |
|-----------|--------|
| 4 | `P1D` |
| 1 | `P1M` |
| 2 | `P6M` |
| 3+ | `P1Y` |

---

## V1 — SurjoPay, Banglalink DCB, RevenueCat

**Router:** `src/routers/v1/payment-router.js`  
**Controller:** `src/controllers/payment-controller.js`  
**Model:** `src/data/models/payment-model.js`  
**Core table:** `payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List active payments (`deleted=0`) |
| GET | `/getallDeleted` | Admin | List soft-deleted payments |
| GET | `/getbyId` | Admin | Fetch by `orderId` query param |
| POST | `/init` | User | Initiate SurjoPay checkout (ShurjoPay token + secret-pay) |
| POST | `/verify` | None | Verify SurjoPay order; activate subscription on success |
| POST | `/audiobookinsertapp` | User | Manual audiobook grant → `users_library` |
| POST | `/audiobookinsertweb` | User | Manual audiobook grant with `customer_order_id` |
| POST | `/payment-callback` | External | External callback → `PaymentHelper.handlePaymentCallback` |
| PUT | `/deleted` | Admin | Soft-delete by `sp_order_id` |
| PUT | `/payment-update/:id` | Admin | Admin update via `update_payment` SP |
| DELETE | `/parmanentDelete` | Admin | Hard delete from `payments` |
| POST | `/create-bl-subscription` | None | Banglalink DCB subscription init → `dcb_invoice` |
| POST | `/create-bl-subscription-new` | None | Newer BL DCB flow variant |
| POST | `/verify-dcb-payment` | None | DCB consent verification |
| POST | `/unsubscribed-bl-dcb` | None | BL DCB unsubscribe |
| POST | `/revenuecat-weekhook` | None | RevenueCat IAP webhook → `revenuecat_webhook` + `users` |

**Tables:** `payments`, `users`, `users_library`, `dcb_invoice`, `revenuecat_webhook`, `cpa_marketing`, `user_payment_log`

---

## V3 — bKash

**Router:** `src/routers/v3/bkash-router.js`  
**Controller:** `src/controllers/bkash-controller.js`  
**Model:** `src/data/models/bkash-model.js`

### Recurring subscription

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/bkash-create-subscription-request` | None | Web recurring subscription |
| POST | `/bkash-create-subscription-request-app` | None | App recurring subscription |
| POST | `/bkash-create-subscription-request-app-bkash-microsite` | None | Microsite app subscription |
| POST | `/bkash-create-subscription-request-mc` | None | Microsite recurring (MC) |
| GET | `/bkash-query-subscription-requestid` | None | Query by request ID |
| GET | `/bkash-get-payment-listby-subscriptionid` | None | Payment list by subscription |
| GET | `/bkash-get-mc-payment-listby-subscriptionid` | None | MC payment list |
| GET | `/bkash-get-payment-info-by-paymentid` | None | Payment detail |
| GET | `/bkash-query-by-subscription-id` | None | Query subscription |
| GET | `/bkash-get-payment-schedule` | None | bKash recurring schedule API proxy |
| GET | `/bkash-redirect` | None | Subscription redirect callback |
| GET | `/bkash-redirect-bkash-microsite` | None | Microsite redirect |
| GET | `/bkash-redirect-bkashapp` | None | bKash app redirect |
| GET | `/bkash-redirect-mc` | None | MC redirect |
| GET | `/bkash-redirect-test` | None | Test redirect |
| DELETE | `/bkash-cancel-subscription` | None | Cancel subscription (web) |
| DELETE | `/bkash-cancel-subscription-app` | User | Cancel subscription (app) |
| POST | `/bkash-refund-payment` | None | Refund |
| POST | `/bkash-refund-payment-mc` | None | MC refund |

### One-time payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bkash-onetime-create-payment` | One-time payment create |
| POST | `/bkash-onetime-create-payment-bkash-microsite` | Microsite one-time |
| GET | `/bkash-onetime-callback` | One-time callback |
| GET | `/bkash-onetime-callback-bkash-microsite` | Microsite one-time callback |

### Audiobook / course purchase

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bkash-onetime-create-payment-audioBook-purchase` | Rent/audiobook one-time |
| GET | `/bkash-onetime-audiobook-purchase-callback` | Fulfill → `audiobooks_rent` / `purchased_category` |
| POST | `/bkash-onetime-create-payment-course-purchase` | Course / ebook create (`type: ebook` → `bkashVoiceAcademy`) |
| POST | `/bkash-ebook-fulfill-payment` | Ebook execute after bKash pay → `{ data: { success, gateway_response } }` (see [bkash-ebook-fulfill-deploy.md](./bkash-ebook-fulfill-deploy.md)) |
| GET | `/bkash-onetime-course-purchase-callback` | Fulfill → `course_purchase_table` / `store_order` / ebook redirect |

### Webhooks & utilities

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook` | Production recurring webhook → `bkash_webhook` |
| POST | `/webhook-mc` | MC webhook → `bkash_mc_webhook` |
| POST | `/webhook-test` | Test webhook log |
| POST | `/webhookSandbox` | Sandbox webhook |
| POST | `/webhookProduction` | Production webhook (alt) |
| POST | `/bKash/auth` | bKash token auth |
| POST | `/bKash/staging/auth` | Staging auth |
| GET | `/bkashNotify/:userId` | Notify user of failed payment |

**Tables:** `bkash_invoice`, `bkash_webhook`, `bkash_webhook_test`, `bkash_webhook_error_log`, `bkash_mc_invoice`, `bkash_mc_webhook`, `bkash_onetime`, `bkash_recurring`, `bkashVoiceAcademy`, `audiobooks_rent`, `purchased_category`, `course_purchase_table`, `store_log`, `store_order`, `quiz_access`, `enrollment`, `subscription_packages`, `promo`, `affiliate_user`, `users`, `promotion_track_table`, `user_payment_log`

**Timezone note:** See [bkash-subscription-start-date.md](./bkash-subscription-start-date.md) for `START_DATE_IS_PREVIOUS` fix on MC/app create paths.

---

## V3 — Google Pay

**Router:** `src/routers/v3/googlepay-router.js`  
**Controller:** `src/controllers/googlepay-controller.js`  
**Model:** `src/data/models/googlepay-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/googlepay-create-purchase` | None | Record Play purchase → `googlepay_invoice`; activate subscription |
| GET | `/googlepay_subscription_list` | None | List `subscription_packages` (status=1) |
| POST | `/googlepay_subscription_list_v2` | None | Country/microsite-filtered package list |
| GET | `/googlepay_subscription_item` | None | Single package by `id` |
| GET | `/find_user_product_id` | None | Check user has `package_id` |
| POST | `/googlepay_subscription_update_user` | None | Update user subscription from Google Pay receipt |

**Tables:** `subscription_packages`, `googlepay_invoice`, `users`

---

## V4 — Nagad

**Router:** `src/routers/v4/nagad-router.js`  
**Controller:** `src/controllers/nagad-controller.js`  
**Model:** `src/data/models/nagad-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment` | None | Subscription payment init → `nagad_payment` |
| GET | `/verify-payment` | None | Verify by `paymentRefID` |
| GET | `/nagad-redirect` | None | Browser redirect; verify + redirect to kabbik.com or mybl.kabbik.com |
| POST | `/create-payment-dynamic` | None | One-time: Audiobook, Course, category, store |
| POST | `/bkash-create-subscription-request` | None | Legacy alias |
| POST | `/bkash-create-subscription-request-app` | None | Legacy alias (app) |

**Tables:** `nagad_payment`, `store_log`, `audiobooks_rent`, `purchased_category`, `course_purchase_table`, `store_order`, `bkash_invoice`, `promotion_track_table`, `users`

---

## V4 — Upay

**Router:** `src/routers/v4/upay-router.js`  
**Controller:** `src/controllers/upay-controller.js`  
**Model:** `src/data/models/upay-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment` | None | Payment init → `upay_payment` + `store_log` |
| GET | `/payment-auth` | None | Upay auth step |
| GET | `/verify-payment` | None | Verify by invoice |
| GET | `/upay-redirect` | None | Redirect callback |
| POST | `/bkash-create-subscription-request` | None | Legacy alias |
| POST | `/bkash-create-subscription-request-app` | None | Legacy alias |

**Tables:** `upay_payment`, `store_log`, `audiobooks_rent`, `purchased_category`, `course_purchase_table`, `store_order`, `bkash_invoice`, `promotion_track_table`

---

## V4 — Robi

**Router:** `src/routers/v4/robi-router.js`  
**Controller:** `src/controllers/robi-controller.js`  
**Model:** `src/data/models/robi-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment` | User | Robi AOC subscription or one-time (Audiobook/category/quiz) |
| GET | `/robi-redirect` | None | Payment redirect callback |
| POST | `/robi-unsubscribe` | User | Cancel Robi subscription |
| POST | `/renew-robi-subscription` | None | Manual renewal trigger |

**Tables:** `robi_payment`, `robi_webhook`, `store_log`, `subscription_packages`, `audiobooks_rent`, `purchased_category`, `quiz_access`, `users`, `bkash_invoice`, `promotion_track_table`

**Embedded cron:** `node-cron` at `30 16,23 * * *` (4:30 PM & 11:30 PM daily) calls `renewRobiSubscriptionCronJob()`.

---

## V4 — MyBL (Banglalink DCB callbacks)

**Router:** `src/routers/v4/mybl-router.js`  
**Controller:** `src/controllers/mybl-controller.js`  
**Model:** `src/data/models/mybl-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/payment-callback` | None | BL DCB webhook → `dcb_webhook`; status `A` activates `users` |
| GET/POST | `/payment-callback-web` | None | Web variant of DCB callback |
| POST | `/payment/send-webhook` | User | Outbound webhook sender |
| POST | `/generate-daily-report` | None | Manual payment/subscription daily report |

**Tables:** `dcb_webhook`, `dcb_invoice`, `mybl_post_transaction`, `users`, `user_payment_log`, `bkash_invoice`, `subscription_packages`, `promo`

**Embedded cron:** `node-cron` at `5 0 * * *` (12:05 AM daily) calls `generateDailyReportCorn()`.

Subscription **initiation** is on v1 (`/api/v1/payment/create-bl-subscription`), not this router.

---

## V4 — AmrPay

**Router:** `src/routers/v4/amrpay-router.js`  
**Controller:** `src/controllers/amrpay-controller.js`  
**Model:** `src/data/models/amrpay-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment-amrpay` | None | Create payment (subscription or one-time by `type`) → `aamarPay` + `store_log` |
| POST | `/redirect-url-amrpay` | None | Success/fail redirect; fulfills purchase |

**Purchase types:** `subscription`, `Audiobook`, `Course`, `category`, `store`

**Tables:** `aamarPay`, `store_log`, `audiobooks_rent`, `purchased_category`, `course_purchase_table`, `store_order`, `users`

---

## V4 — Stripe

**Router:** `src/routers/v4/stripe-router.js`  
**Controller:** `src/controllers/stripe-controller.js`  
**Model:** `src/data/models/stripe-model.js`

| Method | Path | Mount | Description |
|--------|------|-------|-------------|
| POST | `/create-stripe-subscription` | `/api/v4/stripe` | Stripe Checkout session → `stripe_payment` |
| GET | `/redirect-url-stripe` | `/api/v4/stripe` | Post-checkout redirect |
| POST | `/manage-stripe-subscriptions` | `/api/v4/stripe` | Cancel/manage subscriptions |
| POST | `/stripe-webhook` | Both mounts | Stripe events → `stripe_webhook`; updates `users` |
| POST | `/create-googlepay-stripe-subscription` | `/api/v4/stripe` | Google Pay via Stripe Checkout |

**Tables:** `stripe_payment`, `stripe_webhook`, `users`

**Note:** Webhook router is also mounted at `/api/v4/send-webhook-stripe` **before** `express.json()` so raw body parsing works for signature verification.

---

## V4 — GP (Grameenphone DCB)

**Router:** `src/routers/v4/gp-router.js`  
**Controller:** `src/controllers/gp-controller.js`  
**Model:** `src/data/models/gp-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment` | None | GP DCB consent prep → `gp_payments` + `store_log` |
| GET | `/redirect-url/ok` | None | Success redirect; charge + activate or fulfill one-time |
| GET | `/redirect-url-recharge/ok` | None | Recharge-then-buy flow |
| GET | `/redirect-url/deny` | None | User denied consent |
| GET | `/redirect-url/error` | None | Error redirect |
| POST | `/refund-payment` | None | Refund |
| GET | `/unsubscribe` | None | Unsubscribe initiation |
| POST | `/unsubscribe` | None | Unsubscribe callback |
| GET | `/cronjob/renewal-charge` | None | HTTP cron — auto-renew expired GP subscriptions |
| GET | `/cronjob/renewal-warning` | None | HTTP cron — renewal warning notifications |

**Purchase types:** subscription (by `packageId`), `quiz`, `category`, `audiobook`

**Tables:** `gp_payments`, `gp_payment_log`, `store_log`, `audiobooks_rent`, `purchased_category`, `quiz_access`, `subscription_packages`, `users`

`auth-gp-middleware` is imported but **not applied** to any route.

---

## V4 — City Pay

**Router:** `src/routers/v4/city-payment-router.js`  
**Controller:** `src/controllers/city-payment-controller.js`  
**Model:** `src/data/models/city-payment-model.js`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create-payment` | None | City Bank token + initiate; subscription or rent (`bookId`) |
| POST | `/validate-payment` | None | Validate transaction with City Bank API |
| GET/POST | `/redirect-payment` | None | Fulfill subscription or rent |
| GET | `/transection-report` | None | Transaction report (date range, default last 7 days) |

**Tables:** `city_bank_payment`, `store_log`, `audiobooks_rent`, `subscription_packages`, `promo`, `audiobooks`, `users`

---

## Payment-adjacent user & home APIs

### `/api/v4/user` (`src/routers/v4/user-router.js`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/paymentMethodList` | None | Payment methods for client |
| POST | `/paymentMethodListV2` | None | v2 payment method list |
| POST | `/paymentMethodListV3` | None | v3 payment method list |
| POST | `/paymentMethodListV4` | None | v4 payment method list |
| POST | `/paymentMethodListWeb` | None | Web payment method list |
| POST | `/update-ios-subscription` | None | Sync iOS subscription status |
| POST | `/update-googlepay-subscription` | None | Sync Google Pay subscription |
| GET | `/show-global-payment-method` | None | Global payment method visibility |

Queries `payment_methods` table via `user-model-v4`.

### `/api/v4/home` (`src/routers/v4/home-router.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/get-dynamic-payment-method` | Dynamic payment method list for home |

### `/api/v1/auth` (bKash token management)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mybl` | MyBL login |
| POST | `/bKash` | bKash login |
| POST | `/save-bkash-token` | Save bKash token |
| GET | `/bkash-token-validity` | Check token validity |
| DELETE | `/delete-bkash-token` | Delete stored token |

### `/api/v1/user`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/update/from_payment/:id` | User | Update user profile during payment flow |

### `/api/v1/publisher` (payment reporting)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payment-history` | Publisher | Publisher payment history |
| GET | `/cronjob/monthly-revenue` | — | Monthly revenue cron endpoint |

---

## Cron jobs & renewals

### Embedded `node-cron` (runs on app start)

| Location | Schedule | Handler | Purpose |
|----------|----------|---------|---------|
| `robi-router.js` | `30 16,23 * * *` | `renewRobiSubscriptionCronJob()` | Auto-renew Robi DCB subs where `from_autorenewal=1`, expired `next_purchase_time` |
| `mybl-router.js` | `5 0 * * *` | `generateDailyReportCorn()` | BL payment/subscription daily report |

### HTTP cron endpoints (external scheduler)

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/v4/gp/cronjob/renewal-charge` | `GpModel.renewalCharge()` | Charge GP auto-renewals (`gp_payments.renewal=1`, `next_renew_time` passed) |
| GET | `/api/v4/gp/cronjob/renewal-warning` | `GpModel.renewalWarning()` | Send renewal warning before GP charge |
| POST | `/api/v4/robi/renew-robi-subscription` | `renewRobiSubscription` | Manual Robi renewal trigger |

### Gateway-driven renewals (no server cron)

| Gateway | Renewal mechanism |
|---------|-------------------|
| bKash recurring | bKash gateway webhooks → `bkash_webhook` / `bkash_mc_webhook` |
| Stripe | Stripe webhooks → `stripe_webhook` |
| RevenueCat | Webhook → `/api/v1/payment/revenuecat-weekhook` |
| BL DCB | Carrier billing cycle via DCB callbacks |

---

## Database dependencies

### Core & audit

| Table | Purpose |
|-------|---------|
| `payments` | SurjoPay legacy transactions |
| `user_payment_log` | Unified payment audit (via SP) |
| `users` | Subscription state (`is_subscribed`, `package_id`, `payment_method`, `subscription_id`, `purchase_time`, `next_purchase_time`) |
| `subscription_packages` | Package catalog |
| `payment_methods` | Client-visible payment method config |
| `store_log` | Universal one-time purchase ledger |
| `cpa_marketing` | CPA click attribution |

### Fulfillment

| Table | Purpose |
|-------|---------|
| `users_library` | Owned audiobooks (SurjoPay manual grant) |
| `audiobooks_rent` | Time-limited rent purchases |
| `purchased_category` | Category bundle purchases |
| `course_purchase_table` | Course access |
| `store_order` | Store merchandise orders |
| `quiz_access` | Quiz entry purchases |
| `promo` | Promo code discounts |
| `promotion_track_table` | Promotion tracking |

### Gateway invoice / webhook tables

| Gateway | Tables |
|---------|--------|
| bKash | `bkash_invoice`, `bkash_webhook`, `bkash_webhook_test`, `bkash_webhook_error_log`, `bkash_mc_invoice`, `bkash_mc_webhook`, `bkash_onetime`, `bkash_recurring`, `bkashVoiceAcademy` |
| Nagad | `nagad_payment` |
| Upay | `upay_payment` |
| Robi | `robi_payment`, `robi_webhook` |
| GP | `gp_payments`, `gp_payment_log` |
| AmrPay | `aamarPay` |
| Stripe | `stripe_payment`, `stripe_webhook` |
| Google Pay | `googlepay_invoice` |
| City Pay | `city_bank_payment` |
| Banglalink DCB | `dcb_invoice`, `dcb_webhook`, `mybl_post_transaction` |
| RevenueCat | `revenuecat_webhook` |

---

## Authentication & access control

| Middleware | Used on |
|------------|---------|
| `authorize` (user JWT) | v1 `/init`, audiobook inserts; robi create/unsubscribe; mybl `/payment/send-webhook`; bKash cancel-app |
| `authorizeAdmin` | v1 payment admin CRUD |
| `authorizeExternal` | v1 `/payment-callback` |
| `auth-gp-middleware` | Imported in gp-router, **not applied** |

Most gateway create/redirect/webhook endpoints are **unauthenticated** — they rely on gateway signatures, reference IDs, or server-side verification with the payment provider.

---

## Architecture & file map

```
app.js
├── /api/v1/payment          → payment-router       → payment-controller       → payment-model
├── /api/v3/bkash            → bkash-router         → bkash-controller         → bkash-model
├── /api/v3/googlepay        → googlepay-router     → googlepay-controller     → googlepay-model
├── /api/v4/nagad            → nagad-router         → nagad-controller         → nagad-model
├── /api/v4/upay             → upay-router          → upay-controller          → upay-model
├── /api/v4/robi             → robi-router (+cron)  → robi-controller          → robi-model
├── /api/v4/mybl             → mybl-router (+cron)  → mybl-controller          → mybl-model
├── /api/v4/amrpay           → amrpay-router        → amrpay-controller        → amrpay-model
├── /api/v4/stripe           → stripe-router        → stripe-controller        → stripe-model
├── /api/v4/send-webhook-stripe → stripe-router (pre-json, raw body)
├── /api/v4/gp               → gp-router            → gp-controller            → gp-model
└── /api/v4/city-pay         → city-payment-router  → city-payment-controller  → city-payment-model

Shared utilities:
  src/utils/payment-helper.js
  src/utils/payment_log_utils.js
  src/utils/payment-urls.js
  src/utils/constants.js
```

Swagger route docs exist under `src/swagger/routes/` (e.g. `v1-payment-router.js.swagger.js`, `v3-bkash-router.js.swagger.js`, `v4-*-router.js.swagger.js`).

---

## Operational notes

1. **Dual Stripe mount** — Webhook should hit `/api/v4/send-webhook-stripe/stripe-webhook` for raw body parsing. The `/api/v4/stripe` mount may break signature verification if JSON middleware alters the body.
2. **BL DCB split** — Init on v1; callback on v4 mybl `/payment-callback`.
3. **`store_log`** is the shared one-time purchase ledger across modern gateways.
4. **Rent fulfillment** writes `audiobooks_rent`; rent catalog browse is `/api/v4/rent` (see [rent.md](./rent.md)).
5. **bKash timezone** — MC/app create paths use `Asia/Dhaka` calendar dates; see [bkash-subscription-start-date.md](./bkash-subscription-start-date.md).
6. **Package IDs** live in DB (`subscription_packages`) and inline gateway mappings — not in `constants.js`.
7. **Robi renewal cron** runs at 4:30 PM and 11:30 PM server time daily; confirm timezone alignment with production scheduler for GP HTTP crons.

---

## Out of scope

- Rent catalog discovery (`/api/v4/rent/*`) — see [rent.md](./rent.md)
- Agent manual subscription grants (`/api/v4/agent/*`)
- Publisher analytics beyond `/payment-history` and `/cronjob/monthly-revenue`
- Home cache crons (`/api/v4/home/cronjob/mybl`) — cache rebuild, not payment processing
- Session analytics crons (`/api/v4/session/cronjob/*`)
