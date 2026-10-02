# YALLA Cinema API

Node.js backend for the YALLA Cinema app, built with [Fastify](https://fastify.dev) and TypeScript (run directly with `tsx`; bundled with esbuild only for Vercel).

```bash
cd apps/api
npm install
npm run dev        # http://localhost:4000, restarts on save
npm test           # domain + HTTP tests (node:test)
npm run typecheck
```

`PORT` overrides the port. Send `Accept-Language: ar` to get movie and cinema listings in Arabic (`src/data/i18n.ts`). The server listens on `0.0.0.0` so a phone on the same Wi-Fi can reach it.

## Layout

```
src/
  server.ts          entry point
  vercel.ts          Vercel function entry (bundled by scripts/bundle-vercel.mjs)
  app.ts             builds the Fastify app (used by tests via app.inject)
  create-operator.ts npm run create-operator: adds a cinema staff account on Postgres
  domain/            pure business rules: seat-group matching, fees, limits, shared types
  data/seed.ts       sample movies/cinemas/showtimes from the web prototype
  data/store.ts      listings from seed data with staff corrections applied; holds, bookings and tickets in the database
  data/accounts.ts   accounts, sessions and booking history
  data/resale.ts     resale listings, sales and payout details
  data/operator.ts   staff corrections, show changes, the staff view of bookings, demo staff accounts
  auth.ts            who is signed in (Authorization: Bearer <session token>) and route guards
  db/                database connection (Postgres or embedded PGlite) and schema/, applied in name order when it changes
  integrations/      payment provider and cinema integration interfaces, with sandbox versions that always succeed
  routes/            HTTP endpoints
```

## Endpoints

| Status | Method & path | BRD | Notes |
|---|---|---|---|
| Real | `GET /health` | | |
| Real | `GET /v1/movies?genre&q` | 7.1 | Discovery list, with showtime count and lowest price |
| Real | `GET /v1/movies/:id` | 7.1 | |
| Real | `GET /v1/cinemas` | 7.1, 9 | Each cinema includes its `cancellationPolicy` in the request language; the support page lists them |
| Real | `GET /v1/movies/:id/showtimes?count&arrangement&area&cinemaId&from&to&sort&nearArea&lat&lon` | 7.1 | Returns only showtimes with an exact seat match. `arrangement` = `connected` \| `separated` \| `either`; `sort` = `soonest` \| `distance`. `lat`/`lon` is the device location: both or neither, in range, else `400`; it wins over `nearArea`. With either, each result has `distanceKm` (straight line, to 0.1 km); without, `sort=distance` falls back to soonest. Request logs show `lat=~&lon=~` |
| Real | `GET /v1/showtimes/:id/seats?count&arrangement` | 7.1 | Seat map with `aisles` (seat numbers with a walkway after them), every qualifying group and the highlighted best group |
| Real | `POST /v1/holds` `{showtimeId, seats}` | 7.2 | Rechecks and holds exact seats for 10 minutes. Any seats on the map, together or scattered: `400` with `unknown` for seat ids not on that showtime's map, `409` with the lost seats if any are gone. One hold per customer: a new hold releases their previous one. Rate limited (30 per 10 minutes, `429`) |
| Real | `GET /v1/holds/:id` | 7.2, 9 | Checkout summary: seats, price breakdown, expiry, cinema cancellation policy. `410` once expired |
| Real | `DELETE /v1/holds/:id` | 7.2 | Release, e.g. when the customer cancels checkout |
| Real | `GET /v1/showtimes/:id` | | Movie, cinema and price for one showtime |
| Real, sandbox payment | `POST /v1/bookings` `{holdId, guest:{name,email,mobile}, paymentMethod, acceptPolicy}` | 6, 7.2–7.4 | Charges, asks the cinema to confirm, then issues one QR ticket per seat. Payment failure releases the hold (`402`); confirmation failure refunds and releases (`409`); expired hold `410` |
| Real | `GET /v1/bookings/:id` | 6, 9 | Booking with tickets. The UUID is the access key for guests; `accountId` is set when it was booked while signed in. `showChange` is `null`, or `{kind:'cancelled', at}` or `{kind:'changed', at, startsAt, localTime, format, changed}` when cinema staff changed or cancelled the show after the sale |
| Real | `POST /v1/auth/sign-up` `{name, email, mobile, password}`, `POST /v1/auth/sign-in` `{email, password}` | 7.3 | Returns `{token, account}`; send `Authorization: Bearer <token>`. `409` if the email is already registered, `401` for a wrong email or password. Passwords are hashed with scrypt; sessions last 30 days and only their hash is stored. Rate limited per client address (10 per 10 minutes). After 10 failed sign-ins for one email within 15 minutes, sign-in for that email answers `429` until the window passes (see Abuse limits) |
| Real | `POST /v1/auth/sign-out`, `GET /v1/me` | 7.3 | Bookings made while signed in are linked to the account |
| Real | `GET /v1/me/bookings` | 5.1 | The account's bookings, newest first, each shaped like `GET /v1/bookings/:id` |
| Real | `POST /v1/me/bookings/claim` `{ids}` | 5.1, 7.3 | Links up to 100 guest bookings that have no account yet to the signed-in account, if they were made with the account's email (ignoring case). A booking id opens its tickets but can be shared, so it is not proof on its own. Bookings that already belong to an account are never moved. Returns `{claimed}`; the others stay guest bookings. Rate limited (30 per 10 minutes) |
| Real | `GET /v1/resale/listings`, `GET /v1/resale/listings/:id` | 11 | Open listings, soonest show first, with only the tickets still for sale; no account needed. `mine` marks the viewer's own. `410` once closed |
| Real | `GET /v1/resale/my-listings` | 11 | The seller's listings: each ticket's outcome, what they receive per ticket, pending payout |
| Real, unverified | `GET/POST /v1/resale/payout-method` `{kind:'wallet', mobile}` \| `{kind:'bank', bankName, accountName, accountNumber}` | 11 | Needed before listing. Stored as `unverified-sandbox` until a verification provider is chosen; returned masked |
| Real, sandbox cinema | `POST /v1/resale/listings` `{bookingId, ticketIds, price}` | 11 | Valid tickets from a booking the account owns, at most the price paid per ticket excluding fees (`400 price-cap`), before the show starts. The cinema checks eligibility first. Otherwise `409` with `code`: `payout-required`, `ineligible`, `show-started`, `show-cancelled` or `cinema-ineligible` |
| Real | `DELETE /v1/resale/listings/:id` | 11 | Withdraws the unsold tickets; they are valid again at once |
| Real, sandbox payment and cinema | `POST /v1/resale/listings/:id/purchase` `{ticketIds, paymentMethod}` | 11 | Price + 5 EGP per ticket. The cinema swaps the seller's tickets for replacements in a new booking for the buyer; the seller's payout, max(0, price - 20) per ticket, is recorded as pending. `409 unavailable` (another buyer got them; not charged), `409 transfer-failed` / `show-cancelled` / `purchase-cancelled` (charged, then refunded), `502 refund-failed` (the refund failed; support refunds by hand), `402` payment failed, `410` closed |
| Real | `GET /v1/operator/bookings?day=YYYY-MM-DD` | 7.5 | Cinema staff only (`401` signed out, `403` not staff). Their cinema's shows on a day (today by default) with bookings (reference, holder name, seats, ticket statuses, amounts, `resale` for a resale purchase; no contact details), totals, and the days that have bookings. A resold seat counts once in tickets and seats left (the seller's ticket is `transferred`), and ticket revenue is what the cinema was paid, so a resale purchase adds none: that money goes to the seller and YALLA. `fees` are the booking fees customers paid, resale purchases included |
| Real | `GET /v1/operator/bookings/:reference` | 7.5 | Finds a booking by reference, with or without `YL-`; `404` if there is none or it is another cinema's (the same answer, so other cinemas' references stay private) |
| Real | `GET /v1/operator/showtimes/:id` | 7.5, 9 | One of today's shows: its bookings, and every change with the bookings it affected |
| Real | `PATCH /v1/operator/showtimes/:id` `{price?, format?, time?, cancelled?}` | 7.5, 9 | Corrects one of today's listings: price in whole EGP (1 to 5000), format (Standard, Premium, IMAX, Dolby Atmos, 3D, 4DX), start time `HH:MM` on the same day, `cancelled: true` to cancel or `false` to reinstate. `403` for another cinema's show, `404` if not in today's listings |
| Embedded database only | `GET /v1/operator/demo-accounts` | 7.5 | Demo staff emails and their password; `404` on Postgres |

## Resale

Listings close when the show starts. Like hold expiry, this is checked lazily, before requests to `/v1/bookings`, `/v1/resale` and `/v1/me`. Unsold tickets from a closed listing stay `pending-reactivation` until the cinema confirms they work again. Asking the cinema runs in the background (one run at a time, 10 s per call), so a slow cinema never holds up a request; a failed confirmation is retried at most once a minute and logged for support.

Once the cinema may have transferred a seller's tickets, they are never made valid again by the API. If the cinema refuses a transfer, the buyer is refunded and the seller's tickets stay valid. If it doesn't answer, or the sale can't be recorded (tried twice), the buyer is refunded, the sale is `needs-reconciliation` and the seller's tickets become `under-review` (unusable and off sale) until support settles them with the cinema; this is logged at error level. A refund that fails leaves the sale `refund-failed` with its payment reference, logged for support. A purchase still unfinished after 10 minutes (for example, the server stopped mid-purchase) puts its tickets back on sale if the cinema hadn't been asked yet, or blocks them for support if it had, and logs its reference.

Resale follows staff corrections. Tickets for a show the cinema cancelled can't be listed (`409 show-cancelled`), and listings for it leave the marketplace and can't be bought (`410`); the seller can still withdraw them. A moved show is listed and sold at its new time and format, and its open listings close at the new start. A purchase takes turns with a correction to its show (both lock the show's `showtime_overrides` row): if staff cancel the show while the buyer pays, the buyer is refunded and the cinema isn't asked; if they cancel it after the cinema swapped the tickets, the buyer is refunded and the seller's tickets are held for support as above; if they move it or change its format, the buyer's booking is recorded against the change, so the buyer is told like everyone else. `integrations/cinema.ts` has optional `resale` methods (`checkEligibility`, `transfer`, `reactivate`); the sandbox approves everything. Seller payouts are recorded, not paid.

## Operator portal

Staff accounts are accounts with role `operator` and a `cinema_id`, and they see only their own cinema. On the embedded database the API creates one demo staff account per cinema at start-up: `vox-moe@staff.yalla.demo`, `reel-cfc@staff.yalla.demo` and `galaxy-maadi@staff.yalla.demo`, password `yalla-staff-demo`. These accounts and their public password exist on every embedded database, including a Vercel deployment without `DATABASE_URL`, where anyone can use them to change that deployment's listings. On Postgres nothing is seeded; create staff with:

```bash
DATABASE_URL=postgres://… npm run create-operator -- --cinema vox-moe --email manager@vox.example --name "Duty manager" [--mobile "+20 …"]
```

It prints a generated password once; set `OPERATOR_PASSWORD` (12 characters or more) to choose one.

Corrections are stored in `showtime_overrides` and applied over the cinema's listings wherever customers see them: listings, search, seat maps, holds and new bookings. Every `/v1` request reloads them from the database, so several API instances agree. A cancelled show leaves the listings and returns `404` to customers. Any change releases holds in progress for that show; bookings keep what was sold. Only today's listings can be corrected, because the seed data lists one day.

Every change is recorded in `showtime_changes`. The bookings it affects (a time or format change, a cancellation or a reinstatement, but not a price change) go in `showtime_change_bookings`, and their tickets show the change (`showChange`). `notified_at` stays empty until customer notifications exist. To find customers still to contact:

```sql
SELECT b.reference, b.holder FROM showtime_change_bookings cb JOIN bookings b ON b.id = cb.booking_id WHERE cb.notified_at IS NULL;
```

## Data model

Accounts, holds, bookings, resale and staff corrections are tables in `src/db/schema/`. Cinemas, auditoriums and showtimes are still seed data, typed in `domain/types.ts`:

- **Cinema** → **Auditorium** (seat map with stable seat ids and aisles) → **Showtime** (movie, start, price, format)
- **Hold**: showtime, seats, expiry; a cinema-side hold reference once integrations exist
- **Booking**: holder (name/email/mobile), account if booked while signed in, showtime as sold, tickets, price breakdown (ticket price + 5 EGP fee per ticket), payment reference, cinema confirmation
- **Ticket**: booking, seat, QR payload, status (`valid` / `listed` / `pending-reactivation` / `transferred` / `used` / `under-review`)
- **Account**: email, name, mobile, password hash, role (`customer` or `operator`), cinema for staff; **Session**: token hash, expiry; **sign-in attempt**: email and time of a failed sign-in, kept 15 minutes
- **ResaleListing**: seller, booking, tickets, price (≤ amount paid), status; **ResaleSale**: buyer, reference, totals, payout status, buyer's booking; **payout method** per seller
- **Showtime override** (a staff correction), **showtime change** (before and after) and the bookings each change affects

Each pilot cinema will plug in behind `integrations/cinema.ts` (today it confirms bookings and handles resale checks and transfers; listings, availability and holds still come from `data/store.ts`). The real payment provider replaces `sandboxPayments` in `integrations/payments.ts`; card and wallet details go on the provider's hosted page, never through this API. Ticket emails and show-change notices are not sent yet (no email provider chosen).

## Database

Accounts, holds, bookings, tickets, resale and staff corrections are stored in Postgres. The schema is the SQL files in `src/db/schema/`. At start the API looks up a hash of those files in `schema_versions`: if exactly these files were applied before, it runs nothing, so a usual start takes no locks on the tables. Otherwise it runs every file in name order and records the hash, in one transaction, so each statement must be safe to run again (`IF NOT EXISTS`). Add a new numbered file for each change; it is applied at the next start. On Postgres, instances starting together take turns (an advisory lock), and a start that waits more than 5 seconds for a lock fails rather than queue behind purchases in progress; the Vercel entry tries again on the next request. The connection pool keeps at most 3 connections per instance and gives up connecting after 5 seconds, so an unreachable database fails a start instead of hanging it.

- **Development and tests:** no setup. Without `DATABASE_URL` the API uses [PGlite](https://pglite.dev), an embedded Postgres, storing data in `apps/api/.data/pglite` (override with `PGLITE_DIR`). Delete that folder to start fresh. Tests use an in-memory database.
- **Production:** set `DATABASE_URL=postgres://…` (on Vercel, `POSTGRES_URL` also works). This path uses the same SQL but has not been run against a hosted Postgres yet.
- **Vercel:** the API runs as one function (`src/vercel.ts`, see the root README). Without a database URL it uses an in-memory database that resets whenever Vercel starts a new instance.

A unique key on `(showtime, seat)` in `held_seats`, and a unique index on `(showtime, seat)` among tickets that are not `transferred` (a resale replacement takes over its seat), are what guarantee two customers can never hold or buy the same seat, even when requests arrive at the same moment.

## Abuse limits

There is no sign-in for booking, so the app sends a random per-install id in `X-Client-Id` (the IP address is used when it is missing). Each id gets one active hold at a time, and holds and bookings are rate limited per id. Booking claims, payout details, new resale listings and resale purchases are rate limited the same way. Sign-up and sign-in are limited per client address instead (IPv6 per /64), because a client can send a new id with every request. These limits are counted by each API instance separately, so sign-in also counts failures per email in the database (`sign_in_attempts`), which holds across instances: after 10 failures for one email within 15 minutes, that email gets `429` with `Retry-After`, from any address and even with the right password, until the window passes. Emails without an account are counted the same way, so the lock doesn't reveal which emails exist. The lock is per email, so someone guessing can keep a customer out for up to 15 minutes at a time. A booking (and so a hold) has at most 10 seats (`src/domain/limits.ts`); requests above that get `400`. Behind a load balancer, set `TRUST_PROXY=1` so limits see the real client address (the Vercel entry always trusts Vercel's proxy).
