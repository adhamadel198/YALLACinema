// Copy for the app shell shared by every screen: header, navigation, footer, breadcrumbs and the booking steps.
// Merged into strings.ts as `t.shell`. English follows the live site (main branch pages); Arabic is Egyptian.

export const en = {
  // Header and navigation
  homeLink: 'YALLA Cinema home',
  mainNav: 'Main',
  navMovies: 'Movies',
  navResale: 'Resale',
  navTickets: 'My Tickets',
  navHelp: 'Help',
  navProfile: 'Profile',
  navSignIn: 'Sign in',
  accountPill: (name: string) => `Your account: ${name}`,
  customerSite: 'Customer site',
  cinemaPortal: 'Cinema portal',
  back: 'Back',

  // Footer
  footerCopy: '© 2026 YALLA Cinema · Cairo, Egypt',
  /** The booking and account pages' shorter line, as on the live seats, checkout, ticket and account pages. */
  footerCopyShort: '© 2026 YALLA Cinema',
  footerLinks: 'Site links',
  helpSupport: 'Help & support',
  ticketResale: 'Ticket resale',
  policies: 'Policies',
  bookingSupport: 'Booking support',
  cancellationPolicy: 'Cancellation policy',
  needHelp: 'Need help?',
  needBookingHelp: 'Need booking help?',
  resaleHelp: 'Resale help',
  home: 'Home',
  partnerPortal: 'YALLA Cinema · Partner portal',
  partnerSupport: 'Partner support',

  // Breadcrumbs
  crumbLabel: 'You are here',
  crumbHome: 'Home',
  crumbMovies: 'Movies',
  crumbBooking: 'Booking',

  // Booking steps
  stepsLabel: 'Booking steps',
  stepSeats: 'Seats',
  stepCheckout: 'Checkout',
  stepTicket: 'Ticket',
  stepState: (n: number, name: string, state: 'done' | 'current' | 'next') =>
    `Step ${n} of 3, ${name}${state === 'done' ? ', done' : state === 'current' ? ', current step' : ''}`,

  // Times ("7:45 PM"), used by clock() in format.ts
  am: 'AM',
  pm: 'PM',

  // Form controls
  select: (label: string, value: string) => `${label}: ${value}`,
  closeList: 'Close',
  decrease: (label: string) => `Fewer: ${label}`,
  increase: (label: string) => `More: ${label}`,
  show: 'Show',
  hide: 'Hide',
};

export const ar: typeof en = {
  homeLink: 'الصفحة الرئيسية لـ YALLA Cinema',
  mainNav: 'القائمة الرئيسية',
  navMovies: 'الأفلام',
  navResale: 'إعادة البيع',
  navTickets: 'تذاكري',
  navHelp: 'المساعدة',
  navProfile: 'حسابي',
  navSignIn: 'تسجيل الدخول',
  accountPill: (name) => `حسابك: ${name}`,
  customerSite: 'موقع العملاء',
  cinemaPortal: 'بوابة السينما',
  back: 'رجوع',

  footerCopy: '© 2026 YALLA Cinema · القاهرة، مصر',
  footerCopyShort: '© 2026 YALLA Cinema',
  footerLinks: 'روابط الموقع',
  helpSupport: 'المساعدة والدعم',
  ticketResale: 'إعادة بيع التذاكر',
  policies: 'السياسات',
  bookingSupport: 'دعم الحجز',
  cancellationPolicy: 'سياسة الإلغاء',
  needHelp: 'محتاج مساعدة؟',
  needBookingHelp: 'محتاج مساعدة في الحجز؟',
  resaleHelp: 'مساعدة إعادة البيع',
  home: 'الرئيسية',
  partnerPortal: 'YALLA Cinema · بوابة الشركاء',
  partnerSupport: 'دعم الشركاء',

  crumbLabel: 'إنت هنا',
  crumbHome: 'الرئيسية',
  crumbMovies: 'الأفلام',
  crumbBooking: 'الحجز',

  stepsLabel: 'خطوات الحجز',
  stepSeats: 'الكراسي',
  stepCheckout: 'الدفع',
  stepTicket: 'التذكرة',
  stepState: (n, name, state) =>
    `الخطوة ${n} من ٣، ${name}${state === 'done' ? '، خلصت' : state === 'current' ? '، الخطوة الحالية' : ''}`,

  am: 'ص',
  pm: 'م',

  select: (label, value) => `${label}: ${value}`,
  closeList: 'اقفل',
  decrease: (label) => `أقل: ${label}`,
  increase: (label) => `أكتر: ${label}`,
  show: 'إظهار',
  hide: 'إخفاء',
};
