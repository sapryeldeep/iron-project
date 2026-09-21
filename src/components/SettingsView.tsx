import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { Invoice, Person } from '../types';
import { 
  Settings, 
  Save, 
  Printer as PrinterIcon, 
  Server, 
  Layout, 
  Shield, 
  Activity, 
  Trash2,
  X,
  Sparkles,
  Cloud,
  HardDrive,
  Upload,
  RefreshCw,
  Download,
  History,
  FolderOpen
} from 'lucide-react';
import HardwareSetupModal from './HardwareSetupModal';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import UsersView from './UsersView';
import GeneralSettingsTab from './settings/GeneralSettingsTab';
import PrintingSettingsTab from './settings/PrintingSettingsTab';
import CustomizationSettingsTab from './settings/CustomizationSettingsTab';
import DiagnosticSettingsTab from './settings/DiagnosticSettingsTab';
import BackupRestoreManager from './settings/BackupRestoreManager';
import { firebaseConfig } from '../services/firebaseService';
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
} from '../services/backupService';

// programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com

const samplePreviewInvoice: Invoice = {
  id: 'sample-inv-1',
  invoiceNumber: 'INV-2026-00042',
  date: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  type: 'sales',
  category: 'laser',
  personId: 'sample-client',
  personType: 'client',
  items: [
    {
      id: '1',
      description: 'صاج أسود 3مم - قص وتشغيل ليزر بأبعاد (2.5م × 1.25م)',
      quantity: 120,
      unitPrice: 48,
      total: 5760,
      length: 2.5,
      width: 1.25,
      thickness: 3,
      manufacturingUnit: 'kg'
    },
    {
      id: '2',
      description: 'صاج مجلفن 1.5مم - شغل ثني وتشكيل علب',
      quantity: 85,
      unitPrice: 55,
      total: 4675,
      manufacturingUnit: 'kg'
    }
  ],
  subtotal: 10435,
  discount: 435,
  total: 10000,
  paidAmount: 6000,
  remainingAmount: 4000,
  notes: 'البضاعة المباعة صاج معتمد ومطابق للمواصفات القياسية.',
};

const samplePreviewPerson: Person = {
  id: 'sample-client',
  name: 'شركة الأمل للمقاولات والهياكل المعدنية',
  phone: '01012345678',
  address: 'القاهرة - المنطقة الصناعية',
  type: 'client',
  balance: 15000,
  createdAt: new Date().toISOString(),
};

export default function SettingsView() {
  const { state, updateSettings, restoreSystemState, cloudStatus, resetSystemData } = useAppStore();
  const [settings, setSettings] = useState(state.settings);
  const [activeTab, setActiveTab] = useState<'general' | 'printing' | 'cloud' | 'customization' | 'users' | 'diagnostic'>('general');
  const [setupModalType, setSetupModalType] = useState<'printer' | 'scale' | null>(null);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<'classic' | 'modern' | 'compact' | null>(null);
  const [vaultBackups, setVaultBackups] = useState<SystemBackupPayload[]>([]);
  const [diskBackups, setDiskBackups] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null!);
  const folderInputRef = useRef<HTMLInputElement>(null!);

  const defaultApps = [
    { key: 'scale', defaultLabel: 'ميزان البسكول', defaultIcon: 'Scale', color: 'bg-sky-600' },
    { key: 'inventory', defaultLabel: 'المخزون', defaultIcon: 'PackageSearch', color: 'bg-emerald-500' },
    { key: 'clients', defaultLabel: 'العملاء', defaultIcon: 'Users', color: 'bg-blue-500' },
    { key: 'suppliers', defaultLabel: 'الموردين', defaultIcon: 'ArrowDownToLine', color: 'bg-indigo-500' },
    { key: 'statements', defaultLabel: 'كشوفات الحسابات', defaultIcon: 'FileSpreadsheet', color: 'bg-indigo-600' },
    { key: 'invoices', defaultLabel: 'الفواتير', defaultIcon: 'FileText', color: 'bg-purple-500' },
    { key: 'treasury', defaultLabel: 'الخزنة والسيولة', defaultIcon: 'Landmark', color: 'bg-emerald-600' },
    { key: 'payments', defaultLabel: 'السندات', defaultIcon: 'Receipt', color: 'bg-teal-500' },
    { key: 'journal', defaultLabel: 'دفتر اليومية', defaultIcon: 'BookOpen', color: 'bg-cyan-600' },
    { key: 'sales_reports', defaultLabel: 'المبيعات والتقارير', defaultIcon: 'TrendingUp', color: 'bg-rose-600' },
    { key: 'expenses', defaultLabel: 'المصروفات', defaultIcon: 'Wallet', color: 'bg-pink-500' },
    { key: 'fleet', defaultLabel: 'السيارات', defaultIcon: 'Truck', color: 'bg-amber-500' },
    { key: 'users', defaultLabel: 'المستخدمين', defaultIcon: 'Shield', color: 'bg-slate-700' },
    { key: 'settings', defaultLabel: 'الإعدادات', defaultIcon: 'Settings', color: 'bg-slate-400' },
    { key: 'audit', defaultLabel: 'سجل التدقيق والرقابة', defaultIcon: 'ShieldAlert', color: 'bg-rose-700' },
  ];

  const availableIcons = [
    { value: 'Scale', label: 'ميزان البسكول' },
    { value: 'PackageSearch', label: 'صندوق جرد ومخازن' },
    { value: 'Users', label: 'عملاء ومستخدمين' },
    { value: 'ArrowDownToLine', label: 'موردين وارد' },
    { value: 'FileText', label: 'مستندات فواتير' },
    { value: 'Receipt', label: 'إيصال دفع وسندات' },
    { value: 'BookOpen', label: 'دفتر حسابات مالي' },
    { value: 'TrendingUp', label: 'تقرير أرباح ومبيعات' },
    { value: 'Wallet', label: 'محفظة وخزينة ومصاريف' },
    { value: 'Truck', label: 'شاحنة سيارات نقل' },
    { value: 'Shield', label: 'درع مستخدمين وأمان' },
    { value: 'Settings', label: 'ترس إعدادات' },
    { value: 'Layout', label: 'تخطيط واجهات' },
    { value: 'Factory', label: 'مصنع تصنيع' },
    { value: 'Calculator', label: 'حاسبة حديد ومعادن' },
  ];

  const customCreatedList = settings.customCreatedApps || [];
  const customAppsCombined = [
    ...defaultApps,
    ...customCreatedList.map(app => ({
      key: app.key,
      defaultLabel: app.label,
      defaultIcon: app.icon,
      color: app.color,
      isCustom: true,
      targetView: app.targetView,
      desc: app.desc
    }))
  ];

  const defaultOrderKeys = customAppsCombined.map(a => a.key);
  const currentOrder = [...(settings.customTabOrder && settings.customTabOrder.length > 0 ? settings.customTabOrder : defaultOrderKeys)];
  
  customAppsCombined.forEach(app => {
    if (!currentOrder.includes(app.key)) {
      currentOrder.push(app.key);
    }
  });

  const currentIcons = settings.customTabIcons || {};
  const currentNames = settings.customTabNames || {};

  const sortedCustomApps = [...customAppsCombined].sort((a, b) => {
    const idxA = currentOrder.indexOf(a.key);
    const idxB = currentOrder.indexOf(b.key);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });

  const moveApp = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentOrder];
    customAppsCombined.forEach(app => {
      if (!newOrder.includes(app.key)) {
        newOrder.push(app.key);
      }
    });
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setSettings({ ...settings, customTabOrder: newOrder });
    }
  };

  const handleNameChange = (key: string, name: string) => {
    setSettings({
      ...settings,
      customTabNames: {
        ...currentNames,
        [key]: name,
      }
    });
  };

  const handleIconChange = (key: string, iconName: string) => {
    setSettings({
      ...settings,
      customTabIcons: {
        ...currentIcons,
        [key]: iconName,
      }
    });
  };

  const resetCustomization = () => {
    if (window.confirm('هل تريد فعلاً استعادة الترتيب والأيقونات الافتراضية للنظام؟')) {
      setSettings({
        ...settings,
        customTabOrder: defaultApps.map(a => a.key),
        customTabIcons: {},
        customTabNames: {},
      });
    }
  };

  const [newAppName, setNewAppName] = useState('');
  const [newAppTarget, setNewAppTarget] = useState('scale');
  const [newAppIcon, setNewAppIcon] = useState('Scale');
  const [newAppColor, setNewAppColor] = useState('bg-sky-600');
  const [newAppDesc, setNewAppDesc] = useState('');

  const handleAddCustomApp = () => {
    if (!newAppName.trim()) {
      alert('الرجاء إدخال اسم الأيقونة المخصصة');
      return;
    }
    const appKey = `custom_${Date.now()}`;
    const newApp = {
      key: appKey,
      label: newAppName.trim(),
      icon: newAppIcon,
      color: newAppColor,
      targetView: newAppTarget,
      desc: newAppDesc.trim() || `اختصار مخصص لـ ${newAppName.trim()}`
    };

    const currentCustomApps = settings.customCreatedApps || [];
    const updatedCustomApps = [...currentCustomApps, newApp];
    const updatedOrder = [...currentOrder, appKey];

    const updatedSettings = {
      ...settings,
      customCreatedApps: updatedCustomApps,
      customTabOrder: updatedOrder
    };

    setSettings(updatedSettings);
    updateSettings(updatedSettings);

    setNewAppName('');
    setNewAppDesc('');
    alert('✅ تمت إضافة الأيقونة المخصصة الجديدة وحفظها بنجاح!');
  };

  const handleDeleteCustomApp = (appKey: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الأيقونة المخصصة؟')) return;

    const currentCustomApps = settings.customCreatedApps || [];
    const updatedCustomApps = currentCustomApps.filter(app => app.key !== appKey);
    const updatedOrder = currentOrder.filter(k => k !== appKey);

    const updatedIcons = { ...settings.customTabIcons };
    delete updatedIcons[appKey];

    const updatedNames = { ...settings.customTabNames };
    delete updatedNames[appKey];

    const updatedSettings = {
      ...settings,
      customCreatedApps: updatedCustomApps,
      customTabOrder: updatedOrder,
      customTabIcons: updatedIcons,
      customTabNames: updatedNames
    };

    setSettings(updatedSettings);
    updateSettings(updatedSettings);
    alert('🗑️ تم حذف الأيقونة المخصصة بنجاح.');
  };

  useEffect(() => {
    const load = async () => {
      setVaultBackups(getLocalVaultBackups());
      if (isElectron) {
        const disk = await getDiskBackups(state.settings.customBackupDirectory);
        setDiskBackups(disk);
      }
    };
    load();
  }, [state.settings.customBackupDirectory]);

  useEffect(() => {
    setSettings(state.settings);
  }, [state.settings]);

  const handleSave = () => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، لا تملك صلاحية تعديل الإعدادات.');
      return;
    }
    updateSettings(settings);
    alert('✅ تم حفظ واعتماد كافة الإعدادات وتخصيصات الواجهة بنجاح في قاعدة البيانات.');
  };

  const runAutoBackupNow = () => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    try {
      const result = checkAndExecuteDailyAutoBackup(state);
      if (result) {
        updateSettings({ lastBackupAt: new Date().toISOString() });
        setVaultBackups(getLocalVaultBackups());
        alert('✅ تم تنفيذ النسخ الاحتياطي التلقائي بنجاح الآن.');
      } else {
        alert('ℹ️ النظام لا يحتاج لنسخة جديدة الآن (قد تكون النسخة تمت بالفعل اليوم أو النظام فارغ).');
      }
    } catch (e: any) {
      alert('❌ خطأ في تنفيذ النسخ الاحتياطي: ' + e.message);
    }
  };

  const handleManualBackupDownload = () => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    const backup = createSystemBackup(state);
    saveBackupToLocalVault(backup);
    setVaultBackups(getLocalVaultBackups());
    downloadBackupFile(backup);
    alert('تم إنشاء نسخة احتياطية مشفرة وشاملة للنظام وتنزيلها على جهازك بنجاح.');
  };

  const handleRestoreBackupFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      if (e.target) e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let content = event.target?.result as string;
        let parsed;
        
        try {
          parsed = JSON.parse(content);
        } catch {
          try {
            const decoded = atob(content);
            parsed = JSON.parse(decoded);
          } catch {
            throw new Error('الملف تالف أو غير متوافق مع نظام التشفير');
          }
        }

        const dataToRestore = parsed.data ? parsed.data : parsed;
        const confirmRestore = window.confirm(
          `تحذير أمان: هل تريد استرجاع بيانات النظام من النسخة (${parsed.metadata?.id || 'المحددة'})؟\nسيتم دمج وتحديث السجلات والموازين وحفظها محلياً وسحابياً.`
        );
        if (confirmRestore) {
          const res = restoreSystemState(dataToRestore);
          alert(res.message);
          if (res.success) {
            setVaultBackups(getLocalVaultBackups());
          }
        }
      } catch (err: any) {
        alert('الملف المحدد تالف أو غير متوافق: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleRestoreFromVault = (backup: SystemBackupPayload) => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    const confirmRestore = window.confirm(
      `هل أنت متأكد من استرجاع النسخة المؤرخة في: ${new Date(backup.metadata.timestamp).toLocaleString('ar-EG')}؟`
    );
    if (confirmRestore) {
      const res = restoreSystemState(backup.data);
      if (res.success) {
        alert(res.message + '\nسيتم الآن إعادة تحميل النظام لتنشيط البيانات الجديدة.');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert(res.message);
      }
    }
  };

  const handleRestoreFromDisk = async (backup: any) => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    const confirmRestore = window.confirm(
      `هل أنت متأكد من استرجاع النسخة الاحتياطية من الهارد ديسك: ${backup.name}؟`
    );

    if (confirmRestore) {
      try {
        const fs = (window as any).require('fs');
        const content = fs.readFileSync(backup.path, 'utf-8');
        let parsed;
        
        try {
          parsed = JSON.parse(content);
        } catch {
          const decoded = atob(content);
          parsed = JSON.parse(decoded);
        }

        const dataToRestore = parsed.data ? parsed.data : parsed;
        const res = restoreSystemState(dataToRestore);
        if (res.success) {
          alert(res.message + '\nسيتم الآن إعادة تحميل النظام لتنشيط البيانات الجديدة.');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          alert(res.message);
        }
      } catch (err: any) {
        alert('فشل استرجاع الملف: ' + err.message);
      }
    }
  };

  const handleDeleteVaultBackup = (id: string) => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    if (window.confirm('هل تريد حذف هذه النسخة الاحتياطية نهائياً من السجل المحلي؟')) {
      deleteBackupFromLocalVault(id);
      setVaultBackups(getLocalVaultBackups());
      alert('تم حذف النسخة بنجاح');
    }
  };

  const handleClearAllVaultBackups = () => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    if (window.confirm('⚠️ تحذير: سيتم مسح كافة النسخ الاحتياطية المسجلة في السجل المحلي نهائياً. هل أنت متأكد؟')) {
      clearAllLocalVaultBackups();
      setVaultBackups([]);
      alert('تم تصفير سجل النسخ الاحتياطية بالكامل');
    }
  };

  const handleDeleteDiskBackup = async (filePath: string) => {
    if (state.currentUser?.role !== 'admin') {
      alert('عذراً، هذه العملية تتطلب صلاحيات المسؤول.');
      return;
    }
    if (window.confirm('هل أنت متأكد من حذف ملف النسخة الاحتياطية نهائياً من على الهارد ديسك؟')) {
      const res = await deleteDiskBackup(filePath);
      if (res.success) {
        const disk = await getDiskBackups(settings.customBackupDirectory);
        setDiskBackups(disk);
      } else {
        alert('فشل الحذف: ' + res.message);
      }
    }
  };

  const selectBackupPath = async () => {
    if (isElectron) {
      const path = await selectBackupDirectory();
      if (path) {
        setSettings({ ...settings, customBackupDirectory: path });
        updateSettings({ customBackupDirectory: path });
        alert(`تم اعتماد مسار الحفظ الجديد: ${path}`);
        const disk = await getDiskBackups(path);
        setDiskBackups(disk);
      }
      return;
    }

    const currentPath = settings.customBackupDirectory || 'D:\\Backups\\IronManage';
    const typedPath = window.prompt(
      'يرجى كتابة أو لصق مسار مجلد النسخ الاحتياطي المفضل لديك على القرص الصلب أو السيرفر (مثال: D:\\Backups\\IronWare):',
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
    <div className="space-y-6 relative max-w-7xl mx-auto p-4 sm:p-6 pb-24">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-2xl">
            <Settings className="w-8 h-8 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">إعدادات النظام والتحكم الشامل</h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-3 py-1 rounded-full border border-amber-500/40">
                إصدار الإنتاج 3.0
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-semibold">
              إدارة إعدادات الشركة، محركات النسخ الاحتياطي السحابي والمحلي، قالب الفواتير، وتخصيص الواجهات والتحكم بالصلاحيات
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={handleManualBackupDownload}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl text-xs flex items-center gap-2 transition-all border border-white/20 active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>تصدير كافة البيانات (Export)</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>حفظ واعتماد التغييرات</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all border ${
            activeTab === 'general'
              ? 'bg-blue-600 text-white shadow-md border-blue-700'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>الإعدادات العامة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all border ${
            activeTab === 'cloud'
              ? 'bg-blue-600 text-white shadow-md border-blue-700'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>السحاب والنسخ الاحتياطي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('printing')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all border ${
            activeTab === 'printing'
              ? 'bg-blue-600 text-white shadow-md border-blue-700'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <PrinterIcon className="w-4 h-4" />
          <span>الطباعة والفواتير</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customization')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all border ${
            activeTab === 'customization'
              ? 'bg-blue-600 text-white shadow-md border-blue-700'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>تخصيص الواجهة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all border ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-md border-blue-700'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>المستخدمين والصلاحيات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostic')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black transition-all border ${
            activeTab === 'diagnostic'
              ? 'bg-blue-600 text-white shadow-md border-blue-700'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>صحة النظام</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {activeTab === 'users' && <UsersView />}

        {activeTab === 'diagnostic' && (
          <DiagnosticSettingsTab 
            state={state} 
            cloudStatus={cloudStatus} 
            vaultBackups={vaultBackups} 
            isElectron={isElectron} 
          />
        )}

        {activeTab === 'general' && (
          <GeneralSettingsTab 
            settings={settings} 
            setSettings={setSettings} 
            resetSystemData={resetSystemData}
            currentUser={state.currentUser}
          />
        )}

        {activeTab === 'printing' && (
          <PrintingSettingsTab 
            settings={settings} 
            setSettings={setSettings} 
            updateSettings={updateSettings} 
            stateInvoices={state.invoices} 
            setSetupModalType={setSetupModalType} 
            setPreviewTemplateKey={setPreviewTemplateKey} 
          />
        )}

        {activeTab === 'customization' && (
          <CustomizationSettingsTab 
            settings={settings} 
            setSettings={setSettings} 
            newAppName={newAppName} 
            setNewAppName={setNewAppName} 
            newAppTarget={newAppTarget} 
            setNewAppTarget={setNewAppTarget} 
            newAppIcon={newAppIcon} 
            setNewAppIcon={setNewAppIcon} 
            newAppColor={newAppColor} 
            setNewAppColor={setNewAppColor} 
            newAppDesc={newAppDesc} 
            setNewAppDesc={setNewAppDesc} 
            handleAddCustomApp={handleAddCustomApp} 
            handleDeleteCustomApp={handleDeleteCustomApp} 
            moveApp={moveApp} 
            handleNameChange={handleNameChange} 
            handleIconChange={handleIconChange} 
            resetCustomization={resetCustomization} 
            sortedCustomApps={sortedCustomApps} 
            currentIcons={currentIcons} 
            currentNames={currentNames} 
            availableIcons={availableIcons} 
          />
        )}

        {activeTab === 'cloud' && (
          <BackupRestoreManager 
            state={state} 
            settings={settings} 
            setSettings={setSettings} 
            updateSettings={updateSettings} 
            restoreSystemState={restoreSystemState} 
          />
        )}
      </div>

      <HardwareSetupModal 
        isOpen={!!setupModalType}
        type={setupModalType || 'printer'}
        onClose={() => setSetupModalType(null)}
      />

      {/* Live Preview Modal */}
      {previewTemplateKey && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-lg text-slate-900">معاينة قالب الفاتورة: {previewTemplateKey.toUpperCase()}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewTemplateKey(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
              <InvoicePrintTemplate 
                invoice={samplePreviewInvoice} 
                person={samplePreviewPerson} 
                settings={{ ...settings, invoiceTemplate: previewTemplateKey }} 
                printerType={previewTemplateKey === 'compact' ? 'thermal' : 'a4'} 
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => {
                  updateSettings({ ...settings, invoiceTemplate: previewTemplateKey });
                  alert(`✅ تم اعتماد قالب "${previewTemplateKey.toUpperCase()}" كقالب افتراضي للفواتير بنجاح.`);
                  setPreviewTemplateKey(null);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                اعتماد هذا القالب كافتراضي
              </button>
              <button 
                type="button"
                onClick={() => setPreviewTemplateKey(null)}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
