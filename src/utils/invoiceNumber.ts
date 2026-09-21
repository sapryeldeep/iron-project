import { Invoice, AppSettings } from '../types';

export interface NextInvoiceNumberOptions {
  type?: 'sales' | 'purchase';
  settings?: AppSettings;
}

/**
 * Generates the next sequential invoice number based on existing invoices and configuration.
 */
export function getNextInvoiceNumber(
  invoices: Invoice[] = [],
  options?: NextInvoiceNumberOptions
): string {
  const type = options?.type || 'sales';
  const settings = options?.settings;
  const mode = settings?.invoiceNumberingMode || 'unified'; // 'unified' | 'by_type' | 'numeric'
  const startNum = typeof settings?.invoiceStartingNumber === 'number' ? settings.invoiceStartingNumber : 1001;
  const customPrefix = settings?.invoiceNumberPrefix !== undefined ? settings.invoiceNumberPrefix : 'INV-';
  const digits = typeof settings?.invoiceNumberDigits === 'number' ? settings.invoiceNumberDigits : 4;

  let prefix = '';
  if (mode === 'numeric') {
    prefix = '';
  } else if (mode === 'by_type') {
    prefix = type === 'sales' ? 'INV-S-' : 'INV-P-';
  } else {
    prefix = customPrefix;
  }

  // Filter invoices to check for max sequence
  const targetInvoices = mode === 'by_type' 
    ? invoices.filter(inv => inv.type === type) 
    : invoices;

  let maxFound = 0;

  for (const inv of targetInvoices) {
    const raw = (inv.invoiceNumber || '').trim();
    if (!raw) continue;

    // 1. If prefix matches, parse subsequent digits
    if (prefix && raw.startsWith(prefix)) {
      const numPart = raw.slice(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxFound) {
        maxFound = parsed;
        continue;
      }
    }

    // 2. Otherwise extract any numbers from the string
    const matches = raw.match(/\d+/g);
    if (matches && matches.length > 0) {
      for (const m of matches) {
        const parsed = parseInt(m, 10);
        // ignore timestamps or very huge epoch numbers (> 10,000,000)
        if (!isNaN(parsed) && parsed < 10000000 && parsed > maxFound) {
          maxFound = parsed;
        }
      }
    }
  }

  const nextNum = maxFound > 0 ? Math.max(maxFound + 1, startNum) : startNum;

  if (mode === 'numeric') {
    return String(nextNum);
  }

  const formattedNum = digits > 0 ? String(nextNum).padStart(digits, '0') : String(nextNum);
  return `${prefix}${formattedNum}`;
}

export function isInvoiceNumberTaken(invoices: Invoice[] = [], invoiceNumber: string): boolean {
  const clean = (invoiceNumber || '').trim().toLowerCase();
  if (!clean) return false;
  return invoices.some(i => (i.invoiceNumber || '').trim().toLowerCase() === clean);
}
