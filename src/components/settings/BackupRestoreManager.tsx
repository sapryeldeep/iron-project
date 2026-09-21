import React, { useState, useRef, useEffect } from 'react';
import { 
  HardDrive, 
  Upload, 
  RefreshCw, 
  Download, 
  History, 
  FolderOpen, 
  Trash2, 
  ShieldCheck,
  FileCheck,
  Database
} from 'lucide-react';
import { AppSettings, AppState } from '../../types';
import { 
  createSystemBackup, 
  downloadBackupFile, 
  saveBackupToLocalVault,
  getLocalVaultBackups, 
  deleteBackupFromLocalVault,
  selectBackupDirectory,
  getDiskBackups,
  deleteDiskBackup,
  isElectron,
  clearAllLocalVaultBackups,
  checkAndExecuteDailyAutoBackup,
  SystemBackupPayload
} from '../../services/backupService';

interface BackupRestoreManagerProps {
  state: AppState;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  restoreSystemState: (state: any) => { success: boolean; message: string };
}

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
export default function BackupRestoreManager({
  state,
  settings,
  setSettings,
  updateSettings,
  restoreSystemState
}: BackupRestoreManagerProps) {
  const [vaultBackups, setVaultBackups] = useState<SystemBackupPayload[]>([]);
  const [diskBackups, setDiskBackups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null!);
  const folderInputRef = useRef<HTMLInputElement>(null!);

  // Load backups on mount and when custom directory changes
  useEffect(() => {
    loadBackups();
  }, [settings.customBackupDirectory]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const local = getLocalVaultBackups();
      setVaultBackups(local);

      if (isElectron) {
        const disk = await getDiskBackups(settings.customBackupDirectory);
        setDiskBackups(disk);
      }
    } catch (e) {
      console.error("Failed to load backups:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Run Auto Backup Now
  const handleRunAutoBackup = () => {
    try {
      const backup = checkAndExecuteDailyAutoBackup(state) || createSystemBackup(state);
      saveBackupToLocalVault(backup);
      updateSettings({ lastBackupAt: new Date().toISOString() });
      loadBackups();
      alert('✅ تم تنفيذ وإنشاء النسخة الاحتياطية الشاملة وتخزينها في السجل المحلي بنجاح.');
    } catch (e: any) {
      alert('❌ فشل إنشاء النسخة الاحتياطية: ' + e.message);
    }
  };

  // 2. Download Manual Backup
  const handleDownloadManual = () => {
    try {
      const backup = createSystemBackup(state);
      saveBackupToLocalVault(backup);
      loadBackups();
      downloadBackupFile(backup);
      alert('✅ تم إنشاء النسخة الاحتياطية وتنزيل ملف الـ JSON على جهازك بنجاح.');
    } catch (e: any) {
      alert('❌ فشل تنزيل النسخة: ' + e.message);
    }
  };

  // 3. Restore from External File
  const handleFileRestoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          const decoded = atob(content);
          parsed = JSON.parse(decoded);
        }

        const dataToRestore = parsed.data ? parsed.data : parsed;
        if (!dataToRestore || typeof dataToRestore !== 'object') {
          throw new Error('هيكل ملف النسخة الاحتياطية غير صالح');
        }

        if (window.confirm(`⚠️ تحذير خطير: هل أنت متأكد من استعادة بيانات النظام من الملف الخارجي؟\nسيتم تحديث كافة السجلات والموازين والحسابات الحالية.`)) {
          const res = restoreSystemState(dataToRestore);
          alert(res.message);
          if (res.success) {
            updateSettings({ lastRestoredAt: new Date().toISOString() });
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      } catch (err: any) {
        alert('❌ فشل قراءة أو تحليل ملف النسخة الاحتياطية: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // 4. Restore from Local Vault Backup
  const handleRestoreVault = (backup: SystemBackupPayload) => {
    if (window.confirm(`هل أنت متأكد من استرجاع النسخة المؤرخة في: ${new Date(backup.metadata.timestamp).toLocaleString('ar-EG')}؟`)) {
      const res = restoreSystemState(backup.data);
      if (res.success) {
        updateSettings({ lastRestoredAt: new Date().toISOString() });
        alert(res.message + '\nسيتم الآن إعادة تحميل النظام لتنشيط البيانات المستعادة.');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert(res.message);
      }
    }
  };

  // 5. Delete Vault Backup
  const handleDeleteVault = (id: string) => {
    if (window.confirm('هل تريد حذف هذه النسخة الاحتياطية نهائياً من السجل المحلي؟')) {
      deleteBackupFromLocalVault(id);
      loadBackups();
      alert('✅ تم حذف النسخة الاحتياطية بنجاح.');
    }
  };

  // 6. Clear All Vault Backups
  const handleClearAll = () => {
    if (window.confirm('⚠️ تحذير: سيتم مسح كافة النسخ الاحتياطية المسجلة في السجل المحلي نهائياً. هل أنت متأكد؟')) {
      clearAllLocalVaultBackups();
      loadBackups();
      alert('✅ تم تصفير سجل النسخ الاحتياطية بالكامل.');
    }
  };

  // 7. Select Backup Directory (Direct Reliable Prompt for Web / Electron)
  const handleSelectPath = async () => {
    if (isElectron) {
      const path = await selectBackupDirectory();
      if (path) {
        setSettings({ ...settings, customBackupDirectory: path });
        updateSettings({ customBackupDirectory: path });
        alert(`✅ تم اعتماد مسار الحفظ الجديد: ${path}`);
        loadBackups();
      }
      return;
    }

    // Direct prompt for path configuration (works reliably across all iframe / web environments)
    const currentPath = settings.customBackupDirectory || 'D:\\Backups\\IronManage';
    const typedPath = window.prompt(
      'اختر مسار مجلد النسخ الاحتياطي (اكتب المسار أو الصقه هنا، مثال: D:\\Backups\\IronWare):',
      currentPath
    );
    if (typedPath !== null) {
      const cleaned = typedPath.trim();
      const finalPath = cleaned || 'D:\\Backups\\IronManage';
      setSettings({ ...settings, customBackupDirectory: finalPath });
      updateSettings({ customBackupDirectory: finalPath });
      alert(`✅ تم تحديث مسار حفظ النسخ الاحتياطية بنجاح إلى: ${finalPath}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">إدارة النسخ الاحتياطي والاسترجاع الشامل</h2>
              <p className="text-xs text-slate-300 mt-1 font-semibold">
                نظام حماية وسجل متكامل لحفظ واستعادة كافة فواتير وحركات المخزون والموازين بدقة تامة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileRestoreChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all border border-white/15"
            >
              <Upload className="w-4 h-4" />
              <span>استرجاع من ملف خارجي</span>
            </button>

            <button
              type="button"
              onClick={handleRunAutoBackup}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إنشاء نسخة الآن</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadManual}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة (.json)</span>
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">آخر نسخة احتياطية ناجحة:</span>
              <span className="font-bold text-white text-sm">
                {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString('ar-EG') : 'لم يتم أخذ نسخة بعد'}
              </span>
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">آخر عملية استرجاع ناجحة:</span>
              <span className="font-bold text-white text-sm">
                {settings.lastRestoredAt ? new Date(settings.lastRestoredAt).toLocaleString('ar-EG') : 'لم يتم الاسترجاع بعد'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Selector Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-slate-900 mb-1">مسار حفظ النسخ الاحتياطية على القرص</h3>
          <p className="text-xs text-slate-500 font-semibold">
            حدد المجلد المفضل لحفظ ملفات النسخ الاحتياطي التلقائي والمحلي (يدعم نظام ويندوز وسطح المكتب):
          </p>
        </div>

        <input
          type="file"
          ref={folderInputRef}
          onChange={(e: any) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              const path = files[0].webkitRelativePath;
              const folderName = path.split('/')[0] || 'المجلد المختار';
              setSettings({ ...settings, customBackupDirectory: folderName });
              updateSettings({ customBackupDirectory: folderName });
              alert(`✅ تم ربط مسار الحفظ بـ: ${folderName}`);
            }
          }}
          className="hidden"
          // @ts-ignore
          webkitdirectory=""
          directory=""
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FolderOpen className="absolute right-3.5 top-3.5 w-4 h-4 text-amber-600" />
            <input
              type="text"
              value={settings.customBackupDirectory || 'C:\\Backups\\IronManage'}
              onChange={(e) => {
                setSettings({ ...settings, customBackupDirectory: e.target.value });
                updateSettings({ customBackupDirectory: e.target.value });
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pr-10 pl-4 py-3 text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500"
              placeholder="مثال: D:\Backups\IronManage"
            />
          </div>
          <button
            type="button"
            onClick={handleSelectPath}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-2xl transition-all shadow-sm shrink-0 active:scale-95"
          >
            📂 تصفح وتحديد المجلد
          </button>
        </div>
      </div>

      {/* Backups History Vault Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">سجل النسخ الاحتياطية (Local Vault & Disk)</h3>
              <p className="text-xs text-slate-500 font-semibold">إدارة وحذف واسترجاع أي نسخة سابقة بكل سهولة</p>
            </div>
          </div>

          {vaultBackups.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-black text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 transition-all"
            >
              تصفير السجل بالكامل
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-widest">تاريخ ووقت النسخة</th>
                <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-widest">إحصائيات السجلات</th>
                <th className="px-4 py-3.5 font-black text-slate-600 uppercase tracking-widest text-center">الإجراءات والعمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Disk Backups in Electron mode */}
              {isElectron && diskBackups.map((disk) => (
                <tr key={disk.path} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-black text-amber-900 block">
                      {new Date(disk.timestamp).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-amber-600 font-mono">{new Date(disk.timestamp).toLocaleTimeString('ar-EG')} (هارد ديسك)</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-amber-800 font-bold">حجم الملف: {(disk.size / 1024).toFixed(1)} KB</span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-xs">{disk.path}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const fs = (window as any).require('fs');
                            const content = fs.readFileSync(disk.path, 'utf-8');
                            const parsed = JSON.parse(content);
                            const res = restoreSystemState(parsed.data || parsed);
                            if (res.success) {
                              alert('✅ تم الاسترجاع بنجاح. سيتم إعادة تحميل النظام.');
                              setTimeout(() => window.location.reload(), 1000);
                            } else {
                              alert(res.message);
                            }
                          } catch (err: any) {
                            alert('❌ خطأ في القراءة: ' + err.message);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-700 hover:text-white rounded-xl text-xs font-black transition-all border border-amber-600/20"
                      >
                        استرجاع
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm('حذف من الهارد ديسك؟')) {
                            await deleteDiskBackup(disk.path);
                            loadBackups();
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Vault Backups (LocalStorage) */}
              {vaultBackups.map((backup) => (
                <tr key={backup.metadata.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-black text-slate-900 block">
                      {new Date(backup.metadata.timestamp).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(backup.metadata.timestamp).toLocaleTimeString('ar-EG')}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-blue-600 font-black">{(backup.metadata.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {backup.metadata.recordCounts.invoices} فاتورة | {backup.metadata.recordCounts.inventory} صنف | {backup.metadata.recordCounts.scaleTickets} وزنة
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestoreVault(backup)}
                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-black transition-all border border-blue-600/20 shadow-sm"
                      >
                        استرجاع
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadBackupFile(backup)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="تحميل الملف"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVault(backup.metadata.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {vaultBackups.length === 0 && (!isElectron || diskBackups.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-slate-400 font-bold italic bg-slate-50/50">
                    لا توجد نسخ احتياطية مسجلة في السجل حالياً. انقر على "إنشاء نسخة الآن" لبدء الحفظ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
