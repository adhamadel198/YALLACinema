import { request } from './client';

export type Account = {
  id: string;
  email: string;
  name: string;
  mobile: string;
  role: 'customer' | 'operator';
  /** The cinema an operator works for; null for customers. */
  cinemaId: string | null;
  createdAt: string;
};
export type SignUp = { name: string; email: string; mobile: string; password: string };
type SignedIn = { token: string; account: Account };

export const authApi = {
  signUp: (details: SignUp) => request<SignedIn>('/v1/auth/sign-up', { method: 'POST', body: details }),
  signIn: (email: string, password: string) => request<SignedIn>('/v1/auth/sign-in', { method: 'POST', body: { email, password } }),
  signOut: () => request<void>('/v1/auth/sign-out', { method: 'POST' }),
  me: () => request<Account>('/v1/me'),
};
