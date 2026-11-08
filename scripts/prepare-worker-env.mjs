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
    ')'
);
