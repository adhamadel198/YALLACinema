import { router, type Href } from 'expo-router';

/**
 * A `next` path is followed only when it is a path inside the app, so a crafted link can't send
 * someone to another site after they sign in.
 */
export function safeNext(next: string | string[] | undefined): string | undefined {
  const path = Array.isArray(next) ? next[0] : next;
  return path && /^\/(?![/\\])/.test(path) && !path.includes('\\') ? path : undefined;
}

/**
 * The sign-in screen, coming back to `next` (a path in the app) afterwards. For other features, e.g.
 * `router.push(signInHref('/resale'))`. Without `next`, sign-in goes back to the previous screen.
 */
export const signInHref = (next?: string, email?: string): Href =>
  ({ pathname: '/sign-in', params: { ...(next && { next }), ...(email && { email }) } });

export const signUpHref = (next?: string, email?: string): Href =>
  ({ pathname: '/sign-up', params: { ...(next && { next }), ...(email && { email }) } });

/**
 * After signing in or up: back to `next` (returning to that screen as it was, if it is still open
 * underneath), else to the previous screen, else the Profile tab.
 */
export function leaveSignIn(next: string | undefined) {
  if (next) router.dismissTo(next as Href);
  else if (router.canGoBack()) router.back();
  else router.replace('/account');
}
