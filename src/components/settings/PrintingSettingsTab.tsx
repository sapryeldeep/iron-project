import React from 'react';
import { Printer as PrinterIcon, Hash, Sparkles, Layout, Eye, Search, Scale } from 'lucide-react';
import { AppSettings, Invoice } from '../../types';
import { getNextInvoiceNumber } from '../../utils/invoiceNumber';

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com

interface PrintingSettingsTabProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  stateInvoices: Invoice[];
  setSetupModalType: (type: 'printer' | 'scale' | null) => void;
  setPreviewTemplateKey: (key: 'classic' | 'modern' | 'compact' | null) => void;
}

export default function PrintingSettingsTab({
  settings,
  setSettings,
  updateSettings,
  stateInvoices,
  setSetupModalType,
  setPreviewTemplateKey
}: PrintingSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">إعدادات الفواتير والطباعة</h2>
      
      {/* Automatic Sequential Invoice Numbering Config */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">نظام ترقيم الفواتير التسلسلي التلقائي</h3>
              <p className="text-xs text-slate-500">توليد أرقام الفواتير آلياً بدون الحاجة لكتابتها يدوياً منعاً للازدواجية</p>
            </div>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            مفعل تلقائياً
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نمط التسلسل</label>
            <select
              value={settings.invoiceNumberingMode || 'prefix_sequence'}
              onChange={e => setSettings({ ...settings, invoiceNumberingMode: e.target.value as any })}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="prefix_sequence">تسلسلي قياسي (مثال: INV-00001)</option>
              <option value="year_sequence">تسلسلي بالسنة الحالية (مثال: INV-2026-00001)</option>
              <option value="type_prefix">تسلسلي حسب النوع (مبيعات INV-S / مشتريات INV-P)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">بادئة الرقم (Prefix)</label>
            <input
              type="text"
              value={settings.invoiceNumberPrefix ?? 'INV-'}
              onChange={e => setSettings({ ...settings, invoiceNumberPrefix: e.target.value })}
              placeholder="مثال: INV- أو فاتورة-"
              className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
            <span className="text-[10px] text-slate-500">اتركها فارغة لأرقام تسلسلية فقط</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم البداية</label>
              <input
                type="number"
                min="1"
                value={settings.invoiceStartingNumber ?? 1}
                onChange={e => setSettings({ ...settings, invoiceStartingNumber: parseInt(e.target.value) || 1 })}
                className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">خانة الأصفار</label>
              <select
                value={settings.invoiceNumberDigits ?? 5}
                onChange={e => setSettings({ ...settings, invoiceNumberDigits: parseInt(e.target.value) || 5 })}
                className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={3}>3 خانات (001)</option>
                <option value={4}>4 خانات (0001)</option>
                <option value={5}>5 خانات (00001)</option>
                <option value={6}>6 خانات (000001)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview Bar */}
        <div className="bg-white rounded-lg p-3 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600">معاينة الرقم القادم تلقائياً:</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">فاتورة مبيعات:</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                {getNextInvoiceNumber(stateInvoices, { type: 'sales', settings })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500">فاتورة مشتريات:</span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                {getNextInvoiceNumber(stateInvoices, { type: 'purchase', settings })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Invoice Templates Selection & Preview */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Layout className="w-5 h-5 text-blue-600" />
              قسم نماذج الفواتير المتاحة
            </h3>
            <p className="text-xs text-slate-500 font-semibold">اختر النموذج الأنسب لهوية مؤسستك وطريقة الطباعة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Classic Card */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            (settings.invoiceTemplate === 'classic' || settings.invoiceTemplate === 'standard' || !settings.invoiceTemplate)
              ? 'bg-blue-50/40 border-blue-600 shadow-md ring-2 ring-blue-500/20' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                  النموذج الكلاسيكي
                </span>
                {(settings.invoiceTemplate === 'classic' || settings.invoiceTemplate === 'standard' || !settings.invoiceTemplate) && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    المعتمد حالياً ✔️
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-900 text-sm mb-1">كلاسيكي منظم وجداول رسمية</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4">
                تصميم تقليدي فاخر بجدول عالي التباين وتحديدات كحلي داكنة، يظهر كشف الحساب المدمج والتفاصيل المالية بوضوح قياسي للعقود الرسمية.
              </p>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewTemplateKey('classic')}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                معاينة حية
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, invoiceTemplate: 'classic' as const };
                  setSettings(updated);
                  updateSettings(updated);
                  alert('✅ تم اعتماد النموذج الكلاسيكي بنجاح');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                  (settings.invoiceTemplate === 'classic' || settings.invoiceTemplate === 'standard' || !settings.invoiceTemplate)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                اعتماد
              </button>
            </div>
          </div>

          {/* Modern Card */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            settings.invoiceTemplate === 'modern'
              ? 'bg-indigo-50/40 border-indigo-600 shadow-md ring-2 ring-indigo-500/20' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="bg-indigo-950 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                  النموذج العصري
                </span>
                {settings.invoiceTemplate === 'modern' && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    المعتمد حالياً ✔️
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-900 text-sm mb-1">عصري انسيابي وبطاقات جذابة</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4">
                تصميم أنيق بلمسات ألوان متدرجة وبطاقات دائرية مريحة للعين، مثالي للعروض والشركات التي تفضل مظهر جرافيكي فريد.
              </p>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewTemplateKey('modern')}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                معاينة حية
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, invoiceTemplate: 'modern' as const };
                  setSettings(updated);
                  updateSettings(updated);
                  alert('✅ تم اعتماد النموذج العصري بنجاح');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                  settings.invoiceTemplate === 'modern'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                اعتماد
              </button>
            </div>
          </div>

          {/* Compact Card */}
          <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            (settings.invoiceTemplate === 'compact' || settings.invoiceTemplate === 'minimal')
              ? 'bg-emerald-50/40 border-emerald-600 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="bg-slate-800 text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                  النموذج المدمج
                </span>
                {(settings.invoiceTemplate === 'compact' || settings.invoiceTemplate === 'minimal') && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    المعتمد حالياً ✔️
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-900 text-sm mb-1">مدمج مكثف وموفر للورق</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4">
                تصميم مدمج ومكثف يوفر المساحة ويقلل الهدر بالطباعة، مخصص لجمع الأصناف المتعددة بالفاتورة في صفحة واحدة.
              </p>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPreviewTemplateKey('compact')}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                معاينة حية
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...settings, invoiceTemplate: 'compact' as const };
                  setSettings(updated);
                  updateSettings(updated);
                  alert('✅ تم اعتماد النموذج المدمج بنجاح');
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                  (settings.invoiceTemplate === 'compact' || settings.invoiceTemplate === 'minimal')
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
              >
                اعتماد
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">ملاحظات الفواتير (تظهر أسفل الفاتورة)</label>
        <textarea 
          value={settings.invoiceNotes || ''}
          onChange={e => setSettings({...settings, invoiceNotes: e.target.value})}
          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">نوع الطابعة</label>
          <select
            value={settings.printerType || 'a4'}
            onChange={e => setSettings({...settings, printerType: e.target.value as 'a4' | 'thermal'})}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="a4">طابعة عادية (A4)</option>
            <option value="thermal">طابعة حرارية (ريسيت)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">الطابعة المحددة</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              disabled 
              value={settings.printerName || 'الطابعة الافتراضية للنظام'}
              className="w-full p-2 border border-slate-300 bg-slate-50 rounded-lg text-slate-500"
            />
            <button 
              type="button"
              onClick={() => setSetupModalType('printer')}
              className="bg-slate-800 text-white px-4 rounded-lg hover:bg-slate-700 flex items-center gap-2 whitespace-nowrap"
            >
              <Search className="w-4 h-4"/> كشف الطابعات
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-lg">
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-1">
              <input 
                type="checkbox"
                checked={settings.enableScaleIntegration || false}
                onChange={e => setSettings({...settings, enableScaleIntegration: e.target.checked})}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-base font-bold text-slate-800 flex items-center gap-2"><Scale className="w-5 h-5 text-slate-500"/> تفعيل الربط المباشر مع الميزان الإلكتروني</span>
            </label>
            <p className="text-sm text-slate-500 mt-1 pr-7 font-semibold">سحب الوزن التلقائي من الميزان عبر (COM Port) وكتابته بالفاتورة وحساباته.</p>
          </div>
          <button
            type="button"
            onClick={() => setSetupModalType('scale')}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <Scale className="w-4 h-4"/> إعداد الميزان
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
         <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">كثافة الحديد (لحساب الوزن تلقائياً)</label>
            <input 
              type="number" step="0.01"
              value={settings.defaultDensity || 7.85}
              onChange={e => setSettings({...settings, defaultDensity: Number(e.target.value)})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
         </div>
      </div>
    </div>
  );
}
