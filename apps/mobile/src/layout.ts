import { Platform, useWindowDimensions } from 'react-native';
import { layout } from './theme';

/**
 * Breakpoints of the live site. Inner pages (pages.css) switch to the phone layout at ≤760px and to 14px gutters at
 * ≤500px; the home page (index.html) uses ≤850px and ≤580px.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= layout.wideFrom;
  const narrow = width <= 500;
  const gutter = narrow ? layout.narrowGutter : layout.gutter;
  return {
    width,
    height,
    /** >760px: two-column pages (movie detail, seats, checkout, resale, operator), 3-card grids. */
    wide,
    /** ≤760px: phone layout. */
    phone: !wide,
    /** ≤500px: 14px gutters, 38px titles, stacked payment options. */
    narrow,
    /** Web wider than 760px: the shell shows the desktop top nav and hides the bottom tabs. */
    desktop: Platform.OS === 'web' && wide,
    /** Side padding of the 1120px column. */
    gutter,
    /** Width of the content column. */
    columnWidth: Math.min(layout.maxWidth, width - 2 * gutter),
    /** Home page: >850px is desktop (5 posters, one-row search bar). */
    homeWide: width > 850,
    /** Home poster columns: 5 / 3 / 2. */
    homeCols: width > 850 ? 5 : width > 580 ? 3 : 2,
    /** Home column gutters: 24, or 16 at ≤580px. */
    homeGutter: width <= 580 ? layout.homeNarrowGutter : 24,
  };
}

export type Layout = ReturnType<typeof useLayout>;
