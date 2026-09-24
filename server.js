/**
 * Production & Deployment Entry Point (Root server.js)
 * Supports Render, Heroku, Railway, Docker, and local Node.js environments.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distServer = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  // Load bundled production server if dist has been built
  await import(`file://${distServer}`);
} else {
  // Otherwise load TS runtime for development / dynamic execution
  try {
    const { register } = await import('tsx/esm/api');
    register();
    await import('./server.ts');
  } catch (err) {
    // Direct import fallback
    await import('./server.ts');
  }
}
