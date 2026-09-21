import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ShieldAlert, Lock, ArrowRight, UserCheck, KeyRound } from 'lucide-react';
import { ViewType } from './Layout';
import LoginModal from './LoginModal';

interface AccessDeniedCardProps {
  view: ViewType;
  onNavigate: (view: ViewType) => void;
}

const viewNames: Record<string, string> = {
  scale: 'ميزان البسكول',
  invoices: 'الفواتير والعمليات',
  inventory: 'المخزون والجرد',
  clients: 'حسابات العملاء',
  suppliers: 'حسابات الموردين',
  statements: 'كشوفات الحسابات',
  treasury: 'الخزينة والحسابات النقدية',
  payments: 'السندات والتحصيل',
  journal: 'دفتر اليومية والقيود',
  sales_reports: 'تقارير الأرباح والمبيعات',
  expenses: 'المصروفات العامة',
  fleet: 'أسطول السيارات',
  users: 'إدارة المستخدمين والصلاحيات',
  settings: 'إعدادات النظام العامة',
  audit: 'الرقابة وسجل التدقيق'
};

export default function AccessDeniedCard({ view, onNavigate }: AccessDeniedCardProps) {
  const { state } = useAppStore();
  const currentUser = state.currentUser;
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const viewTitle = viewNames[view] || view;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-8 max-w-lg w-full text-center shadow-xl space-y-6">
        <div className="w-20 h-20 bg-rose-50 border border-rose-200 rounded-3xl flex items-center justify-center mx-auto text-rose-600 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="bg-rose-100 text-rose-800 text-xs font-black px-3 py-1 rounded-full border border-rose-200 inline-flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" /> نظام الحماية - الوصول محظور
          </span>
          <h2 className="text-2xl font-black text-slate-800">
            غير مصرح لك بالدخول إلى قسم "{viewTitle}"
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            الحساب الحالي <strong className="text-slate-900 font-extrabold">({currentUser?.username || 'مستخدم'})</strong> برتبة <strong className="text-blue-700">({currentUser?.role || 'مستثنى'})</strong> لا يمتلك الصلاحية المطلوبة للوصول إلى هذه الشاشة.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 text-right space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-900">
            💡 كيف يمكنك الوصول؟
          </p>
          <ul className="list-disc list-inside space-y-1 text-amber-800 pr-1">
            <li>التواصل مع <strong className="text-amber-950 font-bold">أدمن النظام</strong> لمنحك إذن الوصول إلى قسم "{viewTitle}".</li>
            <li>تسجيل الدخول بحساب مستخدم أخر أو حساب الأدمن المالك للمؤسسة.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>تسجيل دخول بحساب مصرح له</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm border border-slate-200"
          >
            <span>العودة للوحة الرئيسية</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
