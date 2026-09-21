import React, { useState } from 'react';
import { Wallet, Sparkles, Trash2, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { AppSettings, User } from '../../types';

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com

interface GeneralSettingsTabProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  resetSystemData: () => void;
  currentUser: User | null;
}

export default function GeneralSettingsTab({ settings, setSettings, resetSystemData, currentUser }: GeneralSettingsTabProps) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPin, setResetPin] = useState('');
  const [resetError, setResetError] = useState('');

  const handleConfirmReset = () => {
    if (currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      setShowResetModal(false);
      return;
    }
    setShowResetModal(false);
    resetSystemData();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">بيانات الشركة للمطبوعات</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <input 
              type="checkbox"
              checked={settings.showAudit !== false}
              onChange={e => setSettings({...settings, showAudit: e.target.checked})}
              className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-rose-800">إظهار زر "الرقابة والتدقيق" في الشريط العلوي</span>
              <span className="text-[10px] text-rose-600 font-semibold">يمكنك إخفاء الزر تماماً عن جميع المستخدمين من هنا.</span>
            </div>
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">اسم الشركة / المؤسسة</label>
          <input 
            type="text" 
            value={settings.companyName || ''}
            onChange={e => setSettings({...settings, companyName: e.target.value})}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">رقم الهاتف</label>
          <input 
            type="text" 
            value={settings.phone || ''}
            onChange={e => setSettings({...settings, phone: e.target.value})}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">الرقم الضريبي / السجل</label>
          <input 
            type="text" 
            value={settings.taxNumber || ''}
            onChange={e => setSettings({...settings, taxNumber: e.target.value})}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">العنوان</label>
          <input 
            type="text" 
            value={settings.address || ''}
            onChange={e => setSettings({...settings, address: e.target.value})}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 mt-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">إعدادات المصنعية والنولون الافتراضية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">سعر مصنعية الليزر الافتراضي (جنيه / كجم)</label>
            <input 
              type="number" 
              value={settings.defaultLaserRatePerKg !== undefined ? settings.defaultLaserRatePerKg : 500}
              onChange={e => setSettings({...settings, defaultLaserRatePerKg: parseFloat(e.target.value) || 0})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">سعر النولون الافتراضي (جنيه)</label>
            <input 
              type="number" 
              value={settings.defaultFreightRate !== undefined ? settings.defaultFreightRate : 300}
              onChange={e => setSettings({...settings, defaultFreightRate: parseFloat(e.target.value) || 0})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 mt-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">الأرصدة الافتتاحية للخزائن والنقدية</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">رصيد الخزنة النقدية الافتتاحي</label>
            <input 
              type="number" 
              value={settings.treasuryOpeningBalanceCash !== undefined ? settings.treasuryOpeningBalanceCash : 0}
              onChange={e => setSettings({...settings, treasuryOpeningBalanceCash: parseFloat(e.target.value) || 0})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-emerald-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">رصيد البنك الافتتاحي</label>
            <input 
              type="number" 
              value={settings.treasuryOpeningBalanceBank !== undefined ? settings.treasuryOpeningBalanceBank : 0}
              onChange={e => setSettings({...settings, treasuryOpeningBalanceBank: parseFloat(e.target.value) || 0})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">رصيد المحفظة / الشيكات الافتتاحي</label>
            <input 
              type="number" 
              value={settings.treasuryOpeningBalanceWallet !== undefined ? settings.treasuryOpeningBalanceWallet : 0}
              onChange={e => setSettings({...settings, treasuryOpeningBalanceWallet: parseFloat(e.target.value) || 0})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-amber-600"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-rose-900">منطقة العمليات الخطرة (Danger Zone)</h3>
            <p className="text-xs text-rose-600 font-bold">هذه العمليات لا يمكن التراجع عنها وتؤثر على كامل بيانات المؤسسة</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex-1">
            <h4 className="font-black text-slate-900 text-sm mb-1">تصفير النظام (إعادة ضبط المصنع)</h4>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              سيتم حذف كافة الفواتير، الحركات المالية، سجلات المخزون، والموازين نهائياً. 
              سيتم الاحتفاظ فقط بحسابات المستخدمين الحالية وإعدادات الشركة الأساسية.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => {
              setResetPin('');
              setResetError('');
              setShowResetModal(true);
            }}
            className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-black transition-all hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <RefreshCw className="w-5 h-5" />
            تصفير كافة البيانات
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 border border-rose-200 text-right" dir="rtl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="font-black text-lg text-slate-900">تأكيد تصفير النظام</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 leading-relaxed">
                🚨 تحذير خطير: هذه العملية لا يمكن التراجع عنها نهائياً. سيتم حذف جميع الفواتير والمخزون وحركات الخزينة.
              </div>



              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  تأكيد الحذف وتصفير النظام
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
