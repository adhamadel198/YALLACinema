import { useCallback, useEffect, useRef, useState } from 'react';
import type { Area, ShowtimeFilters } from '../api/types';
import { canLocateWithoutAsking, locate } from './locate';
import { AREAS, type Coords, type LocateFailure, type LocateResult } from './types';

/** Where distance is measured from: the device ("here"), a picked area, or nothing chosen yet. */
export type Near = Area | 'here' | '';
export type LocationStatus = 'idle' | 'locating' | 'slow' | 'ready' | LocateFailure;
type Choice = { sort: 'soonest' | 'distance'; near: Near };

/** No fix this long after permission is given counts as a timeout. */
const FIX_TIMEOUT_MS = 15_000;
/** After this long the customer is told it's taking a while and that they can pick an area. */
const SLOW_AFTER_MS = 5_000;
/** Backstop for browsers that never answer when their permission prompt is dismissed. */
const GIVE_UP_AFTER_MS = 45_000;
/** A remembered location older than this is looked up again when a movie screen opens. */
const STALE_AFTER_MS = 10 * 60 * 1000;

// The sort choice is remembered for the session: while the app is open, and on the web also across
// a reload of the tab (sessionStorage). The location itself is only ever kept in memory.
const SESSION_KEY = 'yalla.distanceSort';
const NO_CHOICE: Choice = { sort: 'soonest', near: '' };

function loadChoice(): Choice {
  try {
    const saved = JSON.parse(globalThis.sessionStorage?.getItem(SESSION_KEY) ?? 'null') as Partial<Choice> | null;
    const sortOk = saved?.sort === 'soonest' || saved?.sort === 'distance';
    const nearOk = saved?.near === '' || saved?.near === 'here' || AREAS.includes(saved?.near as Area);
    return sortOk && nearOk ? { sort: saved!.sort!, near: saved!.near! } : NO_CHOICE;
  } catch {
    return NO_CHOICE;
  }
}

function saveChoice(choice: Choice) {
  try {
    globalThis.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(choice));
  } catch {
    // Private browsing or storage disabled: the choice still lasts while the page is open.
  }
}

let remembered: Choice = loadChoice();
let lastFix: (Coords & { at: number }) | null = null;

/** Rounded to about 100 m: plenty to sort cinemas, and no more precise than the search needs. */
const approx = (n: number) => Math.round(n * 1000) / 1000;
const isFresh = (fix: typeof lastFix): fix is NonNullable<typeof lastFix> => !!fix && Date.now() - fix.at < STALE_AFTER_MS;

/**
 * Sort by soonest, or by distance from the device location or a picked area (BRD 7.1).
 * The device location is only requested once the customer chooses "Use my location".
 */
export function useDistanceSort() {
  const [choice, setChoice] = useState(remembered);
  const [coords, setCoords] = useState<Coords | null>(() => (remembered.near === 'here' && isFresh(lastFix) ? lastFix : null));
  const [status, setStatus] = useState<LocationStatus>(() => (remembered.near !== 'here' ? 'idle' : coords ? 'ready' : 'locating'));
  const attempt = useRef(0);

  const update = useCallback((change: (c: Choice) => Choice) => setChoice((c) => {
    remembered = change(c);
    saveChoice(remembered);
    return remembered;
  }), []);

  const locateMe = useCallback(async () => {
    const id = ++attempt.current;
    const current = () => attempt.current === id;
    setStatus('locating');
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    const slow = setTimeout(() => current() && setStatus('slow'), SLOW_AFTER_MS);
    const result = await Promise.race([
      locate(FIX_TIMEOUT_MS),
      new Promise<LocateResult>((resolve) => { giveUp = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), GIVE_UP_AFTER_MS); }),
    ]);
    clearTimeout(slow);
    clearTimeout(giveUp);
    if (!current()) return; // the customer picked something else, or left the screen
    if (result.ok) {
      const fix = { lat: approx(result.coords.lat), lon: approx(result.coords.lon) };
      lastFix = { ...fix, at: Date.now() };
      setCoords(fix);
      setStatus('ready');
    } else {
      // Fall back to picking an area: the message says why and the area chips are right there.
      setCoords(null);
      setStatus(result.reason);
      update((c) => ({ ...c, near: c.near === 'here' ? '' : c.near }));
    }
  }, [update]);

  useEffect(() => {
    // "Use my location" was chosen earlier in this session, but there's no recent fix (the fix is
    // old, or the web page was reloaded). Look again only if that can't show a permission prompt,
    // since the customer hasn't tapped anything yet; otherwise ask them to choose again.
    if (remembered.near === 'here' && !isFresh(lastFix)) {
      const id = attempt.current;
      canLocateWithoutAsking().then((allowed) => {
        if (attempt.current !== id) return; // they already chose something, or left the screen
        if (allowed) {
          locateMe();
        } else {
          setStatus('idle');
          update((c) => ({ ...c, near: '' }));
        }
      });
    }
    return () => { attempt.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSort = useCallback((sort: Choice['sort']) => {
    update((c) => ({ ...c, sort }));
    setStatus((s) => (s === 'denied' || s === 'unavailable' || s === 'timeout' ? 'idle' : s));
  }, [update]);

  const setNear = useCallback((near: Near) => {
    update((c) => ({ ...c, near }));
    if (near === 'here') {
      locateMe();
    } else {
      attempt.current++;
      setStatus('idle');
    }
  }, [update, locateMe]);

  const reset = useCallback(() => {
    attempt.current++;
    setStatus('idle');
    update(() => NO_CHOICE);
  }, [update]);

  const { sort, near } = choice;
  /** The sort part of GET /v1/movies/:id/showtimes. Soonest until there is somewhere to measure from. */
  const query: Pick<ShowtimeFilters, 'sort' | 'nearArea' | 'lat' | 'lon'> =
    sort === 'distance' && near === 'here' && coords ? { sort: 'distance', lat: coords.lat, lon: coords.lon }
      : sort === 'distance' && near && near !== 'here' ? { sort: 'distance', nearArea: near }
        : { sort: 'soonest' };

  return { sort, near, status, query, byDistance: query.sort === 'distance', setSort, setNear, retry: locateMe, reset };
}

export type DistanceSort = ReturnType<typeof useDistanceSort>;
