import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { History, ShieldAlert, FileEdit, Trash2, User as UserIcon, Calendar, Info, FileText, Printer, Download } from 'lucide-react';
import { useState, useRef } from 'react';
import { exportToPDF, exportCustomExcel } from '../utils/export';

export default function AuditLogsView() {
  const { state } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'critical' | 'edits' | 'deletions'>('all');
  const auditRef = useRef<HTMLDivElement>(null);

  const filteredLogs = state.activityLogs.filter(log => {
    if (filter === 'critical') return log.action.includes('حذف') || log.action.includes('تعديل');
    if (filter === 'edits') return log.action.includes('تعديل');
    if (filter === 'deletions') return log.action.includes('حذف');
    return true;
  });

  const getLogIcon = (action: string) => {
    if (action.includes('حذف')) return <Trash2 className="w-5 h-5 text-rose-500" />;
    if (action.includes('تعديل')) return <FileEdit className="w-5 h-5 text-amber-500" />;
    if (action.includes('إضافة')) return <Info className="w-5 h-5 text-blue-500" />;
    return <History className="w-5 h-5 text-slate-400" />;
  };

  const handleExportPDF = async () => {
    if (!auditRef.current) return;
    await exportToPDF(auditRef.current, `سجل_التدقيق_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportExcel = () => {
    exportCustomExcel({
      title: 'سجل التدقيق والرقابة (Audit Trail)',
      filename: `سجل_التدقيق_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'timestamp', label: 'التاريخ والوقت', type: 'date' },
        { key: 'action', label: 'نوع العملية', type: 'string' },
        { key: 'details', label: 'التفاصيل', type: 'string' },
      ],
      data: filteredLogs,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" ref={auditRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-9 h-9 text-rose-600" />
            سجل التدقيق والرقابة (Audit Trail)
          </h1>
          <p className="text-slate-500 font-bold mt-1">تتبع كافة العمليات الحساسة وتعديلات المستخدمين على النظام</p>
        </div>

        <div className="flex flex-col items-end gap-3 no-print">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${filter === 'critical' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              عمليات حرجة
            </button>
            <button 
              onClick={() => setFilter('edits')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${filter === 'edits' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              تعديلات
            </button>
            <button 
              onClick={() => setFilter('deletions')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${filter === 'deletions' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              حذف
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (auditRef.current) triggerNativePrint(auditRef.current, 'سجل_التدقيق_والرقابة');
                else window.print();
              }}
              className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50"
              title="طباعة"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-[11px] font-black cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              طباعة السجل (PDF)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-sm font-black border-l border-slate-800">الوقت والتاريخ</th>
                <th className="px-6 py-4 text-sm font-black border-l border-slate-800">المستخدم</th>
                <th className="px-6 py-4 text-sm font-black border-l border-slate-800">النوع</th>
                <th className="px-6 py-4 text-sm font-black">التفاصيل والبيانات المعدلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-black text-xl">لا توجد سجلات مطابقة حالياً</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const user = state.users.find(u => u.id === log.userId);
                  const isCritical = log.action.includes('حذف') || log.action.includes('تعديل');
                  
                  return (
                    <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${isCritical ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span className="font-mono font-bold whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('ar-EG')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${user?.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{user?.username || 'نظام آلي'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{user?.role || 'SYSTEM'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.action)}
                          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                            log.action.includes('حذف') ? 'bg-rose-100 text-rose-700' : 
                            log.action.includes('تعديل') ? 'bg-amber-100 text-amber-700' : 
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-bold leading-relaxed ${isCritical ? 'text-slate-900' : 'text-slate-600'}`}>
                          {log.details}
                        </p>
                        {log.details.includes('الحقول المعدلة') && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {log.details.split(': ')[1]?.split(', ').map(field => (
                              <span key={field} className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-200">
                                {field}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredLogs.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400 font-bold">
              يتم الاحتفاظ بسجلات التدقيق لفترة محدودة طبقاً لإعدادات الأرشفة • نظام إنجاز ٢٠٢٦
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
