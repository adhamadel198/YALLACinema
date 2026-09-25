# YALLA Cinema

A responsive, multi-page website prototype for the Cairo and Giza cinema discovery and booking pilot described in `BRD.md`.

## Preview

Open `index.html` directly in a browser, or deploy this folder as a static site. No build step or package installation is required.

## Pages

- `index.html` — movie discovery, search, filters, and featured showtimes
- `movie.html` — movie details and cinema/showtime selection
- `seats.html` — seat selection and booking fee summary
- `checkout.html` — guest details and payment-method preview
- `ticket.html` — booking confirmation and sample scannable ticket
- `account.html` — sign-in/account preview
- `support.html` — FAQs and cinema policy information
- `operator.html` — cinema operator portal preview

The booking flow is a front-end prototype. It does not connect to cinema inventory, payment processing, email delivery, or a real ticket validation service. Film, cinema, and operator data are illustrative.

## Deploy on Vercel

Import the GitHub repository into Vercel as a static project. Use the repository root as the project root and leave the framework preset and build/output settings empty; `index.html` is the entry point.
