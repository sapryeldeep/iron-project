import { Person, Invoice, Transaction, PaymentMethod, AppState } from '../types';
import { roundToTwo, formatCurrency } from '../utils/accountingUtils';

export interface TreasuryEntry {
  id: string;
  date: string;
  docNumber: string;
  type: 'payment_in' | 'payment_out' | 'expense' | 'invoice_charge';
  typeLabel: string;
  personName: string;
  personId: string;
  notes: string;
  channel: PaymentMethod;
  amountIn: number;
  amountOut: number;
  runningTotalBalance: number;
  runningChannelBalance: number;
  rawTimestamp: number;
}

export interface LedgerRow {
  id: string;
  date: string;
  createdAt: string;
  refNumber: string;
  type: string;
  typeLabel: string;
  category: string;
  description: string;
  balanceBefore: number;
  invoiceTotal: number;
  amountPaid: number;
  remaining: number;
  debit: number;
  credit: number;
  balance: number;
  balanceLabel: 'لنا' | 'له' | 'خالص';
  isPrior: boolean;
}

export class AccountingEngine {
  /**
   * Helper to calculate balance effect of a movement
   */
  public static getMovementEffect(person: Person, t: { type: string; amount: number; invoiceId?: string }, invoices: Invoice[]): number {
    const isClient = person.type === 'client';
    
    if (t.type === 'invoice_charge') {
      const inv = t.invoiceId ? invoices.find(i => i.id === t.invoiceId || i.invoiceNumber === t.invoiceId) : null;
      const isReturn = inv ? (inv.type === 'sales_return' || inv.type === 'purchase_return') : false;
      
      if (isClient) {
        return isReturn ? -t.amount : t.amount;
      } else {
        return isReturn ? t.amount : -t.amount;
      }
    } else if (t.type === 'payment_in') {
      return -t.amount; // Always Credit (-)
    } else if (t.type === 'payment_out') {
      return t.amount; // Always Debit (+)
    }
    return 0;
  }

  /**
   * Calculates the net balance for a specific person.
   * "Real Fix": Relies strictly on transactions and opening balance.
   */
  static calculatePersonBalance(person: Person, transactions: Transaction[], invoices: Invoice[]): number {
    let balance = Number(person.openingBalance) || 0;

    // 1. Transactions - Everything must be a transaction (Charge, Payment In, Payment Out)
    const personTxs = transactions.filter(t => t.personId === person.id);
    personTxs.forEach(t => {
      balance += this.getMovementEffect(person, t, invoices);
    });

    return roundToTwo(balance);
  }

  /**
   * Generates a detailed ledger for a person
   */
  static generateLedger(
    person: Person,
    transactions: Transaction[],
    invoices: Invoice[],
    startDate?: string,
    endDate?: string
  ) {
    const isClient = person.type === 'client';

    // 1. Gather all movements - Strictly from transactions now
    const allMovements: Transaction[] = transactions.filter(t => t.personId === person.id);

    // Chronological Sort
    allMovements.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      
      // If same time, charge comes before payment
      if (a.invoiceId && b.invoiceId && a.invoiceId === b.invoiceId) {
        if (a.type === 'invoice_charge' && b.type !== 'invoice_charge') return -1;
        if (a.type !== 'invoice_charge' && b.type === 'invoice_charge') return 1;
      }
      return (a.id || '').localeCompare(b.id || '');
    });

    const startFilter = startDate ? new Date(startDate) : null;
    if (startFilter) startFilter.setHours(0, 0, 0, 0);
    const endFilter = endDate ? new Date(endDate) : null;
    if (endFilter) endFilter.setHours(23, 59, 59, 999);

    let runningPrior = Number(person.openingBalance) || 0;
    const periodMovements: Transaction[] = [];

    for (const t of allMovements) {
      const d = new Date(t.date);
      if (startFilter && d < startFilter) {
        runningPrior += this.getMovementEffect(person, t, invoices);
      } else if (!endFilter || d <= endFilter) {
        periodMovements.push(t);
      }
    }

    let currentBalance = runningPrior;
    let sDebit = 0;
    let sCredit = 0;
    const rows: LedgerRow[] = [];

    // Prior Balance Row
    if (runningPrior !== 0 || startDate) {
      const priorLabel = this.getBalanceLabel(runningPrior);
      let enhancedPriorLabel = priorLabel;
      if (runningPrior !== 0) {
        if ((isClient && runningPrior < 0) || (!isClient && runningPrior > 0)) {
          enhancedPriorLabel += ' (دفع مسبق)';
        }
      }

      rows.push({
        id: 'prior',
        date: startDate || person.createdAt?.slice(0, 10) || '2026-01-01',
        createdAt: startDate || person.createdAt || '2026-01-01',
        refNumber: 'رصيد سابق',
        type: 'prior',
        typeLabel: 'رصيد مرحل / سابق',
        category: 'prior',
        description: startDate ? `رصيد ما قبل الفترة حتى ${startDate}` : 'رصيد افتتاحي سابق',
        balanceBefore: 0,
        invoiceTotal: 0,
        amountPaid: 0,
        remaining: 0,
        debit: runningPrior > 0 ? (isClient ? runningPrior : 0) : (isClient ? 0 : Math.abs(runningPrior)),
        credit: runningPrior > 0 ? (isClient ? 0 : runningPrior) : (isClient ? Math.abs(runningPrior) : 0),
        balance: runningPrior,
        balanceLabel: enhancedPriorLabel as any,
        isPrior: true
      });
    }

    // Identify linked payments to merge them
    const consumedPaymentIds = new Set<string>();

    periodMovements.forEach((t, idx) => {
      if (consumedPaymentIds.has(t.id)) return;

      const balanceBefore = currentBalance;
      let debit = 0;
      let credit = 0;
      let typeLabel = '';
      let description = t.notes || '';
      let refNumber = (t.id.length > 8 ? t.id.slice(0, 8) : t.id);
      let invoiceTotal = 0;
      let amountPaid = 0;
      let remaining = 0;

      if (t.type === 'invoice_charge') {
        const invoice = t.invoiceId ? invoices.find(i => i.id === t.invoiceId || i.invoiceNumber === t.invoiceId) : null;
        const isReturn = invoice ? (invoice.type === 'sales_return' || invoice.type === 'purchase_return') : false;
        
        typeLabel = isReturn ? 'فاتورة مرتجع ↩️' : (t.category === 'manufacturing' ? 'فاتورة تشغيل' : 'فاتورة مبيعات/مشتريات');
        refNumber = invoice ? `#${invoice.invoiceNumber}` : refNumber;
        invoiceTotal = t.amount;
        description = t.notes || (invoice ? `فاتورة رقم ${invoice.invoiceNumber}` : 'فاتورة');

        // Look for linked payments in ALL movements (including prior ones if they happened same day? No, just period ones for now)
        const linkedPayments = periodMovements.filter(pm => 
          !consumedPaymentIds.has(pm.id) && 
          pm.invoiceId === t.invoiceId && 
          (pm.type === 'payment_in' || pm.type === 'payment_out')
        );

        const totalLinkedPayment = linkedPayments.reduce((sum, p) => sum + p.amount, 0);
        amountPaid = totalLinkedPayment;
        remaining = roundToTwo(invoiceTotal - amountPaid);

        // Mark as consumed
        linkedPayments.forEach(p => consumedPaymentIds.add(p.id));

        // Net effect of invoice + its immediate payment
        const chargeEffect = this.getMovementEffect(person, t, invoices);
        const paymentEffect = linkedPayments.reduce((sum, p) => sum + this.getMovementEffect(person, p, invoices), 0);
        const netEffect = roundToTwo(chargeEffect + paymentEffect);

        currentBalance += netEffect;
        debit = netEffect > 0 ? netEffect : 0;
        credit = netEffect < 0 ? Math.abs(netEffect) : 0;
      } else {
        // Standalone payment
        typeLabel = t.type === 'payment_in' ? 'سند قبض/تحصيل' : 'سند صرف/سداد';
        amountPaid = t.amount;
        const effect = this.getMovementEffect(person, t, invoices);
        currentBalance += effect;
        debit = effect > 0 ? effect : 0;
        credit = effect < 0 ? Math.abs(effect) : 0;
      }

      sDebit += debit;
      sCredit += credit;

      const rowBalance = currentBalance;
      const rowBalanceLabel = this.getBalanceLabel(rowBalance);
      let fullBalanceLabel = rowBalanceLabel;
      
      if (rowBalance !== 0) {
        const isClientPrepayment = isClient && rowBalance < 0;
        const isSupplierPrepayment = !isClient && rowBalance > 0;
        if (isClientPrepayment || isSupplierPrepayment) {
          fullBalanceLabel += ' (دفع مسبق)';
        }
      }

      rows.push({
        id: t.id || `row-${idx}`,
        date: t.date,
        createdAt: t.createdAt || t.date,
        refNumber,
        type: t.type,
        typeLabel,
        category: t.category || 'general',
        description,
        balanceBefore,
        invoiceTotal,
        amountPaid,
        remaining,
        debit,
        credit,
        balance: rowBalance,
        balanceLabel: fullBalanceLabel as any,
        isPrior: false
      });
    });

    return {
      ledgerRows: rows,
      priorBalance: runningPrior,
      periodDebit: sDebit,
      periodCredit: sCredit,
      totalAmountPaid: rows.filter(r => !r.isPrior && (r.type === 'payment_in' || r.type === 'payment_out')).reduce((sum, r) => sum + r.amountPaid, 0),
      finalBalance: currentBalance
    };
  }

  static getBalanceLabel(balance: number): 'لنا' | 'له' | 'خالص' {
    if (Math.abs(balance) < 0.01) return 'خالص';
    return balance > 0 ? 'لنا' : 'له';
  }

  static formatMoney(amount: number): string {
    return formatCurrency(amount) + ' ج.م';
  }

  /**
   * Compiles all treasury movements into a unified ledger
   */
  static getTreasuryLedger(state: AppState): TreasuryEntry[] {
    const entries: any[] = [];

    // 1. Transactions
    state.transactions.forEach(t => {
      // Ignore internal invoice charges as they don't affect cash directly unless paid
      if (t.type === 'invoice_charge') return;
      
      const person = [...state.clients, ...state.suppliers].find(p => p.id === t.personId);
      const isIn = t.type === 'payment_in';
      const channel = t.paymentMethod || 'cash';

      entries.push({
        id: `tx-${t.id}`,
        date: t.date,
        docNumber: `SND-${t.id.slice(0, 6).toUpperCase()}`,
        type: isIn ? 'payment_in' : 'payment_out',
        typeLabel: isIn ? 'سند قبض' : 'سند صرف',
        personName: person?.name || 'طرف عام',
        personId: t.personId,
        notes: t.notes || (isIn ? 'قبض نقدية' : 'صرف نقدية'),
        channel,
        amountIn: isIn ? t.amount : 0,
        amountOut: isIn ? 0 : t.amount,
        rawTimestamp: new Date(t.date).getTime()
      });
    });

    // 2. Expenses
    state.expenses.forEach(exp => {
      const channel = exp.paymentMethod || 'cash';
      entries.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        docNumber: `EXP-${exp.id.slice(0, 5).toUpperCase()}`,
        type: 'expense',
        typeLabel: 'مصروفات تشغيل',
        personName: exp.category || 'مصروف عام',
        notes: exp.description || 'مصروفات تشغيلية ونثرية',
        channel,
        amountIn: 0,
        amountOut: exp.amount,
        rawTimestamp: new Date(exp.date).getTime()
      });
    });

    // Sort chronologically
    entries.sort((a, b) => a.rawTimestamp - b.rawTimestamp);

    const opCash = state.settings?.treasuryOpeningBalanceCash || 0;
    const opBank = state.settings?.treasuryOpeningBalanceBank || 0;
    const opWallet = state.settings?.treasuryOpeningBalanceWallet || 0;
    const opInstapay = state.settings?.treasuryOpeningBalanceInstapay || 0;

    let runningTotal = opCash + opBank + opWallet + opInstapay;
    const runningChannelBalances: Record<PaymentMethod, number> = {
      cash: opCash, bank: opBank, wallet: opWallet, instapay: opInstapay
    };

    return entries.map(entry => {
      const net = entry.amountIn - entry.amountOut;
      runningTotal += net;
      const channel = entry.channel as PaymentMethod;
      if (runningChannelBalances[channel] !== undefined) {
        runningChannelBalances[channel] += net;
      }
      return {
        ...entry,
        runningTotalBalance: runningTotal,
        runningChannelBalance: runningChannelBalances[channel]
      };
    });
  }

  /**
   * Returns summary of all treasury channel balances
   */
  static getTreasuryBalances(state: AppState) {
    const ledger = this.getTreasuryLedger(state);
    
    const opCash = state.settings?.treasuryOpeningBalanceCash || 0;
    const opBank = state.settings?.treasuryOpeningBalanceBank || 0;
    const opWallet = state.settings?.treasuryOpeningBalanceWallet || 0;
    const opInstapay = state.settings?.treasuryOpeningBalanceInstapay || 0;

    const netCash = ledger.filter(e => e.channel === 'cash').reduce((sum, e) => sum + (e.amountIn - e.amountOut), 0);
    const netBank = ledger.filter(e => e.channel === 'bank').reduce((sum, e) => sum + (e.amountIn - e.amountOut), 0);
    const netWallet = ledger.filter(e => e.channel === 'wallet').reduce((sum, e) => sum + (e.amountIn - e.amountOut), 0);
    const netInstapay = ledger.filter(e => e.channel === 'instapay').reduce((sum, e) => sum + (e.amountIn - e.amountOut), 0);

    return {
      cash: opCash + netCash,
      bank: opBank + netBank,
      wallet: opWallet + netWallet,
      instapay: opInstapay + netInstapay,
      total: opCash + opBank + opWallet + opInstapay + netCash + netBank + netWallet + netInstapay
    };
  }
}
