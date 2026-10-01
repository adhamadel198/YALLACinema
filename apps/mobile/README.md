# YALLA Cinema mobile app

React Native app built with [Expo](https://expo.dev) (SDK 57) and Expo Router. Runs on iOS, Android and web from one codebase.

```bash
cd apps/mobile
npm install
npm start          # scan the QR code with Expo Go, or press a / i / w
npm run typecheck
```

Start the API first (`apps/api`, port 4000). The app finds it at the address of the machine running `npm start`, so Expo Go on a phone on the same Wi-Fi works without config. To point elsewhere, set `EXPO_PUBLIC_API_URL`, e.g. `EXPO_PUBLIC_API_URL=https://api.example.com npm start`.

## Screens

| Route | File | Status |
|---|---|---|
| Movies tab (discovery) | `src/app/(tabs)/index.tsx` | Live from `GET /v1/movies` |
| Movie details + seat search | `src/app/movie/[id].tsx` | Live from `GET /v1/movies/:id` and `/showtimes` |
| Tickets tab | `src/app/(tabs)/tickets.tsx` | Placeholder |
| Profile tab | `src/app/(tabs)/account.tsx` | Placeholder |

Still to migrate from the web prototype: seat map, checkout, ticket, resale, support. The cinema operator portal is not started; a reasonable default is to build it as web-only routes in this same app (Expo web).

Use `npx expo install <pkg>` to add dependencies so versions match the Expo SDK.
