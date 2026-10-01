// Bundles the API into one Vercel Node function: node scripts/bundle-vercel.mjs <function dir>
import { build } from 'esbuild';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'dist/api.func');
const root = new URL('..', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, 'src/vercel.ts')],
  outfile: join(out, 'index.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // CommonJS dependencies (fastify, pg) call require(); give the ES module bundle one.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  // PGlite loads its WebAssembly files from its own folder, so it is copied rather than bundled.
  external: ['@electric-sql/pglite', 'pg-native'],
  logLevel: 'warning',
});

// src/db/index.ts reads schema/ next to itself, which in the bundle is the function folder.
cpSync(join(root, 'src/db/schema'), join(out, 'schema'), { recursive: true });
cpSync(join(root, 'node_modules/@electric-sql/pglite'), join(out, 'node_modules/@electric-sql/pglite'), { recursive: true });
writeFileSync(join(out, 'package.json'), JSON.stringify({ type: 'module' }));
writeFileSync(join(out, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  supportsResponseStreaming: true,
}, null, 2));
console.log(`API function written to ${out}`);
