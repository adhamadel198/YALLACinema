import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';

const mona = { name: 'Mona Adel', email: 'Mona@Example.com', mobile: '+20 100 123 4567', password: 'popcorn-2026' };
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

test('sign up, sign in, see your account, sign out', async () => {
  const app = await buildApp();
  const up = await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona });
  assert.equal(up.statusCode, 201);
  assert.equal(up.json().account.email, 'mona@example.com');
  assert.equal(up.json().account.role, 'customer');
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona })).statusCode, 409);

  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-in', payload: { email: mona.email, password: 'wrong-password' } })).statusCode, 401);
  const signIn = await app.inject({ method: 'POST', url: '/v1/auth/sign-in', payload: { email: 'mona@example.com', password: mona.password } });
  assert.equal(signIn.statusCode, 200);
  const { token } = signIn.json();

  const me = await app.inject({ url: '/v1/me', headers: bearer(token) });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().name, 'Mona Adel');
  assert.equal(me.json().password_hash, undefined);

  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-out', headers: bearer(token) })).statusCode, 204);
  assert.equal((await app.inject({ url: '/v1/me', headers: bearer(token) })).statusCode, 401);
  assert.equal((await app.inject('/v1/me')).statusCode, 401);
});

test('sessions expire after 30 days', async () => {
  let now = Date.now();
  const app = await buildApp({ clock: () => now });
  const { token } = (await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: mona })).json();
  now += 30 * 24 * 60 * 60 * 1000 + 1;
  assert.equal((await app.inject({ url: '/v1/me', headers: bearer(token) })).statusCode, 401);
});

test('sign-up checks its fields', async () => {
  const app = await buildApp();
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: { ...mona, password: 'short' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/auth/sign-up', payload: { ...mona, email: 'nope' } })).statusCode, 400);
});
