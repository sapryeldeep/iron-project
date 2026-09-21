import React from 'react';
import { Cloud, HardDrive, Upload, RefreshCw, Download, History, FolderOpen, Trash2, Shield } from 'lucide-react';
import { AppSettings } from '../../types';
import { SystemBackupPayload } from '../../services/backupService';
import { firebaseConfig } from '../../services/firebaseService';

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com

interface CloudSettingsTabProps {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  vaultBackups: SystemBackupPayload[];
  diskBackups: any[];
  isElectron: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  folderInputRef: React.RefObject<HTMLInputElement>;
  handleRestoreBackupFromFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  runAutoBackupNow: () => void;
  handleManualBackupDownload: () => void;
  handleFolderChange: (e: any) => void;
  selectBackupPath: () => void;
  handleClearAllVaultBackups: () => void;
  handleRestoreFromDisk: (backup: any) => void;
  handleDeleteDiskBackup: (path: string) => void;
  handleRestoreFromVault: (backup: SystemBackupPayload) => void;
  downloadBackupFile: (backup: SystemBackupPayload) => void;
  handleDeleteVaultBackup: (id: string) => void;
}

export default function CloudSettingsTab({
  settings,
  setSettings,
  vaultBackups,
  diskBackups,
  isElectron,
  fileInputRef,
  folderInputRef,
  handleRestoreBackupFromFile,
  runAutoBackupNow,
  handleManualBackupDownload,
  handleFolderChange,
  selectBackupPath,
  handleClearAllVaultBackups,
  handleRestoreFromDisk,
  handleDeleteDiskBackup,
  handleRestoreFromVault,
  downloadBackupFile,
  handleDeleteVaultBackup,
}: CloudSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">السيرفر السحابي والنسخ الاحتياطي التلقائي</h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">إدارة الربط اللحظي بقاعدة بيانات Firebase Firestore وجدار الحماية والتخزين اليومي</p>
        </div>
      </div>

      {/* Firebase Live Cloud Connection Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
              <Cloud className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Google Firebase Firestore (Real-time Cloud)</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  مزامنة صامتة مفعلة
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-semibold">
                مشروع: <span className="font-mono text-amber-300 font-bold">{firebaseConfig.projectId}</span> | محرك مزامنة خلفي تلقائي صامت 100% (Offline-First)
              </p>
            </div>
          </div>
        </div>

        {/* Grid Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-slate-400 block mb-1">خادم قاعدة البيانات:</span>
            <span className="font-mono text-slate-200 font-bold truncate block">{firebaseConfig.authDomain}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-slate-400 block mb-1">نظام الحماية والأمان:</span>
            <span className="text-emerald-300 font-bold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> مشفر ومحمي بجدار Firestore
            </span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/10">
            <span className="text-slate-400 block mb-1">الوضع عند انقطاع النت:</span>
            <span className="text-amber-300 font-bold">حفظ محلي فوري والرفع التلقائي عند العودة</span>
          </div>
        </div>
      </div>

      {/* Section: Automated Daily Backup & Manual Backups */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">النسخ الاحتياطي الشامل (Daily Backups & Restore)</h3>
              <p className="text-xs text-slate-500 font-semibold">تنزيل نسخة احتياطية لكافة الفواتير والمخزون، واختيار مسار الحفظ، والاسترجاع في أي وقت.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleRestoreBackupFromFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>استرجاع من ملف خارجي</span>
            </button>

            <button
              type="button"
              onClick={runAutoBackupNow}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تشغيل محرك النسخ التلقائي يدوياً</span>
            </button>

            <button
              type="button"
              onClick={handleManualBackupDownload}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة احتياطية الآن (.json)</span>
            </button>
          </div>
        </div>

        {/* Indicators & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 font-black block uppercase">تاريخ آخر نسخة احتياطية ناجحة</span>
              <span className="text-sm font-black text-slate-800">
                {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString('ar-EG') : 'لم يتم أخذ نسخة بعد'}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] text-blue-600 font-black block uppercase">تاريخ آخر عملية استرجاع ناجحة</span>
              <span className="text-sm font-black text-slate-800">
                {settings.lastRestoredAt ? new Date(settings.lastRestoredAt).toLocaleString('ar-EG') : 'لم يتم الاسترجاع بعد'}
              </span>
            </div>
          </div>
        </div>

        {/* Configured Local Path */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFolderChange}
            className="hidden"
            // @ts-ignore
            webkitdirectory=""
            directory=""
          />
          
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              مسار حفظ النسخ الاحتياطية المفضل على جهازك (تغيير أو كتابة يدوية)
            </label>
            <p className="text-[10px] text-slate-500 mb-2 font-bold">
              يمكنك كتابة المسار يدوياً مباشرةً (مثل: D:\MyIronBackups) لضمان ربطه ببرنامج الـ Electron ونظام ويندوز دون قيود المتصفح:
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FolderOpen className="absolute right-3.5 top-3 w-4 h-4 text-amber-600" />
              <input
                type="text"
                value={settings.customBackupDirectory || 'C:\\Backups\\IronManage'}
                onChange={(e) => setSettings({ ...settings, customBackupDirectory: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl pr-10 pl-4 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 transition-colors"
                placeholder="مثال: C:\Backups\IronManage"
              />
            </div>
            <button
              type="button"
              onClick={selectBackupPath}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all shadow-sm shrink-0 active:scale-95"
            >
              📂 تصفح المجلدات
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              سجل النسخ الاحتياطية اليومية (آخر 30 نسخة)
            </h4>
            {vaultBackups.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllVaultBackups}
                className="text-[10px] font-black text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-100 transition-all"
              >
                مسح السجل بالكامل
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">تاريخ ووقت النسخة</th>
                  <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">التفاصيل الفنية</th>
                  <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Disk Backups (Electron Only) */}
                {isElectron && diskBackups.map((backup) => (
                  <tr key={backup.path} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-black text-amber-800 flex items-center gap-1.5">
                          <HardDrive className="w-3 h-3" />
                          {new Date(backup.timestamp).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-amber-600/70 font-mono">{new Date(backup.timestamp).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-amber-700 font-bold">{(backup.size / 1024).toFixed(1)} KB</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={backup.path}>
                          مسار: {backup.path}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => handleRestoreFromDisk(backup)}
                          className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-600 hover:text-white rounded-lg text-[10px] font-black transition-all border border-amber-600/20"
                        >
                          استرجاع ملف
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteDiskBackup(backup.path)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="حذف الملف نهائياً من الهارد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Vault Backups (Local Storage) */}
                {vaultBackups.length > 0 && vaultBackups.map((backup) => (
                  <tr key={backup.metadata.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{new Date(backup.metadata.timestamp).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(backup.metadata.timestamp).toLocaleTimeString('ar-EG')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-blue-600 font-black">{(backup.metadata.sizeBytes / 1024).toFixed(1)} KB</span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {backup.metadata.recordCounts.invoices} فاتورة | {backup.metadata.recordCounts.inventory} صنف | {backup.metadata.recordCounts.scaleTickets} وزنة
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          type="button"
                          onClick={() => handleRestoreFromVault(backup)}
                          className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-[10px] font-black transition-all border border-blue-600/20"
                        >
                          استرجاع
                        </button>
                        <button 
                          type="button"
                          onClick={() => downloadBackupFile(backup)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="تحميل الملف"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteVaultBackup(backup.metadata.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vaultBackups.length === 0 && (!isElectron || diskBackups.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-slate-400 font-bold italic bg-slate-50/30">
                      لا توجد نسخ احتياطية مسجلة حالياً..
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
