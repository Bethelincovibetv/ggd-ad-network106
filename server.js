/**
 * Production & Deployment Entry Point (Root server.js)
 * Supports Render, Heroku, Railway, Docker, and local Node.js environments.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidateServers = [
  path.join(__dirname, 'dist', 'server.cjs'),
  path.join(process.cwd(), 'dist', 'server.cjs'),
];

let started = false;
for (const distServer of candidateServers) {
  if (fs.existsSync(distServer)) {
    await import(`file://${distServer}`);
    started = true;
    break;
  }
}

if (!started) {
  try {
    const { register } = await import('tsx/esm/api');
    register();
    await import('./server.ts');
  } catch (err) {
    await import('./server.ts');
  }
}
