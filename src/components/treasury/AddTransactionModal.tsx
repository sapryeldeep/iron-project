import React, { useState } from 'react';
import { X, PlusCircle, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Landmark, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { PaymentMethod, EntityType } from '../../types';

interface AddTransactionModalProps {
  onClose: () => void;
  onSave: (data: {
    type: 'payment_in' | 'payment_out' | 'transfer';
    personId?: string;
    personType?: EntityType;
    amount: number;
    paymentMethod: PaymentMethod;
    toChannel?: PaymentMethod;
    notes: string;
    date: string;
  }) => void;
  clients: any[];
  suppliers: any[];
}

export default function AddTransactionModal({ onClose, onSave, clients, suppliers }: AddTransactionModalProps) {
  const [type, setType] = useState<'payment_in' | 'payment_out' | 'transfer'>('payment_in');
  const [personType, setPersonType] = useState<EntityType | 'general'>('client');
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [toChannel, setToChannel] = useState<PaymentMethod>('bank');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert('الرجاء إدخال مبلغ صحيح');
    if (type !== 'transfer' && personType !== 'general' && !personId) return alert('الرجاء اختيار الطرف');
    
    onSave({
      type,
      personId: personType === 'general' ? undefined : personId,
      personType: personType === 'general' ? undefined : personType as EntityType,
      amount,
      paymentMethod,
      toChannel: type === 'transfer' ? toChannel : undefined,
      notes,
      date
    });
  };

  const currentPeople = personType === 'client' ? clients : suppliers;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold">تسجيل حركة مالية جديدة</span>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('payment_in')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${type === 'payment_in' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowUpRight className="w-4 h-4" />
              سند قبض
            </button>
            <button
              type="button"
              onClick={() => setType('payment_out')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${type === 'payment_out' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              سند صرف
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${type === 'transfer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              تحويل
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 font-bold focus:border-slate-900 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-slate-500 ml-1">المبلغ (ج.م)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 font-black text-lg text-emerald-700 focus:border-emerald-500 outline-none transition-all text-left"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {type !== 'transfer' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={personType === 'client'} onChange={() => { setPersonType('client'); setPersonId(''); }} className="accent-slate-900" />
                  <span className="text-sm font-bold">عميل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={personType === 'supplier'} onChange={() => { setPersonType('supplier'); setPersonId(''); }} className="accent-slate-900" />
                  <span className="text-sm font-bold">مورد</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={personType === 'general'} onChange={() => { setPersonType('general'); setPersonId(''); }} className="accent-slate-900" />
                  <span className="text-sm font-bold">طرف عام / نثري</span>
                </label>
              </div>

              {personType !== 'general' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 mr-1">اختيار {personType === 'client' ? 'العميل' : 'المورد'}</label>
                  <select
                    value={personId}
                    onChange={e => setPersonId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 font-bold focus:border-slate-900 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="">-- اختر من القائمة --</option>
                    {currentPeople.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (رصيد: {p.balance.toLocaleString()} ج.م)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 mr-1">
                {type === 'transfer' ? 'من قناة' : 'قناة الدفع'}
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 font-bold focus:border-slate-900 outline-none transition-all"
              >
                <option value="cash">نقدي (كاش)</option>
                <option value="bank">حساب بنكي</option>
                <option value="wallet">محفظة إلكترونية</option>
                <option value="instapay">إنستا باي</option>
              </select>
            </div>
            {type === 'transfer' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">إلى قناة</label>
                <select
                  value={toChannel}
                  onChange={e => setToChannel(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 font-bold focus:border-slate-900 outline-none transition-all"
                >
                  <option value="cash">نقدي (كاش)</option>
                  <option value="bank">حساب بنكي</option>
                  <option value="wallet">محفظة إلكترونية</option>
                  <option value="instapay">إنستا باي</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 mr-1">ملاحظات / البيان</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5 font-bold focus:border-slate-900 outline-none transition-all min-h-[80px]"
              placeholder="اكتب هنا تفاصيل إضافية للحركة..."
            />
          </div>

          <button
            type="submit"
            className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
              type === 'payment_in' ? 'bg-emerald-600 hover:bg-emerald-700' : 
              type === 'payment_out' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            حفظ الحركة الآن وتحديث الأرصدة
          </button>
        </form>
      </div>
    </div>
  );
}
