import { Platform, type ViewStyle } from 'react-native';

/**
 * Colour tokens of the live YALLA site (main branch pages.css, "YALLA brand system" layer): always dark,
 * black and gold, with cream for fields, badges and notices. The site has no light mode, so neither does the app.
 * Use `colors` in StyleSheet.create, or `useTheme()` inside components (same object).
 */
export const colors = {
  // --- Core (the original Theme shape; every screen uses these) ---
  /** Primary text, warm ivory. */
  ink: '#f4eedf',
  /** Secondary text, captions, crumb, legend. */
  muted: '#b9ad91',
  /** Page, footer, ticket top band. */
  bg: '#11100e',
  /** Panels, cards, summary, sidebar, tables. */
  panel: '#1c1914',
  /** Panel borders, dividers, table rows. */
  line: '#453923',
  /** Gold: primary fills, selected seats, progress dots, spinners. */
  accent: '#c5a15a',
  /** Text on gold. */
  accentInk: '#18140d',
  /** Availability and success text. */
  good: '#91c59c',

  // --- Surfaces ---
  /** Header pills, filter chips, home search box, "how it works" band. */
  surface: '#1b1915',
  /** Time buttons, payment options, match-choice pills, origin box. */
  control: '#211e17',
  /** Selected time / payment / match choice. */
  controlOn: '#352b1a',
  /** Selected filter chip (pill). */
  chipOn: '#302619',
  /** Dark tags, table header. */
  tagBg: '#292319',
  tagInk: '#e0d4b8',
  /** Sticky top bar (93% bg). */
  headerBg: '#11100fee',
  /** Phone bottom nav (96% bg). */
  tabBarBg: '#11100ff5',

  // --- Lines ---
  /** Header bottom border and bottom-nav top border. */
  lineHeader: '#4b3b20',
  /** Chips, time buttons, pay options, search box. */
  lineControl: '#51442b',
  /** Header pills (location, language, sign in). */
  linePill: '#55462b',
  /** Dark button border. */
  lineDark: '#554321',
  /** Footer top border. */
  lineFooter: '#493b25',

  // --- Text variants ---
  /** Text on header pills. */
  inkPill: '#f2ead7',
  /** Text on time buttons and pay options. */
  inkControl: '#e8ddc5',
  /** Desktop nav links (inactive). */
  navText: '#d9cfb9',
  /** Filter chip text (inactive). */
  chipInk: '#ddd2ba',
  /** Poster meta, sidebar items. */
  mutedSoft: '#c3b89f',
  /** Home hero paragraph. */
  heroText: '#d2c7ae',
  /** Footer text. */
  footerInk: '#c6b99d',
  /** Input placeholder on cream fields. */
  placeholder: '#8b7f66',

  // --- Gold family ---
  /** Primary button fill (inner pages). */
  gold: '#c5a15a',
  /** Home hero button, home "Find seats", kickers, footer links. */
  goldBright: '#d5b15f',
  /** Solid 4px "ledge" under gold buttons. */
  goldLedge: '#89672f',
  /** Home button ledge (5px). */
  goldLedgeHome: '#8c682c',
  /** Hover / pressed gold. */
  goldHover: '#e4c777',
  /** Text on gold (same as accentInk). */
  onGold: '#18140d',
  /** Active nav link, dark button text. */
  goldText: '#e4c36e',
  /** Selected chip / time / payment text. */
  goldSelected: '#f0cf75',
  /** Active bottom-nav item. */
  navActive: '#efce75',
  /** Inactive bottom-nav item. */
  navIdle: '#ded5c1',
  /** Inner-page eyebrow. */
  eyebrow: '#a17b32',
  /** Home kicker / eyebrow. */
  kicker: '#d5b15f',
  /** Links on dark (crumb links, inline notices, "↻ Refresh"). Brighter than the live #94702d for contrast. */
  link: '#d5b15f',
  /** "All movies →" style links. */
  linkStrong: '#e2c170',
  /** Field focus border. */
  focus: '#b18a43',
  /** Focus ring (3px). */
  focusRing: '#c5a15a2b',
  /** E-ticket eyebrow and seat-map screen arc. */
  ticketAccent: '#ffbd65',
  /** Resale hero title. */
  heroGold: '#f4dfa6',

  // --- Cream family (fields, badges, notices on dark) ---
  fieldBg: '#fffaf0',
  fieldLine: '#d9c99f',
  fieldInk: '#211c12',
  /** Field label on dark panels. */
  fieldLabel: '#e1d3b2',
  badgeBg: '#f2e7c9',
  badgeInk: '#70521b',
  softBg: '#f3ead6',
  softInk: '#76551f',
  softLine: '#d8c18b',
  noticeBg: '#fff5df',
  noticeInk: '#715620',
  verifyBg: '#f4ead0',
  verifyLine: '#ddc894',
  verifyInk: '#63502a',
  /** Cream sheet (resale buy) and its line/muted text. */
  creamLine: '#dfd1ad',
  creamMuted: '#6b5f45',
  ratingBg: '#fffaf1ed',
  ratingInk: '#30283e',

  // --- Status ---
  success: '#91c59c',
  /** Green pill ("Verified ticket", "On sale", connected match). */
  goodPillBg: '#eaf7ef',
  goodPillInk: '#24744e',
  /** Gold pill (separated match). */
  sepPillBg: '#f0e6d0',
  sepPillInk: '#76551f',
  /** Errors on dark. The live site has no error colour; this reads as an error without clashing with gold. */
  danger: '#e8907a',
  /** Errors on cream surfaces. */
  dangerOnCream: '#9a3a24',
  /** Field border in the error state. */
  dangerLine: '#c0563f',
  /** "Cancelled" pill. */
  alertBg: '#3a1d16',
  alertLine: '#8a3a2a',
  alertInk: '#f2b2a0',

  // --- Fee boxes ---
  /** Home fee note. */
  feeBg: '#201c14',
  feeLine: '#57472a',
  feeInk: '#d3c6a7',
  feeStrong: '#efd48a',

  // --- Seat map ---
  seatFree: '#f6f0e8',
  seatFreeLine: '#ddd0be',
  seatInk: '#777777',
  seatTaken: '#d7d3d1',
  seatAlso: '#d2ad5a',
  seatPicked: '#c5a15a',
  seatPickedLine: '#a17b32',
  screenLabel: '#9a8d7b',
};

export type Theme = typeof colors;

/** The app's colours. Kept as a hook so screens written for the old light/dark switch keep working. */
export const useTheme = (): Theme => colors;

/** Corner radii from the live CSS. */
export const radii = { panel: 18, card: 16, hero: 22, button: 12, homeButton: 13, field: 10, chip: 999, time: 9, tag: 7, notice: 11, rating: 7 };

/** Content column widths and gutters (pages.css `.wrap`; index.html uses 1180). */
export const layout = {
  maxWidth: 1120,
  homeMaxWidth: 1180,
  gutter: 20,
  /** ≤500px wide (≤580 on home). */
  narrowGutter: 14,
  homeNarrowGutter: 16,
  /** pages.css: phone layout at ≤760px. */
  wideFrom: 761,
  /** `.page` bottom padding. */
  pageBottom: 70,
};

/**
 * Shadows from the live CSS. `boxShadow` works on web and on the new architecture (iOS and Android).
 * The gold button "ledge" is a solid boxShadow too (`0 4px 0 #89672f`, see Button).
 */
export const shadows = {
  panel: { boxShadow: '0 14px 38px rgba(0,0,0,0.33)' },
  card: { boxShadow: '0 5px 18px rgba(84,65,44,0.04)' },
  poster: { boxShadow: '0 8px 20px rgba(75,58,42,0.1)' },
  search: { boxShadow: '0 20px 45px rgba(0,0,0,0.53)' },
  tabBar: { boxShadow: '0 -8px 24px rgba(0,0,0,0.53)' },
  /** Soft gold glow under the home hero button. */
  glow: { boxShadow: '0 11px 23px rgba(213,177,95,0.15)' },
  /** Focus ring for fields. */
  focusRing: { boxShadow: '0 0 0 3px #c5a15a2b' },
  /** Ring around a selected match choice. */
  choiceRing: { boxShadow: '0 0 0 2px #c5a15a2b' },
} satisfies Record<string, ViewStyle>;

/**
 * A CSS background-image (linear-gradient / radial-gradient, several layers allowed) on any View.
 * Web uses CSS `backgroundImage`; iOS/Android use React Native's `experimental_backgroundImage`.
 * Always give the View a `backgroundColor` too, as the fallback.
 * Example: `<View style={[{ backgroundColor: '#402a31' }, backgroundImage('linear-gradient(160deg, #a14d31, #402a31 68%, #171313)')]} />`
 */
export const backgroundImage = (css: string): ViewStyle =>
  (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;

/** Frosted glass behind the sticky header and bottom nav (web only; nothing elsewhere). */
export const backdropBlur = (px: number): ViewStyle =>
  (Platform.OS === 'web' ? { backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)` } : {}) as ViewStyle;
