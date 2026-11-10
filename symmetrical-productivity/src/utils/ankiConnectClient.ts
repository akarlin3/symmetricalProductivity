export interface AnkiConnectPollResult {
  ok: boolean;
  reviewedToday?: number;
  error?: string;
}

const ALLOWED_PROTOCOLS = [
  'https:',
  'http:',
  'anki:',
  'remnote:',
  'obsidian:',
  'vscode:',
  'zotero:',
];

export function isValidResourceLaunchUrl(rawUrl?: string): boolean {
  if (!rawUrl || !rawUrl.trim()) return false;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol.toLowerCase());
  } catch {
    return /^(anki|remnote|obsidian|zotero):\/\//i.test(trimmed);
  }
}

export function openResourceLaunchUrl(rawUrl?: string): boolean {
  if (typeof window === 'undefined' || !isValidResourceLaunchUrl(rawUrl)) {
    return false;
  }
  const trimmed = rawUrl!.trim();
  try {
    if (/^https?:/i.test(trimmed)) {
      window.open(trimmed, '_blank', 'noopener,noreferrer');
    } else {
      // Custom desktop/mobile deep link (anki://, remnote://, etc.)
      window.open(trimmed, '_self');
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchAnkiConnectReviewedToday(
  endpointUrl = 'http://127.0.0.1:8765'
): Promise<AnkiConnectPollResult> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return { ok: false, error: 'Browser fetch unavailable' };
  }
  const cleanEndpoint = endpointUrl.trim() || 'http://127.0.0.1:8765';
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(cleanEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getNumCardsReviewedToday',
        version: 6,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `AnkiConnect returned HTTP ${response.status}`,
      };
    }
    const payload = (await response.json()) as {
      result?: number;
      error?: string | null;
    };
    if (payload.error) {
      return { ok: false, error: payload.error };
    }
    const reviewed = Math.max(0, Math.round(Number(payload.result) || 0));
    return { ok: true, reviewedToday: reviewed };
  } catch {
    return {
      ok: false,
      error:
        'Desktop AnkiConnect (127.0.0.1:8765) unreachable — ensure Anki is open with AnkiConnect add-on (2055492159) and webCorsOriginList configured, or tap count to enter manually.',
    };
  } finally {
    window.clearTimeout(timer);
  }
}
