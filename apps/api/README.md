# YALLA Cinema API

Node.js backend for the YALLA Cinema app, built with [Fastify](https://fastify.dev) and TypeScript (run directly with `tsx`, no build step).

```bash
cd apps/api
npm install
npm run dev        # http://localhost:4000, restarts on save
npm test           # domain + HTTP tests (node:test)
npm run typecheck
```

`PORT` overrides the port. The server listens on `0.0.0.0` so a phone on the same Wi-Fi can reach it.

## Layout

```
src/
  server.ts          entry point
  app.ts             builds the Fastify app (used by tests via app.inject)
  domain/            pure business rules: seat-group matching, fees, shared types
  data/seed.ts       sample movies/cinemas/showtimes from the web prototype
  data/store.ts      in-memory store: holds, bookings (stand-in for Postgres)
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
| Real (in memory) | `POST /v1/holds` `{showtimeId, seats}` | 7.2 | Rechecks and holds exact seats for 10 minutes; `409` with the lost seats if any are gone |
| Real (in memory) | `GET /v1/holds/:id` | 7.2, 9 | Checkout summary: seats, price breakdown, expiry, cinema cancellation policy. `410` once expired |
| Real (in memory) | `DELETE /v1/holds/:id` | 7.2 | Release, e.g. when the customer cancels checkout |
| Real | `GET /v1/showtimes/:id` | | Movie, cinema and price for one showtime |
| Real, sandbox payment | `POST /v1/bookings` `{holdId, guest:{name,email,mobile}, paymentMethod, acceptPolicy}` | 6, 7.2–7.4 | Charges, asks the cinema to confirm, then issues one QR ticket per seat. Payment failure releases the hold (`402`); confirmation failure refunds and releases (`409`); expired hold `410` |
| Real (in memory) | `GET /v1/bookings/:id` | 6 | Booking with tickets. The UUID is the guest's access key until accounts exist |
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

Data lives in memory, so restarting the API clears holds and bookings.
