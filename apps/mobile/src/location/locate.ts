import * as Location from 'expo-location';
import { RECENT_FIX_MS, type LocateResult } from './types';

/**
 * iOS and Android: asks for foreground location permission (only once the customer has chosen
 * "Use my location"), then gets one position. The web build uses locate.web.ts instead.
 */
export async function locate(timeoutMs: number): Promise<LocateResult> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'unavailable' };

    const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_FIX_MS, requiredAccuracy: 1000 }).catch(() => null);
    // The timeout starts after the permission prompt, so time spent reading it doesn't count.
    const position = recent ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeoutMs));
    if (!position) return { ok: false, reason: 'timeout' };
    return { ok: true, coords: { lat: position.coords.latitude, lon: position.coords.longitude } };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Whether `locate` would get a position without showing the system permission prompt. */
export async function canLocateWithoutAsking(): Promise<boolean> {
  try {
    return (await Location.getForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Resolves with null if `promise` hasn't settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
