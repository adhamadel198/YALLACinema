import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { accountsApi, claimDeviceBookings } from '../api/accounts';
import { authApi, type Account, type SignUp } from '../api/auth';
import { ApiError, onSessionExpired, setAuthToken } from '../api/client';
import { forgetAccountBookings } from '../api/myBookings';

const KEY = 'yalla.session';

/** What the device keeps: the token and the account it belongs to, so the account shows before the API answers. */
type Session = { token: string; account: Account | null };

/** The saved session. Older builds saved the bare token, without the account. */
function readSaved(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    if (typeof saved?.token === 'string') return { token: saved.token, account: saved.account ?? null };
  } catch {
    // A bare token.
  }
  return { token: raw, account: null };
}

const save = (session: Session) => AsyncStorage.setItem(KEY, JSON.stringify(session)).catch(() => {});

type Auth = {
  /** The signed-in account, or null for a guest. */
  account: Account | null;
  /** False until the saved session has been read (and, if it was saved without its account, checked). */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<Account>;
  signUp: (details: SignUp) => Promise<Account>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);

/** Keeps the session in AsyncStorage and the API client, and the signed-in account in context. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  /** The session in use, so a late answer or 401 from an earlier session can't change a newer one. */
  const session = useRef<Session | null>(null);
  /** The last check of the session couldn't reach the API: check again when the app is back in the foreground. */
  const unchecked = useRef(false);

  /** Requests carry the token only while its account is shown, so the screens and the API always agree. */
  const use = useCallback((next: Session | null) => {
    session.current = next;
    unchecked.current = false;
    setAuthToken(next?.account ? next.token : null);
    setAccount(next?.account ?? null);
  }, []);

  const start = useCallback(async ({ token, account: signedIn }: { token: string; account: Account }) => {
    setAuthToken(token);
    // Guest bookings made on this device join a customer's history; cinema staff signing in on a shared
    // device must not take them. Never blocks signing in.
    if (signedIn.role !== 'operator') await claimDeviceBookings().catch(() => {});
    const next = { token, account: signedIn };
    use(next);
    await save(next);
    return signedIn;
  }, [use]);

  /**
   * Signs out on this device. The account's tickets saved here go too (those in its `history`, and any booking with an
   * account), so a shared device doesn't keep them; guest bookings stay.
   */
  const clear = useCallback(async (history?: string[]) => {
    if (!session.current) return;
    use(null);
    await AsyncStorage.removeItem(KEY).catch(() => {});
    await forgetAccountBookings(history).catch(() => {});
  }, [use]);

  /** Refreshes the account from GET /v1/me. A 401 signs out (below); any other failure keeps the saved account. */
  const check = useCallback(async () => {
    const checking = session.current;
    if (!checking) return;
    try {
      const fresh = await authApi.me(checking.token);
      if (session.current !== checking) return; // Signed out or in meanwhile.
      const next = { token: checking.token, account: fresh };
      use(next);
      await save(next);
    } catch (e) {
      if (session.current === checking && !(e instanceof ApiError && e.status === 401)) unchecked.current = true;
    }
  }, [use]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .catch(() => null)
      .then(async (raw) => {
        const saved = readSaved(raw);
        if (!saved) return;
        use(saved);
        // The saved account shows at once and is refreshed in the background; a token saved without one is checked first.
        if (saved.account) check();
        else await check();
      })
      .finally(() => setReady(true));
  }, [use, check]);

  // A check that couldn't reach the API (e.g. offline at launch) runs again when the app, or the browser tab, is back.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && unchecked.current) check();
    });
    return () => subscription?.remove();
  }, [check]);

  // Any request that gets 401 for this session (it expired, or the server's data was reset) signs out, once,
  // so every screen falls back to its signed-out state.
  useEffect(() => {
    onSessionExpired((token) => {
      if (token === session.current?.token) clear();
    });
    return () => onSessionExpired(undefined);
  }, [clear]);

  const value = useMemo<Auth>(() => ({
    account,
    ready,
    signIn: async (email, password) => start(await authApi.signIn(email, password)),
    signUp: async (details) => start(await authApi.signUp(details)),
    signOut: async () => {
      // Read while still signed in, so the account's tickets leave this device with it.
      const history = await accountsApi.bookings().then((list) => list.map((b) => b.id), () => []);
      await authApi.signOut().catch(() => {});
      await clear(history);
    },
  }), [account, ready, start, clear]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
