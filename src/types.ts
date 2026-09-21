export type EntityType = 'client' | 'supplier';
export type PaymentMethod = 'cash' | 'bank' | 'wallet' | 'instapay';
export type InvoiceType = 'sales' | 'purchase' | 'sales_return' | 'purchase_return';
export type InvoiceCategory = 'general' | 'laser' | 'bending' | 'strip' | 'manufacturing';
export type TransactionType = 'payment_in' | 'payment_out' | 'invoice_charge';
export type BalanceLabel = 'لنا' | 'له' | 'خالص';

export interface Person {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: EntityType;
  balance: number; // Positive means they owe us, negative means we owe them
  creditLimit?: number;
  openingBalance?: number;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  length?: number;
  width?: number;
  thickness?: number;
  density?: number;
  dimensionUnit?: 'm' | 'cm' | 'mm';
  sheetsCount?: number;
  bendsCount?: number;
  bendPrice?: number;
  manufacturingUnit?: 'meter' | 'kg' | 'piece' | 'ton' | 'bend' | 'hour';
  manufacturingOperation?: string;
  scaleTicketId?: string;
  scaleApproved?: boolean;
  scaleGrossWeight?: number;
  scaleTareWeight?: number;
  scaleDeductionWeight?: number;
  scaleNetWeight?: number;
  scaleMode?: 'direct' | 'first' | 'second' | 'manual' | 'ticket';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  personId: string;
  personType: EntityType;
  type: InvoiceType;
  category: InvoiceCategory;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string;
  attachments?: string[];
  isAudited?: boolean;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  freightCost?: number;
}

export interface Transaction {
  id: string;
  personId: string;
  invoiceId?: string;
  manufacturingOrderId?: string;
  type: TransactionType;
  category: InvoiceCategory;
  amount: number;
  date: string;
  createdAt?: string;
  notes: string;
  paymentMethod?: PaymentMethod;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number; // Current quantity (cached)
  openingQuantity?: number; // Opening stock
  minQuantity: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  lastUpdated: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  paymentMethod?: PaymentMethod;
}

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  nature: 'debit' | 'credit';
  description?: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  partyId?: string;
  partyName?: string;
  inventoryItemId?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  referenceType: 'sales_invoice' | 'purchase_invoice' | 'payment_in' | 'payment_out' | 'expense' | 'manual';
  referenceId?: string;
  referenceNumber?: string;
  description: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'posted' | 'draft';
  createdAt: string;
}

export interface UserPermissions {
  canPrint: boolean;
  canDownload: boolean;
  canDelete: boolean;
  canDeleteInvoices: boolean;
  canEditInvoices: boolean;
  canEditPrices: boolean;
  canViewProfits: boolean;
  canManageInventory: boolean;
  canAccessSettings: boolean;
  allowedViews?: string[];
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'manager' | 'accountant' | 'storekeeper' | 'cashier';
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
}

export function getUserPassword(user: User): string {
  if (user && user.password && String(user.password).trim() !== '') {
    return String(user.password).trim();
  }
  return user?.role === 'admin' ? 'admin' : '123456';
}

export interface AppSettings {
  companyName: string;
  phone: string;
  address: string;
  taxNumber: string;
  invoiceNotes: string;
  inventoryCategories?: string[];
  profitMarginPercent?: number;
  defaultDensity?: number;
  printerType?: 'a4' | 'thermal';
  invoiceTemplate?: 'classic' | 'modern' | 'compact' | 'standard' | 'minimal';
  invoiceNumberingMode?: 'unified' | 'by_type' | 'numeric';
  invoiceNumberPrefix?: string;
  invoiceStartingNumber?: number;
  invoiceNumberDigits?: number;
  treasuryOpeningBalanceCash?: number;
  treasuryOpeningBalanceBank?: number;
  treasuryOpeningBalanceWallet?: number;
  treasuryOpeningBalanceInstapay?: number;
  lastBackupAt?: string;
  lastRestoredAt?: string;
  customTabOrder?: string[];
  customTabIcons?: Record<string, string>;
  customTabNames?: Record<string, string>;
  customCreatedApps?: any[];
  customBackupDirectory?: string;
  showAudit?: boolean;
  defaultLaserRatePerKg?: number;
  defaultFreightRate?: number;
  defaultBendingRatePerBend?: number;
  defaultManufacturingRatePerKg?: number;
  printerName?: string;
  enableScaleIntegration?: boolean;
  scaleComPort?: string;
  scaleBaudRate?: number;
}

export interface ScaleTicket {
  id: string;
  ticketNumber: string;
  date: string;
  time: string;
  plateNumber: string;
  driverName?: string;
  personId?: string;
  personType?: EntityType;
  materialName: string;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  finalNetWeight: number;
  status: 'pending' | 'completed';
  type: 'inbound' | 'outbound' | 'internal';
  createdAt: string;
  firstWeightType?: 'gross' | 'tare';
  pricePerUnit?: number;
  priceUnit?: string;
  totalPrice?: number;
  batchItems?: any[];
  inventoryItemId?: string;
  deductionWeight?: number;
  operatorName?: string;
  personName?: string;
  firstWeight?: number;
  firstWeightTime?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number; // in tons
  driverId?: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  invoiceId?: string;
  destination: string;
  status: 'loading' | 'on_route' | 'delivered' | 'returned';
  departureTime: string;
  arrivalTime?: string;
  notes: string;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  type: 'gas' | 'maintenance' | 'license' | 'other';
  amount: number;
  date: string;
  notes: string;
}

export interface AppState {
  currentUser: User | null;
  activityLogs: ActivityLog[];
  clients: Person[];
  suppliers: Person[];
  invoices: Invoice[];
  transactions: Transaction[];
  expenses: Expense[];
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  inventory: InventoryItem[];
  vehicleExpenses: VehicleExpense[];
  users: User[];
  settings: AppSettings;
  journalEntries: JournalEntry[];
  accounts: ChartAccount[];
  scaleTickets: ScaleTicket[];
  liveScaleWeight?: number;
  isScaleConnected?: boolean;
}
