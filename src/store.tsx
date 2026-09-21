import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppState, Person, Invoice, Transaction, Driver, Vehicle, Trip, InventoryItem, VehicleExpense, User, AppSettings, Expense, UserPermissions, ActivityLog, JournalEntry, ChartAccount, ScaleTicket } from './types';
import { DEFAULT_CHART_OF_ACCOUNTS, generateInvoiceJournalEntry, generatePaymentJournalEntry, generateExpenseJournalEntry } from './utils/journalGenerator';
import { getNextInvoiceNumber } from './utils/invoiceNumber';
import { syncStateToFirestore, subscribeToFirestoreState } from './services/cloudSync';
import { checkAndExecuteDailyAutoBackup, autoBackup } from './services/backupService';
import { AppEngine } from './lib/app-engine';
import { AccountingEngine } from './lib/accounting-engine';
import { InventoryEngine } from './lib/inventory-engine';

export const ALL_APP_VIEWS = [
  'scale',
  'inventory',
  'clients',
  'suppliers',
  'statements',
  'invoices',
  'treasury',
  'audit',
  'payments',
  'journal',
  'sales_reports',
  'expenses',
  'fleet',
  'users',
  'settings'
];

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canPrint: true,
  canDownload: true,
  canDelete: true,
  canDeleteInvoices: true,
  canEditInvoices: true,
  canEditPrices: true,
  canViewProfits: true,
  canManageInventory: true,
  canAccessSettings: true,
  allowedViews: [...ALL_APP_VIEWS]
};

export function normalizeUser(user: User): User {
  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';
  const isAccountant = user.role === 'accountant';

  return {
    ...user,
    permissions: {
      canPrint: user.permissions?.canPrint ?? true,
      canDownload: user.permissions?.canDownload ?? (isAdmin || isManager),
      // Strictly restrict deletion to admins only by default
      canDelete: user.permissions?.canDelete ?? isAdmin,
      canDeleteInvoices: user.permissions?.canDeleteInvoices ?? (user.permissions?.canDelete ?? isAdmin),
      canEditInvoices: user.permissions?.canEditInvoices ?? (isAdmin || isManager),
      canEditPrices: user.permissions?.canEditPrices ?? (isAdmin || isManager),
      canViewProfits: user.permissions?.canViewProfits ?? (isAdmin || isManager || isAccountant),
      canManageInventory: user.permissions?.canManageInventory ?? (isAdmin || user.role === 'storekeeper' || isManager),
      canAccessSettings: user.permissions?.canAccessSettings ?? isAdmin,
      allowedViews: Array.isArray(user.permissions?.allowedViews) && user.permissions.allowedViews.length > 0
        ? user.permissions.allowedViews
        : (isAdmin ? [...ALL_APP_VIEWS] : (isManager ? [...ALL_APP_VIEWS].filter(v => v !== 'users' && v !== 'settings') : ['invoices', 'clients', 'payments', 'scale', 'treasury']))
    }
  };
}

const initialState: AppState = {
  currentUser: null,
  activityLogs: [],
  clients: [],
  suppliers: [],
  invoices: [],
  transactions: [],
  expenses: [],
  drivers: [],
  vehicles: [],
  trips: [],
  inventory: [],
  vehicleExpenses: [],
  users: [
    { 
      id: '1', 
      username: 'admin', 
      password: 'admin',
      role: 'admin', 
      permissions: DEFAULT_ADMIN_PERMISSIONS, 
      isActive: true, 
      createdAt: '2024-01-01T00:00:00.000Z' 
    }
  ],
  settings: {
    companyName: 'شركة إنجاز',
    phone: '01065826742',
    address: 'العاشر من رمضان',
    taxNumber: '',
    invoiceNotes: '',
    inventoryCategories: [],
    profitMarginPercent: 15,
    defaultDensity: 7.85,
    printerType: 'a4',
    enableScaleIntegration: false,
    treasuryOpeningBalanceCash: 0,
    treasuryOpeningBalanceBank: 0,
    treasuryOpeningBalanceWallet: 0,
    treasuryOpeningBalanceInstapay: 0
  },
  journalEntries: [],
  accounts: DEFAULT_CHART_OF_ACCOUNTS,
  scaleTickets: [],
  liveScaleWeight: 0,
  isScaleConnected: false
};

interface AppContextType {
  state: AppState;
  setLiveScaleWeight: (weight: number) => void;
  setIsScaleConnected: (connected: boolean) => void;
  addClient: (client: Omit<Person, 'id' | 'createdAt' | 'balance'>) => void;
  updateClient: (id: string, client: Partial<Person>) => void;
  deleteClient: (id: string) => void;
  
  addSupplier: (supplier: Omit<Person, 'id' | 'createdAt' | 'balance'>) => void;
  updateSupplier: (id: string, supplier: Partial<Person>) => void;
  deleteSupplier: (id: string) => void;

  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateInvoice: (id: string, invoice: Partial<Invoice>) => { success: boolean; error?: string };
  deleteInvoice: (id: string) => void;
  regenerateJournalEntries: () => void;
  normalizeTransactions: () => void;
  getSequentialInvoiceNumber: (type?: 'sales' | 'purchase') => string;

  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => void;
  deleteTrip: (id: string) => void;
  updateTripStatus: (id: string, status: Trip['status']) => void;
  
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'quantity'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;

  addVehicleExpense: (expense: Omit<VehicleExpense, 'id' | 'date'>) => void;
  deleteVehicleExpense: (id: string) => void;
  
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  switchUser: (id: string | null) => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  logActivity: (action: string, details: string) => void;

  addManualJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'isBalanced'>) => { success: boolean; error?: string };
  deleteJournalEntry: (id: string) => void;
  resetSystemData: () => void;

  addScaleTicket: (ticket: Omit<ScaleTicket, 'id' | 'createdAt'>) => ScaleTicket;
  updateScaleTicket: (id: string, ticket: Partial<ScaleTicket>) => void;
  deleteScaleTicket: (id: string) => void;

  // Real-time Cloud Sync and Backup Restoration
  restoreSystemState: (importedState: AppState) => { success: boolean; message: string };
  cloudStatus: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('steel-warehouse-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mergedUsers = (parsed.users && parsed.users.length > 0 ? parsed.users : initialState.users).map(normalizeUser);
        // Default to null to force login unless they have an active persisted session
        const currentU = parsed.currentUser ? normalizeUser(parsed.currentUser) : null;
        
        // Recover or generate initial journal entries for existing invoices if empty
        let jEntries = parsed.journalEntries || [];
        if (jEntries.length === 0 && parsed.invoices && parsed.invoices.length > 0) {
          jEntries = parsed.invoices.map((inv: Invoice) => {
            const isClient = inv.personType === 'client';
            const partyList = isClient ? (parsed.clients || []) : (parsed.suppliers || []);
            const party = partyList.find((p: Person) => p.id === inv.personId);
            return generateInvoiceJournalEntry(inv, parsed.inventory || [], party, parsed.accounts || DEFAULT_CHART_OF_ACCOUNTS);
          });
        }

        // Ensure all default accounts exist in the state accounts
        const existingAccounts = parsed.accounts && parsed.accounts.length > 0 ? parsed.accounts : DEFAULT_CHART_OF_ACCOUNTS;
        const accountCodes = new Set(existingAccounts.map((a: any) => a.code));
        const mergedAccounts = [...existingAccounts];
        
        DEFAULT_CHART_OF_ACCOUNTS.forEach(defaultAcc => {
          if (!accountCodes.has(defaultAcc.code)) {
            mergedAccounts.push(defaultAcc);
          }
        });

        const baseState = { 
          ...initialState, 
          ...parsed, 
          users: mergedUsers, 
          currentUser: currentU,
          accounts: mergedAccounts,
          scaleTickets: parsed.scaleTickets || []
        };

        // Always freshly regenerate journal entries from original documents to prevent stale cached data
        return AppEngine.regenerateAllJournalEntries(baseState);
      } catch (e) {
        console.error("Failed to parse local data", e);
        return initialState;
      }
    }
    return initialState;
  });

  const [cloudStatus, setCloudStatus] = useState<{
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
  }>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  const isInitialLoad = useRef(true);
  const syncTimeoutRef = useRef<any>(null);

  // Monitor online / offline network status
  useEffect(() => {
    const handleOnline = () => {
      setCloudStatus(prev => ({ ...prev, isOnline: true }));
      // When connection comes back, immediately sync local changes to cloud
      triggerCloudSync();
    };
    const handleOffline = () => {
      setCloudStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check and run daily auto backup on boot and every 24 hours
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const runBackup = async () => {
      try {
        console.log("Checking scheduled daily auto-backup...");
        const result = checkAndExecuteDailyAutoBackup(stateRef.current);
        if (result) {
          updateSettings({ lastBackupAt: new Date().toISOString() });
        }
      } catch (e) {
        console.warn("Scheduled auto backup note:", e);
      }
    };

    // Delay initial check slightly to ensure app is fully loaded
    const timeout = setTimeout(runBackup, 5000);
    
    // Set interval for checking every 6 hours (to catch the day change)
    const interval = setInterval(runBackup, 6 * 60 * 60 * 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // Save to LocalStorage immediately and debounce sync to Firestore
  useEffect(() => {
    localStorage.setItem('steel-warehouse-data', JSON.stringify(state));

    // Debounced automatic Cloud Sync whenever data changes
    if (!isInitialLoad.current && navigator.onLine) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        triggerCloudSync();
      }, 2000); // 2 second debounce to prevent network hammering
    } else {
      isInitialLoad.current = false;
    }
  }, [state]);

  const triggerCloudSync = async () => {
    if (!navigator.onLine) return { success: false, error: 'الجهاز في وضع غير متصل (Offline)' };
    try {
      setCloudStatus(prev => ({ ...prev, isSyncing: true, error: null }));
      await syncStateToFirestore(state);
      setCloudStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        error: null
      }));
      return { success: true };
    } catch (err: any) {
      setCloudStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: err?.message || 'فشل الاتصال بالسحابة'
      }));
      return { success: false, error: err?.message };
    }
  };

  // Restore complete state from a backup file or cloud document
  const restoreSystemState = (importedState: any) => {
    try {
      if (!importedState || typeof importedState !== 'object') {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو تالف' };
      }
      const mergedUsers = (importedState.users && importedState.users.length > 0 ? importedState.users : initialState.users).map(normalizeUser);
      const currentU = importedState.currentUser ? normalizeUser(importedState.currentUser) : mergedUsers[0];

      const cleanState: AppState = {
        ...initialState,
        ...importedState,
        users: mergedUsers,
        currentUser: currentU,
        accounts: importedState.accounts && importedState.accounts.length > 0 ? importedState.accounts : DEFAULT_CHART_OF_ACCOUNTS,
        invoices: importedState.invoices || [],
        clients: importedState.clients || [],
        suppliers: importedState.suppliers || [],
        transactions: importedState.transactions || [],
        expenses: importedState.expenses || [],
        inventory: importedState.inventory || [],
        journalEntries: importedState.journalEntries || [],
        scaleTickets: importedState.scaleTickets || [],
        settings: {
          ...initialState.settings,
          ...(importedState.settings || {}),
          lastRestoredAt: new Date().toISOString()
        }
      };

      const recalced = AppEngine.recalculateAllBalances(cleanState);
      setState(recalced);
      localStorage.setItem('steel-warehouse-data', JSON.stringify(recalced));

      if (navigator.onLine) {
        syncStateToFirestore(recalced).catch(console.error);
      }

      return { success: true, message: 'تم استرجاع النظام بنجاح وتحديث كافة السجلات والموازين.' };
    } catch (e: any) {
      return { success: false, message: 'حدث خطأ أثناء فك حزمة النسخة الاحتياطية: ' + e.message };
    }
  };

  // --- Ledger Recalculator ---
  const triggerRecalculate = () => {
    setState(s => AppEngine.recalculateAllBalances(s));
  };

  // --- Clients ---
  const addClient = (client: Omit<Person, 'id' | 'createdAt' | 'balance'>) => {
    const openingBalance = client.openingBalance || 0;
    const newClient: Person = { ...client, id: AppEngine.generateId(), createdAt: new Date().toISOString(), balance: openingBalance, type: 'client' };
    setState(s => AppEngine.recalculateAllBalances({ ...s, clients: [newClient, ...s.clients] }));
  };
  const updateClient = (id: string, data: Partial<Person>) => {
    setState(s => AppEngine.recalculateAllBalances({ ...s, clients: s.clients.map(c => c.id === id ? { ...c, ...data } : c) }));
  };
  const deleteClient = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف عميل بدون صلاحية`);
      return;
    }
    setState(s => AppEngine.recalculateAllBalances({ ...s, clients: s.clients.filter(c => c.id !== id) }));
  };

  // --- Suppliers ---
  const addSupplier = (supplier: Omit<Person, 'id' | 'createdAt' | 'balance'>) => {
    const openingBalance = supplier.openingBalance || 0;
    const newSupplier: Person = { ...supplier, id: AppEngine.generateId(), createdAt: new Date().toISOString(), balance: openingBalance, type: 'supplier' };
    setState(s => AppEngine.recalculateAllBalances({ ...s, suppliers: [newSupplier, ...s.suppliers] }));
  };
  const updateSupplier = (id: string, data: Partial<Person>) => {
    setState(s => AppEngine.recalculateAllBalances({ ...s, suppliers: s.suppliers.map(c => c.id === id ? { ...c, ...data } : c) }));
  };
  const deleteSupplier = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف مورد بدون صلاحية`);
      return;
    }
    setState(s => AppEngine.recalculateAllBalances({ ...s, suppliers: s.suppliers.filter(c => c.id !== id) }));
  };

  // --- Invoices ---
  const addInvoice = (invoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    // Duplicate check
    const isDuplicate = state.invoices.some(inv => 
      inv.invoiceNumber === invoice.invoiceNumber && 
      inv.personId === invoice.personId &&
      inv.total === invoice.total
    );

    if (isDuplicate) {
      import('./utils/audioAlarm').then(({ playWarningAlarm }) => playWarningAlarm()).catch(() => {});
      return { success: false, error: 'تحذير: توجد فاتورة مشابهة بنفس الرقم والقيمة لهذا العميل/المورد.' };
    }

    setState(s => AppEngine.addInvoice(s, invoice));
    return { success: true };
  };

  const updateInvoice = (id: string, invoice: Partial<Invoice>) => {
    setState(s => AppEngine.updateInvoice(s, id, invoice));
    return { success: true };
  };

  const deleteInvoice = (id: string) => {
    const canDeleteInv = state.currentUser?.role === 'admin' || state.currentUser?.permissions.canDeleteInvoices;
    if (!canDeleteInv) {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف فاتورة بدون صلاحية`);
      return;
    }
    setState(s => AppEngine.deleteInvoice(s, id));
  };

  const regenerateJournalEntries = () => {
    setState(s => AppEngine.regenerateAllJournalEntries(s));
    logActivity('إعادة توليد القيود', 'تمت إعادة بناء دفتر اليومية بالكامل لضمان الاتزان');
  };

  const normalizeTransactions = () => {
    setState(s => AppEngine.normalizeTransactions(s));
    logActivity('تصحيح البيانات', 'تم توحيد الحركات المالية مع الفواتير لضمان دقة الأرصدة الحقيقية');
  };

  const getSequentialInvoiceNumber = (type: 'sales' | 'purchase' = 'sales') => {
    return getNextInvoiceNumber(state.invoices, { type, settings: state.settings });
  };

  // --- Expenses ---
  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...expense, id: AppEngine.generateId() };
    setState(s => {
      const expJE = generateExpenseJournalEntry(newExp, s.accounts, s.journalEntries);
      return {
        ...s,
        expenses: [newExp, ...s.expenses],
        journalEntries: [expJE, ...s.journalEntries]
      };
    });
  };

  const deleteExpense = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف مصروف بدون صلاحية`);
      return;
    }
    setState(s => ({
      ...s,
      expenses: s.expenses.filter(e => e.id !== id),
      journalEntries: s.journalEntries.filter(e => e.referenceId !== id)
    }));
  };

  // --- Fleet ---
  const addDriver = (driver: Omit<Driver, 'id'>) => {
    setState(s => ({ ...s, drivers: [{ ...driver, id: AppEngine.generateId() }, ...s.drivers] }));
  };
  const updateDriver = (id: string, data: Partial<Driver>) => {
    setState(s => ({ ...s, drivers: s.drivers.map(d => d.id === id ? { ...d, ...data } : d) }));
  };
  const deleteDriver = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف سائق بدون صلاحية`);
      return;
    }
    setState(s => ({ ...s, drivers: s.drivers.filter(d => d.id !== id) }));
  };
  const addVehicle = (vehicle: Omit<Vehicle, 'id'>) => {
    setState(s => ({ ...s, vehicles: [{ ...vehicle, id: AppEngine.generateId() }, ...s.vehicles] }));
  };
  const updateVehicle = (id: string, data: Partial<Vehicle>) => {
    setState(s => ({ ...s, vehicles: s.vehicles.map(v => v.id === id ? { ...v, ...data } : v) }));
  };
  const deleteVehicle = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف مركبة بدون صلاحية`);
      return;
    }
    setState(s => ({ ...s, vehicles: s.vehicles.filter(v => v.id !== id) }));
  };
  const addTrip = (trip: Omit<Trip, 'id'>) => {
    setState(s => ({ ...s, trips: [{ ...trip, id: AppEngine.generateId() }, ...s.trips] }));
  };
  const deleteTrip = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف رحلة بدون صلاحية`);
      return;
    }
    setState(s => ({ ...s, trips: s.trips.filter(t => t.id !== id) }));
  };
  const updateTripStatus = (id: string, status: Trip['status']) => {
    setState(s => ({ ...s, trips: s.trips.map(t => t.id === id ? { ...t, status } : t) }));
  };

  // --- Inventory ---
  const addInventoryItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'quantity'>) => {
    setState(s => AppEngine.recalculateAllBalances({ 
      ...s, 
      inventory: [{ ...item, id: AppEngine.generateId(), lastUpdated: new Date().toISOString(), quantity: 0 } as InventoryItem, ...s.inventory] 
    }));
  };
  const updateInventoryItem = (id: string, data: Partial<InventoryItem>) => {
    setState(s => AppEngine.recalculateAllBalances({ 
      ...s, 
      inventory: s.inventory.map(i => i.id === id ? { ...i, ...data, lastUpdated: new Date().toISOString() } : i) 
    }));
  };
  const deleteInventoryItem = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف صنف مخزون بدون صلاحية`);
      return;
    }
    setState(s => AppEngine.recalculateAllBalances({ ...s, inventory: s.inventory.filter(i => i.id !== id) }));
  };

  // --- Vehicle Expenses ---
  const addVehicleExpense = (expense: Omit<VehicleExpense, 'id' | 'date'>) => {
    setState(s => ({ ...s, vehicleExpenses: [{ ...expense, id: AppEngine.generateId(), date: new Date().toISOString() }, ...s.vehicleExpenses] }));
  };
  const deleteVehicleExpense = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف مصروف مركبة بدون صلاحية`);
      return;
    }
    setState(s => ({ ...s, vehicleExpenses: s.vehicleExpenses.filter(ve => ve.id !== id) }));
  };

  // --- Users & Logs ---
  const addUser = (user: Omit<User, 'id' | 'createdAt'>) => {
    setState(s => ({ ...s, users: [{ ...user, id: AppEngine.generateId(), createdAt: new Date().toISOString() }, ...s.users] }));
  };
  const updateUser = (id: string, data: Partial<User>) => {
    setState(s => {
      const sanitizedData = { ...data };
      if (sanitizedData.password) {
        sanitizedData.password = sanitizedData.password.trim();
      }

      const updatedUsers = s.users.map(u => {
        if (u.id === id) {
          const merged = { ...u, ...sanitizedData };
          if (sanitizedData.permissions) {
            merged.permissions = { ...u.permissions, ...sanitizedData.permissions };
          }
          return normalizeUser(merged);
        }
        return u;
      });
      const isCurrent = s.currentUser?.id === id;
      const updatedCurrentUser = isCurrent && s.currentUser
        ? normalizeUser({
            ...s.currentUser,
            ...sanitizedData,
            permissions: sanitizedData.permissions
              ? { ...s.currentUser.permissions, ...sanitizedData.permissions }
              : s.currentUser.permissions
          })
        : s.currentUser;

      const nextState = {
        ...s,
        users: updatedUsers,
        currentUser: updatedCurrentUser
      };

      localStorage.setItem('steel-warehouse-data', JSON.stringify(nextState));
      if (navigator.onLine) {
        syncStateToFirestore(nextState).catch(console.error);
      }

      return nextState;
    });
  };
  const switchUser = (id: string | null) => {
    setState(s => {
      if (!id) {
        return { ...s, currentUser: null };
      }
      const user = s.users.find(u => u.id === id);
      if (user) {
        // Ensure user is normalized upon login to lock down permissions
        const normalized = normalizeUser(user);
        return { ...s, currentUser: normalized };
      }
      return s;
    });
  };
  const deleteUser = (id: string) => {
    if (state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف مستخدم بدون صلاحية مسؤول`);
      return;
    }
    setState(s => ({ ...s, users: s.users.filter(u => u.id !== id) }));
  };
  const logActivity = (action: string, details: string) => {
    setState(s => {
      if (!s.currentUser) return s;
      const log = {
        id: AppEngine.generateId(),
        userId: s.currentUser.id,
        action,
        details,
        timestamp: new Date().toISOString()
      };
      return { ...s, activityLogs: [log, ...s.activityLogs] };
    });
  };

  // --- Transactions ---
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    setState(s => AppEngine.addTransaction(s, transaction));
  };

  const deleteTransaction = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف حركة مالية بدون صلاحية`);
      return;
    }
    setState(s => AppEngine.deleteTransaction(s, id));
  };

  // --- Manual Journal Entries ---
  const addManualJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'isBalanced'>) => {
    const totalDebit = Math.round((entry.lines.reduce((s, l) => s + l.debit, 0) + Number.EPSILON) * 100) / 100;
    const totalCredit = Math.round((entry.lines.reduce((s, l) => s + l.credit, 0) + Number.EPSILON) * 100) / 100;
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { success: false, error: 'خطأ في التوازن: إجمالي المدين يجب أن يساوي إجمالي الدائن تماماً.' };
    }

    const newJE: JournalEntry = {
      ...entry,
      id: AppEngine.generateId(),
      totalDebit,
      totalCredit,
      isBalanced: true,
      createdAt: new Date().toISOString()
    };

    setState(s => ({
      ...s,
      journalEntries: [newJE, ...s.journalEntries]
    }));

    return { success: true };
  };

  const deleteJournalEntry = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف قيد محاسبي بدون صلاحية`);
      return;
    }
    setState(s => ({
      ...s,
      journalEntries: s.journalEntries.filter(e => e.id !== id)
    }));
  };

  // --- Scale / Weighbridge Tickets ---
  const addScaleTicket = (ticket: Omit<ScaleTicket, 'id' | 'createdAt'>): ScaleTicket => {
    const newTicket: ScaleTicket = {
      ...ticket,
      id: AppEngine.generateId(),
      createdAt: new Date().toISOString()
    };
    setState(s => ({
      ...s,
      scaleTickets: [newTicket, ...s.scaleTickets]
    }));
    return newTicket;
  };

  const updateScaleTicket = (id: string, updated: Partial<ScaleTicket>) => {
    setState(s => ({
      ...s,
      scaleTickets: s.scaleTickets.map(t => t.id === id ? { ...t, ...updated } : t)
    }));
  };

  const deleteScaleTicket = (id: string) => {
    if (!state.currentUser?.permissions.canDelete && state.currentUser?.role !== 'admin') {
      logActivity('محاولة حذف غير مصرح بها', `حاول المستخدم ${state.currentUser?.username} حذف تذكرة ميزان بدون صلاحية`);
      return;
    }
    setState(s => ({
      ...s,
      scaleTickets: s.scaleTickets.filter(t => t.id !== id)
    }));
  };

  const resetSystemData = async () => {
    const retainedUsers = state.users;
    const retainedCurrentUser = state.currentUser;
    
    const fullWipe = window.confirm('هل تريد أيضاً مسح كافة النسخ الاحتياطية القديمة (Backups) نهائياً لضمان بداية نظيفة 100%؟');

    // 1. Clear main system data key
    localStorage.removeItem('steel-warehouse-data');
    localStorage.removeItem('iron_last_auto_backup_date');
    
    if (fullWipe) {
      localStorage.removeItem('iron_system_daily_backups');
    }
    
    // 2. Prepare Fresh State
    const freshState: AppState = {
      ...initialState,
      users: retainedUsers,
      currentUser: retainedCurrentUser
    };
    
    // 3. Force Sync to Cloud (to wipe cloud data)
    if (navigator.onLine) {
      try {
        await syncStateToFirestore(freshState);
      } catch (e) {
        console.error("Cloud wipe failed during reset", e);
      }
    }
    
    // 4. Update Local State and Reload
    localStorage.setItem('steel-warehouse-data', JSON.stringify(freshState));
    setState(freshState);
    
    alert('تم تصفير النظام بنجاح. سيتم الآن إعادة تحميل الصفحة لتطبيق التغييرات.');
    window.location.reload();
  };

  const setLiveScaleWeight = (weight: number) => {
    setState(s => ({ ...s, liveScaleWeight: weight }));
  };

  const setIsScaleConnected = (connected: boolean) => {
    setState(s => ({ ...s, isScaleConnected: connected }));
  };

  // --- Settings ---
  const updateSettings = (settings: Partial<AppSettings>) => {
    setState(s => ({ ...s, settings: { ...s.settings, ...settings } }));
  };

  return (
    <AppContext.Provider value={{
      state, setLiveScaleWeight, setIsScaleConnected, addClient, updateClient, deleteClient, addSupplier, updateSupplier, deleteSupplier,
      addInvoice, updateInvoice, deleteInvoice, regenerateJournalEntries, normalizeTransactions, getSequentialInvoiceNumber,
      addExpense, deleteExpense,
      addDriver, updateDriver, deleteDriver, addVehicle, updateVehicle, deleteVehicle, addTrip, deleteTrip, updateTripStatus,
      addInventoryItem, updateInventoryItem, deleteInventoryItem,
      addVehicleExpense, deleteVehicleExpense, addUser, updateUser, deleteUser, switchUser, logActivity, updateSettings, addTransaction, deleteTransaction,
      addManualJournalEntry, deleteJournalEntry,
      addScaleTicket, updateScaleTicket, deleteScaleTicket, resetSystemData,
      restoreSystemState,
      cloudStatus
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
