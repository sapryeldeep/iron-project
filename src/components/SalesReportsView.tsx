import { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { exportCustomExcel, exportToPDF, exportDataToPDF } from '../utils/export';
import { exportToProfessionalExcel } from '../lib/excelExport';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Filter, 
  PackageSearch, BarChart3, Layers, Users, Truck, Search, ArrowUpDown, Percent,
  Download, FileText, Printer, Wallet, ChevronLeft
} from 'lucide-react';
import { ReportEngine } from '../lib/report-engine';

export default function SalesReportsView() {
  const { state } = useAppStore();
  const isAdmin = state.currentUser?.role === 'admin';
  const canViewProfits = isAdmin || (state.currentUser?.permissions?.canViewProfits ?? true);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'profit_analysis' | 'purchases_report' | 'financial_summary' | 'freight_report'>('overview');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Search & Filter state for Profit Analysis tab
  const [analysisSearch, setAnalysisSearch] = useState('');
  const [analysisCategory, setAnalysisCategory] = useState('all');
  const [analysisSort, setAnalysisSort] = useState<'date' | 'profit_desc' | 'margin_desc' | 'revenue_desc'>('date');
  
  // Search state for Freight report
  const [freightSearch, setFreightSearch] = useState('');
  
  const reportRef = useRef<HTMLDivElement>(null);

  // 1. Resolve date range timestamps
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'custom':
        if (customStart) start.setTime(new Date(customStart).getTime());
        if (customEnd) {
          end.setTime(new Date(customEnd).getTime());
          end.setHours(23, 59, 59, 999);
        }
        break;
    }
    return { start: start.getTime(), end: end.getTime() };
  }, [dateFilter, customStart, customEnd]);

  // 2. Use ReportEngine for all stats (Unified Logic)
  const stats = useMemo(() => {
    return ReportEngine.getComprehensiveStats(state, dateRange.start, dateRange.end);
  }, [state, dateRange]);

  const salesItemsMargins = useMemo(() => {
    return ReportEngine.getDetailedSalesItems(state, dateRange.start, dateRange.end);
  }, [state, dateRange]);

  const purchasesItems = useMemo(() => {
    return ReportEngine.getDetailedPurchaseItems(state, dateRange.start, dateRange.end);
  }, [state, dateRange]);

  // 3. Sort and Filter compilation for detailed sales
  const filteredAnalysisItems = useMemo(() => {
    let result = [...salesItemsMargins];

    if (analysisSearch.trim()) {
      const q = analysisSearch.toLowerCase();
      result = result.filter(i => 
        i.itemName.toLowerCase().includes(q) || 
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.clientName.toLowerCase().includes(q)
      );
    }

    if (analysisCategory !== 'all') {
      result = result.filter(i => i.category === analysisCategory);
    }

    // Sort
    result.sort((a, b) => {
      switch (analysisSort) {
        case 'profit_desc':
          return b.profit - a.profit;
        case 'margin_desc':
          return b.marginPercentage - a.marginPercentage;
        case 'revenue_desc':
          return b.revenue - a.revenue;
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return result;
  }, [salesItemsMargins, analysisSearch, analysisCategory, analysisSort]);

  // Total analysis metrics
  const analysisSummary = useMemo(() => {
    let rev = 0;
    let cogs = 0;
    filteredAnalysisItems.forEach(i => {
      rev += i.revenue;
      cogs += i.cogs;
    });
    const profit = rev - cogs;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    return { rev, cogs, profit, margin };
  }, [filteredAnalysisItems]);

  // Categories list for profit margin drop-down filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    salesItemsMargins.forEach(i => cats.add(i.category));
    return Array.from(cats);
  }, [salesItemsMargins]);

  // Compiled Freight / Shipping items list from all invoices
  const freightInvoices = useMemo(() => {
    return state.invoices.filter(inv => {
      // Date filter check
      const ts = new Date(inv.date).getTime();
      const inRange = ts >= dateRange.start && ts <= dateRange.end;
      if (!inRange) return false;

      // Has either direct freightCost field or a freight item
      const hasFreightField = Number(inv.freightCost) > 0;
      const hasFreightItem = inv.items.some(item => 
        item.description?.includes('ناولون') || 
        item.description?.includes('شحن') || 
        item.description?.includes('نقل')
      );
      
      return hasFreightField || hasFreightItem;
    });
  }, [state.invoices, dateRange]);

  const filteredFreightInvoices = useMemo(() => {
    return freightInvoices.filter(inv => {
      const party = [...state.clients, ...state.suppliers].find(p => p.id === inv.personId);
      const partyName = party?.name || 'عميل/مورد عام';
      const searchStr = `${inv.invoiceNumber} ${partyName}`.toLowerCase();
      return searchStr.includes(freightSearch.toLowerCase());
    });
  }, [freightInvoices, freightSearch, state.clients, state.suppliers]);

  const totalFreightSum = useMemo(() => {
    return filteredFreightInvoices.reduce((sum, inv) => {
      const explicit = Number(inv.freightCost) || 0;
      const itemFreight = inv.items.reduce((itmSum, it) => {
        const isFreightItem = it.description?.includes('ناولون') || 
                              it.description?.includes('شحن') || 
                              it.description?.includes('نقل');
        return itmSum + (isFreightItem ? it.total : 0);
      }, 0);
      return sum + Math.max(explicit, itemFreight);
    }, 0);
  }, [filteredFreightInvoices]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    if (activeTab === 'freight_report') {
      const freightData = filteredFreightInvoices.map(inv => {
        const party = [...state.clients, ...state.suppliers].find(p => p.id === inv.personId);
        const explicit = Number(inv.freightCost) || 0;
        const itemFreight = inv.items.reduce((itmSum, it) => {
          const isFreightItem = it.description?.includes('ناولون') || 
                                it.description?.includes('شحن') || 
                                it.description?.includes('نقل');
          return itmSum + (isFreightItem ? it.total : 0);
        }, 0);
        const freightVal = Math.max(explicit, itemFreight);
        const isSales = inv.type === 'sales' || inv.type === 'sales_return';

        return {
          date: new Date(inv.date).toLocaleDateString('ar-EG'),
          invoiceNumber: `#${inv.invoiceNumber}`,
          partyName: party?.name || 'عميل/مورد عام',
          typeLabel: isSales ? 'مبيعات شحن' : 'مشتريات توريد',
          amount: freightVal
        };
      });

      await exportDataToPDF({
        title: 'تقرير مبالغ الشحن والناولون التفصيلي',
        filename: `تقرير_الناولون_${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { key: 'date', label: 'التاريخ', type: 'date' },
          { key: 'invoiceNumber', label: 'رقم الفاتورة', type: 'string' },
          { key: 'partyName', label: 'العميل/المورد', type: 'string' },
          { key: 'typeLabel', label: 'النوع', type: 'string' },
          { key: 'amount', label: 'الناولون (ج.م)', type: 'number' },
        ],
        data: freightData,
        summaryColumns: ['amount']
      });
      return;
    }
    
    if (activeTab === 'financial_summary') {
      const summaryData = [
        { item: 'إجمالي المبيعات', amount: stats.totalSales },
        { item: 'تكلفة البضاعة المباعة (WAC)', amount: -stats.totalCost },
        { item: 'مجمل الربح', amount: stats.grossProfit },
        { item: 'إجمالي المصروفات', amount: -stats.totalExpenses },
        { item: 'صافي الربح', amount: stats.netProfit },
        { item: 'إجمالي المقبوضات النقدية', amount: stats.totalCollected },
        { item: 'إجمالي المدفوعات (موردين + مصاريف)', amount: -(stats.totalPaidToSuppliers + stats.totalExpenses) },
      ];

      await exportDataToPDF({
        title: 'الملخص المالي الشامل وبيان الدخل',
        filename: `الملخص_المالي_${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { key: 'item', label: 'البند المالي', type: 'string' },
          { key: 'amount', label: 'القيمة (ج.م)', type: 'number' },
        ],
        data: summaryData,
      });
      return;
    }
    
    if (activeTab === 'profit_analysis') {
      await exportDataToPDF({
        title: 'تحليل هوامش الأرباح التفصيلي (WAC)',
        filename: `تحليل_الأرباح_${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { key: 'date', label: 'التاريخ', type: 'date' },
          { key: 'invoiceNumber', label: 'رقم الفاتورة', type: 'string' },
          { key: 'clientName', label: 'العميل', type: 'string' },
          { key: 'itemName', label: 'الصنف', type: 'string' },
          { key: 'quantitySold', label: 'الكمية', type: 'number' },
          { key: 'revenue', label: 'الإيراد', type: 'number' },
          { key: 'cogs', label: 'التكلفة', type: 'number' },
          { key: 'profit', label: 'الربح', type: 'number' },
          { key: 'marginPercentage', label: 'الهامش %', type: 'number' },
        ],
        data: filteredAnalysisItems,
        summaryColumns: ['revenue', 'cogs', 'profit']
      });
    } else if (activeTab === 'purchases_report') {
      await exportDataToPDF({
        title: 'تقرير المشتريات وعمليات التوريد التفصيلي',
        filename: `تقرير_المشتريات_${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { key: 'date', label: 'التاريخ', type: 'date' },
          { key: 'invoiceNumber', label: 'الفاتورة', type: 'string' },
          { key: 'supplierName', label: 'المورد', type: 'string' },
          { key: 'itemName', label: 'الصنف', type: 'string' },
          { key: 'quantity', label: 'الكمية', type: 'number' },
          { key: 'unitPrice', label: 'سعر الوحدة', type: 'number' },
          { key: 'total', label: 'الإجمالي', type: 'number' },
        ],
        data: purchasesItems,
        summaryColumns: ['total']
      });
    } else {
      // General overview
      const data = Object.values(stats.itemStats).map(i => ({
        ...i,
        profit: i.revenue - i.cost
      }));
      await exportDataToPDF({
        title: 'ملخص مبيعات الأصناف وحركة المخزون',
        filename: `ملخص_المبيعات_${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { key: 'name', label: 'الصنف', type: 'string' },
          { key: 'category', label: 'القسم', type: 'string' },
          { key: 'quantitySold', label: 'الكمية المباعة', type: 'number' },
          { key: 'revenue', label: 'إجمالي الإيراد', type: 'number' },
          { key: 'profit', label: 'إجمالي الربح', type: 'number' },
          { key: 'currentStock', label: 'الرصيد المتاح', type: 'number' },
        ],
        data,
        summaryColumns: ['revenue', 'profit']
      });
    }
  };

  const handleExportExcel = async () => {
    if (activeTab === 'freight_report') {
      const headers = ['التاريخ', 'رقم الفاتورة', 'العميل/المورد', 'النوع', 'مبلغ الناولون (ج.م)'];
      const data = filteredFreightInvoices.map(inv => {
        const party = [...state.clients, ...state.suppliers].find(p => p.id === inv.personId);
        const explicit = Number(inv.freightCost) || 0;
        const itemFreight = inv.items.reduce((itmSum, it) => {
          const isFreightItem = it.description?.includes('ناولون') || 
                                it.description?.includes('شحن') || 
                                it.description?.includes('نقل');
          return itmSum + (isFreightItem ? it.total : 0);
        }, 0);
        const freightVal = Math.max(explicit, itemFreight);
        const isSales = inv.type === 'sales' || inv.type === 'sales_return';

        return [
          new Date(inv.date).toLocaleDateString('ar-EG'),
          inv.invoiceNumber,
          party?.name || 'عميل/مورد عام',
          isSales ? 'مبيعات شحن' : 'مشتريات توريد',
          freightVal
        ];
      });

      await exportToProfessionalExcel({
        fileName: `تقرير_ناولون_الشحن_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'الناولون والشحن',
        headers,
        data,
        title: 'تقرير الناولون ومبالغ الشحن والتوصيل الشامل'
      });
      return;
    }

    if (activeTab === 'financial_summary') {
      const headers = ['البند المالي', 'القيمة (ج.م)'];
      const data = [
        ['إجمالي المبيعات', stats.totalSales],
        ['تكلفة البضاعة المباعة (WAC)', -stats.totalCost],
        ['مجمل الربح', stats.grossProfit],
        ['إجمالي المصروفات', -stats.totalExpenses],
        ['صافي الربح', stats.netProfit],
        ['إجمالي المقبوضات النقدية', stats.totalCollected],
        ['إجمالي المدفوعات (موردين + مصاريف)', -(stats.totalPaidToSuppliers + stats.totalExpenses)],
      ];

      await exportToProfessionalExcel({
        fileName: `الملخص_المالي_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'الملخص المالي',
        headers,
        data,
        title: 'الملخص المالي الشامل وبيان الدخل'
      });
      return;
    }
    
    if (activeTab === 'profit_analysis') {
      const headers = ['التاريخ', 'الفاتورة', 'العميل', 'الصنف', 'الكمية', 'الإيراد', 'التكلفة', 'الربح', 'الهامش %'];
      const data = filteredAnalysisItems.map(i => [
        new Date(i.date).toLocaleDateString('ar-EG'),
        i.invoiceNumber,
        i.clientName,
        i.itemName,
        i.quantitySold,
        i.revenue,
        i.cogs,
        i.profit,
        i.marginPercentage
      ]);

      await exportToProfessionalExcel({
        fileName: `تحليل_الأرباح_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'تحليل الأرباح',
        headers,
        data,
        title: 'تحليل هوامش الأرباح التفصيلي (WAC)'
      });
    } else if (activeTab === 'purchases_report') {
      const headers = ['التاريخ', 'الفاتورة', 'المورد', 'الصنف', 'الكمية', 'سعر الوحدة', 'الإجمالي'];
      const data = purchasesItems.map(i => [
        new Date(i.date).toLocaleDateString('ar-EG'),
        i.invoiceNumber,
        i.supplierName,
        i.itemName,
        i.quantity,
        i.unitPrice,
        i.total
      ]);

      await exportToProfessionalExcel({
        fileName: `تقرير_المشتريات_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'تقرير المشتريات',
        headers,
        data,
        title: 'تقرير المشتريات وعمليات التوريد التفصيلي'
      });
    } else {
      const headers = ['الصنف', 'القسم', 'الكمية', 'الإيراد', 'الربح', 'الرصيد المتاح'];
      const data = Object.values(stats.itemStats).map(i => [
        i.name,
        i.category,
        i.quantitySold,
        i.revenue,
        i.revenue - i.cost,
        i.currentStock
      ]);

      await exportToProfessionalExcel({
        fileName: `ملخص_المبيعات_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'ملخص المبيعات',
        headers,
        data,
        title: 'ملخص مبيعات الأصناف والأرباح'
      });
    }
  };

  return (
    <div className="space-y-6" dir="rtl" ref={reportRef}>
      
      {/* Title Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            تحليلات الأرباح والهوامش المالية
          </h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">
            تقارير تفصيلية شاملة تكلفة المخزون المرجحة (Weighted Average Cost) وهوامش أرباح العمليات الحالية
          </p>
        </div>
        
        {/* Date Filter Widget */}
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="w-5 h-5 text-slate-500" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="today">مبيعات اليوم</option>
              <option value="yesterday">مبيعات الأمس</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوم</option>
              <option value="custom">فترة مخصصة</option>
            </select>
            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center mr-2 border-r border-slate-200 pr-2">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs border border-slate-300 rounded-lg px-2 py-1" />
                <span className="text-slate-400">-</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs border border-slate-300 rounded-lg px-2 py-1" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (reportRef.current) triggerNativePrint(reportRef.current, 'تقرير_المبيعات_والأرباح');
                else window.print();
              }}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              title="طباعة التقرير"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-md text-xs font-black cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              طباعة وتصدير (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* Audit Block */}
      {!canViewProfits && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <span>🔒 تنبيه رقابي:</span>
          <span>تم حجب مؤشرات وهوامش الأرباح وتفاصيل التكلفة المرجحة وفقاً لصلاحيات حسابك المعتمدة من مدير النظام.</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-4 no-print overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-3.5 px-3 font-bold text-sm whitespace-nowrap transition-all relative ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          ملخص التقارير الشاملة
        </button>
        <button 
          onClick={() => setActiveTab('profit_analysis')}
          className={`pb-3.5 px-3 font-bold text-sm whitespace-nowrap transition-all relative ${activeTab === 'profit_analysis' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          تحليل هوامش الأرباح (WAC)
        </button>
        <button 
          onClick={() => setActiveTab('purchases_report')}
          className={`pb-3.5 px-3 font-bold text-sm whitespace-nowrap transition-all relative flex items-center gap-1.5 ${activeTab === 'purchases_report' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Truck className="w-4 h-4 text-purple-500" />
          تقرير المشتريات والتوريد
        </button>
        <button 
          onClick={() => setActiveTab('financial_summary')}
          className={`pb-3.5 px-3 font-bold text-sm whitespace-nowrap transition-all relative flex items-center gap-1.5 ${activeTab === 'financial_summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <DollarSign className="w-4 h-4 text-rose-500" />
          الملخص المالي والربحية (P&L)
        </button>
        <button 
          onClick={() => setActiveTab('freight_report')}
          className={`pb-3.5 px-3 font-bold text-sm whitespace-nowrap transition-all relative flex items-center gap-1.5 ${activeTab === 'freight_report' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Truck className="w-4 h-4 text-amber-500" />
          تقرير الناولون والشحن
        </button>
      </div>

      {activeTab === 'financial_summary' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Income Statement (P&L) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                  بيان الدخل والأرباح والخسائر (Income Statement)
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-1">عن الفترة: {new Date(dateRange.start).toLocaleDateString('ar-EG')} - {new Date(dateRange.end).toLocaleDateString('ar-EG')}</p>
              </div>
              <div className="text-left">
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-500/30 uppercase tracking-wider">Financial Report</span>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Top Line: Revenue & COGS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                    <span className="text-slate-500 font-bold">إجمالي إيرادات المبيعات</span>
                    <span className="text-xl font-black text-slate-900">{stats.totalSales.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-slate-100 pb-2 text-rose-600">
                    <span className="font-bold flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 opacity-50" />
                      تكلفة البضاعة المباعة (COGS)
                    </span>
                    <span className="text-lg font-black">({stats.totalCost.toLocaleString()}) ج.م</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <span className="text-blue-900 font-black">مجمل الربح (Gross Profit)</span>
                    <span className="text-2xl font-black text-blue-700">{stats.grossProfit.toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">توزيع بنود المصروفات التشغيلية</h3>
                  <div className="space-y-3">
                    {state.expenses.filter(e => {
                      const d = new Date(e.date).getTime();
                      return d >= dateRange.start && d <= dateRange.end;
                    }).reduce((acc, curr) => {
                      const existing = acc.find(a => a.category === curr.category);
                      if (existing) existing.amount += curr.amount;
                      else acc.push({ category: curr.category, amount: curr.amount });
                      return acc;
                    }, [] as any[]).map(cat => (
                      <div key={cat.category} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 font-bold">{cat.category}</span>
                        <span className="text-slate-900 font-black">{cat.amount.toLocaleString()} ج.م</span>
                      </div>
                    ))}
                    {stats.totalExpenses === 0 && <p className="text-slate-400 text-center py-4 text-xs font-bold italic">لا توجد مصروفات مسجلة في هذه الفترة</p>}
                  </div>
                </div>
              </div>

              {/* Net Profit Section */}
              <div className="pt-8 border-t-2 border-slate-100">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">إجمالي المصاريف الإدارية والتشغيلية</span>
                    <span className="text-lg font-black text-rose-600">({stats.totalExpenses.toLocaleString()}) ج.م</span>
                  </div>
                  <div className="bg-emerald-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-20 h-20" />
                    </div>
                    <div className="relative z-10 text-center">
                      <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">صافي الربح التشغيلي للفترة</p>
                      <p className="text-4xl font-black">
                        {stats.netProfit.toLocaleString()} <span className="text-lg opacity-50">ج.م</span>
                      </p>
                      <div className="mt-4 pt-4 border-t border-emerald-800 flex justify-center gap-6 text-[10px] font-black">
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          نسبة الربحية: {stats.totalSales > 0 ? ((stats.netProfit / stats.totalSales) * 100).toFixed(1) : 0}%
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          العائد على التكلفة: {stats.totalCost > 0 ? ((stats.netProfit / stats.totalCost) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Flow Summary */}
              <div className="mt-12 pt-8 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-indigo-600" />
                  ملخص التدفقات النقدية والتحصيلات (Cash Flow Overview)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">إجمالي المقبوضات (Inflow)</p>
                    <p className="text-xl font-black text-emerald-600">{stats.totalCollected.toLocaleString()} ج.م</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold">من تحصيلات المبيعات النقدية والآجلة</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">إجمالي المدفوعات (Outflow)</p>
                    <p className="text-xl font-black text-rose-600">{(stats.totalPaidToSuppliers + stats.totalExpenses).toLocaleString()} ج.م</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold">تشمل سداد الموردين + المصروفات العامة</p>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-5 shadow-sm text-white">
                    <p className="text-slate-400 text-[10px] font-black uppercase mb-1">صافي التدفق النقدي للفترة</p>
                    <p className="text-xl font-black text-emerald-400">{(stats.totalCollected - (stats.totalPaidToSuppliers + stats.totalExpenses)).toLocaleString()} ج.م</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-bold">الفائض/العجز النقدي المحقق</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold">هذا التقرير يعكس البيانات المسجلة فعلياً في النظام للفترة الزمنية المحددة • جميع الأرقام بالجنيه المصري</p>
            </div>
          </div>
        </div>
      ) : activeTab === 'purchases_report' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  تفاصيل عمليات التوريد والمشتريات
                </h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-right text-sm">
                 <thead className="bg-slate-50 border-b border-slate-200">
                   <tr>
                     <th className="p-4 font-bold text-slate-600">التاريخ</th>
                     <th className="p-4 font-bold text-slate-600">رقم الفاتورة</th>
                     <th className="p-4 font-bold text-slate-600">المورد</th>
                     <th className="p-4 font-bold text-slate-600">الصنف</th>
                     <th className="p-4 font-bold text-slate-600">الكمية</th>
                     <th className="p-4 font-bold text-slate-600">سعر الوحدة</th>
                     <th className="p-4 font-bold text-slate-600">الإجمالي</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {purchasesItems.map(item => (
                     <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-4 text-slate-600">{new Date(item.date).toLocaleDateString('ar-EG')}</td>
                       <td className="p-4 font-bold text-slate-800">#{item.invoiceNumber}</td>
                       <td className="p-4 text-slate-700">{item.supplierName}</td>
                       <td className="p-4">
                         <span className="font-bold">{item.itemName}</span>
                         <span className="text-[10px] block text-slate-400">{item.category}</span>
                       </td>
                       <td className="p-4 font-bold">{item.quantity} {item.unit}</td>
                       <td className="p-4 text-slate-600">{item.unitPrice.toLocaleString()} ج.م</td>
                       <td className="p-4 font-black text-purple-600">{item.total.toLocaleString()} ج.م</td>
                     </tr>
                   ))}
                   {purchasesItems.length === 0 && (
                     <tr>
                       <td colSpan={7} className="p-12 text-center text-slate-500 italic">لا توجد عمليات توريد مسجلة في هذه الفترة</td>
                     </tr>
                   )}
                 </tbody>
                 {purchasesItems.length > 0 && (
                   <tfoot className="bg-slate-900 text-white">
                     <tr>
                       <td colSpan={6} className="p-4 font-bold text-left">إجمالي قيمة المشتريات للفترة:</td>
                       <td className="p-4 font-black text-lg">{purchasesItems.reduce((sum, i) => sum + i.total, 0).toLocaleString()} ج.م</td>
                     </tr>
                   </tfoot>
                 )}
               </table>
             </div>
           </div>

           {/* Supplier Summary Card */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  ملخص الموردين الأكثر توريداً
                </h3>
                <div className="space-y-4">
                  {Object.values(stats.supplierStats).sort((a, b) => b.totalAmount - a.totalAmount).map(sup => (
                    <div key={sup.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{sup.name}</p>
                        <p className="text-[10px] text-slate-500">{sup.totalInvoices} فواتير توريد</p>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-purple-600">{sup.totalAmount.toLocaleString()} ج.م</p>
                        <p className={`text-[10px] font-bold ${sup.currentBalance < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {sup.currentBalance < 0 ? `آجل (عليه): ${Math.abs(sup.currentBalance).toLocaleString()}` : 
                           sup.currentBalance > 0 ? `رصيد دائن (له): ${sup.currentBalance.toLocaleString()}` : 'خالص'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        </div>
      ) : activeTab === 'freight_report' ? (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Freight Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-amber-50/70 border border-amber-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-800 block">إجمالي مبالغ الشحن والناولون لجميع العمليات</span>
                <div className="text-3xl font-mono font-black text-amber-700" dir="ltr">
                  {totalFreightSum.toLocaleString()} <span className="text-sm">ج.م</span>
                </div>
                <p className="text-[11px] text-amber-600 font-semibold">مجموع عوائد ورسوم التوصيل والناولون في الفترة المحددة</p>
              </div>
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                <Truck className="w-7 h-7" />
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-800 block">عدد فواتير الشحن المفلترة</span>
                <div className="text-3xl font-mono font-black text-blue-700" dir="ltr">
                  {filteredFreightInvoices.length} <span className="text-sm">فاتورة</span>
                </div>
                <p className="text-[11px] text-blue-600 font-semibold">إجمالي الفواتير التي تحتوي على رسوم ناولون مدرجة</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-500 block mb-2">تأكيد حقوق المبرمج والتذييل</span>
              <p className="text-xs text-slate-600 font-bold" dir="ltr">programmed by sabry elfeeb</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Phone: 01065826742 | sapry.eldeep@gmail.com</p>
            </div>
          </div>

          {/* Search, Filter panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center no-print">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="ابحث برقم الفاتورة أو العميل/المورد..."
                value={freightSearch}
                onChange={e => setFreightSearch(e.target.value)}
                className="w-full pl-4 pr-9 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              مجموع فواتير الناولون المعروضة: {filteredFreightInvoices.length}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-4">التاريخ</th>
                    <th className="px-5 py-4">رقم الفاتورة</th>
                    <th className="px-5 py-4">العميل/المورد</th>
                    <th className="px-5 py-4">نوع الفاتورة</th>
                    <th className="px-5 py-4 text-left">قيمة الناولون والشحن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {filteredFreightInvoices.map(inv => {
                    const party = [...state.clients, ...state.suppliers].find(p => p.id === inv.personId);
                    const explicit = Number(inv.freightCost) || 0;
                    const itemFreight = inv.items.reduce((itmSum, it) => {
                      const isFreightItem = it.description?.includes('ناولون') || 
                                            it.description?.includes('شحن') || 
                                            it.description?.includes('نقل');
                      return itmSum + (isFreightItem ? it.total : 0);
                    }, 0);
                    const freightVal = Math.max(explicit, itemFreight);
                    const isSales = inv.type === 'sales' || inv.type === 'sales_return';

                    return (
                      <tr key={inv.id} className="even:bg-slate-50/50 hover:bg-amber-50/30 transition-colors">
                        <td className="px-5 py-4 text-slate-500">{new Date(inv.date).toLocaleDateString('ar-EG')}</td>
                        <td className="px-5 py-4 font-black text-slate-900">#{inv.invoiceNumber}</td>
                        <td className="px-5 py-4 text-slate-700">{party?.name || 'عميل/مورد عام'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isSales ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {isSales ? 'مبيعات شحن' : 'مشتريات توريد'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-left font-mono font-black text-amber-700 text-sm">
                          {freightVal.toLocaleString()} ج.م
                        </td>
                      </tr>
                    );
                  })}

                  {filteredFreightInvoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-bold">
                        لا توجد فواتير تحتوي على ناولون أو رسوم شحن مسجلة في هذه الفترة حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-900 text-slate-400 px-6 py-4 flex flex-col md:flex-row justify-between items-center text-[11px] font-bold border-t border-slate-800">
              <span>programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com</span>
              <span>جميع الحقوق محفوظة لشركة إنجاز © {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'overview' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-500 font-semibold text-xs">إجمالي المبيعات</h3>
                <div className="bg-blue-100 p-1.5 rounded-lg"><TrendingUp className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-md font-black text-slate-800">{stats.totalSales.toLocaleString()} ج.م</p>
            </div>

            {canViewProfits && (
              <>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-slate-500 font-semibold text-xs">التكلفة (WAC)</h3>
                    <div className="bg-orange-100 p-1.5 rounded-lg"><TrendingDown className="w-4 h-4 text-orange-600" /></div>
                  </div>
                  <p className="text-md font-black text-slate-800">{stats.totalCost.toLocaleString()} ج.م</p>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-blue-200 p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-blue-700 font-bold text-xs">مجمل الربح</h3>
                    <div className="bg-blue-100 p-1.5 rounded-lg"><DollarSign className="w-4 h-4 text-blue-600" /></div>
                  </div>
                  <p className="text-md font-black text-blue-700">{stats.grossProfit.toLocaleString()} ج.م</p>
                </div>
              </>
            )}

            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-pink-200 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1 h-full bg-pink-500"></div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-pink-700 font-bold text-xs">المصروفات</h3>
                <div className="bg-pink-100 p-1.5 rounded-lg"><TrendingDown className="w-4 h-4 text-pink-600" /></div>
              </div>
              <p className="text-md font-black text-pink-700">{stats.totalExpenses.toLocaleString()} ج.م</p>
            </div>

            {canViewProfits && (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-emerald-200 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-emerald-700 font-bold text-xs">صافي الربح</h3>
                  <div className="bg-emerald-100 p-1.5 rounded-lg"><DollarSign className="w-4 h-4 text-emerald-600" /></div>
                </div>
                <p className="text-md font-black text-emerald-700">{stats.netProfit.toLocaleString()} ج.م</p>
              </div>
            )}

            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-500 font-semibold text-xs">المشتريات</h3>
                <div className="bg-purple-100 p-1.5 rounded-lg"><Truck className="w-4 h-4 text-purple-600" /></div>
              </div>
              <p className="text-md font-black text-slate-800">{stats.totalPurchases.toLocaleString()} ج.م</p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-500 font-semibold text-xs">مقبوض عملاء</h3>
                <div className="bg-teal-100 p-1.5 rounded-lg"><Users className="w-4 h-4 text-teal-600" /></div>
              </div>
              <p className="text-md font-black text-slate-800">{stats.totalCollected.toLocaleString()} ج.م</p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-500 font-semibold text-xs">آجل موردين</h3>
                <div className="bg-rose-100 p-1.5 rounded-lg"><Layers className="w-4 h-4 text-rose-600" /></div>
              </div>
              <p className="text-md font-black text-slate-800">{stats.totalSupplierCredit.toLocaleString()} ج.م</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Categories Breakdown */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                المبيعات حسب القسم والتشغيل
              </h2>
              <div className="space-y-4">
                {Object.entries(stats.categoryStats).map(([cat, data]) => {
                  const profit = data.revenue - data.cost;
                  const marginPct = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
                  return (
                    <div key={cat} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700 text-xs">{cat}</span>
                        <span className="font-bold text-blue-600 text-xs">{data.revenue.toLocaleString()} ج.م</span>
                      </div>
                      {canViewProfits && (
                        <div className="flex justify-between items-center text-[11px] mt-1 text-slate-500 pt-1.5 border-t border-slate-200">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            الربح: <strong className="text-emerald-600 font-semibold">{profit.toLocaleString()} ج.م</strong>
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {marginPct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {Object.keys(stats.categoryStats).length === 0 && (
                  <p className="text-center text-slate-500 py-4 text-xs">لا توجد مبيعات في هذه الفترة</p>
                )}
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
              <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PackageSearch className="w-5 h-5 text-indigo-500" />
                تفاصيل مبيعات الأصناف (المخزون)
              </h2>
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الصنف</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الكمية المباعة</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الإيراد</th>
                    {canViewProfits && <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الربح</th>}
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الرصيد المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(stats.itemStats).sort((a, b) => b.revenue - a.revenue).map(item => (
                    <tr key={item.name} className="even:bg-slate-50/75 odd:bg-white hover:bg-blue-50/70 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">{item.category}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{item.quantitySold} <span className="text-slate-500">{item.unit}</span></td>
                      <td className="p-3 font-bold text-blue-600">{item.revenue.toLocaleString()} ج.م</td>
                      {canViewProfits && (
                        <td className="p-3 font-bold text-emerald-600">{(item.revenue - item.cost).toLocaleString()} ج.م</td>
                      )}
                      <td className="p-3 font-semibold text-slate-700">{item.currentStock} <span className="text-slate-500">{item.unit}</span></td>
                    </tr>
                  ))}
                  {Object.keys(stats.itemStats).length === 0 && (
                    <tr>
                      <td colSpan={canViewProfits ? 5 : 4} className="p-6 text-center text-slate-500">لا توجد أصناف مباعة في هذه الفترة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Client Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
              <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                حركة العملاء (المبيعات والتحصيل)
              </h2>
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">العميل</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">عدد الفواتير</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">إجمالي (ج.م)</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">مدفوع</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">آجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(stats.clientStats).sort((a, b) => b.totalAmount - a.totalAmount).map(client => (
                    <tr key={client.name} className="even:bg-slate-50/75 odd:bg-white hover:bg-emerald-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{client.name}</td>
                      <td className="p-3 text-slate-600">{client.totalInvoices}</td>
                      <td className="p-3 font-bold text-blue-600">{client.totalAmount.toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-600">{client.totalPaid.toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span className={client.currentBalance > 0 ? 'text-rose-600' : client.currentBalance < 0 ? 'text-emerald-600' : 'text-slate-600'}>
                            {Math.abs(client.currentBalance).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-black opacity-70">
                            {client.currentBalance > 0 ? 'متبقي (عليه)' : client.currentBalance < 0 ? 'رصيد دائن (له)' : 'خالص'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Object.keys(stats.clientStats).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">لا توجد حركات عملاء في هذه الفترة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Supplier Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
              <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-500" />
                حركة الموردين (المشتريات والتوريد)
              </h2>
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">المورد</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">فواتير</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">إجمالي (ج.م)</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">مدفوع</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">آجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.values(stats.supplierStats).sort((a, b) => b.totalAmount - a.totalAmount).map(supplier => (
                    <tr key={supplier.name} className="even:bg-slate-50/75 odd:bg-white hover:bg-purple-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{supplier.name}</td>
                      <td className="p-3 text-slate-600">{supplier.totalInvoices}</td>
                      <td className="p-3 font-bold text-purple-600">{supplier.totalAmount.toLocaleString()}</td>
                      <td className="p-3 font-bold text-emerald-600">{supplier.totalPaid.toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span className={supplier.currentBalance < 0 ? 'text-rose-600' : supplier.currentBalance > 0 ? 'text-emerald-600' : 'text-slate-600'}>
                            {Math.abs(supplier.currentBalance).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-black opacity-70">
                            {supplier.currentBalance < 0 ? 'متبقي (له)' : supplier.currentBalance > 0 ? 'رصيد مدين (لنا)' : 'خالص'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Object.keys(stats.supplierStats).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">لا توجد حركات موردين في هذه الفترة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Granular WAC Profit Margin Analysis Dashboard */
        <div className="space-y-6">
          
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 font-semibold text-xs">إجمالي الإيرادات للفترة المحددة</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <p className="text-xl font-black text-slate-800">{analysisSummary.rev.toLocaleString()} ج.م</p>
              <span className="text-[10px] text-slate-400 font-medium">إجمالي عوائد الفواتير المفحوصة</span>
            </div>

            {canViewProfits && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-slate-500 font-semibold text-xs">إجمالي كلفة البضاعة المرجحة</span>
                    <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600"><TrendingDown className="w-4 h-4" /></span>
                  </div>
                  <p className="text-xl font-black text-slate-800">{analysisSummary.cogs.toLocaleString()} ج.م</p>
                  <span className="text-[10px] text-slate-400 font-medium">محسوبة بالمتوسط المرجح (WAC)</span>
                </div>

                <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500"></div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-blue-800 font-bold text-xs">أرباح المبيعات المحققة</span>
                    <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><DollarSign className="w-4 h-4" /></span>
                  </div>
                  <p className="text-xl font-black text-blue-700">{analysisSummary.profit.toLocaleString()} ج.م</p>
                  <span className="text-[10px] text-blue-400 font-semibold">إيراد البيع - الكلفة المرجحة</span>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-emerald-800 font-bold text-xs">متوسط هامش الربح للفترة</span>
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Percent className="w-4 h-4" /></span>
                  </div>
                  <p className="text-xl font-black text-emerald-700">%{analysisSummary.margin.toFixed(2)}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, Math.max(0, analysisSummary.margin))}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Graphical Analytics Component */}
          {canViewProfits && filteredAnalysisItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                تحليل بياني تفاعلي: مقارنة الإيرادات بالكلفة وهوامش الأرباح (أعلى 6 عمليات)
              </h3>
              
              {/* Custom SVG Bar Chart comparing revenue vs cost */}
              <div className="h-64 w-full flex items-end gap-6 md:gap-10 border-b border-slate-200 pb-2 overflow-x-auto" dir="ltr">
                {filteredAnalysisItems.slice(0, 6).map((item, idx) => {
                  const maxVal = Math.max(...filteredAnalysisItems.slice(0, 6).map(i => i.revenue));
                  const revenueHeight = maxVal > 0 ? (item.revenue / maxVal) * 100 : 0;
                  const cogsHeight = maxVal > 0 ? (item.cogs / maxVal) * 100 : 0;
                  
                  return (
                    <div key={item.id} className="flex-1 flex flex-col items-center gap-2 min-w-[70px] h-full justify-end group">
                      <div className="relative w-full h-full flex items-end justify-center gap-1">
                        
                        {/* WAC Cost Bar */}
                        <div 
                          className="w-4 sm:w-5 bg-amber-500/85 hover:bg-amber-600 rounded-t transition-all duration-500 cursor-help relative"
                          style={{ height: `${Math.max(4, cogsHeight)}%` }}
                          title={`كلفة البضاعة: ${item.cogs.toLocaleString()} ج.م`}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1 z-20">
                            الكلفة: {item.cogs.toLocaleString()} ج.م
                          </div>
                        </div>

                        {/* Revenue Bar */}
                        <div 
                          className="w-4 sm:w-5 bg-blue-500/85 hover:bg-blue-600 rounded-t transition-all duration-500 cursor-help relative"
                          style={{ height: `${Math.max(4, revenueHeight)}%` }}
                          title={`الإيراد: ${item.revenue.toLocaleString()} ج.م`}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1 z-20">
                            الإيراد: {item.revenue.toLocaleString()} ج.م
                          </div>
                        </div>

                      </div>
                      <div className="text-[10px] text-slate-500 font-bold truncate max-w-[80px] text-center" dir="rtl">
                        {item.itemName}
                      </div>
                      <div className="bg-emerald-50 text-emerald-700 text-[9px] px-1 rounded font-black whitespace-nowrap">
                        %{item.marginPercentage.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 mt-4 text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                  <span className="text-slate-600">قيمة الإيراد (البيع)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
                  <span className="text-slate-600">تكلفة المخزون المرجحة (COGS - WAC)</span>
                </div>
              </div>
            </div>
          )}

          {/* Search, Filter & Sorters panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center no-print">
            
            {/* Search Box */}
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="ابحث بالصنف، الفاتورة أو العميل..."
                value={analysisSearch}
                onChange={e => setAnalysisSearch(e.target.value)}
                className="w-full pl-4 pr-9 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500">التصنيف:</span>
                <select
                  value={analysisCategory}
                  onChange={e => setAnalysisCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
                >
                  <option value="all">كل الأقسام</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500">ترتيب:</span>
                <select
                  value={analysisSort}
                  onChange={e => setAnalysisSort(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
                >
                  <option value="date">أحدث الصفقات</option>
                  <option value="profit_desc">الأعلى ربحاً (ج.م)</option>
                  <option value="margin_desc">أعلى نسبة هامش (%)</option>
                  <option value="revenue_desc">الأعلى قيمة مبيعات</option>
                </select>
              </div>
            </div>

          </div>

          {/* Granular Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-5 py-4">رقم الفاتورة</th>
                    <th className="px-5 py-4">العميل</th>
                    <th className="px-5 py-4">الصنف والوزن</th>
                    <th className="px-5 py-4">الكمية المباعة</th>
                    <th className="px-5 py-4">سعر البيع</th>
                    {canViewProfits && (
                      <>
                        <th className="px-5 py-4 text-orange-600">سعر كلفة WAC</th>
                        <th className="px-5 py-4">إجمالي الإيراد</th>
                        <th className="px-5 py-4 text-orange-700">الكلفة الكلية المرجحة</th>
                        <th className="px-5 py-4 text-emerald-700 font-bold">صافي هامش الربح</th>
                        <th className="px-5 py-4 text-center">نسبة الربحية</th>
                      </>
                    )}
                    {!canViewProfits && <th className="px-5 py-4">إجمالي البيع</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnalysisItems.map(item => (
                    <tr key={item.id} className="even:bg-slate-50/70 odd:bg-white hover:bg-blue-50/60 transition-colors">
                      <td className="px-5 py-4 font-black text-slate-800">#{item.invoiceNumber}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{item.clientName}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{item.itemName}</div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{item.category}</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-600">{item.quantitySold} {item.unit}</td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{item.salePrice.toLocaleString()} ج.م</td>
                      
                      {canViewProfits && (
                        <>
                          <td className="px-5 py-4 font-bold text-orange-600 bg-orange-50/30">{item.wacCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م</td>
                          <td className="px-5 py-4 font-black text-blue-600">{item.revenue.toLocaleString()} ج.م</td>
                          <td className="px-5 py-4 font-semibold text-orange-700 bg-orange-50/30">{item.cogs.toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م</td>
                          <td className="px-5 py-4 font-black text-emerald-600 bg-emerald-50/20">{item.profit.toLocaleString(undefined, { maximumFractionDigits: 1 })} ج.م</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                item.marginPercentage >= 20 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : item.marginPercentage >= 5 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-rose-100 text-rose-800'
                              }`}>
                                %{item.marginPercentage.toFixed(1)}
                              </span>
                              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-1 rounded-full ${item.marginPercentage >= 20 ? 'bg-emerald-500' : item.marginPercentage >= 5 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                  style={{ width: `${Math.min(100, Math.max(0, item.marginPercentage))}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </>
                      )}

                      {!canViewProfits && (
                        <td className="px-5 py-4 font-black text-slate-800">{item.revenue.toLocaleString()} ج.م</td>
                      )}
                    </tr>
                  ))}

                  {filteredAnalysisItems.length === 0 && (
                    <tr>
                      <td colSpan={canViewProfits ? 10 : 5} className="px-5 py-12 text-center text-slate-500 font-semibold text-xs">
                        لا يوجد حركات مبيعات مطابقة لمعايير البحث والفلترة حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
