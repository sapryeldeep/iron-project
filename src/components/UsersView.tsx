import React, { useState } from 'react';
import { useAppStore, ALL_APP_VIEWS } from '../store';
import { User, UserPermissions } from '../types';
import { Users, Plus, Shield, Check, X, History, Sliders, Lock, AlertCircle, Eye, Trash2, Key } from 'lucide-react';
import PermissionsManager from './PermissionsManager';
import ChangePasswordModal from './ChangePasswordModal';
import ConfirmModal from './ConfirmModal';

export default function UsersView() {
  const { state, addUser, updateUser, deleteUser, logActivity } = useAppStore();
  const [activeTab, setActiveTab] = useState<'permissions' | 'users' | 'logs'>('permissions');
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [userToChangePass, setUserToChangePass] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const user = state.currentUser;
  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin || (user?.permissions?.canDelete ?? false);
  
  const defaultPermissions: UserPermissions = {
    canPrint: true,
    canDownload: false,
    canDelete: false,
    canDeleteInvoices: false,
    canEditInvoices: false,
    canEditPrices: false,
    canViewProfits: false,
    canManageInventory: false,
    canAccessSettings: false,
    allowedViews: ['invoices', 'clients', 'payments']
  };

  const [newUser, setNewUser] = useState<Partial<User>>({
    username: '',
    password: '',
    role: 'cashier',
    isActive: true,
    permissions: { ...defaultPermissions }
  });

  const handleAdd = () => {
    if (!newUser.username?.trim()) return alert('الرجاء إدخال اسم المستخدم');
    
    // Auto-setup permissions based on role if default
    let finalPermissions = { ...defaultPermissions, ...(newUser.permissions || {}) };
    if (newUser.role === 'admin') {
      finalPermissions = {
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
      };
    } else if (newUser.role === 'accountant') {
      finalPermissions.canViewProfits = true;
      finalPermissions.canDownload = true;
      finalPermissions.allowedViews = ['invoices', 'clients', 'suppliers', 'payments', 'sales_reports', 'expenses'];
    } else if (newUser.role === 'storekeeper') {
      finalPermissions.canManageInventory = true;
      finalPermissions.allowedViews = ['inventory', 'fleet', 'suppliers'];
    }

    addUser({
      username: newUser.username.trim(),
      password: newUser.password?.trim() || '123456',
      role: newUser.role || 'cashier',
      isActive: true,
      permissions: finalPermissions
    });

    logActivity('إضافة مستخدم جديد', `تم إنشاء مستخدم جديد: ${newUser.username} برتبة ${newUser.role}`);
    setIsAdding(false);
    setNewUser({ username: '', password: '', role: 'cashier', isActive: true, permissions: { ...defaultPermissions } });
    setActiveTab('permissions');
  };

  const toggleStatus = (user: User) => {
    updateUser(user.id, { isActive: !user.isActive });
    logActivity('تعديل حالة مستخدم', `تم ${user.isActive ? 'إيقاف' : 'تفعيل'} حساب المستخدم: ${user.username}`);
  };

  const handlePermissionChange = (key: keyof Omit<UserPermissions, 'allowedViews'>, value: boolean) => {
    setNewUser(prev => ({
      ...prev,
      permissions: {
        ...(prev.permissions as UserPermissions),
        [key]: value
      }
    }));
  };

  const roleNames = {
    admin: 'مدير النظام الكامل',
    manager: 'مدير فرع / مشرف',
    accountant: 'محاسب مالي',
    storekeeper: 'أمين مخزن',
    cashier: 'كاشير / موظف مبيعات'
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            مركز إدارة المستخدمين والصلاحيات
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            التحكم الشامل في أذونات الموظفين، إخفاء وظهور الأقسام، وحماية النظام بكلمات مرور سرية
          </p>
        </div>

        <div className="flex items-center gap-2">
          {state.currentUser?.role === 'admin' && (
            <button
              onClick={() => setUserToChangePass(state.currentUser)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm"
            >
              <Key className="w-4 h-4" /> تغيير كلمة المرور الخاصة بي (الأدمن)
            </button>
          )}

          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> إضافة مستخدم جديد
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200 bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'permissions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          مدير الصلاحيات المتقدم (Permissions Manager)
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          جدول حسابات المستخدمين ({state.users.length})
        </button>

        {state.currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            سجل النشاطات والأمان
          </button>
        )}
      </div>

      {/* Add User Modal / Form */}
      {isAdding && (
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-slate-200 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              إضافة مستخدم وموظف جديد للنظام
            </h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">اسم المستخدم (Login Username)</label>
              <input 
                type="text" 
                value={newUser.username}
                placeholder="مثال: أحمد_محاسب أو كاشير_2"
                onChange={e => setNewUser({...newUser, username: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">الدور الوظيفي الأساسي</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value as User['role']})}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {Object.entries(roleNames).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">كلمة المرور (تحديد بدايةً)</label>
              <input 
                type="password" 
                value={newUser.password || ''}
                placeholder="••••••••"
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>
          </div>
          
          <div className="mb-6 border-t border-slate-200 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              التهيئة الأولية للصلاحيات الحساسة:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={newUser.permissions?.canPrint} 
                  onChange={(e) => handlePermissionChange('canPrint', e.target.checked)} 
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                />
                <span className="text-xs font-bold text-slate-700">السماح بالطباعة</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={newUser.permissions?.canDelete} 
                  onChange={(e) => {
                    handlePermissionChange('canDelete', e.target.checked);
                    handlePermissionChange('canDeleteInvoices', e.target.checked);
                  }} 
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500" 
                />
                <span className="text-xs font-bold text-rose-700">السماح بالحذف</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={newUser.permissions?.canEditPrices} 
                  onChange={(e) => handlePermissionChange('canEditPrices', e.target.checked)} 
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                />
                <span className="text-xs font-bold text-slate-700">تعديل الأسعار</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                <input 
                  type="checkbox" 
                  checked={newUser.permissions?.canViewProfits} 
                  onChange={(e) => handlePermissionChange('canViewProfits', e.target.checked)} 
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" 
                />
                <span className="text-xs font-bold text-purple-700">رؤية تقارير الأرباح</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              * يمكنك لاحقاً فتح "مدير الصلاحيات المتقدم" في أي وقت للتحكم في ظهور أو إخفاء أي قسم أو أيقونة بدقة.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors">
              حفظ وتثبيت المستخدم
            </button>
            <button onClick={() => setIsAdding(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2.5 rounded-xl font-bold transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: Permissions Manager (Main Requested Interface) */}
      {activeTab === 'permissions' && (
        <PermissionsManager 
          selectedUserId={selectedUserForPermissions}
          onUserSelect={(id) => setSelectedUserForPermissions(id)}
        />
      )}

      {/* Tab 2: Users List Table */}
      {activeTab === 'users' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">قائمة مستخدمي النظام وأدوارهم</h3>
              <p className="text-xs text-slate-500 mt-0.5">انقر على زر "تخصيص الصلاحيات" لفتح واجهة التحكم بالأقسام والعمليات</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
              إجمالي المستخدمين: {state.users.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-4">المستخدم</th>
                  <th className="px-6 py-4">الدور الوظيفي</th>
                  <th className="px-6 py-4">الصلاحيات الحساسة</th>
                  <th className="px-6 py-4">الأقسام المتاحة</th>
                  <th className="px-6 py-4 text-center">الحالة</th>
                  <th className="px-6 py-4 text-center">إجراءات الصلاحية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {state.users.map(user => {
                  const visibleSectionsCount = user.permissions?.allowedViews?.length ?? (user.role === 'admin' ? ALL_APP_VIEWS.length : 3);
                  return (
                    <tr key={user.id} className="even:bg-slate-50/80 odd:bg-white hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {user.username.charAt(0)}
                        </div>
                        <div>
                          <span>{user.username}</span>
                          {user.id === state.currentUser?.id && (
                            <span className="block text-[10px] text-blue-600 font-bold">(أنت الآن)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {roleNames[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className={`px-2 py-0.5 rounded ${user.permissions?.canPrint ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                            طباعة
                          </span>
                          <span className={`px-2 py-0.5 rounded ${user.permissions?.canDelete ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            حذف
                          </span>
                          <span className={`px-2 py-0.5 rounded ${user.permissions?.canEditPrices ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            تعديل أسعار
                          </span>
                          <span className={`px-2 py-0.5 rounded ${user.permissions?.canViewProfits ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-slate-100 text-slate-400 line-through'}`}>
                            أرباح
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
                          {visibleSectionsCount} من {ALL_APP_VIEWS.length} قسم
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(user)}
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                            user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}
                          disabled={user.role === 'admin'}
                          title={user.role === 'admin' ? 'لا يمكن إيقاف حساب مدير النظام الرئيسي' : 'تفعيل / إيقاف الحساب'}
                        >
                          {user.isActive ? <Check className="w-3.5 h-3.5"/> : <X className="w-3.5 h-3.5"/>}
                          {user.isActive ? 'نشط' : 'موقوف'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => setUserToChangePass(user)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition-colors shadow-sm"
                            title="تغير/تصفير كلمة مرور المستخدم"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            كلمة المرور
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForPermissions(user.id);
                              setActiveTab('permissions');
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            تخصيص الصلاحيات والأقسام
                          </button>
                          {user.role !== 'admin' && user.id !== state.currentUser?.id && canDelete && (
                            <button
                              onClick={() => setConfirmDeleteId(user.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
                              title="حذف المستخدم نهائياً"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Activity Logs */}
      {activeTab === 'logs' && state.currentUser?.role === 'admin' && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800">سجل عمليات ونشاطات المستخدمين (Audit Log)</h3>
            </div>
            <span className="text-xs text-slate-500">حفظ تلقائي لكافة الإجراءات الرقابية</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto p-4">
            {state.activityLogs && state.activityLogs.length > 0 ? (
              <div className="space-y-3">
                {state.activityLogs.map(log => {
                  const user = state.users.find(u => u.id === log.userId);
                  return (
                    <div key={log.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:bg-slate-100/50 transition-colors">
                      <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex justify-center items-center font-bold text-xs shrink-0">
                        {user?.username.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">
                            <span className="text-indigo-600 ml-1">{user?.username || 'مستخدم محذوف'}:</span>
                            {log.action}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{log.details}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5">{new Date(log.timestamp).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-12">لا توجد نشاطات مسجلة حتى الآن.</p>
            )}
          </div>
        </div>
      )}

      {/* Change Password Modal for Admin */}
      <ChangePasswordModal 
        isOpen={!!userToChangePass}
        onClose={() => setUserToChangePass(null)}
        targetUser={userToChangePass}
      />

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="حذف حساب مستخدم"
        message={`هل أنت متأكد من حذف حساب المستخدم "${state.users.find(u => u.id === confirmDeleteId)?.username}" نهائياً؟ سيتم فقدان صلاحياته وسجلاته المرتبطة.`}
        onConfirm={() => {
          if (confirmDeleteId) {
            deleteUser(confirmDeleteId);
            logActivity('حذف حساب مستخدم', `تم حذف حساب المستخدم المعرف بـ: ${confirmDeleteId}`);
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
