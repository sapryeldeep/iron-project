import { useState, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { Wallet, Plus, Trash2, Calendar, FileText, DollarSign, ListFilter, Printer, Download, Search } from 'lucide-react';
import { exportToPDF, exportCustomExcel, exportDataToPDF } from '../utils/export';
import ConfirmModal from './ConfirmModal';

export default function ExpensesView() {
  const { state, addExpense, deleteExpense } = useAppStore();
  const expensesRef = useRef<HTMLDivElement>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'رواتب وأجور',
    description: ''
  });

  const categories = ['رواتب وأجور', 'كهرباء ومياه', 'صيانة الماكينات', 'إيجار', 'ضيافة وبوفيه', 'مصاريف إدارية', 'أخرى'];

  const sortedExpenses = useMemo(() => {
    const getTimestamp = (dStr: string) => {
      const t = new Date(dStr).getTime();
      return isNaN(t) ? 0 : t;
    };

    return [...state.expenses].filter(exp => {
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (exp.description && exp.description.toLowerCase().includes(q)) || exp.category.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      const timeA = getTimestamp(exp_date(a.date));
      const timeB = getTimestamp(exp_date(b.date));
      if (timeA !== timeB) {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      return sortOrder === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
    });

    function exp_date(d: string) { return d; }
  }, [state.expenses, sortOrder, categoryFilter, searchTerm]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category) return;
    
    addExpense({
      date: new Date(newExpense.date).toISOString(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      description: newExpense.description
    });
    
    setNewExpense({ ...newExpense, amount: '', description: '' });
    setShowAddForm(false);
  };

  const totalExpenses = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const user = state.currentUser;
  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin || (user?.permissions?.canDelete ?? false);

  const handleExportPDF = async () => {
    await exportDataToPDF({
      title: 'سجل المصروفات التشغيلية والعمومية',
      filename: `سجل_المصروفات_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'category', label: 'بند الصرف', type: 'string' },
        { key: 'description', label: 'البيان', type: 'string' },
        { key: 'amount', label: 'المبلغ', type: 'number' },
      ],
      data: state.expenses,
      summaryColumns: ['amount']
    });
  };

  const handleExportExcel = () => {
    exportCustomExcel({
      title: 'سجل المصروفات العامة',
      filename: `سجل_المصروفات_${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { key: 'date', label: 'التاريخ', type: 'date' },
        { key: 'category', label: 'بند الصرف', type: 'string' },
        { key: 'description', label: 'البيان', type: 'string' },
        { key: 'amount', label: 'المبلغ', type: 'number' },
      ],
      data: state.expenses,
      summaryColumns: ['amount']
    });
  };

  return (
    <div className="space-y-6" ref={expensesRef} id="expenses-view-container">
      {/* Modern Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-rose-600 rounded-2xl shadow-lg shadow-rose-200">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            الخزينة والمصروفات العامة
          </h1>
          <p className="text-slate-500 font-bold mt-2 mr-14">متابعة المصروفات التشغيلية والعمومية وحركة السيولة</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => {
              if (expensesRef.current) triggerNativePrint(expensesRef.current, 'تقرير_المصروفات_العامة');
              else window.print();
            }} 
            className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-black transition-all flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 shadow-sm active:scale-95"
          >
            <Printer className="w-5 h-5"/> 
            طباعة
          </button>
          
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={handleExportPDF} 
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-black transition-all flex items-center gap-2 hover:bg-emerald-700 shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white"/> 
              طباعة وتصدير (PDF)
            </button>
          </div>

          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 ${showAddForm ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'}`}
          >
            {showAddForm ? 'إلغاء العملية' : <><Plus className="w-6 h-6" /> إضافة مصروف جديد</>}
          </button>
        </div>
      </div>

      {/* Modern Summary Card */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm group hover:border-rose-200 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-rose-50 text-rose-600 rounded-3xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-10 h-10" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إجمالي المصروفات التشغيلية</p>
              <h3 className="text-4xl font-black text-slate-900 mt-1">{totalExpenses.toLocaleString()} <span className="text-lg">ج.م</span></h3>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">سجل المصروفات المعتمدة</span>
            <p className="text-[10px] font-bold text-slate-400 mt-2 text-left">محدث حتى: {new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-600"></div>
          <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
            تسجيل إذن صرف جديد
            <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">بيانات العملية</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">تاريخ الصرف</label>
              <input 
                type="date" required
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-800 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1 text-rose-600">المبلغ الإجمالي</label>
              <div className="relative">
                <input 
                  type="number" min="0" step="0.01" required
                  value={newExpense.amount}
                  onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                  className="w-full pr-5 pl-12 py-4 bg-rose-50/30 border border-rose-100 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-black text-rose-700 text-lg"
                  placeholder="0.00"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-400">ج.م</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">بند الصرف (التصنيف)</label>
              <select 
                required
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-800 transition-all appearance-none"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-1">البيان / ملاحظات</label>
              <input 
                type="text" required
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-800 transition-all"
                placeholder="مثال: فاتورة كهرباء شهر 5"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button type="submit" className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all shadow-lg active:scale-95">
              حفظ وتأكيد المصروف
            </button>
          </div>
        </form>
      )}

      {/* Modern Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-rose-600 rounded-full"></div>
            <h2 className="font-black text-slate-900">سجل المصروفات المعتمدة ({sortedExpenses.length})</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as any)}
              className="px-3 py-1.5 border border-rose-200 text-rose-950 font-bold rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/50"
            >
              <option value="desc">الترتيب: الأحدث أولاً (تنازلي)</option>
              <option value="asc">الترتيب: الأقدم أولاً (تصاعدي)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            >
              <option value="all">جميع البنود</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div className="relative flex-1 md:w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث في البيان..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                <th className="px-6 py-5">تاريخ الصرف</th>
                <th className="px-6 py-5 text-center">بند الصرف</th>
                <th className="px-6 py-5">البيان والتفاصيل</th>
                <th className="px-6 py-5 text-center">المبلغ</th>
                <th className="px-6 py-5 text-center w-24">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Wallet className="w-16 h-16 text-slate-100 mb-4" />
                      <p className="text-lg font-black text-slate-300">لم يتم العثور على مصروفات مطابقة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedExpenses.map(exp => (
                  <tr key={exp.id} className="group hover:bg-rose-50/30 transition-all">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{new Date(exp.date).toLocaleDateString('ar-EG')}</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">{new Date(exp.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="bg-white text-rose-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-rose-100">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{exp.description}</p>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-base font-black text-rose-600">{exp.amount.toLocaleString()}</span>
                        <span className="text-[9px] font-black text-rose-300 uppercase">ج.م</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {canDelete && (
                        <button 
                          onClick={() => setConfirmDeleteId(exp.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="تأكيد حذف المصروف"
        message="هل أنت متأكد من رغبتك في حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={() => {
          if (confirmDeleteId) deleteExpense(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
