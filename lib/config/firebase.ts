import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  Auth
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Get Firebase config based on environment
 * Development: filter-ebbbc
 * Production: filter-expo-prod
 */
function getFirebaseConfig(): FirebaseConfig {
  const isProd = process.env.NEXT_PUBLIC_ENV === 'production' ||
                 process.env.NODE_ENV === 'production';

  if (isProd) {
    // Production: filter-expo-prod
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_PROD!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID_PROD!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_PROD!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_PROD!,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_PROD,
    };
  } else {
    // Development: filter-ebbbc
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
  }
}

// Initialize Firebase (client-side only)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined') {
  try {
    const config = getFirebaseConfig();

    // Initialize Firebase app
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }

    // Initialize Firebase Auth
    auth = getAuth(app);

    // Set persistence to local (survives browser restarts)
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Initialize Firestore
    db = getFirestore(app);

    // Initialize Firebase Storage
    storage = getStorage(app);

    console.log('[Firebase] Initialized successfully:', {
      environment: process.env.NEXT_PUBLIC_ENV || 'development',
      projectId: config.projectId,
    });
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
  }
}

export { auth, db, storage };
export default app;
