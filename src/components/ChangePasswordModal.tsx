import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { User, getUserPassword } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

export default function ChangePasswordModal({ isOpen, onClose, targetUser }: ChangePasswordModalProps) {
  const { state, updateUser, logActivity } = useAppStore();
  const currentUser = state.currentUser;
  const userToEdit = targetUser || currentUser;

  const isAdminOverride = currentUser?.role === 'admin' && targetUser && targetUser.id !== currentUser.id;

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !userToEdit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // If not admin override, verify old password
    if (!isAdminOverride) {
      const currentStoredPass = getUserPassword(userToEdit);

      if (oldPassword.trim() !== currentStoredPass) {
        setError('كلمة المرور الحالية غير صحيحة');
        return;
      }
    }

    if (!newPassword.trim()) {
      setError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    if (newPassword.length < 4) {
      setError('كلمة المرور يجب أن تكون 4 خانات على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    updateUser(userToEdit.id, { password: newPassword.trim() });
    logActivity(
      'تغيير كلمة المرور',
      `تم تغيير كلمة المرور للمستخدم: ${userToEdit.username} بواسطة ${currentUser?.username}`
    );

    setSuccess('تم تغيير كلمة المرور بنجاح!');
    setTimeout(() => {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      onClose();
    }, 1000);
  };

  return (

    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-2xl border border-blue-400/30">
              <Key className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">تغيير كلمة المرور 🔑</h3>
              <p className="text-[11px] text-slate-300">
                الحساب: <strong className="text-white font-bold">{userToEdit.username}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!isAdminOverride && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pl-9 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>حفظ وتحديث</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
