# Cinema Discovery and Booking Platform

## Business Requirements Document

**Version:** 0.2 — Discovery draft with booking size limit  
**Status:** Draft; business and operational decisions remain open  
**Market:** Egypt  
**Working product name:** TBD

## 1. Executive summary

The proposed platform brings cinema listings and ticket booking into one place. Moviegoers can find a film, compare participating cinemas and showtimes, check live seat availability, select seats, pay online, and receive a scannable ticket. The initial pilot is planned for 3–5 cinemas in Cairo and Giza.

The pilot will include cinemas that can integrate with the platform to provide live seat availability and confirm bookings. Cinemas that cannot meet this requirement are outside the ticket-selling pilot scope.

## 2. Business need and opportunity

Moviegoers currently need to browse cinema platforms individually to find films, showtimes, and available seats. Some cinemas do not have an online platform. This creates a fragmented discovery and booking experience and makes it harder for customers to compare options.

The platform aims to provide a shared discovery and booking experience while giving cinemas a way to publish listings, sell tickets, reach nearby audiences, and promote weaker-performing movies.

## 3. Business objectives and success measures

The pilot will be reviewed after three months. It will track:

- Completed paid bookings, with a target to be set per cinema per month.
- Participating cinemas and available showtimes.
- Customer repeat bookings and satisfaction.

Numerical targets and measurement methods are open decisions.

## 4. Scope

### 4.1 Initial pilot scope

- Responsive website for Cairo and Giza.
- Arabic and English language support.
- Pilot participation for 3–5 cinemas.
- Movie-first discovery: customers choose a movie and see cinemas and showtimes.
- Search by requested ticket quantity and seat arrangement; return only showtimes with live availability that meets the request.
- Live showtimes, seat availability, ticket prices, seat reservation, and booking confirmation through cinema integrations.
- Guest and account-based booking.
- Seat selection and multi-ticket orders of up to 10 seats, subject to the seats available and cinema rules.
- Online payment by bank card and supported local digital wallets.
- Cinema operator portal to view bookings and correct listings.
- Ticket resale marketplace, with the rules captured in section 11.
- Scannable ticket in the website and by email.
- Platform first-line customer support.
- Fixed customer platform fee of 5 EGP per ticket.

### 4.2 Out of scope for the initial pilot

- Cinemas without an integration that provides live availability and confirms bookings.
- Mobile applications; these are planned after the website pilot.
- Paid user subscriptions and early-access booking benefits; these are planned for later phases.

## 5. Users and stakeholders

### 5.1 Moviegoers

Visitors can browse without an account. Customers can book either as guests or as signed-in account holders. Guest checkout collects name, email address, and mobile number. An account may support booking history and saved details, but an account is not required to book.

### 5.2 Cinema staff

Cinema staff provide and maintain accurate listings through integrated systems and use the operator portal to view bookings and correct listings. Participating cinemas must support live availability and booking confirmation through an integration.

### 5.3 Platform operations and support

Platform staff manage cinema onboarding, customer support, booking issue coordination, payment and settlement operations, and promotional services.

## 6. Customer booking journey

1. Customer browses or searches for a movie without needing to sign in.
2. Customer selects a movie and sees relevant cinemas and showtimes, including location and live seat availability.
3. Customer selects a showtime and available seats.
4. Platform rechecks availability and reserves the selected seats before payment.
5. Customer reviews the cinema ticket price, 5 EGP platform fee per ticket, and total amount before payment.
6. Customer signs in or continues as a guest. Guest checkout captures name, email, and mobile number.
7. Customer pays by bank card or a supported local digital wallet.
8. Platform receives payment and cinema confirmation.
9. Platform issues a scannable ticket in the website and sends it by email.

A booking is considered successful when payment is captured and the cinema confirms the tickets.

## 7. Functional requirements

### 7.1 Discovery and listings

- The platform shall allow browsing without an account.
- Customers shall be able to discover showtimes by choosing a movie first.
- Results shall show participating cinemas, showtimes, location, ticket prices, and live seat availability.
- Customers shall be able to filter results by cinema, area, and showtime range.
- Qualifying showtimes shall be sortable by soonest showtime and distance from the customer's selected or shared location; customers shall be able to choose the sort order.
- Distance sorting shall support optional device location and a manually selected area; location sharing shall be optional.
- After choosing a movie, customers shall be able to enter the number of seats needed and specify whether seats must be connected, separated, or either.
- Search results shall include only cinema/showtime options where the requested number of seats can be selected and held together at that time.
- A showtime qualifies when at least the requested number of matching seats are available; the customer selects exactly the requested number for that booking.
- If there are no exact matches, the platform shall report no matching showtimes and let customers change the requested quantity or arrangement; it shall not silently broaden criteria or present near matches as exact results.
- If matching seats become unavailable before selection, the platform shall refresh availability and present updated matching options.
- Connected seats mean seats immediately next to each other in the same row.
- When separated seats are allowed, results shall label the separated seat groups clearly; they shall only be shown when the customer permits separated seats.
- For searches allowing separated seats, any grouping pattern that totals the requested quantity may qualify (for example, 2+2 for four seats).
- Connected and separated matches shall have equal priority in results when the customer allows either arrangement.
- The seat map shall highlight the seat or seat groups that matched the search request.
- The platform shall highlight a best matching seat group and allow the customer to choose another qualifying group on the seat map.
- Listings shall support Arabic and English.
- Cinema systems are the source for showtime and availability information; cinemas are responsible for correcting listing data.

### 7.2 Seat selection and booking

- Customers shall be able to select seats and book multiple seats in one order, subject to cinema availability and rules.
- The platform shall hold the exact highlighted seats selected by the customer during checkout, subject to the cinema integration's hold capability and timeout rules.
- A booking may include at most 10 seats. Cinema availability and rules may set a lower maximum.
- The platform shall recheck availability and reserve seats before payment.
- Seat holds shall be released if payment fails. Hold duration and timeout handling are open technical decisions.
- The platform shall only offer ticket sales for cinemas that provide live availability and booking confirmation through an integration.
- The platform shall issue a scannable ticket after payment capture and cinema confirmation.

### 7.3 Accounts and guest checkout

- Users may browse without an account.
- Users may book as guests or account holders.
- Guest checkout shall collect name, email address, and mobile number.
- Account registration shall not be mandatory for booking.

### 7.4 Payments and fees

- The platform shall accept bank cards and local digital wallets supported by the selected payment provider.
- The customer shall pay a fixed platform fee of 5 EGP per ticket, on top of the cinema ticket price.
- Checkout shall display the cinema price, per-ticket platform fee, and total before payment.
- The platform collects payment and settles cinema ticket revenue after deducting only the 5 EGP platform fee, as a starting assumption subject to cinema agreements.
- The payment provider, payment-provider charge treatment, settlement timing, reconciliation, and failed/duplicate payment handling remain to be specified.

### 7.5 Cinema operator portal

- Cinema staff shall be able to view bookings.
- Cinema staff shall be able to correct listings.
- Detailed portal roles, permissions, reporting, and listing-edit workflows remain to be defined.

### 7.6 Customer support

- The platform shall handle first-line customer support for booking issues and coordinate with cinemas.
- Support hours, contact channels, response targets, and escalation procedures remain open decisions.

## 8. Cinema integration and operational requirements

Each participating cinema must provide through an integration:

- Current movie and showtime data.
- Live seat availability.
- Ticket prices.
- A mechanism to hold or reserve seats before payment.
- Booking confirmation.

The integration approach, supported cinema system types, API contracts, availability freshness, error handling, and reconciliation procedures require technical discovery with pilot cinemas.

## 9. Cancellation, refunds, and show changes

- The cancellation and refund policy of the relevant cinema applies.
- The applicable policy shall be shown before purchase.
- If a cinema changes or cancels a show after sale, the platform shall notify affected customers, coordinate with the cinema, and follow the applicable refund or rebooking policy.
- Exact notification timing, refund workflow, and responsibility for funding refunds remain to be agreed with cinemas and the payment provider.

## 10. Business model and promotion

### 10.1 Initial launch fees

- Customer-facing platform fee: 5 EGP per ticket.
- Cinema subscriptions are part of the intended revenue direction, with marketing support as value, but whether subscriptions are charged from launch or introduced after the pilot is unresolved.
- The initial subscription price, billing cycle, tiers, and contract terms are unresolved.

### 10.2 Cinema marketing value

Planned cinema subscription benefits include:

- Marketing support for weaker-performing movies.
- Showing/promoting relevant movies first to users in the cinema's location.
- Advertising placements.

Advertising inventory, targeting controls, ranking rules, reporting, and subscription packaging are not yet defined.

### 10.3 Later-phase user subscription

Paid user subscriptions are deferred beyond launch. A proposed future benefit is access to bookings before they open to other users. Pricing, eligibility, early-access window, and participating show rules remain to be defined.

## 11. Current-phase ticket resale

Ticket resale is included in the current development phase. The agreed business rules are:

- A ticket owner may list tickets from a booking individually or select a subset for resale.
- Only tickets originally booked through the platform are eligible for resale.
- A ticket owner must have a platform account to list a ticket for resale.
- The platform/cinema integration shall verify ticket eligibility before publishing a resale listing.
- Sellers must add verified payout details to their account before listing a ticket.
- The resale listing price is capped at the actual amount paid for that ticket, excluding platform fees.
- The buyer pays the resale listing price plus the existing fixed 5 EGP buyer fee.
- The seller receives the resale listing price less a 20 EGP resale fee, floored at zero; the seller shall never owe a negative amount from a resale.
- The 20 EGP seller fee is deducted only after a successful resale transfer.
- A seller may withdraw an unsold listing.
- If a resale listing expires unsold, the listing shall close. The original ticket becomes usable again only after the cinema confirms reactivation; until then it remains blocked and the owner/platform support shall be alerted.
- Scanned or used tickets shall not be eligible for resale.
- When a resale purchase succeeds, the seller's original ticket shall be invalidated and a replacement ticket issued to the buyer.
- The current ticket holder is the party eligible to request a refund under the applicable cinema policy.
- A ticket may be listed until the show starts. If it remains unsold, the listing closes and the ticket returns to the original owner for use, subject to cinema entry rules.
- Seller proceeds are paid after the buyer's payment succeeds and ticket transfer is confirmed.
- If buyer payment succeeds but ticket transfer/replacement fails, the resale shall be cancelled, the buyer shall be refunded automatically, and the seller's original ticket shall remain valid.
- If only some tickets in a multi-ticket listing sell, unsold tickets remain valid for the original owner and may be withdrawn or relisted until showtime.
- If the cinema cancels or changes a show after resale, notify both parties and apply the cinema's policy to the current ticket holder; the platform coordinates the refund or rebooking.
- If the cinema policy allows a refund after resale, the ticket price is refundable but platform fees are non-refundable, subject to applicable cinema, payment-provider, and contractual terms.

Buyer protections, payment-provider support, seller payout method and timing, refund accounting, and cinema integration requirements still need detailed requirements and cinema agreement. The cinema integration must support invalidating the original ticket and validating the replacement ticket. If a resale listing expires unsold, it must not leave both the original owner and a prospective buyer able to use the same ticket.

## 12. Non-functional requirements and quality attributes

The initial product must support Arabic and English, protect customer contact and booking data, provide secure payment handling, and maintain accurate seat availability and booking confirmation. Specific targets are still required for:

- Website response times and supported traffic/booking volume.
- Availability and maintenance windows.
- Integration response time, freshness of seat availability, and recovery behavior.
- Security controls, access management, audit history, and data retention.
- Backup, recovery, and incident response.
- Accessibility and supported browsers/devices.

## 13. Pilot release and review

- Pilot region: Cairo and Giza.
- Pilot cinemas: 3–5, subject to integration readiness.
- Review point: after three months.
- Release format: responsive bilingual website; mobile apps follow after the pilot.
- Pilot measures: completed paid bookings per cinema, number of participating cinemas and available showtimes, repeat booking, and customer satisfaction.
- Numeric targets and the process for gathering customer satisfaction are open.

## 14. Risks, assumptions, and dependencies

### 14.1 Dependencies

- Cinema systems must expose reliable live availability, seat holds, and confirmation.
- A payment provider must support the intended bank card and local wallet methods, collections, refunds, and settlements.
- Cinema agreements must define fees, settlement, refunds, service levels, data responsibilities, and marketing inventory.

### 14.2 Risks to validate

- Cinema integrations may differ or may not support reliable seat holds.
- Availability changes between selection and reservation could prevent a booking; the platform must recheck before payment.
- Cinema cancellation and refund policies may vary.
- Settlement deductions and provider fees need agreement to avoid mismatch between customer charge and cinema payout.
- Location-based promotion and advertising need clear rules so customers understand promoted placement.

### 14.3 Assumptions recorded from discovery

- A 3–5 cinema pilot in Cairo and Giza is a suitable starting scope.
- Only cinemas with live integration and booking confirmation will sell tickets in the pilot.
- Guests can book with contact details; accounts are optional.
- A successful booking requires captured payment and cinema confirmation.
- Cinema ticket revenue is settled after deducting only the 5 EGP platform fee, pending agreement.

## 15. Open decisions for the next BRD pass

1. **Pilot targets:** What number of completed bookings per cinema per month would indicate a promising pilot? If unknown, define a baseline after estimating cinema capacity.
2. **Cinema subscriptions:** Are they charged from launch or introduced after the pilot? What pricing basis, billing cycle, or tiers should apply?
3. **Settlement:** How often should cinemas receive payouts (daily, weekly, or monthly)? Who pays payment-provider charges?
4. **Support:** What support hours, channels, response targets, and escalation rules are required?
5. **Ticket validation:** Will tickets be scanned using each cinema's existing system, or does the platform need to provide a scanning tool?
6. **Reporting:** What customer, booking, settlement, and cinema performance reports are required at launch?
7. **Integration detail:** Which cinema systems and interfaces are available, and what service levels can they meet?
8. **Seat hold behavior:** How long should a seat be held during payment, and what should happen on timeout or delayed payment confirmation?
9. **Cancellation workflow:** What are the notification, refund, and rebooking timelines for each cinema?
10. **Technical quality targets:** What launch targets should apply to performance, availability, security, recovery, accessibility, and browser/device support?
11. **Resale seller payout:** What payout method and timing should apply, and how should payment-provider costs be handled?
12. **Resale ticket transfer:** Which cinema integrations can invalidate original tickets and validate replacements, and what is the recovery process if transfer fails?
13. **Resale show cancellation:** How should any refund be split between buyer, seller, platform fee, and cinema under the cinema's policy?
14. **Seat layout data:** Can pilot cinema integrations provide seat maps and stable seat identifiers needed to verify connected and separated groups?
15. **Seat-search ordering:** The seat arrangement itself will not be prioritized when either arrangement is allowed; how should qualifying showtimes be sorted (for example, by soonest showtime, distance, or price)?
16. **Resale refunds:** How should refunds be split between buyer, seller, platform fee, and cinema when the cinema policy permits a refund after resale?
17. **Distance sorting:** Define the distance calculation and treatment of unavailable or approximate cinema location data.
18. **Resale expiry and recovery:** Define the cinema/API confirmation needed before restoring an unsold ticket to valid status, and the recovery path if that confirmation is unavailable.
19. **Resale fee refunds:** Confirm the non-refundable treatment of platform fees in cinema agreements and payment-provider flows, including any legal or contractual exceptions.

## 16. Revision history

| Version | Date | Notes |
|---|---|---|
| 0.1 | 2026-09-25 | Initial BRD draft from discovery answers; unresolved items captured for follow-up. |
| 0.2 | 2026-10-01 | Bookings capped at 10 seats (sections 4.1 and 7.2). |
