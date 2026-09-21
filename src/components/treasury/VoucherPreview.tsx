import React from 'react';
import { X, Printer, Download, Landmark, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { triggerNativePrint } from '../../utils/printHelper';
import { PaymentMethod } from '../../types';

interface VoucherPreviewProps {
  voucher: {
    id: string;
    date: string;
    docNumber: string;
    type: string;
    typeLabel: string;
    personName: string;
    notes: string;
    channel: PaymentMethod;
    amountIn: number;
    amountOut: number;
  };
  onClose: () => void;
  companySettings: any;
}

export default function VoucherPreview({ voucher, onClose, companySettings }: VoucherPreviewProps) {
  const amount = voucher.amountIn || voucher.amountOut;
  
  const getChannelIcon = (channel: PaymentMethod) => {
    switch (channel) {
      case 'bank': return <Landmark className="w-5 h-5" />;
      case 'wallet': return <Wallet className="w-5 h-5" />;
      case 'instapay': return <Smartphone className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const getChannelName = (channel: PaymentMethod) => {
    switch (channel) {
      case 'bank': return 'حساب بنكي';
      case 'wallet': return 'محفظة إلكترونية';
      case 'instapay': return 'إنستا باي';
      default: return 'نقدي (كاش)';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <span className="font-bold">معاينة وطباعة المستند</span>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div id="printable-voucher" className="flex-1 overflow-y-auto p-8 bg-white text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div className="text-right">
              <h1 className="text-2xl font-black text-slate-900 mb-1">{companySettings.companyName}</h1>
              <p className="text-sm text-slate-600">{companySettings.address}</p>
              <p className="text-sm text-slate-600">ت: {companySettings.phone}</p>
            </div>
            <div className="text-left bg-slate-900 text-white px-6 py-3 rounded-xl">
              <h2 className="text-xl font-bold tracking-widest">{voucher.typeLabel}</h2>
              <p className="text-xs mt-1 opacity-80">{voucher.docNumber}</p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">تاريخ المستند</label>
                <p className="text-lg font-bold">{new Date(voucher.date).toLocaleDateString('ar-EG')}</p>
              </div>
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">قيمة المستند</label>
                <p className="text-3xl font-black text-emerald-600" dir="ltr">{amount.toLocaleString()} ج.م</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">يصرف لـ / يستلم من:</span>
                <span className="text-xl font-black text-slate-900 underline decoration-slate-300 underline-offset-8">
                  {voucher.personName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">وذلك عن:</span>
                <span className="text-lg font-bold text-slate-700">{voucher.notes}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-4 mt-2">
                <span className="text-slate-500 font-bold">طريقة الدفع / القناة:</span>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  {getChannelIcon(voucher.channel)}
                  <span>{getChannelName(voucher.channel)}</span>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 gap-8 pt-12 mt-8">
              <div className="text-center space-y-8">
                <p className="font-bold text-slate-400 border-b border-slate-200 pb-2">توقيع المستلم</p>
                <div className="h-12"></div>
              </div>
              <div className="text-center space-y-8">
                <p className="font-bold text-slate-400 border-b border-slate-200 pb-2">المحاسب</p>
                <div className="h-12"></div>
              </div>
              <div className="text-center space-y-8">
                <p className="font-bold text-slate-400 border-b border-slate-200 pb-2">المدير العام</p>
                <div className="h-12"></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-6 border-t border-slate-100 text-center space-y-2">
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
            </p>
            <p className="text-[8px] text-slate-300">تم استخراج هذا المستند آلياً من نظام إدارة المخازن والحسابات</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 no-print">
          <button 
            onClick={() => triggerNativePrint(document.getElementById('printable-voucher'))}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <Printer className="w-5 h-5" />
            طباعة المستند الحالية
          </button>
          <button 
            className="flex-1 bg-white border-2 border-slate-200 hover:bg-slate-100 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-5 h-5" />
            تصدير كـ PDF
          </button>
        </div>
      </div>
    </div>
  );
}
