import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { claimDeviceBookings } from '../api/accounts';
import { authApi, type Account, type SignUp } from '../api/auth';
import { ApiError, setAuthToken } from '../api/client';

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

  const start = useCallback(async ({ token, account: signedIn }: { token: string; account: Account }) => {
    setAuthToken(token);
    // Guest bookings made on this device join the account's history. Never blocks signing in.
    await claimDeviceBookings().catch(() => {});
    setAccount(signedIn);
    await AsyncStorage.setItem(KEY, token).catch(() => {});
    return signedIn;
  }, []);

  const clear = useCallback(async () => {
    setAuthToken(null);
    setAccount(null);
    await AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .catch(() => null)
      .then(async (token) => {
        if (!token) return;
        setAuthToken(token);
        try {
          setAccount(await authApi.me());
        } catch (e) {
          // An expired session signs out; a network error keeps the token for next time.
          if (e instanceof ApiError && e.status === 401) await clear();
          else setAuthToken(token);
        }
      })
      .finally(() => setReady(true));
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
