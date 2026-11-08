import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const PRISM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  <polygon points="256,72 432,392 80,392" fill="#1e293b" stroke="#38bdf8" stroke-width="20" stroke-linejoin="round"/>
  <polygon points="256,72 432,392 256,312" fill="#0284c7" fill-opacity="0.45"/>
  <polyline points="256,72 256,312 80,392" stroke="#7dd3fc" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="256" y1="312" x2="432" y2="392" stroke="#38bdf8" stroke-width="14" stroke-linecap="round"/>
</svg>`;

const INLINE_PRISM_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  PRISM_SVG.trim().replace(/\s+/g, ' ')
)}`;

export default defineConfig({
  base: './',
  server: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    {
      name: 'serve-self-contained-dist-html',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            try {
              const distHtmlPath = path.resolve(process.cwd(), 'dist/index.html');
              if (fs.existsSync(distHtmlPath)) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(fs.readFileSync(distHtmlPath, 'utf8'));
                return;
              }
            } catch {
              // Fallback to default Vite transform
            }
          }
          next();
        });
      },
    },
    {
      name: 'strip-inline-fallback-before-build',
      apply: 'build',
      enforce: 'pre',
      transformIndexHtml(html) {
        return html
          .replace(/<!-- INLINE_FALLBACK_STYLE_START -->[\s\S]*?<!-- INLINE_FALLBACK_STYLE_END -->/g, '')
          .replace(/<!-- INLINE_FALLBACK_ROOT_START -->[\s\S]*?<!-- INLINE_FALLBACK_ROOT_END -->/g, '')
          .replace(/<!-- INLINE_FALLBACK_SCRIPT_START -->[\s\S]*?<!-- INLINE_FALLBACK_SCRIPT_END -->/g, '');
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        importScripts: ['sw-alarms.js'],
      },
      manifest: {
        id: './',
        name: 'Symmetrical Productivity',
        short_name: 'Symmetrical',
        description:
          'Duration-only focus pipeline, two-stage 20m work blocks, break triage router, evening recharge menu, and 4-rung input/output roadmap.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: './',
        scope: './',
        orientation: 'portrait-primary',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: INLINE_PRISM_ICON,
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: INLINE_PRISM_ICON,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
