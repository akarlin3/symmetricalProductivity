import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const FIREBASE_CONFIG_STORAGE_KEY = 'symmetry_firebase_config_v1';
export const FIREBASE_CONFIG_CHANGE_EVENT = 'symmetry:firebase-config-change';

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

const buildTimeConfig: FirebaseEnvConfig = {
  apiKey: (import.meta.env?.VITE_FIREBASE_API_KEY ?? env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN ?? env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: (import.meta.env?.VITE_FIREBASE_PROJECT_ID ?? env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket: (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET ?? env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  messagingSenderId: (
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID ??
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ??
    ''
  ).trim(),
  appId: (import.meta.env?.VITE_FIREBASE_APP_ID ?? env.VITE_FIREBASE_APP_ID ?? '').trim(),
};

export function isValidFirebaseConfig(
  cfg: Partial<FirebaseEnvConfig> | null | undefined
): cfg is FirebaseEnvConfig {
  if (!cfg) return false;
  const apiKey = (cfg.apiKey || '').trim();
  const authDomain = (cfg.authDomain || '').trim();
  const projectId = (cfg.projectId || '').trim();
  const appId = (cfg.appId || '').trim();
  return Boolean(
    apiKey &&
      authDomain &&
      projectId &&
      appId &&
      !apiKey.startsWith('YOUR_') &&
      apiKey !== 'your_api_key_here'
  );
}

function loadStoredFirebaseConfig(): FirebaseEnvConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirebaseEnvConfig>;
    if (isValidFirebaseConfig(parsed)) {
      return {
        apiKey: parsed.apiKey.trim(),
        authDomain: parsed.authDomain.trim(),
        projectId: parsed.projectId.trim(),
        storageBucket: (parsed.storageBucket || '').trim(),
        messagingSenderId: (parsed.messagingSenderId || '').trim(),
        appId: parsed.appId.trim(),
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

/**
 * Parses either a `.env.local` block (`VITE_FIREBASE_API_KEY=...`) OR a Firebase JS SDK
 * config snippet (`const firebaseConfig = { apiKey: "...", ... }`) OR JSON object.
 */
export function parseFirebaseConfigText(rawText: string): FirebaseEnvConfig | null {
  const text = rawText.trim();
  if (!text) return null;

  const extractField = (keys: string[]): string => {
    for (const k of keys) {
      // Match ENV format: KEY=value or KEY="value"
      const envRegex = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?${k}\\s*=\\s*['"]?([^'"\\r\\n#]+)['"]?`, 'i');
      const envMatch = text.match(envRegex);
      if (envMatch?.[1]?.trim()) {
        return envMatch[1].trim();
      }
      // Match JS/JSON property format: "key": "value" or key: 'value'
      const propRegex = new RegExp(`['"]?${k}['"]?\\s*:\\s*['"]([^'"]+)['"]`, 'i');
      const propMatch = text.match(propRegex);
      if (propMatch?.[1]?.trim()) {
        return propMatch[1].trim();
      }
    }
    return '';
  };

  const candidate: FirebaseEnvConfig = {
    apiKey: extractField(['VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'apiKey']),
    authDomain: extractField(['VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', 'authDomain']),
    projectId: extractField(['VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'projectId']),
    storageBucket: extractField([
      'VITE_FIREBASE_STORAGE_BUCKET',
      'FIREBASE_STORAGE_BUCKET',
      'storageBucket',
    ]),
    messagingSenderId: extractField([
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_MESSAGING_SENDER_ID',
      'messagingSenderId',
    ]),
    appId: extractField(['VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID', 'appId']),
  };

  if (candidate.projectId && !candidate.authDomain) {
    candidate.authDomain = `${candidate.projectId}.firebaseapp.com`;
  }
  if (candidate.projectId && !candidate.storageBucket) {
    candidate.storageBucket = `${candidate.projectId}.firebasestorage.app`;
  }

  return isValidFirebaseConfig(candidate) ? candidate : null;
}

export let firebaseConfig: FirebaseEnvConfig = isValidFirebaseConfig(buildTimeConfig)
  ? buildTimeConfig
  : loadStoredFirebaseConfig() || buildTimeConfig;

export let isFirebaseConfigured: boolean = isValidFirebaseConfig(firebaseConfig);

export let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let googleProvider: GoogleAuthProvider | null = null;

export function initializeFirebaseInstances(
  configToUse: FirebaseEnvConfig
): boolean {
  if (typeof window === 'undefined' || !isValidFirebaseConfig(configToUse)) {
    return false;
  }
  try {
    firebaseConfig = configToUse;
    app = getApps().length > 0 ? getApp() : initializeApp(configToUse);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Fallback if Firestore was already initialized or IndexedDB is restricted
      db = getFirestore(app);
    }

    isFirebaseConfigured = true;
    try {
      window.localStorage.setItem(
        FIREBASE_CONFIG_STORAGE_KEY,
        JSON.stringify(configToUse)
      );
      window.dispatchEvent(new CustomEvent(FIREBASE_CONFIG_CHANGE_EVENT));
    } catch {
      // Ignore storage errors
    }
    return true;
  } catch (err) {
    console.warn('[SymmetrySync] Firebase initialization skipped, running in localStorage mode:', err);
    return false;
  }
}

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  initializeFirebaseInstances(firebaseConfig);
} else if (typeof window !== 'undefined') {
  // Automatically check Cloudflare Worker /api/firebase-config endpoint on boot
  fetch('/api/firebase-config', { method: 'GET' })
    .then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as {
        configured?: boolean;
        config?: Partial<FirebaseEnvConfig>;
      };
      if (data?.configured && isValidFirebaseConfig(data.config)) {
        initializeFirebaseInstances(data.config);
      }
    })
    .catch(() => {
      // Running in pure static/offline mode; localStorage fallback remains active
    });
}

export async function signInWithGooglePopup(): Promise<UserCredential | null> {
  if (!auth || !googleProvider) {
    throw new Error(
      'Firebase is not configured yet. Paste your VITE_FIREBASE_* keys or firebaseConfig to connect.'
    );
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFromFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
};
