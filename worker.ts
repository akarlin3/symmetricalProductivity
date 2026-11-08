import {
  onRequestOptions as geminiProOptions,
  onRequestPost as geminiProPost,
} from './symmetrical-productivity/functions/api/gemini-pro';

interface Fetcher {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface WorkerEnv {
  GEMINI_API_KEY?: string;
  PRO_MODE_PASSWORD?: string;
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
        return geminiProPost({ request, env });
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
