import { buildApp } from './app.ts';

const port = Number(process.env.PORT ?? 4000);
const app = await buildApp({ logger: true });
// 0.0.0.0 so a phone running Expo Go on the same Wi-Fi can reach the API.
await app.listen({ port, host: '0.0.0.0' });
