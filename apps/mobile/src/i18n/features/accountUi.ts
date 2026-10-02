// Copy for the restyled account screens: Profile tab, sign-in and sign-up, Tickets tab, help and support.
// Merged into strings.ts as `t.accountUi` (a namespace, so keys never clash with other features).
// Every English key needs an Egyptian Arabic key: `ar: typeof en` enforces it.

export const en = {
  // Profile tab, signed out: the live account.html sign-in panel.
  signInLead: 'Sign in to see your bookings and save your details. Guest checkout is always available.',
  emailPlaceholder: 'you@example.com',
  passwordPlaceholder: 'Your password',

  // Profile tab, signed in.
  profileKicker: 'Your account',

  // The live "Your tickets" card (account.html#tickets), on the Profile and My Tickets tabs.
  ticketsCardKicker: 'Your tickets',
  ticketsCardTitle: 'Need to pass a ticket on?',
  ticketsCardBody: 'List eligible, unused YALLA tickets for resale. A signed-in account and payout details are required.',
  ticketsCardButton: 'Open ticket resale',
  myListings: 'My listings',

  // Profile tab: links.
  linksLabel: 'More',

  // My Tickets tab.
  ticketsKicker: 'Your tickets',
  ticketsTitle: 'My Tickets',
  ticketsLead: 'Tap a booking to open its QR codes.',
  viewTicket: 'View ticket',
  browseMovies: 'Browse movies',
  historySignInKicker: 'Your account',
  historySignInTitle: 'Booked with your account?',
  historySignInBody: 'Sign in to see those tickets here too.',
  onResale: (n: number) => `${n} on resale`,
  soldOnResale: (n: number) => `${n} sold on resale`,

  // Help & support.
  supportCards: {
    booking: {
      kicker: 'Booking support',
      title: 'Need help with a ticket?',
      body: 'Have your booking reference and email ready. Our team can coordinate booking issues with the cinema.',
    },
    prices: {
      kicker: 'Before you book',
      title: 'Clear prices, no surprises.',
      body: 'The cinema ticket price and 5 EGP platform fee per ticket appear in your order total before you pay.',
      button: 'Browse showtimes',
    },
    partners: {
      kicker: 'Cinema partners',
      title: 'Listing or booking question?',
      body: 'We’ll help coordinate with participating cinemas when a show or booking needs attention.',
      button: 'Open cinema portal',
    },
  },
  supportPoliciesKicker: 'Cancellation and refunds',
};

export const ar: typeof en = {
  signInLead: 'سجّل دخول عشان تشوف حجوزاتك وتحفظ بياناتك. والحجز كضيف متاح دايمًا.',
  emailPlaceholder: 'you@example.com',
  passwordPlaceholder: 'كلمة السر بتاعتك',

  profileKicker: 'حسابك',

  ticketsCardKicker: 'تذاكرك',
  ticketsCardTitle: 'محتاج تدّي تذكرتك لحد تاني؟',
  ticketsCardBody: 'اعرض تذاكر YALLA اللي لسه ما استخدمتهاش للبيع. محتاج تكون مسجّل دخول وتضيف بيانات استلام الفلوس.',
  ticketsCardButton: 'افتح إعادة البيع',
  myListings: 'إعلاناتي',

  linksLabel: 'روابط تانية',

  ticketsKicker: 'تذاكرك',
  ticketsTitle: 'تذاكري',
  ticketsLead: 'دوس على أي حجز عشان تفتح أكواد الـ QR بتاعته.',
  viewTicket: 'افتح التذكرة',
  browseMovies: 'اتفرّج على الأفلام',
  historySignInKicker: 'حسابك',
  historySignInTitle: 'حجزت بحسابك؟',
  historySignInBody: 'سجّل دخول عشان تشوف التذاكر دي هنا كمان.',
  onResale: (n) => (n === 1 ? 'تذكرة معروضة للبيع' : n === 2 ? 'تذكرتين معروضين للبيع' : `${n} تذاكر معروضة للبيع`),
  soldOnResale: (n) => (n === 1 ? 'تذكرة اتباعت' : n === 2 ? 'تذكرتين اتباعوا' : `${n} تذاكر اتباعت`),

  supportCards: {
    booking: {
      kicker: 'دعم الحجز',
      title: 'محتاج مساعدة في تذكرة؟',
      body: 'خلّي رقم الحجز والإيميل جاهزين. فريقنا بيتابع مشاكل الحجز مع السينما.',
    },
    prices: {
      kicker: 'قبل ما تحجز',
      title: 'أسعار واضحة، من غير مفاجآت.',
      body: 'سعر تذكرة السينما ورسوم المنصة ٥ جنيه للتذكرة بيظهروا في إجمالي طلبك قبل ما تدفع.',
      button: 'شوف مواعيد العرض',
    },
    partners: {
      kicker: 'شركاؤنا من السينمات',
      title: 'سؤال عن عرض أو حجز؟',
      body: 'بنساعد في التنسيق مع السينمات المشاركة لما عرض أو حجز يحتاج متابعة.',
      button: 'افتح بوابة السينما',
    },
  },
  supportPoliciesKicker: 'الإلغاء والاسترداد',
};
