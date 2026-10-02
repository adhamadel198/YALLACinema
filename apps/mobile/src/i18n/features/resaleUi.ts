// Copy for the restyled resale screens: Resale tab, buy, sell and my listings.
// Merged into strings.ts as `t.resaleUi` (a namespace, so keys never clash with other features).
// Every English key needs an Egyptian Arabic key: `ar: typeof en` enforces it.

import type { TicketStatus } from '../../api/resale';

type Why = Record<Exclude<TicketStatus, 'valid'>, string>;

export const en = {
  // Hero
  heroBadge: 'Platform ticket resale',
  heroTitle: 'Plans changed?\nPass your seat on.',
  heroLead: 'Buy eligible tickets from other moviegoers or list a ticket you booked with YALLA.',
  fairPriceLabel: 'Fair-price promise:',
  fairPrice: 'Resale listings are capped at the original cinema ticket amount paid, excluding the original platform fee. Buyers pay the ticket price plus 5 EGP per ticket.',

  // Marketplace
  marketKicker: 'Marketplace',
  marketTitle: 'Tickets available',
  marketLead: 'Browse current listings. Unused tickets only; every transfer needs cinema confirmation.',
  allTickets: 'All tickets',
  areaFilter: 'Show tickets in',
  noneInArea: (area: string) => `No tickets in ${area}`,
  tryAnotherArea: 'Try another area.',
  verified: 'Verified ticket',
  capLine: '+ 5 EGP fee per ticket · capped at original price · seller fee applies only after successful transfer',
  buyTicket: 'Buy ticket',
  refundsPolicy: 'Refunds are handled under the cinema’s policy for the current ticket holder. Platform fees are non-refundable if a refund is allowed, subject to applicable agreements.',

  // For ticket owners
  ownersKicker: 'For ticket owners',
  ownersTitle: 'List your ticket',
  ownersBody: 'A YALLA account and payout details are required. Only unused tickets originally bought on YALLA qualify.',
  accountLabel: 'Account:',
  payoutUnverified: 'Payout details aren’t verified yet.',
  addPayoutLater: 'Add payout details when you list your first ticket.',
  eligibleBooking: (reference: string) => `Eligible booking · ${reference}`,
  sellableCount: (n: number, total: number) => `${n} of ${total} ${total === 1 ? 'ticket' : 'tickets'} can be listed`,
  noEligible: 'No tickets to list right now. Tickets you book while signed in appear here until the show starts.',
  closeNote: 'Listings close when the show starts. Unsold tickets stay blocked until the cinema confirms they’re active again.',

  // Your listings
  mineKicker: 'Your listings',
  mineTitle: 'Manage tickets you’ve listed',
  manageListings: 'Manage listings',
  mineEmpty: 'No listings yet. Open a ticket from My Tickets to list it.',
  perTicketShort: (price: string) => `${price}/ticket`,
  seatState: (seat: string, state: string) => `${seat} · ${state}`,

  // How resale protects both sides
  protectKicker: 'How resale protects both sides',
  protect: [
    { title: 'Before listing', body: 'YALLA verifies the original booking, checks the ticket is unused, and requires a signed-in account with payout details.' },
    { title: 'On transfer', body: 'After buyer payment succeeds, the old ticket is invalidated and a replacement is issued. If transfer fails, the purchase is cancelled, the buyer is refunded, and the original ticket remains valid.' },
    { title: 'If it doesn’t sell', body: 'Withdraw any time before showtime. At show start, unsold listings close; the original ticket is usable again only after cinema reactivation is confirmed.' },
  ],
  showChangeNotice: 'If a cinema changes or cancels a show after resale, both parties are notified. The current ticket holder follows the cinema’s refund or rebooking policy, and YALLA coordinates with the cinema. If a refund is allowed, the ticket amount is refundable; platform fees are non-refundable subject to applicable terms.',

  // Buy
  checkoutKicker: 'Resale checkout',
  buyHeading: (movie: string) => `Buy ${movie}`,
  unusedEligible: 'unused and eligible',
  ticketsFromListing: 'Tickets from this listing',
  seatUnusedVerified: 'Unused · verified for resale',
  ticketPriceLine: 'Resale ticket price',
  ticketPriceHint: (n: number, each: string) => `${n} × ${each}`,
  buyerFeeLine: 'Buyer platform fee · 5 EGP per ticket',
  buyerTotal: 'Buyer total',

  // Sell
  originalEach: (price: string) => `Original ticket: ${price} each · Platform fee is excluded`,
  seatUnused: 'Unused · YALLA booking',
  seatWithState: (seat: string, state: string) => `${seat} · ${state}`,
  ticketWhy: {
    listed: 'Already on sale in Resale.',
    used: 'Already scanned/used; cannot be listed.',
    transferred: 'Sold on resale.',
    'pending-reactivation': 'Waiting for the cinema to reactivate it.',
    'under-review': 'Being checked by support.',
  } as Why,
  priceLabel: (max: string) => `Listing price per ticket (maximum ${max})`,
  proceedsLine: (each: string) => `Seller proceeds after a successful transfer: ${each} per ticket (listing price less 20 EGP, floored at zero).`,
  publish: 'Publish selected tickets',

  // Ticket screen
  ticketKicker: 'Ticket resale',
};

export const ar: typeof en = {
  heroBadge: 'إعادة بيع التذاكر على YALLA',
  heroTitle: 'خططك اتغيرت؟\nسيب كرسيك لحد تاني.',
  heroLead: 'اشتري تذاكر متاحة من ناس تانية، أو اعرض تذكرة حجزتها على YALLA.',
  fairPriceLabel: 'وعد السعر العادل:',
  fairPrice: 'سعر التذكرة المعروضة عمره ما يزيد عن اللي اتدفع للسينما، من غير رسوم المنصة الأصلية. والمشتري بيدفع سعر التذكرة + ٥ جنيه لكل تذكرة.',

  marketKicker: 'السوق',
  marketTitle: 'تذاكر متاحة',
  marketLead: 'اتفرّج على التذاكر المعروضة. تذاكر ما اتستخدمتش بس، وكل نقل لازم السينما تأكده.',
  allTickets: 'كل التذاكر',
  areaFilter: 'اعرض التذاكر في',
  noneInArea: (area) => `مفيش تذاكر في ${area}`,
  tryAnotherArea: 'جرّب منطقة تانية.',
  verified: 'تذكرة موثّقة',
  capLine: '+ ٥ جنيه رسوم للتذكرة · مش أكتر من السعر الأصلي · رسوم البايع بتتخصم بس بعد ما النقل ينجح',
  buyTicket: 'اشتري التذكرة',
  refundsPolicy: 'الاسترداد بيمشي على سياسة السينما لصاحب التذكرة الحالي. ولو الاسترداد مسموح، رسوم المنصة مش بتترد، حسب الاتفاقات المعمول بيها.',

  ownersKicker: 'لأصحاب التذاكر',
  ownersTitle: 'اعرض تذكرتك',
  ownersBody: 'محتاج حساب على YALLA وبيانات استلام الفلوس. وبس التذاكر اللي ما اتستخدمتش واتشرت أصلًا من YALLA ينفع تتعرض.',
  accountLabel: 'الحساب:',
  payoutUnverified: 'بيانات استلام الفلوس لسه ما اتأكدتش.',
  addPayoutLater: 'هتضيف بيانات استلام الفلوس أول ما تعرض أول تذكرة.',
  eligibleBooking: (reference) => `حجز ينفع يتعرض · ${reference}`,
  sellableCount: (n, total) => `${n} من ${total} ${total === 1 ? 'تذكرة' : 'تذاكر'} ينفع تتعرض`,
  noEligible: 'مفيش تذاكر تتعرض دلوقتي. التذاكر اللي بتحجزها وإنت مسجّل دخول بتظهر هنا لحد ما العرض يبدأ.',
  closeNote: 'الإعلانات بتتقفل لما العرض يبدأ. والتذاكر اللي ما اتباعتش بتفضل موقوفة لحد ما السينما تأكد إنها شغالة تاني.',

  mineKicker: 'إعلاناتك',
  mineTitle: 'تابع التذاكر اللي عرضتها',
  manageListings: 'إدارة الإعلانات',
  mineEmpty: 'لسه مفيش إعلانات. افتح تذكرة من تذاكري عشان تعرضها.',
  perTicketShort: (price) => `${price} للتذكرة`,
  seatState: (seat, state) => `${seat} · ${state}`,

  protectKicker: 'إزاي إعادة البيع بتحمي الطرفين',
  protect: [
    { title: 'قبل العرض', body: 'YALLA بتتأكد من الحجز الأصلي وإن التذكرة ما اتستخدمتش، ولازم تكون مسجّل دخول ومضيف بيانات استلام الفلوس.' },
    { title: 'وقت النقل', body: 'بعد ما دفع المشتري ينجح، التذكرة القديمة بتتلغي وبتطلع تذكرة بدالها. ولو النقل فشل، الشراء بيتلغي والمشتري فلوسه بترجعله والتذكرة الأصلية بتفضل شغالة.' },
    { title: 'لو ما اتباعتش', body: 'تقدر تسحبها في أي وقت قبل العرض. ولما العرض يبدأ الإعلانات اللي ما اتباعتش بتتقفل، والتذكرة الأصلية بترجع تشتغل بس بعد ما السينما تأكد تفعيلها.' },
  ],
  showChangeNotice: 'لو السينما غيّرت أو لغت عرض بعد إعادة البيع، الطرفين بيعرفوا. صاحب التذكرة الحالي بيمشي على سياسة السينما في الاسترداد أو تغيير الحجز، وYALLA بتنسّق مع السينما. ولو الاسترداد مسموح، سعر التذكرة بيترد ورسوم المنصة لأ، حسب الشروط.',

  checkoutKicker: 'دفع إعادة البيع',
  buyHeading: (movie) => `اشتري ${movie}`,
  unusedEligible: 'ما اتستخدمتش وينفع تتباع',
  ticketsFromListing: 'التذاكر من الإعلان ده',
  seatUnusedVerified: 'ما اتستخدمتش · متأكدين إنها تتباع',
  ticketPriceLine: 'سعر التذكرة',
  ticketPriceHint: (n, each) => `${n} × ${each}`,
  buyerFeeLine: 'رسوم المنصة على المشتري · ٥ جنيه للتذكرة',
  buyerTotal: 'إجمالي المشتري',

  originalEach: (price) => `التذكرة الأصلية: ${price} للواحدة · من غير رسوم المنصة`,
  seatUnused: 'ما اتستخدمتش · حجز من YALLA',
  seatWithState: (seat, state) => `${seat} · ${state}`,
  ticketWhy: {
    listed: 'معروضة للبيع بالفعل.',
    used: 'اتمسحت أو اتستخدمت؛ مينفعش تتعرض.',
    transferred: 'اتباعت.',
    'pending-reactivation': 'مستنية السينما تفعّلها تاني.',
    'under-review': 'فريق الدعم بيراجعها.',
  },
  priceLabel: (max) => `سعر التذكرة المعروضة (بحد أقصى ${max})`,
  proceedsLine: (each) => `اللي هيوصلك بعد ما النقل ينجح: ${each} للتذكرة (السعر ناقص ٢٠ جنيه، ومش أقل من صفر).`,
  publish: 'انشر التذاكر المختارة',

  ticketKicker: 'إعادة بيع التذاكر',
};
