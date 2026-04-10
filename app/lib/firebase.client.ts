import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

export function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0]!;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      "Missing Firebase web env vars. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID."
    );
  }

  return initializeApp({ apiKey, authDomain, projectId, appId });
}

export function getFirebaseAuthClient() {
  return getAuth(getFirebaseApp());
}

