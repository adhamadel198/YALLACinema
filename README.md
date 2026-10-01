# YALLA Cinema

> **Development is moving to React Native + Node.js.** New work happens in [`apps/mobile`](apps/mobile) (Expo app) and [`apps/api`](apps/api) (Fastify API). The static HTML pages below stay in place as the reference prototype and keep deploying to Vercel until the new app replaces them.

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
| Data | In-memory seed data from this prototype | Placeholder for Postgres and the cinema integrations |

What works end to end today: movie discovery and the movie-first seat-group search (exact connected/separated matching), plus seat holds in the API. Bookings, payments, accounts, resale and the operator portal are stubbed (`501`). See each app's README for detail.

## Web prototype

A responsive, multi-page website prototype for the Cairo and Giza cinema discovery and booking pilot described in `BRD.md`.

## Preview

Open `index.html` directly in a browser, or deploy this folder as a static site. No build step or package installation is required.

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

Import the GitHub repository into Vercel as a static project. Use the repository root as the project root and leave the framework preset and build/output settings empty; `index.html` is the entry point.
