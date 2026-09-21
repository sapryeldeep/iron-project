
import { InvoiceItem, Person, InvoiceType } from '../types';

/**
 * Standard rounding for currency to 2 decimal places
 */
export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate the sum of all item totals in an invoice
 */
export const calculateInvoiceItemsSubtotal = (items: (InvoiceItem | any)[]): number => {
  return roundToTwo(items.reduce((acc, item) => acc + (Number(item.total) || 0), 0));
};

/**
 * Calculate final invoice total including freight and discount
 */
export const calculateInvoiceTotals = (subtotal: number, freightCost: number = 0, discount: number = 0): number => {
  return roundToTwo(subtotal + (Number(freightCost) || 0) - (Number(discount) || 0));
};

/**
 * Calculate remaining amount (total - paid)
 */
export const calculateRemainingAmount = (total: number, paidAmount: number = 0): number => {
  return roundToTwo(total - (Number(paidAmount) || 0));
};

/**
 * Calculates the effect of an invoice on a person's balance.
 * Returns a number that should be ADDED to the current balance.
 */
export const calculateInvoiceBalanceEffect = (
  type: InvoiceType,
  total: number,
  paidAmount: number = 0
): number => {
  const isSalesSide = type === 'sales' || type === 'sales_return';
  const isReturn = type === 'sales_return' || type === 'purchase_return';
  const netTotal = isReturn ? -total : total;
  
  // For Clients: Charge increases balance (+), Payment decreases balance (-)
  // For Suppliers: Charge decreases balance (-), Payment increases balance (+)
  if (isSalesSide) {
    return roundToTwo(netTotal - (Number(paidAmount) || 0));
  } else {
    // For purchase side, total makes us owe more (negative), paid makes us owe less (positive)
    return roundToTwo(-netTotal + (Number(paidAmount) || 0));
  }
};

/**
 * Returns formatted string and color for a person's balance
 */
export const getBalanceDisplayInfo = (balance: number, personType: 'client' | 'supplier') => {
  const isZero = Math.abs(balance) < 0.01;
  const absBalance = Math.abs(balance);
  
  if (isZero) {
    return {
      label: 'خالص',
      colorClass: 'text-slate-500 bg-slate-100 border-slate-200',
      status: 'neutral' as const
    };
  }

  if (personType === 'client') {
    // Client Balance: Positive means they owe us, Negative means they have credit (overpaid)
    if (balance > 0) {
      return {
        label: 'عليه (مدين)',
        colorClass: 'text-rose-700 bg-rose-50 border-rose-100',
        status: 'debt' as const,
        amount: absBalance
      };
    } else {
      return {
        label: 'له (دائن/دفع مسبق)',
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        status: 'credit' as const,
        amount: absBalance
      };
    }
  } else {
    // Supplier Balance: Negative means we owe them, Positive means we have credit (prepaid)
    if (balance < 0) {
      return {
        label: 'له (دائن)',
        colorClass: 'text-rose-700 bg-rose-50 border-rose-100',
        status: 'debt' as const,
        amount: absBalance
      };
    } else {
      return {
        label: 'لنا (مدين/دفع مسبق)',
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        status: 'credit' as const,
        amount: absBalance
      };
    }
  }
};

/**
 * Standard currency formatter for Arabic/Egyptian context
 */
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};
