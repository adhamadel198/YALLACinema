// Copy for the restyled Movies tab (home): hero, search bar, now showing, popular showtimes, how it works.
// Merged into strings.ts as `t.home` (a namespace, so keys never clash with other features).
// Every English key needs an Egyptian Arabic key: `ar: typeof en` enforces it.
// English is the live site's index.html; Arabic is its data-ar copy where it has one, Egyptian otherwise.

const seatsAr = (n: number) => (n === 1 ? 'كرسي واحد' : n === 2 ? 'كرسيين' : `${n} كراسي`);

export const en = {
  // Hero
  heroEyebrow: 'Cairo & Giza · Now showing',
  heroTitle: 'Make tonight\nmovie night.',
  heroLead: 'Find the film you love. Pick your cinema, choose your seats, and you’re in.',
  exploreMovies: 'Explore movies',
  seeTodaysShows: 'See today’s shows',

  // Search bar
  searchLabel: 'Search movies',
  searchPlaceholder: 'Search movie title...',
  areaLabel: 'Area',
  allCairoGiza: 'All Cairo & Giza',
  seatsField: 'Seats',
  arrangementLabel: 'Seat arrangement',
  arrEither: 'Connected or separated',
  arrConnected: 'Connected seats',
  arrSeparated: 'Separated groups',
  findMatchingShows: 'Find matching shows',

  // Now showing
  pickYourStory: 'Pick your story',
  nowShowingTitle: 'Now showing',
  allMovies: 'All movies',
  genreLabel: 'Genre',
  allFilms: 'All films',
  noMovies: 'No matching movies. Try another search.',
  movieCard: (title: string, meta: string) => `${title}, ${meta}`,

  // Popular showtimes
  todayIn: (area: string) => `Today · ${area}`,
  // Sorted by distance: "Near you · Today" (the live kicker), "Near Maadi · Today", plus the area filter if any.
  nearToday: (near: string | null, area: string | null) => `${near ? `Near ${near}` : 'Near you'} · Today${area ? ` · ${area}` : ''}`,
  popularShowtimes: 'Popular showtimes',
  changeMovie: 'Change movie ↑',
  filmSeats: (title: string, n: number) => `${title} · ${n} ${n === 1 ? 'seat' : 'seats'}`,
  fromPriceFee: (price: string) => `From ${price} + 5 EGP fee per ticket`,
  findSeats: 'Find seats',
  findSeatsAt: (cinema: string, time: string) => `Find seats, ${cinema}, ${time}`,
  timesAt: (cinema: string) => `Show times at ${cinema}`,
  sortBy: 'Sort by',
  sortSoonest: 'Soonest',
  sortNearest: 'Nearest',
  distanceFrom: 'Distance from',
  myLocation: 'My location',
  pickPlace: 'Choose a place',

  // How it works
  easy123: 'Easy as 1, 2, 3',
  seatWaiting: 'Your seat is waiting.',
  steps: [
    { num: '01 / DISCOVER', title: 'Find your film', body: 'Browse what’s showing and compare nearby cinemas.' },
    { num: '02 / PICK', title: 'Choose your seats', body: 'See live availability and pick the seats you want.' },
    { num: '03 / GO', title: 'Book and enjoy', body: 'Pay securely, then show your scannable ticket at the cinema.' },
  ],
  feeNoteA: 'Clear pricing, always. Cinema ticket price + ',
  feeNoteB: '5 EGP platform fee per ticket',
  feeNoteC: ' — shown before you pay.',
};

export const ar: typeof en = {
  heroEyebrow: 'القاهرة والجيزة · يعرض الآن',
  heroTitle: 'خلّي ليلتك\nليلة سينما.',
  heroLead: 'اختار فيلمك، سينما قريبة منك، ومقعدك المفضل — والباقي علينا.',
  exploreMovies: 'اكتشف الأفلام',
  seeTodaysShows: 'عروض اليوم',

  searchLabel: 'دوّر على فيلم',
  searchPlaceholder: 'ابحث عن فيلم...',
  areaLabel: 'المنطقة',
  allCairoGiza: 'كل القاهرة والجيزة',
  seatsField: 'كراسي',
  arrangementLabel: 'ترتيب الكراسي',
  arrEither: 'جنب بعض أو متفرقين',
  arrConnected: 'كراسي جنب بعض',
  arrSeparated: 'مجموعات متفرقة',
  findMatchingShows: 'ابحث عن عروض مناسبة',

  pickYourStory: 'اختار حكايتك',
  nowShowingTitle: 'يعرض الآن',
  allMovies: 'كل الأفلام',
  genreLabel: 'النوع',
  allFilms: 'كل الأفلام',
  noMovies: 'مفيش أفلام مطابقة. جرّب بحث تاني.',
  movieCard: (title, meta) => `${title}، ${meta}`,

  todayIn: (area) => `النهارده · ${area}`,
  nearToday: (near, area) => `${near ? `بالقرب من ${near}` : 'بالقرب منك'} · النهارده${area ? ` · ${area}` : ''}`,
  popularShowtimes: 'مواعيد مميزة',
  changeMovie: 'غيّر الفيلم ↑',
  filmSeats: (title, n) => `\u200F\u2068${title}\u2069 · ${seatsAr(n)}`,
  fromPriceFee: (price) => `من ${price} + 5 جنيه رسوم لكل تذكرة`,
  findSeats: 'دوّر على كراسي',
  findSeatsAt: (cinema, time) => `دوّر على كراسي، ${cinema}، ${time}`,
  timesAt: (cinema) => `مواعيد العرض في ${cinema}`,
  sortBy: 'رتّب حسب',
  sortSoonest: 'أقرب معاد',
  sortNearest: 'الأقرب مسافة',
  distanceFrom: 'المسافة من',
  myLocation: 'موقعي',
  pickPlace: 'اختار مكان',

  easy123: 'ببساطة، ١ ٢ ٣',
  seatWaiting: 'مقعدك مستنيك.',
  steps: [
    { num: '٠١ / اكتشف', title: 'اختار فيلمك', body: 'تصفّح الأفلام وقارن السينمات القريبة منك.' },
    { num: '٠٢ / اختار', title: 'اختار مقاعدك', body: 'شوف المقاعد المتاحة مباشرة واختار مكانك.' },
    { num: '٠٣ / روح', title: 'احجز واستمتع', body: 'ادفع بأمان واعرض تذكرتك الرقمية عند الدخول.' },
  ],
  feeNoteA: 'السعر واضح دايمًا. سعر التذكرة + ',
  feeNoteB: '٥ جنيه رسوم للمنصة لكل تذكرة',
  feeNoteC: ' — بتظهر قبل الدفع.',
};
