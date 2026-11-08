import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..');
const distDir = path.join(appRoot, 'dist');
const assetsDir = path.join(distDir, 'assets');

const assetFiles = fs.readdirSync(assetsDir);
const cssFile = assetFiles.find((f) => f.endsWith('.css'));
const jsFile = assetFiles.find((f) => f.endsWith('.js') && f.startsWith('index-'));

if (!cssFile || !jsFile) {
  console.error('Could not find compiled CSS or JS in dist/assets');
  process.exit(1);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const jsContent = fs
  .readFileSync(path.join(assetsDir, jsFile), 'utf8')
  .replace(/<\/script>/gi, '<\\/script>');

// Render initial SSR HTML of <App /> so <div id="root"> is immediately populated even before JS executes
let ssrHtml = '';
try {
  ssrHtml = execSync(
    `npx tsx -e "import React from 'react'; import { renderToString } from 'react-dom/server'; import App from './src/App.tsx'; process.stdout.write(renderToString(React.createElement(App)));"`,
    { cwd: appRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (err) {
  console.error('SSR pre-render failed:', err);
  process.exit(1);
}

const safeSwScript = `<script>
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      window.addEventListener('load', function () {
        try {
          navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
        } catch (e) {}
      });
    }
  } catch (e) {}
</script>`;

const selfContainedDistHtml = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <meta name="theme-color" content="#0f172a" />
    <meta
      name="description"
      content="Symmetrical Productivity — Mobile-first focus pipeline, two-stage 20m work timers, break triage router, evening recharge menu, and 4-rung roadmap ledger."
    />
    <title>Symmetrical Productivity</title>
    <style>${cssContent}</style>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
    <div id="root">${ssrHtml}</div>
    <script type="module">${jsContent}</script>
    ${safeSwScript}
  </body>
</html>
`;

const sourceIndexHtml = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <meta name="theme-color" content="#0f172a" />
    <meta
      name="description"
      content="Symmetrical Productivity — Mobile-first focus pipeline, two-stage 20m work timers, break triage router, evening recharge menu, and 4-rung roadmap ledger."
    />
    <title>Symmetrical Productivity</title>
    <!-- INLINE_FALLBACK_STYLE_START --><style>${cssContent}</style><!-- INLINE_FALLBACK_STYLE_END -->
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
    <div id="root"><!-- INLINE_FALLBACK_ROOT_START -->${ssrHtml}<!-- INLINE_FALLBACK_ROOT_END --></div>
    <script type="module" src="/src/main.tsx"></script>
    <!-- INLINE_FALLBACK_SCRIPT_START --><script type="module">${jsContent}</script><!-- INLINE_FALLBACK_SCRIPT_END -->
  </body>
</html>
`;

// Write self-contained dist/index.html, repo-root index.html, and source index.html with inline fallback
fs.writeFileSync(path.join(distDir, 'index.html'), selfContainedDistHtml, 'utf8');
fs.writeFileSync(path.join(repoRoot, 'index.html'), selfContainedDistHtml, 'utf8');
fs.writeFileSync(path.join(appRoot, 'index.html'), sourceIndexHtml, 'utf8');

// Copy manifest.webmanifest, favicon.svg, sw.js, sw-alarms.js to repo root for root static hosting
for (const file of fs.readdirSync(distDir)) {
  const srcPath = path.join(distDir, file);
  if (fs.statSync(srcPath).isFile() && file !== 'index.html') {
    fs.copyFileSync(srcPath, path.join(repoRoot, file));
  }
}

console.log(
  'Inlined CSS (' +
    cssContent.length +
    'B), SSR HTML (' +
    ssrHtml.length +
    'B), and JS (' +
    jsContent.length +
    'B) into dist/index.html, root index.html, and symmetrical-productivity/index.html'
);
