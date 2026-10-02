import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './client';

// Guests have no account, so the device remembers their booking ids (each id is the key to its tickets).
// Bookings that belong to an account are forgotten when it signs out (forgetAccountBookings).
const KEY = 'yalla.bookings';

export async function rememberBooking(id: string) {
  const ids = await myBookingIds();
  await AsyncStorage.setItem(KEY, JSON.stringify([id, ...ids.filter((x) => x !== id)]));
}

export async function myBookingIds(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
  } catch {
    return [];
  }
}

/**
 * Forgets the bookings that belong to an account: those in its `history`, and any the API says has an account.
 * Guest bookings stay, and so does a booking that can't be checked right now (e.g. offline).
 */
export async function forgetAccountBookings(history: string[] = []) {
  const known = new Set(history);
  const ids = await myBookingIds();
  const owned = await Promise.all(ids.map((id) => known.has(id) || api.booking(id).then((b) => b.accountId !== null, () => false)));
  const forget = new Set(ids.filter((_, i) => owned[i]));
  if (!forget.size) return;
  // Read again, so a booking remembered meanwhile isn't lost.
  const kept = (await myBookingIds()).filter((id) => !forget.has(id));
  await AsyncStorage.setItem(KEY, JSON.stringify(kept)).catch(() => {});
}
