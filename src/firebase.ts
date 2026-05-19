import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseConfig {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
}

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? ''
};

const requiredConfigKeys: Array<keyof FirebaseConfig> = [
  'apiKey',
  'appId',
  'authDomain',
  'messagingSenderId',
  'projectId',
  'storageBucket'
];

let authInitializationPromise: Promise<void> | null = null;

function hasCompleteFirebaseConfig() {
  return requiredConfigKeys.every((key) => firebaseConfig[key].length > 0);
}

function getFirebaseApp(): FirebaseApp {
  if (!hasCompleteFirebaseConfig()) {
    throw new Error('Firebase comments are not configured.');
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function isFirebaseConfigured() {
  return hasCompleteFirebaseConfig();
}

export function getCommentsAuth() {
  return getFirebaseAuth();
}

export function getCommentsFirestore() {
  return getFirebaseFirestore();
}

export async function initializeAnonymousAuth() {
  if (!isFirebaseConfigured()) {
    return;
  }

  if (authInitializationPromise) {
    return authInitializationPromise;
  }

  const auth = getFirebaseAuth();

  authInitializationPromise = new Promise<void>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        unsubscribe();

        if (user) {
          resolve();
          return;
        }

        try {
          await signInAnonymously(auth);
          resolve();
        } catch (error) {
          authInitializationPromise = null;
          reject(error);
        }
      },
      (error) => {
        unsubscribe();
        authInitializationPromise = null;
        reject(error);
      }
    );
  });

  return authInitializationPromise;
}
