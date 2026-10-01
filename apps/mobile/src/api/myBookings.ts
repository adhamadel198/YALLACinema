import AsyncStorage from '@react-native-async-storage/async-storage';

// Guests have no account, so the device remembers their booking ids (each id is the key to its tickets).
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
