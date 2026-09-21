import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { Person, Transaction, Invoice } from '../types';
import { getBalanceDisplayInfo, formatCurrency } from '../utils/accountingUtils';
import { AccountingEngine, LedgerRow } from '../lib/accounting-engine';
import { exportCustomExcel, exportToPDF, exportDataToPDF, exportAccountStatementPDF } from '../utils/export';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Filter,
  ShoppingBag,
  Trash2,
  ArrowRight
} from 'lucide-react';

import { triggerNativePrint } from '../utils/printHelper';

interface AccountStatementModalProps {
  personId: string | null;
  onClose: () => void;
  fullPage?: boolean;
}

export default function AccountStatementModal({ personId, onClose, fullPage = false }: AccountStatementModalProps) {
  const { state, deleteInvoice, deleteTransaction } = useAppStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoices' | 'payments'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'general' | 'laser' | 'bending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const statementRef = useRef<HTMLDivElement>(null);

  const person: Person | undefined = useMemo(() => {
    if (!personId) return undefined;
    return [...state.clients, ...state.suppliers].find(p => p.id === personId);
  }, [personId, state.clients, state.suppliers]);

  // Calculate detailed ledger with prior balance support
  const { statementRows, priorBalance, periodDebit, periodCredit, totalAmountPaid, finalBalance } = useMemo(() => {
    if (!person) {
      return { statementRows: [], priorBalance: 0, periodDebit: 0, periodCredit: 0, totalAmountPaid: 0, finalBalance: 0 };
    }

    const ledger = AccountingEngine.generateLedger(
      person,
      state.transactions,
      state.invoices,
      startDate,
      endDate
    );

    const filteredRows = ledger.ledgerRows.filter(row => {
      if (row.isPrior) return true;

      if (typeFilter === 'invoices' && row.type !== 'invoice_charge') return false;
      if (typeFilter === 'payments' && row.type !== 'payment_in' && row.type !== 'payment_out') return false;

      if (categoryFilter !== 'all') {
        const rowCat = row.category || 'general';
        if (categoryFilter === 'laser' && rowCat !== 'laser') return false;
        if (categoryFilter === 'bending' && rowCat !== 'bending') return false;
        if (categoryFilter === 'general' && (rowCat === 'laser' || rowCat === 'bending')) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesRef = row.refNumber.toLowerCase().includes(query);
        const matchesDesc = row.description.toLowerCase().includes(query);
        const matchesLabel = row.typeLabel.toLowerCase().includes(query);
        if (!matchesRef && !matchesDesc && !matchesLabel) return false;
      }

      return true;
    });

    // Apply sorting order
    let finalOrderedRows = [...filteredRows];
    if (sortOrder === 'desc') {
      const prior = finalOrderedRows.filter(r => r.isPrior);
      const nonPrior = finalOrderedRows.filter(r => !r.isPrior).reverse();
      finalOrderedRows = [...nonPrior, ...prior];
    }

    return {
      statementRows: finalOrderedRows as LedgerRow[],
      priorBalance: ledger.priorBalance,
      periodDebit: ledger.periodDebit,
      periodCredit: ledger.periodCredit,
      totalAmountPaid: ledger.totalAmountPaid,
      finalBalance: ledger.finalBalance
    };
  }, [person, state.transactions, state.invoices, startDate, endDate, typeFilter, categoryFilter, searchTerm, sortOrder]);

  // Direct Row Item Deletion Handler
  const handleRowDelete = (row: LedgerRow) => {
    if (row.isPrior) return;

    if (row.id.startsWith('inv-')) {
      const invId = row.id.replace('inv-', '');
      if (!invId) return;
      deleteInvoice(invId);
    } else {
      deleteTransaction(row.id);
    }
  };

  if (!person) return null;

  const isClient = person.type === 'client';

  // Excel Export Handler
  const handleExportExcel = () => {
    const columns = [
      { key: 'index', label: 'م', type: 'number' as const },
      { key: 'date', label: 'التاريخ', type: 'string' as const },
      { key: 'refNumber', label: 'رقم المرجع / الفاتورة', type: 'string' as const },
      { key: 'typeLabel', label: 'نوع المعاملة', type: 'string' as const },
      { key: 'description', label: 'البيان والتفاصيل', type: 'string' as const },
      { key: 'debit', label: 'مدين (ج.م)', type: 'number' as const },
      { key: 'credit', label: 'دائن (ج.م)', type: 'number' as const },
      { key: 'balance', label: 'الرصيد التراكمي (ج.م)', type: 'number' as const },
      { key: 'status', label: 'حالة الرصيد', type: 'string' as const }
    ];

    const data = statementRows.map((r, i) => ({
      index: i + 1,
      date: r.date ? new Date(r.date).toLocaleDateString('ar-EG') : '-',
      refNumber: r.refNumber,
      typeLabel: r.typeLabel,
      description: r.description,
      debit: r.debit || 0,
      credit: r.credit || 0,
      balance: Math.abs(r.balance),
      status: r.balance > 0 ? (isClient ? 'عليه (لنا)' : 'له (علينا)') : (r.balance < 0 ? (isClient ? 'له (علينا)' : 'عليه (لنا)') : 'خالص')
    }));

    exportCustomExcel({
      title: `كشف حساب تفصيلي - ${isClient ? 'العميل' : 'المورد'}: ${person.name}`,
      companyName: state.settings?.companyName || 'إنجاز لتجارة وتصنيع الحديد والصلب',
      columns,
      data,
      filename: `كشف_حساب_${person.name.replace(/\s+/g, '_')}`,
      sheetName: 'كشف الحساب',
      summaryColumns: ['debit', 'credit']
    });
  };

  const handleExportPDF = async () => {
    if (!person) return;
    const isClient = person.type === 'client';
    
    const data = statementRows.map((r, i) => ({
      index: i + 1,
      date: r.date,
      refNumber: r.refNumber,
      typeLabel: r.typeLabel,
      description: r.description,
      invoiceTotal: r.invoiceTotal || 0,
      amountPaid: r.amountPaid || 0,
      remaining: r.remaining || 0,
      balanceBefore: r.balanceBefore || 0,
      debit: r.debit || 0,
      credit: r.credit || 0,
      balance: r.balance || 0,
      status: r.balance > 0 ? (isClient ? 'مدين (لنا)' : 'دائن (له)') : (r.balance < 0 ? (isClient ? 'دائن (له)' : 'مدين (لنا)') : 'خالص')
    }));

    await exportAccountStatementPDF({
      companyName: state.settings?.companyName || 'شركة إنجاز لتجارة وتشغيل الحديد',
      companyAddress: state.settings?.address || 'المنطقة الصناعية - متكامل لتجارة وتشغيل المعادن والحديد',
      companyPhone: state.settings?.phone || '01065826742',
      personName: person.name,
      personType: person.type,
      personPhone: person.phone || 'غير مسجل',
      personAddress: person.address || '',
      startDate,
      endDate,
      priorBalance,
      periodDebit,
      periodCredit,
      finalBalance,
      filename: `كشف_حساب_${person.name.replace(/\s+/g, '_')}`,
      rows: data
    });
  };

  // Dedicated Print Function
  const handlePrint = () => {
    handleExportPDF();
  };

  // Quick Date Range Setters
  const handleSetQuickDate = (range: 'all' | 'thisMonth' | 'last30Days' | 'thisYear') => {
    const now = new Date();
    if (range === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (range === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (range === 'last30Days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(past);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (range === 'thisYear') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      setStartDate(firstDayOfYear);
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  return (
    <div 
      className={fullPage 
        ? "w-full max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in print-modal-backdrop" 
        : "fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in print-modal-backdrop"
      } 
      dir="rtl"
    >
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .no-print, header, nav, sidebar {
            display: none !important;
          }
          .print-modal-backdrop {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          .print-full-card {
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .overflow-y-auto, .overflow-x-auto, .overflow-hidden {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
          }
          .print-show {
            display: block !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
        }
      `}</style>

      {/* Main Statement Card */}
      <div 
        ref={statementRef}
        className={`print-full-card bg-white rounded-3xl shadow-2xl w-full flex flex-col border border-slate-200 ${
          fullPage ? "min-h-[85vh] overflow-visible" : "max-w-5xl max-h-[92vh] overflow-hidden"
        }`}
      >
        {/* Top Header Bar */}
        <div className="no-print bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 shadow-md border-b border-blue-800/40">
          <div className="flex items-center gap-3">
            {fullPage && (
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-white/20 ml-2"
                title="الرجوع للقائمة"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع
              </button>
            )}
            <div className={`p-2.5 rounded-2xl ${isClient ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'}`}>
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">{person.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${isClient ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {isClient ? 'كشف حساب عميل' : 'كشف حساب مورد'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                كود الحساب: #{person.id} • التاريخ: {new Date().toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              title="طباعة كشف الحساب مباشرة بتقسيم A4 الشامل"
            >
              <Printer className="w-4 h-4 text-white" />
              طباعة فورية (A4)
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              title="تصدير وتحميل كشف الحساب ملون كملف PDF"
            >
              <Download className="w-4 h-4 text-white" />
              تصدير PDF الشامل
            </button>
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 p-2 rounded-xl transition-colors border border-slate-700 cursor-pointer"
              title={fullPage ? "رجوع" : "إغلاق"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className={`p-4 sm:p-6 space-y-6 ${fullPage ? "flex-1 overflow-visible" : "flex-1 overflow-y-auto"}`}>
          
          {/* Company & Official Letterhead (Always visible, clean on screen and paper) */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src="https://cdn.phototourl.com/free/2026-09-18-dc0e1aaf-bfc1-4154-b50d-a3cd329edfbe.jpg" 
                  alt="شعار الشركة" 
                  className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-200"
                />
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{state.settings?.companyName || 'إنجاز لتجارة وتصنيع الحديد والصلب'}</h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    {state.settings?.address || 'المنطقة الصناعية - متكامل لتجارة وتشغيل المعادن والحديد'}
                  </p>
                  {state.settings?.phone && (
                    <p className="text-xs text-slate-500 font-bold mt-0.5" dir="ltr">
                      هاتف: {state.settings.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-left bg-slate-50 border border-slate-200 p-3 rounded-2xl min-w-[200px]">
                <span className="text-[11px] font-black text-slate-500 block uppercase tracking-wider">نوع السجل المحاسبي</span>
                <span className="text-base font-black text-slate-800 block">
                  كشف حساب تفصيلي {isClient ? 'للعميل' : 'للمورد'}
                </span>
                <span className="text-xs font-semibold text-slate-500 block mt-1">
                  الفترة: {startDate ? new Date(startDate).toLocaleDateString('ar-EG') : 'بداية التعامل'} حتى {endDate ? new Date(endDate).toLocaleDateString('ar-EG') : 'تاريخه'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Filters & Controls Toolbar (no-print) */}
          <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                <Filter className="w-4 h-4 text-blue-600" />
                تصفية وضبط كشف الحساب:
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${!startDate && !endDate ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('thisMonth')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
                >
                  الشهر الحالي
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('last30Days')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
                >
                  آخر 30 يوم
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('thisYear')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-600 hover:bg-slate-200 border border-slate-200 transition-all"
                >
                  هذا العام
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الترتيب الزمني:</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-blue-300 text-blue-900 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asc">تصاعدي (الأقدم للأحدث - التسلسل المنطقي)</option>
                  <option value="desc">تنازلي (الأحدث للأقدم)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع الحركة:</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">جميع الحركات المالية</option>
                  <option value="invoices">الفواتير فقط</option>
                  <option value="payments">السندات والدفعات فقط</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">تصنيف النشاط والخدمة:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 text-amber-800"
                >
                  <option value="all">كشف حساب شامل (جميع الأنشطة)</option>
                  <option value="general">خامات ومبيعات حديد فقط</option>
                  <option value="laser">قص ليزر فقط (Laser)</option>
                  <option value="bending">ثني وتشكيل تناية فقط (Bending)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">بحث في البيان / الفاتورة:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث برقم أو ملاحظة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Person Profile Bento Cards - Clear, organized, NO overlapping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Profile Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">بيانات {isClient ? 'العميل' : 'المورد'}</span>
                <h3 className="text-base font-black text-slate-900 line-clamp-1">{person.name}</h3>
                <div className="mt-2 space-y-1 text-xs text-slate-600 font-medium">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span dir="ltr">{person.phone || 'غير مسجل'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{person.address || 'العنوان غير محدد'}</span>
                  </p>
                </div>
              </div>
              {isClient && person.creditLimit ? (
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-bold text-slate-600 flex justify-between items-center">
                  <span>الحد الائتماني:</span>
                  <span className="font-mono text-slate-900">{person.creditLimit.toLocaleString()} ج.م</span>
                </div>
              ) : (
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-bold text-slate-500">
                  كود الحساب: #{person.id}
                </div>
              )}
            </div>

            {/* 2. Prior Balance Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">الرصيد السابق (ما قبل الفترة)</span>
                <p className={`text-xl font-black ${priorBalance > 0 ? (isClient ? 'text-amber-700' : 'text-emerald-700') : priorBalance < 0 ? (isClient ? 'text-emerald-700' : 'text-amber-700') : 'text-slate-700'}`}>
                  {Math.abs(priorBalance).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </p>
                <p className="text-xs font-black text-slate-600 mt-1">
                  {priorBalance > 0 
                    ? (isClient ? 'مديونية سابقة (عليه - مطلوب)' : 'مستحق له سابقاً (له - علي المحل)') 
                    : priorBalance < 0 
                      ? (isClient ? 'رصيد دائن سابقاً (له - مسدد بالزيادة)' : 'رصيد مدين سابقاً (عليه - للمحل)') 
                      : 'لا يوجد رصيد سابق (0.00)'}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 font-semibold">
                منقول حتى تاريخ {startDate || 'بداية التعامل'}
              </p>
            </div>

            {/* 3. Period Movements Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">حركة الفترة المحددة</span>
                <div className="space-y-1.5 mt-1 text-xs">
                  <div className="flex justify-between items-center font-black">
                    <span className="text-rose-700 flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                      إجمالي الفواتير / مدين (عليه):
                    </span>
                    <span className="font-mono text-slate-900">{periodDebit.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center font-black">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                      إجمالي الدفعات / دائن (له):
                    </span>
                    <span className="font-mono text-slate-900">{periodCredit.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center font-black border-t border-slate-200 pt-1.5 mt-1.5">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      إجمالي التحصيل والمدفوع:
                    </span>
                    <span className="font-mono text-emerald-800">{totalAmountPaid.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs font-black">
                <span className="text-slate-500">صافي الحركة للفترة:</span>
                <span className="font-mono text-slate-900">
                  {Math.abs(periodDebit - periodCredit).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            {/* 4. Final Balance Card (Prominent & High Contrast) */}
            <div className={`rounded-2xl p-4 flex flex-col justify-between border shadow-sm ${finalBalance > 0 ? (isClient ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300') : finalBalance < 0 ? (isClient ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300') : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block mb-1 text-slate-600">الرصيد النهائي الصافي المستحق</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${finalBalance > 0 ? (isClient ? 'text-rose-800' : 'text-emerald-800') : finalBalance < 0 ? (isClient ? 'text-emerald-800' : 'text-rose-800') : 'text-slate-800'}`}>
                    {Math.abs(finalBalance).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-600">ج.م</span>
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black shadow-sm ${finalBalance > 0 ? (isClient ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white') : finalBalance < 0 ? (isClient ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-200 text-slate-700'}`}>
                    {finalBalance > 0 
                      ? (isClient ? 'مطلوب من العميل (عليه - مدين)' : 'مستحق للمورد (له - دائن)') 
                      : finalBalance < 0 
                        ? (isClient ? 'مستحق للعميل (له - دائن)' : 'مطلوب من المورد (عليه - مدين)') 
                        : 'الحساب خالص ومطابق (0.00)'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-bold">
                مطابق للدفتر والحسابات العامة
              </p>
            </div>
          </div>

          {/* Statement Ledger Table */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-300">
                    <th className="py-3 px-2 text-center w-10 border-l border-slate-200">م</th>
                    <th className="py-3 px-2.5 w-24 border-l border-slate-200">التاريخ</th>
                    <th className="py-3 px-2.5 w-28 border-l border-slate-200 text-center text-[10px]">المرجع</th>
                    <th className="py-3 px-3 border-l border-slate-200 min-w-[150px]">البيان والتفاصيل</th>
                    <th className="py-3 px-2 w-20 text-center border-l border-slate-200 bg-blue-50 text-blue-900 text-[10px]">إجمالي الفاتورة</th>
                    <th className="py-3 px-2 w-20 text-center border-l border-slate-200 bg-emerald-50 text-emerald-900 text-[10px]">المسدد منها</th>
                    <th className="py-3 px-2 w-20 text-center border-l border-slate-200 bg-rose-50 text-rose-900 text-[10px]">المتبقي</th>
                    <th className="py-3 px-2.5 w-24 text-center border-l border-slate-200 bg-rose-100/90 text-rose-950 font-black">مدين (+)</th>
                    <th className="py-3 px-2.5 w-24 text-center border-l border-slate-200 bg-emerald-100/90 text-emerald-950 font-black">دائن (-)</th>
                    <th className="py-3 px-3 w-32 text-center border-l border-slate-200 bg-amber-100/90 text-amber-950 font-black">الرصيد التراكمي</th>
                    <th className="py-3 px-2.5 w-16 text-center border-l border-slate-200 bg-slate-200/90 text-slate-900 font-black text-[10px]">الحالة</th>
                    <th className="py-3 px-2 w-10 text-center no-print">إلغاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statementRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 font-bold">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        لا توجد حركات مالية مسجلة خلال الفترة المحددة
                      </td>
                    </tr>
                  ) : (
                    statementRows.map((row, idx) => (
                      <tr 
                        key={row.id} 
                        className={`transition-colors ${row.isPrior ? 'bg-amber-50/80 font-bold text-xs' : idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/70'}`}
                      >
                        <td className="py-2 px-2 text-center text-slate-500 font-bold border-l border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 font-semibold whitespace-nowrap border-l border-slate-200">
                          {(() => {
                            const dStr = row.date;
                            if (!dStr) return '-';
                            const d = new Date(dStr);
                            if (isNaN(d.getTime())) return dStr;
                            const dateFormatted = d.toLocaleDateString('ar-EG');
                            const timeFormatted = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
                            return (
                              <div className="flex flex-col text-[10px] text-center">
                                <span className="font-bold text-slate-900">{dateFormatted}</span>
                                <span className="text-[9px] text-slate-500 font-mono" dir="ltr">{timeFormatted}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-blue-700 border-l border-slate-200">
                          {row.refNumber}
                        </td>
                        <td className="py-2 px-3 text-slate-800 border-l border-slate-200">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800 leading-relaxed">{row.description}</span>
                            <span className="text-[9px] text-slate-400 font-bold mt-0.5">{row.typeLabel}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/20 border-l border-slate-200 whitespace-nowrap text-[11px]">
                          {row.invoiceTotal && row.invoiceTotal > 0 ? row.invoiceTotal.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/20 border-l border-slate-200 whitespace-nowrap text-[11px]">
                          {row.amountPaid && row.amountPaid > 0 ? row.amountPaid.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/20 border-l border-slate-200 whitespace-nowrap text-[11px]">
                          {row.remaining && row.remaining > 0 ? row.remaining.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-rose-700 bg-rose-50/30 border-l border-slate-200 whitespace-nowrap text-[11px]">
                          {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200 whitespace-nowrap text-[11px]">
                          {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-900 bg-amber-50/40 border-l border-slate-200 whitespace-nowrap text-[11px]">
                          {Math.abs(row.balance).toLocaleString()} <span className="text-[9px] text-slate-500 font-bold">ج.م</span>
                        </td>
                        <td className="py-2 px-2 text-center border-l border-slate-200 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black border ${
                            row.balanceLabel === 'لنا' ? 'bg-rose-100 text-rose-800 border-rose-200' : 
                            row.balanceLabel === 'له' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {row.balanceLabel}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center no-print">
                          {!row.isPrior && (
                            <button
                              type="button"
                              onClick={() => handleRowDelete(row)}
                              title="حذف هذه الحركة وإعادة حساب كشف الحساب فوراً"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200/90 border-t-2 border-slate-400 font-black text-slate-900 text-[10px]">
                    <td colSpan={5} className="py-3 px-4 text-right border-l border-slate-300">
                      إجمالي حركة الفترة والرصيد الصافي النهائي المترتب:
                    </td>
                    <td className="bg-emerald-50 border-l border-slate-300 text-center text-emerald-800">
                      {totalAmountPaid.toLocaleString()}
                    </td>
                    <td className="bg-slate-100 border-l border-slate-300"></td>
                    <td className="py-3 px-1.5 text-center font-mono font-black text-rose-700 bg-rose-50/60 border-l border-slate-300">
                      {periodDebit.toLocaleString()}
                    </td>
                    <td className="py-3 px-1.5 text-center font-mono font-black text-emerald-700 bg-emerald-50/60 border-l border-slate-300">
                      {periodCredit.toLocaleString()}
                    </td>
                    <td colSpan={2} className="py-3.5 px-4 text-center border-l border-slate-300 bg-amber-50/60">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-mono text-base font-black text-slate-950">
                          {Math.abs(finalBalance).toLocaleString()} <span className="text-xs text-slate-600 font-bold">ج.م</span>
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-md text-xs font-black border shadow-xs ${
                          finalBalance === 0 
                            ? 'bg-slate-200 text-slate-800 border-slate-300' 
                            : getBalanceDisplayInfo(finalBalance, person.type as 'client' | 'supplier').colorClass
                        }`}>
                          {finalBalance === 0 
                            ? 'مصفى 100% (حساب متعادل)' 
                            : getBalanceDisplayInfo(finalBalance, person.type as 'client' | 'supplier').label
                          }
                        </span>
                      </div>
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary Financial Statement Banner (Clean Light Theme - No Black Bars) */}
          <div className="bg-gradient-to-r from-slate-50 via-amber-50/40 to-slate-50 text-slate-900 rounded-2xl p-4.5 border-2 border-slate-300 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-lg font-black text-[11px] uppercase tracking-wide shadow-sm">
                    خلاصة وتصفية الموقف المالي
                  </span>
                  <span className="text-xs text-slate-700 font-extrabold">
                    {person.name} ({isClient ? 'عميل' : 'مورد'})
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-1.5 leading-relaxed">
                  {finalBalance > 0 ? (
                    isClient ? (
                      <>
                        📌 إجمالي الموقف الحالي: العميل <span className="text-rose-900 font-black">{person.name}</span> مدين للمحل بمبلغ قدره{' '}
                        <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-rose-200">{formatCurrency(finalBalance)} ج.م</span>{' '}
                        (عليه - مطلوب منه سداد المبلغ).
                      </>
                    ) : (
                      <>
                        📌 إجمالي الموقف الحالي: الشركة لها مبالغ دفع مسبق لدى المورد <span className="text-emerald-900 font-black">{person.name}</span> قدرها{' '}
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-emerald-200">{formatCurrency(finalBalance)} ج.م</span>{' '}
                        (لنا - رصيد مدين مسبق).
                      </>
                    )
                  ) : finalBalance < 0 ? (
                    isClient ? (
                      <>
                        📌 إجمالي الموقف الحالي: العميل <span className="text-emerald-900 font-black">{person.name}</span> له رصيد مسبق لدينا قدره{' '}
                        <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-emerald-200">{formatCurrency(Math.abs(finalBalance))} ج.م</span>{' '}
                        (له - رصيد دائن).
                      </>
                    ) : (
                      <>
                        📌 إجمالي الموقف الحالي: المحل مدين طرف المورد <span className="text-rose-900 font-black">{person.name}</span> بمبالغ قدرها{' '}
                        <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-rose-200">{formatCurrency(Math.abs(finalBalance))} ج.م</span>{' '}
                        (عليه - مستحق الدفع للمورد).
                      </>
                    )
                  ) : (
                    <>
                      📌 إجمالي الموقف الحالي: الحساب مصفى بالكامل مع <span className="text-slate-900 font-black">{person.name}</span> بنسبة 100% ولا توجد مستحقات معلقة.
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-4 text-xs font-mono border-t md:border-t-0 md:border-r border-slate-300 pt-3 md:pt-0 md:pr-4 shrink-0">
                <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                  <span className="text-slate-500 text-[10px] block font-sans font-bold">إجمالي الفواتير والمسحوبات</span>
                  <span className="text-rose-700 font-black text-sm">{formatCurrency(periodDebit)}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                  <span className="text-slate-500 text-[10px] block font-sans font-bold">إجمالي الدفعات والسدادات</span>
                  <span className="text-emerald-700 font-black text-sm">{formatCurrency(periodCredit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Signatures & Verification Block (Always pristine in print) */}
          <div className="mt-8 pt-6 border-t-2 border-slate-800 grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs font-black text-slate-800 mb-8">إعداد ومراجعة الحسابات</p>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <p className="text-[10px] text-slate-500 font-medium">المحاسب المسؤول</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 mb-8">
                توقيع واعتماد {isClient ? 'العميل' : 'المورد'}
              </p>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <p className="text-[10px] text-slate-500 font-medium">بالاستلام وصحة الرصيد</p>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 mb-8">اعتماد الإدارة والختم</p>
              <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
              <p className="text-[10px] text-slate-500 font-medium">إنجاز لتجارة الحديد والتشغيل</p>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-600 border-t border-slate-200 mt-4 pt-3 font-bold dir-ltr">
            programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
          </div>

        </div>
      </div>
    </div>
  );
}
