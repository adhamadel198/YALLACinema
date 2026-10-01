import { RECENT_FIX_MS, type LocateResult } from './types';

/**
 * Web: the browser's geolocation, which shows its own permission prompt the first time (only once
 * the customer has chosen "Use my location"). Browsers allow it on HTTPS and localhost only.
 */
export function locate(timeoutMs: number): Promise<LocateResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve({ ok: false, reason: 'unavailable' });
  // On plain http (e.g. a dev server opened by IP address) the browser refuses without asking.
  if (typeof window !== 'undefined' && window.isSecureContext === false) return Promise.resolve({ ok: false, reason: 'unavailable' });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ ok: true, coords: { lat: coords.latitude, lon: coords.longitude } }),
      (error) => resolve({
        ok: false,
        reason: error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable',
      }),
      // Browsers start this timeout once the customer has answered the permission prompt.
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: RECENT_FIX_MS },
    );
  });
}

/** Whether `locate` would get a position without showing the browser's permission prompt. */
export async function canLocateWithoutAsking(): Promise<boolean> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted';
  } catch {
    return false;
  }
}
