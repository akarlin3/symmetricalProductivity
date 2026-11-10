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
  blockSubSteps: string[];
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
  const trimmed = password
    .trim()
    .replace(/^\/pro\s+/i, '')
    .trim();
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
 * Deterministic local phase-template splitter (`Outline & Setup` -> `Core Sections` -> `Figures/Equations` -> `Final Polish`)
 * generating one distinct 5-minute startup micro-script per block (`blockSubSteps`).
 */
export function splitDeliverableLocal(
  title: string,
  totalBlocks: number = 8,
  trackId: TrackId = 'writing'
): DeliverableSplitResult {
  const cleanTitle = title.trim() || '2-Page Deliverable';
  const blocks = Math.max(1, Math.min(24, Math.round(totalBlocks || 8)));
  const isSlides = blocks === 4 || /slide|deck|presentation/i.test(cleanTitle);
  const isHardwareOrCode =
    trackId === 'coding' || /printer|k1c|hardware|pipeline|code|repo|build/i.test(cleanTitle);

  const blockSubSteps: string[] = Array.from({ length: blocks }, (_, idx) => {
    const blockNum = idx + 1;
    const progressRatio = blocks === 1 ? 1 : idx / (blocks - 1);

    if (idx === 0) {
      if (isSlides) {
        return `Block 1/${blocks} [Outline & Setup]: Open slide deck for "${cleanTitle}", create slide titles, and drop primary figure on Slide 1.`;
      }
      if (isHardwareOrCode) {
        return `Block 1/${blocks} [Outline & Setup]: Open workspace/bench for "${cleanTitle}" and isolate 1 reproducible 5m diagnostic check.`;
      }
      return `Block 1/${blocks} [Outline & Setup]: Open working doc for "${cleanTitle}", set section headers, and draft 3 scope bullets.`;
    }

    if (progressRatio < 0.5) {
      if (isHardwareOrCode) {
        return `Block ${blockNum}/${blocks} [Core Sections]: Implement or test core module/component #${blockNum - 1} for "${cleanTitle}".`;
      }
      if (isSlides) {
        return `Block ${blockNum}/${blocks} [Core Sections]: Populate mechanism bullets and key claims across middle slides for "${cleanTitle}".`;
      }
      return `Block ${blockNum}/${blocks} [Core Sections]: Draft 1 core body section paragraph + supporting claims for "${cleanTitle}".`;
    }

    if (progressRatio < 0.82) {
      if (isHardwareOrCode) {
        return `Block ${blockNum}/${blocks} [Figures/Verification]: Run verification pass, log telemetry/plots, and tighten edge cases on "${cleanTitle}".`;
      }
      if (isSlides) {
        return `Block ${blockNum}/${blocks} [Figures/Equations]: Label figure axes, verify equations/units, and add speaker cues for "${cleanTitle}".`;
      }
      return `Block ${blockNum}/${blocks} [Figures/Equations]: Insert figure captions, verify equations/data tables, and cross-check citations for "${cleanTitle}".`;
    }

    return `Block ${blockNum}/${blocks} [Final Polish]: Read "${cleanTitle}" top-to-bottom, tighten transitions, and lock submission export.`;
  });

  const startupStep5m = blockSubSteps[0];

  const milestones: string[] =
    blocks <= 4
      ? blockSubSteps
      : [
          `Blocks 1–${Math.max(1, Math.floor(blocks * 0.25))}: Outline & Setup`,
          `Blocks ${Math.floor(blocks * 0.25) + 1}–${Math.floor(blocks * 0.55)}: Core Sections`,
          `Blocks ${Math.floor(blocks * 0.55) + 1}–${blocks - 1}: Figures/Equations`,
          `Block ${blocks}: Final Polish & Export`,
        ];

  return {
    startupStep5m,
    subStepsSummary: milestones.join(' • '),
    milestones,
    blockSubSteps,
    source: 'LOCAL_FALLBACK',
  };
}

/**
 * Multi-Block Deliverable Sub-Step Splitter powered by `callGemini(payload)`
 * (Priority 1: Pro Mode `/api/gemini-pro`, Priority 2: BYOK Key, Priority 3: Local Phase-Template Splitter).
 */
export async function splitDeliverableWithGemini(
  title: string,
  totalBlocks: number = 8,
  trackId: TrackId = 'writing'
): Promise<DeliverableSplitResult> {
  const cleanTitle = title.trim() || '2-Page Paper Draft';
  const blocks = Math.max(1, Math.min(24, Math.round(totalBlocks || 8)));

  const systemPrompt = [
    'You are the mechanical Multi-Block Deliverable Splitter for SymmetryManager.',
    'STRICT TONE RULES: Keep all labels strictly functional, concise, and mechanical. Zero philosophical, religious, or preachy text.',
    `Split the deliverable "${cleanTitle}" (${blocks} total 20-minute blocks, track: ${trackId}) across four phases (Outline & Setup -> Core Sections -> Figures/Equations -> Final Polish):`,
    '1. startupStep5m: A concrete, zero-friction 5-minute physical startup action for Block 1 (IGNITION_5M).',
    `2. blockSubSteps: An array of EXACTLY ${blocks} distinct 5-minute startup micro-scripts (one per 20m block, prefixed "Block k/${blocks}: ...").`,
    '3. milestones: An array of 4 concise phase summary strings.',
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
              text: `Deliverable: "${cleanTitle}" (${blocks} blocks, track: ${trackId}). Return JSON with startupStep5m, blockSubSteps (length ${blocks}), and milestones.`,
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
            blockSubSteps: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            milestones: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['startupStep5m', 'blockSubSteps', 'milestones'],
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
        blockSubSteps?: string[];
        milestones?: string[];
      };
      const localFallback = splitDeliverableLocal(cleanTitle, blocks, trackId);
      const rawSteps = Array.isArray(parsed.blockSubSteps)
        ? parsed.blockSubSteps.map((s) => String(s).trim()).filter(Boolean)
        : [];
      const normalizedSubSteps = Array.from({ length: blocks }, (_, i) => {
        return rawSteps[i] || localFallback.blockSubSteps[i];
      });
      const startupStep5m =
        typeof parsed.startupStep5m === 'string' && parsed.startupStep5m.trim()
          ? parsed.startupStep5m.trim()
          : normalizedSubSteps[0] || localFallback.startupStep5m;
      const milestones =
        Array.isArray(parsed.milestones) && parsed.milestones.length > 0
          ? parsed.milestones.map((m) => String(m).trim()).filter(Boolean)
          : localFallback.milestones;
      return {
        startupStep5m,
        subStepsSummary: milestones.join(' • '),
        milestones,
        blockSubSteps: normalizedSubSteps,
        source: res.source,
      };
    } catch {
      // Fallback to local result below
    }
  }

  return res.fallbackData || splitDeliverableLocal(cleanTitle, blocks, trackId);
}
