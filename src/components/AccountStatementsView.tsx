import { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { Person } from '../types';
import { getBalanceDisplayInfo, formatCurrency } from '../utils/accountingUtils';
import { AccountingEngine, LedgerRow } from '../lib/accounting-engine';
import { exportCustomExcel, exportDataToPDF, exportAccountStatementPDF } from '../utils/export';
import { 
  Users, 
  Building2, 
  Factory, 
  Search, 
  Calendar, 
  Printer, 
  Download, 
  FileText,
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  PlusCircle, 
  DollarSign, 
  Phone, 
  MapPin, 
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import AccountStatementModal from './AccountStatementModal';

// LedgerRow is now imported from AccountingEngine

export default function AccountStatementsView() {
  const { state } = useAppStore();
  
  // Navigation / Tabs state
  const [activeTab, setActiveTab] = useState<'clients' | 'suppliers'>('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debit' | 'credit' | 'settled'>('all');
  
  // Selected Person for statement preview
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  
  // Quick statement date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [movementFilter, setMovementFilter] = useState<'all' | 'invoices' | 'payments'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal for full-screen / print view
  const [modalPersonId, setModalPersonId] = useState<string | null>(null);

  // List of active entities based on tab
  const currentEntities = useMemo(() => {
    if (activeTab === 'clients') return state.clients;
    return state.suppliers;
  }, [activeTab, state.clients, state.suppliers]);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    return currentEntities.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.phone.includes(searchTerm);
      if (!matchSearch) return false;

      if (balanceFilter === 'debit') return p.balance > 0;
      if (balanceFilter === 'credit') return p.balance < 0;
      if (balanceFilter === 'settled') return p.balance === 0;
      return true;
    });
  }, [currentEntities, searchTerm, balanceFilter]);

  // Ensure an entity is selected when list changes
  const activePerson: Person | undefined = useMemo(() => {
    if (selectedPersonId) {
      const found = [...state.clients, ...state.suppliers].find(p => p.id === selectedPersonId);
      if (found) return found;
    }
    return filteredEntities[0] || undefined;
  }, [selectedPersonId, state.clients, state.suppliers, filteredEntities]);

  // Calculations for summary stats
  const stats = useMemo(() => {
    const totalClientsDebit = state.clients.filter(c => c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
    const totalClientsCredit = state.clients.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
    const totalSuppliersCredit = state.suppliers.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
    const totalSuppliersDebit = state.suppliers.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0);

    return {
      totalClientsDebit,
      totalClientsCredit,
      totalSuppliersCredit,
      totalSuppliersDebit,
      clientsCount: state.clients.length,
      suppliersCount: state.suppliers.length
    };
  }, [state.clients, state.suppliers]);

  // Generate detailed movements for the selected person
  const { ledgerRows, priorBalance, periodDebit, periodCredit, totalAmountPaid, finalBalance } = useMemo(() => {
    if (!activePerson) {
      return { ledgerRows: [], priorBalance: 0, periodDebit: 0, periodCredit: 0, totalAmountPaid: 0, finalBalance: 0 };
    }

    const ledger = AccountingEngine.generateLedger(
      activePerson,
      state.transactions,
      state.invoices,
      startDate,
      endDate
    );

    // Apply movement type filter
    let finalRows = ledger.ledgerRows.filter(r => {
      if (r.isPrior) return true;
      if (movementFilter === 'invoices') return r.type === 'invoice_charge';
      if (movementFilter === 'payments') return r.type === 'payment_in' || r.type === 'payment_out';
      return true;
    });

    // Apply sort order
    if (sortOrder === 'desc') {
      const prior = finalRows.filter(r => r.isPrior);
      const nonPrior = finalRows.filter(r => !r.isPrior).reverse();
      finalRows = [...nonPrior, ...prior];
    }

    return {
      ...ledger,
      ledgerRows: finalRows
    };
  }, [activePerson, state.transactions, state.invoices, startDate, endDate, movementFilter, sortOrder]);

  const handleExportStatementExcel = () => {
    if (!activePerson) return;
    const columns = [
      { key: 'date', label: 'التاريخ', type: 'date' as const },
      { key: 'refNumber', label: 'رقم المرجع', type: 'string' as const },
      { key: 'typeLabel', label: 'نوع الحركة', type: 'string' as const },
      { key: 'description', label: 'البيان والتفاصيل', type: 'string' as const },
      { key: 'invoiceTotal', label: 'قيمة الفاتورة (ج.م)', type: 'number' as const },
      { key: 'amountPaid', label: 'المبلغ المسدد (ج.م)', type: 'number' as const },
      { key: 'remaining', label: 'المتبقي من الفاتورة', type: 'number' as const },
      { key: 'debit', label: 'مدين (+)', type: 'number' as const },
      { key: 'credit', label: 'دائن (-)', type: 'number' as const },
      { key: 'balance', label: 'الرصيد التراكمي', type: 'number' as const },
      { key: 'balanceLabel', label: 'حالة الرصيد', type: 'string' as const }
    ];

    exportCustomExcel({
      title: `كشف حساب تفصيلي - ${activePerson.name} (${activePerson.type === 'client' ? 'عميل' : 'مورد'})`,
      filename: `كشف_حساب_${activePerson.type === 'client' ? 'العميل' : 'المورد'}_${activePerson.name}`,
      columns,
      data: ledgerRows,
      sheetName: 'كشف الحساب',
      summaryColumns: ['debit', 'credit']
    });
  };

  const handleExportStatementPDF = async () => {
    if (!activePerson) return;
    const isClient = activePerson.type === 'client';
    const data = ledgerRows.map((r, i) => ({
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
      status: r.balance > 0 
        ? (isClient ? 'عليه (مطلوب)' : 'له (مستحق)') 
        : (r.balance < 0 ? (isClient ? 'له (دائن)' : 'عليه (مطلوب)') : 'مصفى 100%')
    }));

    await exportAccountStatementPDF({
      companyName: state.settings?.companyName || 'شركة إنجاز لتجارة وتشغيل الحديد',
      companyAddress: state.settings?.address || 'المنطقة الصناعية - متكامل لتجارة وتشغيل المعادن والحديد',
      companyPhone: state.settings?.phone || '01065826742',
      personName: activePerson.name,
      personType: activePerson.type,
      personPhone: activePerson.phone || 'غير مسجل',
      personAddress: activePerson.address || '',
      startDate,
      endDate,
      priorBalance,
      periodDebit,
      periodCredit,
      finalBalance,
      filename: `كشف_حساب_${activePerson.name.replace(/\s+/g, '_')}`,
      rows: data
    });
  };

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (modalPersonId) {
    return (
      <AccountStatementModal
        personId={modalPersonId}
        onClose={() => setModalPersonId(null)}
        fullPage={true}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">كشوفات الحسابات المنفصلة</h1>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                كشف حساب منفصل ومفصل لكل عميل وكل مورد
              </p>
            </div>
          </div>
        </div>

        {/* Global Overview Pill Counters */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-700 block">إجمالي مديونيات العملاء (لنا)</span>
            <span className="text-base font-black text-emerald-900 font-mono">
              {stats.totalClientsDebit.toLocaleString()} ج.م
            </span>
          </div>
          <div className="bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl">
            <span className="text-[11px] font-bold text-rose-700 block">مستحقات الموردين (علينا)</span>
            <span className="text-base font-black text-rose-900 font-mono">
              {stats.totalSuppliersCredit.toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm">
        <button
          onClick={() => { setActiveTab('clients'); setSelectedPersonId(''); }}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'clients'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>كشوفات حسابات العملاء</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'clients' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {stats.clientsCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('suppliers'); setSelectedPersonId(''); }}
          className={`flex-1 py-3 px-4 rounded-lg font-black text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>كشوفات حسابات الموردين</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'suppliers' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {stats.suppliersCount}
          </span>
        </button>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Right Column: Person / Account Selector Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                {activeTab === 'clients' ? 'قائمة العملاء' : activeTab === 'suppliers' ? 'قائمة الموردين' : 'عملاء التصنيع والتشغيل'}
              </h3>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {filteredEntities.length} حساب
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف..."
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setBalanceFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  balanceFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setBalanceFilter('debit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  balanceFilter === 'debit' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                مدين (عليه)
              </button>
              <button
                onClick={() => setBalanceFilter('credit')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  balanceFilter === 'credit' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                دائن (له)
              </button>
              <button
                onClick={() => setBalanceFilter('settled')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  balanceFilter === 'settled' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                خالص
              </button>
            </div>

            {/* Entities Scrollable List */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto rounded-xl border border-slate-100">
              {filteredEntities.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  لا توجد حسابات مطابقة للبحث
                </div>
              ) : (
                filteredEntities.map(person => {
                  const isSelected = activePerson?.id === person.id;
                  const isClient = person.type === 'client';
                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPersonId(person.id)}
                      className={`w-full text-right p-3 transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-50/90 border-r-4 border-blue-600 shadow-inner' 
                          : 'hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {person.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                          {person.phone || 'بدون هاتف'}
                        </p>
                      </div>

                      <div className="text-left pl-1">
                        <span className={`text-xs font-black font-mono block ${
                          person.balance > 0 
                            ? (isClient ? 'text-rose-600' : 'text-emerald-600') 
                            : person.balance < 0 
                              ? (isClient ? 'text-emerald-600' : 'text-rose-600') 
                              : 'text-slate-500'
                        }`}>
                          {Math.abs(person.balance).toLocaleString()} ج.م
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          person.balance > 0 
                            ? (isClient ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800') 
                            : person.balance < 0 
                              ? (isClient ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800') 
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {person.balance > 0 ? (isClient ? 'عليه (لنا)' : 'له (علينا)') : person.balance < 0 ? (isClient ? 'له (علينا)' : 'عليه (لنا)') : 'خالص'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Left / Center Column: Active Detailed Account Statement */}
        <div className="lg:col-span-8 space-y-4">
          {activePerson ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              
              {/* Person Header Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activePerson.name}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${activePerson.type === 'client' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {activePerson.type === 'client' ? 'عميل' : 'مورد'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span dir="ltr">{activePerson.phone || 'غير مسجل'}</span>
                    </span>
                    {activePerson.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activePerson.address}</span>
                      </span>
                    )}
                    {activePerson.type === 'client' && activePerson.creditLimit && (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>حد ائتماني: {activePerson.creditLimit.toLocaleString()} ج.م</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportStatementPDF}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    title="طباعة وتصدير كشف الحساب بصيغة PDF عالية الجودة"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    <span>طباعة كشف الحساب (PDF)</span>
                  </button>

                  <button
                    onClick={() => setModalPersonId(activePerson.id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="فتح معاينة كشف الحساب الشاملة للطباعة الحرارية أو A4"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>معاينة A4 / بون حراري</span>
                  </button>
                </div>
              </div>

              {/* Financial Balance Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">رصيد ما قبل الفترة</span>
                  <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block">
                    {Math.abs(priorBalance).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {priorBalance > 0 ? (activePerson.type === 'client' ? '(عليه)' : '(له)') : priorBalance < 0 ? (activePerson.type === 'client' ? '(له)' : '(عليه)') : '(خالص)'}
                  </span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-rose-700 block">إجمالي المدين (حركات الفترة)</span>
                  <span className="text-lg font-black text-rose-900 font-mono mt-0.5 block">
                    {periodDebit.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] font-bold text-rose-600">فواتير ومسحوبات</span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block">إجمالي التحصيل والمدفوعات</span>
                  <span className="text-lg font-black text-emerald-900 font-mono mt-0.5 block">
                    {totalAmountPaid.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">إجمالي النقدية المحصلة/المصروفة</span>
                </div>

                <div className={`rounded-xl p-3 text-center border ${
                  finalBalance > 0 
                    ? (activePerson.type === 'client' ? 'bg-rose-100 border-rose-300' : 'bg-emerald-100 border-emerald-300')
                    : finalBalance < 0 
                      ? (activePerson.type === 'client' ? 'bg-emerald-100 border-emerald-300' : 'bg-rose-100 border-rose-300')
                      : 'bg-slate-100 border-slate-200'
                }`}>
                  <span className="text-[11px] font-black uppercase text-slate-700 block">الرصيد النهائي المستحق</span>
                  <span className={`text-xl font-black font-mono mt-0.5 block ${
                    finalBalance > 0 
                      ? (activePerson.type === 'client' ? 'text-rose-900' : 'text-emerald-900')
                      : finalBalance < 0 
                        ? (activePerson.type === 'client' ? 'text-emerald-900' : 'text-rose-900')
                        : 'text-slate-800'
                  }`}>
                    {Math.abs(finalBalance).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                  </span>
                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full ${
                    finalBalance > 0 
                      ? (activePerson.type === 'client' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white')
                      : finalBalance < 0 
                        ? (activePerson.type === 'client' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white')
                        : 'bg-slate-300 text-slate-700'
                  }`}>
                    {finalBalance > 0 
                      ? (activePerson.type === 'client' ? 'مدين (مطلوب منه)' : 'دائن (مستحق له)') 
                      : finalBalance < 0 
                        ? (activePerson.type === 'client' ? 'دائن (مستحق له)' : 'مدين (مطلوب منه)') 
                        : 'الحساب خالص بالكامل'}
                  </span>
                </div>
              </div>

              {/* Date & Movement Filters Toolbar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>من:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span>إلى:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span>الترتيب:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="px-2.5 py-1 bg-white border border-blue-300 text-blue-900 rounded-lg text-xs font-black outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="asc">تصاعدي (الأقدم للأحدث)</option>
                      <option value="desc">تنازلي (الأحدث للأقدم)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMovementFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      movementFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    كل الحركات
                  </button>
                  <button
                    onClick={() => setMovementFilter('invoices')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      movementFilter === 'invoices' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    الفواتير فقط
                  </button>
                  <button
                    onClick={() => setMovementFilter('payments')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      movementFilter === 'payments' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    السندات النقدية فقط
                  </button>
                </div>
              </div>

              {/* Detailed Movements Table with Zebra Striping */}
              <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-sm">
                <table className="table-classic min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-extrabold border-b-2 border-slate-300">
                      <th className="w-10 text-center py-3 px-2 border-l border-slate-200">م</th>
                      <th className="w-24 py-3 px-2.5 border-l border-slate-200">التاريخ</th>
                      <th className="w-28 text-center py-3 px-2.5 border-l border-slate-200 text-[10px]">المرجع</th>
                      <th className="py-3 px-3 border-l border-slate-200 min-w-[150px]">البيان والتفاصيل</th>
                      <th className="w-20 text-center py-3 px-2 border-l border-slate-200 bg-blue-50 text-blue-900 text-[10px]">إجمالي الفاتورة</th>
                      <th className="w-20 text-center py-3 px-2 border-l border-slate-200 bg-emerald-50 text-emerald-900 text-[10px]">المسدد منها</th>
                      <th className="w-20 text-center py-3 px-2 border-l border-slate-200 bg-rose-50 text-rose-900 text-[10px]">المتبقي</th>
                      <th className="w-24 text-center py-3 px-2.5 border-l border-slate-200 bg-rose-100/90 text-rose-950">مدين (+)</th>
                      <th className="w-24 text-center py-3 px-2.5 border-l border-slate-200 bg-emerald-100/90 text-emerald-950">دائن (-)</th>
                      <th className="w-32 text-center py-3 px-3 border-l border-slate-200 bg-amber-100/90 text-amber-950 font-black">الرصيد التراكمي</th>
                      <th className="w-20 text-center py-3 px-2.5 border-l border-slate-200 bg-slate-200/90 text-slate-900 font-black text-[10px]">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                          لا توجد حركات مالية مسجلة في هذا الكشف
                        </td>
                      </tr>
                    ) : (
                      ledgerRows.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            row.isPrior 
                              ? 'bg-amber-50/80 font-bold' 
                              : idx % 2 === 0 
                                ? 'bg-white hover:bg-slate-50' 
                                : 'bg-slate-50/60 hover:bg-slate-100/70'
                          }`}
                        >
                          <td className="py-2 px-2 text-center text-slate-500 font-bold border-l border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-slate-700 whitespace-nowrap border-l border-slate-200">
                            {(() => {
                              const dStr = row.date;
                              if (!dStr) return '-';
                              const d = new Date(dStr);
                              if (isNaN(d.getTime())) return dStr;
                              const dateFormatted = d.toLocaleDateString('ar-EG');
                              const timeFormatted = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
                              return (
                                <div className="flex flex-col text-xs text-center">
                                  <span className="font-bold text-slate-900">{dateFormatted}</span>
                                  <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{timeFormatted}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-blue-700 border-l border-slate-200">
                            {row.refNumber}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800 border-l border-slate-200">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-800 line-clamp-2 leading-relaxed">{row.description}</span>
                              <span className="text-[9px] text-slate-400 font-bold mt-0.5">{row.typeLabel}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-blue-700 bg-blue-50/20 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            {row.invoiceTotal > 0 ? row.invoiceTotal.toLocaleString() : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50/20 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            {row.amountPaid > 0 ? row.amountPaid.toLocaleString() : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/20 border-l border-slate-200 whitespace-nowrap text-[11px]">
                            {row.remaining > 0 ? row.remaining.toLocaleString() : '-'}
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
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              row.balanceLabel === 'لنا' 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : row.balanceLabel === 'له' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-slate-200 text-slate-700'
                            }`}>
                              {row.balanceLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200/90 border-t-2 border-slate-400 font-black text-slate-900">
                      <td colSpan={5} className="py-3 px-4 text-right border-l border-slate-300 text-slate-900 font-black text-[10px] sm:text-xs">
                        إجمالي حركة الفترة والرصيد الصافي النهائي المترتب:
                      </td>
                      <td className="py-3 px-1.5 text-center font-mono font-black text-emerald-700 bg-emerald-50/60 border-l border-slate-300 text-[10px]">
                        {totalAmountPaid.toLocaleString()}
                      </td>
                      <td className="bg-slate-100 border-l border-slate-300"></td>
                      <td className="py-3 px-1.5 text-center font-mono font-black text-rose-700 bg-rose-50/60 border-l border-slate-300 text-[10px]">
                        {periodDebit.toLocaleString()}
                      </td>
                      <td className="py-3 px-1.5 text-center font-mono font-black text-emerald-700 bg-emerald-50/60 border-l border-slate-300 text-[10px]">
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
                              : getBalanceDisplayInfo(finalBalance, activePerson.type as 'client' | 'supplier').colorClass
                          }`}>
                            {finalBalance === 0 
                              ? 'مصفى 100% (حساب متعادل)' 
                              : getBalanceDisplayInfo(finalBalance, activePerson.type as 'client' | 'supplier').label
                            }
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
                        {activePerson.name} ({activePerson.type === 'client' ? 'عميل' : 'مورد'})
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1.5 leading-relaxed">
                      {finalBalance > 0 ? (
                        activePerson.type === 'client' ? (
                          <>
                            📌 إجمالي الموقف الحالي: العميل <span className="text-amber-900 font-black">{activePerson.name}</span> مدين للمحل بمبلغ قدره{' '}
                            <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-rose-200">{formatCurrency(finalBalance)} ج.م</span>{' '}
                            (عليه - مطلوب سداده للشركة).
                          </>
                        ) : (
                          <>
                            📌 إجمالي الموقف الحالي: الشركة لها مبالغ دفع مسبق لدى المورد <span className="text-emerald-900 font-black">{activePerson.name}</span> قدرها{' '}
                            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-emerald-200">{formatCurrency(finalBalance)} ج.م</span>{' '}
                            (لنا - رصيد مدين مسبق).
                          </>
                        )
                      ) : finalBalance < 0 ? (
                        activePerson.type === 'client' ? (
                          <>
                            📌 إجمالي الموقف الحالي: العميل <span className="text-emerald-900 font-black">{activePerson.name}</span> دائن للمحل برصيد مسدد بالزيادة قدره{' '}
                            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-emerald-200">{formatCurrency(Math.abs(finalBalance))} ج.م</span>{' '}
                            (له - رصيد محفوظ للعميل).
                          </>
                        ) : (
                          <>
                            📌 إجمالي الموقف الحالي: المحل مدين طرف المورد <span className="text-rose-900 font-black">{activePerson.name}</span> بمبالغ قدرها{' '}
                            <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg font-mono text-base font-black border border-rose-200">{formatCurrency(Math.abs(finalBalance))} ج.م</span>{' '}
                            (عليه - مستحق الدفع للمورد).
                          </>
                        )
                      ) : (
                        <>
                          📌 إجمالي الموقف الحالي: الحساب مصفى ومطابق تماماً بنسبة 100% ولا توجد أي مديونيات متأخرة (<span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded">0.00 ج.م</span>).
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

              <div className="text-center text-[11px] text-slate-500 border-t border-slate-200 pt-3 mt-4 font-bold dir-ltr">
                programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              اختر حساباً من القائمة الجانبية لعرض كشف الحساب التفصيلي
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
