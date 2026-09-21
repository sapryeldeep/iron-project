import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { 
  Landmark, Wallet, CreditCard, Smartphone, ArrowUpRight, ArrowDownLeft, 
  Search, Printer, Download, PlusCircle, ArrowLeftRight, FileText, X, Eye, 
  Calendar, RefreshCw, Filter, TrendingUp, TrendingDown, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { PaymentMethod } from '../types';
import VoucherPreview from './treasury/VoucherPreview';
import AddTransactionModal from './treasury/AddTransactionModal';
import ConfirmModal from './ConfirmModal';
import { AccountingEngine } from '../lib/accounting-engine';
import { triggerNativePrint } from '../utils/printHelper';
import { exportDataToPDF, exportCustomExcel } from '../utils/export';

export default function TreasuryView() {
  const { state, addTransaction, addExpense, logActivity, deleteTransaction, deleteExpense } = useAppStore();
  const isAdmin = state.currentUser?.role === 'admin';
  const canDownload = isAdmin || (state.currentUser?.permissions?.canDownload ?? true);
  const canDelete = isAdmin || (state.currentUser?.permissions?.canDelete ?? false);

  const [selectedChannel, setSelectedChannel] = useState<'all' | PaymentMethod>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; entry: any | null }>({
    isOpen: false,
    entry: null
  });

  // 1. Get all entries using AccountingEngine (Unified Logic)
  const allEntries = useMemo(() => {
    const entries = AccountingEngine.getTreasuryLedger(state);
    return sortOrder === 'desc' ? [...entries].reverse() : entries;
  }, [state, sortOrder]);

  // 2. Compute current balances using AccountingEngine
  const currentBalances = useMemo(() => {
    return AccountingEngine.getTreasuryBalances(state);
  }, [state]);

  // Filters
  const filteredEntries = useMemo(() => {
    return allEntries.filter(e => {
      const matchChannel = selectedChannel === 'all' || e.channel === selectedChannel;
      const matchType = selectedType === 'all' || e.type === selectedType;
      const matchSearch = !searchTerm || 
        e.personName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.notes.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStart = !startDate || e.date >= startDate;
      const matchEnd = !endDate || e.date <= endDate;
      return matchChannel && matchType && matchSearch && matchStart && matchEnd;
    });
  }, [allEntries, selectedChannel, selectedType, searchTerm, startDate, endDate]);

  const totals = useMemo(() => {
    const inbound = filteredEntries.reduce((sum, e) => sum + e.amountIn, 0);
    const outbound = filteredEntries.reduce((sum, e) => sum + e.amountOut, 0);
    return { inbound, outbound, net: inbound - outbound };
  }, [filteredEntries]);

  const handleSaveTransaction = (data: any) => {
    if (data.type === 'transfer') {
      addTransaction({
        personId: 'internal_transfer',
        type: 'payment_out',
        category: 'general',
        amount: data.amount,
        date: data.date,
        notes: `تحويل صادر إلى ${data.toChannel}: ${data.notes}`,
        paymentMethod: data.paymentMethod
      });
      addTransaction({
        personId: 'internal_transfer',
        type: 'payment_in',
        category: 'general',
        amount: data.amount,
        date: data.date,
        notes: `تحويل وارد من ${data.paymentMethod}: ${data.notes}`,
        paymentMethod: data.toChannel
      });
      logActivity('تحويل مالي', `تحويل مبلغ ${data.amount} من ${data.paymentMethod} إلى ${data.toChannel}`);
    } else {
      addTransaction({
        personId: data.personId || 'general',
        type: data.type,
        category: 'general',
        amount: data.amount,
        date: data.date,
        notes: data.notes,
        paymentMethod: data.paymentMethod
      });
      logActivity(data.type === 'payment_in' ? 'سند قبض' : 'سند صرف', `تسجيل مبلغ ${data.amount} ج.م لحساب ${data.personId || 'طرف عام'}`);
    }
    setIsAddModalOpen(false);
  };

  const getChannelIcon = (channel: PaymentMethod) => {
    switch (channel) {
      case 'bank': return <Landmark className="w-4 h-4" />;
      case 'wallet': return <Wallet className="w-4 h-4" />;
      case 'instapay': return <Smartphone className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: PaymentMethod) => {
    switch (channel) {
      case 'bank': return 'bg-indigo-100 text-indigo-700';
      case 'wallet': return 'bg-orange-100 text-orange-700';
      case 'instapay': return 'bg-purple-100 text-purple-700';
      default: return 'bg-emerald-100 text-emerald-700';
    }
  };

  const treasuryRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (treasuryRef.current) {
      triggerNativePrint(treasuryRef.current, 'تقرير_الخزنة_والسيولة');
    }
  };

  const handleExportPDF = async () => {
    await exportDataToPDF({
      title: 'تقرير حركة الخزنة والسيولة النقدية',
      filename: `حركة_الخزنة_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'index', label: 'م', type: 'number' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'docNumber', label: 'رقم المستند', type: 'string' },
        { key: 'typeLabel', label: 'نوع الحركة', type: 'string' },
        { key: 'personName', label: 'الطرف / البيان', type: 'string' },
        { key: 'channelLabel', label: 'القناة', type: 'string' },
        { key: 'amountIn', label: 'الوارد (ج.م)', type: 'number' },
        { key: 'amountOut', label: 'المنصرف (ج.م)', type: 'number' },
      ],
      data: filteredEntries.map((e, idx) => ({
        index: filteredEntries.length - idx,
        date: e.date,
        docNumber: e.docNumber,
        typeLabel: e.type === 'payment_in' ? 'سند قبض' : e.type === 'payment_out' ? 'سند صرف' : 'مصروف',
        personName: e.personName || 'طرف عام',
        channelLabel: e.channel === 'bank' ? 'البنك' : e.channel === 'wallet' ? 'محفظة' : e.channel === 'instapay' ? 'إنستا باي' : 'الخزينة (كاش)',
        amountIn: e.amountIn,
        amountOut: e.amountOut,
      })),
      summaryColumns: ['amountIn', 'amountOut']
    });
  };

  const handleExportExcel = async () => {
    await exportCustomExcel({
      title: 'تقرير حركة الخزنة والسيولة النقدية',
      filename: `حركة_الخزنة_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'index', label: 'م', type: 'number' },
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'docNumber', label: 'رقم المستند', type: 'string' },
        { key: 'typeLabel', label: 'نوع الحركة', type: 'string' },
        { key: 'personName', label: 'الطرف / البيان', type: 'string' },
        { key: 'channelLabel', label: 'القناة', type: 'string' },
        { key: 'amountIn', label: 'الوارد (ج.م)', type: 'number' },
        { key: 'amountOut', label: 'المنصرف (ج.م)', type: 'number' },
      ],
      data: filteredEntries.map((e, idx) => ({
        index: filteredEntries.length - idx,
        date: e.date,
        docNumber: e.docNumber,
        typeLabel: e.type === 'payment_in' ? 'سند قبض' : e.type === 'payment_out' ? 'سند صرف' : 'مصروف',
        personName: e.personName || 'طرف عام',
        channelLabel: e.channel === 'bank' ? 'البنك' : e.channel === 'wallet' ? 'محفظة' : e.channel === 'instapay' ? 'إنستا باي' : 'الخزينة (كاش)',
        amountIn: e.amountIn,
        amountOut: e.amountOut,
      })),
      summaryColumns: ['amountIn', 'amountOut']
    });
  };

  return (
    <div ref={treasuryRef} className="space-y-6 animate-in fade-in duration-500">
      {/* Treasury Header & Balances */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
              <Landmark className="w-8 h-8" />
            </div>
            الخزينة والحسابات النقدية
          </h1>
          <p className="text-slate-500 font-bold mt-1">متابعة أرصدة السيولة وحركة النقدية اللحظية</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-200 transition-all active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            حركة جديدة / تحويل
          </button>
          <button 
            onClick={handlePrint}
            className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            title="طباعة"
          >
            <Printer className="w-5 h-5" />
            طباعة
          </button>
          {canDownload && (
            <>
              <button 
                onClick={handleExportPDF}
                className="bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                title="تصدير PDF"
              >
                <Download className="w-5 h-5" />
                PDF
              </button>
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                title="تصدير Excel"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="relative z-10">
            <p className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-1">إجمالي السيولة</p>
            <h3 className="text-2xl font-black font-mono tracking-tighter" dir="ltr">
              {currentBalances.total.toLocaleString()} <span className="text-xs opacity-60">ج.م</span>
            </h3>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-white/40">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              تحديث تلقائي لحظي
            </div>
          </div>
        </div>

        {[
          { key: 'cash', label: 'الخزينة (كاش)', icon: <CreditCard />, val: currentBalances.cash },
          { key: 'bank', label: 'البنك', icon: <Landmark />, val: currentBalances.bank },
          { key: 'wallet', label: 'محفظة', icon: <Wallet />, val: currentBalances.wallet },
          { key: 'instapay', label: 'إنستا باي', icon: <Smartphone />, val: currentBalances.instapay }
        ].map((item) => (
          <div key={item.key} className="bg-white p-5 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg transition-all border-b-4 border-b-slate-200 group">
            <div className={`w-10 h-10 rounded-2xl mb-3 flex items-center justify-center transition-colors ${getChannelColor(item.key as any)}`}>
              {item.icon}
            </div>
            <p className="text-slate-400 font-bold text-xs mb-1">{item.label}</p>
            <h3 className="text-xl font-black text-slate-900 font-mono tracking-tighter" dir="ltr">
              {item.val.toLocaleString()} <span className="text-[10px] opacity-40">ج.م</span>
            </h3>
          </div>
        ))}
      </div>

      {/* Stats and Search */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="flex flex-col xl:flex-row justify-between gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group flex-1 min-w-[280px]">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <input 
                type="text"
                placeholder="ابحث برقم المستند، الاسم، أو البيان..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 pr-12 pl-4 font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-100 p-1.5 rounded-2xl">
              <Calendar className="w-4 h-4 text-slate-400 mr-2" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-bold text-xs outline-none" />
              <span className="text-slate-300 font-black">←</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-bold text-xs outline-none" />
            </div>
            <select 
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-slate-50 border-2 border-slate-100 p-3 rounded-2xl font-bold text-xs outline-none appearance-none pr-8"
            >
              <option value="all">جميع أنواع الحركات</option>
              <option value="payment_in">سندات القبض</option>
              <option value="payment_out">سندات الصرف</option>
              <option value="expense">المصروفات</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter w-12 text-center">م</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter min-w-[120px]">التاريخ والوقت</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter">رقم الحركة/المستند</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter">نوع الحركة</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter">الطرف / البيان</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter">القناة</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter text-emerald-400 bg-white/5">الوارد (+.د)</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter text-rose-400 bg-white/5">المنصرف (-.د)</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter bg-emerald-900/40">رصيد الخزنة اللحظي</th>
                <th className="py-4 px-3 text-[11px] font-black uppercase tracking-tighter text-center no-print">إجراءات</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-300 font-bold italic">
                    لا توجد حركات مسجلة حالياً تطابق معايير البحث
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px]">{filteredEntries.length - idx}</td>
                    <td className="py-3 px-3 font-bold text-slate-600">
                      {new Date(e.date).toLocaleDateString('ar-EG')}
                      <span className="block text-[10px] opacity-40 font-mono mt-0.5">{new Date(e.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-3 px-3 font-black text-slate-900 font-mono text-[12px]">{e.docNumber}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${
                        e.type === 'payment_in' ? 'bg-emerald-100 text-emerald-700' : 
                        e.type === 'payment_out' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {e.type === 'payment_in' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {e.typeLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <span className="font-black text-slate-800 block">{e.personName}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{e.notes}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className={`px-2 py-1 rounded-lg flex items-center gap-1 w-fit ${getChannelColor(e.channel)}`}>
                        {getChannelIcon(e.channel)}
                        <span className="text-[10px] font-bold">{e.channel}</span>
                      </div>
                    </td>
                    <td className={`py-3 px-3 font-black text-slate-900 ${e.amountIn > 0 ? 'bg-emerald-50/30' : ''}`} dir="ltr">
                      {e.amountIn > 0 ? `+${e.amountIn.toLocaleString()}` : '-'}
                    </td>
                    <td className={`py-3 px-3 font-black text-rose-600 ${e.amountOut > 0 ? 'bg-rose-50/30' : ''}`} dir="ltr">
                      {e.amountOut > 0 ? `-${e.amountOut.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-slate-900 bg-slate-100/80" dir="ltr">
                      {e.runningTotalBalance.toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-3 text-center no-print flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedVoucher(e)}
                        className="bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 p-1.5 rounded-lg font-bold transition-all flex items-center gap-1"
                        title="معاينة وطباعة السند"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px]">سند</span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, entry: e })}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg font-bold transition-all flex items-center gap-1 group-hover:scale-110 transition-transform"
                          title="حذف الحركة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold text-slate-500">إجمالي الوارد: {totals.inbound.toLocaleString()} ج.م</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-xs font-bold text-slate-500">إجمالي المنصرف: {totals.outbound.toLocaleString()} ج.م</span>
            </div>
          </div>
          <div className="text-slate-900 font-black text-sm">
            صافي الحركة في الكشف المفلتر: <span className={totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'} dir="ltr">{totals.net.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddTransactionModal 
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveTransaction}
          clients={state.clients}
          suppliers={state.suppliers}
        />
      )}

      {selectedVoucher && (
        <VoucherPreview 
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          companySettings={state.settings}
        />
      )}

      {deleteConfirm.isOpen && deleteConfirm.entry && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          title="تأكيد حذف الحركة"
          message={`هل أنت متأكد من حذف الحركة رقم (${deleteConfirm.entry.docNumber}) نهائياً؟ سيتم إعادة حساب أرصدة الخزنة والطرف الآخر تلقائياً.`}
          confirmLabel="نعم، احذف الآن"
          cancelLabel="تراجع"
          onConfirm={() => {
            const e = deleteConfirm.entry;
            if (e.id.startsWith('tx-')) {
              deleteTransaction(e.id.replace('tx-', ''));
              logActivity('حذف حركة خزنة', `تم حذف الحركة رقم ${e.docNumber} بمبلغ ${e.amountIn || e.amountOut}`);
            } else if (e.id.startsWith('exp-')) {
              deleteExpense(e.id.replace('exp-', ''));
              logActivity('حذف مصروف', `تم حذف المصروف رقم ${e.docNumber} بمبلغ ${e.amountOut}`);
            }
            setDeleteConfirm({ isOpen: false, entry: null });
          }}
          onCancel={() => setDeleteConfirm({ isOpen: false, entry: null })}
        />
      )}
    </div>
  );
}
