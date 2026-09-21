import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { Invoice, InvoiceItem, EntityType, InventoryItem, ScaleTicket, PaymentMethod } from '../types';
import { 
  calculateInvoiceItemsSubtotal, 
  calculateInvoiceTotals, 
  calculateRemainingAmount,
  calculateInvoiceBalanceEffect 
} from '../utils/accountingUtils';
import { Plus, X, Search, FileText, Eye, Download, Printer, Trash2, Lock, Unlock, RefreshCw, Hash, Scale, ShoppingBag, Save, ArrowRight, UserCheck, Phone, Check, AlertCircle, Building, ChevronDown, Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportCustomExcel, exportDataToPDF } from '../utils/export';
import { exportInvoiceToVectorPDF } from '../utils/invoicePDFExport';
import PrintPreviewModal from './PrintPreviewModal';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import AccountStatementModal from './AccountStatementModal';
import ConfirmModal from './ConfirmModal';
import WarningModal from './WarningModal';
import { calculateSteelWeight, MeasurementUnit } from '../utils/steelCalculator';
import { playWarningAlarm } from '../utils/audioAlarm';

interface InventoryComboboxProps {
  item: Omit<InvoiceItem, 'id'>;
  index: number;
  inventory: InventoryItem[];
  invoiceType: 'sales' | 'purchase' | 'sales_return' | 'purchase_return';
  onSelectInventory: (index: number, inventoryId: string) => void;
  onDescriptionChange: (index: number, text: string) => void;
}

function InventoryCombobox({
  item,
  index,
  inventory,
  invoiceType,
  onSelectInventory,
  onDescriptionChange
}: InventoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(item.description || '');

  useEffect(() => {
    setQuery(item.description || '');
  }, [item.description]);

  const selectedInv = inventory.find(i => i.id === item.inventoryItemId);

  const filteredInventory = inventory.filter(inv => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const nameMatch = inv.name.toLowerCase().includes(q);
    const categoryMatch = (inv.category || '').toLowerCase().includes(q);
    const codeMatch = (inv.id || '').toLowerCase().includes(q);
    return nameMatch || categoryMatch || codeMatch;
  });

  return (
    <div className={`space-y-1 w-full ${isOpen ? 'relative z-[150]' : 'relative z-10'}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onDescriptionChange(index, val);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder="🔍 ابحث بالاسم أو اختر صنفاً من المخزون..."
          className="w-full bg-white border-2 border-slate-300 rounded-xl pl-8 pr-10 py-2.5 outline-none font-black text-xs text-slate-800 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-md transition-all placeholder:text-slate-400"
        />
        <Search className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute left-2 text-slate-500 hover:text-slate-800 p-1 rounded-lg transition-colors"
          title="عرض قائمة أصناف المخزون كاملة"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
      </div>

      {selectedInv ? (
        <div className="flex items-center justify-between text-[11px] bg-emerald-50 border-2 border-emerald-200 text-emerald-950 px-3 py-1.5 rounded-xl font-black shadow-sm mt-1 animate-in fade-in duration-200">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>الصنف المحدد: <strong className="text-emerald-900 text-xs">{selectedInv.name}</strong></span>
            <span className="text-slate-500 font-bold mr-1">(المتوفر: {selectedInv.quantity.toLocaleString()} {selectedInv.unit})</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectInventory(index, '');
              onDescriptionChange(index, '');
              setQuery('');
            }}
            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 transition-all border border-rose-200"
            title="إلغاء ربط الصنف الحالي"
          >
            إلغاء الربط ✕
          </button>
        </div>
      ) : null}

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[140]" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border-2 border-slate-300 rounded-xl shadow-[0_12px_36px_rgba(15,23,42,0.18)] z-[150] max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-2.5 bg-slate-100 text-[11px] font-black text-slate-700 flex justify-between items-center border-b border-slate-300 sticky top-0 z-10">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <span>قائمة أصناف المخزن المتوفرة ({filteredInventory.length})</span>
              </span>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 px-2 py-0.5 rounded-md font-black text-xs transition-colors"
              >
                إغلاق ✕
              </button>
            </div>

            {filteredInventory.length > 0 ? (
              filteredInventory.map(inv => {
                const isSelected = inv.id === item.inventoryItemId;
                const price = invoiceType === 'sales' ? inv.salePrice : inv.purchasePrice;
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => {
                      onSelectInventory(index, inv.id);
                      setQuery(inv.name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right p-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between text-xs ${
                      isSelected ? 'bg-blue-100/70 font-black text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        {inv.name}
                        {inv.category && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                            {inv.category}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        الرصيد بالمخزن: <span className="font-bold text-emerald-700">{inv.quantity.toLocaleString()} {inv.unit}</span>
                      </div>
                    </div>

                    <div className="text-left font-bold text-blue-700 shrink-0 mr-2">
                      <div className="text-xs font-mono font-black">{price.toLocaleString()} ج.م</div>
                      <div className="text-[10px] text-slate-400">{inv.unit === 'طن' || inv.unit === 'Tons' ? 'للطن' : 'للكيلو/القطعة'}</div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs font-bold text-slate-500">
                لا توجد أصناف في المخزن تطابق "{query}"
              </div>
            )}

            {query.trim() && (
              <button
                type="button"
                onClick={() => {
                  onSelectInventory(index, '');
                  onDescriptionChange(index, query);
                  setIsOpen(false);
                }}
                className="w-full text-right p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black transition-colors flex items-center gap-2"
              >
                <span>➕ اعتماد "{query}" كبيان أو وصف يدوي بدون ربط بالمخزن</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface LaserCalculatorWidgetProps {
  inventory: InventoryItem[];
  invoiceType: 'sales' | 'purchase' | 'sales_return' | 'purchase_return';
  onAddItem: (item: Omit<InvoiceItem, 'id'>) => void;
}

function LaserCalculatorWidget({ inventory, invoiceType, onAddItem }: LaserCalculatorWidgetProps) {
  const { state } = useAppStore();
  const [description, setDescription] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [unit, setUnit] = useState<MeasurementUnit>('cm');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [thickness, setThickness] = useState<number | ''>('');
  const [sheetsCount, setSheetsCount] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');

  const handleSelectInventoryItem = (invId: string) => {
    setSelectedInventoryId(invId);
    const inv = inventory.find(i => i.id === invId);
    if (inv) {
      setDescription(inv.name);
      const basePrice = invoiceType === 'sales' ? inv.salePrice : inv.purchasePrice;
      const isTon = inv.unit === 'طن' || inv.unit === 'Tons';
      if (isTon && basePrice > 1000) {
        setUnitPrice(basePrice / 1000);
      } else {
        setUnitPrice(basePrice);
      }
    }
  };

  const len = Number(length) || 0;
  const wid = Number(width) || 0;
  const thk = Number(thickness) || 0;
  const sheets = Number(sheetsCount) || 1;
  const price = Number(unitPrice) || 0;

  let singleSheetWeight = 0;
  let totalWeightKg = 0;
  let totalPrice = 0;

  if (len > 0 && wid > 0 && thk > 0) {
    const calc = calculateSteelWeight({
      length: len,
      width: wid,
      thickness: thk,
      lengthUnit: unit,
      widthUnit: unit,
      thicknessUnit: 'mm',
      density: state.settings.defaultDensity || 7.85
    });
    singleSheetWeight = calc.weightKg;
    totalWeightKg = Number((singleSheetWeight * sheets).toFixed(3));
    totalPrice = Number((totalWeightKg * price).toFixed(2));
  }

  const handleAddCalculatedItem = () => {
    if (totalWeightKg <= 0) {
      alert('يرجى إدخال الطول والعرض والسمك بشكل صحيح لحساب الوزن.');
      return;
    }

    const unitLabel = unit === 'mm' ? 'مم' : unit === 'cm' ? 'سم' : 'م';
    const itemDesc = description.trim() 
      ? description 
      : `صاج تشغيل ليزر ${thk}مم (مقاس: ${len}×${wid} ${unitLabel} | عدد: ${sheets} ألواح)`;

    onAddItem({
      inventoryItemId: selectedInventoryId || undefined,
      description: itemDesc,
      dimensionUnit: unit,
      length: len,
      width: wid,
      thickness: thk,
      sheetsCount: sheets,
      quantity: totalWeightKg,
      unitPrice: price,
      total: totalPrice
    });

    setLength('');
    setWidth('');
    setSheetsCount(1);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/90 via-slate-50 to-indigo-50/80 border-2 border-blue-200 rounded-2xl p-4 shadow-sm space-y-3 my-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-100">
        <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
          <Scale className="w-5 h-5 text-blue-600 shrink-0" />
          <span>حاسبة أوزان الصاج والمسطحات المباشرة (تشغيل الليزر والتقطيع) 📐</span>
        </div>
        <span className="text-[11px] font-bold text-slate-500">
          احسب وزن المقاس وضيفه فوراً كبند مستقل للفاتورة
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-3">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            اختر صنف المخزون أو الوصف
          </label>
          <select
            value={selectedInventoryId}
            onChange={(e) => handleSelectInventoryItem(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- اختر من المخزون أو اكتب وصفاً --</option>
            {inventory.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.name} (المتاح: {inv.quantity} {inv.unit})
              </option>
            ))}
          </select>
          {!selectedInventoryId && (
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المقاس أو اسم الصنف..."
              className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium outline-none"
            />
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            وحدة قياس الأبعاد
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
            className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cm">سنتيمتر (سم)</option>
            <option value="mm">ملليمتر (مم)</option>
            <option value="m">متر (م)</option>
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            الطول ({unit === 'mm' ? 'مم' : unit === 'cm' ? 'سم' : 'م'})
          </label>
          <input
            type="number"
            step="0.01"
            value={length}
            onChange={(e) => setLength(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-extrabold text-center outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            العرض ({unit === 'mm' ? 'مم' : unit === 'cm' ? 'سم' : 'م'})
          </label>
          <input
            type="number"
            step="0.01"
            value={width}
            onChange={(e) => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-extrabold text-center outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            السمك (مم)
          </label>
          <input
            type="number"
            step="0.1"
            value={thickness}
            onChange={(e) => setThickness(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="0"
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-extrabold text-center text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            عدد الألواح
          </label>
          <input
            type="number"
            min="1"
            value={sheetsCount}
            onChange={(e) => setSheetsCount(Math.max(1, Number(e.target.value)))}
            placeholder="1"
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-black text-center text-amber-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="lg:col-span-1">
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            سعر الكيلو
          </label>
          <input
            type="number"
            step="0.1"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="ج.م"
            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-black text-center text-emerald-700 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={handleAddCalculatedItem}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة كبند لوح</span>
          </button>
        </div>
      </div>

      {totalWeightKg > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-800 animate-in fade-in">
          <div className="flex items-center gap-4">
            <span className="text-slate-500">
              وزن اللوح الواحد: <strong className="text-blue-900 font-extrabold">{singleSheetWeight.toLocaleString()} كجم</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">
              إجمالي الوزن ({sheets} ألواح): <strong className="text-emerald-700 text-sm font-black">{totalWeightKg.toLocaleString()} كجم</strong>
            </span>
          </div>

          {price > 0 && (
            <div className="text-blue-950 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 font-black">
              إجمالي القيمة: <span className="text-emerald-700 text-sm">{totalPrice.toLocaleString()} ج.م</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface WeighingRow {
  id: string;
  label: string;
  inventoryItemId?: string;
  grossWeight: number;
  tareWeight: number;
  deductionWeight: number;
  netWeight: number;
  pricePerTon: number;
}

interface MultiWeighingScaleWidgetProps {
  inventory: InventoryItem[];
  scaleTickets: ScaleTicket[];
  liveScaleWeight: number;
  invoiceType: 'sales' | 'purchase' | 'sales_return' | 'purchase_return';
  onSyncWeighingsToInvoice: (items: Omit<InvoiceItem, 'id'>[]) => void;
}

function MultiWeighingScaleWidget({
  inventory,
  scaleTickets,
  liveScaleWeight,
  invoiceType,
  onSyncWeighingsToInvoice
}: MultiWeighingScaleWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');

  const [weighings, setWeighings] = useState<WeighingRow[]>([]);

  const handleAddWeighingRow = (grossValue?: number, labelText?: string, invId?: string) => {
    const nextIdx = weighings.length + 1;
    const gross = grossValue !== undefined ? grossValue : (liveScaleWeight > 0 ? liveScaleWeight : 0);
    const tare = 0;
    const net = Math.max(0, gross - tare);
    
    let priceTon = 40000;
    if (invId) {
      const inv = inventory.find(i => i.id === invId);
      if (inv) {
        priceTon = invoiceType === 'sales' ? inv.salePrice : inv.purchasePrice;
        if (priceTon <= 1000) priceTon = priceTon * 1000;
      }
    }

    const newRow: WeighingRow = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: labelText || `وزنة ${nextIdx}`,
      inventoryItemId: invId,
      grossWeight: gross,
      tareWeight: tare,
      deductionWeight: 0,
      netWeight: net,
      pricePerTon: priceTon
    };
    setWeighings(prev => [...prev, newRow]);
  };

  const handleUpdateWeighing = (id: string, field: keyof WeighingRow, val: any) => {
    setWeighings(prev => prev.map(w => {
      if (w.id !== id) return w;
      const updated = { ...w, [field]: val };
      
      if (field === 'inventoryItemId' && val) {
        const inv = inventory.find(i => i.id === val);
        if (inv) {
          updated.label = inv.name;
          let p = invoiceType === 'sales' ? inv.salePrice : inv.purchasePrice;
          if (p <= 1000) p = p * 1000;
          updated.pricePerTon = p;
        }
      }

      const gross = Number(updated.grossWeight) || 0;
      const tare = Number(updated.tareWeight) || 0;
      const ded = Number(updated.deductionWeight) || 0;
      updated.netWeight = Math.max(0, gross - tare - ded);

      return updated;
    }));
  };

  const handleRemoveWeighing = (id: string) => {
    setWeighings(prev => prev.filter(w => w.id !== id));
  };

  const handleCaptureLiveToRow = (id: string) => {
    handleUpdateWeighing(id, 'grossWeight', liveScaleWeight);
  };

  const handleImportTicket = (ticket: ScaleTicket) => {
    const gross = ticket.grossWeight || 0;
    const tare = ticket.tareWeight || 0;
    const ded = ticket.deductionWeight || 0;
    const net = ticket.finalNetWeight || Math.max(0, gross - tare - ded);
    let pTon = ticket.pricePerUnit || 42000;
    if (ticket.priceUnit === 'kg' || pTon <= 1000) {
      pTon = pTon * 1000;
    }

    const importedRow: WeighingRow = {
      id: `w-ticket-${ticket.id}`,
      label: `تذكرة ميزان #${ticket.ticketNumber} - ${ticket.materialName}`,
      inventoryItemId: ticket.inventoryItemId,
      grossWeight: gross,
      tareWeight: tare,
      deductionWeight: ded,
      netWeight: net,
      pricePerTon: pTon
    };

    setWeighings(prev => [...prev, importedRow]);
    setShowImportModal(false);
  };

  const handleSyncAllToInvoice = () => {
    if (weighings.length === 0) {
      alert('لا توجد وزنات مضافة للتحويل.');
      return;
    }

    const convertedItems: Omit<InvoiceItem, 'id'>[] = weighings.map(w => {
      const pricePerKg = w.pricePerTon / 1000;
      const totalAmount = Number((w.netWeight * pricePerKg).toFixed(2));
      return {
        inventoryItemId: w.inventoryItemId || undefined,
        description: w.label ? `${w.label} [ميزان: قائم ${w.grossWeight.toLocaleString()} / فارغ ${w.tareWeight.toLocaleString()} / صافي ${w.netWeight.toLocaleString()} كجم]` : `وزنة ميزان بسكول (${w.netWeight.toLocaleString()} كجم)`,
        quantity: w.netWeight,
        unitPrice: pricePerKg,
        total: totalAmount,
        scaleApproved: true,
        scaleGrossWeight: w.grossWeight,
        scaleTareWeight: w.tareWeight,
        scaleDeductionWeight: w.deductionWeight,
        scaleNetWeight: w.netWeight,
        scaleMode: 'manual'
      };
    });

    onSyncWeighingsToInvoice(convertedItems);
  };

  const totalNetAll = weighings.reduce((sum, w) => sum + (w.netWeight || 0), 0);
  const totalMoneyAll = weighings.reduce((sum, w) => sum + ((w.netWeight || 0) * (w.pricePerTon / 1000)), 0);

  const filteredTickets = scaleTickets.filter(t => 
    t.ticketNumber.includes(ticketSearch) || 
    t.materialName.includes(ticketSearch) || 
    (t.plateNumber && t.plateNumber.includes(ticketSearch))
  );

  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl text-white shadow-xl overflow-hidden my-4">
      {/* Header Bar */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Scale className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
              وزنات الميزان البسكول المباشر (إضافة وزنات متعددة بالفاتورة) ⚖️
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              التقط أكثر من وزنة مباشرة من الميزان وحوّلها تلقائياً إلى بنود فاتورة رسمية دون الخروج من الصفحة
            </p>
          </div>
        </div>

        {/* Live Digital Weight Display */}
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[11px] text-slate-400 font-bold">قراءة الميزان المباشرة:</span>
          </div>
          <div className="text-base font-black text-amber-400 font-mono tracking-wider">
            {liveScaleWeight.toLocaleString()} <span className="text-xs text-slate-300">كجم</span>
            <span className="text-xs text-sky-400 font-bold mr-2">({(liveScaleWeight / 1000).toFixed(3)} طن)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-xl font-bold transition-all text-slate-200"
        >
          {isOpen ? 'إخفاء الشاشة ✕' : 'عرض شاشة الوزنات ⚖️'}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4 bg-slate-900">
          {/* Quick Action Control Panel */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddWeighingRow()}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>📸 التقاط الوزن المباشر وزيادة وزنة جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>📥 استيراد من تذاكر الميزان المحفوظة ({scaleTickets.length})</span>
              </button>
            </div>

            <div className="text-xs text-amber-300 font-bold bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-800/40">
              عدد الوزنات الحالية: <strong className="text-white font-mono text-sm">{weighings.length}</strong> وزنة
            </div>
          </div>

          {/* Weighings Table */}
          {weighings.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 font-black border-b border-slate-800">
                    <th className="p-2.5 text-center w-10">#</th>
                    <th className="p-2.5 min-w-[220px]">بيان / صنف الوزنة</th>
                    <th className="p-2.5 text-center w-36">الوزن القائم (كجم)</th>
                    <th className="p-2.5 text-center w-32">الوزن الفارغ (كجم)</th>
                    <th className="p-2.5 text-center w-28">الخصم (كجم)</th>
                    <th className="p-2.5 text-center w-32">الوزن الصافي (كجم)</th>
                    <th className="p-2.5 text-center w-32">سعر الطن (ج.م)</th>
                    <th className="p-2.5 text-center w-36">إجمالي المبلغ</th>
                    <th className="p-2.5 text-center w-10">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {weighings.map((w, idx) => (
                    <tr key={w.id} className="hover:bg-slate-800/60 transition-colors">
                      <td className="p-2.5 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="space-y-1">
                          <select
                            value={w.inventoryItemId || ''}
                            onChange={(e) => handleUpdateWeighing(w.id, 'inventoryItemId', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 outline-none text-xs font-bold"
                          >
                            <option value="">-- اختر صنفاً من المخزن أو اكتب اسماً --</option>
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (المتاح: {inv.quantity} {inv.unit})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={w.label}
                            onChange={(e) => handleUpdateWeighing(w.id, 'label', e.target.value)}
                            placeholder="وصف الوزنة..."
                            className="w-full bg-slate-950 border border-slate-800 text-amber-200 rounded-lg px-2 py-1 outline-none text-[11px] font-medium"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={w.grossWeight}
                            onChange={(e) => handleUpdateWeighing(w.id, 'grossWeight', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 text-amber-300 font-mono font-bold rounded-lg px-2 py-1 text-center outline-none focus:border-amber-500 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleCaptureLiveToRow(w.id)}
                            className="w-full py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-black rounded border border-amber-500/30 transition-all"
                            title="التقاط القراءة المباشرة الحالية"
                          >
                            📸 التقاط الميزان ({liveScaleWeight.toLocaleString()})
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={w.tareWeight}
                          onChange={(e) => handleUpdateWeighing(w.id, 'tareWeight', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 text-slate-200 font-mono font-bold rounded-lg px-2 py-1 text-center outline-none focus:border-sky-500 text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={w.deductionWeight}
                          onChange={(e) => handleUpdateWeighing(w.id, 'deductionWeight', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 text-rose-400 font-mono font-bold rounded-lg px-2 py-1 text-center outline-none focus:border-rose-500 text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="font-mono font-black text-emerald-400 text-sm bg-slate-950 py-1.5 px-2 rounded-lg border border-slate-800">
                          {w.netWeight.toLocaleString()} <span className="text-[10px] text-slate-400">كجم</span>
                          <div className="text-[10px] text-sky-300 font-normal">({(w.netWeight / 1000).toFixed(3)} طن)</div>
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          value={w.pricePerTon}
                          onChange={(e) => handleUpdateWeighing(w.id, 'pricePerTon', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 text-emerald-300 font-mono font-bold rounded-lg px-2 py-1 text-center outline-none focus:border-emerald-500 text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-amber-300 text-xs">
                        {((w.netWeight * w.pricePerTon) / 1000).toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveWeighing(w.id)}
                          className="p-1 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors"
                          title="حذف هذه الوزنة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold">
              لا توجد وزنات مضافة حالياً. انقر على "📸 التقاط الوزن المباشر وزيادة وزنة جديدة" للبدء.
            </div>
          )}

          {/* Footer Summary & Main Sync Button */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-xs font-bold">
              <div>
                <span className="text-slate-400 block">إجمالي الوزنات:</span>
                <span className="text-sm font-black text-white">{weighings.length} وزنة</span>
              </div>
              <div className="border-r border-slate-800 pr-6">
                <span className="text-slate-400 block">إجمالي الوزن الصافي لكافة الوزنات:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {totalNetAll.toLocaleString()} كجم <span className="text-xs text-sky-300">({(totalNetAll / 1000).toFixed(3)} طن)</span>
                </span>
              </div>
              <div className="border-r border-slate-800 pr-6">
                <span className="text-slate-400 block">إجمالي المبالغ المحسوبة:</span>
                <span className="text-base font-black text-amber-300 font-mono">
                  {totalMoneyAll.toLocaleString()} ج.م
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncAllToInvoice}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-amber-300" />
              <span>⚡ اعتماد وتفريغ كافة الوزنات ({weighings.length}) كبنود في الفاتورة</span>
            </button>
          </div>
        </div>
      )}

      {/* Import Scale Ticket Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                <Download className="w-4 h-4 text-sky-400" />
                استيراد تذكرة ميزان مسجلة مسبقاً بالنظام
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم التذكرة، اسم المادة، رقم السيارة..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-9 pl-4 py-2 text-xs font-bold outline-none focus:border-sky-500 text-white"
              />
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950">
              {filteredTickets.length > 0 ? (
                filteredTickets.map(t => (
                  <div key={t.id} className="p-3 hover:bg-slate-800/80 transition-colors flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-300">
                        تذكرة #{t.ticketNumber} - {t.materialName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        صافي: <strong className="text-emerald-400">{t.finalNetWeight.toLocaleString()} كجم</strong> | قائم: {t.grossWeight.toLocaleString()} | فارغ: {t.tareWeight.toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportTicket(t)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs"
                    >
                      استيراد للوزنات ↵
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">
                  لا توجد تذاكر ميزان مسجلة مطابقة للبحث.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
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

export default function InvoicesView() {
  const { state, addInvoice, deleteInvoice, getSequentialInvoiceNumber, logActivity } = useAppStore();
  const user = state.currentUser;
  const isAdmin = user?.role === 'admin';
  const canPrint = isAdmin || (user?.permissions?.canPrint ?? true);
  const canDelete = isAdmin || (user?.permissions?.canDelete ?? false) || (user?.permissions?.canDeleteInvoices ?? false);
  const canEditPrices = isAdmin || (user?.permissions?.canEditPrices ?? true);

  const [warningModalData, setWarningModalData] = useState<{ isOpen: boolean; title: string; message: string; type?: 'danger' | 'warning' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [statementPersonId, setStatementPersonId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtering
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'sales' | 'purchase' | 'sales_return' | 'purchase_return'>('all');

  // New invoice state
  const [invoiceType, setInvoiceType] = useState<'sales' | 'purchase' | 'sales_return' | 'purchase_return'>('sales');
  const [invoiceCategory, setInvoiceCategory] = useState<'general' | 'manufacturing' | 'laser' | 'bending' | 'strip'>('general');
  const [personId, setPersonId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isAutoNumbered, setIsAutoNumbered] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discount, setDiscount] = useState(0);
  const [freightCost, setFreightCost] = useState(0);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [selectedSourceInvoiceId, setSelectedSourceInvoiceId] = useState<string>('');
  const [itemLayoutMode, setItemLayoutMode] = useState<'table' | 'card'>('table');

  const handleSelectSourceInvoice = (sourceInvId: string) => {
    setSelectedSourceInvoiceId(sourceInvId);
    if (!sourceInvId) return;
    const sourceInv = state.invoices.find(i => i.id === sourceInvId);
    if (sourceInv) {
      if (sourceInv.personId) setPersonId(sourceInv.personId);
      setInvoiceCategory(sourceInv.category);
      setNotes(`مرتجع عن الفاتورة الأصلية رقم #${sourceInv.invoiceNumber}`);
      setItems(sourceInv.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        inventoryItemId: item.inventoryItemId,
        dimensionUnit: item.dimensionUnit,
        length: item.length,
        width: item.width,
        thickness: item.thickness,
        density: item.density,
        manufacturingUnit: item.manufacturingUnit,
        bendsCount: item.bendsCount,
        bendPrice: item.bendPrice
      })));
    }
  };

  const openNewInvoiceModal = (type: 'sales' | 'purchase' | 'sales_return' | 'purchase_return' = invoiceType) => {
    setInvoiceType(type);
    setSelectedSourceInvoiceId('');
    const baseType = (type === 'sales' || type === 'sales_return') ? 'sales' : 'purchase';
    const nextNum = getSequentialInvoiceNumber(baseType as any);
    setInvoiceNumber(type.includes('return') ? `RET-${nextNum}` : nextNum);
    setIsAutoNumbered(true);
    setFreightCost(type === 'sales' ? (state.settings.defaultFreightRate || 0) : 0);
    setIsModalOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTypeChange = (newType: 'sales' | 'purchase' | 'sales_return' | 'purchase_return') => {
    setInvoiceType(newType);
    setPersonId('');
    if (isAutoNumbered) {
      const baseType = (newType === 'sales' || newType === 'sales_return') ? 'sales' : 'purchase';
      const num = getSequentialInvoiceNumber(baseType as any);
      setInvoiceNumber(newType.includes('return') ? `RET-${num}` : num);
    }
  };

  const refreshAutoNumber = () => {
    const baseType = (invoiceType === 'sales' || invoiceType === 'sales_return') ? 'sales' : 'purchase';
    const nextNum = getSequentialInvoiceNumber(baseType as any);
    setInvoiceNumber(invoiceType.includes('return') ? `RET-${nextNum}` : nextNum);
    setIsAutoNumbered(true);
  };

  // Scale Integration States
  const [scaleModalIndex, setScaleModalIndex] = useState<number | null>(null);
  const [scaleTab, setScaleTab] = useState<'ticket' | 'manual' | 'direct' | 'first' | 'second'>('ticket');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [manualGross, setManualGross] = useState<string>('');
  const [manualTare, setManualTare] = useState<string>('');
  const [manualDeduction, setManualDeduction] = useState<string>('');
  const [scaleSearch, setScaleSearch] = useState<string>('');

  const filteredInvoices = state.invoices.filter(i => {
    const matchesSearch = i.invoiceNumber.includes(searchTerm);
    const matchesStart = startDate ? new Date(i.date) >= new Date(startDate) : true;
    const matchesEnd = endDate ? new Date(i.date) <= new Date(endDate) : true;
    const matchesType = listTypeFilter === 'all' ? true : i.type === listTypeFilter;
    return matchesSearch && matchesStart && matchesEnd && matchesType;
  });

  const calculateSubtotal = () => calculateInvoiceItemsSubtotal(items);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setAttachments(prev => [...prev, ev.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAddItem = () => {
    let price = 0;
    let bendsPr = state.settings.defaultBendingRatePerBend || 10; // default to 10 if not set
    if (invoiceCategory === 'laser') {
      price = state.settings.defaultLaserRatePerKg || 0;
    } else if (invoiceCategory === 'bending') {
      price = state.settings.defaultBendingRatePerBend || 10;
    } else if (invoiceCategory === 'manufacturing') {
      price = state.settings.defaultManufacturingRatePerKg || 0;
    }
    setItems([...items, { 
      description: '', 
      quantity: 1, 
      unitPrice: price, 
      total: price,
      bendPrice: bendsPr,
      bendsCount: invoiceCategory === 'bending' ? 1 : undefined,
      manufacturingUnit: invoiceCategory === 'bending' ? 'bend' : 'kg'
    }]);
  };

  const [accumulatedWeight, setAccumulatedWeight] = useState(0);

  const handleReadScale = (index: number) => {
    // Read actual live weight from scale hardware via global store
    const liveWeight = state.liveScaleWeight || 0;
    if (liveWeight <= 0) {
      alert('الميزان غير متصل أو القراءة الحالية 0 كجم. يرجى التأكد من تشغيل الميزان أو فحص القراءة بالهيدر العلوي.');
      return;
    }
    const newItems = [...items];
    const item = { ...newItems[index] };
    item.quantity = liveWeight;
    item.scaleApproved = true;
    item.scaleNetWeight = liveWeight;
    item.total = liveWeight * (item.unitPrice || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleAppendScaleReadingToItem = (index: number) => {
    const liveWeight = state.liveScaleWeight || 0;
    if (liveWeight <= 0) {
      alert('الميزان غير متصل أو القراءة الحالية 0 كجم. يرجى التأكد من تشغيل الميزان بالهيدر العلوي.');
      return;
    }
    const newItems = [...items];
    const item = { ...newItems[index] };
    const prevQty = Number(item.quantity) || 0;
    const newQty = prevQty + liveWeight;
    item.quantity = newQty;
    item.scaleApproved = true;
    item.scaleNetWeight = newQty;
    item.total = newQty * (item.unitPrice || 0);
    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddNewItemFromScale = () => {
    const liveWeight = state.liveScaleWeight || 0;
    const newItem: Omit<InvoiceItem, 'id'> = {
      description: liveWeight > 0 ? `وزنة ميزان (${liveWeight.toLocaleString('ar-EG')} كجم)` : '',
      quantity: liveWeight > 0 ? liveWeight : 1,
      unitPrice: 0,
      total: 0,
      scaleApproved: liveWeight > 0,
      scaleNetWeight: liveWeight > 0 ? liveWeight : undefined
    };
    setItems(prev => {
      if (prev.length === 1 && !prev[0].description && prev[0].quantity === 1 && prev[0].unitPrice === 0) {
        return [newItem];
      }
      return [...prev, newItem];
    });
  };

  const handleInventorySelect = (index: number, inventoryId: string) => {
    const invItem = state.inventory.find(i => i.id === inventoryId);
    if (!invItem) return;
    
    const newItems = [...items];
    const item = { ...newItems[index] };
    item.inventoryItemId = invItem.id;
    item.description = invItem.name;
    const basePrice = invoiceType === 'sales' ? invItem.salePrice : invItem.purchasePrice;
    
    // Invoices operate in kilograms (كجم).
    // If inventory item was recorded in tons (e.g. 45000/ton), convert unit price to per-kg (45/kg)
    const isTon = invItem.unit === 'طن' || invItem.unit === 'Tons';
    if (isTon && basePrice > 1000) {
      item.unitPrice = basePrice / 1000;
    } else {
      item.unitPrice = basePrice;
    }
    
    item.total = item.quantity * item.unitPrice;
    newItems[index] = item;
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === 'description' || field === 'inventoryItemId' || field === 'dimensionUnit' || field === 'manufacturingUnit' || field === 'manufacturingOperation') {
      (item as Record<string, unknown>)[field] = value;
    } else {
      (item as Record<string, unknown>)[field] = Number(value);
    }
      
    // Auto calc logic based on category
    if (invoiceCategory === 'laser') {
      const len = item.length || 0;
      const wid = item.width || 0;
      const thk = item.thickness || 0;
      const den = item.density || state.settings.defaultDensity || 7.85;
      const unit = (item.dimensionUnit || 'm') as MeasurementUnit;
      const sheets = item.sheetsCount && item.sheetsCount > 0 ? item.sheetsCount : 1;
      
      if (len && wid && thk) {
        const calcResult = calculateSteelWeight({
          length: len,
          width: wid,
          thickness: thk,
          lengthUnit: unit,
          widthUnit: unit,
          thicknessUnit: 'mm',
          density: den
        });
        item.quantity = Number((calcResult.weightKg * sheets).toFixed(3));
      }
    }
    if (invoiceCategory === 'bending') {
      const count = item.bendsCount || 0;
      const price = item.bendPrice || 0;
      item.total = count * price;
    } else {
      item.total = item.quantity * item.unitPrice;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleOpenScaleModal = (index: number) => {
    setScaleModalIndex(index);
    const item = items[index];
    if (item.scaleApproved) {
      setScaleTab(item.scaleMode || 'ticket');
      setSelectedTicketId(item.scaleTicketId || '');
      setManualGross(item.scaleGrossWeight?.toString() || '');
      setManualTare(item.scaleTareWeight?.toString() || '');
      setManualDeduction(item.scaleDeductionWeight?.toString() || '');
    } else {
      setScaleTab('ticket');
      setSelectedTicketId('');
      setManualGross('');
      setManualTare('');
      setManualDeduction('');
    }
  };

  const handleApplyScale = () => {
    if (scaleModalIndex === null) return;
    const newItems = [...items];
    const item = { ...newItems[scaleModalIndex] };

    if (scaleTab === 'ticket') {
      const ticket = state.scaleTickets.find(t => t.id === selectedTicketId);
      if (!ticket) {
        alert('الرجاء اختيار تذكرة ميزان صالحة');
        return;
      }
      
      item.scaleApproved = true;
      item.scaleMode = 'ticket';
      item.scaleTicketId = ticket.id;
      item.scaleGrossWeight = ticket.grossWeight;
      item.scaleTareWeight = ticket.tareWeight;
      item.scaleDeductionWeight = ticket.deductionWeight || 0;
      item.scaleNetWeight = ticket.finalNetWeight;
      
      // Net weight is ALWAYS set in KILOS (كجم) as requested
      item.quantity = ticket.finalNetWeight;
      const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
      if (invItem && (invItem.unit === 'طن' || invItem.unit === 'Tons') && item.unitPrice > 1000) {
        item.unitPrice = item.unitPrice / 1000;
      }
      
      const cleanedDesc = item.description.replace(/\s*\[ميزان معتمد.*?\]/g, '');
      item.description = `${cleanedDesc} [ميزان معتمد تذكرة رقم: #${ticket.ticketNumber}]`.trim();
      
    } else {
      const gross = Number(manualGross) || 0;
      const tare = Number(manualTare) || 0;
      const deduction = Number(manualDeduction) || 0;
      const net = Math.max(gross - tare - deduction, 0);

      if (gross <= 0) {
        alert('الرجاء إدخال الوزن القائم بشكل صحيح');
        return;
      }

      item.scaleApproved = true;
      item.scaleMode = 'manual';
      item.scaleTicketId = undefined;
      item.scaleGrossWeight = gross;
      item.scaleTareWeight = tare;
      item.scaleDeductionWeight = deduction;
      item.scaleNetWeight = net;

      // Net weight is ALWAYS set in KILOS (كجم) as requested
      item.quantity = net;
      const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
      if (invItem && (invItem.unit === 'طن' || invItem.unit === 'Tons') && item.unitPrice > 1000) {
        item.unitPrice = item.unitPrice / 1000;
      }

      const cleanedDesc = item.description.replace(/\s*\[ميزان معتمد.*?\]/g, '');
      item.description = `${cleanedDesc} [ميزان يدوي معتمد: قائم ${gross} - فارغ ${tare} - صافي ${net} كجم]`.trim();
    }

    item.total = item.quantity * item.unitPrice;
    newItems[scaleModalIndex] = item;
    setItems(newItems);
    setScaleModalIndex(null);
  };

  const handleClearScale = (index: number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    item.scaleApproved = false;
    item.scaleGrossWeight = undefined;
    item.scaleTareWeight = undefined;
    item.scaleDeductionWeight = undefined;
    item.scaleNetWeight = undefined;
    item.scaleTicketId = undefined;
    item.scaleMode = undefined;
    
    item.description = item.description.replace(/\s*\[ميزان معتمد.*?\]/g, '');
    
    newItems[index] = item;
    setItems(newItems);
  };

  const handleSave = (e: React.FormEvent, bypassAudit = false) => {
    if (e) e.preventDefault();
    
    const baseType = (invoiceType === 'sales' || invoiceType === 'sales_return') ? 'sales' : 'purchase';
    const finalInvNumber = invoiceNumber.trim() || getSequentialInvoiceNumber(baseType);

    if (!personId) {
      alert((invoiceType === 'sales' || invoiceType === 'sales_return') ? 'يرجى تحديد العميل' : 'يرجى تحديد المورد');
      return;
    }

    const subtotal = calculateSubtotal();
    const total = calculateInvoiceTotals(subtotal, freightCost, discount);
    const remainingAmount = calculateRemainingAmount(total, paidAmount);

    // Validate that every item has at least a description or inventory selection
    for (const item of items) {
      const trimmedDesc = item.description?.trim() || '';
      
      // If description and inventoryItemId are both empty, block saving
      if (!item.inventoryItemId && !trimmedDesc) {
        playWarningAlarm();
        setWarningModalData({
          isOpen: true,
          title: 'بيانات الصنف ناقصة ⚠️',
          message: `يرجى إدخال وصف الصنف أو تكلفة التصنيع أو اختيار صنف من قائمة المخزن قبل الحفظ.`,
          type: 'warning'
        });
        return;
      }
    }

    // Inventory Stock Level Validation
    if (invoiceType === 'sales' || invoiceType === 'purchase_return') {
      for (const item of items) {
        if (item.inventoryItemId) {
          const invItem = state.inventory.find(i => i.id === item.inventoryItemId);
          if (invItem) {
            const isTon = invItem.unit === 'طن' || invItem.unit === 'Tons';
            const requiredInStock = isTon ? item.quantity / 1000 : item.quantity;
            
            if (requiredInStock > invItem.quantity) {
              const displayReq = isTon ? `${item.quantity.toLocaleString()} كجم (${requiredInStock.toFixed(3)} طن)` : `${item.quantity.toLocaleString()} ${invItem.unit}`;
              playWarningAlarm();
              setWarningModalData({
                isOpen: true,
                title: 'تجاوز رصيد المخزون المتاح ⚠️',
                message: `الكمية المطلوبة من الصنف (${invItem.name}) وهي [${displayReq}] تتجاوز الرصيد المتاح حالياً بالمخزن [${invItem.quantity} ${invItem.unit}]. لا يمكن حفظ الفاتورة بدون رصيد كافٍ. يرجى تزويد المخزون أو تصحيح الكمية أولاً.`,
                type: 'warning'
              });
              return;
            }
          }
        }
      }
    }

    // Credit Limit Validation
    if (invoiceType === 'sales' && remainingAmount > 0) {
      const client = state.clients.find(c => c.id === personId);
      if (client && client.creditLimit && client.creditLimit > 0) {
        const newBalance = client.balance + remainingAmount;
        if (newBalance > client.creditLimit) {
          playWarningAlarm();
          setWarningModalData({
            isOpen: true,
            title: 'تجاوز الحد الائتماني للعميل 🛑',
            message: `لا يمكن حفظ الفاتورة. رصيد العميل بعد هذه الفاتورة سيبلغ (${newBalance.toLocaleString()} ج.م) وهذا يتجاوز أقصى حد ائتماني مسموح به لهذا العميل (${client.creditLimit.toLocaleString()} ج.م).`,
            type: 'danger'
          });
          return;
        }
      }
    }

    // Audit: Duplicate check
    if (!bypassAudit) {
      const isDuplicate = state.invoices.some(i => i.invoiceNumber === finalInvNumber || (i.personId === personId && i.total === total && new Date(i.date).toDateString() === new Date().toDateString()));
      if (isDuplicate) {
        playWarningAlarm();
        setShowDuplicateWarning(true);
        return;
      }
    } else {
      logActivity('تأكيد فاتورة متطابقة/مكررة', `تم حفظ فاتورة مكررة برقم ${finalInvNumber} وتجاوز التدقيق.`);
    }

    const personType: EntityType = (invoiceType === 'sales' || invoiceType === 'sales_return') ? 'client' : 'supplier';

    const finalSubtotal = calculateInvoiceItemsSubtotal(items);
    const invoiceTotal = calculateInvoiceTotals(finalSubtotal, freightCost, discount);
    const invoiceRemaining = calculateRemainingAmount(invoiceTotal, paidAmount);

    // Construct final list of items, appending freight cost if set
    let finalItems = [...items];
    if (freightCost > 0) {
      finalItems.push({
        description: 'ناولون شحن ونقل السيارة',
        quantity: 1,
        unitPrice: freightCost,
        total: freightCost,
        manufacturingUnit: 'piece'
      });
    }

    const result = addInvoice({
      invoiceNumber: finalInvNumber,
      personId,
      personType,
      type: invoiceType,
      category: invoiceCategory,
      date: invoiceDate,
      items: finalItems.map((it, idx) => ({ ...it, id: `item-${idx}` })),
      subtotal: finalSubtotal,
      discount,
      total: invoiceTotal,
      paidAmount,
      paymentMethod,
      remainingAmount: invoiceRemaining,
      notes: notes || '',
      attachments,
      isAudited: true,
      freightCost: freightCost || 0
    });

    if (!result.success) {
      alert(result.error);
      return;
    }

    logActivity('إضافة فاتورة جديدة', `تم إضافة فاتورة ${invoiceType === 'sales' ? 'مبيعات' : 'مشتريات'} برقم ${finalInvNumber} بقيمة ${total} ج.م`);

    setIsModalOpen(false);
    setShowDuplicateWarning(false);
    // Reset form
    setInvoiceNumber('');
    setIsAutoNumbered(true);
    setPersonId('');
    setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    setPaidAmount(0);
    setDiscount(0);
    setFreightCost(0);
    setAttachments([]);
    setInvoiceCategory('general');
  };

  const personsList = (invoiceType === 'sales' || invoiceType === 'sales_return') ? state.clients : state.suppliers;

  const handleExportSingleInvoicePDF = async (invoice: Invoice) => {
    const person = invoice.personType === 'client' 
      ? state.clients.find(c => c.id === invoice.personId) 
      : state.suppliers.find(s => s.id === invoice.personId);

    await exportInvoiceToVectorPDF({
      invoice,
      person,
      settings: state.settings,
      filename: `فاتورة_${invoice.invoiceNumber}_${person?.name || ''}`,
      notes: state.settings?.invoiceNotes
    });
  };

  const handleExportInvoicesListPDF = async () => {
    const columns = [
      { key: 'index', label: 'م', type: 'number' },
      { key: 'invoiceNumber', label: 'رقم الفاتورة', type: 'string' },
      { key: 'date', label: 'التاريخ', type: 'date' },
      { key: 'typeLabel', label: 'النوع', type: 'string' },
      { key: 'personName', label: 'الطرف (عميل/مورد)', type: 'string' },
      { key: 'total', label: 'الإجمالي (ج.م)', type: 'number' },
      { key: 'paidAmount', label: 'المدفوع (ج.م)', type: 'number' },
      { key: 'remainingAmount', label: 'المتبقي (ج.م)', type: 'number' },
    ];

    const data = filteredInvoices.map((inv, idx) => {
      const person = inv.personType === 'client'
        ? state.clients.find(c => c.id === inv.personId)
        : state.suppliers.find(s => s.id === inv.personId);

      const typeLabel = inv.type === 'sales' ? 'مبيعات' : inv.type === 'sales_return' ? 'مرتجع مبيعات' : inv.type === 'purchase_return' ? 'مرتجع مشتريات' : 'مشتريات';

      return {
        index: idx + 1,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        typeLabel,
        personName: person?.name || 'طرف نقدي عام',
        total: inv.total,
        paidAmount: inv.paidAmount,
        remainingAmount: inv.remainingAmount
      };
    });

    await exportDataToPDF({
      title: `تقرير كشف الفواتير الشامل (${listTypeFilter === 'all' ? 'جميع الفواتير' : listTypeFilter})`,
      filename: `كشف_الفواتير_${new Date().toISOString().slice(0, 10)}`,
      columns,
      data,
      summaryColumns: ['total', 'paidAmount', 'remainingAmount']
    });
  };

  const handleExportExcel = (invoice: Invoice) => {
    const person = invoice.personType === 'client' 
      ? state.clients.find(c => c.id === invoice.personId) 
      : state.suppliers.find(s => s.id === invoice.personId);

    const columns = [
      { key: 'description', label: 'الصنف / البيان', type: 'string' as const },
      { key: 'quantity', label: 'الكمية / الوزن (كجم)', type: 'number' as const },
      { key: 'unitPrice', label: 'سعر الوحدة (ج.م)', type: 'number' as const },
      { key: 'total', label: 'الإجمالي الفرعي (ج.م)', type: 'formula' as const, formula: (row: number) => `B${row}*C${row}` }
    ];

    const exportData = invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));

    exportCustomExcel({
      title: `فاتورة ${invoice.type === 'sales' ? 'مبيعات' : 'مشتريات'} رقم: ${invoice.invoiceNumber}`,
      companyName: state.settings?.companyName || "إنجاز لتجارة الحديد والصلب",
      columns,
      data: exportData,
      filename: `فاتورة_${invoice.invoiceNumber}_${person?.name || ''}`,
      sheetName: `فاتورة_${invoice.invoiceNumber}`,
      summaryColumns: ['total']
    });
  };

  const handlePrint = () => {
    const printableArea = document.getElementById('printable-area');
    if (printableArea) {
      triggerNativePrint(printableArea, `فاتورة_${viewingInvoice?.invoiceNumber || ''}`);
    } else {
      window.print();
    }
  };

  const renderScaleModal = () => {
    if (scaleModalIndex === null) return null;
    const grossVal = Number(manualGross) || 0;
    const tareVal = Number(manualTare) || 0;
    const deductionVal = Number(manualDeduction) || 0;
    const calculatedNet = Math.max(grossVal - tareVal - deductionVal, 0);

    const filteredTickets = state.scaleTickets.filter(t => {
      const p = [...state.clients, ...state.suppliers].find(person => person.id === t.personId);
      const searchStr = `${t.ticketNumber} ${t.plateNumber} ${t.materialName} ${p?.name || ''}`.toLowerCase();
      return searchStr.includes(scaleSearch.toLowerCase());
    });

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-blue-100">
          <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" />
              مساعد الموازين المعتمد وتحديد الأوزان
            </h3>
            <button onClick={() => setScaleModalIndex(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-100/50 p-1.5 shrink-0">
            <button 
              type="button"
              onClick={() => setScaleTab('ticket')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${scaleTab === 'ticket' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
            >
              📋 اعتماد تذكرة ميزان مسجلة
            </button>
            <button 
              type="button"
              onClick={() => setScaleTab('manual')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${scaleTab === 'manual' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
            >
              ✍️ إدخال بيانات الأوزان يدوياً
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {scaleTab === 'ticket' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 font-bold mb-2">
                  <span>يرجى اختيار تذكرة ميزان معتمدة أدناه؛ سيتم تطبيق الوزن الصافي بالكيلوجرام (كجم) مباشرة في الفاتورة.</span>
                </div>

                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="ابحث برقم التذكرة، رقم السيارة، أو اسم الطرف..."
                    value={scaleSearch}
                    onChange={e => setScaleSearch(e.target.value)}
                    className="w-full pl-4 pr-9 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-[35vh] divide-y divide-slate-100">
                  {filteredTickets.map(ticket => {
                    const isSelected = selectedTicketId === ticket.id;
                    return (
                      <div 
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`p-3.5 cursor-pointer hover:bg-slate-50 transition-all flex justify-between items-center ${isSelected ? 'bg-blue-50/70 border-r-4 border-blue-600' : ''}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">تذكرة رقم: #{ticket.ticketNumber}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black">{ticket.plateNumber}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-bold">الطرف: {ticket.personName || 'غير محدد'} | المادة: {ticket.materialName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">التاريخ: {new Date(ticket.createdAt).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-black text-blue-700">{ticket.finalNetWeight?.toLocaleString()} كجم</span>
                          <span className="text-[10px] text-slate-400 font-bold">وزن صافي معتمد</span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredTickets.length === 0 && (
                    <p className="p-6 text-center text-slate-400 text-sm font-semibold">لا توجد تذاكر ميزان مطابقة</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs text-emerald-800 font-bold mb-2">
                  <span>قم بإدخال بيانات الميزان (قائم وفارغ وخصم) يدوياً، وسيقوم النظام بحساب الوزن الصافي واعتماده بالكيلوجرام (كجم).</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">الوزن القائم (كجم)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={manualGross}
                      onChange={e => setManualGross(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">الوزن الفارغ (كجم)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={manualTare}
                      onChange={e => setManualTare(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">وزن الخصم/الشوائب (كجم)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={manualDeduction}
                      onChange={e => setManualDeduction(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-rose-600"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center mt-4">
                  <div>
                    <span className="block text-xs text-slate-400 font-bold">الوزن الصافي المحسوب</span>
                    <span className="text-3xl font-black text-emerald-600">{calculatedNet.toLocaleString()} كجم</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold leading-relaxed text-left">
                    <div>قائم: {grossVal.toLocaleString()} كجم</div>
                    <div>فارغ: {tareVal.toLocaleString()} كجم</div>
                    <div className="text-rose-500">خصم: - {deductionVal.toLocaleString()} كجم</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-xl flex gap-3 shrink-0">
            <button 
              type="button"
              onClick={handleApplyScale}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Scale className="w-5 h-5" />
              اعتماد وتطبيق الوزن بالكيلو (كجم) ⚖️
            </button>
            <button 
              type="button" 
              onClick={() => setScaleModalIndex(null)}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 rounded-lg font-bold transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  };

  // If user opened invoice creation, display the full-page creation interface
  if (isModalOpen) {
    const selectedPerson = personsList.find(p => p.id === personId);
    const previousBalanceVal = selectedPerson?.balance || 0;
    const subtotal = calculateSubtotal();
    const invoiceVal = calculateInvoiceTotals(subtotal, freightCost, discount);
    const balanceChange = calculateInvoiceBalanceEffect(invoiceType, invoiceVal, paidAmount);
    
    const newEstimatedBalanceVal = previousBalanceVal + balanceChange;

    return (
      <div className="space-y-4 pb-16 animate-in fade-in duration-200">
        {/* Full-Page Screen Top Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
              title="الرجوع لقائمة الفواتير"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900">
                  {invoiceType === 'sales' ? 'إنشاء فاتورة مبيعات جديدة' : 
                   invoiceType === 'purchase' ? 'تسجيل فاتورة مشتريات وتوريد' : 
                   invoiceType === 'sales_return' ? 'تسجيل مرتجع مبيعات عميل ↩️' : 
                   'تسجيل مرتجع مشتريات لمورد ↪️'}
                </h1>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  invoiceType === 'sales' ? 'bg-blue-100 text-blue-800' :
                  invoiceType === 'purchase' ? 'bg-slate-800 text-white' :
                  invoiceType === 'sales_return' ? 'bg-amber-100 text-amber-800' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  {invoiceType === 'sales' ? 'مبيعات' : invoiceType === 'purchase' ? 'مشتريات' : invoiceType === 'sales_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                بيانات الفاتورة وتحديد الأصناف مع ربط المخزون والميزان المعتمد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 md:flex-initial px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all"
            >
              إلغاء والعودة
            </button>
            <button 
              onClick={(e) => handleSave(e)}
              className="flex-1 md:flex-initial px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              حفظ وإصدار الفاتورة
            </button>
          </div>
        </div>

        {/* Top Ribbon (الشريط العلوي الموحد لاختيار الطرف والعملية) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
          {/* Row 1: Invoice Operation Type Selector & Category */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">نوع العملية:</span>
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button 
                  type="button"
                  onClick={() => handleTypeChange('sales')}
                  className={`py-1.5 px-3 text-xs font-black rounded-lg transition-all ${invoiceType === 'sales' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  فاتورة مبيعات
                </button>
                <button 
                  type="button"
                  onClick={() => handleTypeChange('purchase')}
                  className={`py-1.5 px-3 text-xs font-black rounded-lg transition-all ${invoiceType === 'purchase' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  فاتورة مشتريات
                </button>
                <button 
                  type="button"
                  onClick={() => handleTypeChange('sales_return')}
                  className={`py-1.5 px-3 text-xs font-black rounded-lg transition-all ${invoiceType === 'sales_return' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800 hover:text-amber-900'}`}
                >
                  مرتجع مبيعات ↩️
                </button>
                <button 
                  type="button"
                  onClick={() => handleTypeChange('purchase_return')}
                  className={`py-1.5 px-3 text-xs font-black rounded-lg transition-all ${invoiceType === 'purchase_return' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-800 hover:text-rose-900'}`}
                >
                  مرتجع مشتريات ↪️
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400">قسم الفاتورة:</span>
              <select 
                value={invoiceCategory} 
                onChange={(e) => setInvoiceCategory(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">عامة (أصناف حديد وتجارة)</option>
                <option value="manufacturing">تصنيع وتشغيل</option>
                <option value="laser">تشغيل ليزر (صاج ومسطحات)</option>
                <option value="bending">شغل تنايات ودرفلة</option>
                <option value="strip">تفصيل خوصة وكمر</option>
              </select>
            </div>
          </div>

          {/* Row 2: Party Selection & Meta Inputs Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Customer / Supplier Dropdown */}
            <div className="lg:col-span-5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700">
                  {invoiceType === 'sales' || invoiceType === 'sales_return' ? 'العميل المستهدف' : 'المورد المستهدف'}
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  {invoiceType === 'sales' || invoiceType === 'sales_return' ? 'اختر من قائمة العملاء' : 'اختر من قائمة الموردين'}
                </span>
              </div>
              <div className="relative">
                <select 
                  value={personId} 
                  onChange={(e) => setPersonId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold text-xs text-slate-900 transition-all"
                >
                  <option value="">-- اختر {invoiceType === 'sales' || invoiceType === 'sales_return' ? 'العميل' : 'المورد'} --</option>
                  {personsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''} - [الرصيد: {p.balance.toLocaleString()} ج.م]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Party Summary Chip */}
            <div className="lg:col-span-3">
              {selectedPerson ? (
                <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">الرصيد الحالي</div>
                    <div className={`text-xs font-black ${selectedPerson.balance > 0 ? 'text-rose-600' : selectedPerson.balance < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {Math.abs(selectedPerson.balance).toLocaleString()} ج.م
                      <span className="text-[9px] mr-1 font-bold">
                        ({selectedPerson.balance > 0 ? (invoiceType === 'sales' ? 'مدين عليه' : 'دائن له') : selectedPerson.balance < 0 ? 'له رصيد' : 'مخلص'})
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setStatementPersonId(personId)}
                    className="p-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    title="عرض كشف الحساب"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[10px]">كشف الحساب</span>
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs font-bold text-slate-400">
                  لم يتم اختيار طرف بعد
                </div>
              )}
            </div>

            {/* Invoice Number */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700">رقم الفاتورة</label>
                <button
                  type="button"
                  onClick={() => setIsAutoNumbered(!isAutoNumbered)}
                  className={`text-[9px] px-1.5 py-0.2 rounded font-black border transition-all ${
                    isAutoNumbered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {isAutoNumbered ? 'تلقائي' : 'يدوي'}
                </button>
              </div>
              <input 
                type="text" 
                value={invoiceNumber} 
                readOnly={isAutoNumbered}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 ${
                  isAutoNumbered ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : 'bg-white text-slate-900 border-amber-300'
                }`}
              />
            </div>

            {/* Invoice Date */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1">تاريخ الفاتورة</label>
              <input 
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Return Helper Ribbon (يظهر عند اختيار مرتجع مبيعات أو مرتجع مشتريات) */}
          {(invoiceType === 'sales_return' || invoiceType === 'purchase_return') && (
            <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-600 text-white rounded-xl shadow-sm shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950">
                    {invoiceType === 'sales_return' ? 'استرجاع بنود فاتورة مبيعات سابقة للعميل' : 'استرجاع بنود فاتورة مشتريات سابقة من المورد'}
                  </h4>
                  <p className="text-[10px] text-amber-800 font-bold">
                    اختر الفاتورة الأصلية لنسخ بنودها وتحديد الكمية المرتجعة
                  </p>
                </div>
              </div>

              <div className="w-full md:w-80">
                <select
                  value={selectedSourceInvoiceId}
                  onChange={(e) => handleSelectSourceInvoice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-400 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500 text-amber-950 shadow-sm"
                >
                  <option value="">-- اختر فاتورة أصلية لنسخ بنودها --</option>
                  {state.invoices
                    .filter(i => {
                      const isSalesReturn = invoiceType === 'sales_return';
                      const targetType = isSalesReturn ? 'sales' : 'purchase';
                      const typeMatch = i.type === targetType;
                      const personMatch = personId ? i.personId === personId : true;
                      return typeMatch && personMatch;
                    })
                    .map(inv => {
                      const p = inv.personType === 'client' 
                        ? state.clients.find(c => c.id === inv.personId) 
                        : state.suppliers.find(s => s.id === inv.personId);
                      return (
                        <option key={inv.id} value={inv.id}>
                          #{inv.invoiceNumber} - {p?.name || 'عام'} ({inv.total.toLocaleString()} ج.م - {new Date(inv.date).toLocaleDateString('ar-EG')})
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Laser Calculator Top Banner Widget (حاسبة أوزان الصاج والمسطحات المباشرة) */}
        {invoiceCategory === 'laser' && (
          <LaserCalculatorWidget
            inventory={state.inventory}
            invoiceType={invoiceType}
            onAddItem={(newItem) => {
              setItems(prev => {
                if (prev.length === 1 && !prev[0].description && prev[0].quantity === 1 && prev[0].unitPrice === 0) {
                  return [newItem];
                }
                return [...prev, newItem];
              });
            }}
          />
        )}

        {/* Multi-Weighing Scale Widget (شاشة وزنات الميزان البسكول المباشر) */}
        <MultiWeighingScaleWidget
          inventory={state.inventory}
          scaleTickets={state.scaleTickets}
          liveScaleWeight={state.liveScaleWeight || 0}
          invoiceType={invoiceType}
          onSyncWeighingsToInvoice={(convertedItems) => {
            setItems(convertedItems);
          }}
        />

        {/* Invoice Items Table (جدول بنود الفاتورة المجدول الحقيقي) */}
        <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                بنود وأصناف الفاتورة
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {items.length} صنف
                </span>
              </h3>
              
              {/* Layout Mode Toggler */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl shadow-inner border border-slate-300/30 self-start">
                <button
                  type="button"
                  onClick={() => setItemLayoutMode('table')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                    itemLayoutMode === 'table' ? 'bg-white text-slate-900 shadow-sm border border-slate-200 shadow' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🖥️ جدول أفقي
                </button>
                <button
                  type="button"
                  onClick={() => setItemLayoutMode('card')}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                    itemLayoutMode === 'card' ? 'bg-white text-slate-900 shadow-sm border border-slate-200 shadow' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📱 عرض طولي للتابلت
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                type="button"
                onClick={handleAddNewItemFromScale}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="إضافة بند وزنة جديدة مقروءة مباشرة من الميزان"
              >
                <Scale className="w-4 h-4" />
                <span>+ وزنة جديدة من الميزان</span>
                <span className="bg-amber-700/60 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {(state.liveScaleWeight || 0).toLocaleString('ar-EG')} كجم
                </span>
              </button>

              <button 
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                إضافة بند يدوي
              </button>
            </div>
          </div>

          {itemLayoutMode === 'card' ? (
            <div className="p-4 space-y-4 bg-slate-50/50">
              {items.map((item, idx) => (
                <div key={idx} className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm relative hover:border-blue-400 transition-all space-y-3">
                  {/* Card Header */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      البند رقم #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30"
                      title="حذف هذا البند"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item Description / Combobox */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-black text-slate-700">الصنف من المخزن / الوصف</label>
                      <InventoryCombobox
                        item={item}
                        index={idx}
                        inventory={state.inventory}
                        invoiceType={invoiceType}
                        onSelectInventory={handleInventorySelect}
                        onDescriptionChange={(i, text) => handleItemChange(i, 'description', text)}
                      />
                    </div>

                    {/* Manufacturing Category Units */}
                    {invoiceCategory === 'manufacturing' && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-black text-slate-700">وحدة التشغيل</label>
                        <select
                          value={item.manufacturingUnit || 'meter'}
                          onChange={(e) => handleItemChange(idx, 'manufacturingUnit', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="meter">بالمتر</option>
                          <option value="kg">بالكيلو (كجم)</option>
                          <option value="piece">بالقطعة</option>
                          <option value="ton">بالطن</option>
                        </select>
                      </div>
                    )}

                    {/* Laser Specific Dimensions */}
                    {invoiceCategory === 'laser' && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-600">وحدة القياس</label>
                          <select
                            value={item.dimensionUnit || 'cm'}
                            onChange={(e) => handleItemChange(idx, 'dimensionUnit', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-bold outline-none"
                          >
                            <option value="cm">سم</option>
                            <option value="mm">مم</option>
                            <option value="m">متر</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-600">الطول</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={item.length || ''} 
                            onChange={(e) => handleItemChange(idx, 'length', e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500"
                            placeholder="طول"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-600">العرض</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={item.width || ''} 
                            onChange={(e) => handleItemChange(idx, 'width', e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500"
                            placeholder="عرض"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-600">السمك (مم)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={item.thickness || ''} 
                            onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500 text-blue-700"
                            placeholder="سمك"
                          />
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="block text-[10px] font-black text-slate-600">عدد الألواح</label>
                          <input 
                            type="number" 
                            min="1"
                            value={item.sheetsCount || 1} 
                            onChange={(e) => handleItemChange(idx, 'sheetsCount', e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500 text-amber-700"
                            placeholder="1"
                          />
                        </div>
                      </div>
                    )}

                    {/* Bending Category Inputs */}
                    {invoiceCategory === 'bending' ? (
                      <div className="grid grid-cols-2 gap-3 md:col-span-2">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-black text-slate-700">عدد الطعجات</label>
                          <input 
                            type="number" 
                            value={item.bendsCount || ''} 
                            onChange={(e) => handleItemChange(idx, 'bendsCount', e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 text-center text-xs font-black outline-none focus:border-blue-500"
                            placeholder="عدد الثنيات"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-black text-slate-700">سعر الثنية (ج.م)</label>
                          <input 
                            type="number" 
                            value={item.bendPrice || ''} 
                            onChange={(e) => handleItemChange(idx, 'bendPrice', e.target.value)} 
                            className="w-full bg-white border border-slate-300 rounded-xl py-2.5 text-center text-xs font-black outline-none focus:border-blue-500 text-emerald-600"
                            placeholder="سعر الثنية"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Quantity / Weight Input */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-black text-slate-700">الكمية / الوزن المطلوبة</label>
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                            <div className="relative flex-1 min-w-[140px]">
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.quantity || ''}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                readOnly={invoiceCategory === 'laser' && !!item.length}
                                className={`w-full bg-white border border-slate-300 rounded-xl py-2.5 pr-2.5 pl-20 text-center text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-inner ${
                                  invoiceCategory === 'laser' ? 'bg-slate-100 text-slate-600' : 'text-slate-900'
                                }`}
                                placeholder="0.00"
                              />
                              <select
                                value={item.manufacturingUnit || 'kg'}
                                onChange={(e) => handleItemChange(idx, 'manufacturingUnit', e.target.value)}
                                className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-[11px] font-black text-slate-700 rounded-md py-1 px-1.5 outline-none cursor-pointer transition-colors"
                              >
                                <option value="kg">كجم</option>
                                <option value="ton">طن</option>
                                <option value="piece">قطعة</option>
                                <option value="meter">متر</option>
                                <option value="bend">ثنية</option>
                                <option value="hour">ساعة</option>
                              </select>
                            </div>

                            {/* Direct Scale Read Button */}
                            <button
                              type="button"
                              onClick={() => handleReadScale(idx)}
                              className="px-3 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all shrink-0"
                              title="قراءة الوزن اللحظي من الميزان"
                            >
                              <Scale className="w-4 h-4" />
                              <span>قراءة الميزان</span>
                            </button>

                            {/* Add Additional Scale Reading (+ وزنة) */}
                            <button
                              type="button"
                              onClick={() => handleAppendScaleReadingToItem(idx)}
                              className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
                              title="إضافة وزنة تراكمية أخرى"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          {item.scaleApproved && (
                            <div className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center justify-center gap-1 bg-emerald-50 py-1 rounded-xl border border-emerald-200">
                              <span>✓ معتمد ميزان: {item.scaleNetWeight?.toLocaleString('ar-EG')} كجم</span>
                            </div>
                          )}
                        </div>

                        {/* Certified Scale Integration */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-black text-slate-700">الوزن المعتمد (بسكول)</label>
                          {item.scaleApproved ? (
                            <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-200 rounded-xl px-3 py-2">
                              <span className="text-xs font-black text-emerald-700">{item.scaleNetWeight?.toLocaleString()} كجم</span>
                              <button 
                                type="button"
                                onClick={() => handleClearScale(idx)} 
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors" 
                                title="إلغاء ربط الميزان"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => handleOpenScaleModal(idx)} 
                              className="w-full px-3 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl transition-all font-black text-xs flex items-center justify-center gap-1.5"
                            >
                              <Scale className="w-4 h-4" />
                              <span>ربط بميزان البسكول المعتمد ⚖️</span>
                            </button>
                          )}
                        </div>

                        {/* Unit Price */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-black text-slate-700">سعر الوحدة (ج.م)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={item.unitPrice || ''} 
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} 
                              disabled={!canEditPrices}
                              className={`w-full bg-white border border-slate-300 rounded-xl py-2.5 text-center text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm ${
                                !canEditPrices ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'text-emerald-700'
                              }`}
                              placeholder="0.00"
                            />
                            {!canEditPrices && (
                              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 md:col-span-2">
                      <span className="text-xs font-black text-slate-600">إجمالي هذا البند:</span>
                      <span className="text-base font-black text-slate-900">
                        {item.total.toLocaleString()} <span className="text-xs font-medium text-slate-400">ج.م</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 text-[11px] font-black tracking-wider border-b-2 border-slate-300">
                    <th className="px-3 py-3 text-center w-10 border-r border-slate-200">#</th>
                    <th className="px-4 py-3 border-r border-slate-200">الصنف من المخزن / الوصف</th>
                    {invoiceCategory === 'manufacturing' && (
                      <th className="px-3 py-3 text-center border-b border-slate-700 w-28">وحدة التشغيل</th>
                    )}
                    {invoiceCategory === 'laser' && (
                      <>
                        <th className="px-2 py-3 text-center border-b border-slate-700 w-20">وحدة القياس</th>
                        <th className="px-2 py-3 text-center border-b border-slate-700 w-20">الطول</th>
                        <th className="px-2 py-3 text-center border-b border-slate-700 w-20">العرض</th>
                        <th className="px-2 py-3 text-center border-b border-slate-700 w-20">السمك (مم)</th>
                        <th className="px-2 py-3 text-center border-b border-slate-700 w-20">عدد الألواح</th>
                      </>
                    )}
                    {invoiceCategory === 'bending' ? (
                      <>
                        <th className="px-3 py-3 text-center border-b border-slate-700 w-36 min-w-[120px]">عدد الطعجات</th>
                        <th className="px-3 py-3 text-center border-b border-slate-700 w-36 min-w-[120px]">سعر الثنية (ج.م)</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-3 text-center border-b border-slate-700 w-96 min-w-[340px]">الكمية / الوزن</th>
                        <th className="px-3 py-3 text-center border-b border-slate-700 w-36">الميزان المعتمد</th>
                        <th className="px-3 py-3 text-center border-b border-slate-700 w-44 min-w-[160px]">سعر الوحدة (ج.م)</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-center border-b border-slate-700 w-36">الإجمالي (ج.م)</th>
                    <th className="px-3 py-3 text-center border-b border-slate-700 w-12">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => (
                    <tr key={idx} className="even:bg-slate-50/70 hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-3 text-center font-bold text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Description or Inventory Search Selector */}
                      <td className="px-4 py-3 min-w-[280px]">
                        <InventoryCombobox
                          item={item}
                          index={idx}
                          inventory={state.inventory}
                          invoiceType={invoiceType}
                          onSelectInventory={handleInventorySelect}
                          onDescriptionChange={(i, text) => handleItemChange(i, 'description', text)}
                        />
                      </td>

                      {/* Manufacturing Unit */}
                      {invoiceCategory === 'manufacturing' && (
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.manufacturingUnit || 'meter'}
                            onChange={(e) => handleItemChange(idx, 'manufacturingUnit', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="meter">بالمتر</option>
                            <option value="kg">بالكيلو (كجم)</option>
                            <option value="piece">بالقطعة</option>
                            <option value="ton">بالطن</option>
                          </select>
                        </td>
                      )}

                      {/* Laser Dimensions */}
                      {invoiceCategory === 'laser' && (
                        <>
                          <td className="px-2 py-3 text-center">
                            <select
                              value={item.dimensionUnit || 'cm'}
                              onChange={(e) => handleItemChange(idx, 'dimensionUnit', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-bold outline-none"
                            >
                              <option value="cm">سم</option>
                              <option value="mm">مم</option>
                              <option value="m">متر</option>
                            </select>
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={item.length || ''} 
                              onChange={(e) => handleItemChange(idx, 'length', e.target.value)} 
                              className="w-full min-w-[90px] bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500"
                              placeholder="طول"
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={item.width || ''} 
                              onChange={(e) => handleItemChange(idx, 'width', e.target.value)} 
                              className="w-full min-w-[90px] bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500"
                              placeholder="عرض"
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input 
                              type="number" 
                              step="0.1" 
                              value={item.thickness || ''} 
                              onChange={(e) => handleItemChange(idx, 'thickness', e.target.value)} 
                              className="w-full min-w-[80px] bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500 text-blue-700"
                              placeholder="سمك"
                            />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input 
                              type="number" 
                              min="1"
                              value={item.sheetsCount || 1} 
                              onChange={(e) => handleItemChange(idx, 'sheetsCount', e.target.value)} 
                              className="w-full min-w-[80px] bg-white border border-slate-300 rounded-lg py-1.5 text-center text-xs font-black outline-none focus:border-blue-500 text-amber-700"
                              placeholder="1"
                            />
                          </td>
                        </>
                      )}

                      {/* Bending Category Inputs */}
                      {invoiceCategory === 'bending' ? (
                        <>
                          <td className="px-3 py-3 text-center">
                            <input 
                              type="number" 
                              value={item.bendsCount || ''} 
                              onChange={(e) => handleItemChange(idx, 'bendsCount', e.target.value)} 
                              className="w-full min-w-[110px] bg-white border border-slate-300 rounded-xl py-2 text-center text-xs font-black outline-none focus:border-blue-500"
                              placeholder="عدد"
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <input 
                              type="number" 
                              value={item.bendPrice || ''} 
                              onChange={(e) => handleItemChange(idx, 'bendPrice', e.target.value)} 
                              className="w-full min-w-[110px] bg-white border border-slate-300 rounded-xl py-2 text-center text-xs font-black outline-none focus:border-blue-500 text-emerald-600"
                              placeholder="سعر"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Quantity / Weight Input with Direct Scale Read Button */}
                          <td className="px-3 py-3 text-center min-w-[340px] w-96">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.quantity || ''}
                                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                  readOnly={invoiceCategory === 'laser' && !!item.length}
                                  className={`w-full bg-white border border-slate-300 rounded-xl py-2 pr-2.5 pl-20 text-center text-sm font-black outline-none focus:ring-2 focus:ring-blue-500 shadow-inner ${
                                    invoiceCategory === 'laser' ? 'bg-slate-100 text-slate-600' : 'text-slate-900'
                                  }`}
                                  placeholder="0.00"
                                />
                                <select
                                  value={item.manufacturingUnit || 'kg'}
                                  onChange={(e) => handleItemChange(idx, 'manufacturingUnit', e.target.value)}
                                  className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-[11px] font-black text-slate-700 rounded-md py-0.5 px-1 outline-none cursor-pointer transition-colors"
                                  title="اختر وحدة قياس هذا البند"
                                >
                                  <option value="kg">كجم</option>
                                  <option value="ton">طن</option>
                                  <option value="piece">قطعة</option>
                                  <option value="meter">متر</option>
                                  <option value="bend">ثنية</option>
                                  <option value="hour">ساعة</option>
                                </select>
                              </div>

                              {/* Direct Scale Read Button */}
                              <button
                                type="button"
                                onClick={() => handleReadScale(idx)}
                                className="px-2.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1 transition-all whitespace-nowrap"
                                title={`قراءة الوزن الحالي من الميزان (${(state.liveScaleWeight || 0).toLocaleString('ar-EG')} كجم) وتحديث الحقل`}
                              >
                                <Scale className="w-3.5 h-3.5" />
                                <span className="hidden xl:inline">قراءة الميزان</span>
                              </button>

                              {/* Add Additional Scale Reading (+ وزنة) */}
                              <button
                                type="button"
                                onClick={() => handleAppendScaleReadingToItem(idx)}
                                className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all active:scale-95"
                                title={`إضافة وزنة أخرى من الميزان (+${(state.liveScaleWeight || 0).toLocaleString('ar-EG')} كجم) وتراكمها على هذا الصنف`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {item.scaleApproved && (
                              <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center justify-center gap-1 bg-emerald-50 py-0.5 rounded-lg border border-emerald-200">
                                <span>✓ معتمد ميزان: {item.scaleNetWeight?.toLocaleString('ar-EG')} كجم</span>
                              </div>
                            )}
                          </td>

                          {/* Certified Scale Integration */}
                          <td className="px-3 py-3 text-center">
                            {item.scaleApproved ? (
                              <div className="flex items-center justify-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl px-2 py-1.5">
                                <span className="text-xs font-black text-emerald-700">{item.scaleNetWeight?.toLocaleString()} كجم</span>
                                <button 
                                  type="button"
                                  onClick={() => handleClearScale(idx)} 
                                  className="text-rose-500 hover:text-rose-700" 
                                  title="إلغاء ربط الميزان"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleOpenScaleModal(idx)} 
                                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-xl transition-all font-bold text-xs flex items-center justify-center gap-1 mx-auto"
                                title="ربط بميزان معتمد وتخصيص الخصم والتاير"
                              >
                                <Scale className="w-4 h-4" />
                                <span>وزن ⚖️</span>
                              </button>
                            )}
                          </td>

                          {/* Unit Price */}
                          <td className="px-3 py-3 text-center relative min-w-[140px]">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={item.unitPrice || ''} 
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)} 
                              disabled={!canEditPrices}
                              className={`w-full bg-white border border-slate-300 rounded-xl py-2 text-center text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm ${
                                !canEditPrices ? 'bg-slate-100 cursor-not-allowed text-slate-400' : 'text-emerald-700'
                              }`}
                              placeholder="0.00"
                            />
                            {!canEditPrices && (
                              <Lock className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            )}
                          </td>
                        </>
                      )}

                      {/* Total */}
                      <td className="px-4 py-3 text-center font-black text-slate-900 text-sm">
                        {item.total.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">ج.م</span>
                      </td>

                      {/* Delete item button */}
                      <td className="px-3 py-3 text-center">
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(idx)} 
                          disabled={items.length === 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title="حذف البند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <button 
              type="button"
              onClick={handleAddItem}
              className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>إضافة صنف آخر</span>
            </button>
            <span className="text-xs font-black text-slate-500">
              إجمالي الأصناف: {calculateSubtotal().toLocaleString()} ج.م
            </span>
          </div>
        </div>

        {/* Invoice Footer Section: Notes & Embedded Real-time Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Notes & Attachments */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <label className="block text-xs font-black text-slate-700 mb-2">ملاحظات وشروط الفاتورة</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب أي ملاحظات تخص التسليم، مكان التعتيق، أو شروط الدفع..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-800 h-24 resize-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {invoiceType === 'purchase' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <label className="block text-xs font-black text-slate-700 mb-2">إرفاق صور المستندات وفاتورة التوريد</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="block w-full text-xs text-slate-500 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" 
                />
                {attachments.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {attachments.map((src, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                        <img src={src} alt="attachment" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} 
                          className="absolute top-0 right-0 bg-rose-600 text-white p-0.5 rounded-bl"
                        >
                          <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals & Embedded Real-time Ledger */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
              الحسابات الإجمالية وكشف الحساب اللحظي
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">الإجمالي قبل الخصم:</span>
                <span className="font-black text-slate-900 text-sm">{calculateSubtotal().toLocaleString()} ج.م</span>
              </div>

               <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">الخصم النقدي الممنوح:</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={discount || ''} 
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-sm text-rose-600 outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400 font-bold">ج.م</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 pb-2 border-t border-slate-100">
                <span className="font-bold text-slate-500">ناولون شحن ونقل السيارة (النولون):</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={freightCost || ''} 
                    onChange={(e) => setFreightCost(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-sm text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="0"
                  />
                  <span className="text-xs text-slate-400 font-bold">ج.م</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="font-black text-slate-800 text-sm">الصافي المستحق للفاتورة:</span>
                <span className="text-xl font-black text-blue-700">
                  {Math.max(calculateSubtotal() - discount + freightCost, 0).toLocaleString()} <span className="text-xs">ج.م</span>
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-3 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-emerald-800">طريقة الدفع:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-40 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-center font-bold text-xs text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">💵 نقداً</option>
                    <option value="bank">🏦 تحويل بنكي</option>
                    <option value="wallet">📱 محفظة إلكترونية</option>
                    <option value="instapay">⚡ إنستاباي</option>
                  </select>
                </div>
                
                <div className="flex justify-between items-center border-t border-emerald-100 pt-2">
                  <label className="text-xs font-black text-emerald-800">المبلغ المدفوع:</label>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={paidAmount || ''} 
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-40 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-center font-black text-base text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-emerald-700 font-black">ج.م</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs px-1">
                <span className="font-bold text-slate-500">المتبقي على الحساب (آجل):</span>
                <span className="font-black text-rose-600 text-sm">
                  {(Math.max(calculateSubtotal() - discount + freightCost, 0) - paidAmount).toLocaleString()} ج.م
                </span>
              </div>

              {/* Embedded Instant Ledger Box */}
              {selectedPerson && (
                <div className="mt-4 p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <div className="text-[11px] font-black text-blue-950 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    كشف الحساب اللحظي المدمج:
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="block text-[9px] text-slate-400 font-bold">الرصيد السابق</span>
                      <span className="text-xs font-black text-slate-800">{previousBalanceVal.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="block text-[9px] text-slate-400 font-bold">صافي الفاتورة - المسدد</span>
                      <span className="text-xs font-black text-blue-700">
                        {invoiceType === 'sales' ? `+${(invoiceVal - paidAmount).toLocaleString()}` : `-${(invoiceVal - paidAmount).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-200">
                      <span className="block text-[9px] text-slate-400 font-bold">الرصيد المتوقع النهائي</span>
                      <span className={`text-xs font-black ${newEstimatedBalanceVal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {Math.abs(newEstimatedBalanceVal).toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-blue-800 font-medium text-center">
                    [ الرصيد السابق ({previousBalanceVal.toLocaleString()}) + قيمة الفاتورة ({invoiceVal.toLocaleString()}) - المدفوع ({paidAmount.toLocaleString()}) = الرصيد المتبقي الإجمالي ({newEstimatedBalanceVal.toLocaleString()}) ]
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
              >
                إلغاء والرجوع
              </button>
              <button 
                type="button"
                onClick={(e) => handleSave(e)}
                className="px-8 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                حفظ وإصدار الفاتورة
              </button>
            </div>
          </div>
        </div>

        {/* Scale Modal Helper if index active */}
        {scaleModalIndex !== null && renderScaleModal()}

        {/* Account Statement Modal */}
        <AccountStatementModal 
          personId={statementPersonId} 
          onClose={() => setStatementPersonId(null)} 
        />

        {/* Warning Modal */}
        {warningModalData && (
          <WarningModal 
            isOpen={warningModalData.isOpen}
            title={warningModalData.title}
            message={warningModalData.message}
            type={warningModalData.type}
            onClose={() => setWarningModalData(null)}
          />
        )}
      </div>
    );
  }

  // Calculate totals for the listing footer
  const totalInvoicesAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaidAmount = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalRemainingAmount = filteredInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Modern Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            نظام الفواتير والمبيعات
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            إدارة فواتير البيع والشراء والمرتجعات وجدول الحسابات والربط مع منظومة الموازين والمخزون
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <button 
            onClick={() => openNewInvoiceModal('sales')}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-1.5 text-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            فاتورة مبيعات
          </button>
          <button 
            onClick={() => openNewInvoiceModal('purchase')}
            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold shadow-md shadow-slate-200 hover:bg-slate-900 transition-all flex items-center gap-1.5 text-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            فاتورة مشتريات
          </button>
          <button 
            onClick={() => openNewInvoiceModal('sales_return')}
            className="px-4 py-2.5 bg-amber-600 text-white rounded-xl font-bold shadow-md shadow-amber-200 hover:bg-amber-700 transition-all flex items-center gap-1.5 text-xs active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            مرتجع مبيعات ↩️
          </button>
          <button 
            onClick={() => openNewInvoiceModal('purchase_return')}
            className="px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-md shadow-rose-200 hover:bg-rose-700 transition-all flex items-center gap-1.5 text-xs active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            مرتجع مشتريات ↪️
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">إجمالي عدد الفواتير</span>
          <div className="text-xl font-black text-slate-800 mt-1">{filteredInvoices.length}</div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">إجمالي المبالغ المطلوبة</span>
          <div className="text-xl font-black text-blue-700 mt-1">{totalInvoicesAmount.toLocaleString()} <span className="text-xs">ج.م</span></div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">إجمالي المسدد نقداً</span>
          <div className="text-xl font-black text-emerald-600 mt-1">{totalPaidAmount.toLocaleString()} <span className="text-xs">ج.م</span></div>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">إجمالي المتبقي والآجل</span>
          <div className="text-xl font-black text-rose-600 mt-1">{totalRemainingAmount.toLocaleString()} <span className="text-xs">ج.م</span></div>
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <button
          onClick={() => setListTypeFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${listTypeFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
        >
          الكل ({state.invoices.length})
        </button>
        <button
          onClick={() => setListTypeFilter('sales')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${listTypeFilter === 'sales' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-100'}`}
        >
          المبيعات ({state.invoices.filter(i => i.type === 'sales').length})
        </button>
        <button
          onClick={() => setListTypeFilter('purchase')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${listTypeFilter === 'purchase' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
        >
          المشتريات ({state.invoices.filter(i => i.type === 'purchase').length})
        </button>
        <button
          onClick={() => setListTypeFilter('sales_return')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${listTypeFilter === 'sales_return' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'}`}
        >
          مرتجع المبيعات ({state.invoices.filter(i => i.type === 'sales_return').length})
        </button>
        <button
          onClick={() => setListTypeFilter('purchase_return')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${listTypeFilter === 'purchase_return' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'}`}
        >
          مرتجع المشتريات ({state.invoices.filter(i => i.type === 'purchase_return').length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-sm no-print">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، اسم العميل / المورد، أو البيان..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-black text-slate-400">من:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="outline-none text-xs font-bold text-slate-700 bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-black text-slate-400">إلى:</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="outline-none text-xs font-bold text-slate-700 bg-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportInvoicesListPDF}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="تصدير كشف الفواتير الحالي إلى ملف PDF"
          >
            <Printer className="w-4 h-4 text-white" />
            طباعة كشف الفواتير (PDF)
          </button>
        </div>
      </div>

      {/* Real Structured ERP Table (طريقة العرض المجدولة الكلاسيكية الحقيقية) */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 text-[11px] font-black tracking-wider border-b-2 border-slate-300">
                <th className="px-3 py-3 text-center border-r border-slate-200 w-12">#</th>
                <th className="px-4 py-3 border-r border-slate-200">رقم الفاتورة</th>
                <th className="px-3 py-3 border-r border-slate-200 text-center">التاريخ</th>
                <th className="px-4 py-3 border-r border-slate-200">النوع / القسم</th>
                <th className="px-4 py-3 border-r border-slate-200">الطرف (العميل / المورد)</th>
                <th className="px-3 py-3 border-r border-slate-200 text-center">عدد البنود</th>
                <th className="px-4 py-3 border-r border-slate-200 text-center">الإجمالي (ج.م)</th>
                <th className="px-3 py-3 border-r border-slate-200 text-center">المدفوع (ج.م)</th>
                <th className="px-3 py-3 border-r border-slate-200 text-center">المتبقي (ج.م)</th>
                <th className="px-3 py-3 border-r border-slate-200 text-center">حالة السداد</th>
                <th className="px-4 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-400 font-bold bg-slate-50/50">
                    لا توجد فواتير مطابقة للبحث أو التصفية الحالية
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice, index) => {
                  const person = invoice.personType === 'client' 
                    ? state.clients.find(c => c.id === invoice.personId) 
                    : state.suppliers.find(s => s.id === invoice.personId);
                  
                  const isSales = invoice.type === 'sales';
                  const isSalesReturn = invoice.type === 'sales_return';
                  const isPurchaseReturn = invoice.type === 'purchase_return';
                  const isLaser = invoice.category === 'laser';
                  const isBending = invoice.category === 'bending';
                  const isManufacturing = invoice.category === 'manufacturing';
                  
                  return (
                    <tr key={invoice.id} className="even:bg-slate-50/60 hover:bg-blue-50/50 transition-colors">
                      <td className="px-3 py-3 text-center border-r border-slate-200 font-bold text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 border-r border-slate-200 font-mono font-black text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <FileText className={`w-3.5 h-3.5 ${
                            isSales ? 'text-blue-600' : 
                            isSalesReturn ? 'text-amber-600' :
                            isPurchaseReturn ? 'text-rose-600' : 'text-slate-600'
                          }`} />
                          <span>#{invoice.invoiceNumber}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3 border-r border-slate-200 text-center font-bold text-slate-600 text-[11px]">
                        {new Date(invoice.date).toLocaleDateString('ar-EG')}
                      </td>

                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full w-fit ${
                            isSales ? 'bg-blue-100 text-blue-800' : 
                            isSalesReturn ? 'bg-amber-100 text-amber-800' :
                            isPurchaseReturn ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {isSales ? 'مبيعات' : isSalesReturn ? 'مرتجع مبيعات' : isPurchaseReturn ? 'مرتجع مشتريات' : 'مشتريات'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {isLaser ? 'تشغيل ليزر' : isBending ? 'شغل تناية' : isManufacturing ? 'تصنيع' : 'عامة'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900">{person?.name || 'طرف نقدي عام'}</span>
                          {person?.phone && <span className="text-[10px] text-slate-400 font-mono">{person.phone}</span>}
                        </div>
                      </td>

                      <td className="px-3 py-3 border-r border-slate-200 text-center font-bold text-slate-700">
                        {invoice.items.length} صنف
                      </td>

                      <td className="px-4 py-3 border-r border-slate-200 text-center font-black text-slate-900">
                        {invoice.total.toLocaleString()}
                      </td>

                      <td className="px-3 py-3 border-r border-slate-200 text-center font-black text-emerald-600">
                        {invoice.paidAmount.toLocaleString()}
                      </td>

                      <td className="px-3 py-3 border-r border-slate-200 text-center font-black text-rose-600">
                        {invoice.remainingAmount.toLocaleString()}
                      </td>

                      <td className="px-3 py-3 border-r border-slate-200 text-center">
                        {invoice.remainingAmount <= 0 ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black">
                            مدفوعة بالكامل
                          </span>
                        ) : invoice.paidAmount > 0 ? (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-black">
                            تحصيل جزئي
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-black">
                            آجل بالكامل
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setViewingInvoice(invoice)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg transition-all"
                            title="عرض الفاتورة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setPrintingInvoice(invoice)}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-all cursor-pointer"
                            title="طباعة (A4 وبون حراري)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleExportSingleInvoicePDF(invoice)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                            title="تحميل الفاتورة صيغة PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => setConfirmDeleteId(invoice.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-left border-r border-slate-300">
                    المجموع الكلي للفواتير المعروضة:
                  </td>
                  <td className="px-4 py-3 text-center border-r border-slate-300 text-blue-700">
                    {totalInvoicesAmount.toLocaleString()} ج.م
                  </td>
                  <td className="px-3 py-3 text-center border-r border-slate-300 text-emerald-700">
                    {totalPaidAmount.toLocaleString()} ج.م
                  </td>
                  <td className="px-3 py-3 text-center border-r border-slate-300 text-rose-700">
                    {totalRemainingAmount.toLocaleString()} ج.م
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-center text-slate-500 font-bold text-[10px]">
                    {filteredInvoices.length} فاتورة
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* View Invoice Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 shrink-0 no-print">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                عرض الفاتورة #{viewingInvoice.invoiceNumber}
              </h2>
              <button onClick={() => setViewingInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1" id="printable-area">
              <div className="text-center mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                  فاتورة {viewingInvoice.type === 'sales' ? 'مبيعات' : 'مشتريات'}
                </h1>
                <p className="text-lg font-semibold text-blue-600 mb-2">
                  {viewingInvoice.category === 'laser' ? 'تشغيل ليزر' : viewingInvoice.category === 'bending' ? 'شغل تنايات' : viewingInvoice.category === 'strip' ? 'تفصيل خوصة' : 'عادية'}
                </p>
                <p className="text-slate-500 text-lg">{state.settings?.companyName || 'مخازن الحديد'}</p>
                {state.settings?.taxNumber && <p className="text-sm text-slate-500 mt-1">الرقم الضريبي: {state.settings.taxNumber}</p>}
                {state.settings?.phone && <p className="text-sm text-slate-500">هاتف: {state.settings.phone}</p>}
              </div>

              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-sm text-slate-500 font-semibold mb-1">
                    {viewingInvoice.type === 'sales' ? 'السيد / السادة:' : 'المورد:'}
                  </p>
                  <p className="text-xl font-bold text-slate-800">
                    {viewingInvoice.personType === 'client' 
                      ? state.clients.find(c => c.id === viewingInvoice.personId)?.name 
                      : state.suppliers.find(s => s.id === viewingInvoice.personId)?.name}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-500 font-semibold mb-1">رقم الفاتورة:</p>
                  <p className="font-bold text-slate-800">#{viewingInvoice.invoiceNumber}</p>
                  <p className="text-sm text-slate-500 font-semibold mt-3 mb-1">التاريخ والوقت:</p>
                  <p className="font-bold text-slate-800">
                    {(() => {
                      const d = new Date(viewingInvoice.createdAt);
                      return !isNaN(d.getTime())
                        ? `${d.toLocaleDateString('ar-EG')} - ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                        : viewingInvoice.createdAt;
                    })()}
                  </p>
                </div>
              </div>

              <table className="w-full text-right mb-8">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الصنف / البيان</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">
                      {viewingInvoice.category === 'laser' ? 'الوزن (كجم)' : 'الكمية'}
                    </th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">السعر</th>
                    <th className="p-3 text-slate-600 font-semibold border-b border-slate-200">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {viewingInvoice.items.map((item, idx) => (
                    <tr key={idx} className="even:bg-slate-50 odd:bg-white hover:bg-blue-50/40 transition-colors">
                      <td className="p-3 text-slate-800 font-semibold">{item.description}</td>
                      <td className="p-3 text-slate-600">{item.quantity}</td>
                      <td className="p-3 text-slate-600">{item.unitPrice.toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-800">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                {/* Statement Summary */}
                {(() => {
                  const person = viewingInvoice.personType === 'client' 
                    ? state.clients.find(c => c.id === viewingInvoice.personId) 
                    : state.suppliers.find(s => s.id === viewingInvoice.personId);
                  const currentBal = person?.balance || 0;
                  const remAmt = viewingInvoice.remainingAmount || 0;
                  const effect = viewingInvoice.type === 'sales' ? remAmt : -remAmt;
                  const prevBal = currentBal - effect;
                  const newBal = currentBal;

                  return (
                    <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2 text-xs font-bold text-slate-800">
                      <h4 className="font-black text-blue-900 border-b border-blue-200 pb-1 flex justify-between items-center text-sm">
                        <span>كشف حساب مالي لحظي مدمج</span>
                        <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">{person?.name || 'عميل نقدي'}</span>
                      </h4>
                      <div className="flex justify-between items-center py-1 border-b border-blue-100">
                        <span className="text-slate-600">الرصيد السابق قبل الفاتورة:</span>
                        <span className="font-mono text-sm text-slate-900" dir="ltr">
                          {Math.abs(prevBal).toLocaleString()} ج.م {prevBal > 0 ? '(مدين)' : prevBal < 0 ? '(دائن)' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-blue-100">
                        <span className="text-slate-600">قيمة هذه الفاتورة:</span>
                        <span className="font-mono text-sm text-blue-800">{viewingInvoice.total.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-blue-100">
                        <span className="text-slate-600">المدفوع نقداً بالخزنة:</span>
                        <span className="font-mono text-sm text-emerald-700">{viewingInvoice.paidAmount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 font-black text-sm text-slate-900">
                        <span>إجمالي الرصيد اللحظي المتبقي النهائي:</span>
                        <span className={`font-mono ${newBal > 0 ? 'text-rose-600' : newBal < 0 ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                          {Math.abs(newBal).toLocaleString()} ج.م {newBal > 0 ? '(مدين)' : newBal < 0 ? '(دائن)' : 'مخلص'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Invoice Totals Breakdown */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs font-bold">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">الإجمالي الفرعي:</span>
                    <span className="font-mono text-slate-800">{viewingInvoice.subtotal.toLocaleString()} ج.م</span>
                  </div>
                  {viewingInvoice.discount > 0 && (
                    <div className="flex justify-between items-center text-rose-600">
                      <span>الخصم الخصمي:</span>
                      <span className="font-mono">- {viewingInvoice.discount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-sm font-black">
                    <span className="text-slate-800">الصافي المطلوب:</span>
                    <span className="font-mono text-blue-700">{viewingInvoice.total.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-emerald-600">المدفوع بالفاتورة:</span>
                    <span className="font-mono text-emerald-600">{viewingInvoice.paidAmount.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black">
                    <span className="text-rose-600">المتبقي بالفاتورة:</span>
                    <span className="font-mono text-rose-600">{viewingInvoice.remainingAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {viewingInvoice.attachments && viewingInvoice.attachments.length > 0 && (
                <div className="mt-8 no-print">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2">المرفقات</h3>
                  <div className="flex gap-4 flex-wrap">
                    {viewingInvoice.attachments.map((src, idx) => (
                      <a key={idx} href={src} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <img src={src} alt="attachment" className="w-32 h-32 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {state.settings?.invoiceNotes && (
                <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                  {state.settings.invoiceNotes}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 shrink-0 flex flex-wrap gap-3 no-print">
              {(state.currentUser?.role === 'admin' || state.currentUser?.permissions?.canPrint) && (
                <button 
                  onClick={() => handleExportSingleInvoicePDF(viewingInvoice)}
                  className="flex-1 min-w-[130px] bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                >
                  <Printer className="w-5 h-5" /> طباعة فورية
                </button>
              )}
              <button 
                onClick={() => handleExportSingleInvoicePDF(viewingInvoice)}
                className="flex-1 min-w-[130px] bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-5 h-5" /> تحميل الفاتورة (PDF)
              </button>
              <button 
                onClick={() => setViewingInvoice(null)}
                className="flex-1 min-w-[100px] bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {printingInvoice && (
        <PrintPreviewModal 
          isOpen={!!printingInvoice}
          onClose={() => setPrintingInvoice(null)}
          title={`معاينة الطباعة - فاتورة ${printingInvoice.invoiceNumber}`}
        >
          <InvoicePrintTemplate 
            invoice={printingInvoice}
            person={
              printingInvoice.personType === 'client' 
                ? state.clients.find(c => c.id === printingInvoice.personId)
                : state.suppliers.find(s => s.id === printingInvoice.personId)
            }
            settings={state.settings}
          />
        </PrintPreviewModal>
      )}

      <AccountStatementModal 
        personId={statementPersonId} 
        onClose={() => setStatementPersonId(null)} 
      />

      {/* Scale Verification & Manual Weight Helper Modal */}
      {scaleModalIndex !== null && renderScaleModal()}

      <ConfirmModal 
        isOpen={!!confirmDeleteId}
        title="حذف الفاتورة نهائياً"
        message={`هل أنت متأكد من حذف الفاتورة رقم #${state.invoices.find(i => i.id === confirmDeleteId)?.invoiceNumber}؟ سيتم حذف كافة القيود المحاسبية المرتبطة بها وإعادة الكميات للمخزن وعكس أثر المديونية.`}
        onConfirm={() => {
          if (confirmDeleteId) {
            const inv = state.invoices.find(i => i.id === confirmDeleteId);
            deleteInvoice(confirmDeleteId);
            if (inv) logActivity('حذف فاتورة', `تم حذف الفاتورة رقم #${inv.invoiceNumber}`);
          }
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {warningModalData && (
        <WarningModal 
          isOpen={warningModalData.isOpen}
          title={warningModalData.title}
          message={warningModalData.message}
          type={warningModalData.type}
          onClose={() => setWarningModalData(null)}
        />
      )}
    </div>
  );
}
