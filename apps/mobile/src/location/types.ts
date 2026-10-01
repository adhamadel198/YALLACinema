import type { Area } from '../api/types';

export type Coords = { lat: number; lon: number };

/**
 * Why the device location couldn't be used: `denied` (no permission), `unavailable` (no location
 * hardware, location services are off, or the page isn't on HTTPS) or `timeout` (no fix in time).
 */
export type LocateFailure = 'denied' | 'unavailable' | 'timeout';

export type LocateResult = { ok: true; coords: Coords } | { ok: false; reason: LocateFailure };

/** A fix the device already has from the last two minutes is good enough to sort cinemas across a city. */
export const RECENT_FIX_MS = 2 * 60 * 1000;

/** The areas a customer can measure distance from instead of sharing their location (the API's areaCentres). */
export const AREAS: Area[] = ['Downtown Cairo', 'Maadi', 'New Cairo', '6th of October'];
