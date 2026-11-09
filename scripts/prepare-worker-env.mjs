import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const targetFile = path.join(repoRoot, 'worker-build-env.ts');

const buildEnv = {
  GEMINI_API_KEY:
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '',
  PRO_MODE_PASSWORD:
    process.env.PRO_MODE_PASSWORD ||
    process.env.PRO_PASSWORD ||
    process.env.VITE_PRO_MODE_PASSWORD ||
    '',
  VITE_FIREBASE_API_KEY:
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    'AIzaSyDz6sfaU0VJHdDoRG4SRj3LLEYsOmY7vrE',
  VITE_FIREBASE_AUTH_DOMAIN:
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    process.env.FIREBASE_AUTH_DOMAIN ||
    'symmetryproductivity.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID:
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'symmetryproductivity',
  VITE_FIREBASE_STORAGE_BUCKET:
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    'symmetryproductivity.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    '396601505774',
  VITE_FIREBASE_APP_ID:
    process.env.VITE_FIREBASE_APP_ID ||
    process.env.FIREBASE_APP_ID ||
    '1:396601505774:web:5a1abeec27d6bfbe0900ff',
};

const content = `// Auto-generated at Worker deploy time by scripts/prepare-worker-env.mjs
// Runs 100% server-side inside the Cloudflare Worker bundle; never included in client assets.
export const WORKER_BUILD_ENV: Record<string, string> = ${JSON.stringify(buildEnv, null, 2)};
`;

fs.writeFileSync(targetFile, content, 'utf8');
console.log(
  '[prepare-worker-env] Server build env prepared (PRO_MODE_PASSWORD present: ' +
    Boolean(buildEnv.PRO_MODE_PASSWORD) +
    ', GEMINI_API_KEY present: ' +
    Boolean(buildEnv.GEMINI_API_KEY) +
    ', VITE_FIREBASE_API_KEY present: ' +
    Boolean(buildEnv.VITE_FIREBASE_API_KEY) +
    ')'
);
