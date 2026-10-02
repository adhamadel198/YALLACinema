// Copy for the restyled booking journey: movie, seats, checkout and ticket screens.
// Merged into strings.ts as `t.booking` (a namespace, so keys never clash with other features).
// Every English key needs an Egyptian Arabic key: `ar: typeof en` enforces it.
// English follows the live site (main branch movie.html and seats.html) wherever the app has the same thing.

/** Isolates one part of a "·" line, so a Latin cinema name keeps its own direction inside Arabic and vice versa. */
const isolate = (s: string) => `⁨${s}⁩`;
/** "2 seats · VOX Cinemas · Mall of Egypt · Today, 7:45 PM", each part kept in its own direction. */
const dotted = (parts: string[]) => parts.map(isolate).join(' · ');

const arSeats = (n: number) => (n === 1 ? 'كرسي واحد' : n === 2 ? 'كرسيين' : n <= 10 ? `${n} كراسي` : `${n} كرسي`);

export const en = {
  // --- Movie details (movie.html) ---
  nowShowing: 'Now showing · Cairo & Giza',
  ratingBadge: (score: string) => `★  ${score} audience rating`,
  chooseShowtime: 'Choose a showtime ↓',
  findYourSeats: 'Find your seats',
  exactOnly: 'We’ll show only cinemas and times with an exact seat arrangement match.',
  numberOfSeats: 'Number of seats',
  seatArrangement: 'Seat arrangement',
  arrEither: 'Connected or separated',
  arrConnected: 'Connected seats',
  arrSeparated: 'Separated groups',
  refine: '⚙  Refine your search',
  refineCount: (n: number) => `⚙  Refine your search · ${n}`,
  refineTitle: 'Refine your search',
  allAreas: 'All Cairo & Giza',
  allCinemas: 'All participating cinemas',
  showtimeLabel: 'Showtime',
  soonestShowtime: 'Soonest showtime',
  distanceSort: 'Distance',
  listings: 'Cinema listings',
  listingsOn: (day: string) => `Cinema listings · ${day}`,
  todayWord: 'Today',
  pickCinemaTime: 'Pick a cinema & time',
  resultsLine: (cinemas: number, seats: number, arrangement: string) =>
    dotted([`${cinemas} matching ${cinemas === 1 ? 'cinema' : 'cinemas'}`, `${seats} ${seats === 1 ? 'seat' : 'seats'}`, arrangement]),
  /** Under a cinema's show times: the selected show's price and format. */
  showPrice: (price: string, format: string) => dotted([`From ${price} + 5 EGP fee per ticket`, format]),
  findSeats: 'Find seats',
  findSeatsAt: (cinema: string, time: string) => `Find seats at ${cinema}, ${time}`,
  noExactTitle: 'No exact matches for this search',
  noExactBody: 'Try changing the seat quantity, arrangement, area, or showtime range. We won’t show near matches as exact results.',
  recheckNotice: 'Final seat availability is rechecked before your booking is reserved. Cinema cancellation policy is shown at checkout.',

  // --- Seats (seats.html) ---
  yourMovieNight: 'Your movie night',
  chooseYourSeats: 'Choose your seats',
  seatsMeta: (n: number, cinema: string, when: string) => dotted([`${n} ${n === 1 ? 'seat' : 'seats'}`, cinema, when]),
  today: (time: string) => `Today, ${time}`,
  onDay: (day: string, time: string) => `${day}, ${time}`,
  qualifyingGroups: (n: number, count: number) => `${n} qualifying seat ${n === 1 ? 'group' : 'groups'} · ${count} required`,
  bestMatch: 'Best match',
  available: 'Available',
  unavailable: 'Unavailable',
  refreshAvailability: '↻  Refresh availability',
  noLongerAvailable: 'Those seats are no longer available.',
  refreshShowtimes: 'Refresh matching showtimes',
  bookingSummary: 'Booking summary',
  platformFee: 'Platform fee',
  feeTimesTickets: '5 EGP × tickets',
  chooseOnMap: 'Choose seats on the map',
  heldNote: 'Only the exact highlighted seats are held during checkout, subject to cinema confirmation.',
  continueCheckout: 'Continue to checkout',
};

export const ar: typeof en = {
  nowShowing: 'يعرض الآن · القاهرة والجيزة',
  ratingBadge: (score) => `★  ${score} تقييم الجمهور`,
  chooseShowtime: 'اختار معاد العرض ↓',
  findYourSeats: 'دوّر على كراسيك',
  exactOnly: 'هنوريك بس السينمات والمواعيد اللي فيها ترتيب الكراسي اللي طالبه بالظبط.',
  numberOfSeats: 'عدد الكراسي',
  seatArrangement: 'ترتيب الكراسي',
  arrEither: 'جنب بعض أو متفرقين',
  arrConnected: 'كراسي جنب بعض',
  arrSeparated: 'مجموعات متفرقة',
  refine: '⚙  ظبّط البحث',
  refineCount: (n) => `⚙  ظبّط البحث · ${n}`,
  refineTitle: 'ظبّط البحث',
  allAreas: 'كل القاهرة والجيزة',
  allCinemas: 'كل السينمات المشاركة',
  showtimeLabel: 'معاد العرض',
  soonestShowtime: 'أقرب معاد',
  distanceSort: 'المسافة',
  listings: 'السينمات والمواعيد',
  listingsOn: (day) => `السينمات والمواعيد · ${day}`,
  todayWord: 'النهارده',
  pickCinemaTime: 'اختار السينما والمعاد',
  resultsLine: (cinemas, seats, arrangement) =>
    dotted([cinemas === 1 ? 'سينما واحدة مناسبة' : cinemas === 2 ? 'سينمتين مناسبين' : `${cinemas} سينمات مناسبة`, arSeats(seats), arrangement]),
  showPrice: (price, format) => dotted([`من ${price} + 5 جنيه رسوم للتذكرة`, format]),
  findSeats: 'اختار الكراسي',
  findSeatsAt: (cinema, time) => `اختار الكراسي في ${cinema}، ${time}`,
  noExactTitle: 'مفيش نتايج مطابقة للبحث ده',
  noExactBody: 'جرّب تغيّر عدد الكراسي أو الترتيب أو المنطقة أو المعاد. مش هنعرض نتايج قريبة على إنها مطابقة.',
  recheckNotice: 'بنتأكد من الكراسي المتاحة تاني قبل ما نحجزلك. سياسة الإلغاء بتاعة السينما بتظهر وقت الدفع.',

  yourMovieNight: 'سهرتك في السينما',
  chooseYourSeats: 'اختار كراسيك',
  seatsMeta: (n, cinema, when) => dotted([arSeats(n), cinema, when]),
  today: (time) => `النهارده، ${time}`,
  onDay: (day, time) => `${day}، ${time}`,
  qualifyingGroups: (n, count) => `مجموعات كراسي مناسبة: ${n} · المطلوب ${count}`,
  bestMatch: 'أفضل اختيار',
  available: 'متاح',
  unavailable: 'مش متاح',
  refreshAvailability: '↻  حدّث الكراسي المتاحة',
  noLongerAvailable: 'الكراسي دي مبقتش متاحة.',
  refreshShowtimes: 'حدّث المواعيد المناسبة',
  bookingSummary: 'ملخص الحجز',
  platformFee: 'رسوم المنصة',
  feeTimesTickets: '5 جنيه × التذاكر',
  chooseOnMap: 'اختار الكراسي من الخريطة',
  heldNote: 'بنحجزلك الكراسي المحددة بس وقت الدفع، لحد ما السينما تأكدها.',
  continueCheckout: 'كمّل للدفع',
};
