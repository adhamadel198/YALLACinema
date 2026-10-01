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
| Movie details + seat search | `src/app/movie/[id].tsx` | Live: seat count and arrangement, plus filters for area, cinema and time, and sorting by soonest or nearest to a chosen area |
| Seat map | `src/app/showtime/[id].tsx` | Live: best group highlighted, pick another, holds seats via `POST /v1/holds` |
| Checkout | `src/app/checkout/[holdId].tsx` | Live: guest details, card/wallet choice, cinema policy, hold countdown; payment is simulated |
| Ticket | `src/app/ticket/[id].tsx` | Live: one QR code per seat |
| Tickets tab | `src/app/(tabs)/tickets.tsx` | Live: bookings made on this device (ids kept in AsyncStorage) |
| Profile tab | `src/app/(tabs)/account.tsx` | Placeholder |

Still to migrate from the web prototype: accounts, resale and support.

## Arabic and right-to-left

- UI copy lives in `src/i18n/strings.ts` (English and Egyptian Arabic). Add a key to `en` and TypeScript will require it in `ar`.
- The language is switched from the header button or the Profile tab, remembered on the device, and defaults to the device language.
- Every API call sends `Accept-Language`, and the API returns movie and cinema listings in that language. Film titles and cinema brand names stay as published.
- The layout flips immediately through a root `direction` style and React Navigation's `LocaleDirContext`. On iOS and Android the app also sets `I18nManager.forceRTL`, which completes the switch for native pieces after the next app start.
- The seat map always keeps the hall's physical layout (seat 1 on the left when facing the screen).
- Arabic text never gets letter spacing, because it breaks the joined letters. The cinema operator portal is not started; a reasonable default is to build it as web-only routes in this same app (Expo web).

Use `npx expo install <pkg>` to add dependencies so versions match the Expo SDK.
