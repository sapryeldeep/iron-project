import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Lock, User as UserIcon, Shield, CheckCircle2, AlertCircle, Key, Eye, EyeOff } from 'lucide-react';
import { getUserPassword } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  targetUserId?: string | null;
}

export default function LoginModal({ isOpen, onClose, targetUserId }: LoginModalProps) {
  const { state, switchUser } = useAppStore();
  
  const [selectedUserId, setSelectedUserId] = useState<string>(
    targetUserId || state.currentUser?.id || state.users[0]?.id || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const activeUsers = state.users.filter(u => u.isActive);
  const selectedUser = state.users.find(u => u.id === selectedUserId);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedUser) {
      setError('يرجى اختيار المستخدم بشكل صحيح');
      return;
    }

    // Check password
    const enteredPass = password.trim();
    const correctPassword = getUserPassword(selectedUser);

    if (enteredPass !== correctPassword) {
      setError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
      return;
    }

    // Successful login
    switchUser(selectedUser.id);
    setSuccessMsg(`مرحباً بك ${selectedUser.username}! تم تسجيل الدخول بنجاح.`);
    
    setTimeout(() => {
      setPassword('');
      setError('');
      setSuccessMsg('');
      if (onClose) onClose();
    }, 800);
  };

  const roleLabels: Record<string, string> = {
    admin: 'مدير النظام الكامل',
    manager: 'مدير الفرع / مشرف',
    accountant: 'محاسب مالي',
    storekeeper: 'أمين مخزن',
    cashier: 'كاشير / موظف مبيعات'
  };

  return (

    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 p-6 text-white text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-8 h-8 text-blue-300" />
          </div>
          <h2 className="text-xl font-black text-white">تسجيل الدخول والأمان 🔐</h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            يرجى إدخال كلمة المرور للوصول إلى صلاحيات الحساب
          </p>

          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 text-slate-400 hover:text-white p-1 rounded-lg"
              title="إغلاق"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              اختر اسم المستخدم
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 pl-8 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({roleLabels[u.role] || u.role})
                  </option>
                ))}
              </select>
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {selectedUser && (
            <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">الرتبة والصلاحيات:</span>
              <span className="bg-blue-100 text-blue-900 font-black px-2.5 py-0.5 rounded-lg border border-blue-200">
                {roleLabels[selectedUser.role] || selectedUser.role}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="أدخل كلمة المرور..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-medium text-center">
              * الحسابات محمية بكلمات مرور سرية ومؤمنة بالكامل.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            <Key className="w-4 h-4" />
            <span>تسجيل الدخول والتفعيل</span>
          </button>
        </form>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
          أمان وخصوصية المستخدمين • شركة إنجاز للحديد والصلب
        </div>
      </div>
    </div>
  );
}
