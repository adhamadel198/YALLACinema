# YALLA Cinema

> **Development is moving to React Native + Node.js.** New work happens in [`apps/mobile`](apps/mobile) (Expo app) and [`apps/api`](apps/api) (Fastify API), and Vercel now deploys that app and API (see [Deploy on Vercel](#deploy-on-vercel)). The static HTML pages below stay in the repository as the reference prototype only.

## Run the new stack

```bash
# terminal 1: API on http://localhost:4000
cd apps/api && npm install && npm run dev

# terminal 2: app (Expo Go on your phone, or press w for web)
cd apps/mobile && npm install && npm start
```

| Area | Stack | Why |
|---|---|---|
| App | Expo (managed) + Expo Router, TypeScript | One codebase for iOS, Android and web; Expo Go runs it on a phone with no Xcode/Android Studio; native modules (payments, camera for scanning) are still available through development builds |
| API | Node.js + Fastify, TypeScript via `tsx` | JSON-schema validation on every route, fast, and simple to test with `app.inject` |
| Data | Postgres (embedded PGlite in development) for accounts, holds, bookings, tickets, resale and staff corrections; listings are seed data from this prototype | No database server to install for local work; production points `DATABASE_URL` at Postgres. Listings will come from the cinema integrations |

CI (`.github/workflows/ci.yml`) runs the API tests and typecheck, typechecks and bundles the app for web and Android, and runs the Vercel build, on every PR.

What works end to end today: movie discovery, the movie-first seat-group search (exact connected/separated matching) with a "Use my location" distance sort, a seat map with free seat choice, seat holds, guest or signed-in checkout, QR tickets, accounts with booking history, the resale marketplace, a help and support page, and the cinema staff portal at `/operator`. Payment and the cinema integration (confirmation, resale transfer) are sandboxed, resale payouts are recorded but not paid, and no emails are sent yet. The web pilot ships from the same Expo app. See each app's README for detail.

## Web prototype

A responsive, multi-page website prototype for the Cairo and Giza cinema discovery and booking pilot described in `BRD.md`.

## Preview

Open `index.html` directly in a browser. No build step or package installation is required. These pages are no longer deployed.

## Pages

- `index.html` — movie discovery, search, filters, and featured showtimes
- `search.html` — exact seat-arrangement search, area/cinema/time filters, and distance sorting
- `movie.html` — movie details and cinema/showtime selection
- `seats.html` — matched seat-group map, alternate groups, availability refresh, and booking fee summary
- `checkout.html` — guest details and payment-method preview
- `ticket.html` — booking confirmation and sample scannable ticket
- `account.html` — sign-in/account preview
- `resale.html` — resale marketplace, eligible-ticket listing flow, buyer fees, transfer and expiry previews
- `support.html` — FAQs and cinema policy information
- `operator.html` — cinema operator portal preview

The booking flow is a front-end prototype. It does not connect to cinema inventory, payment processing, email delivery, or a real ticket validation service. Film, cinema, and operator data are illustrative.

## Deploy on Vercel

The Vercel project builds from the repository root using `vercel.json`, so no dashboard settings are needed:

- `scripts/vercel-build.sh` exports the Expo app as a website and bundles the API into one Vercel function, written in Vercel's [Build Output API](https://vercel.com/docs/build-output-api) format.
- `/v1/*` and `/health` go to the API; every other path serves the app, so links like `/movie/the-last-light` open directly.
- The website calls the API on its own address. A phone build points at it with `EXPO_PUBLIC_API_URL=https://<your-domain>`.

**Database:** without `DATABASE_URL` the deployed API keeps accounts, holds and bookings in memory, and they disappear whenever Vercel starts a new instance. That is fine for trying a preview but not for real bookings. Such a deployment also has demo cinema staff accounts with a public password (listed in [`apps/api/README.md`](apps/api/README.md#operator-portal)), so anyone can sign in to its operator portal and change its listings. Add a Postgres database to the Vercel project (Storage tab, for example Neon); it sets `DATABASE_URL`, and the next deployment uses it. The API creates its tables on start.

Pull requests get preview deployments; the production site updates when a change is merged to `main`.
