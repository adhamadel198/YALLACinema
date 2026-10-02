# YALLA Cinema mobile app

React Native app built with [Expo](https://expo.dev) (SDK 57) and Expo Router. Runs on iOS, Android and web from one codebase.

```bash
cd apps/mobile
npm install
npm start          # scan the QR code with Expo Go, or press a / i / w
npm run typecheck
```

Start the API first (`apps/api`, port 4000). The app finds it at the address of the machine running `npm start`, so Expo Go on a phone on the same Wi-Fi works without config. To point elsewhere, set `EXPO_PUBLIC_API_URL`, e.g. `EXPO_PUBLIC_API_URL=https://api.example.com npm start`. A web build (`npx expo export --platform web`, as Vercel runs it) calls the API on the site's own address.

## Screens

| Route | File | Status |
|---|---|---|
| Movies tab (discovery) | `src/app/(tabs)/index.tsx` | Live from `GET /v1/movies` |
| Movie details + seat search | `src/app/movie/[id].tsx` | Live: seat count and arrangement, filters for area, cinema and time, and sorting by soonest or by distance from the device ("Use my location") or a chosen area, with each cinema's distance on the results |
| Seat map | `src/app/showtime/[id].tsx` | Live: best matching group picked to start; tap any free seats, together or scattered, up to the requested count, drop or clear them, or pick another matching group; holds via `POST /v1/holds` |
| Checkout | `src/app/checkout/[holdId].tsx` | Live: guest details (filled in from the account when signed in), card/wallet choice, cinema policy, hold countdown; payment is simulated |
| Ticket | `src/app/ticket/[id].tsx` | Live: one QR code per seat; a notice when the cinema changed or cancelled the show; resale status, with a Sell button for the owner; "Need help?" link to support |
| Tickets tab | `src/app/(tabs)/tickets.tsx` | Live: bookings made on this device (ids kept in AsyncStorage), plus the account's bookings when signed in, newest first |
| Profile tab | `src/app/(tabs)/account.tsx` | Live: sign in or create an account; signed in, name, email, mobile and sign out; language; links to help and the staff portal |
| Sign in / Create account | `src/app/sign-in.tsx`, `src/app/sign-up.tsx` | Live: email and password. `?next=/path` returns there afterwards (use `signInHref()` from `src/auth/routes.ts`). After sign-in or sign-up, this device's guest bookings are claimed for the account |
| Resale tab | `src/app/(tabs)/resale.tsx` | Live: open listings with price + 5 EGP fee; browsing needs no account |
| Buy resale tickets | `src/app/resale/[id].tsx` | Live: choose seats, see the total, pay (simulated) |
| Sell tickets | `src/app/resale/sell/[bookingId].tsx` | Live: payout details (wallet or bank), seats, price up to what was paid; shows what the buyer pays and the seller receives |
| My listings | `src/app/resale/mine.tsx` | Live: each listing's status and tickets, pending payout, withdraw |
| Help and support | `src/app/support.tsx` | Live: FAQs and each cinema's cancellation policy from `GET /v1/cinemas`. Opened from a ticket (`?ref=&cinema=`), it shows the booking reference and that cinema's policy first. Contact channels and hours are a marked placeholder until decided |
| Cinema staff portal | `src/app/operator/index.tsx` | Live: staff sign-in (demo accounts listed when the API runs on the embedded database), bookings by day and show with totals, search by reference; two columns from 900 px wide |
| Correct a listing | `src/app/operator/showtime/[id].tsx` | Live: time, format and price; cancel or reinstate; affected bookings and change history |

Every page of the web prototype now has a screen here.

## Arabic and right-to-left

- UI copy lives in `src/i18n/strings.ts` (English and Egyptian Arabic). Add a key to `en` and TypeScript will require it in `ar`.
- The language is switched from the header button or the Profile tab, remembered on the device, and defaults to the device language.
- Every API call sends `Accept-Language`, and the API returns movie and cinema listings in that language. Film titles and cinema brand names stay as published.
- The layout flips immediately through a root `direction` style and React Navigation's `LocaleDirContext`. On iOS and Android the app also sets `I18nManager.forceRTL`, which completes the switch for native pieces after the next app start.
- The seat map always keeps the hall's physical layout (seat 1 on the left when facing the screen).
- Arabic text never gets letter spacing, because it breaks the joined letters. Operator portal lines that mix Latin and Arabic parts are joined with `joinLine` (`src/components/operator/parts.tsx`), which puts a right-to-left mark before each part.

## Location

Location is requested only when the customer taps "Use my location" (Filters, Sort by Nearest). Web uses `navigator.geolocation`, which needs HTTPS or localhost; iOS and Android use expo-location's foreground permission, with the prompt text in `app.json`. The code is in `src/location/` (`locate.ts` for iOS and Android, `locate.web.ts` for web). Denied, unavailable or no fix within 15 seconds shows a message with Try again and falls back to picking an area (plus Open Settings on iOS and Android). The sort choice lasts for the session (in memory, plus sessionStorage on the web). Coordinates stay in memory only, rounded to about 100 m, and a remembered choice is looked up again only when permission is already granted.

## App icon and splash

The app icon, Android adaptive icon layers, splash image and web favicon in `assets/` are generated from the brand logo (`assets/yalla-cinema-logo-transparent.png` at the repository root). After changing the logo, run `python3 apps/mobile/scripts/make-app-icons.py` (needs Pillow) and commit the images. `app.json` sets the splash (logo 180 wide on `#11100e`, the same in light and dark mode) and the adaptive icon background `#11100e`. Keep `imageWidth` at 189 or less so the logo fits the circle Android 12 and later crop the splash icon to. Expo Go shows its own icon and splash; use a development build to see these.

Use `npx expo install <pkg>` to add dependencies so versions match the Expo SDK.
