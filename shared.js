// Shared YALLA Cinema data and page chrome. Plain script, no build step.
// Load it as the first element inside <body>: it draws the header there and
// adds the mobile nav once the page has parsed. Pages pick their header and
// active links with attributes on <body>:
//   data-header="customer" | "operator" | "none"  (default "customer")
//   data-active="movies" | "cinemas" | "resale" | "help"  (desktop nav link)
//   data-account="Sign in" | "My account" | "none"  (header account link)
(function () {
  const films = [
    {id: 'the-last-light', title: 'The Last Light', genre: 'Drama', filter: 'Drama', runtime: '2h 08m', age: '16+', rating: 8.4, language: 'English · Arabic subtitles', tagline: 'An unforgettable journey', colors: ['#a14d31', '#402a31'], symbol: '☼',
      synopsis: 'When a quiet coastal town loses its lighthouse, a young restorer returns home to uncover the story her family left behind. A moving, visually rich story about finding your way back.',
      director: 'Lina Mansour', cast: ['Salma Hassan', 'Karim Nabil']},
    {id: 'redline', title: 'Redline', genre: 'Action', filter: 'Action', runtime: '1h 54m', age: '16+', rating: 7.9, language: 'English · Arabic subtitles', tagline: 'No way back', colors: ['#933b30', '#351b20'], symbol: '◈',
      synopsis: 'A retired getaway driver is pulled into one last night run across Cairo when her brother is caught up in a smuggling deal that goes wrong. Fast, loud and built for the big screen.',
      director: 'Omar Fathy', cast: ['Nour Adel', 'Hany Saleh']},
    {id: 'a-little-chaos', title: 'A Little Chaos', genre: 'Comedy', filter: 'Comedy', runtime: '1h 46m', age: '12+', rating: 8.1, language: 'Arabic · English subtitles', tagline: 'Life happens', colors: ['#d5a54c', '#765340'], symbol: '✿',
      synopsis: 'Three cousins agree to plan their grandmother\'s eightieth birthday together, and nothing about the week goes to plan. A warm family comedy about getting it wrong with the people you love.',
      director: 'Dina Shawky', cast: ['Yasmin Raafat', 'Ahmed Zaki', 'Mona Farid']},
    {id: 'the-deep-blue', title: 'The Deep Blue', genre: 'Adventure', filter: 'Action', runtime: '2h 16m', age: '12+', rating: 7.7, language: 'English · Arabic subtitles', tagline: 'Into the unknown', colors: ['#35778a', '#142a45'], symbol: '≈',
      synopsis: 'A Red Sea dive crew chasing a lost wreck finds something far older beneath it. A sweeping underwater adventure with real stakes and stunning photography.',
      director: 'Sherif Kamal', cast: ['Laila Mostafa', 'Tarek Hamdy']},
    {id: 'little-giants', title: 'Little Giants', genre: 'Family', filter: 'Family', runtime: '1h 39m', age: 'All ages', rating: 8.6, language: 'Arabic · English subtitles', tagline: 'Big dreams start small', colors: ['#d58248', '#66513c'], symbol: '★',
      synopsis: 'An under-eleven football team from Shubra talks its way into a national tournament with one borrowed ball and a coach who has never played. A feel-good story for the whole family.',
      director: 'Rami Youssef', cast: ['Adam Wael', 'Hana Sherif']}
  ];

  // Showtimes use 24-hour "HH:MM"; format them with YALLA.clock().
  // connected = longest free run of seats; separated = sample split groups.
  const cinemas = [
    {name: 'VOX Cinemas · Mall of Egypt', short: 'VOX', area: '6th of October', city: '6th of October City', venue: 'Mall of Egypt', format: 'Standard', sound: 'Dolby Atmos',
      distance: {'Downtown Cairo': 28, 'Maadi': 40, 'New Cairo': 48, '6th of October': 3},
      shows: [
        {film: 'the-last-light', times: ['17:30', '19:45', '22:15'], price: 180, connected: 6, separated: [[2, 2], [1, 1, 1, 1], [2, 1], [1, 1]]},
        {film: 'redline', times: ['18:00', '20:30'], price: 190, connected: 3, separated: [[2, 1], [1, 1, 1]]}
      ]},
    {name: 'Reel Cinemas · Cairo Festival City', short: 'Reel', area: 'New Cairo', city: 'New Cairo', venue: 'Cairo Festival City', format: 'Premium', sound: 'IMAX',
      distance: {'Downtown Cairo': 22, 'Maadi': 19, 'New Cairo': 4, '6th of October': 48},
      shows: [
        {film: 'the-last-light', times: ['18:00', '20:30', '23:00'], price: 220, connected: 3, separated: [[2, 1], [1, 1, 1], [1, 1]]},
        {film: 'redline', times: ['17:00', '19:30', '22:00'], price: 210, connected: 2, separated: [[1, 1]]},
        {film: 'the-deep-blue', times: ['17:00', '19:45'], price: 205, connected: 4, separated: [[2, 2], [1, 1, 1, 1]]},
        {film: 'a-little-chaos', times: ['18:30', '21:00'], price: 185, connected: 5, separated: [[2, 2], [2, 1], [1, 1, 1]]}
      ]},
    {name: 'Galaxy Cinema · Maadi', short: 'Galaxy', area: 'Maadi', city: 'Maadi', venue: 'Maadi', format: 'Standard', sound: 'Dolby sound',
      distance: {'Downtown Cairo': 12, 'Maadi': 3, 'New Cairo': 20, '6th of October': 40},
      shows: [
        {film: 'the-last-light', times: ['17:00', '19:30', '22:00'], price: 150, connected: 2, separated: [[1, 1]], language: 'Arabic · English subtitles'},
        {film: 'a-little-chaos', times: ['17:30', '20:00'], price: 160, connected: 4, separated: [[2, 1], [1, 1, 1]]},
        {film: 'little-giants', times: ['16:30', '18:45'], price: 145, connected: 6, separated: [[2, 2], [1, 1, 1, 1]]}
      ]}
  ];

  const norm = s => String(s || '').trim().toLowerCase();
  // Accepts a film id ("the-last-light") or title ("The Last Light").
  const film = key => films.find(f => f.id === norm(key) || norm(f.title) === norm(key));
  const cinema = key => cinemas.find(c => c.short === key || c.name === key);
  // Every cinema showing a film, with that film's show details flattened in.
  const showingsOf = id => cinemas.flatMap(c => c.shows.filter(s => s.film === id).map(s => ({...s, cinema: c, language: s.language || film(id).language})));
  const filmUrl = (f, extra) => 'movie.html?' + new URLSearchParams({film: f.id, ...extra});

  const toMin = s => {if (!s || s === '0') return 0; const m = String(s).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i); if (!m) return 0; let h = Number(m[1]); if (m[3]) h = h % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0); return h * 60 + Number(m[2])};
  const clock = s => {const mins = toMin(s), h = Math.floor(mins / 60), m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  window.YALLA = {films, cinemas, film, cinema, showingsOf, filmUrl, toMin, clock, esc};

  // ----- Page chrome -----
  const body = document.body, opts = body.dataset;
  const brand = '<a class="brand" href="index.html" aria-label="YALLA Cinema home"><span class="brand-logo" aria-hidden="true"></span></a>';
  const navLinks = [['movies', 'index.html#movies', 'Movies'], ['cinemas', 'index.html#showtimes', 'Cinemas'], ['resale', 'resale.html', 'Resale'], ['help', 'support.html', 'Help']];
  const headers = {
    customer() {
      const links = navLinks.map(([key, href, label]) => `<a${key === opts.active ? ' class="active" aria-current="page"' : ''} href="${href}">${label}</a>`).join('');
      const account = opts.account === 'none' ? '' : `<a class="login" href="account.html">${esc(opts.account || 'Sign in')}</a>`;
      return `<div class="wrap nav">${brand}<nav class="navlinks">${links}</nav><div class="navside"><span class="loc">⌖ Cairo, Egypt</span>${account}</div></div>`;
    },
    operator() {
      return `<div class="wrap nav">${brand}<nav class="navlinks"><a href="index.html">Customer site</a><a class="active" aria-current="page" href="operator.html">Cinema portal</a></nav><div class="navside"><span class="loc">VOX Cinemas · Mall of Egypt</span><button class="login">Operator ▾</button></div></div>`;
    }
  };
  const header = headers[opts.header || 'customer'];
  if (header) {
    const el = document.createElement('header');
    el.className = 'topbar';
    el.innerHTML = header();
    body.prepend(el);
  }

  const mobileLinks = [
    ['home', 'index.html#top', 'Home', '<path d="m3 10 9-7 9 7M5.5 9v12h13V9M9 21v-7h6v7"/>'],
    ['movies', 'index.html#movies', 'Movies', '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>'],
    ['tickets', 'account.html#tickets', 'My Tickets', '<path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z"/><path d="M12 7v2m0 3v2m0 3v1"/>'],
    ['profile', 'account.html', 'Profile', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>']
  ];
  // Works with and without the ".html" suffix (vercel.json enables cleanUrls).
  const page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
  const mobileActive = {index: 'home', movie: 'movies', search: 'movies', seats: 'movies', checkout: 'movies', ticket: 'tickets', resale: 'tickets', account: 'profile'}[page];
  function addMobileNav() {
    const nav = document.createElement('nav');
    nav.className = 'mobile-nav';
    nav.setAttribute('aria-label', 'Primary navigation');
    nav.innerHTML = mobileLinks.map(([key, href, label, icon]) => `<a data-nav="${key}" href="${href}"${key === mobileActive ? ' class="active" aria-current="page"' : ''}><svg class="mobile-icon" viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${label}</span></a>`).join('');
    body.append(nav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMobileNav); else addMobileNav();
})();
