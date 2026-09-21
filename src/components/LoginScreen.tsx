import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Lock, Shield, User as UserIcon, ArrowRight, Key, AlertCircle, Sparkles, Server } from 'lucide-react';
import { motion } from 'motion/react';
import { getUserPassword } from '../types';

export default function LoginScreen() {
  const { state, switchUser } = useAppStore();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const activeUsers = state.users.filter(u => u.isActive);
  const selectedUser = state.users.find(u => u.id === selectedUserId);

  // Default to the first active user (typically admin) for easy access
  useEffect(() => {
    if (activeUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(activeUsers[0].id);
    }
  }, [activeUsers, selectedUserId]);

  // Autofocus password when user is selected
  useEffect(() => {
    if (selectedUserId && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [selectedUserId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('يرجى تحديد المستخدم للتابع');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    // Simulate a secure non-blocking delay for realistic professional feel
    setTimeout(() => {
      const enteredPass = password.trim();
      const correctPassword = getUserPassword(selectedUser);

      if (enteredPass !== correctPassword) {
        setError('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
        setIsLoggingIn(false);
        return;
      }

      // Success
      switchUser(selectedUser.id);
      setIsLoggingIn(false);
    }, 400);
  };

  const roleLabels: Record<string, string> = {
    admin: 'المدير العام للنظام',
    manager: 'مدير فرع / مشرف',
    accountant: 'المحاسب المالي',
    storekeeper: 'أمين المستودع والمخازن',
    cashier: 'الكاشير / موظف المبيعات'
  };

  const roleColors: Record<string, string> = {
    admin: 'from-rose-500 to-red-600',
    manager: 'from-amber-500 to-amber-600',
    accountant: 'from-blue-500 to-indigo-600',
    storekeeper: 'from-emerald-500 to-teal-600',
    cashier: 'from-cyan-500 to-sky-600'
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans relative overflow-hidden select-none" dir="rtl">
      {/* Dynamic Animated Geometric Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header Info */}
      <header className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shadow-lg font-black text-lg">
            إ
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-slate-200">نظام إنجاز المتكامل</h1>
            <p className="text-[10px] text-slate-400 font-bold">لإدارة مستودعات وتصنيع الحديد والصلب</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 w-full flex flex-col lg:flex-row items-center gap-12 py-6">
        {/* Left Hand: Corporate Intro (Aesthetic display) */}
        <div className="text-right flex-1 space-y-6 hidden lg:block">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>شركة إنجاز للحديد والصلب</span>
          </div>
          <h2 className="text-4xl font-black leading-tight text-white">
            المنصة الذكية الأولى <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 via-yellow-300 to-orange-400">
              لإدارة الحسابات والموازين
            </span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md">
            نظام محاسبي وأمني متكامل يربط الموازين التراكمية، إدارة المخازن، حاسبة الصاج والمصنعيات، وكشوفات الحسابات المباشرة تحت سقف تقني آمن وغير قابل للتلاعب.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 block">البسكول المباشر</span>
              <span className="text-[10px] text-slate-500">ربط وقراءة حية وفورية للموازين</span>
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 block">رقابة وأمان تام</span>
              <span className="text-[10px] text-slate-500">سجل تدقيق للعمليات وإدارة الصلاحيات</span>
            </div>
          </div>
        </div>

        {/* Right Hand: Login Form Terminal */}
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md relative">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center mx-auto mb-3 shadow-xl">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-black text-white">بوابة تسجيل الدخول الآمنة 🔒</h3>
            <p className="text-xs text-slate-400 mt-1">يرجى تحديد حسابك وإدخال كلمة المرور للبدء</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* User Profiles Quick Selection List */}
            <div>
              <label className="block text-xs font-black text-slate-300 mb-2">اختر حساب التشغيل</label>
              <div className="grid grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto custom-scrollbar p-1">
                {activeUsers.map(user => {
                  const isSelected = selectedUserId === user.id;
                  const label = roleLabels[user.role] || user.role;
                  const bgGradient = roleColors[user.role] || 'from-slate-600 to-slate-700';

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setError('');
                      }}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between h-20 relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-slate-800 border-amber-500/50 shadow-lg ring-1 ring-amber-500/30' 
                          : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        <UserIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                      </div>
                      <div className="z-10">
                        <span className="text-xs font-black text-white block group-hover:text-amber-300 transition-colors">{user.username}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{label}</span>
                      </div>
                      {/* Subtile background glow for selected user role */}
                      {isSelected && (
                        <div className={`absolute -bottom-10 -left-10 w-20 h-20 rounded-full bg-gradient-to-tr ${bgGradient} opacity-10 blur-xl pointer-events-none`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected User details & Password Field */}
            {selectedUser && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-950/80 border border-slate-800/60 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">الرتبة والوظيفة:</span>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-extrabold px-2.5 py-0.5 rounded-lg">
                    {roleLabels[selectedUser.role] || selectedUser.role}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-300 mb-1.5">كلمة مرور الحساب</label>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="أدخل الرمز السري الخاص بك..."
                      className="w-full bg-slate-950 border border-slate-800/80 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-white placeholder-slate-600 outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 transition-all text-center"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block font-semibold text-center">
                    * الحسابات محمية بكلمات مرور سرية ومؤمنة بالكامل.
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-3.5 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                isLoggingIn ? 'opacity-85 cursor-not-allowed' : ''
              }`}
            >
              {isLoggingIn ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري التحقق والمصادقة الأمنية...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>تأكيد تسجيل الدخول والولوج 🔒</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="p-6 border-t border-slate-900 bg-slate-950/60 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-2">
        <div>
          نظام إنجاز السحابي الموحد • جميع الحقوق محفوظة لشركة إنجاز {new Date().getFullYear()}
        </div>
        <div className="text-emerald-500 font-black">
          programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
        </div>
      </footer>
    </div>
  );
}
