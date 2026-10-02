/** Fees from BRD sections 4.1, 7.4 and 11. All amounts are EGP. */
export const PLATFORM_FEE_PER_TICKET = 5;
export const RESALE_SELLER_FEE = 20;

export function bookingTotal(ticketPrice: number, quantity: number) {
  const tickets = ticketPrice * quantity;
  const fees = PLATFORM_FEE_PER_TICKET * quantity;
  return { tickets, fees, total: tickets + fees };
}

/** Resale price is capped at what the seller paid for the ticket, excluding platform fees. */
export function resaleQuote(listingPrice: number, originalTicketPrice: number) {
  if (listingPrice > originalTicketPrice) throw new Error('Resale price cannot exceed the original ticket price');
  return {
    buyerPays: listingPrice + PLATFORM_FEE_PER_TICKET,
    sellerReceives: Math.max(0, listingPrice - RESALE_SELLER_FEE),
  };
}
