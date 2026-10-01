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
  domain/            pure business rules: seat-group matching, fees, shared types
  data/seed.ts       sample movies/cinemas/showtimes from the web prototype
  data/store.ts      listings from seed data; holds, bookings and tickets in the database
  db/                database connection (Postgres or embedded PGlite) and schema.sql
  integrations/      payment provider and cinema integration interfaces, with sandbox versions that always succeed
  routes/            HTTP endpoints
```

## Endpoints

| Status | Method & path | BRD | Notes |
|---|---|---|---|
| Real | `GET /health` | | |
| Real | `GET /v1/movies?genre&q` | 7.1 | Discovery list, with showtime count and lowest price |
| Real | `GET /v1/movies/:id` | 7.1 | |
| Real | `GET /v1/cinemas` | 7.1 | |
| Real | `GET /v1/movies/:id/showtimes?count&arrangement&area&cinemaId&from&to&sort&nearArea&lat&lon` | 7.1 | Returns only showtimes with an exact seat match. `arrangement` = `connected` \| `separated` \| `either`; `sort` = `soonest` \| `distance` |
| Real | `GET /v1/showtimes/:id/seats?count&arrangement` | 7.1 | Seat map, every qualifying group and the highlighted best group |
| Real | `POST /v1/holds` `{showtimeId, seats}` | 7.2 | Rechecks and holds exact seats for 10 minutes; `409` with the lost seats if any are gone. One hold per customer: a new hold releases their previous one. Rate limited (30 per 10 minutes, `429`) |
| Real | `GET /v1/holds/:id` | 7.2, 9 | Checkout summary: seats, price breakdown, expiry, cinema cancellation policy. `410` once expired |
| Real | `DELETE /v1/holds/:id` | 7.2 | Release, e.g. when the customer cancels checkout |
| Real | `GET /v1/showtimes/:id` | | Movie, cinema and price for one showtime |
| Real, sandbox payment | `POST /v1/bookings` `{holdId, guest:{name,email,mobile}, paymentMethod, acceptPolicy}` | 6, 7.2–7.4 | Charges, asks the cinema to confirm, then issues one QR ticket per seat. Payment failure releases the hold (`402`); confirmation failure refunds and releases (`409`); expired hold `410` |
| Real | `GET /v1/bookings/:id` | 6 | Booking with tickets. The UUID is the guest's access key until accounts exist |
| Stub (501) | `POST /v1/auth/sign-in`, `GET /v1/me` | 7.3 | |
| Stub (501) | `GET/POST /v1/resale/listings`, `DELETE /v1/resale/listings/:id`, `POST /v1/resale/listings/:id/purchase` | 11 | Fee rules already in `domain/pricing.ts` |
| Stub (501) | `GET /v1/operator/bookings`, `PATCH /v1/operator/showtimes/:id` | 7.5 | |

## Data model (target)

The seed types in `domain/types.ts` are the starting point. When a database is added (Postgres is the suggested default):

- **Cinema** → **Auditorium** (seat map with stable seat ids) → **Showtime** (movie, start, price, format)
- **Hold**: showtime, seats, expiry, cinema-side hold reference
- **Booking**: holder (account or guest name/email/mobile), showtime, tickets, price breakdown (ticket price + 5 EGP fee per ticket), payment status, cinema confirmation
- **Ticket**: booking, seat, QR payload, status (`valid` / `listed` / `pending-reactivation` / `transferred` / `used`)
- **ResaleListing**: seller account, tickets, price (≤ amount paid), status; **ResaleSale**: buyer, payment, replacement ticket, seller payout
- **OperatorUser**: cinema, role

Each pilot cinema will plug in behind `integrations/cinema.ts` (today it only confirms; listings, availability and holds still come from `data/store.ts`). The real payment provider replaces `sandboxPayments` in `integrations/payments.ts`; card and wallet details go on the provider's hosted page, never through this API. Ticket emails are not sent yet (no email provider chosen).

## Database

Holds, bookings and tickets are stored in Postgres; the schema is `src/db/schema.sql` and is applied on start.

- **Development and tests:** no setup. Without `DATABASE_URL` the API uses [PGlite](https://pglite.dev), an embedded Postgres, storing data in `apps/api/.data/pglite` (override with `PGLITE_DIR`). Delete that folder to start fresh. Tests use an in-memory database.
- **Production:** set `DATABASE_URL=postgres://…` (on Vercel, `POSTGRES_URL` also works). This path uses the same SQL but has not been run against a hosted Postgres yet.
- **Vercel:** the API runs as one function (`src/vercel.ts`, see the root README). Without a database URL it uses an in-memory database that resets whenever Vercel starts a new instance.

A unique key on `(showtime, seat)` in `held_seats` and `tickets` is what guarantees two customers can never hold or buy the same seat, even when requests arrive at the same moment.

## Abuse limits

There is no sign-in for booking, so the app sends a random per-install id in `X-Client-Id` (the IP address is used when it is missing). Each id gets one active hold at a time, and holds and bookings are rate limited per id. A booking (and so a hold) has at most 10 seats (`src/domain/limits.ts`); requests above that get `400`. Behind a load balancer, set `TRUST_PROXY=1` so limits see the real client address (the Vercel entry always trusts Vercel's proxy).
