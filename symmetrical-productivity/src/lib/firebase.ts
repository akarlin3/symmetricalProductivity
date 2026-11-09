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

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};

export const firebaseConfig: FirebaseEnvConfig = {
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

export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain &&
    firebaseConfig.appId &&
    !firebaseConfig.apiKey.startsWith('YOUR_') &&
    firebaseConfig.apiKey !== 'your_api_key_here'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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
      // Fallback if Firestore was already initialized (e.g. Vite HMR) or IndexedDB is restricted
      db = getFirestore(app);
    }
  } catch (err) {
    console.warn('[SymmetrySync] Firebase initialization skipped, running in localStorage mode:', err);
    app = null;
    auth = null;
    db = null;
    googleProvider = null;
  }
}

export async function signInWithGooglePopup(): Promise<UserCredential | null> {
  if (!auth || !googleProvider) {
    throw new Error(
      'Firebase is not configured. Add VITE_FIREBASE_* keys to .env.local to enable Google Sign-In.'
    );
  }
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFromFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
};
