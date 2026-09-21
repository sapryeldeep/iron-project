import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { Receipt, Search, Download, Printer, Trash2, FileText, X, Eye, Wallet, Landmark, Smartphone, CreditCard } from 'lucide-react';
import { PaymentMethod, Transaction } from '../types';
import { exportDataToPDF } from '../utils/export';
import ConfirmModal from './ConfirmModal';

import { AccountingEngine } from '../lib/accounting-engine';

export default function PaymentsView() {
  const { state, addTransaction, deleteTransaction } = useAppStore();
  const isAdmin = state.currentUser?.role === 'admin';
  const canDelete = isAdmin || (state.currentUser?.permissions?.canDelete ?? false);
  const canDownload = isAdmin || (state.currentUser?.permissions?.canDownload ?? true);

  const [personType, setPersonType] = useState<'client' | 'supplier'>('client');
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<'all' | 'payment_in' | 'payment_out'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Selected Voucher preview
  const [selectedVoucher, setSelectedVoucher] = useState<Transaction | null>(null);
  const [voucherPrintMode, setVoucherPrintMode] = useState<'a4' | 'thermal'>('a4');

  const paymentsRef = useRef<HTMLDivElement>(null);
  const persons = personType === 'client' ? state.clients : state.suppliers;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || amount <= 0) return;

    const isClient = personType === 'client';
    const txType = isClient ? 'payment_in' : 'payment_out';

    addTransaction({
      personId,
      type: txType,
      category: 'general',
      amount,
      date,
      notes: notes || (isClient ? 'دفعة نقدية من عميل' : 'دفعة نقدية لمورد'),
      paymentMethod
    });

    setAmount(0);
    setNotes('');
  };

  const allVouchers = state.transactions.filter(t => t.type.includes('payment'));
  const allVouchersCount = allVouchers.length;
  const inVouchersCount = allVouchers.filter(t => t.type === 'payment_in').length;
  const outVouchersCount = allVouchers.filter(t => t.type === 'payment_out').length;

  const getFilteredTransactions = () => {
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

    return state.transactions.filter(t => {
      const person = [...state.clients, ...state.suppliers].find(p => p.id === t.personId);
      if (!person) return false;
      const matchesSearch = person.name.includes(searchTerm) || (t.notes && t.notes.includes(searchTerm));
      const matchesFilter = voucherTypeFilter === 'all' || t.type === voucherTypeFilter;
      return t.type.includes('payment') && matchesSearch && matchesFilter;
    }).sort((a, b) => {
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      if (timeA !== timeB) {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === 'desc' 
        ? (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || '')
        : (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || '');
    });
  };

  const getChannelName = (method?: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'الكاش النقدي';
      case 'bank': return 'تحويل بنكي';
      case 'wallet': return 'محفظة إلكترونية';
      case 'instapay': return 'إنستا باي (InstaPay)';
      default: return 'كاش نقدي';
    }
  };

  const handleExportPDF = async () => {
    const columns = [
      { key: 'date', label: 'التاريخ', type: 'date' },
      { key: 'personName', label: 'الاسم' },
      { key: 'type', label: 'النوع' },
      { key: 'channel', label: 'القناة' },
      { key: 'notes', label: 'البيان' },
      { key: 'amount', label: 'المبلغ', type: 'number' }
    ];

    const data = getFilteredTransactions().map(t => {
      const person = [...state.clients, ...state.suppliers].find(p => p.id === t.personId);
      return {
        date: t.date,
        personName: person?.name || 'غير معروف',
        type: t.type === 'payment_in' ? 'قبض' : 'صرف',
        channel: getChannelName(t.paymentMethod),
        notes: t.notes,
        amount: t.amount
      };
    });

    await exportDataToPDF({
      title: 'تقرير سندات القبض والصرف الشامل',
      columns,
      data,
      filename: `تقرير_الدفعات_${new Date().toISOString().slice(0, 10)}`,
      summaryColumns: ['amount']
    });
  };

  return (
    <div className="space-y-6" ref={paymentsRef} id="payments-view-container">
      <div className="flex justify-between items-center print:hidden">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Receipt className="w-8 h-8 text-blue-600" />
          سندات القبض والصرف (الدفعات)
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const el = document.getElementById('voucher-print-area') || paymentsRef.current;
              if (el) triggerNativePrint(el, 'سجل_السندات_المالية');
              else window.print();
            }} 
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 hover:bg-slate-50 shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-600"/> 
            طباعة الكشف
          </button>
          {canDownload && (
            <button 
              onClick={handleExportPDF} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400"/> 
              تصدير PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 print:hidden">
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              تسجيل سند دفعة جديدة
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة والجهة</label>
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button 
                    type="button" 
                    onClick={() => {setPersonType('client'); setPersonId('');}} 
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${personType === 'client' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                  >
                    قبض من عميل (+)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {setPersonType('supplier'); setPersonId('');}} 
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${personType === 'supplier' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}
                  >
                    صرف لمورد (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الطرف المالي</label>
                <select 
                  required 
                  value={personId} 
                  onChange={e => setPersonId(e.target.value)} 
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm bg-white"
                >
                  <option value="">اختر {personType === 'client' ? 'العميل' : 'المورد'}...</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (الرصيد: {p.balance.toLocaleString()} ج.م)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">قناة الخزنة والدفع</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">الكاش النقدي (الخزنة)</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="wallet">محفظة إلكترونية (فودافون كاش...)</option>
                  <option value="instapay">إنستا باي (InstaPay)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ (ج.م)</label>
                  <input 
                    required 
                    type="number" 
                    min="0.01" 
                    step="0.01" 
                    value={amount || ''} 
                    onChange={e => setAmount(Number(e.target.value))} 
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono font-black text-lg text-emerald-700" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ</label>
                  <input 
                    required 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البيان / ملاحظات</label>
                <textarea 
                  rows={2} 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="مثال: دفعة تحت الحساب عداً ونقداً..." 
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                حفظ وتسجيل السند
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50 print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 ml-1">سجل السندات:</h3>
                <div className="flex bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setVoucherTypeFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      voucherTypeFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-300/60'
                    }`}
                  >
                    جميع السندات ({allVouchersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherTypeFilter('payment_in')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      voucherTypeFilter === 'payment_in'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-300/60'
                    }`}
                  >
                    سندات القبض ({inVouchersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherTypeFilter('payment_out')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      voucherTypeFilter === 'payment_out'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-300/60'
                    }`}
                  >
                    سندات الصرف ({outVouchersCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-blue-300 text-blue-900 font-bold rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="desc">الأحدث أولاً</option>
                  <option value="asc">الأقدم أولاً (تسلسلي)</option>
                </select>

                <div className="relative w-full sm:w-52">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="بحث بالاسم أو البيان..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto p-4">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 text-xs font-black border-b-2 border-slate-300">
                    <th className="py-3 px-3 border-r border-slate-200">التاريخ والوقت</th>
                    <th className="py-3 px-3 border-r border-slate-200">الطرف المالي</th>
                    <th className="py-3 px-3 border-r border-slate-200">نوع الحركة</th>
                    <th className="py-3 px-3 border-r border-slate-200">القناة</th>
                    <th className="py-3 px-3 border-r border-slate-200">البيان</th>
                    <th className="py-3 px-3 border-r border-slate-200">المبلغ</th>
                    <th className="py-3 px-3 text-center print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-semibold">
                  {getFilteredTransactions().map(t => {
                    const person = [...state.clients, ...state.suppliers].find(p => p.id === t.personId);
                    if (!person) return null;
                    const isIn = t.type === 'payment_in';
                    return (
                      <tr key={t.id} className="even:bg-slate-50/80 odd:bg-white hover:bg-blue-50/60 transition-colors">
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {(() => {
                            const dStr = t.createdAt || t.date;
                            const d = new Date(dStr);
                            if (isNaN(d.getTime())) return dStr;
                            const df = d.toLocaleDateString('ar-EG');
                            const tf = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
                            return (
                              <div className="flex flex-col text-xs">
                                <span className="font-bold text-slate-900">{df}</span>
                                <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{tf}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">{person.name}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${isIn ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {isIn ? 'قبض (+)' : 'صرف (-)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{getChannelName(t.paymentMethod)}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{t.notes}</td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">{t.amount.toLocaleString()} ج.م</td>
                        <td className="py-3 px-3 text-center print:hidden flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setSelectedVoucher(t)}
                            className="bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
                            title="عرض ومعاينة السند"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            سند
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                              title="حذف السند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {getFilteredTransactions().length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-bold">لا توجد سندات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="تأكيد حذف السند"
        message={`هل أنت متأكد من حذف هذا السند بقيمة (${getFilteredTransactions().find(t => t.id === confirmDeleteId)?.amount.toLocaleString()} ج.م)؟ سيتم إلغاء أثره المالي فوراً.`}
        onConfirm={() => {
          if (confirmDeleteId) deleteTransaction(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Interactive Voucher Preview Modal (A4 & Thermal 80mm) */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  معاينة سند {selectedVoucher.type === 'payment_in' ? 'قبض' : 'صرف'}
                </h2>
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setVoucherPrintMode('a4')}
                    className={`px-3 py-1 rounded-md transition-all ${voucherPrintMode === 'a4' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
                  >
                    ورق قياسي A4
                  </button>
                  <button
                    onClick={() => setVoucherPrintMode('thermal')}
                    className={`px-3 py-1 rounded-md transition-all ${voucherPrintMode === 'thermal' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}
                  >
                    بون حراري 80mm
                  </button>
                </div>
              </div>

              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-slate-50" id="single-voucher-printable">
              {(() => {
                const person = [...state.clients, ...state.suppliers].find(p => p.id === selectedVoucher.personId);
                const isPaymentIn = selectedVoucher.type === 'payment_in';
                
                // Account balances calculation using unified logic
                const currentBal = person ? AccountingEngine.calculatePersonBalance(person, state.transactions, state.invoices) : 0;
                // Since selectedVoucher is already in state.transactions, currentBal INCLUDES this voucher.
                // To get prevBal, we need to reverse the effect of this voucher.
                const effect = person ? AccountingEngine.getMovementEffect(person, selectedVoucher, state.invoices) : 0;
                const prevBal = currentBal - effect;
                const newBal = currentBal;

                if (voucherPrintMode === 'a4') {
                  return (
                    <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-6 text-slate-900" dir="rtl">
                      {/* Header */}
                      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                        <div>
                          <h1 className="text-2xl font-black">{state.settings.companyName}</h1>
                          <p className="text-xs text-slate-500 font-bold">{state.settings.address} | هاتف: <span dir="ltr">{state.settings.phone}</span></p>
                        </div>
                        <div className="text-left">
                          <div className={`inline-block px-4 py-1 text-white rounded-lg font-black text-sm mb-1 ${isPaymentIn ? 'bg-emerald-700' : 'bg-rose-700'}`}>
                            سند {isPaymentIn ? 'قبض نقدية' : 'صرف نقدية'}
                          </div>
                          <p className="font-mono font-bold text-xs text-slate-700">الرقم: {selectedVoucher.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-slate-500 font-bold">
                            التاريخ والوقت: {(() => {
                              const dStr = selectedVoucher.createdAt || selectedVoucher.date;
                              const d = new Date(dStr);
                              return !isNaN(d.getTime()) 
                                ? `${d.toLocaleDateString('ar-EG')} - ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                : selectedVoucher.date;
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="space-y-4 text-sm font-bold">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-slate-500">استلمنا من / يصرف إلى:</span>
                          <span className="font-black text-base text-slate-900">{person?.name || 'طرف نقدي عام'}</span>
                        </div>

                        <div className="flex justify-between border-b pb-2 items-center">
                          <span className="text-slate-500">المبلغ المدفوع:</span>
                          <div className="bg-emerald-50 text-emerald-900 px-4 py-1.5 rounded-xl font-mono font-black text-xl border border-emerald-200">
                            {selectedVoucher.amount.toLocaleString()} ج.م
                          </div>
                        </div>

                        <div className="flex justify-between border-b pb-2">
                          <span className="text-slate-500">قناة الخزنة والسيولة:</span>
                          <span className="font-black text-slate-800">{getChannelName(selectedVoucher.paymentMethod)}</span>
                        </div>

                        <div className="flex justify-between border-b pb-2">
                          <span className="text-slate-500">وذلك مقابل / البيان:</span>
                          <span className="font-semibold text-slate-800">{selectedVoucher.notes}</span>
                        </div>
                      </div>

                      {/* Client Account Statement Mini Box */}
                      {person && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs font-bold">
                          <h4 className="font-black text-slate-800 border-b border-slate-200 pb-1">موقف الحساب المالي والإنهاء</h4>
                          <div className="flex justify-between">
                            <span className="text-slate-500">الرصيد السابق قبل هذا السند:</span>
                            <span className="font-mono" dir="ltr">{Math.abs(prevBal).toLocaleString()} ج.م {prevBal > 0 ? '(مدين)' : prevBal < 0 ? '(دائن)' : ''}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700">
                            <span>المبلغ المسدد بهذا السند:</span>
                            <span className="font-mono">{selectedVoucher.amount.toLocaleString()} ج.م</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 font-black text-slate-900">
                            <span>إجمالي الرصيد المتبقي اللحظي:</span>
                            <span className={`font-mono ${newBal > 0 ? 'text-rose-600' : newBal < 0 ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                              {Math.abs(newBal).toLocaleString()} ج.م {newBal > 0 ? '(مدين)' : newBal < 0 ? '(دائن)' : 'مخلص'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-8 pt-6">
                        <div className="text-center space-y-8">
                          <p className="font-black text-xs text-slate-700 border-b pb-1">توقيع المستلم</p>
                          <div className="h-0.5 bg-slate-200 w-28 mx-auto"></div>
                        </div>
                        <div className="text-center space-y-8">
                          <p className="font-black text-xs text-slate-700 border-b pb-1">الختم والاعتماد</p>
                          <div className="h-0.5 bg-slate-200 w-28 mx-auto"></div>
                        </div>
                      </div>

                      <div className="pt-6 border-t text-[9px] text-slate-400 font-mono font-bold text-center dir-ltr">
                        programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 text-slate-900 font-sans mx-auto max-w-[80mm]" dir="rtl">
                      <div className="text-center border-b pb-2">
                        <h1 className="text-base font-black">{state.settings.companyName}</h1>
                        <div className={`text-white text-xs font-bold px-2 py-0.5 rounded my-1 inline-block ${isPaymentIn ? 'bg-emerald-800' : 'bg-rose-800'}`}>
                          سند {isPaymentIn ? 'قبض' : 'صرف'}
                        </div>
                        <p className="text-[10px] font-mono font-bold">{selectedVoucher.id.slice(0, 8).toUpperCase()} | {new Date(selectedVoucher.date).toLocaleDateString('ar-EG')}</p>
                      </div>

                      <div className="space-y-2 text-xs font-bold">
                        <div>الطرف: <span className="font-black">{person?.name || 'عام'}</span></div>
                        <div>القناة: <span>{getChannelName(selectedVoucher.paymentMethod)}</span></div>
                        <div className="bg-slate-100 p-2 rounded text-center font-mono font-black text-base text-emerald-800">
                          المبلغ: {selectedVoucher.amount.toLocaleString()} ج.م
                        </div>
                        <div className="text-[10px] text-slate-600">البيان: {selectedVoucher.notes}</div>
                        {person && (
                          <div className="border-t pt-2 text-[10px] space-y-1 bg-slate-50 p-2 rounded">
                            <div className="flex justify-between"><span>الرصيد السابق:</span><span>{Math.abs(prevBal).toLocaleString()}</span></div>
                            <div className="flex justify-between font-black text-rose-700"><span>الرصيد الجديد:</span><span>{Math.abs(newBal).toLocaleString()}</span></div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t text-[8px] text-slate-400 font-mono text-center dir-ltr">
                        programmed by sabry elfeeb | 01065826742
                      </div>
                    </div>
                  );
                }
              })()}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  const el = document.getElementById('single-voucher-printable');
                  if (el) triggerNativePrint(el, `سند_${selectedVoucher.type === 'payment_in' ? 'قبض' : 'صرف'}_${selectedVoucher.id.slice(0, 6)}`);
                  else window.print();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                طباعة السند
              </button>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
