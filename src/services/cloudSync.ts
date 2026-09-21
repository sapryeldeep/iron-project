import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  writeBatch,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseService';
import { AppState } from '../types';

export interface CloudSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
}

// Master state document path in Firestore
const MASTER_DOC_PATH = 'system_data';
const MASTER_DOC_ID = 'state';

// Deep recursive helper to replace undefined values with null for safe Firestore writes
export function deepSanitize(val: any): any {
  if (val === undefined) {
    return null;
  }
  if (val === null) {
    return null;
  }
  if (Array.isArray(val)) {
    return val.map(item => deepSanitize(item));
  }
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return val.toISOString();
    }
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      const value = val[key];
      cleanObj[key] = deepSanitize(value);
    }
    return cleanObj;
  }
  return val;
}

// Security validation & sanitization helper before saving
export function sanitizeStateForCloud(state: AppState): Record<string, any> {
  const payload = {
    clients: state.clients || [],
    suppliers: state.suppliers || [],
    invoices: state.invoices || [],
    transactions: state.transactions || [],
    expenses: state.expenses || [],
    inventory: state.inventory || [],
    journalEntries: state.journalEntries || [],
    accounts: state.accounts || [],
    drivers: state.drivers || [],
    vehicles: state.vehicles || [],
    trips: state.trips || [],
    scaleTickets: state.scaleTickets || [],
    activityLogs: (state.activityLogs || []).slice(0, 500), // Protect size
    settings: state.settings || {},
    users: (state.users || []).map(u => ({
      id: u.id,
      username: u.username,
      password: u.password || '123456',
      role: u.role,
      permissions: u.permissions,
      isActive: u.isActive,
      createdAt: u.createdAt
    })),
    updatedAt: new Date().toISOString()
  };

  return deepSanitize(payload);
}

// Save complete system snapshot to Firestore securely
export async function syncStateToFirestore(state: AppState): Promise<boolean> {
  try {
    const payload = sanitizeStateForCloud(state);
    const docRef = doc(db, MASTER_DOC_PATH, MASTER_DOC_ID);
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    console.error("Failed to sync state to Firestore:", error);
    throw error;
  }
}

// Real-time Firestore Subscription listener
export function subscribeToFirestoreState(
  onDataReceived: (data: Partial<AppState>) => void,
  onError: (error: Error) => void
): () => void {
  const docRef = doc(db, MASTER_DOC_PATH, MASTER_DOC_ID);
  
  const unsubscribe = onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      onDataReceived(data as Partial<AppState>);
    }
  }, (err) => {
    console.error("Firestore snapshot error:", err);
    onError(err);
  });

  return unsubscribe;
}
