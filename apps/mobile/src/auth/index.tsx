import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { claimDeviceBookings } from '../api/accounts';
import { authApi, type Account, type SignUp } from '../api/auth';
import { ApiError, onSessionExpired, setAuthToken } from '../api/client';

const KEY = 'yalla.session';

type Auth = {
  /** The signed-in account, or null for a guest. */
  account: Account | null;
  /** False until the saved session has been checked. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<Account>;
  signUp: (details: SignUp) => Promise<Account>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);

/** Keeps the session token in AsyncStorage and the API client, and the signed-in account in context. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  /** The token in use, so a late 401 from an earlier session can't sign out a newer one. */
  const current = useRef<string | null>(null);

  const start = useCallback(async ({ token, account: signedIn }: { token: string; account: Account }) => {
    current.current = token;
    setAuthToken(token);
    // Guest bookings made on this device join the account's history. Never blocks signing in.
    await claimDeviceBookings().catch(() => {});
    setAccount(signedIn);
    await AsyncStorage.setItem(KEY, token).catch(() => {});
    return signedIn;
  }, []);

  const clear = useCallback(async () => {
    current.current = null;
    setAuthToken(null);
    setAccount(null);
    await AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .catch(() => null)
      .then(async (token) => {
        if (!token) return;
        current.current = token;
        setAuthToken(token);
        try {
          setAccount(await authApi.me());
        } catch (e) {
          // An expired session signs out (below); a network error keeps the token for next time.
          if (!(e instanceof ApiError && e.status === 401)) setAuthToken(token);
        }
      })
      .finally(() => setReady(true));
  }, []);

  // Any request that gets 401 for this session (it expired, or the server's data was reset) signs out, once,
  // so every screen falls back to its signed-out state.
  useEffect(() => {
    onSessionExpired((token) => {
      if (token === current.current) clear();
    });
    return () => onSessionExpired(undefined);
  }, [clear]);

  const value = useMemo<Auth>(() => ({
    account,
    ready,
    signIn: async (email, password) => start(await authApi.signIn(email, password)),
    signUp: async (details) => start(await authApi.signUp(details)),
    signOut: async () => {
      await authApi.signOut().catch(() => {});
      await clear();
    },
  }), [account, ready, start, clear]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
