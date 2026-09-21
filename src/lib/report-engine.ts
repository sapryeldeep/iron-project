import { AppState, InventoryItem, Invoice, Person } from '../types';
import { roundToTwo } from '../utils/accountingUtils';

export interface ReportStats {
  totalSales: number;
  totalCollected: number;
  totalCredit: number;
  totalCost: number;
  totalPurchases: number;
  totalPaidToSuppliers: number;
  totalSupplierCredit: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  categoryStats: Record<string, { revenue: number, cost: number }>;
  itemStats: Record<string, { 
    name: string, 
    category: string, 
    quantitySold: number, 
    unit: string, 
    revenue: number, 
    cost: number, 
    currentStock: number 
  }>;
  clientStats: Record<string, { name: string, totalInvoices: number, totalAmount: number, totalPaid: number, currentBalance: number }>;
  supplierStats: Record<string, { name: string, totalInvoices: number, totalAmount: number, totalPaid: number, currentBalance: number }>;
}

export interface DetailedSaleItem {
  id: string;
  invoiceNumber: string;
  date: string;
  clientName: string;
  itemName: string;
  category: string;
  quantitySold: number;
  unit: string;
  salePrice: number;
  wacCost: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercentage: number;
}

export interface DetailedPurchaseItem {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export class ReportEngine {
  /**
   * Calculates Weighted Average Cost (WAC) for inventory items
   */
  static calculateWAC(state: AppState): Record<string, number> {
    const wacMap: Record<string, number> = {};
    
    state.inventory.forEach(item => {
      let totalCostHistory = 0;
      let totalQtyHistory = 0;
      
      state.invoices.forEach(inv => {
        if (inv.type === 'purchase') {
          inv.items.forEach(line => {
            if (line.inventoryItemId === item.id) {
              totalCostHistory += line.quantity * line.unitPrice;
              totalQtyHistory += line.quantity;
            }
          });
        }
      });
      
      if (totalQtyHistory > 0) {
        wacMap[item.id] = totalCostHistory / totalQtyHistory;
      } else {
        wacMap[item.id] = item.purchasePrice || 0;
      }
    });
    
    return wacMap;
  }

  /**
   * Compiles comprehensive stats for a given date range
   */
  static getComprehensiveStats(state: AppState, startTs: number, endTs: number): ReportStats {
    const wacMap = this.calculateWAC(state);
    
    const salesInvoices = state.invoices.filter(inv => {
      if (inv.type !== 'sales') return false;
      const invDate = new Date(inv.date || inv.createdAt).getTime();
      return invDate >= startTs && invDate <= endTs;
    });

    const purchaseInvoices = state.invoices.filter(inv => {
      if (inv.type !== 'purchase') return false;
      const invDate = new Date(inv.date || inv.createdAt).getTime();
      return invDate >= startTs && invDate <= endTs;
    });

    let totalSales = 0;
    let totalCollected = 0;
    let totalCredit = 0;
    let totalCost = 0;
    
    let totalPurchases = 0;
    let totalPaidToSuppliers = 0;
    let totalSupplierCredit = 0;
    let totalExpenses = 0;

    // Expenses
    state.expenses.forEach(exp => {
      const expDate = new Date(exp.date).getTime();
      if (expDate >= startTs && expDate <= endTs) {
        totalExpenses += exp.amount;
      }
    });

    // Payments (Collections and Supplier Payments)
    state.transactions.forEach(tx => {
      const txDate = new Date(tx.date).getTime();
      if (txDate >= startTs && txDate <= endTs) {
        if (tx.type === 'payment_in') {
          totalCollected += tx.amount;
        } else if (tx.type === 'payment_out') {
          totalPaidToSuppliers += tx.amount;
        }
      }
    });

    const categoryStats: Record<string, { revenue: number, cost: number }> = {};
    const itemStats: Record<string, any> = {};
    const clientStats: Record<string, any> = {};
    const supplierStats: Record<string, any> = {};

    // Purchases
    purchaseInvoices.forEach(inv => {
      totalPurchases = roundToTwo(totalPurchases + inv.total);
      totalSupplierCredit = roundToTwo(totalSupplierCredit + inv.remainingAmount);
      
      const supplier = state.suppliers.find(s => s.id === inv.personId);
      if (supplier) {
        if (!supplierStats[supplier.id]) {
          supplierStats[supplier.id] = { name: supplier.name, totalInvoices: 0, totalAmount: 0, totalPaid: 0, currentBalance: 0 };
        }
        supplierStats[supplier.id].totalInvoices += 1;
        supplierStats[supplier.id].totalAmount = roundToTwo(supplierStats[supplier.id].totalAmount + inv.total);
        
        // Calculate total paid for this specific supplier IN RANGE
        const supplierPayments = state.transactions.filter(t => 
          t.personId === supplier.id && 
          t.type === 'payment_out' &&
          new Date(t.date).getTime() >= startTs && 
          new Date(t.date).getTime() <= endTs
        ).reduce((sum, t) => roundToTwo(sum + t.amount), 0);

        supplierStats[supplier.id].totalPaid = supplierPayments;
        supplierStats[supplier.id].currentBalance = supplier.balance;
      }
    });

    // Sales
    salesInvoices.forEach(inv => {
      totalSales = roundToTwo(totalSales + inv.total);
      totalCredit = roundToTwo(totalCredit + inv.remainingAmount);
      
      const client = state.clients.find(c => c.id === inv.personId);
      if (client) {
        if (!clientStats[client.id]) {
          clientStats[client.id] = { name: client.name, totalInvoices: 0, totalAmount: 0, totalPaid: 0, currentBalance: 0 };
        }
        clientStats[client.id].totalInvoices += 1;
        clientStats[client.id].totalAmount = roundToTwo(clientStats[client.id].totalAmount + inv.total);

        // Calculate total collected from this specific client IN RANGE
        const clientCollections = state.transactions.filter(t => 
          t.personId === client.id && 
          t.type === 'payment_in' &&
          new Date(t.date).getTime() >= startTs && 
          new Date(t.date).getTime() <= endTs
        ).reduce((sum, t) => roundToTwo(sum + t.amount), 0);

        clientStats[client.id].totalPaid = clientCollections;
        clientStats[client.id].currentBalance = client.balance;
      }

      inv.items.forEach(item => {
        const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
        const wac = invItem ? (wacMap[invItem.id] || invItem.purchasePrice) : item.unitPrice * 0.7;
        const itemCost = roundToTwo(item.quantity * wac);
        totalCost = roundToTwo(totalCost + itemCost);

        // Aggregate Categories
        const cat = inv.category === 'laser' ? 'تشغيل ليزر' : inv.category === 'bending' ? 'تنايات' : inv.category === 'strip' ? 'تفصيل خوصة' : (invItem?.category || 'عام');
        if (!categoryStats[cat]) categoryStats[cat] = { revenue: 0, cost: 0 };
        categoryStats[cat].revenue = roundToTwo(categoryStats[cat].revenue + item.total);
        categoryStats[cat].cost = roundToTwo(categoryStats[cat].cost + itemCost);

        // Aggregate Items
        if (invItem) {
          if (!itemStats[invItem.id]) {
            itemStats[invItem.id] = {
              name: invItem.name,
              category: invItem.category,
              quantitySold: 0,
              unit: invItem.unit,
              revenue: 0,
              cost: 0,
              currentStock: invItem.quantity
            };
          }
          itemStats[invItem.id].quantitySold += item.quantity;
          itemStats[invItem.id].revenue = roundToTwo(itemStats[invItem.id].revenue + item.total);
          itemStats[invItem.id].cost = roundToTwo(itemStats[invItem.id].cost + itemCost);
        }
      });
    });

    return {
      totalSales,
      totalCollected,
      totalCredit,
      totalCost,
      totalPurchases,
      totalPaidToSuppliers,
      totalSupplierCredit,
      totalExpenses,
      grossProfit: roundToTwo(totalSales - totalCost),
      netProfit: roundToTwo((totalSales - totalCost) - totalExpenses),
      categoryStats,
      itemStats,
      clientStats,
      supplierStats
    };
  }

  /**
   * Compiles granular sales transactions with WAC margins
   */
  static getDetailedSalesItems(state: AppState, startTs: number, endTs: number): DetailedSaleItem[] {
    const wacMap = this.calculateWAC(state);
    const list: DetailedSaleItem[] = [];

    state.invoices.forEach(inv => {
      if (inv.type !== 'sales') return;
      const invDate = new Date(inv.date || inv.createdAt).getTime();
      if (invDate < startTs || invDate > endTs) return;

      const client = state.clients.find(c => c.id === inv.personId);
      const clientName = client ? client.name : 'عميل نقدي';

      inv.items.forEach((line, idx) => {
        const item = state.inventory.find(i => i.id === line.inventoryItemId);
        const itemName = item ? item.name : line.description;
        const category = item ? item.category : 'عام';
        const unit = item ? item.unit : 'طن';
        
        const wacCost = item ? (wacMap[item.id] || item.purchasePrice) : line.unitPrice * 0.7;
        const revenue = line.total;
        const cogs = line.quantity * wacCost;
        const profit = revenue - cogs;
        const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

        list.push({
          id: `${inv.id}-${idx}`,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date || inv.createdAt,
          clientName,
          itemName,
          category,
          quantitySold: line.quantity,
          unit,
          salePrice: line.unitPrice,
          wacCost,
          revenue,
          cogs,
          profit,
          marginPercentage
        });
      });
    });

    return list;
  }

  /**
   * Compiles granular purchase transactions
   */
  static getDetailedPurchaseItems(state: AppState, startTs: number, endTs: number): DetailedPurchaseItem[] {
    const list: DetailedPurchaseItem[] = [];

    state.invoices.forEach(inv => {
      if (inv.type !== 'purchase') return;
      const invDate = new Date(inv.date || inv.createdAt).getTime();
      if (invDate < startTs || invDate > endTs) return;

      const supplier = state.suppliers.find(s => s.id === inv.personId);
      const supplierName = supplier ? supplier.name : 'مورد غير معروف';

      inv.items.forEach((line, idx) => {
        const item = state.inventory.find(i => i.id === line.inventoryItemId);
        const itemName = item ? item.name : line.description;
        const category = item ? item.category : 'عام';
        const unit = item ? item.unit : 'طن';
        
        list.push({
          id: `${inv.id}-${idx}`,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date || inv.createdAt,
          supplierName,
          itemName,
          category,
          quantity: line.quantity,
          unit,
          unitPrice: line.unitPrice,
          total: line.total
        });
      });
    });

    return list;
  }
}
