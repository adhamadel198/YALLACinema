// Copy for the restyled checkout, ticket, sign-in and sign-up screens (the live checkout.html, ticket.html and
// account.html). Merged into strings.ts as `t.checkoutUi`. Older keys these screens still use (t.heldFor,
// t.yourDetails, t.acceptPolicy, t.authSignInKicker, …) stay where they are.
// Every English key needs an Egyptian Arabic key: `ar: typeof en` enforces it.

export const en = {
  // Checkout
  eyebrow: 'Almost there',
  lead: 'Continue as a guest or sign in. An account is never required to book.',
  namePlaceholder: 'e.g. Salma Hassan',
  emailPlaceholder: 'you@example.com',
  orderSummary: 'Order summary',
  orderNote: 'Cinema cancellation policy applies. A scannable ticket will be issued after payment and cinema confirmation.',
  paySecurely: (total: string) => `Pay securely · ${total}`,
  heldBadge: (time: string) => `⏱  Seats held for ${time}`,
  expiredTitle: 'Time’s up',
  chooseAgain: 'Choose seats again',
  /** "Today, 7:45 PM" (order summary) and "Today · 7:45 PM" (e-ticket). */
  today: 'Today',
  tomorrow: 'Tomorrow',
  comma: ',',

  // Ticket
  confirmed: '✓\u00a0\u00a0 Booking confirmed',
  ticketLead: 'Your tickets are ready, issued after payment and cinema confirmation.',
  printTicket: 'Print ticket',
  emailNoteBefore: 'Sent to ',
  emailNoteAfter: ' once email delivery is connected.',
  qrLabel: (seat: string) => `Scannable entry code for seat ${seat}`,

  // Sign in and sign up
  signInLead: 'Sign in to see your bookings and save your details. Guest checkout is always available.',
  passwordPlaceholder: 'Your password',
  ticketsKicker: 'Your tickets',
  ticketsTitle: 'Need to pass a ticket on?',
  ticketsBody: 'List eligible, unused YALLA tickets for resale. A signed-in account and payout details are required.',
  ticketsButton: 'Open ticket resale',
  myListings: 'My listings',
};

export const ar: typeof en = {
  eyebrow: 'خلاص قربت',
  lead: 'كمّل كضيف أو سجّل دخول. مش لازم حساب عشان تحجز.',
  namePlaceholder: 'مثلاً: سلمى حسن',
  emailPlaceholder: 'you@example.com',
  orderSummary: 'ملخص الطلب',
  orderNote: 'سياسة الإلغاء بتاعة السينما بتتطبق. هتطلعلك تذكرة بكود بعد الدفع وتأكيد السينما.',
  paySecurely: (total) => `ادفع بأمان · ${total}`,
  heldBadge: (time) => `⏱  الكراسي محجوزة لك لمدة ${time}`,
  expiredTitle: 'الوقت خلص',
  chooseAgain: 'اختار الكراسي تاني',
  today: 'النهارده',
  tomorrow: 'بكرة',
  comma: '،',

  confirmed: '✓\u00a0\u00a0 تم تأكيد الحجز',
  ticketLead: 'تذاكرك جاهزة، طلعت بعد الدفع وتأكيد السينما.',
  printTicket: 'اطبع التذكرة',
  emailNoteBefore: 'هتتبعت لـ ',
  emailNoteAfter: ' أول ما إرسال الإيميل يشتغل.',
  qrLabel: (seat) => `كود الدخول لكرسي ${seat}`,

  signInLead: 'سجّل دخول عشان تشوف حجوزاتك وتحفظ بياناتك. والحجز كضيف متاح دايمًا.',
  passwordPlaceholder: 'كلمة السر بتاعتك',
  ticketsKicker: 'تذاكرك',
  ticketsTitle: 'محتاج تدّي تذكرتك لحد تاني؟',
  ticketsBody: 'اعرض تذاكر YALLA اللي لسه ما استخدمتهاش للبيع. محتاج تكون مسجّل دخول وتضيف بيانات استلام الفلوس.',
  ticketsButton: 'افتح إعادة البيع',
  myListings: 'إعلاناتي',
};
