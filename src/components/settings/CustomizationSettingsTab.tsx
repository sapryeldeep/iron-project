import React from 'react';
import { ArrowUp, ArrowDown, Type, Trash2 } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { AppSettings } from '../../types';

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com

interface CustomizationSettingsTabProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  newAppName: string;
  setNewAppName: (v: string) => void;
  newAppTarget: string;
  setNewAppTarget: (v: string) => void;
  newAppIcon: string;
  setNewAppIcon: (v: string) => void;
  newAppColor: string;
  setNewAppColor: (v: string) => void;
  newAppDesc: string;
  setNewAppDesc: (v: string) => void;
  handleAddCustomApp: () => void;
  handleDeleteCustomApp: (key: string) => void;
  moveApp: (index: number, direction: 'up' | 'down') => void;
  handleNameChange: (key: string, name: string) => void;
  handleIconChange: (key: string, iconName: string) => void;
  resetCustomization: () => void;
  sortedCustomApps: any[];
  currentIcons: Record<string, string>;
  currentNames: Record<string, string>;
  availableIcons: Array<{ value: string; label: string }>;
}

export default function CustomizationSettingsTab({
  newAppName,
  setNewAppName,
  newAppTarget,
  setNewAppTarget,
  newAppIcon,
  setNewAppIcon,
  newAppColor,
  setNewAppColor,
  newAppDesc,
  setNewAppDesc,
  handleAddCustomApp,
  handleDeleteCustomApp,
  moveApp,
  handleNameChange,
  handleIconChange,
  resetCustomization,
  sortedCustomApps,
  currentIcons,
  currentNames,
  availableIcons,
}: CustomizationSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">أداة تخصيص ترتيب التبويبات وأيقونات الموظفين</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            رتّب أزرار القائمة الجانبية والشاشة الرئيسية للموظفين، وغيّر مسميات التبويبات والأيقونات بما يناسب لغة مستودعك الخاص.
          </p>
        </div>
        <button
          type="button"
          onClick={resetCustomization}
          className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          استعادة الافتراضي
        </button>
      </div>

      {/* Form to Add New Custom App */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Lucide.PlusCircle className="w-5 h-5 text-emerald-600 animate-pulse" />
          <h3 className="font-bold text-slate-800 text-sm">إنشاء أيقونة مخصصة جديدة (قسم مخصص أو اختصار سريع)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1">اسم الأيقونة الظاهر</label>
            <input 
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="مثال: مخزن الصاج، حسابات الليزر..."
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1">القسم المستهدف (عند النقر)</label>
            <select
              value={newAppTarget}
              onChange={(e) => setNewAppTarget(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="scale">ميزان البسكول</option>
              <option value="inventory">المخزون</option>
              <option value="clients">العملاء</option>
              <option value="suppliers">الموردين</option>
              <option value="statements">كشوفات الحسابات</option>
              <option value="invoices">الفواتير</option>
              <option value="payments">السندات</option>
              <option value="treasury">الخزنة والسيولة</option>
              <option value="journal">دفتر اليومية</option>
              <option value="sales_reports">المبيعات والتقارير</option>
              <option value="expenses">المصروفات</option>
              <option value="fleet">السيارات</option>
              <option value="users">المستخدمين والصلاحيات</option>
              <option value="settings">الإعدادات</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1">شكل الأيقونة</label>
            <select
              value={newAppIcon}
              onChange={(e) => setNewAppIcon(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {availableIcons.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1">لون الأيقونة والخلفية</label>
            <select
              value={newAppColor}
              onChange={(e) => setNewAppColor(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="bg-sky-600">أزرق سماوي (Sky Blue)</option>
              <option value="bg-emerald-500">أخضر زمردي (Emerald Green)</option>
              <option value="bg-blue-500">أزرق ملكي (Royal Blue)</option>
              <option value="bg-indigo-500">بنفسجي غامق (Indigo)</option>
              <option value="bg-purple-500">بنفسجي فاتح (Purple)</option>
              <option value="bg-teal-500">تركواز (Teal)</option>
              <option value="bg-rose-600">أحمر وردي (Rose)</option>
              <option value="bg-pink-500">وردي (Pink)</option>
              <option value="bg-amber-500">برتقالي ذهبي (Amber)</option>
              <option value="bg-slate-700">رمادي داكن (Slate)</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-black text-slate-600 mb-1">وصف مختصر للزر</label>
            <input 
              type="text"
              value={newAppDesc}
              onChange={(e) => setNewAppDesc(e.target.value)}
              placeholder="شرح مبسط يظهر عند تمرير الفأرة..."
              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddCustomApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02]"
            >
              <Lucide.Plus className="w-4 h-4" />
              إضافة الأيقونة المخصصة ✓
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-slate-50 border border-slate-200/60 rounded-xl p-4">
        <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 border-b border-slate-200/80 pb-2">
          <div className="col-span-1 text-center">الترتيب</div>
          <div className="col-span-1 text-center">الأيقونة</div>
          <div className="col-span-3">الاسم الافتراضي للنظام</div>
          <div className="col-span-4">الاسم المخصص الظاهر</div>
          <div className="col-span-3">تخصيص شكل الأيقونة</div>
        </div>

        {sortedCustomApps.map((app: any, idx) => {
          const customIconName = currentIcons[app.key] || app.defaultIcon;
          const IconComponent = (Lucide as any)[customIconName] || Lucide.HelpCircle;
          const customName = currentNames[app.key] || '';

          return (
            <div 
              key={app.key}
              className="grid grid-cols-12 gap-3 items-center bg-white border border-slate-200/80 p-3 rounded-xl shadow-sm hover:border-slate-300 transition-colors"
            >
              {/* Ordering buttons */}
              <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveApp(idx, 'up')}
                  className={`p-1 rounded hover:bg-slate-100 ${idx === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700'}`}
                  title="تحريك لأعلى"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === sortedCustomApps.length - 1}
                  onClick={() => moveApp(idx, 'down')}
                  className={`p-1 rounded hover:bg-slate-100 ${idx === sortedCustomApps.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700'}`}
                  title="تحريك لأسفل"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              {/* Live Icon Visualizer */}
              <div className="col-span-1 flex justify-center">
                <div className={`w-10 h-10 rounded-lg ${app.color} text-white flex items-center justify-center shadow-sm`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              {/* Default key / name */}
              <div className="col-span-3 flex flex-col justify-center">
                <span className="font-bold text-sm text-slate-800">{app.defaultLabel}</span>
                <span className="text-[10px] text-slate-400 font-mono font-semibold flex items-center gap-1">
                  ({app.key})
                  {app.isCustom && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] px-1 rounded">مخصص</span>}
                </span>
              </div>

              {/* Custom Name text input */}
              <div className="col-span-4">
                <div className="relative">
                  <Type className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customName}
                    placeholder={app.defaultLabel}
                    onChange={(e) => handleNameChange(app.key, e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Dynamic Lucide Icon Dropdown */}
              <div className="col-span-3 flex items-center gap-2">
                <select
                  value={customIconName}
                  onChange={(e) => handleIconChange(app.key, e.target.value)}
                  className="flex-1 p-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold bg-slate-50 cursor-pointer"
                >
                  {availableIcons.map(iconOpt => (
                    <option key={iconOpt.value} value={iconOpt.value}>
                      {iconOpt.label}
                    </option>
                  ))}
                </select>
                {app.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomApp(app.key)}
                    className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shrink-0"
                    title="حذف الأيقونة المخصصة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
