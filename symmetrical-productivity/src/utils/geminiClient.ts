import { Capacitor } from '@capacitor/core';
import { TrackId } from '../types/symmetry';

export const PRO_MODE_UNLOCKED_STORAGE_KEY = 'proModeUnlocked';
export const PRO_PASSWORD_TOKEN_STORAGE_KEY = 'proPasswordToken';
export const PRO_CLOUDFLARE_ORIGIN_STORAGE_KEY = 'proCloudflareOrigin';
export const BYOK_GEMINI_KEY_STORAGE_KEY = 'geminiApiKey';
export const LEGACY_ASSISTANT_BYOK_STORAGE_KEY = 'symmetry_gemini_api_key_v1';

export const PRO_MODE_CHANGE_EVENT = 'symmetry-pro-mode-change';

const DEFAULT_CLOUDFLARE_PRO_ORIGIN = 'https://symmetry.averynik.org';

export interface GeminiGeneratePayload {
  model?: string;
  contents: unknown[];
  systemInstruction?: unknown;
  generationConfig?: Record<string, unknown>;
}

export interface GeminiClientResult<TFallback = unknown> {
  ok: boolean;
  source: 'PRO_CLOUDFLARE' | 'BYOK_DIRECT' | 'LOCAL_FALLBACK';
  text: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawResponse?: any;
  fallbackData?: TFallback;
}

export interface DeliverableSplitResult {
  startupStep5m: string;
  subStepsSummary: string;
  milestones: string[];
  source: 'PRO_CLOUDFLARE' | 'BYOK_DIRECT' | 'LOCAL_FALLBACK';
}

function notifyProModeChange(): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(PRO_MODE_CHANGE_EVENT));
    } catch {
      // Ignore event dispatch errors in restricted contexts
    }
  }
}

export function getProPasswordToken(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (
        window.localStorage.getItem(PRO_PASSWORD_TOKEN_STORAGE_KEY) || ''
      ).trim();
    }
  } catch {
    // Ignore storage read errors
  }
  return '';
}

export function isProModeUnlocked(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const unlockedFlag =
        window.localStorage.getItem(PRO_MODE_UNLOCKED_STORAGE_KEY) === 'true';
      const token = getProPasswordToken();
      return Boolean(unlockedFlag && token);
    }
  } catch {
    // Ignore storage read errors
  }
  return false;
}

export function setProModeSession(
  unlocked: boolean,
  passwordToken: string = ''
): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cleanToken = passwordToken.trim();
      if (unlocked && cleanToken) {
        window.localStorage.setItem(PRO_MODE_UNLOCKED_STORAGE_KEY, 'true');
        window.localStorage.setItem(PRO_PASSWORD_TOKEN_STORAGE_KEY, cleanToken);
      } else {
        window.localStorage.setItem(PRO_MODE_UNLOCKED_STORAGE_KEY, 'false');
        window.localStorage.removeItem(PRO_PASSWORD_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage write errors
  }
  notifyProModeChange();
}

export function lockProMode(): void {
  setProModeSession(false, '');
}

export function getPersonalByokKey(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const primary = (
        window.localStorage.getItem(BYOK_GEMINI_KEY_STORAGE_KEY) || ''
      ).trim();
      if (primary) return primary;
      const legacy = (
        window.localStorage.getItem(LEGACY_ASSISTANT_BYOK_STORAGE_KEY) || ''
      ).trim();
      if (legacy) return legacy;
    }
  } catch {
    // Ignore storage read errors
  }
  try {
    const envObj = (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    )?.env;
    return (envObj?.VITE_GEMINI_API_KEY || '').trim();
  } catch {
    return '';
  }
}

export function setPersonalByokKey(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const trimmed = key.trim();
      if (trimmed) {
        window.localStorage.setItem(BYOK_GEMINI_KEY_STORAGE_KEY, trimmed);
        window.localStorage.setItem(LEGACY_ASSISTANT_BYOK_STORAGE_KEY, trimmed);
      } else {
        window.localStorage.removeItem(BYOK_GEMINI_KEY_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_ASSISTANT_BYOK_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage write errors
  }
  notifyProModeChange();
}

export function hasActiveGeminiAccess(): boolean {
  return isProModeUnlocked() || Boolean(getPersonalByokKey());
}

export function getActiveGeminiAccessTier(): 'PRO' | 'BYOK' | 'OFFLINE' {
  if (isProModeUnlocked()) return 'PRO';
  if (getPersonalByokKey()) return 'BYOK';
  return 'OFFLINE';
}

/**
 * Resolves the Cloudflare Pages Function URL (`/api/gemini-pro` in web browsers,
 * or `https://<cloudflare-domain>/api/gemini-pro` inside the Capacitor Android wrapper).
 */
export function getCloudflareProEndpointUrl(): string {
  try {
    const envObj = (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    )?.env;
    const envOrigin = (envObj?.VITE_CLOUDFLARE_PRO_DOMAIN || '').trim();
    const storedOrigin =
      typeof window !== 'undefined' && window.localStorage
        ? (
            window.localStorage.getItem(PRO_CLOUDFLARE_ORIGIN_STORAGE_KEY) || ''
          ).trim()
        : '';

    const isNativeAndroidOrIos =
      typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform();

    const isStaticGithubPagesHost =
      typeof window !== 'undefined' &&
      window.location &&
      window.location.hostname.endsWith('.github.io');

    if (isNativeAndroidOrIos || isStaticGithubPagesHost) {
      const baseOrigin = (
        storedOrigin ||
        envOrigin ||
        DEFAULT_CLOUDFLARE_PRO_ORIGIN
      ).replace(/\/+$/, '');
      return `${baseOrigin}/api/gemini-pro`;
    }

    if (storedOrigin) {
      return `${storedOrigin.replace(/\/+$/, '')}/api/gemini-pro`;
    }
  } catch {
    // Fallback to relative path
  }
  return '/api/gemini-pro';
}

/**
 * Verifies the entered Pro Mode password against the Cloudflare Pages Function
 * (`POST /api/gemini-pro` with `{ action: "verify" }`).
 * Only unlocks Pro Mode if the endpoint returns HTTP 200 OK `{ ok: true, mode: "pro" }`.
 */
export async function verifyProModePassword(
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = password.trim();
  if (!trimmed) {
    return { ok: false, error: 'Enter a Pro Mode password.' };
  }

  try {
    const response = await fetch(getCloudflareProEndpointUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pro-password': trimmed,
      },
      body: JSON.stringify({
        action: 'verify',
        password: trimmed,
      }),
    });

    if (response.status === 200) {
      const data = await response.json().catch(() => null);
      if (data && data.ok === true) {
        setProModeSession(true, trimmed);
        return { ok: true };
      }
    }

    const errJson = await response.json().catch(() => null);
    const errorMsg =
      (errJson && typeof errJson.error === 'string' && errJson.error) ||
      (response.status === 401
        ? 'Invalid Pro Mode password'
        : `Verification failed (HTTP ${response.status})`);
    return { ok: false, error: errorMsg };
  } catch {
    return {
      ok: false,
      error: 'Could not reach /api/gemini-pro verification endpoint.',
    };
  }
}

/**
 * Extracts `<password>` if the user typed `/pro <password>` in the Command Bar.
 */
export function parseProCommandFromInput(rawInput: string): string | null {
  const match = rawInput.trim().match(/^\/pro\s+(.+)$/i);
  if (!match) return null;
  const pwd = match[1].trim();
  return pwd || null;
}

/**
 * Explicitly strips `proModeUnlocked`, `proPasswordToken`, and `geminiApiKey`
 * from any exported state object so secrets never leak into `state.json` or `state.md`.
 */
export function stripProSecretsFromStateObject<T>(stateObj: T): T {
  if (!stateObj || typeof stateObj !== 'object') return stateObj;
  const clone = JSON.parse(JSON.stringify(stateObj)) as Record<string, unknown>;
  delete clone.proModeUnlocked;
  delete clone.proPasswordToken;
  delete clone.geminiApiKey;
  return clone as T;
}

/**
 * Unified AI Router (`callGemini(payload)`):
 * - Priority 1 (Pro Mode Active): POST to `/api/gemini-pro` with header `x-pro-password: proPasswordToken`
 *   (or full Cloudflare domain URL when inside Capacitor Android wrapper).
 * - Priority 2 (Personal BYOK Key): Direct browser call to Gemini REST endpoint.
 * - Priority 3 (Offline Fallback): Deterministic local parser callback.
 */
export async function callGemini<TFallback = undefined>(
  payload: GeminiGeneratePayload,
  fallbackParser?: () => TFallback | Promise<TFallback>
): Promise<GeminiClientResult<TFallback>> {
  const model = payload.model?.trim() || 'gemini-2.5-flash';

  // Priority 1: Pro Mode Active -> Cloudflare Pages Function Proxy (`/api/gemini-pro`)
  if (isProModeUnlocked()) {
    const proToken = getProPasswordToken();
    if (proToken) {
      try {
        const proResponse = await fetch(getCloudflareProEndpointUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pro-password': proToken,
          },
          body: JSON.stringify({
            action: 'generate',
            model,
            contents: payload.contents,
            systemInstruction: payload.systemInstruction,
            generationConfig: payload.generationConfig,
          }),
        });

        if (proResponse.ok) {
          const data = await proResponse.json();
          const candidateText: string | null =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          if (candidateText) {
            return {
              ok: true,
              source: 'PRO_CLOUDFLARE',
              text: candidateText,
              rawResponse: data,
            };
          }
        } else if (proResponse.status === 401) {
          // Token no longer matches server secret; lock Pro Mode
          lockProMode();
        }
      } catch {
        // Network error reaching Cloudflare proxy; fall through to Priority 2 / Priority 3
      }
    }
  }

  // Priority 2: Personal BYOK Key -> Direct Gemini REST endpoint
  const byokKey = getPersonalByokKey();
  if (byokKey) {
    try {
      const directEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(byokKey)}`;

      const directBody: Record<string, unknown> = {
        contents: payload.contents,
      };
      if (payload.systemInstruction !== undefined) {
        directBody.systemInstruction = payload.systemInstruction;
      }
      if (payload.generationConfig !== undefined) {
        directBody.generationConfig = payload.generationConfig;
      }

      const directResponse = await fetch(directEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(directBody),
      });

      if (directResponse.ok) {
        const data = await directResponse.json();
        const candidateText: string | null =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        if (candidateText) {
          return {
            ok: true,
            source: 'BYOK_DIRECT',
            text: candidateText,
            rawResponse: data,
          };
        }
      }
    } catch {
      // Fall through to Priority 3 offline fallback
    }
  }

  // Priority 3: Offline Fallback -> Deterministic local parser
  const fallbackData = fallbackParser ? await fallbackParser() : undefined;
  return {
    ok: false,
    source: 'LOCAL_FALLBACK',
    text: null,
    fallbackData,
  };
}

/**
 * Deterministic local fallback for the 8-Block Deliverable Splitter.
 */
export function splitDeliverableLocal(
  title: string,
  totalBlocks: number = 8,
  trackId: TrackId = 'writing'
): DeliverableSplitResult {
  const cleanTitle = title.trim() || '2-Page Deliverable';
  const blocks = Math.max(1, Math.min(24, totalBlocks || 8));

  let startupStep5m = `Open working document for "${cleanTitle}", outline section headings, and draft the first 3 bullet lines.`;
  if (blocks === 4 || /slide|deck|presentation/i.test(cleanTitle)) {
    startupStep5m = `Open slide deck for "${cleanTitle}", create 4 slide headers, and paste primary figure into Slide 1.`;
  } else if (trackId === 'coding') {
    startupStep5m = `Open workspace for "${cleanTitle}" and run 1 single 5m diagnostic or build step.`;
  } else if (trackId === 'science') {
    startupStep5m = `Open primary data/reference source for "${cleanTitle}" and write down 3 core mechanisms.`;
  }

  const milestones: string[] =
    blocks <= 4
      ? [
          `Block 1 (20m): 5m Startup (${startupStep5m}) + architecture & slide headers`,
          `Block 2 (20m): Primary figure panels & data table placement`,
          `Block 3 (20m): Mechanism bullet condensation & speaker notes`,
          `Block 4 (20m): Visual verification & final export lock`,
        ]
      : [
          `Blocks 1–2 (40m): 5m Startup (${startupStep5m}) + structural outline & core thesis`,
          `Blocks 3–4 (40m): Primary section drafting & mechanism synthesis`,
          `Blocks 5–6 (40m): Results/discussion integration & figure cross-checks`,
          `Blocks 7–${blocks} (40m): Citation verification, line edits & submission lock`,
        ];

  return {
    startupStep5m,
    subStepsSummary: milestones.join(' • '),
    milestones,
    source: 'LOCAL_FALLBACK',
  };
}

/**
 * 8-Block Deliverable Splitter powered by `callGemini(payload)`
 * (Priority 1: Pro Mode `/api/gemini-pro`, Priority 2: BYOK Key, Priority 3: Local Splitter).
 */
export async function splitDeliverableWithGemini(
  title: string,
  totalBlocks: number = 8,
  trackId: TrackId = 'writing'
): Promise<DeliverableSplitResult> {
  const cleanTitle = title.trim() || '2-Page Paper Draft';
  const blocks = Math.max(1, Math.min(24, totalBlocks || 8));

  const systemPrompt = [
    'You are the mechanical 8-Block Deliverable Splitter for SymmetryManager.',
    'STRICT TONE RULES: Keep all labels strictly functional, concise, and mechanical. Zero philosophical, religious, or preachy text.',
    `Split the deliverable "${cleanTitle}" (${blocks} total 20-minute blocks, track: ${trackId}) into:`,
    '1. startupStep5m: A concrete, zero-friction 5-minute physical startup action (IGNITION_5M).',
    '2. milestones: An array of 4 concise block-by-block milestone strings covering all blocks.',
  ].join('\n');

  const res = await callGemini(
    {
      model: 'gemini-2.5-flash',
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Deliverable: "${cleanTitle}" (${blocks} blocks, track: ${trackId}). Return JSON with startupStep5m and milestones.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            startupStep5m: { type: 'STRING' },
            milestones: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['startupStep5m', 'milestones'],
        },
        temperature: 0.2,
      },
    },
    () => splitDeliverableLocal(cleanTitle, blocks, trackId)
  );

  if (res.ok && res.text) {
    try {
      const parsed = JSON.parse(res.text) as {
        startupStep5m?: string;
        milestones?: string[];
      };
      const localFallback = splitDeliverableLocal(cleanTitle, blocks, trackId);
      const startupStep5m =
        typeof parsed.startupStep5m === 'string' && parsed.startupStep5m.trim()
          ? parsed.startupStep5m.trim()
          : localFallback.startupStep5m;
      const milestones =
        Array.isArray(parsed.milestones) && parsed.milestones.length > 0
          ? parsed.milestones.map((m) => String(m).trim()).filter(Boolean)
          : localFallback.milestones;
      return {
        startupStep5m,
        subStepsSummary: milestones.join(' • '),
        milestones,
        source: res.source,
      };
    } catch {
      // Fallback to local result below
    }
  }

  return res.fallbackData || splitDeliverableLocal(cleanTitle, blocks, trackId);
}
