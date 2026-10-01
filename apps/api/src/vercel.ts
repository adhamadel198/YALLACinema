import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './app.ts';
import { createDb } from './db/index.ts';

/**
 * Vercel function entry (see scripts/vercel-build.sh). Vercel routes /v1/* and /health here as
 * /api?__path=<original path>, so the original path is restored before Fastify routes the request.
 *
 * Without DATABASE_URL (or POSTGRES_URL, which Vercel's Postgres integrations set) data lives in memory
 * and is lost whenever Vercel starts a new instance: fine for a preview, not for real bookings.
 */
let app: ReturnType<typeof start> | undefined;

async function start() {
  // Vercel sets X-Forwarded-For itself, so the client address in it can be trusted.
  const instance = await buildApp({
    db: await createDb(process.env.DATABASE_URL || process.env.POSTGRES_URL, 'memory://'),
    logger: true,
    trustProxy: true,
  });
  await instance.ready();
  return instance;
}

export function originalUrl(url: string) {
  const parsed = new URL(url, 'http://localhost');
  const path = parsed.searchParams.get('__path');
  if (path === null) return url;
  parsed.searchParams.delete('__path');
  return '/' + path.replace(/^\/+/, '') + parsed.search;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // A failed start (e.g. the database is unreachable) is retried on the next request.
  app ??= start().catch((e) => { app = undefined; throw e; });
  const instance = await app;
  req.url = originalUrl(req.url ?? '/');
  instance.server.emit('request', req, res);
}
