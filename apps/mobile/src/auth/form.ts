import { ApiError } from '../api/client';
import type { Strings } from '../i18n/strings';

// The same rules the API checks (apps/api/src/routes/schemas.ts), so most mistakes are caught before sending.
export const isName = (s: string) => s.trim().length >= 2;
export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
export const isMobile = (s: string) => /^\+?[0-9 ]{8,16}$/.test(s.trim());
export const MIN_PASSWORD = 8;

/** What to tell someone whose sign-in or sign-up failed. */
export function authErrorMessage(e: unknown, t: Strings) {
  if (!(e instanceof ApiError)) return t.authOffline;
  if (e.status === 401) return t.authWrongPassword;
  if (e.status === 409) return t.authEmailTaken;
  if (e.status === 429) return t.authTooMany;
  if (e.status === 400) return t.authCheckFields;
  return t.genericError;
}
