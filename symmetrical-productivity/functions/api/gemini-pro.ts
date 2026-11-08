export interface Env {
  GEMINI_API_KEY?: string;
  VITE_GEMINI_API_KEY?: string;
  PRO_MODE_PASSWORD?: string;
  PRO_PASSWORD?: string;
  VITE_PRO_MODE_PASSWORD?: string;
}

export interface PagesFunctionContext {
  request: Request;
  env: Env;
}

interface GeminiProRequestBody {
  action?: 'verify' | 'generate';
  password?: string;
  model?: string;
  contents?: unknown;
  systemInstruction?: unknown;
  generationConfig?: unknown;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-pro-password, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function normalizePasswordCandidate(raw: string): string {
  return raw
    .trim()
    .replace(/^\/pro\s+/i, '')
    .trim();
}

/**
 * Computes SHA-256 digests of both strings and compares them in constant time
 * via `crypto.subtle.timingSafeEqual` so timing side-channel attacks are impossible.
 */
async function timingSafePasswordCompare(
  enteredPassword: string,
  expectedPassword: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [enteredDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(enteredPassword)),
    crypto.subtle.digest('SHA-256', encoder.encode(expectedPassword)),
  ]);

  const subtleWithTimingSafe = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (
      a: ArrayBuffer | ArrayBufferView,
      b: ArrayBuffer | ArrayBufferView
    ) => boolean;
  };

  let digestsEqual = false;
  if (typeof subtleWithTimingSafe.timingSafeEqual === 'function') {
    digestsEqual = subtleWithTimingSafe.timingSafeEqual(
      enteredDigest,
      expectedDigest
    );
  } else {
    const viewA = new Uint8Array(enteredDigest);
    const viewB = new Uint8Array(expectedDigest);
    if (viewA.byteLength === viewB.byteLength) {
      let diff = 0;
      for (let i = 0; i < viewA.byteLength; i++) {
        diff |= viewA[i] ^ viewB[i];
      }
      digestsEqual = diff === 0;
    }
  }

  return Boolean(enteredPassword && expectedPassword && digestsEqual);
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost = async (
  context: PagesFunctionContext
): Promise<Response> => {
  const { request, env } = context;

  let body: GeminiProRequestBody = {};
  try {
    body = (await request.json()) as GeminiProRequestBody;
  } catch {
    body = {};
  }

  const headerPassword = request.headers.get('x-pro-password');
  const bodyPassword = typeof body.password === 'string' ? body.password : '';
  const enteredPassword = normalizePasswordCandidate(
    headerPassword ?? bodyPassword ?? ''
  );

  const configuredSecretPassword = normalizePasswordCandidate(
    env.PRO_MODE_PASSWORD ||
      env.PRO_PASSWORD ||
      env.VITE_PRO_MODE_PASSWORD ||
      ''
  );

  if (!configuredSecretPassword) {
    return jsonResponse(
      {
        error:
          'PRO_MODE_PASSWORD is not set in Cloudflare Worker Runtime Variables & Secrets (Settings -> Variables and Secrets).',
      },
      500
    );
  }

  const isValidPassword = await timingSafePasswordCompare(
    enteredPassword,
    configuredSecretPassword
  );

  if (!isValidPassword) {
    return jsonResponse({ error: 'Invalid Pro Mode password' }, 401);
  }

  const action = body.action || 'generate';

  if (action === 'verify') {
    return jsonResponse({ ok: true, mode: 'pro' }, 200);
  }

  if (action === 'generate') {
    const geminiApiKey = (
      env.GEMINI_API_KEY ||
      env.VITE_GEMINI_API_KEY ||
      ''
    ).trim();
    if (!geminiApiKey) {
      return jsonResponse(
        { error: 'Server GEMINI_API_KEY secret is not configured' },
        500
      );
    }

    const model =
      typeof body.model === 'string' && body.model.trim()
        ? body.model.trim()
        : 'gemini-2.5-flash';

    const upstreamPayload: Record<string, unknown> = {};
    if (body.contents !== undefined) {
      upstreamPayload.contents = body.contents;
    }
    if (body.systemInstruction !== undefined) {
      upstreamPayload.systemInstruction = body.systemInstruction;
    }
    if (body.generationConfig !== undefined) {
      upstreamPayload.generationConfig = body.generationConfig;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${geminiApiKey}`;

    try {
      const upstreamResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(upstreamPayload),
      });

      const responseData = await upstreamResponse.json();
      return jsonResponse(responseData, upstreamResponse.status);
    } catch {
      return jsonResponse(
        { error: 'Failed to reach upstream Gemini API' },
        502
      );
    }
  }

  return jsonResponse({ error: `Unsupported action: ${String(action)}` }, 400);
};
