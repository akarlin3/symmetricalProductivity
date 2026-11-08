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

const googleFontsLinks = `<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=JetBrains+Mono:wght@300;400;500&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet" />`;

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
    <meta name="theme-color" content="#06080d" />
    <meta
      name="description"
      content="Symmetrical Productivity — Split-Screen Dual-Ring HUD, Bento Focus Pipeline, Break Triage Dock, Evening Recharge Sanctuary, and 4-Rung Roadmap."
    />
    <title>Symmetrical Productivity</title>
    ${googleFontsLinks}
    <style>${cssContent}</style>
  </head>
  <body class="bg-[#06080d] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
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
    <meta name="theme-color" content="#06080d" />
    <meta
      name="description"
      content="Symmetrical Productivity — Split-Screen Dual-Ring HUD, Bento Focus Pipeline, Break Triage Dock, Evening Recharge Sanctuary, and 4-Rung Roadmap."
    />
    <title>Symmetrical Productivity</title>
    ${googleFontsLinks}
  </head>
  <body class="bg-[#06080d] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
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
