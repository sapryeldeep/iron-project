import { useState } from 'react';
import { useAppStore } from '../store';
import { Person, EntityType } from '../types';
import { getBalanceDisplayInfo, formatCurrency } from '../utils/accountingUtils';
import { Plus, Search, Edit2, FileText, X, Download, Printer, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportCustomExcel, exportDataToPDF } from '../utils/export';
import AccountStatementModal from './AccountStatementModal';
import ConfirmModal from './ConfirmModal';

interface PersonsViewProps {
  type: EntityType;
}

export default function PersonsView({ type }: PersonsViewProps) {
  const { state, addClient, addSupplier, updateClient, updateSupplier, deleteClient, deleteSupplier } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [statementPerson, setStatementPerson] = useState<Person | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const user = state.currentUser;
  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin || (user?.permissions?.canDelete ?? false);

  const persons = type === 'client' ? state.clients : state.suppliers;
  const filteredPersons = persons.filter(p => 
    p.name.includes(searchTerm) || p.phone.includes(searchTerm)
  );

  const title = type === 'client' ? 'العملاء' : 'الموردين';
  const addButtonText = type === 'client' ? 'إضافة عميل' : 'إضافة مورد';

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<Person> = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      openingBalance: Number(formData.get('openingBalance')) || 0,
      type: type,
    };

    if (type === 'client') {
      const creditLimit = formData.get('creditLimit');
      data.creditLimit = creditLimit ? Number(creditLimit) : 0;
    }

    if (editingPerson) {
      type === 'client' ? updateClient(editingPerson.id, data) : updateSupplier(editingPerson.id, data);
    } else {
      type === 'client' ? addClient(data as Omit<Person, 'id' | 'balance'>) : addSupplier(data as Omit<Person, 'id' | 'balance'>);
    }
    
    setIsModalOpen(false);
    setEditingPerson(null);
  };

  const handleExportAllToExcel = () => {
    const columns = [
      { key: 'name', label: 'الاسم', type: 'string' as const },
      { key: 'phone', label: 'رقم الهاتف', type: 'string' as const },
      { key: 'address', label: 'العنوان', type: 'string' as const },
      { key: 'balance', label: 'الرصيد الحالي', type: 'number' as const },
      ...(type === 'client' ? [{ key: 'creditLimit', label: 'الحد الائتماني', type: 'number' as const }] : [])
    ];

    const data = filteredPersons.map(p => ({
      name: p.name,
      phone: p.phone || 'غير مسجل',
      address: p.address || 'غير محدد',
      balance: p.balance,
      ...(type === 'client' ? { creditLimit: p.creditLimit || 0 } : {})
    }));

    exportCustomExcel({
      title: `بيان كشف وأرصدة ${title}`,
      filename: `بيان_${title}`,
      columns,
      data,
      sheetName: title,
      summaryColumns: ['balance']
    });
  };

  const handleExportAllToPDF = async () => {
    const columns = [
      { key: 'index', label: 'م', type: 'number' },
      { key: 'name', label: 'الاسم', type: 'string' },
      { key: 'phone', label: 'رقم الهاتف', type: 'string' },
      { key: 'address', label: 'العنوان', type: 'string' },
      { key: 'balance', label: 'الرصيد الحالي', type: 'number' },
      ...(type === 'client' ? [{ key: 'creditLimit', label: 'الحد الائتماني', type: 'number' }] : [])
    ];

    const data = filteredPersons.map((p, idx) => ({
      index: idx + 1,
      name: p.name,
      phone: p.phone || 'غير مسجل',
      address: p.address || 'غير محدد',
      balance: p.balance,
      ...(type === 'client' ? { creditLimit: p.creditLimit || 0 } : {})
    }));

    await exportDataToPDF({
      title: `تقرير شامل - دليل وأرصدة ${title}`,
      filename: `تقرير_${title}`,
      columns,
      data,
      summaryColumns: ['balance']
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (statementPerson) {
    return (
      <AccountStatementModal 
        personId={statementPerson.id} 
        onClose={() => setStatementPerson(null)} 
        fullPage={true}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">إدارة {title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">إجمالي المسجلين: {filteredPersons.length} {type === 'client' ? 'عميل' : 'مورد'}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportAllToPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            title={`تصدير قائمة ${title} إلى PDF`}
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة القائمة (PDF)</span>
          </button>

          <button 
            onClick={() => { setEditingPerson(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {addButtonText}
          </button>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-100/50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو رقم الهاتف..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-classic">
            <thead>
              <tr>
                <th className="w-12 text-center">م</th>
                <th>اسم {type === 'client' ? 'العميل' : 'المورد'}</th>
                <th>رقم الهاتف</th>
                <th>العنوان المسجل</th>
                <th className="text-center">الرصيد المحاسبي (ج.م)</th>
                <th className="text-center">حالة الحساب</th>
                {type === 'client' && <th className="text-center">الحد الائتماني</th>}
                <th className="text-center no-print">الإجراءات والعمليات</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersons.length === 0 ? (
                <tr>
                  <td colSpan={type === 'client' ? 8 : 7} className="px-6 py-12 text-center text-slate-400 font-bold">
                    لا توجد بيانات مسجلة في قائمة {title}
                  </td>
                </tr>
              ) : (
                filteredPersons.map((person, idx) => {
                  const balanceInfo = getBalanceDisplayInfo(person.balance, type as 'client' | 'supplier');
                  
                  return (
                    <tr key={person.id}>
                      <td className="text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="font-bold text-slate-900">
                        <button 
                          onClick={() => setStatementPerson(person)}
                          className="text-blue-700 hover:text-blue-900 hover:underline text-right font-black cursor-pointer"
                        >
                          {person.name}
                        </button>
                      </td>
                      <td className="font-mono text-slate-700 dir-ltr text-right">{person.phone || '-'}</td>
                      <td className="text-slate-600">{person.address || 'غير محدد'}</td>
                      <td className="text-center font-mono font-black text-base">
                        <span className={balanceInfo.status === 'debt' ? 'text-rose-700' : balanceInfo.status === 'credit' ? 'text-emerald-700' : 'text-slate-600'}>
                          {formatCurrency(Math.abs(person.balance))} ج.م
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${balanceInfo.colorClass}`}>
                          {balanceInfo.label}
                        </span>
                      </td>
                      {type === 'client' && (
                        <td className="text-center font-mono font-bold text-slate-700">
                          {person.creditLimit ? (
                            <span>{person.creditLimit.toLocaleString('ar-EG')} ج.م</span>
                          ) : (
                            <span className="text-slate-400 font-normal">غير محدود</span>
                          )}
                        </td>
                      )}
                      <td className="text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setStatementPerson(person)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="عرض كشف الحساب التفصيلي"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            كشف حساب
                          </button>
                          <button 
                            onClick={() => { setEditingPerson(person); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => setConfirmDeleteId(person.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">{editingPerson ? 'تعديل بيانات' : addButtonText}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">الاسم</label>
                <input 
                  required
                  name="name" 
                  defaultValue={editingPerson?.name}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">رقم الهاتف</label>
                <input 
                  required
                  name="phone" 
                  defaultValue={editingPerson?.phone}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">العنوان</label>
                <input 
                  name="address" 
                  defaultValue={editingPerson?.address}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">الرصيد الافتتاحي (ج.م)</label>
                <input 
                  name="openingBalance"
                  type="number"
                  step="0.01"
                  defaultValue={editingPerson?.openingBalance || 0}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  placeholder={type === 'client' ? 'موجب: عليه، سالب: له' : 'موجب: له، سالب: عليه'}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {type === 'client' 
                    ? 'المبالغ الموجبة تعني ديون على العميل لصالحك. السالبة تعني مبالغ للعميل طرفك.' 
                    : 'المبالغ الموجبة تعني ديون لصالح المورد طرفك. السالبة تعني مبالغ لك طرف المورد.'}
                </p>
              </div>
              {type === 'client' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">الحد الائتماني (أقصى مديونية مسموح بها)</label>
                  <input 
                    name="creditLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={editingPerson?.creditLimit || ''}
                    placeholder="اتركه فارغاً لجعله غير محدود"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors">
                  حفظ
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title={`حذف ${type === 'client' ? 'العميل' : 'المورد'}`}
        message={`هل أنت متأكد من حذف "${persons.find(p => p.id === confirmDeleteId)?.name}"؟ سيتم حذف كافة سجلات التعاملات المرتبطة بهذا الحساب.`}
        onConfirm={() => {
          if (confirmDeleteId) {
            type === 'client' ? deleteClient(confirmDeleteId) : deleteSupplier(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
