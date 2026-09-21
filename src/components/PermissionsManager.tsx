import React, { useState, useEffect } from 'react';
import { useAppStore, ALL_APP_VIEWS } from '../store';
import { User, UserPermissions } from '../types';
import { 
  Shield, 
  Printer, 
  Trash2, 
  Tag, 
  TrendingUp, 
  Download, 
  Edit3, 
  PackageSearch, 
  Settings, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  RotateCcw, 
  Users, 
  ArrowDownToLine, 
  Receipt, 
  Wallet, 
  Truck, 
  FileText,
  UserCheck,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  BookOpen,
  Scale,
  Flame,
  Factory,
  FileSpreadsheet
} from 'lucide-react';

interface PermissionsManagerProps {
  selectedUserId?: string | null;
  onClose?: () => void;
  onUserSelect?: (userId: string) => void;
}

// System sections metadata with icons and contextual styling
export const APP_SECTIONS = [
  {
    id: 'scale',
    name: 'ميزان البسكول',
    desc: 'قراءة الأوزان، تسجيل وحفظ وطباعة بونات الشاحنات',
    icon: Scale,
    color: 'text-sky-600 bg-sky-50 border-sky-200'
  },
  {
    id: 'invoices',
    name: 'الفواتير',
    desc: 'إنشاء ومتابعة فواتير المبيعات والمشتريات والمرتجعات',
    icon: FileText,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  {
    id: 'inventory',
    name: 'المخزون والجرد',
    desc: 'إدارة الأصناف، حاسبة الصاج، ومتابعة رصيد المخزن',
    icon: PackageSearch,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    id: 'clients',
    name: 'العملاء',
    desc: 'سجلات العملاء، المديونيات وكشوف الحساب',
    icon: Users,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  {
    id: 'suppliers',
    name: 'الموردين',
    desc: 'حسابات الموردين، أوامر الشراء والمستحقات',
    icon: ArrowDownToLine,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  {
    id: 'statements',
    name: 'كشوفات الحسابات',
    desc: 'كشف حساب كلي وتفصيلي لكل عميل ومورد بالطباعة والتصدير',
    icon: FileSpreadsheet,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
  },
  {
    id: 'treasury',
    name: 'الخزينة والحسابات النقدية',
    desc: 'أرصدة الخزينة، الحسابات البنكية، المحافظ الإلكترونية وإنستا باي',
    icon: Wallet,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'payments',
    name: 'السندات والتحصيل',
    desc: 'سندات القبض والسندات المالية للموردين والعملاء',
    icon: Receipt,
    color: 'text-teal-600 bg-teal-50 border-teal-200'
  },
  {
    id: 'journal',
    name: 'دفتر اليومية والقيود',
    desc: 'القيود المزدوجة الآلية، ميزان المراجعة، وقائمة الدخل',
    icon: BookOpen,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200'
  },
  {
    id: 'sales_reports',
    name: 'المبيعات والتقارير',
    desc: 'المؤشرات المالية، الأرباح، وتحليلات المبيعات',
    icon: TrendingUp,
    color: 'text-rose-600 bg-rose-50 border-rose-200'
  },
  {
    id: 'expenses',
    name: 'المصروفات العامة',
    desc: 'مصروفات التشغيل، العهد، ونثريات العمل',
    icon: Wallet,
    color: 'text-pink-600 bg-pink-50 border-pink-200'
  },
  {
    id: 'fleet',
    name: 'أسطول السيارات والنقل',
    desc: 'حركة السائقين، المشاوير ومصروفات الشاحنات',
    icon: Truck,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'users',
    name: 'المستخدمين والصلاحيات',
    desc: 'إدارة أفراد الفريق وأدوار النظام وتغيير كلمات المرور',
    icon: Shield,
    color: 'text-slate-700 bg-slate-100 border-slate-300'
  },
  {
    id: 'settings',
    name: 'الإعدادات العامة',
    desc: 'بيانات المنشأة، خيارات الطباعة، والنسخ الاحتياطي',
    icon: Settings,
    color: 'text-slate-600 bg-slate-100 border-slate-300'
  },
  {
    id: 'audit',
    name: 'الرقابة والتدقيق (Audit Log)',
    desc: 'سجل تتبع عمليات الحذف والتعديل والتسجيل للحماية',
    icon: Shield,
    color: 'text-rose-700 bg-rose-50 border-rose-200'
  }
];

export default function PermissionsManager({ selectedUserId, onClose, onUserSelect }: PermissionsManagerProps) {
  const { state, updateUser, switchUser, logActivity } = useAppStore();
  
  // Select first non-admin or first user if none passed
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    if (selectedUserId && state.users.some(u => u.id === selectedUserId)) {
      return selectedUserId;
    }
    const nonAdmin = state.users.find(u => u.role !== 'admin');
    return nonAdmin ? nonAdmin.id : (state.users[0]?.id || '');
  });

  const [permissions, setPermissions] = useState<UserPermissions>({
    canPrint: true,
    canDownload: true,
    canDelete: false,
    canDeleteInvoices: false,
    canEditInvoices: false,
    canEditPrices: false,
    canViewProfits: false,
    canManageInventory: false,
    canAccessSettings: false,
    allowedViews: ['invoices', 'clients', 'payments']
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const activeUser = state.users.find(u => u.id === activeUserId);

  useEffect(() => {
    if (selectedUserId && state.users.some(u => u.id === selectedUserId)) {
      setActiveUserId(selectedUserId);
    }
  }, [selectedUserId, state.users]);

  useEffect(() => {
    const user = state.users.find(u => u.id === activeUserId);
    if (user) {
      setPermissions({
        canPrint: user.permissions.canPrint ?? true,
        canDownload: user.permissions.canDownload ?? false,
        canDelete: user.permissions.canDelete ?? false,
        canDeleteInvoices: user.permissions.canDeleteInvoices ?? false,
        canEditInvoices: user.permissions.canEditInvoices ?? false,
        canEditPrices: user.permissions.canEditPrices ?? false,
        canViewProfits: user.permissions.canViewProfits ?? false,
        canManageInventory: user.permissions.canManageInventory ?? false,
        canAccessSettings: user.permissions.canAccessSettings ?? false,
        allowedViews: Array.isArray(user.permissions.allowedViews) 
          ? [...user.permissions.allowedViews] 
          : (user.role === 'admin' ? [...ALL_APP_VIEWS] : ['invoices', 'clients', 'payments'])
      });
      setSaveSuccess(false);
    }
  }, [activeUserId, state.users]);

  const handleTogglePermission = (key: keyof Omit<UserPermissions, 'allowedViews'>) => {
    setPermissions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Keep delete in sync if modifying canDelete
      if (key === 'canDelete') {
        next.canDeleteInvoices = next.canDelete;
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleToggleView = (viewId: string) => {
    setPermissions(prev => {
      const current = prev.allowedViews || [];
      const exists = current.includes(viewId);
      const nextViews = exists 
        ? current.filter(v => v !== viewId)
        : [...current, viewId];
      return { ...prev, allowedViews: nextViews };
    });
    setSaveSuccess(false);
  };

  const handleSelectAllViews = (enable: boolean) => {
    setPermissions(prev => ({
      ...prev,
      allowedViews: enable ? [...ALL_APP_VIEWS] : []
    }));
    setSaveSuccess(false);
  };

  // Role presets application
  const applyPreset = (roleType: 'cashier' | 'accountant' | 'storekeeper' | 'manager' | 'admin') => {
    switch (roleType) {
      case 'cashier':
        setPermissions({
          canPrint: true,
          canDownload: false,
          canDelete: false,
          canDeleteInvoices: false,
          canEditInvoices: false,
          canEditPrices: false, // Strict: cannot change prices
          canViewProfits: false, // Strict: cannot view profit reports
          canManageInventory: false,
          canAccessSettings: false,
          allowedViews: ['invoices', 'clients', 'payments']
        });
        break;
      case 'accountant':
        setPermissions({
          canPrint: true,
          canDownload: true,
          canDelete: false,
          canDeleteInvoices: false,
          canEditInvoices: true,
          canEditPrices: false,
          canViewProfits: true, // Can audit profit reports
          canManageInventory: false,
          canAccessSettings: false,
          allowedViews: ['invoices', 'clients', 'suppliers', 'payments', 'sales_reports', 'expenses']
        });
        break;
      case 'storekeeper':
        setPermissions({
          canPrint: true,
          canDownload: true,
          canDelete: false,
          canDeleteInvoices: false,
          canEditInvoices: false,
          canEditPrices: false,
          canViewProfits: false, // Cannot see cost margins
          canManageInventory: true,
          canAccessSettings: false,
          allowedViews: ['inventory', 'fleet', 'suppliers']
        });
        break;
      case 'manager':
        setPermissions({
          canPrint: true,
          canDownload: true,
          canDelete: false, // Deleting requires superadmin
          canDeleteInvoices: false,
          canEditInvoices: true,
          canEditPrices: true,
          canViewProfits: true,
          canManageInventory: true,
          canAccessSettings: false,
          allowedViews: ['inventory', 'clients', 'suppliers', 'invoices', 'payments', 'sales_reports', 'expenses', 'fleet']
        });
        break;
      case 'admin':
        setPermissions({
          canPrint: true,
          canDownload: true,
          canDelete: true,
          canDeleteInvoices: true,
          canEditInvoices: true,
          canEditPrices: true,
          canViewProfits: true,
          canManageInventory: true,
          canAccessSettings: true,
          allowedViews: [...ALL_APP_VIEWS]
        });
        break;
    }
    setSaveSuccess(false);
  };

  const handleSave = () => {
    if (!activeUser) return;
    
    updateUser(activeUser.id, {
      permissions: {
        ...permissions
      }
    });

    logActivity(
      'تحديث صلاحيات المستخدم', 
      `تم تحديث صلاحيات وأقسام المستخدم: ${activeUser.username} (${activeUser.role})`
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleSwitchToThisUser = () => {
    if (!activeUser) return;
    switchUser(activeUser.id);
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير النظام الكامل',
    manager: 'مدير فرع / مشرف',
    accountant: 'محاسب مالي',
    storekeeper: 'أمين مخزن',
    cashier: 'كاشير / موظف مبيعات'
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all">
      {/* Header */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md text-blue-400 border border-white/10 shadow-inner">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              لوحة التحكم المتقدمة في الصلاحيات والأقسام (Permissions Manager)
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              التحكم الصارم في إخفاء الأقسام والأيقونات، ومنع أو السماح بالطباعة، الحذف، تعديل الأسعار، وتقارير الأرباح
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="self-end md:self-auto p-2 bg-white/10 hover:bg-white/20 rounded-full text-slate-200 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-8">
        {/* User Selection Strip */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                اختر المستخدم لتخصيص صلاحياته:
              </label>
              <div className="flex flex-wrap gap-2">
                {state.users.map((u) => {
                  const isSelected = u.id === activeUserId;
                  const isCurrent = u.id === state.currentUser?.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setActiveUserId(u.id);
                        onUserSelect?.(u.id);
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span>{u.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {roleLabels[u.role] || u.role}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-1.5 py-0.2 rounded">
                          أنت الآن
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Impersonate / Test Button */}
            {activeUser && (
              <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                <button
                  type="button"
                  onClick={handleSwitchToThisUser}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
                  title="قم بتبديل الحساب النشط فوراً لتجربة ومعاينة مظهر الشاشة والأيقونات الظاهرة لهذا المستخدم"
                >
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  معاينة وتجربة هذا الحساب فوراً
                </button>
              </div>
            )}
          </div>

          {activeUser?.role === 'admin' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>تنبيه:</strong> هذا المستخدم هو "مدير النظام" ولديه صلاحيات مطلقة افتراضياً، ولكن يمكنك أيضاً تقييد بعض الأقسام أو العمليات له إذا دعت الحاجة.
              </span>
            </div>
          )}
        </div>

        {/* Presets Bar */}
        <div className="border border-slate-200 rounded-2xl p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                قوالب الصلاحيات الجاهزة (نقرة واحدة لضبط كل الأذونات والأقسام):
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">اختر نموذجاً ليتم ملء الصلاحيات تلقائياً</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('cashier')}
              className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-right transition-all group"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-blue-600">🏷️ كاشير / بائع</div>
              <p className="text-[11px] text-slate-500 mt-1">حجب الأرباح والأسعار والحذف</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('accountant')}
              className="p-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-right transition-all group"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-600">🧮 محاسب مالي</div>
              <p className="text-[11px] text-slate-500 mt-1">اطلاع على الأرباح مع حجب الحذف</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('storekeeper')}
              className="p-2.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-right transition-all group"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-amber-600">📦 أمين مخزن</div>
              <p className="text-[11px] text-slate-500 mt-1">المخزون فقط وحجب الأسعار</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('manager')}
              className="p-2.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-right transition-all group"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-purple-600">👔 مدير فرع</div>
              <p className="text-[11px] text-slate-500 mt-1">عمليات وأرباح مع حماية الإعدادات</p>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('admin')}
              className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-xl text-right transition-all group"
            >
              <div className="font-bold text-xs text-slate-800 group-hover:text-slate-900">👑 مدير كامل</div>
              <p className="text-[11px] text-slate-500 mt-1">فتح كافة الصلاحيات والأقسام</p>
            </button>
          </div>
        </div>

        {/* Section 1: Granular Operations (التحكم الدقيق في العمليات الحساسة) */}
        <div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 border-b border-slate-200 pb-2 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-600" />
                التحكم الدقيق في العمليات المحاسبية والتحكم بإخفاء الأزرار الحساسة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد دقيق لما يمكن للموظف القيام به. إلغاء تفعيل أي خيار سيقوم بإخفاء الأزرار والأقسام تلقائياً من شاشته فوراً (مثل حجب أزرار الحذف وتقارير الأرباح).
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1 text-[10px] text-rose-700 font-bold self-start lg:self-auto shrink-0">
              ⚡ الميزة مفعلة: إلغاء التفعيل يخفي الأزرار المعنية فوراً
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Print Permission */}
            <div 
              onClick={() => handleTogglePermission('canPrint')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canPrint 
                  ? 'bg-emerald-50/70 border-emerald-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canPrint ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">الطباعة (Print)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">فواتير، سندات، وكشوف حساب</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canPrint ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canPrint ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canPrint ? 'text-emerald-700' : 'text-slate-500'}>
                  {permissions.canPrint ? 'مسموح بالطباعة' : 'ممنوع من الطباعة'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 2. Delete Permission */}
            <div 
              onClick={() => handleTogglePermission('canDelete')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canDelete 
                  ? 'bg-rose-50/70 border-rose-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canDelete ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">حذف البيانات (Delete)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">حذف فواتير، أصناف، أو عملاء</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canDelete ? 'bg-rose-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canDelete ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canDelete ? 'text-rose-700 font-bold' : 'text-slate-500'}>
                  {permissions.canDelete ? 'مسموح بالحذف' : 'محظور من الحذف (آمن)'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 3. Edit Prices Permission */}
            <div 
              onClick={() => handleTogglePermission('canEditPrices')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canEditPrices 
                  ? 'bg-blue-50/70 border-blue-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canEditPrices ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">تعديل الأسعار (Prices)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">تغيير السعر المسجل أثناء البيع</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canEditPrices ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canEditPrices ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canEditPrices ? 'text-blue-700 font-bold' : 'text-slate-500'}>
                  {permissions.canEditPrices ? 'السماح بتعديل السعر' : 'إلزام بالأسعار المسجلة'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 4. View Profits Permission */}
            <div 
              onClick={() => handleTogglePermission('canViewProfits')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canViewProfits 
                  ? 'bg-purple-50/70 border-purple-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canViewProfits ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">تقارير الأرباح (Profits)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">كشف هوامش الربح وأسعار الشراء</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canViewProfits ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canViewProfits ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canViewProfits ? 'text-purple-700 font-bold' : 'text-slate-500'}>
                  {permissions.canViewProfits ? 'مسموح برؤية الأرباح' : 'أرقام الأرباح محجوبة'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 5. Download Excel / PDF */}
            <div 
              onClick={() => handleTogglePermission('canDownload')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canDownload 
                  ? 'bg-cyan-50/70 border-cyan-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canDownload ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">تحميل وتصدير التقارير (PDF)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">تصدير الفواتير وكشوفات الحسابات PDF</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canDownload ? 'bg-cyan-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canDownload ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canDownload ? 'text-cyan-700 font-bold' : 'text-slate-500'}>
                  {permissions.canDownload ? 'مسموح بالتصدير' : 'حظر تصدير الملفات'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 6. Edit Saved Invoices */}
            <div 
              onClick={() => handleTogglePermission('canEditInvoices')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canEditInvoices 
                  ? 'bg-amber-50/70 border-amber-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canEditInvoices ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">تعديل الفواتير المحفوظة</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">تعديل الفاتورة بعد اعتمادها</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canEditInvoices ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canEditInvoices ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canEditInvoices ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                  {permissions.canEditInvoices ? 'مسموح بالتعديل' : 'الفاتورة مقفلة ومحمية'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 7. Manage Inventory */}
            <div 
              onClick={() => handleTogglePermission('canManageInventory')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canManageInventory 
                  ? 'bg-teal-50/70 border-teal-300 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canManageInventory ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <PackageSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">إدارة المخزون والتسويات</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">إضافة أصناف، تعديل كميات وجرد</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canManageInventory ? 'bg-teal-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canManageInventory ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canManageInventory ? 'text-teal-700 font-bold' : 'text-slate-500'}>
                  {permissions.canManageInventory ? 'إدارة كاملة للمخزون' : 'عرض المخزون فقط'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>

            {/* 8. Access Settings */}
            <div 
              onClick={() => handleTogglePermission('canAccessSettings')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                permissions.canAccessSettings 
                  ? 'bg-slate-100 border-slate-400 shadow-sm' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${permissions.canAccessSettings ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">إعدادات المنشأة والنظام</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">إعدادات الطباعة، السيرفر والنسخ</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${permissions.canAccessSettings ? 'bg-slate-800 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {permissions.canAccessSettings ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className={permissions.canAccessSettings ? 'text-slate-900 font-bold' : 'text-slate-500'}>
                  {permissions.canAccessSettings ? 'الوصول متاح' : 'محجوب عن الإعدادات'}
                </span>
                <span className="text-[10px] text-slate-400">انقر للتبديل</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sections & Icons Visibility Control (إظهار وإخفاء الأقسام والأيقونات) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-200 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                التحكم في ظهور أو إخفاء الأقسام والأيقونات في القوائم والشاشات
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                أي قسم أو أيقونة يتم إيقافها هنا، ستختفي تماماً من الشاشة الرئيسية، شريط البحث، والوصول المباشر لهذا المستخدم
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleSelectAllViews(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                إظهار كافة الأقسام
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllViews(false)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors"
              >
                إخفاء الكل
              </button>
            </div>
          </div>

          {(!permissions.allowedViews || permissions.allowedViews.length === 0) && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>تحذير: تم إخفاء جميع الأقسام! المستخدم لن يرى أي أيقونة في شاشته الرئيسية عند تسجيل دخوله.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {APP_SECTIONS.map((sec) => {
              const isVisible = (permissions.allowedViews || []).includes(sec.id);
              const SecIcon = sec.icon;

              return (
                <div
                  key={sec.id}
                  onClick={() => handleToggleView(sec.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all select-none flex flex-col justify-between ${
                    isVisible
                      ? 'bg-white border-slate-300 shadow-sm hover:border-blue-400 ring-1 ring-slate-100'
                      : 'bg-slate-100/70 border-slate-200/80 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-xl border ${sec.color} flex items-center justify-center`}>
                        <SecIcon className="w-5 h-5" />
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        isVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {isVisible ? 'ظاهر' : 'مخفي'}
                      </div>
                    </div>
                    <h4 className={`font-bold text-sm mb-1 ${isVisible ? 'text-slate-800' : 'text-slate-500'}`}>
                      {sec.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {sec.desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-400">
                      حالة الأيقونة:
                    </span>
                    <span className={`font-bold ${isVisible ? 'text-blue-600' : 'text-slate-400'}`}>
                      {isVisible ? 'تظهر بالقائمة' : 'مخفية تماماً'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in duration-300">
                <Check className="w-5 h-5 text-emerald-600" />
                تم حفظ وتطبيق الصلاحيات وظهور الأقسام بنجاح!
              </div>
            )}
            {!saveSuccess && (
              <p className="text-xs text-slate-500">
                التعديلات تُطبق فوراً على حساب <strong>{activeUser?.username}</strong> وتنعكس على شاشاته في التو واللحظة.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              حفظ وتطبيق الصلاحيات
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
