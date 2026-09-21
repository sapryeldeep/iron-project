/**
 * Firebase Firestore Configuration & Offline-First Engine
 * programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  getDocFromServer
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBUIAGDmBwFAT0_FRcyELzNqZDEWizs6OU",
  authDomain: "iron-39108.firebaseapp.com",
  databaseURL: "https://iron-39108-default-rtdb.firebaseio.com",
  projectId: "iron-39108",
  storageBucket: "iron-39108.firebasestorage.app",
  messagingSenderId: "242604325088",
  appId: "1:242604325088:web:8ad95978c6587c468b7885",
  measurementId: "G-5LBVWK7CXM"
};

// Initialize Firebase App Singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with high-performance persistent local cache and multiple tab support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const testRef = doc(db, 'system', 'connection_health');
    await getDoc(testRef);
    return true;
  } catch (error) {
    console.error("Firebase connection test note:", error);
    return false;
  }
}
