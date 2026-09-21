import { ChartAccount, Invoice, InventoryItem, Person, Transaction, Expense, JournalEntry, JournalEntryLine } from '../types';
import { roundToTwo } from './accountingUtils';

// Standard Chart of Accounts (دليل الحسابات المحاسبي المعتمد)
export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccount[] = [
  { id: 'acc_1101', code: '1101', name: 'الصندوق والخزينة الرئيسية', type: 'asset', nature: 'debit', description: 'النقدية بالصندوق الرئيسي للمنشأة' },
  { id: 'acc_1102', code: '1102', name: 'البنك والحسابات الجارية', type: 'asset', nature: 'debit', description: 'الحسابات المصرفية الجارية' },
  { id: 'acc_1103', code: '1103', name: 'العملاء والمدينون', type: 'asset', nature: 'debit', description: 'حسابات الذمم المدينة للعملاء' },
  { id: 'acc_1104', code: '1104', name: 'مخزون المواد والحديد الخام', type: 'asset', nature: 'debit', description: 'قيمة بضاعة المخزن بالتكلفة' },
  { id: 'acc_2101', code: '2101', name: 'الموردون والدائنون', type: 'liability', nature: 'credit', description: 'حسابات الذمم الدائنة للموردين' },
  { id: 'acc_3101', code: '3101', name: 'رأس المال وحقوق الملكية', type: 'equity', nature: 'credit', description: 'رأس مال المنشأة' },
  { id: 'acc_4101', code: '4101', name: 'إيرادات مبيعات الحديد والمواد', type: 'revenue', nature: 'credit', description: 'مبيعات المنتجات والحديد الخام' },
  { id: 'acc_4102', code: '4102', name: 'إيرادات خدمات الليزر والتشغيل والطعج', type: 'revenue', nature: 'credit', description: 'إيرادات تشغيل ماكينات الليزر والمقصات والطعج' },
  { id: 'acc_4103', code: '4103', name: 'إيرادات نولون وشحن (مبيعات)', type: 'revenue', nature: 'credit', description: 'إيرادات خدمات الشحن والنقل المحملة على العملاء' },
  { id: 'acc_4201', code: '4201', name: 'الخصم المكتسب من الموردين', type: 'revenue', nature: 'credit', description: 'خصومات الشراء المكتسبة' },
  { id: 'acc_5101', code: '5101', name: 'تكلفة البضاعة المباعة (COGS)', type: 'expense', nature: 'debit', description: 'تكلفة المواد المسحوبة للمبيعات' },
  { id: 'acc_5201', code: '5201', name: 'الخصم المسموح به للعملاء', type: 'expense', nature: 'debit', description: 'خصومات المبيعات الممنوحة' },
  { id: 'acc_5301', code: '5301', name: 'المصروفات العمومية والتشغيلية', type: 'expense', nature: 'debit', description: 'مصاريف التشغيل والصيانة والوقود والمكتب' },
  { id: 'acc_5302', code: '5302', name: 'مصروفات نقل ومشالات (مشتريات)', type: 'expense', nature: 'debit', description: 'تكاليف النقل والتحميل الخاصة بالمشتريات' },
];

export function getAccountByCode(code: string, accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS): ChartAccount {
  const found = accounts.find(a => a.code === code);
  if (found) return found;
  
  const firstDigit = code[0];
  const nature = (firstDigit === '1' || firstDigit === '5') ? 'debit' : 'credit';
  const type = firstDigit === '1' ? 'asset' : firstDigit === '2' ? 'liability' : firstDigit === '3' ? 'equity' : firstDigit === '4' ? 'revenue' : 'expense';

  return {
    id: `acc_${code}`,
    code,
    name: `حساب ${code}`,
    type,
    nature
  };
}

export function generateEntryNumber(prefix: string = 'JV', existingEntries: JournalEntry[] = []): string {
  const year = new Date().getFullYear();
  
  // Find highest number for this prefix/year
  let maxNum = 1000;
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  
  existingEntries.forEach(e => {
    const match = e.entryNumber.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return `${prefix}-${year}-${String(maxNum + 1).padStart(5, '0')}`;
}

/**
 * Automated Double-Entry Journal Generator for Sales & Purchase Invoices
 * Enforces strict perpetual inventory accounting and balanced debits & credits
 */
export function generateInvoiceJournalEntry(
  invoice: Invoice,
  inventory: InventoryItem[],
  party?: Person,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS,
  existingEntries: JournalEntry[] = []
): JournalEntry {
  const lines: JournalEntryLine[] = [];
  const entryId = `je_${invoice.id}_${Date.now()}`;
  const isSalesSide = invoice.type === 'sales' || invoice.type === 'sales_return';
  const partyName = party?.name || (isSalesSide ? 'عميل نقدي' : 'مورد عام');

  const accTreasury = getAccountByCode('1101', accounts);
  const accReceivable = getAccountByCode('1103', accounts);
  const accInventory = getAccountByCode('1104', accounts);
  const accPayable = getAccountByCode('2101', accounts);
  const accSalesRev = invoice.category === 'laser' || invoice.category === 'bending' || invoice.category === 'manufacturing'
    ? getAccountByCode('4102', accounts)
    : getAccountByCode('4101', accounts);
  const accSalesFreight = getAccountByCode('4103', accounts);
  const accPurchaseFreight = getAccountByCode('5302', accounts);
  const accPurchaseDiscount = getAccountByCode('4201', accounts);
  const accCOGS = getAccountByCode('5101', accounts);
  const accSalesDiscount = getAccountByCode('5201', accounts);

  if (invoice.type === 'sales') {
    // ----------------------------------------------------
    // SALES INVOICE (فاتورة مبيعات)
    // ----------------------------------------------------
    
    // 1. Party Account (Receivable/Payable) & Revenue/Inventory
    // Enforce balance: Debit (Party) = Credit (Revenue + Freight - Discount)
    
    // 1. Revenue part (Gross)
    lines.push({
      id: `${entryId}_line_rev`,
      accountId: accSalesRev.id,
      accountCode: accSalesRev.code,
      accountName: accSalesRev.name,
      debit: 0,
      credit: roundToTwo(invoice.subtotal),
      description: `إيرادات مبيعات فاتورة #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

    // 2. Party Balance part (Full Total Charge)
    lines.push({
      id: `${entryId}_line_ar`,
      accountId: accReceivable.id,
      accountCode: accReceivable.code,
      accountName: `${accReceivable.name} - [${partyName}]`,
      debit: roundToTwo(invoice.total),
      credit: 0,
      description: `استحقاق مبيعات فاتورة #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

    // 3. Sales Discount Allowed (الخصم المسموح به)
    if (invoice.discount > 0) {
      lines.push({
        id: `${entryId}_line_disc`,
        accountId: accSalesDiscount.id,
        accountCode: accSalesDiscount.code,
        accountName: accSalesDiscount.name,
        debit: roundToTwo(invoice.discount),
        credit: 0,
        description: `خصم مسموح به على فاتورة #${invoice.invoiceNumber}`,
        partyId: invoice.personId,
        partyName
      });
    }

    // 4. Freight Cost (إيرادات النقل)
    if (invoice.freightCost && invoice.freightCost > 0) {
      lines.push({
        id: `${entryId}_line_freight`,
        accountId: accSalesFreight.id,
        accountCode: accSalesFreight.code,
        accountName: accSalesFreight.name,
        debit: 0,
        credit: roundToTwo(invoice.freightCost),
        description: `إيرادات نولون شحن فاتورة #${invoice.invoiceNumber}`,
        partyId: invoice.personId,
        partyName
      });
    }

    // 5. Cost of Goods Sold & Inventory Asset (تكلفة البضاعة المباعة ومخزون الحديد)
    let totalCOGS = 0;
    invoice.items.forEach(item => {
      let unitCost = 0;
      if (item.inventoryItemId) {
        const invItem = inventory.find(i => i.id === item.inventoryItemId);
        if (invItem && invItem.purchasePrice > 0) {
          unitCost = invItem.purchasePrice;
        }
      }
      if (unitCost > 0) {
        totalCOGS += (item.quantity * unitCost);
      }
    });

    totalCOGS = roundToTwo(totalCOGS);

    if (totalCOGS > 0) {
      lines.push({
        id: `${entryId}_line_cogs`,
        accountId: accCOGS.id,
        accountCode: accCOGS.code,
        accountName: accCOGS.name,
        debit: totalCOGS,
        credit: 0,
        description: `إثبات تكلفة البضاعة المباعة لفاتورة #${invoice.invoiceNumber}`
      });

      lines.push({
        id: `${entryId}_line_inv`,
        accountId: accInventory.id,
        accountCode: accInventory.code,
        accountName: accInventory.name,
        debit: 0,
        credit: totalCOGS,
        description: `صرف مخزون المواد لفاتورة مبيعات #${invoice.invoiceNumber}`
      });
    }

  } else if (invoice.type === 'sales_return') {
    // ----------------------------------------------------
    // SALES RETURN (مرتجع مبيعات)
    // ----------------------------------------------------
    
    // 1. Sales Revenue (Debit) for Gross Subtotal
    lines.push({
      id: `${entryId}_line_rev_rtn`,
      accountId: accSalesRev.id,
      accountCode: accSalesRev.code,
      accountName: accSalesRev.name,
      debit: roundToTwo(invoice.subtotal),
      credit: 0,
      description: `مرتجع مبيعات فاتورة #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

    // 3. Accounts Receivable (العملاء) (Full Return Total Credit)
    lines.push({
      id: `${entryId}_line_ar_rtn`,
      accountId: accReceivable.id,
      accountCode: accReceivable.code,
      accountName: `${accReceivable.name} - [${partyName}]`,
      debit: 0,
      credit: roundToTwo(invoice.total),
      description: `تخفيض مديونية العميل بمرتجع مبيعات #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

    // 5. Restore Inventory Asset (Debit) & COGS Reversal (Credit)
    let totalCOGS = 0;
    invoice.items.forEach(item => {
      let unitCost = 0;
      if (item.inventoryItemId) {
        const invItem = inventory.find(i => i.id === item.inventoryItemId);
        if (invItem && invItem.purchasePrice > 0) {
          unitCost = invItem.purchasePrice;
        }
      }
      if (unitCost > 0) {
        totalCOGS += (item.quantity * unitCost);
      }
    });

    totalCOGS = roundToTwo(totalCOGS);

    if (totalCOGS > 0) {
      lines.push({
        id: `${entryId}_line_inv_rtn`,
        accountId: accInventory.id,
        accountCode: accInventory.code,
        accountName: accInventory.name,
        debit: totalCOGS,
        credit: 0,
        description: `إرجاع بضاعة للمستودع لمرتجع مبيعات #${invoice.invoiceNumber}`
      });

      lines.push({
        id: `${entryId}_line_cogs_rtn`,
        accountId: accCOGS.id,
        accountCode: accCOGS.code,
        accountName: accCOGS.name,
        debit: 0,
        credit: totalCOGS,
        description: `تخفيض تكلفة البضاعة المباعة لمرتجع #${invoice.invoiceNumber}`
      });
    }

  } else if (invoice.type === 'purchase') {
    // ----------------------------------------------------
    // PURCHASE INVOICE (فاتورة مشتريات)
    // ----------------------------------------------------

    // 1. Inventory Asset (مخزون المواد والحديد) for Subtotal
    lines.push({
      id: `${entryId}_line_inv_in`,
      accountId: accInventory.id,
      accountCode: accInventory.code,
      accountName: accInventory.name,
      debit: roundToTwo(invoice.subtotal),
      credit: 0,
      description: `توريد بضاعة للمخزن فاتورة مشتريات #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

    // 2. Purchase Discount Received (الخصم المكتسب)
    if (invoice.discount > 0) {
      lines.push({
        id: `${entryId}_line_pdisc`,
        accountId: accPurchaseDiscount.id,
        accountCode: accPurchaseDiscount.code,
        accountName: accPurchaseDiscount.name,
        debit: 0,
        credit: roundToTwo(invoice.discount),
        description: `خصم مكتسب من المورد فاتورة #${invoice.invoiceNumber}`,
        partyId: invoice.personId,
        partyName
      });
    }

    // 2b. Freight Cost (مصروفات النقل)
    if (invoice.freightCost && invoice.freightCost > 0) {
      lines.push({
        id: `${entryId}_line_pfreight`,
        accountId: accPurchaseFreight.id,
        accountCode: accPurchaseFreight.code,
        accountName: accPurchaseFreight.name,
        debit: roundToTwo(invoice.freightCost),
        credit: 0,
        description: `مصاريف نولون شحن مشتريات فاتورة #${invoice.invoiceNumber}`,
        partyId: invoice.personId,
        partyName
      });
    }

    // 3. Accounts Payable (الموردون) (Full Invoice Credit)
    lines.push({
      id: `${entryId}_line_ap`,
      accountId: accPayable.id,
      accountCode: accPayable.code,
      accountName: `${accPayable.name} - [${partyName}]`,
      debit: 0,
      credit: roundToTwo(invoice.total),
      description: `استحقاق دائن للمورد فاتورة مشتريات #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

  } else if (invoice.type === 'purchase_return') {
    // ----------------------------------------------------
    // PURCHASE RETURN (مرتجع مشتريات)
    // ----------------------------------------------------

    // 1. Accounts Payable (الموردون) (Full Return Total Debit)
    lines.push({
      id: `${entryId}_line_ap_rtn`,
      accountId: accPayable.id,
      accountCode: accPayable.code,
      accountName: `${accPayable.name} - [${partyName}]`,
      debit: roundToTwo(invoice.total),
      credit: 0,
      description: `تخفيض مستحقات المورد لمرتجع مشتريات #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });

    // 3. Purchase Discount Reversal (Debit) if discount was applied
    if (invoice.discount > 0) {
      lines.push({
        id: `${entryId}_line_pdisc_rtn`,
        accountId: accPurchaseDiscount.id,
        accountCode: accPurchaseDiscount.code,
        accountName: accPurchaseDiscount.name,
        debit: roundToTwo(invoice.discount),
        credit: 0,
        description: `عكس الخصم المكتسب لمرتجع مشتريات #${invoice.invoiceNumber}`,
        partyId: invoice.personId,
        partyName
      });
    }

    // 3b. Reverse Freight Expense (Credit)
    if (invoice.freightCost && invoice.freightCost > 0) {
      lines.push({
        id: `${entryId}_line_pfreight_rtn`,
        accountId: accPurchaseFreight.id,
        accountCode: accPurchaseFreight.code,
        accountName: accPurchaseFreight.name,
        debit: 0,
        credit: roundToTwo(invoice.freightCost),
        description: `عكس مصاريف نولون لمرتجع مشتريات #${invoice.invoiceNumber}`,
        partyId: invoice.personId,
        partyName
      });
    }

    // 4. Inventory Asset (مخزون المواد والحديد) (Credit) for Subtotal
    lines.push({
      id: `${entryId}_line_inv_out_rtn`,
      accountId: accInventory.id,
      accountCode: accInventory.code,
      accountName: accInventory.name,
      debit: 0,
      credit: roundToTwo(invoice.subtotal),
      description: `صرف البضاعة المرجعة للمورد من المخزن لمرتجع مشتريات #${invoice.invoiceNumber}`,
      partyId: invoice.personId,
      partyName
    });
  }

  // Self-correcting penny adjustment for exact mathematical balance
  let totalDebit = roundToTwo(lines.reduce((sum, l) => sum + l.debit, 0));
  let totalCredit = roundToTwo(lines.reduce((sum, l) => sum + l.credit, 0));
  const diff = roundToTwo(totalDebit - totalCredit);
  
  if (Math.abs(diff) >= 0.01 && lines.length > 0) {
    if (diff > 0) {
      // Debits exceed credits, reduce first debit or add credit
      if (lines[0].debit >= diff) {
        lines[0].debit = roundToTwo(lines[0].debit - diff);
      } else {
        lines.push({
          id: `${entryId}_line_adj`,
          accountId: lines[0].accountId,
          accountCode: lines[0].accountCode,
          accountName: lines[0].accountName,
          debit: 0,
          credit: diff,
          description: `تسوية فروق تقريب محاسبية لفاتورة #${invoice.invoiceNumber}`
        });
      }
    } else {
      const absDiff = Math.abs(diff);
      if (lines[0].credit >= absDiff) {
        lines[0].credit = roundToTwo(lines[0].credit - absDiff);
      } else {
        lines.push({
          id: `${entryId}_line_adj`,
          accountId: lines[0].accountId,
          accountCode: lines[0].accountCode,
          accountName: lines[0].accountName,
          debit: absDiff,
          credit: 0,
          description: `تسوية فروق تقريب محاسبية لفاتورة #${invoice.invoiceNumber}`
        });
      }
    }
    totalDebit = roundToTwo(lines.reduce((sum, l) => sum + l.debit, 0));
    totalCredit = roundToTwo(lines.reduce((sum, l) => sum + l.credit, 0));
  }

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const entryTypeLabel = 
    invoice.type === 'sales' ? 'فاتورة مبيعات' : 
    invoice.type === 'sales_return' ? 'مرتجع مبيعات' : 
    invoice.type === 'purchase_return' ? 'مرتجع مشتريات' : 
    'فاتورة مشتريات';

  return {
    id: entryId,
    entryNumber: generateEntryNumber(
      invoice.type === 'sales' ? 'JV-SALES' : 
      invoice.type === 'sales_return' ? 'JV-SLRTN' : 
      invoice.type === 'purchase_return' ? 'JV-PRRTN' : 
      'JV-PURCH',
      existingEntries
    ),
    date: invoice.date || new Date().toISOString().split('T')[0],
    referenceType: invoice.type + '_invoice' as any,
    referenceId: invoice.id,
    referenceNumber: invoice.invoiceNumber,
    description: `قيد إثبات ${entryTypeLabel} رقم #${invoice.invoiceNumber} - ${partyName}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
    status: 'posted',
    createdAt: new Date().toISOString()
  };
}

/**
 * Generates balanced double-entry journal entry for standalone payment receipts/vouchers
 */
export function generatePaymentJournalEntry(
  tx: Transaction,
  party?: Person,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS,
  existingEntries: JournalEntry[] = []
): JournalEntry {
  const entryId = `je_tx_${tx.id}_${Date.now()}`;
  const lines: JournalEntryLine[] = [];
  const accTreasury = getAccountByCode('1101', accounts);
  const accReceivable = getAccountByCode('1103', accounts);
  const accPayable = getAccountByCode('2101', accounts);
  const partyName = party?.name || 'طرف معني';

  const amount = roundToTwo(tx.amount);

  if (tx.type === 'payment_in') {
    // Client pays into Treasury (سند قبض)
    lines.push({
      id: `${entryId}_line_cash`,
      accountId: accTreasury.id,
      accountCode: accTreasury.code,
      accountName: accTreasury.name,
      debit: amount,
      credit: 0,
      description: `تحصيل نقدي بالخزينة: ${tx.notes || 'سند قبض'}`,
      partyId: tx.personId,
      partyName
    });
    lines.push({
      id: `${entryId}_line_ar`,
      accountId: accReceivable.id,
      accountCode: accReceivable.code,
      accountName: `${accReceivable.name} - [${partyName}]`,
      debit: 0,
      credit: amount,
      description: `تخفيض مديونية العميل: ${tx.notes || 'سند قبض'}`,
      partyId: tx.personId,
      partyName
    });
  } else if (tx.type === 'payment_out') {
    // Payment out to Supplier from Treasury (سند صرف)
    lines.push({
      id: `${entryId}_line_ap`,
      accountId: accPayable.id,
      accountCode: accPayable.code,
      accountName: `${accPayable.name} - [${partyName}]`,
      debit: amount,
      credit: 0,
      description: `سداد مستحقات المورد: ${tx.notes || 'سند صرف'}`,
      partyId: tx.personId,
      partyName
    });
    lines.push({
      id: `${entryId}_line_cash`,
      accountId: accTreasury.id,
      accountCode: accTreasury.code,
      accountName: accTreasury.name,
      debit: 0,
      credit: amount,
      description: `صرف نقدي من الخزينة: ${tx.notes || 'سند صرف'}`,
      partyId: tx.personId,
      partyName
    });
  }

  const totalDebit = roundToTwo(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = roundToTwo(lines.reduce((s, l) => s + l.credit, 0));
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return {
    id: entryId,
    entryNumber: generateEntryNumber(tx.type === 'payment_in' ? 'JV-REC' : 'JV-PAY', existingEntries),
    date: tx.date || new Date().toISOString().split('T')[0],
    referenceType: tx.type === 'payment_in' ? 'payment_in' : 'payment_out',
    referenceId: tx.id,
    description: `قيد ${tx.type === 'payment_in' ? 'سند قبض نقدية' : 'سند صرف نقدية'} - ${partyName}`,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
    status: 'posted',
    createdAt: new Date().toISOString()
  };
}

/**
 * Generates balanced double-entry journal entry for an operational expense
 */
export function generateExpenseJournalEntry(
  exp: Expense,
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS,
  existingEntries: JournalEntry[] = []
): JournalEntry {
  const entryId = `je_exp_${exp.id}_${Date.now()}`;
  const accTreasury = getAccountByCode('1101', accounts);
  const accExpenses = getAccountByCode('5301', accounts);
  const amount = roundToTwo(exp.amount);

  const lines: JournalEntryLine[] = [
    {
      id: `${entryId}_line_exp`,
      accountId: accExpenses.id,
      accountCode: accExpenses.code,
      accountName: `${accExpenses.name} (${exp.category})`,
      debit: amount,
      credit: 0,
      description: exp.description || `مصروف: ${exp.category}`
    },
    {
      id: `${entryId}_line_cash`,
      accountId: accTreasury.id,
      accountCode: accTreasury.code,
      accountName: accTreasury.name,
      debit: 0,
      credit: amount,
      description: `صرف من الخزينة للمصروف: ${exp.description || exp.category}`
    }
  ];

  return {
    id: entryId,
    entryNumber: generateEntryNumber('JV-EXP', existingEntries),
    date: exp.date || new Date().toISOString().split('T')[0],
    referenceType: 'expense',
    referenceId: exp.id,
    description: `قيد مصروفات تشغيلية - ${exp.category}: ${exp.description}`,
    lines,
    totalDebit: amount,
    totalCredit: amount,
    isBalanced: true,
    status: 'posted',
    createdAt: new Date().toISOString()
  };
}

export interface AccountBalanceSummary {
  account: ChartAccount;
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
  finalBalance: number;
}

/**
 * Computes the full Trial Balance (ميزان المراجعة بالأرصدة والمجاميع)
 */
export function calculateTrialBalance(
  journalEntries: JournalEntry[],
  accounts: ChartAccount[] = DEFAULT_CHART_OF_ACCOUNTS
): {
  balances: AccountBalanceSummary[];
  sumDebit: number;
  sumCredit: number;
  isEquilibrium: boolean;
} {
  const postedEntries = journalEntries.filter(e => e.status === 'posted');
  const balancesMap: Record<string, { totalDebit: number; totalCredit: number; name: string; nature: 'debit' | 'credit' }> = {};

  accounts.forEach(acc => {
    balancesMap[acc.code] = { totalDebit: 0, totalCredit: 0, name: acc.name, nature: acc.nature };
  });

  postedEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (!balancesMap[line.accountCode]) {
        balancesMap[line.accountCode] = { 
          totalDebit: 0, 
          totalCredit: 0, 
          name: line.accountName || `حساب ${line.accountCode}`,
          nature: line.accountCode.startsWith('1') || line.accountCode.startsWith('5') ? 'debit' : 'credit'
        };
      }
      balancesMap[line.accountCode].totalDebit += line.debit;
      balancesMap[line.accountCode].totalCredit += line.credit;
    });
  });

  const allCodes = Object.keys(balancesMap).sort();
  const balances: AccountBalanceSummary[] = allCodes.map(code => {
    const raw = balancesMap[code];
    const totalDebit = roundToTwo(raw.totalDebit);
    const totalCredit = roundToTwo(raw.totalCredit);
    const nature = raw.nature;
    
    let finalBalance = 0;
    let netDebit = 0;
    let netCredit = 0;

    if (nature === 'debit') {
      finalBalance = roundToTwo(totalDebit - totalCredit);
      if (finalBalance >= 0) {
        netDebit = finalBalance;
      } else {
        netCredit = Math.abs(finalBalance);
      }
    } else {
      finalBalance = roundToTwo(totalCredit - totalDebit);
      if (finalBalance >= 0) {
        netCredit = finalBalance;
      } else {
        netDebit = Math.abs(finalBalance);
      }
    }

    return {
      account: { id: `acc_${code}`, code, name: raw.name, nature, type: 'asset' } as ChartAccount,
      totalDebit,
      totalCredit,
      netDebit,
      netCredit,
      finalBalance
    };
  });

  const sumDebit = roundToTwo(balances.reduce((s, b) => s + b.netDebit, 0));
  const sumCredit = roundToTwo(balances.reduce((s, b) => s + b.netCredit, 0));
  const isEquilibrium = Math.abs(sumDebit - sumCredit) < 0.01;

  return { balances, sumDebit, sumCredit, isEquilibrium };
}
