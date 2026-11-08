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
  ASSETS?: Fetcher;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

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
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-pro-password',
          },
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
