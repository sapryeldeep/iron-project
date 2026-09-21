import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { InventoryItem } from '../types';
import { roundToTwo, formatCurrency } from '../utils/accountingUtils';
import { PackageSearch, Plus, AlertTriangle, Edit2, Trash2, Printer, FileText, Download, X } from 'lucide-react';
import { exportCustomExcel, exportToPDF, exportDataToPDF } from '../utils/export';
import ConfirmModal from './ConfirmModal';

export default function InventoryView() {
  const { state, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);
  
  const initialFormState = {
    name: '',
    category: 'حديد تسليح',
    customCategory: '',
    openingQuantity: 0,
    minQuantity: 100,
    unit: 'كجم',
    purchasePrice: 0,
    salePrice: 0
  };
  
  const [formData, setFormData] = useState<Partial<InventoryItem> & { customCategory?: string }>(initialFormState);

  const categories = Array.from(new Set([...(state.settings.inventoryCategories || []), ...state.inventory.map(i => i.category)]));
  if (categories.length === 0) categories.push('عام');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = formData.category === 'أخرى' && formData.customCategory ? formData.customCategory : formData.category;
    const submitData = { ...formData, category: finalCategory || categories[0] };
    delete submitData.customCategory;

    if (editingItem) {
      updateInventoryItem(editingItem.id, submitData);
      setEditingItem(null);
    } else {
      addInventoryItem(submitData as Omit<InventoryItem, 'id' | 'lastUpdated' | 'quantity'>);
      setIsAdding(false);
    }
    setFormData({...initialFormState, category: categories[0]});
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData(item);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsAdding(false);
    setFormData({...initialFormState, category: categories[0]});
  };

  const exportExcel = () => {
    const columns = [
      { key: 'name', label: 'اسم الصنف', type: 'string' as const },
      { key: 'category', label: 'التصنيف', type: 'string' as const },
      { key: 'quantity', label: 'الكمية الحالية', type: 'number' as const },
      { key: 'unit', label: 'الوحدة', type: 'string' as const },
      { key: 'minQuantity', label: 'حد الطلب', type: 'number' as const },
      { key: 'purchasePrice', label: 'سعر الشراء', type: 'number' as const },
      { key: 'salePrice', label: 'سعر البيع', type: 'number' as const }
    ];

    const exportData = state.inventory.map(i => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      minQuantity: i.minQuantity,
      purchasePrice: i.purchasePrice,
      salePrice: i.salePrice
    }));

    exportCustomExcel({
      title: 'تقرير جرد وتخمين المخازن والمستودعات التفصيلي',
      columns,
      data: exportData,
      filename: `تقرير_المخزون_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'جرد المخزون',
      summaryColumns: ['quantity', 'purchasePrice', 'salePrice']
    });
  };

  const exportPDF = async () => {
    await exportDataToPDF({
      title: 'تقرير جرد المخزون وحركة الأصناف',
      filename: `تقرير_جرد_المخزون_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { key: 'name', label: 'اسم الصنف', type: 'string' },
        { key: 'category', label: 'التصنيف', type: 'string' },
        { key: 'quantity', label: 'الرصيد', type: 'number' },
        { key: 'unit', label: 'الوحدة', type: 'string' },
        { key: 'purchasePrice', label: 'سعر الشراء', type: 'number' },
        { key: 'salePrice', label: 'سعر البيع', type: 'number' },
      ],
      data: state.inventory,
    });
  };

  const lowStockItems = state.inventory.filter(i => i.quantity <= i.minQuantity);

  const isAdmin = state.currentUser?.role === 'admin';
  const canManage = isAdmin || state.currentUser?.permissions?.canManageInventory;
  const canDownload = isAdmin || state.currentUser?.permissions?.canDownload;
  const canPrint = isAdmin || state.currentUser?.permissions?.canPrint;
  const canDelete = isAdmin || (state.currentUser?.permissions?.canDelete ?? false);
  const canEditPrices = isAdmin || (state.currentUser?.permissions?.canEditPrices ?? true);
  const canViewProfits = isAdmin || (state.currentUser?.permissions?.canViewProfits ?? true);

  const totalPurchaseValue = state.inventory.reduce((acc, item) => acc + (item.quantity * item.purchasePrice), 0);
  const totalSaleValue = state.inventory.reduce((acc, item) => acc + (item.quantity * item.salePrice), 0);
  const totalItemsCount = state.inventory.length;

  return (
    <div className="space-y-6" ref={inventoryRef} id="inventory-view-container">
      {/* Modern Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <PackageSearch className="w-8 h-8 text-white" />
            </div>
            إدارة المخزون والأصناف
          </h1>
          <p className="text-slate-500 font-bold mt-2 mr-14">التحكم في مستويات المخزون، حدود الطلب، وتقييم البضاعة</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {canPrint && (
            <button 
              onClick={() => {
                if (inventoryRef.current) triggerNativePrint(inventoryRef.current, 'تقرير_جرد_المخزون');
                else window.print();
              }} 
              className="bg-white border border-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-black transition-all flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 shadow-sm active:scale-95"
            >
              <Printer className="w-5 h-5"/> 
              طباعة التقرير
            </button>
          )}
          {canDownload && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button 
                onClick={exportPDF} 
                className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-black transition-all flex items-center gap-2 hover:bg-emerald-700 shadow-sm active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white"/> 
                طباعة وتصدير (PDF)
              </button>
            </div>
          )}
          {canManage && !isAdding && !editingItem && (
            <button 
              onClick={() => { setIsAdding(true); setEditingItem(null); setFormData({...initialFormState, category: categories[0]}); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="w-6 h-6" /> 
              إضافة صنف جديد
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <PackageSearch className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إجمالي عدد الأصناف</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalItemsCount.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إجمالي قيمة الشراء</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{totalPurchaseValue.toLocaleString()} <span className="text-xs">ج.م</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-amber-200 transition-all">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">أصناف قاربت النفاذ</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5">{lowStockItems.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-orange-800 mb-1">تنبيه: أصناف قاربت على النفاذ</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockItems.map(item => (
                <span key={item.id} className="bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full font-semibold border border-orange-200">
                  {item.name} (المتبقي: {item.quantity} {item.unit})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal Popup */}
      {(isAdding || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 relative">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-xl">
                  <PackageSearch className="w-6 h-6 text-white" />
                </div>
                {editingItem ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزون'}
              </h3>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-1">اسم الصنف</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800 transition-all" 
                    placeholder="مثال: صاج 2مم"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-1">التصنيف</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800 transition-all"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="أخرى">إضافة تصنيف جديد...</option>
                  </select>
                  {formData.category === 'أخرى' && (
                    <input 
                      type="text" 
                      placeholder="اسم التصنيف الجديد"
                      required
                      value={formData.customCategory || ''} 
                      onChange={e => setFormData({...formData, customCategory: e.target.value})} 
                      className="w-full mt-3 px-5 py-3 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-blue-900" 
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 mr-1">الرصيد الافتتاحي</label>
                    <input required type="number" step="any" value={formData.openingQuantity} onChange={e => setFormData({...formData, openingQuantity: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-slate-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 mr-1">الوحدة</label>
                    <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-slate-800">
                      <option value="كجم">كجم</option>
                      <option value="طن">طن</option>
                      <option value="قطعة">قطعة</option>
                      <option value="متر">متر</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 mr-1">حد الطلب (تنبيه نفاذ)</label>
                  <input required type="number" step="any" value={formData.minQuantity} onChange={e => setFormData({...formData, minQuantity: Number(e.target.value)})} className="w-full px-5 py-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 font-black text-amber-900" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-emerald-600 mr-1">سعر الشراء</label>
                  <div className="relative">
                    <input required type="number" step="any" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} className="w-full pr-5 pl-12 py-3.5 bg-emerald-50/30 border border-emerald-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-black text-emerald-700 text-base" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-500">ج.م</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-blue-600 mr-1">سعر البيع</label>
                  <div className="relative">
                    <input required type="number" step="any" value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: Number(e.target.value)})} className="w-full pr-5 pl-12 py-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-blue-700 text-base" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-500">ج.م</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black transition-all hover:shadow-lg shadow-blue-200 active:scale-95">
                  {editingItem ? 'تحديث بيانات الصنف' : 'تأكيد إضافة الصنف'}
                </button>
                <button type="button" onClick={cancelEdit} className="px-8 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
            <h3 className="font-black text-slate-900">بيانات جرد الأصناف الحالية</h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100">
            عدد العناصر: {state.inventory.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-white">
                <th className="px-6 py-5">بيانات الصنف</th>
                <th className="px-6 py-5 text-center">التصنيف</th>
                <th className="px-6 py-5 text-center">الكمية المتوفرة</th>
                <th className="px-6 py-5 text-center">سعر الشراء</th>
                <th className="px-6 py-5 text-center">سعر البيع</th>
                <th className="px-6 py-5 text-center">القيمة الإجمالية</th>
                <th className="px-6 py-5 text-center w-32">التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.inventory.map(item => {
                const isLow = item.quantity <= item.minQuantity;
                const totalValue = roundToTwo(item.quantity * item.purchasePrice);
                return (
                  <tr key={item.id} className="group hover:bg-blue-50/30 transition-all">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isLow ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                          {item.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{item.name}</span>
                          <span className="text-[10px] font-bold text-slate-400">آخر تعديل: {new Date(item.lastUpdated).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-slate-200/50">{item.category}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className={`text-sm font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.quantity.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{item.unit}</span>
                        {isLow && (
                          <div className="flex items-center gap-1 text-rose-500 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-[9px] font-black">نقص مخزون</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-emerald-600 text-sm">{canViewProfits ? formatCurrency(item.purchasePrice) : '***'}</td>
                    <td className="px-6 py-5 text-center font-bold text-blue-600 text-sm">{formatCurrency(item.salePrice)}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-sm font-black text-slate-900">{canViewProfits ? formatCurrency(totalValue) : '***'}</span>
                        <span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase">إجمالي التقييم</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {canManage && (
                          <button 
                            onClick={() => startEdit(item)} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => setConfirmDeleteId(item.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {state.inventory.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <PackageSearch className="w-16 h-16 text-slate-100 mb-4" />
                      <p className="text-lg font-black text-slate-300">لا توجد أصناف مسجلة حالياً</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {state.inventory.length > 0 && canViewProfits && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-800">
                <tr className="font-black text-slate-900">
                  <td colSpan={5} className="px-6 py-4 text-left">إجمالي قيمة المخزون الحالي (سعر الشراء):</td>
                  <td className="px-6 py-4 text-center font-mono text-lg bg-slate-900 text-white">
                    {formatCurrency(state.inventory.reduce((sum, item) => roundToTwo(sum + (item.quantity * item.purchasePrice)), 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="حذف الصنف من المخزون"
        message={`هل أنت متأكد من حذف الصنف "${state.inventory.find(i => i.id === confirmDeleteId)?.name}" نهائياً من المخازن؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={() => {
          if (confirmDeleteId) deleteInventoryItem(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
