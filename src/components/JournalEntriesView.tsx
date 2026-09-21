import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { JournalEntry, JournalEntryLine } from '../types';
import { roundToTwo, formatCurrency } from '../utils/accountingUtils';
import { calculateTrialBalance, generateEntryNumber } from '../utils/journalGenerator';
import PrintPreviewModal from './PrintPreviewModal';
import ConfirmModal from './ConfirmModal';
import { 
  BookOpen, Plus, Search, Filter, Printer, Download, CheckCircle2, 
  AlertTriangle, ArrowUpDown, Calendar, Trash2, Eye, ShieldCheck, 
  Coins, Layers, TrendingUp, DollarSign, FileSpreadsheet, ChevronDown, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportCustomExcel, exportDataToPDF } from '../utils/export';

export default function JournalEntriesView() {
  const { state, addManualJournalEntry, deleteJournalEntry, regenerateJournalEntries, normalizeTransactions } = useAppStore();
  const isAdmin = state.currentUser?.role === 'admin';
  
  const [activeTab, setActiveTab] = useState<'journal' | 'trial_balance' | 'income_statement'>('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Print voucher state
  const [printingEntry, setPrintingEntry] = useState<JournalEntry | null>(null);

  // Manual entry modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDesc, setManualDesc] = useState('');
  const [manualLines, setManualLines] = useState<Array<{
    accountId: string;
    debit: number;
    credit: number;
    description: string;
  }>>([
    { accountId: state.accounts[0]?.id || 'acc_1101', debit: 0, credit: 0, description: '' },
    { accountId: state.accounts[1]?.id || 'acc_1103', debit: 0, credit: 0, description: '' },
  ]);

  // Permissions
  const canDelete = state.currentUser?.permissions?.canDelete ?? (state.currentUser?.role === 'admin');
  const canPrint = state.currentUser?.permissions?.canPrint ?? true;

  // Filtered entries with chronological ordering
  const filteredEntries = useMemo(() => {
    const getTimestamp = (m: { date?: string; createdAt?: string }) => {
      if (m.createdAt && typeof m.createdAt === 'string') {
        const t = new Date(m.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (m.date && typeof m.date === 'string') {
        const t = new Date(m.date).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    return state.journalEntries.filter(entry => {
      const matchesSearch = 
        entry.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.referenceNumber && entry.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'all' || entry.referenceType === selectedType;

      const matchesStart = !startDate || new Date(entry.date) >= new Date(startDate);
      const matchesEnd = !endDate || new Date(entry.date) <= new Date(endDate);

      return matchesSearch && matchesType && matchesStart && matchesEnd;
    }).sort((a, b) => {
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      if (timeA !== timeB) {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === 'desc' 
        ? (b.createdAt || b.date || b.entryNumber || '').localeCompare(a.createdAt || a.date || a.entryNumber || '')
        : (a.createdAt || a.date || a.entryNumber || '').localeCompare(b.createdAt || b.date || b.entryNumber || '');
    });
  }, [state.journalEntries, searchQuery, selectedType, startDate, endDate, sortOrder]);

  // Trial Balance calculation
  const trialBalance = useMemo(() => {
    return calculateTrialBalance(state.journalEntries, state.accounts);
  }, [state.journalEntries, state.accounts]);

  // Overall financial highlights from accounts
  const financialCards = useMemo(() => {
    const accMap = new Map(trialBalance.balances.map(b => [b.account.code, b]));
    const cash = accMap.get('1101')?.finalBalance || 0;
    const inventory = accMap.get('1104')?.finalBalance || 0;
    const receivables = accMap.get('1103')?.finalBalance || 0;
    const payables = accMap.get('2101')?.finalBalance || 0;
    const salesRev = (accMap.get('4101')?.totalCredit || 0) + (accMap.get('4102')?.totalCredit || 0);
    const cogs = accMap.get('5101')?.totalDebit || 0;
    const operatingExp = accMap.get('5301')?.totalDebit || 0;
    const salesDisc = accMap.get('5201')?.totalDebit || 0;
    const purchDisc = accMap.get('4201')?.totalCredit || 0;

    const grossProfit = (salesRev + purchDisc) - cogs;
    const netProfit = grossProfit - operatingExp - salesDisc;

    return {
      cash,
      inventory,
      receivables,
      payables,
      salesRev,
      cogs,
      operatingExp,
      grossProfit,
      netProfit,
      isEquilibrium: trialBalance.isEquilibrium,
      sumDebit: trialBalance.sumDebit,
      sumCredit: trialBalance.sumCredit
    };
  }, [trialBalance]);

  // Manual Entry Form Calculations
  const manualTotalDebit = useMemo(() => {
    return roundToTwo(manualLines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
  }, [manualLines]);

  const manualTotalCredit = useMemo(() => {
    return roundToTwo(manualLines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
  }, [manualLines]);

  const manualDiff = Math.abs(manualTotalDebit - manualTotalCredit);
  const isManualBalanced = manualDiff < 0.01 && manualTotalDebit > 0;

  const handleAddManualLine = () => {
    setManualLines([
      ...manualLines,
      { accountId: state.accounts[0]?.id || 'acc_1101', debit: 0, credit: 0, description: '' }
    ]);
  };

  const handleRemoveManualLine = (index: number) => {
    if (manualLines.length <= 2) {
      alert('يجب أن يحتوي القيد المحاسبي على طرفين على الأقل (مدين ودائن).');
      return;
    }
    setManualLines(manualLines.filter((_, i) => i !== index));
  };

  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDesc.trim()) {
      alert('يرجى كتابة شرح القيد (البيان).');
      return;
    }
    if (!isManualBalanced) {
      alert(`القيد غير متوازن! يوجد فرق قدره ${manualDiff.toLocaleString()} ج.م بين المدين والدائن.`);
      return;
    }

    const lines: JournalEntryLine[] = manualLines.map((line, idx) => {
      const acc = state.accounts.find(a => a.id === line.accountId) || state.accounts[0];
      return {
        id: `manual_line_${Date.now()}_${idx}`,
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description || manualDesc
      };
    });

    const res = addManualJournalEntry({
      entryNumber: generateEntryNumber('JV-MAN'),
      date: manualDate,
      referenceType: 'manual',
      description: manualDesc,
      lines,
      totalDebit: manualTotalDebit,
      totalCredit: manualTotalCredit,
      status: 'posted'
    });

    if (res.success) {
      alert('تم اعتماد وحفظ قيد اليومية بنجاح!');
      setIsCreateModalOpen(false);
      setManualDesc('');
      setManualLines([
        { accountId: state.accounts[0]?.id || 'acc_1101', debit: 0, credit: 0, description: '' },
        { accountId: state.accounts[1]?.id || 'acc_1103', debit: 0, credit: 0, description: '' },
      ]);
    } else {
      alert(res.error || 'فشل حفظ القيد');
    }
  };

  const exportToPDF = async () => {
    const columns = [
      { key: 'entryNumber', label: 'رقم القيد', type: 'string' },
      { key: 'date', label: 'التاريخ', type: 'date' },
      { key: 'referenceType', label: 'نوع السند', type: 'string' },
      { key: 'referenceNumber', label: 'المرجع', type: 'string' },
      { key: 'description', label: 'البيان', type: 'string' },
      { key: 'amount', label: 'إجمالي القيد', type: 'number' }
    ];

    const exportData = filteredEntries.map(entry => ({
      entryNumber: entry.entryNumber,
      date: entry.date,
      referenceType: getTypeName(entry.referenceType),
      referenceNumber: entry.referenceNumber || '-',
      description: entry.description,
      amount: entry.totalDebit
    }));

    await exportDataToPDF({
      title: 'دفتر اليومية العامة - سجل القيود',
      filename: `دفتر_اليومية_${new Date().toISOString().slice(0, 10)}`,
      columns,
      data: exportData,
      summaryColumns: ['amount']
    });
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'sales_invoice': return 'فاتورة مبيعات';
      case 'purchase_invoice': return 'فاتورة مشتريات';
      case 'payment_in': return 'سند قبض نقدي';
      case 'payment_out': return 'سند صرف نقدي';
      case 'expense': return 'مصروفات تشغيل';
      case 'manual': return 'قيد تسوية يدوي';
      default: return 'قيد عام';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-600 text-white rounded-xl shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">دفتر اليومية العامة والقيود المزدوجة</h1>
              <p className="text-sm text-slate-500">توليد آلي ومحكم للقيود المحاسبية مع ربط فوري للمخزون، تكلفة المبيعات، والخزينة</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={exportToPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer"
            title="طباعة وتصدير القيود اليومية إلى PDF"
          >
            <Printer className="w-4 h-4 text-white" />
            طباعة وتصدير (PDF)
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            إنشاء قيد يدوي
          </button>
        </div>
      </div>

      {/* Financial Health & Double-Entry Equilibrium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Equilibrium Status */}
        <div className={`p-4 rounded-2xl border ${financialCards.isEquilibrium ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'} shadow-sm`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">اتزان الدفتر (Double-Entry)</span>
            {financialCards.isEquilibrium ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          </div>
          <div className="text-xl font-black mb-1">
            {financialCards.isEquilibrium ? '100% متوازن' : 'يوجد عدم توازن'}
          </div>
          <div className="text-xs font-medium opacity-80">
            مدين: {formatCurrency(financialCards.sumDebit)} | دائن: {formatCurrency(financialCards.sumCredit)}
          </div>
          {!financialCards.isEquilibrium && (
            <div className="mt-2 text-[10px] leading-tight font-bold text-rose-700 bg-white/50 p-1.5 rounded-lg border border-rose-100">
              الفرق: {formatCurrency(Math.abs(financialCards.sumDebit - financialCards.sumCredit))} ج.م
              <br />
              <span className="font-normal opacity-70">استخدم زر "إعادة بناء القيود" لحل المشكلة</span>
            </div>
          )}
        </div>

        {/* Treasury Card */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-1 text-slate-500">
            <span className="text-xs font-bold">الخزينة والصندوق (1101)</span>
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-800">
            {financialCards.cash.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-slate-400">النقدية المتاحة فعلياً</div>
        </div>

        {/* Inventory Valuation Card */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-1 text-slate-500">
            <span className="text-xs font-bold">مخزون الحديد الدفتري (1104)</span>
            <Layers className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="text-xl font-black text-slate-800">
            {financialCards.inventory.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-slate-400">تقييم المخزون بالتكلفة</div>
        </div>

        {/* Cost of Goods Sold Card */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-1 text-slate-500">
            <span className="text-xs font-bold">تكلفة البضاعة المباعة (5101)</span>
            <DollarSign className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-800">
            {financialCards.cogs.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-slate-400">تكلفة المواد المسحوبة للمبيعات</div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-1 text-slate-500">
            <span className="text-xs font-bold">صافي الربح الدفتري</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div className={`text-xl font-black ${financialCards.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {financialCards.netProfit.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <div className="text-xs text-slate-400">المبيعات - التكلفة - المصروفات</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white/70 backdrop-blur-sm rounded-xl p-1 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'journal' 
              ? 'bg-cyan-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          دفتر اليومية العامة ({state.journalEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'trial_balance' 
              ? 'bg-cyan-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          ميزان المراجعة والأستاذ
        </button>
        <button
          onClick={() => setActiveTab('income_statement')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'income_statement' 
              ? 'bg-cyan-600 text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          قائمة الدخل الدفترية (P&L)
        </button>
      </div>

      {/* TAB 1: General Journal */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم القيد، الفاتورة، أو البيان..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="py-2 px-3 border border-cyan-300 text-cyan-950 font-bold rounded-xl text-sm outline-none bg-cyan-50/50"
              >
                <option value="desc">الترتيب: الأحدث أولاً (تنازلي)</option>
                <option value="asc">الترتيب: الأقدم أولاً (تصاعدي)</option>
              </select>

              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="py-2 px-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none bg-white"
              >
                <option value="all">كافة أنواع القيود</option>
                <option value="sales_invoice">فواتير مبيعات</option>
                <option value="purchase_invoice">فواتير مشتريات</option>
                <option value="payment_in">سندات قبض</option>
                <option value="payment_out">سندات صرف</option>
                <option value="expense">مصروفات</option>
                <option value="manual">قيود تسوية يدوية</option>
              </select>

              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="py-1.5 px-2 border border-slate-200 rounded-xl text-xs outline-none bg-white text-slate-700"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="py-1.5 px-2 border border-slate-200 rounded-xl text-xs outline-none bg-white text-slate-700"
                />
              </div>

              {(searchQuery || selectedType !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>

          {/* Entries List */}
          {filteredEntries.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-lg">لا توجد قيود محاسبية مطابقة للبحث</p>
              <p className="text-sm mt-1">يتم إنشاء القيود تلقائياً فور اعتماد فواتير المبيعات والمشتريات أو السندات.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => {
                const isExpanded = expandedEntryId === entry.id;
                return (
                  <div 
                    key={entry.id} 
                    className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* Entry Summary Header */}
                    <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-extrabold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100">
                          {entry.entryNumber}
                        </span>
                        
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                          {getTypeName(entry.referenceType)}
                        </span>

                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {entry.date}
                        </span>

                        {entry.isBalanced ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> متوازن
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> غير متوازن
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-left">
                          <div className="text-xs text-slate-400">إجمالي القيد</div>
                          <div className="font-extrabold text-slate-800 text-base">
                            {entry.totalDebit.toLocaleString()} ج.م
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canPrint && (
                            <button
                              onClick={() => setPrintingEntry(entry)}
                              title="طباعة سند القيد"
                              className="p-2 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && entry.referenceType === 'manual' && (
                            <button
                              onClick={() => setConfirmDeleteId(entry.id)}
                              title="حذف القيد اليدوي"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                          >
                            <span>التفاصيل</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Entry Description Banner */}
                    <div className="px-4 pb-3 text-xs text-slate-600 font-medium border-b border-slate-100">
                      {entry.description}
                      {entry.referenceNumber && (
                        <span className="mr-2 text-slate-400 font-mono">
                          (مرجع: #{entry.referenceNumber})
                        </span>
                      )}
                    </div>

                    {/* Expanded Double-Entry Lines Table */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-bold">
                              <th className="py-2 px-2 w-20">كود الحساب</th>
                              <th className="py-2 px-3">اسم الحساب الدفتري</th>
                              <th className="py-2 px-3">البيان / الشرح التفصيلي</th>
                              <th className="py-2 px-3 text-left w-28">مدين (منه)</th>
                              <th className="py-2 px-3 text-left w-28">دائن (له)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60">
                            {entry.lines.map((line, idx) => (
                              <tr key={idx} className="even:bg-slate-50/70 odd:bg-white hover:bg-cyan-50/40 transition-colors">
                                <td className="py-2 px-2 font-mono font-bold text-cyan-800">
                                  {line.accountCode}
                                </td>
                                <td className="py-2 px-3 font-semibold text-slate-800">
                                  {line.accountName}
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {line.description}
                                </td>
                                <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                                  {line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="py-2 px-3 text-left font-mono font-bold text-slate-900">
                                  {line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-300 font-extrabold bg-slate-100/80">
                              <td colSpan={3} className="py-2 px-3 text-right text-slate-700">
                                الإجمالي المتوازن:
                              </td>
                              <td className="py-2 px-3 text-left font-mono text-cyan-800">
                                {entry.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                              </td>
                              <td className="py-2 px-3 text-left font-mono text-cyan-800">
                                {entry.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Trial Balance */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">ميزان المراجعة بالأرصدة والمجاميع</h2>
              <p className="text-xs text-slate-500">حركة الحسابات الدفترية والأرصدة الختامية لجميع بنود شجرة الحسابات</p>
            </div>
            <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${trialBalance.isEquilibrium ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
              {trialBalance.isEquilibrium ? '✓ متوازن دفترياً' : '⚠ غير متوازن'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase">
                  <th className="py-3 px-4 w-20">كود</th>
                  <th className="py-3 px-4">اسم الحساب</th>
                  <th className="py-3 px-3 w-28">طبيعة الحساب</th>
                  <th className="py-3 px-4 text-left w-32">مجموع المدين</th>
                  <th className="py-3 px-4 text-left w-32">مجموع الدائن</th>
                  <th className="py-3 px-4 text-left w-32 text-emerald-800">رصيد مدين</th>
                  <th className="py-3 px-4 text-left w-32 text-blue-800">رصيد دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {trialBalance.balances.map(row => (
                  <tr key={row.account.id} className="even:bg-slate-50/80 odd:bg-white hover:bg-blue-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-cyan-700">{row.account.code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {row.account.name}
                      <span className="block text-xs font-normal text-slate-400">{row.account.description}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${row.account.nature === 'debit' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {row.account.nature === 'debit' ? 'مدين بطبيعته' : 'دائن بطبيعته'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-bold text-slate-700">
                      {row.totalDebit > 0 ? row.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-bold text-slate-700">
                      {row.totalCredit > 0 ? row.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-extrabold text-emerald-700">
                      {row.netDebit > 0 ? row.netDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono font-extrabold text-blue-700">
                      {row.netCredit > 0 ? row.netCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-right">
                    إجمالي ميزان المراجعة بالأرصدة:
                  </td>
                  <td className="py-3 px-4 text-left font-mono text-emerald-800">
                    {trialBalance.sumDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                  </td>
                  <td className="py-3 px-4 text-left font-mono text-blue-800">
                    {trialBalance.sumCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Income Statement (P&L) */}
      {activeTab === 'income_statement' && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm max-w-3xl mx-auto overflow-hidden">
          <div className="p-6 bg-slate-900 text-white text-center">
            <h2 className="text-xl font-bold">قائمة الدخل والأرباح الدفترية (P&L)</h2>
            <p className="text-xs text-slate-300 mt-1">مستخرجة مباشرة ومطابقة لقيود اليومية العامة</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Revenues Section */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1">
                الإيرادات التشغيلية (Revenues)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700 font-medium">إيرادات مبيعات الحديد والمصنعية (4101 + 4102)</span>
                  <span className="font-mono font-bold text-slate-800">{financialCards.salesRev.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700 font-medium">الخصم المكتسب من الموردين (4201)</span>
                  <span className="font-mono font-bold text-slate-800">{trialBalance.balances.find(b => b.account.code === '4201')?.totalCredit.toLocaleString() || 0} ج.م</span>
                </div>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1">
                تكاليف البضاعة المباعة (Cost of Goods Sold)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-rose-700 font-medium">تكلفة المواد والحديد المسحوب للمبيعات (5101)</span>
                  <span className="font-mono font-bold text-rose-700">({financialCards.cogs.toLocaleString()}) ج.م</span>
                </div>
                <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg font-bold">
                  <span className="text-slate-800">مجمل ربح النشاط (Gross Profit)</span>
                  <span className={`font-mono text-base ${financialCards.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {financialCards.grossProfit.toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1">
                المصروفات والأعباء التشغيلية (Expenses)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700 font-medium">الخصم المسموح به للعملاء (5201)</span>
                  <span className="font-mono font-bold text-rose-600">({(trialBalance.balances.find(b => b.account.code === '5201')?.totalDebit || 0).toLocaleString()}) ج.م</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700 font-medium">المصروفات العمومية والتشغيلية ووقود الأسطول (5301)</span>
                  <span className="font-mono font-bold text-rose-600">({financialCards.operatingExp.toLocaleString()}) ج.م</span>
                </div>
              </div>
            </div>

            {/* Net Income */}
            <div className="pt-4 border-t-2 border-slate-300">
              <div className={`flex justify-between items-center p-4 rounded-xl border ${financialCards.netProfit >= 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div>
                  <div className="text-sm font-black text-slate-900">صافي الربح المحاسبي الدفتري (Net Profit)</div>
                  <div className="text-xs text-slate-500">بعد خصم كافة التكاليف والمصروفات والخصومات</div>
                </div>
                <div className={`text-2xl font-black font-mono ${financialCards.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {financialCards.netProfit.toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="تأكيد حذف القيد المحاسبي"
        message={`هل أنت متأكد من حذف القيد رقم #${state.journalEntries.find(j => j.id === confirmDeleteId)?.entryNumber}؟ سيؤدي ذلك للتأثير على أرصدة ميزان المراجعة وقائمة الدخل.`}
        onConfirm={() => {
          if (confirmDeleteId) deleteJournalEntry(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-lg font-bold">إنشاء قيد يومية يدوي (تسوية جردية / قيد تسوية)</h3>
                <p className="text-xs text-slate-300">يشترط تساوي إجمالي المدين مع إجمالي الدائن لاعتماد القيد</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveManualEntry} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ القيد</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البيان العام (شرح القيد)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: إثبات إيداع رأس مال نقدي أو تسوية جرد..."
                    value={manualDesc}
                    onChange={e => setManualDesc(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Entry Lines */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">أطراف القيد (المدين والدائن)</h4>
                  <button
                    type="button"
                    onClick={handleAddManualLine}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة طرف قيد
                  </button>
                </div>

                <div className="space-y-2">
                  {manualLines.map((line, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="w-full sm:w-1/3">
                        <select
                          value={line.accountId}
                          onChange={e => {
                            const newLines = [...manualLines];
                            newLines[idx].accountId = e.target.value;
                            setManualLines(newLines);
                          }}
                          className="w-full p-2 text-xs font-bold border border-slate-200 rounded-lg outline-none bg-white text-slate-800"
                        >
                          {state.accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:flex-1">
                        <input
                          type="text"
                          placeholder="البيان الفرعي..."
                          value={line.description}
                          onChange={e => {
                            const newLines = [...manualLines];
                            newLines[idx].description = e.target.value;
                            setManualLines(newLines);
                          }}
                          className="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none bg-white"
                        />
                      </div>

                      <div className="w-1/2 sm:w-24">
                        <input
                          type="number"
                          step="any"
                          placeholder="مدين"
                          value={line.debit || ''}
                          onChange={e => {
                            const newLines = [...manualLines];
                            newLines[idx].debit = Number(e.target.value);
                            if (Number(e.target.value) > 0) newLines[idx].credit = 0;
                            setManualLines(newLines);
                          }}
                          className="w-full p-2 text-xs text-left font-mono font-bold border border-slate-200 rounded-lg outline-none bg-white text-emerald-700"
                        />
                      </div>

                      <div className="w-1/2 sm:w-24">
                        <input
                          type="number"
                          step="any"
                          placeholder="دائن"
                          value={line.credit || ''}
                          onChange={e => {
                            const newLines = [...manualLines];
                            newLines[idx].credit = Number(e.target.value);
                            if (Number(e.target.value) > 0) newLines[idx].debit = 0;
                            setManualLines(newLines);
                          }}
                          className="w-full p-2 text-xs text-left font-mono font-bold border border-slate-200 rounded-lg outline-none bg-white text-blue-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveManualLine(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Verification Footer */}
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex gap-6 text-xs font-mono font-bold">
                  <div>
                    إجمالي المدين: <span className="text-emerald-700 font-extrabold text-sm">{manualTotalDebit.toLocaleString()} ج.م</span>
                  </div>
                  <div>
                    إجمالي الدائن: <span className="text-blue-700 font-extrabold text-sm">{manualTotalCredit.toLocaleString()} ج.م</span>
                  </div>
                  <div>
                    الفرق: <span className={manualDiff === 0 ? 'text-slate-500' : 'text-rose-600 font-extrabold'}>{manualDiff.toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={!isManualBalanced}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all ${
                      isManualBalanced
                        ? 'bg-cyan-600 hover:bg-cyan-700 cursor-pointer'
                        : 'bg-slate-300 cursor-not-allowed opacity-70'
                    }`}
                  >
                    اعتماد وترحيل القيد
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Journal Voucher */}
      {printingEntry && (
        <PrintPreviewModal
          isOpen={true}
          onClose={() => setPrintingEntry(null)}
          title={`سند قيد محاسبي #${printingEntry.entryNumber}`}
        >
          <div className="p-8 bg-white text-slate-900 font-sans" dir="rtl">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{state.settings.companyName}</h1>
                <p className="text-xs text-slate-600">{state.settings.address} | س.ت: {state.settings.taxNumber}</p>
                <p className="text-xs text-slate-600">الهاتف: {state.settings.phone}</p>
              </div>
              <div className="text-left">
                <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider mb-1">
                  سند قيد يومية عامة (JV)
                </div>
                <div className="font-mono text-sm font-bold text-slate-700">رقم: {printingEntry.entryNumber}</div>
                <div className="text-xs text-slate-500">التاريخ: {printingEntry.date}</div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>البيان العام:</strong> {printingEntry.description}</div>
                <div><strong>نوع المعاملة:</strong> {getTypeName(printingEntry.referenceType)}</div>
                {printingEntry.referenceNumber && (
                  <div><strong>الرقم المرجعي:</strong> #{printingEntry.referenceNumber}</div>
                )}
                <div><strong>حالة القيد:</strong> معتمد ومرحل بالدفاتر</div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-right text-xs mb-8 border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2.5 px-3 border-l border-slate-300 w-20">كود الحساب</th>
                  <th className="py-2.5 px-3 border-l border-slate-300">اسم الحساب</th>
                  <th className="py-2.5 px-3 border-l border-slate-300">البيان والشرح</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-left w-32">مدين (منه)</th>
                  <th className="py-2.5 px-3 text-left w-32">دائن (له)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {printingEntry.lines.map((l, i) => (
                  <tr key={i} className="even:bg-slate-50 odd:bg-white">
                    <td className="py-2 px-3 border-l border-slate-200 font-mono font-bold text-slate-700">{l.accountCode}</td>
                    <td className="py-2 px-3 border-l border-slate-200 font-semibold">{l.accountName}</td>
                    <td className="py-2 px-3 border-l border-slate-200 text-slate-600">{l.description}</td>
                    <td className="py-2 px-3 border-l border-slate-200 text-left font-mono font-bold">
                      {l.debit > 0 ? l.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2 px-3 text-left font-mono font-bold">
                      {l.credit > 0 ? l.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                  <td colSpan={3} className="py-2.5 px-3 text-right border-l border-slate-300">
                    الإجمالي المتوازن:
                  </td>
                  <td className="py-2.5 px-3 text-left border-l border-slate-300 font-mono">
                    {printingEntry.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono">
                    {printingEntry.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-8 text-center text-xs pt-8 border-t border-slate-200">
              <div>
                <div className="font-bold text-slate-700 mb-10">إعداد المحاسب</div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-slate-400">التوقيع والتاريخ</div>
              </div>
              <div>
                <div className="font-bold text-slate-700 mb-10">مراجعة المدير المالي</div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-slate-400">التوقيع والتاريخ</div>
              </div>
              <div>
                <div className="font-bold text-slate-700 mb-10">اعتماد الإدارة العامة</div>
                <div className="border-t border-dashed border-slate-400 pt-1 text-slate-400">الختم والتوقيع</div>
              </div>
            </div>
          </div>
        </PrintPreviewModal>
      )}
    </div>
  );
}
