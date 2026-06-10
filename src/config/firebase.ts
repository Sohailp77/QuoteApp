// ============================================================
// FIREBASE CONFIG
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCTGGsewqqUH3zOXlhrPLKm2UbVTkaVSgY",
  authDomain: "quote-14d2b.firebaseapp.com",
  projectId: "quote-14d2b",
  storageBucket: "quote-14d2b.firebasestorage.app",
  messagingSenderId: "964700686123",
  appId: "1:964700686123:web:14fd24fdb5f4c45357e76e",
  measurementId: "G-M7NCNCFPYS"
};

// Prevent "already initialized" crash on React Native fast-refresh
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Prevent "Component auth has not been registered yet" crash on hot reload
let _auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized on a previous hot-reload cycle — reuse it
  _auth = getAuth(app);
}

import { getFirestore } from 'firebase/firestore';

export const auth = _auth;
export const db = getFirestore(app);
export default app;
