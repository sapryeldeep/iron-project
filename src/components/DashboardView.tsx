import { useAppStore } from '../store';
import { formatCurrency } from '../utils/accountingUtils';
import { AlertCircle, PackageSearch, TrendingUp, Shield } from 'lucide-react';
import * as Lucide from 'lucide-react';

export default function DashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { state } = useAppStore();

  const allowedViews = state.currentUser?.permissions?.allowedViews;
  const isAdmin = state.currentUser?.role === 'admin';

  // Base configurations for all available apps/tabs in the system
  const defaultApps = [
    { defaultName: 'ميزان البسكول', view: 'scale', defaultIconName: 'Scale', color: 'bg-sky-600', desc: 'قراءة الوزن وطباعة بونات السيارات', permission: null },
    { defaultName: 'المخزون', view: 'inventory', defaultIconName: 'PackageSearch', color: 'bg-emerald-500', desc: 'إدارة وجرد الأصناف', permission: 'canManageInventory' },
    { defaultName: 'العملاء', view: 'clients', defaultIconName: 'Users', color: 'bg-blue-500', desc: 'حسابات ومديونيات العملاء', permission: null },
    { defaultName: 'الموردين', view: 'suppliers', defaultIconName: 'ArrowDownToLine', color: 'bg-indigo-500', desc: 'حسابات ومستحقات الموردين', permission: null },
    { defaultName: 'كشوفات الحسابات', view: 'statements', defaultIconName: 'FileSpreadsheet', color: 'bg-indigo-600', desc: 'كشف حساب منفصل لكل عميل ومورد', permission: null },
    { defaultName: 'الفواتير', view: 'invoices', defaultIconName: 'FileText', color: 'bg-purple-500', desc: 'إنشاء ومتابعة الفواتير', permission: null },
    { defaultName: 'الخزنة والسيولة', view: 'treasury', defaultIconName: 'Landmark', color: 'bg-emerald-600', desc: 'جرد السيولة (كاش، بنك، محفظة، إنستاباي) وسجل الحركات', permission: null },
    { defaultName: 'السندات', view: 'payments', defaultIconName: 'Receipt', color: 'bg-teal-500', desc: 'سندات القبض والصرف', permission: null },
    { defaultName: 'دفتر اليومية', view: 'journal', defaultIconName: 'BookOpen', color: 'bg-cyan-600', desc: 'القيود المزدوجة وميزان المراجعة', permission: null },
    { defaultName: 'التقارير الشاملة', view: 'sales_reports', defaultIconName: 'BarChart3', color: 'bg-rose-600', desc: 'تقارير مفصلة للمبيعات والمشتريات والمصروفات والأرباح', permission: null },
    { defaultName: 'المصروفات', view: 'expenses', defaultIconName: 'Wallet', color: 'bg-pink-500', desc: 'إدارة مصروفات التشغيل والخزينة', permission: null },
    { defaultName: 'السيارات', view: 'fleet', defaultIconName: 'Truck', color: 'bg-amber-500', desc: 'حركة السيارات والمصروفات', permission: null },
    { defaultName: 'المستخدمين', view: 'users', defaultIconName: 'Shield', color: 'bg-slate-700', desc: 'الصلاحيات والمستخدمين', permission: 'isAdmin' },
    { defaultName: 'الإعدادات', view: 'settings', defaultIconName: 'Settings', color: 'bg-slate-400', desc: 'إعدادات الشركة والنظام', permission: 'canAccessSettings' },
  ];

  // 1. Incorporate custom created apps from settings
  const customCreated = state.settings?.customCreatedApps || [];
  const mappedCustom = customCreated.map(app => ({
    defaultName: app.label,
    view: app.targetView,
    defaultIconName: app.icon,
    color: app.color,
    desc: app.desc || `اختصار مخصص لـ ${app.label}`,
    permission: null,
    isCustomApp: true,
    customKey: app.key,
  }));

  const allApps = [...defaultApps, ...mappedCustom];

  // 2. Sort based on customTabOrder if configured with robust merging of newly added apps
  const defaultTabOrder = allApps.map((a: any) => a.customKey || a.view);
  const rawTabOrder = state.settings?.customTabOrder && state.settings.customTabOrder.length > 0 ? state.settings.customTabOrder : defaultTabOrder;
  const tabOrder = [...rawTabOrder];
  allApps.forEach((app: any) => {
    const key = app.customKey || app.view;
    if (!tabOrder.includes(key)) {
      tabOrder.push(key);
    }
  });

  const sortedApps = [...allApps].sort((a: any, b: any) => {
    const keyA = a.customKey || a.view;
    const keyB = b.customKey || b.view;
    const idxA = tabOrder.indexOf(keyA);
    const idxB = tabOrder.indexOf(keyB);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  // 3. Map & Filter allowed views/permissions
  const apps = sortedApps.map((app: any) => {
    // Resolve name
    const key = app.customKey || app.view;
    const customName = state.settings?.customTabNames?.[key];
    const name = customName && customName.trim() ? customName : app.defaultName;

    // Resolve icon component dynamically from Lucide using settings string
    const customIconName = state.settings?.customTabIcons?.[key] || app.defaultIconName;
    const IconComponent = (Lucide as any)[customIconName] || (Lucide as any)[app.defaultIconName] || Lucide.HelpCircle;

    return {
      ...app,
      name,
      IconComponent,
      key,
    };
  }).filter((app: any) => {
    if (!state.currentUser) return false;
    
    // Check if section/icon visibility is enabled in user permissions
    if (allowedViews && Array.isArray(allowedViews)) {
      if (!allowedViews.includes(app.view)) {
        return false;
      }
    }

    if (isAdmin) return true;
    if (app.permission === 'isAdmin') return false;
    if (app.permission) {
      return !!(state.currentUser.permissions as any)[app.permission];
    }
    return true;
  });

  const lowStockItems = state.inventory.filter(i => i.quantity <= i.minQuantity);
  const dueClients = state.clients.filter(c => c.balance > 0);
  const dueSuppliers = state.suppliers.filter(s => s.balance < 0);

  // Financial pulse (Current month)
  const currentMonthStats = (() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const sales = state.invoices.filter(inv => 
      inv.type === 'sales' && new Date(inv.createdAt) >= startOfMonth
    ).reduce((sum, inv) => sum + inv.total, 0);
    
    const expenses = state.expenses.filter(exp => 
      new Date(exp.date) >= startOfMonth
    ).reduce((sum, exp) => sum + exp.amount, 0);
    
    return { sales, expenses, profit: sales - expenses };
  })();

  return (
    <div className="space-y-8 pb-12">
      {/* App Grid */}
      {apps.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {apps.map((app) => (
            <button
              key={app.key}
              onClick={() => onNavigate?.(app.view)}
              className="group flex flex-col items-center justify-center p-6 bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 transform hover:-translate-y-1 text-right w-full"
            >
              <div className={`w-16 h-16 rounded-2xl ${app.color} text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <app.IconComponent className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 text-center w-full truncate">{app.name}</h3>
              <p className="text-xs text-slate-500 text-center w-full line-clamp-2">{app.desc}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">لا توجد أقسام مفعلة لحسابك حالياً</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            قام مدير النظام بإخفاء كافة الأقسام عن هذا الحساب. يرجى مراجعة المسؤول لتفعيل الصلاحيات والأقسام المطلوبة من شاشة "إدارة المستخدمين والصلاحيات".
          </p>
        </div>
      )}

      {/* Alerts Section */}
      {(lowStockItems.length > 0 || dueClients.length > 0 || dueSuppliers.length > 0) && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-800 mb-4 px-2 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-rose-500" />
            تنبيهات النظام
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lowStockItems.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-orange-800">
                  <PackageSearch className="w-6 h-6" />
                  <h3 className="font-bold text-lg">أصناف قاربت على النفاذ</h3>
                </div>
                <ul className="text-sm space-y-2 text-orange-700 font-semibold">
                  {lowStockItems.slice(0, 3).map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.name}</span>
                      <span>({item.quantity} {item.unit})</span>
                    </li>
                  ))}
                  {lowStockItems.length > 3 && <li className="pt-2 text-center text-orange-600">و {lowStockItems.length - 3} صنف آخر...</li>}
                </ul>
              </div>
            )}
            
            {dueClients.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-emerald-800">
                  <TrendingUp className="w-6 h-6" />
                  <h3 className="font-bold text-lg">دفعات مستحقة (العملاء)</h3>
                </div>
                <ul className="text-sm space-y-2 text-emerald-700 font-semibold">
                  {dueClients.slice(0, 3).map(c => (
                    <li key={c.id} className="flex justify-between">
                      <span className="truncate max-w-[60%]">{c.name}</span>
                      <span>{formatCurrency(c.balance)}</span>
                    </li>
                  ))}
                  {dueClients.length > 3 && <li className="pt-2 text-center text-emerald-600">و {dueClients.length - 3} عميل آخر...</li>}
                </ul>
              </div>
            )}

            {dueSuppliers.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-rose-800">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="font-bold text-lg">دفعات مستحقة (الموردين)</h3>
                </div>
                <ul className="text-sm space-y-2 text-rose-700 font-semibold">
                  {dueSuppliers.slice(0, 3).map(s => (
                    <li key={s.id} className="flex justify-between">
                      <span className="truncate max-w-[60%]">{s.name}</span>
                      <span>{formatCurrency(Math.abs(s.balance))}</span>
                    </li>
                  ))}
                  {dueSuppliers.length > 3 && <li className="pt-2 text-center text-rose-600">و {dueSuppliers.length - 3} مورد آخر...</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
