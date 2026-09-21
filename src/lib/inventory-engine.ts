import { Invoice, InventoryItem } from '../types';

export class InventoryEngine {
  /**
   * Calculates the current stock of an item based on opening quantity and all invoices
   */
  static calculateStock(item: InventoryItem, invoices: Invoice[]): number {
    let stock = Number(item.openingQuantity) || 0;
    
    invoices.forEach(inv => {
      const adjustment = this.getStockAdjustment(item, inv);
      stock += adjustment;
    });

    return Math.round((stock + Number.EPSILON) * 1000) / 1000;
  }

  /**
   * Adjust stock based on a specific invoice
   */
  static getStockAdjustment(item: InventoryItem, invoice: Invoice, isRollback = false): number {
    const invoiceItem = invoice.items.find(i => i.inventoryItemId === item.id);
    if (!invoiceItem) return 0;

    // Standardize to same units.
    // Invoices are ALWAYS in KGs (كجم).
    // If the inventory item is in Tons (طن), we divide the invoice quantity by 1000 to get the ton equivalent.
    const isTon = item.unit === 'طن' || item.unit === 'Tons';
    const baseQty = isTon ? (invoiceItem.quantity / 1000) : invoiceItem.quantity;
    
    let multiplier = 0;
    switch (invoice.type) {
      case 'sales': multiplier = -1; break;
      case 'purchase': multiplier = 1; break;
      case 'sales_return': multiplier = 1; break;
      case 'purchase_return': multiplier = -1; break;
    }

    if (isRollback) multiplier *= -1;
    
    return baseQty * multiplier;
  }
}
