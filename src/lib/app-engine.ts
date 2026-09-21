import { AppState, Invoice, Transaction, InventoryItem, Person, JournalEntry } from '../types';
import { InventoryEngine } from './inventory-engine';
import { AccountingEngine } from './accounting-engine';
import { generateInvoiceJournalEntry, generatePaymentJournalEntry, generateExpenseJournalEntry } from '../utils/journalGenerator';

export class AppEngine {
  static generateId = () => Math.random().toString(36).substring(2, 9);

  /**
   * Orchestrates adding a new invoice and all its side effects
   */
  static addInvoice(state: AppState, invoice: Omit<Invoice, 'id' | 'createdAt'>): AppState {
    const id = this.generateId();
    const createdAt = new Date().toISOString();
    const newInvoice: Invoice = { ...invoice, id, createdAt };

    // 1. Update Inventory
    const updatedInventory = state.inventory.map(item => {
      const adjustment = InventoryEngine.getStockAdjustment(item, newInvoice);
      if (adjustment !== 0) {
        return { ...item, quantity: item.quantity + adjustment, lastUpdated: createdAt };
      }
      return item;
    });

    // 2. Generate Transactions
    const chargeTx: Transaction = {
      id: this.generateId(),
      personId: invoice.personId,
      invoiceId: id,
      type: 'invoice_charge',
      category: invoice.category,
      amount: invoice.total,
      date: invoice.date || createdAt.split('T')[0],
      createdAt,
      notes: `فاتورة رقم ${invoice.invoiceNumber}`
    };

    const transactions = [...state.transactions, chargeTx];
    if (invoice.paidAmount > 0) {
      transactions.push({
        id: this.generateId(),
        personId: invoice.personId,
        invoiceId: id,
        type: (invoice.type === 'sales' || invoice.type === 'purchase_return') ? 'payment_in' : 'payment_out',
        category: invoice.category,
        amount: invoice.paidAmount,
        date: invoice.date || createdAt.split('T')[0],
        createdAt,
        notes: `دفعة من فاتورة ${invoice.invoiceNumber}`,
        paymentMethod: invoice.paymentMethod || 'cash'
      });
    }

    // 3. Generate Journal Entry
    const party = state.clients.find(c => c.id === invoice.personId) || state.suppliers.find(s => s.id === invoice.personId);
    const journalEntry = generateInvoiceJournalEntry(newInvoice, updatedInventory, party, state.accounts, state.journalEntries);

    const nextState: AppState = {
      ...state,
      invoices: [newInvoice, ...state.invoices],
      inventory: updatedInventory,
      transactions,
      journalEntries: [journalEntry, ...state.journalEntries]
    };

    return this.recalculateAllBalances(nextState);
  }

  /**
   * Orchestrates updating an invoice
   */
  static updateInvoice(state: AppState, id: string, data: Partial<Invoice>): AppState {
    const oldInvoice = state.invoices.find(i => i.id === id || i.invoiceNumber === id);
    if (!oldInvoice) return state;

    const newInvoice = { ...oldInvoice, ...data };
    const createdAt = new Date().toISOString();

    // 1. Rollback old inventory
    let updatedInventory = state.inventory.map(item => {
      const rollback = InventoryEngine.getStockAdjustment(item, oldInvoice, true);
      if (rollback !== 0) return { ...item, quantity: item.quantity + rollback, lastUpdated: createdAt };
      return item;
    });

    // 2. Apply new inventory
    updatedInventory = updatedInventory.map(item => {
      const adjustment = InventoryEngine.getStockAdjustment(item, newInvoice);
      if (adjustment !== 0) return { ...item, quantity: item.quantity + adjustment, lastUpdated: createdAt };
      return item;
    });

    // 3. Remove old transactions and journal entries
    const nextTransactions = state.transactions.filter(t => 
      t.invoiceId !== oldInvoice.id && t.invoiceId !== oldInvoice.invoiceNumber
    );
    const nextJournal = state.journalEntries.filter(je => 
      je.referenceId !== oldInvoice.id && je.referenceNumber !== oldInvoice.invoiceNumber
    );

    // 4. Generate new transactions
    const chargeTx: Transaction = {
      id: this.generateId(),
      personId: newInvoice.personId,
      invoiceId: newInvoice.id,
      type: 'invoice_charge',
      category: newInvoice.category,
      amount: newInvoice.total,
      date: newInvoice.date || createdAt.split('T')[0],
      notes: `تعديل فاتورة رقم ${newInvoice.invoiceNumber}`
    };

    const finalTransactions = [...nextTransactions, chargeTx];
    if (newInvoice.paidAmount > 0) {
      finalTransactions.push({
        id: this.generateId(),
        personId: newInvoice.personId,
        invoiceId: newInvoice.id,
        type: (newInvoice.type === 'sales' || newInvoice.type === 'purchase_return') ? 'payment_in' : 'payment_out',
        category: newInvoice.category,
        amount: newInvoice.paidAmount,
        date: newInvoice.date || createdAt.split('T')[0],
        notes: `دفعة من تعديل فاتورة رقم ${newInvoice.invoiceNumber}`,
        paymentMethod: newInvoice.paymentMethod || 'cash'
      });
    }

    // 5. Generate new Journal Entry
    const party = state.clients.find(c => c.id === newInvoice.personId) || state.suppliers.find(s => s.id === newInvoice.personId);
    const journalEntry = generateInvoiceJournalEntry(newInvoice, updatedInventory, party, state.accounts, state.journalEntries);

    const nextState: AppState = {
      ...state,
      invoices: state.invoices.map(i => i.id === id ? newInvoice : i),
      transactions: finalTransactions,
      inventory: updatedInventory,
      journalEntries: [journalEntry, ...nextJournal]
    };

    return this.recalculateAllBalances(nextState);
  }

  /**
   * Orchestrates deleting an invoice
   */
  static deleteInvoice(state: AppState, id: string): AppState {
    const invoice = state.invoices.find(i => i.id === id || i.invoiceNumber === id);
    if (!invoice) return state;

    const createdAt = new Date().toISOString();

    // 1. Rollback inventory
    const updatedInventory = state.inventory.map(item => {
      const rollback = InventoryEngine.getStockAdjustment(item, invoice, true);
      if (rollback !== 0) return { ...item, quantity: item.quantity + rollback, lastUpdated: createdAt };
      return item;
    });

    // 2. Remove related records
    const nextInvoices = state.invoices.filter(i => i.id !== invoice.id && i.invoiceNumber !== invoice.invoiceNumber);
    const nextTransactions = state.transactions.filter(t => 
      t.invoiceId !== invoice.id && t.invoiceId !== invoice.invoiceNumber
    );
    const nextJournal = state.journalEntries.filter(je => 
      je.referenceId !== invoice.id && je.referenceNumber !== invoice.invoiceNumber
    );

    const nextState: AppState = {
      ...state,
      invoices: nextInvoices,
      transactions: nextTransactions,
      inventory: updatedInventory,
      journalEntries: nextJournal
    };

    return this.recalculateAllBalances(nextState);
  }

  /**
   * Orchestrates adding a new transaction (payment in/out)
   */
  static addTransaction(state: AppState, transaction: Omit<Transaction, 'id' | 'createdAt'>): AppState {
    const id = this.generateId();
    const createdAt = new Date().toISOString();
    const newTx: Transaction = { ...transaction, id, createdAt };

    // 1. Update Invoice if linked
    let nextInvoices = state.invoices;
    if (newTx.invoiceId && (newTx.type === 'payment_in' || newTx.type === 'payment_out')) {
      nextInvoices = state.invoices.map(inv => {
        if (inv.id === newTx.invoiceId || inv.invoiceNumber === newTx.invoiceId) {
          const newPaid = inv.paidAmount + newTx.amount;
          return {
            ...inv,
            paidAmount: newPaid,
            remainingAmount: Math.max(0, inv.total - newPaid)
          };
        }
        return inv;
      });
    }

    // 2. Generate Journal Entry
    const party = state.clients.find(c => c.id === transaction.personId) || state.suppliers.find(s => s.id === transaction.personId);
    const journalEntry = generatePaymentJournalEntry(newTx, party, state.accounts, state.journalEntries);

    const nextState: AppState = {
      ...state,
      transactions: [newTx, ...state.transactions],
      invoices: nextInvoices,
      journalEntries: [journalEntry, ...state.journalEntries]
    };

    return this.recalculateAllBalances(nextState);
  }

  /**
   * Orchestrates deleting a transaction
   */
  static deleteTransaction(state: AppState, id: string): AppState {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return state;

    // 1. Rollback Invoice if linked
    let nextInvoices = state.invoices;
    if (tx.invoiceId && (tx.type === 'payment_in' || tx.type === 'payment_out')) {
      nextInvoices = state.invoices.map(inv => {
        if (inv.id === tx.invoiceId || inv.invoiceNumber === tx.invoiceId) {
          const newPaid = Math.max(0, inv.paidAmount - tx.amount);
          return {
            ...inv,
            paidAmount: newPaid,
            remainingAmount: Math.max(0, inv.total - newPaid)
          };
        }
        return inv;
      });
    }

    const nextTransactions = state.transactions.filter(t => t.id !== id);
    const nextJournal = state.journalEntries.filter(je => je.referenceId !== id);

    const nextState: AppState = {
      ...state,
      invoices: nextInvoices,
      transactions: nextTransactions,
      journalEntries: nextJournal
    };

    return this.recalculateAllBalances(nextState);
  }

  static recalculateAllBalances(state: AppState): AppState {
    const updatedInventory = state.inventory.map(item => ({
      ...item,
      quantity: InventoryEngine.calculateStock(item, state.invoices)
    }));

    const updatedClients = state.clients.map(c => ({
      ...c,
      balance: AccountingEngine.calculatePersonBalance(c, state.transactions, state.invoices)
    }));

    const updatedSuppliers = state.suppliers.map(s => ({
      ...s,
      balance: AccountingEngine.calculatePersonBalance(s, state.transactions, state.invoices)
    }));

    return {
      ...state,
      inventory: updatedInventory,
      clients: updatedClients,
      suppliers: updatedSuppliers
    };
  }

  /**
   * Scans all invoices and ensures they have an 'invoice_charge' transaction
   * and that their payments are reflected in 'payment_in/out' transactions.
   * This is a "Real Fix" for inconsistent data.
   */
  static normalizeTransactions(state: AppState): AppState {
    let nextTransactions = [...state.transactions];
    const existingChargeInvIds = new Set(nextTransactions.filter(t => t.type === 'invoice_charge').map(t => t.invoiceId));
    
    // 1. Ensure Charges
    state.invoices.forEach(inv => {
      if (!existingChargeInvIds.has(inv.id) && !existingChargeInvIds.has(inv.invoiceNumber)) {
        nextTransactions.push({
          id: `charge-${inv.id}`,
          personId: inv.personId,
          invoiceId: inv.id,
          type: 'invoice_charge',
          category: inv.category,
          amount: inv.total,
          date: inv.date,
          createdAt: inv.createdAt,
          notes: `قيد آلي للفاتورة رقم ${inv.invoiceNumber}`
        });
      }
    });

    // 2. Sync Invoices' internal paidAmount with transactions
    // If an invoice says it's paid 1000 but there's no payment transaction for it, create one.
    state.invoices.forEach(inv => {
      if (inv.paidAmount > 0) {
        const relatedPayments = nextTransactions.filter(t => 
          (t.invoiceId === inv.id || t.invoiceId === inv.invoiceNumber) && 
          (t.type === 'payment_in' || t.type === 'payment_out')
        );
        const totalPaidInTxs = relatedPayments.reduce((sum, t) => sum + t.amount, 0);
        
        const diff = inv.paidAmount - totalPaidInTxs;
        if (Math.abs(diff) > 0.01) {
          nextTransactions.push({
            id: `adj-pay-${inv.id}-${Date.now()}`,
            personId: inv.personId,
            invoiceId: inv.id,
            type: (inv.type === 'sales' || inv.type === 'purchase_return') ? 'payment_in' : 'payment_out',
            category: inv.category,
            amount: diff,
            date: inv.date,
            createdAt: inv.createdAt,
            notes: `قيد تسوية دفعات للفاتورة رقم ${inv.invoiceNumber}`,
            paymentMethod: inv.paymentMethod || 'cash'
          });
        }
      }
    });

    return this.recalculateAllBalances({ ...state, transactions: nextTransactions });
  }

  /**
   * Fully regenerates the journal entries from original documents to ensure accounting integrity.
   */
  static regenerateAllJournalEntries(state: AppState): AppState {
    const journalEntries: JournalEntry[] = [];
    
    // 1. Process Invoices (Sales, Purchase, Returns)
    state.invoices.forEach(inv => {
      const party = state.clients.find(c => c.id === inv.personId) || state.suppliers.find(s => s.id === inv.personId);
      const je = generateInvoiceJournalEntry(inv, state.inventory, party, state.accounts, journalEntries);
      journalEntries.push(je);
    });

    // 2. Process Standalone Transactions (Payments)
    state.transactions.forEach(tx => {
      // Skip invoice_charge as they are handled by generateInvoiceJournalEntry
      if (tx.type === 'invoice_charge') return;
      
      const party = state.clients.find(c => c.id === tx.personId) || state.suppliers.find(s => s.id === tx.personId);
      const je = generatePaymentJournalEntry(tx, party, state.accounts, journalEntries);
      journalEntries.push(je);
    });

    // 3. Process Expenses
    state.expenses.forEach(exp => {
      const je = generateExpenseJournalEntry(exp, state.accounts, journalEntries);
      journalEntries.push(je);
    });

    // 4. Preserve manual entries
    const manualEntries = state.journalEntries.filter(je => je.referenceType === 'manual');
    
    return {
      ...state,
      journalEntries: [...journalEntries, ...manualEntries].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    };
  }
}
