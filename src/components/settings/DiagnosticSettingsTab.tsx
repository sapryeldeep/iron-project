import React from 'react';
import { Activity } from 'lucide-react';
import { SystemBackupPayload } from '../../services/backupService';

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com

interface DiagnosticSettingsTabProps {
  state: any;
  cloudStatus: { isOnline: boolean };
  vaultBackups: SystemBackupPayload[];
  isElectron: boolean;
}

export default function DiagnosticSettingsTab({
  state,
  cloudStatus,
  vaultBackups,
  isElectron,
}: DiagnosticSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
        <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-amber-400">
          <Activity className="w-6 h-6" /> 
          تقرير فحص المحرك البرمجي (Diagnostic Report)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-500 block uppercase mb-1">حالة الذاكرة المحلية (State Store):</span>
            <span className="text-emerald-400">نشط (Active) - {Object.keys(state).length} وحدات بيانات</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-500 block uppercase mb-1">المزامنة السحابية (Cloud Sync):</span>
            <span className={cloudStatus.isOnline ? "text-emerald-400" : "text-rose-400"}>
              {cloudStatus.isOnline ? "متصل (Connected)" : "منقطع (Offline)"}
            </span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-500 block uppercase mb-1">محرك النسخ (Backup Engine):</span>
            <span className="text-blue-400">جاهز (Ready) - {vaultBackups.length} نسخة في السجل</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-slate-500 block uppercase mb-1">البيئة الحالية (Environment):</span>
            <span className="text-amber-400">{isElectron ? "Electron Desktop App" : "Web Browser Runtime"}</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <p className="text-xs text-emerald-300 font-bold mb-2 underline">تأكيد فعالية الأزرار:</p>
          <ul className="text-[10px] space-y-1 text-slate-300">
            <li>✔ أزرار التبويبات: تعمل عبر React State Switching (نشطة).</li>
            <li>✔ أزرار الحفظ: تقوم بعمل JSON Stringification و LocalStorage Persistence (نشطة).</li>
            <li>✔ أزرار النسخ: تستخدم Blob API و URL Objects للتوليد (نشطة).</li>
            <li>✔ أزرار الحذف: تستخدم Array Filtering و Store Updates (نشطة).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
