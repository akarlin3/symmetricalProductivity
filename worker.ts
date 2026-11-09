import {
  onRequestOptions as geminiProOptions,
  onRequestPost as geminiProPost,
} from './symmetrical-productivity/functions/api/gemini-pro';
import { WORKER_BUILD_ENV } from './worker-build-env';

interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface WorkerEnv {
  GEMINI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
  PRO_MODE_PASSWORD?: string;
  PRO_PASSWORD?: string;
  VITE_PRO_MODE_PASSWORD?: string;
  VITE_FIREBASE_API_KEY?: string;
  FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  FIREBASE_APP_ID?: string;
  ASSETS?: Fetcher;
}

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pro-password',
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/firebase-config to expose public VITE_FIREBASE_* keys configured in Cloudflare Worker vars
    if (
      url.pathname === '/api/firebase-config' ||
      url.pathname === '/api/firebase-config/'
    ) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
      const config = {
        apiKey: (
          env.VITE_FIREBASE_API_KEY ||
          env.FIREBASE_API_KEY ||
          WORKER_BUILD_ENV.VITE_FIREBASE_API_KEY ||
          ''
        ).trim(),
        authDomain: (
          env.VITE_FIREBASE_AUTH_DOMAIN ||
          env.FIREBASE_AUTH_DOMAIN ||
          WORKER_BUILD_ENV.VITE_FIREBASE_AUTH_DOMAIN ||
          ''
        ).trim(),
        projectId: (
          env.VITE_FIREBASE_PROJECT_ID ||
          env.FIREBASE_PROJECT_ID ||
          WORKER_BUILD_ENV.VITE_FIREBASE_PROJECT_ID ||
          ''
        ).trim(),
        storageBucket: (
          env.VITE_FIREBASE_STORAGE_BUCKET ||
          env.FIREBASE_STORAGE_BUCKET ||
          WORKER_BUILD_ENV.VITE_FIREBASE_STORAGE_BUCKET ||
          ''
        ).trim(),
        messagingSenderId: (
          env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
          env.FIREBASE_MESSAGING_SENDER_ID ||
          WORKER_BUILD_ENV.VITE_FIREBASE_MESSAGING_SENDER_ID ||
          ''
        ).trim(),
        appId: (
          env.VITE_FIREBASE_APP_ID ||
          env.FIREBASE_APP_ID ||
          WORKER_BUILD_ENV.VITE_FIREBASE_APP_ID ||
          ''
        ).trim(),
      };
      const configured = Boolean(
        config.apiKey && config.authDomain && config.projectId && config.appId
      );
      return new Response(JSON.stringify({ configured, config }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    // Route /api/gemini-pro to the Pro Mode Cloudflare proxy handler
    if (
      url.pathname === '/api/gemini-pro' ||
      url.pathname === '/api/gemini-pro/'
    ) {
      if (request.method === 'OPTIONS') {
        return geminiProOptions();
      }
      if (request.method === 'POST') {
        const mergedEnv: WorkerEnv = {
          GEMINI_API_KEY:
            env.GEMINI_API_KEY ||
            env.VITE_GEMINI_API_KEY ||
            WORKER_BUILD_ENV.GEMINI_API_KEY ||
            '',
          PRO_MODE_PASSWORD:
            env.PRO_MODE_PASSWORD ||
            env.PRO_PASSWORD ||
            env.VITE_PRO_MODE_PASSWORD ||
            WORKER_BUILD_ENV.PRO_MODE_PASSWORD ||
            '',
        };
        return geminiProPost({ request, env: mergedEnv });
      }
      return new Response(
        JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
        {
          status: 405,
          headers: CORS_HEADERS,
        }
      );
    }

    // Delegate static files and SPA routes to Cloudflare Static Assets binding
    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404 && assetRes.status !== 403) {
        return assetRes;
      }
      // Fallback to /index.html for SPA navigation
      const indexUrl = new URL('/index.html', request.url);
      return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    }

    return new Response('Not Found', { status: 404 });
  },
};
