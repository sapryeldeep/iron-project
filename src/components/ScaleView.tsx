import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { triggerNativePrint } from '../utils/printHelper';
import { ScaleTicket, Person, InventoryItem, Invoice, InvoiceItem } from '../types';
import { ScaleSerialDriver } from '../utils/scaleSerial';
import { 
  Scale, 
  Weight, 
  Printer, 
  Play, 
  Square, 
  Save, 
  Search, 
  Trash2, 
  History, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpDown, 
  Plus, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  RefreshCw,
  X,
  PlusCircle,
  HelpCircle,
  Hash,
  ShoppingBag,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

// Tafqit helper (converting numbers to Arabic words for steel weights)
function convertNumberToArabicWords(number: number): string {
  if (number === 0) return 'صفر';
  
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف', 'عشرة آلاف'];

  let words = '';

  const processThreeDigits = (num: number) => {
    let parts = [];
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (h > 0) {
      parts.push(hundreds[h]);
    }

    if (t === 1) {
      parts.push(teens[u]);
    } else {
      if (u > 0) {
        parts.push(units[u]);
      }
      if (t > 1) {
        parts.push(tens[t]);
      }
    }

    return parts.filter(Boolean).join(' و ');
  };

  const tons = Math.floor(number / 1000);
  const kgs = number % 1000;

  let tonWords = '';
  if (tons > 0) {
    if (tons === 1) tonWords = 'طن واحد';
    else if (tons === 2) tonWords = 'طنان';
    else if (tons >= 3 && tons <= 10) tonWords = `${units[tons]} أطنان`;
    else {
      let rest = tons;
      if (rest > 99) {
        const h = Math.floor(rest / 100);
        tonWords += hundreds[h] + ' و ';
        rest %= 100;
      }
      if (rest > 0) {
        if (rest < 10) tonWords += units[rest];
        else if (rest < 20) tonWords += teens[rest - 10];
        else {
          const u = rest % 10;
          const ten = Math.floor(rest / 10);
          if (u > 0) tonWords += units[u] + ' و ';
          tonWords += tens[ten];
        }
      }
      tonWords += ' طن';
    }
  }

  let kgWords = '';
  if (kgs > 0) {
    kgWords = processThreeDigits(kgs) + ' كيلوغراماً';
  }

  if (tonWords && kgWords) {
    return `${tonWords} و ${kgWords}`;
  } else if (tonWords) {
    return tonWords;
  } else if (kgWords) {
    return kgWords;
  }

  return 'صفر كيلوغرام';
}

export default function ScaleView() {
  const { state, setLiveScaleWeight, addScaleTicket, deleteScaleTicket, addInvoice, getSequentialInvoiceNumber, logActivity } = useAppStore();

  const user = state.currentUser;
  const companyName = state.settings?.companyName || 'مخازن الحديد المتكاملة';

  // State variables for Floor Scale configuration
  const [scaleConnected, setScaleConnected] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<number>(state.liveScaleWeight ?? 0);
  const [stable, setStable] = useState(true);
  const [comPort, setComPort] = useState(state.settings?.scaleComPort || 'COM1');
  const [baudRate, setBaudRate] = useState<number>(state.settings?.scaleBaudRate || 9600);
  const [serialError, setSerialError] = useState<string | null>(null);

  // Modal delete states
  const [ticketToDelete, setTicketToDelete] = useState<ScaleTicket | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Serial Port Reference for Web Serial API
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const [isWebSerialSupported, setIsWebSerialSupported] = useState(false);
  const serialDriverInstanceRef = useRef<ScaleSerialDriver | null>(null);

  useEffect(() => {
    serialDriverInstanceRef.current = new ScaleSerialDriver();
    return () => {
      if (serialDriverInstanceRef.current) {
        serialDriverInstanceRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  // Checking if Web Serial API is supported in user browser
  useEffect(() => {
    if ('serial' in navigator) {
      setIsWebSerialSupported(true);
      
      // Auto-reconnect logic for authorized ports
      const tryAutoConnect = async () => {
        try {
          const ports = await (navigator as any).serial.getPorts();
          if (ports.length > 0) {
            console.log('Found pre-authorized ports, attempting auto-link...');
            // We don't auto-open because it might still need user interaction or be busy
            // but we can mark it as "Ready to Link"
          }
        } catch (e) {
          console.error('Auto-port detection failed', e);
        }
      };
      tryAutoConnect();
    }
  }, []);

  // Tabs: 'weigh' for direct weighing, 'tickets' for history logs
  const [tab, setTab] = useState<'weigh' | 'tickets'>('weigh');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inbound' | 'outbound' | 'internal'>('all');
  
  const [viewingTicket, setViewingTicket] = useState<ScaleTicket | null>(null);
  const [printingTicket, setPrintingTicket] = useState<ScaleTicket | null>(null);

  // FORM FIELDS FOR THE PLATFORM SCALE
  const [operationType, setOperationType] = useState<'inbound' | 'outbound' | 'internal'>('inbound');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [customMaterialName, setCustomMaterialName] = useState('ربطة حديد تسليح عز 12 مم');
  const [personType, setPersonType] = useState<'client' | 'supplier'>('supplier');
  const [personId, setPersonId] = useState('');
  
  // Tare/Pallet properties (weight of wooden pallet, steel straps, straps, packaging)
  const [palletWeight, setPalletWeight] = useState<number>(50); // Default 50kg tare
  const [numberOfBundles, setNumberOfBundles] = useState<number>(1);
  const [pricePerUnit, setPricePerUnit] = useState<string>('');
  const [priceUnit, setPriceUnit] = useState<'ton' | 'kg'>('ton');
  const [plateNumber, setPlateNumber] = useState(''); // Optional truck info
  const [driverName, setDriverName] = useState(''); // Optional driver info
  const [notes, setNotes] = useState('');

  // Sessional Weight Register (Accumulate multiple bundles/weighs before saving the whole ticket!)
  const [batchItems, setBatchItems] = useState<{ id: string; materialName: string; weight: number; palletWeight: number; netWeight: number }[]>([]);

  // Automatically update Person Type when Operation Type changes
  useEffect(() => {
    if (operationType === 'inbound') {
      setPersonType('supplier');
    } else if (operationType === 'outbound') {
      setPersonType('client');
    }
  }, [operationType]);

  // Alert for maximum weight limits (20 to 40 tons)
  const maxCapacityLimit = 40000; // 40 tons max limit
  const isOverloaded = scaleWeight > maxCapacityLimit;
  const isScaleOptimal = scaleWeight >= 20000 && scaleWeight <= 40000; // Optimal heavy range requested by user

  // Serial Connection
  // الحماية المضافة لمنع تكرار فتح البورت المفتوح بالفعل
  const connectSerial = async () => {
    if (!serialDriverInstanceRef.current) return;
    
    // 1. إذا كان الميزان متصلاً بالفعل، لا تحاول الفتح مجدداً لمنع الخطأ الأحمر
    if (scaleConnected) {
      console.log('Scale is already active and connected.');
      return;
    }

    try {
      setSerialError(null);
      await serialDriverInstanceRef.current.connect(
        (weight) => {
          setScaleWeight(weight);
          setLiveScaleWeight(weight);
        },
        (connected, msg) => {
          setScaleConnected(connected);
          if (!connected && msg) {
            setSerialError(msg);
          }
        },
        { baudRate: Number(baudRate) }
      );
      logActivity('اتصال بالميزان', `تم الاتصال بنجاح بميزان الحديد الأرضي عبر الـ USB بسرعات باود ${baudRate}`);
    } catch (err: any) {
      // 2. فحص ذكي: إذا كان البورت مفتوحاً بالفعل في الخلفية لتهدئة الخطأ ومنع تجميد البرنامج
      if (err.message && err.message.includes('already open')) {
        setScaleConnected(true);
        setSerialError(null);
        console.log('Safe Handshake: Handled port already open exception successfully.');
        return;
      }

      const isCancellation = 
        err.name === 'NotFoundError' || 
        err.name === 'AbortError' || 
        (err.message && (err.message.includes('No port selected') || err.message.includes('user cancelled') || err.message.includes('canceled')));
      
      if (isCancellation) {
        setSerialError(null);
      } else {
        console.error('Serial Connection Error:', err);
        setSerialError(err.message || 'فشل الاتصال بالميزان الفيزيائي');
      }
      setScaleConnected(false);
    }
  };

  const disconnectSerial = async () => {
    if (serialDriverInstanceRef.current) {
      await serialDriverInstanceRef.current.disconnect();
      setScaleConnected(false);
      setScaleWeight(0);
      setLiveScaleWeight(0);
    }
  };

  useEffect(() => {
    if (state.liveScaleWeight !== undefined && state.liveScaleWeight !== scaleWeight) {
      setScaleWeight(state.liveScaleWeight);
    }
  }, [state.liveScaleWeight]);

  // Active steel material display name helper
  const selectedMaterialName = useMemo(() => {
    const item = state.inventory.find(i => i.id === inventoryItemId);
    return item ? item.name : customMaterialName;
  }, [inventoryItemId, customMaterialName, state.inventory]);

  // Add the current scale weight as a bundle to our active batch list
  const handleAddBundleToBatch = () => {
    if (scaleWeight <= 0) {
      alert('الرجاء تعيين وزن على الميزان أولاً لمطابقة قراءة الطرد الحالية');
      return;
    }
    
    const netWeight = Math.max(0, scaleWeight - palletWeight);
    const newBundle = {
      id: `bundle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      materialName: selectedMaterialName,
      weight: scaleWeight,
      palletWeight: palletWeight,
      netWeight: netWeight
    };

    setBatchItems(prev => [...prev, newBundle]);
    logActivity('ميزان - إضافة طرد', `تم إدراج طرد حديد بوزن قائم ${scaleWeight} كجم (صافي: ${netWeight} كجم) للشحنة الجارية`);
    
    // Auto-increment bundle counter to represent progressive batches
    setNumberOfBundles(prev => prev + 1);
  };

  // Remove a bundle from active batch
  const handleRemoveBundleFromBatch = (bundleId: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== bundleId));
  };

  // Totalized values of the current weighing operation (Either a single direct weigh, or a sum of multiple batch bundles)
  const currentWeighTotals = useMemo(() => {
    // If we have items in the batch list, we aggregate them
    if (batchItems.length > 0) {
      const gross = batchItems.reduce((acc, i) => acc + i.weight, 0);
      const tare = batchItems.reduce((acc, i) => acc + i.palletWeight, 0);
      const net = batchItems.reduce((acc, i) => acc + i.netWeight, 0);
      
      const pricePerUnitNum = parseFloat(pricePerUnit) || 0;
      let totalAmount = 0;
      if (pricePerUnitNum > 0) {
        if (priceUnit === 'ton') {
          totalAmount = Math.round((net / 1000) * pricePerUnitNum);
        } else {
          totalAmount = Math.round(net * pricePerUnitNum);
        }
      }

      return {
        gross,
        tare,
        net,
        totalAmount,
        itemCount: batchItems.length
      };
    }

    // Otherwise, calculate based on the live single scale weight inputs directly
    const gross = scaleWeight;
    const tare = palletWeight * numberOfBundles;
    const net = Math.max(0, gross - tare);

    const pricePerUnitNum = parseFloat(pricePerUnit) || 0;
    let totalAmount = 0;
    if (pricePerUnitNum > 0) {
      if (priceUnit === 'ton') {
        totalAmount = Math.round((net / 1000) * pricePerUnitNum);
      } else {
        totalAmount = Math.round(net * pricePerUnitNum);
      }
    }

    return {
      gross,
      tare,
      net,
      totalAmount,
      itemCount: numberOfBundles
    };
  }, [batchItems, scaleWeight, palletWeight, numberOfBundles, pricePerUnit, priceUnit]);

  // Submit and save the approved scale ticket
  const handleSaveScaleTicket = (e: React.FormEvent) => {
    e.preventDefault();

    const totals = currentWeighTotals;
    if (totals.net <= 0) {
      alert('الرجاء التأكد من وجود وزن صافٍ معتمد لتسجيل بون ميزان الحديد الأرضي');
      return;
    }

    const ticketNumber = `W-${String(state.scaleTickets.length + 1).padStart(5, '0')}`;
    const activeTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const activeDate = new Date().toISOString().split('T')[0];

    const party = operationType !== 'internal'
      ? (personType === 'client'
          ? state.clients.find(c => c.id === personId)
          : state.suppliers.find(s => s.id === personId))
      : undefined;

    const inventoryItem = state.inventory.find(i => i.id === inventoryItemId);

    // Let's formulate a summary description for the notes if batching was used
    let formattedNotes = notes;
    if (batchItems.length > 0) {
      const batchSummary = batchItems.map((b, idx) => `طرد ${idx + 1}: ${b.netWeight} كجم`).join(' | ');
      formattedNotes = notes ? `${notes} (${batchSummary})` : `تفاصيل الطرود: ${batchSummary}`;
    }

    const newTicket: Omit<ScaleTicket, 'id' | 'createdAt'> = {
      ticketNumber,
      date: activeDate,
      time: activeTime,
      plateNumber: plateNumber.trim().toUpperCase() || 'ميزان أرضي دائم',
      driverName: driverName.trim() || 'أمين ساحة الحديد',
      materialName: selectedMaterialName,
      inventoryItemId: inventoryItemId || undefined,
      personId: party?.id,
      personType: party?.type,
      personName: party?.name,
      firstWeight: totals.gross, // Save gross weight into firstWeight for database integrity
      firstWeightTime: `${activeDate} ${activeTime}`,
      firstWeightType: 'gross',
      grossWeight: totals.gross,
      tareWeight: totals.tare,
      netWeight: totals.net,
      finalNetWeight: totals.net,
      status: 'completed', // Saved immediately as completed for floor scales
      type: operationType,
      notes: formattedNotes,
      operatorName: user?.username || 'أمين الميزان',
      pricePerUnit: parseFloat(pricePerUnit) || undefined,
      priceUnit: priceUnit,
      totalPrice: totals.totalAmount || undefined,
      batchItems: batchItems.length > 0 ? [...batchItems] : undefined
    };

    const saved = addScaleTicket(newTicket);
    logActivity('ميزان - بون حديد', `تسجيل بون ميزان حديد أرضي رقم ${ticketNumber} بوزن صافي ${totals.net.toLocaleString()} كجم`);

    // Reset forms and session registers
    setBatchItems([]);
    setNotes('');
    setPlateNumber('');
    setDriverName('');
    setPricePerUnit('');
    setNumberOfBundles(1);

    // Open print layout immediately
    setPrintingTicket(saved);
  };

  // Convert Scale Ticket to Invoice
  const handleCreateInvoiceFromTicket = (ticket: ScaleTicket) => {
    if (ticket.status !== 'completed') return;

    const isSales = ticket.type === 'outbound' || (ticket.type === 'internal' && ticket.firstWeightType === 'tare');
    const invType = isSales ? 'sales' : 'purchase';
    const partyType = isSales ? 'client' : 'supplier';
    
    const invoiceNum = getSequentialInvoiceNumber(invType);
    const weightInKg = ticket.finalNetWeight;
    
    // Invoices operate in kilograms (كجم).
    // Convert price to price per kg if given per ton
    let unitPricePerKg = 46;
    if (ticket.pricePerUnit) {
      if (ticket.priceUnit === 'ton' || ticket.pricePerUnit > 1000) {
        unitPricePerKg = ticket.pricePerUnit / 1000;
      } else {
        unitPricePerKg = ticket.pricePerUnit;
      }
    } else {
      unitPricePerKg = isSales ? 46 : 40;
    }

    const calculatedTotal = ticket.totalPrice || Math.round(weightInKg * unitPricePerKg);

    const invoiceItems: InvoiceItem[] = [];
    
    if (ticket.batchItems && ticket.batchItems.length > 0) {
      // Use detailed batch items
      ticket.batchItems.forEach((item, idx) => {
        let itemUnitPrice = unitPricePerKg;
        if (item.pricePerUnit) {
          itemUnitPrice = item.priceUnit === 'ton' ? item.pricePerUnit / 1000 : item.pricePerUnit;
        }
        
        invoiceItems.push({
          id: `item-${idx + 1}`,
          inventoryItemId: item.inventoryItemId || ticket.inventoryItemId,
          description: `${item.materialName} - بون ميزان #${ticket.ticketNumber} (وزن صافي: ${item.netWeight.toLocaleString()} كجم)`,
          quantity: item.netWeight,
          unitPrice: itemUnitPrice,
          total: Math.round(item.netWeight * itemUnitPrice),
          scaleApproved: true,
          scaleMode: 'ticket',
          scaleTicketId: ticket.id,
          scaleGrossWeight: item.weight,
          scaleTareWeight: item.palletWeight,
          scaleNetWeight: item.netWeight
        });
      });
    } else {
      // Single summary item
      invoiceItems.push({
        id: 'item-1',
        inventoryItemId: ticket.inventoryItemId,
        description: `${ticket.materialName} - بموجب بون وزن ميزان رقم ${ticket.ticketNumber} (وزن صافي: ${ticket.finalNetWeight.toLocaleString()} كجم)`,
        quantity: weightInKg,
        unitPrice: unitPricePerKg,
        total: calculatedTotal,
        scaleApproved: true,
        scaleMode: 'ticket',
        scaleTicketId: ticket.id,
        scaleGrossWeight: ticket.grossWeight,
        scaleTareWeight: ticket.tareWeight,
        scaleDeductionWeight: ticket.deductionWeight || 0,
        scaleNetWeight: ticket.finalNetWeight
      });
    }

    const finalSubtotal = invoiceItems.reduce((acc, item) => acc + item.total, 0);

    const newInvoice: Omit<Invoice, 'id' | 'createdAt'> = {
      invoiceNumber: invoiceNum,
      personId: ticket.personId || '1',
      personType: partyType,
      type: invType,
      category: 'general',
      date: new Date().toISOString().split('T')[0],
      items: invoiceItems,
      subtotal: finalSubtotal,
      discount: 0,
      total: finalSubtotal,
      paidAmount: 0,
      remainingAmount: finalSubtotal,
      notes: `فاتورة مجمعة من الميزان بون رقم ${ticket.ticketNumber}. عدد الطرود: ${invoiceItems.length}.`
    };

    const res = addInvoice(newInvoice);
    if (res.success) {
      alert(`تم بنجاح توليد فاتورة ${isSales ? 'مبيعات' : 'مشتريات'} رقم ${invoiceNum} بالوزن الصافي (${weightInKg.toLocaleString()} كجم) وتحديث الحسابات والمخزون!`);
      logActivity('فاتورة من ميزان', `تم إنشاء الفاتورة رقم ${invoiceNum} تلقائياً من تذكرة وزن الميزان ${ticket.ticketNumber} بوزن ${weightInKg} كجم`);
    } else {
      alert(`حدث خطأ أثناء حفظ الفاتورة: ${res.error}`);
    }
  };

  // Filter Scale Tickets
  const filteredTickets = useMemo(() => {
    return state.scaleTickets.filter(t => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        t.ticketNumber.toLowerCase().includes(q) || 
        t.plateNumber.toLowerCase().includes(q) ||
        (t.driverName && t.driverName.toLowerCase().includes(q)) ||
        (t.materialName && t.materialName.toLowerCase().includes(q)) ||
        (t.personName && t.personName.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' ? true : t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [state.scaleTickets, searchTerm, typeFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header with scale capacity declaration */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Scale className="w-8 h-8 text-emerald-600 animate-pulse" />
            ميزان حديد أرضي (طبلية صناعي)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            منظومة وزن ربطات الحديد ولفائف الصاج والطرود الثقيلة (حمولة من ٢٠ طن إلى ٤٠ طن) مع قراءة تسلسلية مباشرة
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm font-semibold">
          <button
            onClick={() => setTab('weigh')}
            className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${tab === 'weigh' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Weight className="w-4 h-4" />
            شاشة الميزان الحالية
          </button>
          <button
            onClick={() => setTab('tickets')}
            className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${tab === 'tickets' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <History className="w-4 h-4" />
            سجل أوزان الحديد ({state.scaleTickets.length})
          </button>
        </div>
      </div>

      {tab === 'weigh' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Right Area: Weight indicator + Configuration panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* LED Weighing Indicator styled for standard floor/platform scales */}
            <div className="bg-slate-900 text-slate-100 rounded-3xl border-4 border-slate-800 shadow-2xl p-6 relative overflow-hidden print:hidden">
              <div className="absolute top-2 left-4 text-xs font-mono text-slate-500 tracking-wider">
                HEAVY STEEL SCALE • MODEL SL-40T
              </div>
              
              <div className="flex justify-between items-start mt-2">
                <div className="flex gap-3">
                  {/* Stable / Zero / In-motion Indicators */}
                  <div className="flex flex-col items-center">
                    <span className={`w-3.5 h-3.5 rounded-full ${stable ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'} mb-1`}></span>
                    <span className="text-[10px] text-slate-400 font-bold">مستقر</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`w-3.5 h-3.5 rounded-full ${scaleWeight === 0 ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-700'} mb-1`}></span>
                    <span className="text-[10px] text-slate-400 font-bold">تصفير</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`w-3.5 h-3.5 rounded-full ${scaleWeight >= 20000 && scaleWeight <= 40000 ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-700'} mb-1`}></span>
                    <span className="text-[10px] text-slate-400 font-bold">حمولة مثالية</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex gap-2">
                    {scaleConnected ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-black flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          اتصال نشط بالميزان: {comPort}
                        </span>
                        <span className="text-[10px] text-emerald-500/70 font-bold">جاري استقبال البيانات الحية...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1 text-left">
                        <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-3 py-1 rounded-full font-black flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                          الميزان غير متصل
                        </span>
                        <span className="text-[10px] text-rose-500/70 font-bold">يرجى ربط المنفذ التسلسلي</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">طاقة الميزان: حمولة ٢٠ - ٤٠ طن بحد أقصى</span>
                </div>
              </div>

              {/* Heavy Digital Weight Counter */}
              <div className="py-8 text-center relative select-none">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-full max-w-2xl bg-[radial-gradient(circle,_rgba(16,185,129,0.05)_0%,_transparent_70%)]"></div>
                </div>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[90px] font-bold text-slate-800 opacity-10 tracking-widest" dir="ltr">
                  888888
                </span>
                <span className={`relative font-mono text-7xl md:text-9xl font-black transition-all duration-300 tracking-widest ${isOverloaded ? 'text-rose-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.7)]' : isScaleOptimal ? 'text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]' : 'text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]'}`} dir="ltr">
                  {scaleWeight.toLocaleString()}
                </span>
                <span className="text-3xl font-black text-slate-500 mr-4">كجم</span>
              </div>

              {/* Overload alarm or Optimal notifications */}
              {isOverloaded ? (
                <div className="bg-rose-950 border border-rose-800 text-rose-300 px-4 py-2.5 rounded-2xl flex items-center gap-2 mb-4 animate-bounce">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-rose-200">تحذير أمني: تم تجاوز الطاقة القصوى للميزان (٤٠ طن)!</p>
                    <p className="text-rose-400 mt-0.5">الرجاء إزالة الوزن فوراً لمنع تدمير خلايا الوزن ومستشعرات الضغط الأرضية.</p>
                  </div>
                </div>
              ) : isScaleOptimal ? (
                <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-2xl flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-emerald-200">الوزن الحالي في النطاق المثالي المستهدف (٢٠ - ٤٠ طن)</p>
                    <p className="text-emerald-400 mt-0.5">حمولة حديد ممتازة ومثالية للشحن المباشر.</p>
                  </div>
                </div>
              ) : null}

              {/* Conversion and Tafqit */}
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">ما يعادل بالطن:</span>
                  <span className="text-slate-200 font-mono text-sm">{(scaleWeight / 1000).toFixed(3)} طن</span>
                </div>
                <div className="text-right truncate max-w-[60%]">
                  <span className="text-slate-500">تفقيط الوزن:</span>{' '}
                  <span className="text-amber-500 font-medium">{convertNumberToArabicWords(scaleWeight)}</span>
                </div>
              </div>
            </div>

            {/* Industrial Scale Control Console */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4 text-slate-500 animate-spin-slow" />
                  لوحة الربط والتحكم في ميزان الحديد الأرضي (طبلية)
                </h3>
                
                <div className="flex items-center gap-2">
                  <select 
                    value={comPort} 
                    onChange={(e) => setComPort(e.target.value)}
                    disabled={scaleConnected}
                    className="text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1 outline-none text-slate-700 font-bold"
                  >
                    <option value="COM1">COM1</option>
                    <option value="COM2">COM2</option>
                    <option value="COM3">COM3</option>
                    <option value="COM4">COM4</option>
                  </select>
                  
                  {scaleConnected ? (
                    <button 
                      onClick={disconnectSerial}
                      className="bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs px-3 py-1 rounded font-bold transition-all flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" /> فصل الميزان
                    </button>
                  ) : (
                    <button 
                      onClick={connectSerial}
                      className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs px-3 py-1 rounded font-bold transition-all flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> ربط الميزان
                    </button>
                  )}
                </div>
              </div>

              {serialError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-semibold flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                    <div className="space-y-1">
                      <p className="font-black">تنبيه: تعذر الوصول المباشر للميزان (Serial Port)</p>
                      <p className="opacity-80">نظراً لسياسات أمان المتصفح، قد يتطلب الربط المباشر فتح التطبيق في نافذة مستقلة أو استخدام متصفح يدعم Web Serial.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="bg-amber-600 text-white px-3 py-1.5 rounded-lg font-black hover:bg-amber-700 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <X className="w-3 h-3 rotate-45" /> فتح في نافذة مستقلة
                    </button>
                    <button 
                      onClick={() => setSerialError('')}
                      className="bg-white border border-amber-300 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-100 transition-all"
                    >
                      تجاهل واستخدام الإدخال اليدوي السريع
                    </button>
                  </div>
                </div>
              )}

              {/* Scale lock control */}
              <div className="flex justify-end items-center gap-2">
                <label className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    checked={stable} 
                    onChange={(e) => setStable(e.target.checked)} 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  ثبات قفل الوزن المعتمد
                </label>
                <button 
                  onClick={() => {
                    setScaleWeight(0);
                    setLiveScaleWeight(0);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded font-bold transition-all"
                >
                  تصفير القراءة
                </button>
              </div>
            </div>

            {/* MAIN DIRECT WEIGHING FORM */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  تسجيل أوزان الشحنة الحالية بالتفصيل
                </h3>
                
                <span className="text-xs font-bold text-slate-400">ميزان حديد أرضي مباشر</span>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Operation Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">نوع الحركة</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 font-bold">
                      <button
                        type="button"
                        onClick={() => setOperationType('inbound')}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${operationType === 'inbound' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                      >
                        وارد (مشتريات حديد)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOperationType('outbound')}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${operationType === 'outbound' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                      >
                        صادر (مبيعات حديد)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOperationType('internal')}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${operationType === 'internal' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                      >
                        تشغيل داخلي / جرد
                      </button>
                    </div>
                  </div>

                  {/* Steel Category selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">صنف الحديد من المخزن</label>
                    <select
                      value={inventoryItemId}
                      onChange={(e) => setInventoryItemId(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    >
                      <option value="">صنف حديد مخصص (اكتب بالأسفل)</option>
                      {state.inventory.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantity} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client / Supplier Link */}
                  {operationType !== 'internal' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        الجهة المستهدفة ({personType === 'client' ? 'العميل' : 'المورد'})
                      </label>
                      <select
                        value={personId}
                        onChange={(e) => setPersonId(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                      >
                        <option value="">بدون تحديد جهة</option>
                        {personType === 'client' 
                          ? state.clients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                          : state.suppliers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                        }
                      </select>
                    </div>
                  )}
                </div>

                {!inventoryItemId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">اسم خامة الحديد الموزونة بالتفصيل</label>
                    <input
                      type="text"
                      placeholder="مثال: حديد تسليح عز 12مم ربطة كاملة"
                      value={customMaterialName}
                      onChange={(e) => setCustomMaterialName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    />
                  </div>
                )}

                {/* Packaging and Tare calculations */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                  {/* Weight of wrapper strap/pallet (وزن الفاصل أو طبلية الخشب) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">وزن فاصل الرباط/الطبلية (كجم)</label>
                    <input
                      type="number"
                      min="0"
                      value={palletWeight}
                      onChange={(e) => setPalletWeight(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">يتم خصمه تلقائياً كوزن فارغ</span>
                  </div>

                  {/* Multi-batch bundles option (for weighing bundles sequentially) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">عدد طرود الشحنة</label>
                    <input
                      type="number"
                      min="1"
                      disabled={batchItems.length > 0}
                      value={numberOfBundles}
                      onChange={(e) => setNumberOfBundles(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold disabled:opacity-60"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {batchItems.length > 0 ? 'معطل (يتم احتساب الطرود بالجدول أدناه)' : 'عدد الطرود الموزونة معاً'}
                    </span>
                  </div>

                  {/* Unit Pricing */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">سعر طن / كيلو الحديد</label>
                    <input
                      type="number"
                      placeholder="٤٤٠٠٠ ج.م للطن"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    />
                  </div>

                  {/* Price Unit Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">وحدة التسعير المعتمدة</label>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 font-bold">
                      <button
                        type="button"
                        onClick={() => setPriceUnit('ton')}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${priceUnit === 'ton' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                      >
                        لكل طن
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceUnit('kg')}
                        className={`flex-1 py-1.5 text-xs rounded-lg transition-all ${priceUnit === 'kg' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
                      >
                        لكل كجم
                      </button>
                    </div>
                  </div>
                </div>

                {/* Multiple Bundles Sequential Batching Area */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-700 flex items-center gap-1">
                      <Layers className="w-4 h-4 text-slate-500" />
                      نظام وزن الطرود المتتالية (للوزن التدريجي ربطة بربطة):
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddBundleToBatch}
                      className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة قراءة الوزن الحالية كطرد منفرد
                    </button>
                  </div>

                  {batchItems.length > 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                            <th className="px-4 py-2">رقم الطرد</th>
                            <th className="px-4 py-2">اسم الصنف</th>
                            <th className="px-4 py-2">الوزن القائم</th>
                            <th className="px-4 py-2">وزن الفاصل (خصم)</th>
                            <th className="px-4 py-2">الوزن الصافي المعتمد</th>
                            <th className="px-4 py-2 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchItems.map((item, index) => (
                            <tr key={item.id} className="border-b border-slate-200/50 even:bg-slate-50/70 odd:bg-white hover:bg-blue-50/40 transition-colors">
                              <td className="px-4 py-2 font-bold text-slate-500">طرد رقم {index + 1}</td>
                              <td className="px-4 py-2 font-semibold text-slate-800">{item.materialName}</td>
                              <td className="px-4 py-2 font-mono font-bold">{item.weight.toLocaleString()} كجم</td>
                              <td className="px-4 py-2 font-mono text-rose-600">-{item.palletWeight} كجم</td>
                              <td className="px-4 py-2 font-mono font-black text-emerald-700">{item.netWeight.toLocaleString()} كجم</td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBundleFromBatch(item.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors"
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
                    <p className="text-xs text-slate-400 italic">
                      * تلميح: يمكنك إدراج ربطات الحديد ولفائف الصاج واحدة تلو الأخرى في الجدول لجمعها في بون وزن نهائي واحد، أو الاكتفاء بالوزن المباشر للكمية دفعة واحدة.
                    </p>
                  )}
                </div>

                {/* Optional transport vehicle tracking details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">رقم شاحنة النقل / سيارة الاستلام (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: ر ع ص ٤٥٦"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">اسم السائق / المستلم المفوّض (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: شعبان عبد الهادي"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Notes and Action Saving */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات البون</label>
                    <input
                      type="text"
                      placeholder="أي ملاحظات حول جودة الحديد، تفاصيل الأطوال، أو الشوائب..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleSaveScaleTicket}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 font-extrabold transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Save className="w-5 h-5" />
                    حفظ وإصدار بون ميزان الحديد
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Left Column: Direct Weight Calculations & Action Dashboard Card */}
          <div className="space-y-6">
            
            {/* Live Weighing calculation totals summary card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                ملخص حسابات أوزان الحديد بالشحنة
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">عدد ربطات/طرود الحديد الموزونة:</span>
                  <span className="font-bold text-slate-800 font-mono text-base">
                    {currentWeighTotals.itemCount} طرود
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">إجمالي الوزن القائم للحديد:</span>
                  <span className="font-bold text-slate-800 font-mono text-base">
                    {currentWeighTotals.gross.toLocaleString()} كجم
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm text-rose-600">
                  <span className="font-medium">إجمالي وزن خصم الفواصل/الطرود:</span>
                  <span className="font-bold font-mono text-base">
                    -{currentWeighTotals.tare.toLocaleString()} كجم
                  </span>
                </div>

                <div className="border-t border-dashed border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-slate-700 font-bold">الوزن الصافي النهائي:</span>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 font-mono text-2xl">
                      {currentWeighTotals.net.toLocaleString()}
                    </span>
                    <span className="text-xs text-emerald-600 font-bold mr-1">كجم</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl">
                  <span>ما يعادل بالطن:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {(currentWeighTotals.net / 1000).toFixed(3)} طن حديد
                  </span>
                </div>
              </div>

              {/* Price Calculations if inputted */}
              {parseFloat(pricePerUnit) > 0 && (
                <div className="border-t border-slate-100 pt-4 space-y-3 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">حساب القيمة المالية للشحنة:</span>
                    <span className="text-xs font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                      {priceUnit === 'ton' ? 'سعر للطن' : 'سعر للكجم'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 font-medium">سعر الوحدة المقدر:</span>
                    <span className="text-sm font-bold text-slate-700">
                      {parseFloat(pricePerUnit).toLocaleString()} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                    <span className="text-sm font-bold text-slate-800">إجمالي القيمة المقدرة:</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      {currentWeighTotals.totalAmount.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick steel weighbridge guidance */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 space-y-3 text-emerald-950 text-xs font-semibold">
              <h4 className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                دليل تشغيل ميزان الحديد الأرضي:
              </h4>
              <ul className="space-y-2 list-disc list-inside text-emerald-800">
                <li>الميزان مبرمج للوزن المباشر لطرود وربطات وصاج الحديد لغاية ٤٠ طن.</li>
                <li>يتم خصم وزن الفواصل والطبالي والرافعات الملحقة آلياً بناءً على الحقل المعين.</li>
                <li>لتسجيل عدة ربطات متعاقبة، استخدم زر "إضافة قراءة الوزن" لتسجيلها تلو الأخرى.</li>
                <li>بمجرد الحفظ، يتولد بون وزن معتمد وجاهز للطباعة والربط المالي بالفواتير فوراً.</li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* VIEW TICKETS HISTORY TAB */}
      {tab === 'tickets' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Header & Filters */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              سجل بطاقات وأوزان ميزان الحديد المعتمدة
            </h3>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search bar */}
              <div className="relative flex-1 md:flex-initial md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث برقم البون، اسم الجهة، الصنف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all font-semibold"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-600 focus:bg-white"
              >
                <option value="all">كل الحركات</option>
                <option value="inbound">وارد (مشتريات)</option>
                <option value="outbound">صادر (مبيعات)</option>
                <option value="internal">داخلي / جرد</option>
              </select>

              {/* Clear All Scale Tickets */}
              {state.scaleTickets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                  title="مسح جميع بطاقات الوزن المحفوظة في السجل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل بالكامل</span>
                </button>
              )}
            </div>
          </div>

          {/* Scale tickets table */}
          {filteredTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="px-6 py-4">رقم البون</th>
                    <th className="px-6 py-4">تاريخ ووقت الوزن</th>
                    <th className="px-6 py-4">صنف الحديد</th>
                    <th className="px-6 py-4">الجهة / الشريك</th>
                    <th className="px-6 py-4">الوزن القائم</th>
                    <th className="px-6 py-4">الوزن الفاصل (خصم)</th>
                    <th className="px-6 py-4">الوزن الصافي</th>
                    <th className="px-6 py-4">القيمة المالية</th>
                    <th className="px-6 py-4 text-center">إجراءات الميزان المالي</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-slate-100 even:bg-slate-50/75 odd:bg-white hover:bg-emerald-50/40 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-800">
                        #{ticket.ticketNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        <div>{ticket.date}</div>
                        <div className="text-[10px] mt-0.5">{ticket.time}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {ticket.materialName}
                      </td>
                      <td className="px-6 py-4">
                        {ticket.personName ? (
                          <span className="font-semibold text-slate-800">{ticket.personName}</span>
                        ) : (
                          <span className="text-slate-400 italic">داخلي / عام</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">
                        {ticket.grossWeight.toLocaleString()} كجم
                      </td>
                      <td className="px-6 py-4 font-mono text-rose-600">
                        -{ticket.tareWeight.toLocaleString()} كجم
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-emerald-50 text-emerald-800 font-mono font-black text-sm px-2.5 py-1 rounded-lg border border-emerald-100">
                          {ticket.finalNetWeight.toLocaleString()} كجم
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {ticket.totalPrice ? `${ticket.totalPrice.toLocaleString()} ج.م` : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {/* Print scale receipt */}
                          <button
                            onClick={() => setPrintingTicket(ticket)}
                            title="طباعة بون الميزان المعتمد"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Quick Invoice generation */}
                          {ticket.personId && (
                            <button
                              onClick={() => handleCreateInvoiceFromTicket(ticket)}
                              title="توليد فاتورة محاسبية فورية"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg border border-emerald-200 transition-colors"
                            >
                              <ShoppingBag className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete ticket */}
                          <button
                            type="button"
                            onClick={() => setTicketToDelete(ticket)}
                            title="حذف البون نهائياً"
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg transition-colors hover:bg-rose-50 border border-transparent hover:border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-sm">لا توجد بطاقات وزن مسجلة مطابقة للبحث حالياً</p>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM SINGLE TICKET DELETION MODAL */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">تأكيد حذف وزنة الميزان</h3>
                <p className="text-xs text-slate-500 font-semibold">سيتم حذف هذا السجل نهائياً من قاعدة البيانات</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">رقم البون:</span>
                <span className="font-black text-slate-800">#{ticketToDelete.ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">الصنف:</span>
                <span className="font-bold text-slate-700">{ticketToDelete.materialName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">الجهة:</span>
                <span className="font-bold text-slate-700">{ticketToDelete.personName || 'داخلي / عام'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">الوزن الصافي المعتمد:</span>
                <span className="font-mono font-black text-emerald-700">{ticketToDelete.finalNetWeight.toLocaleString('ar-EG')} كجم</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteScaleTicket(ticketToDelete.id);
                  logActivity('حذف بون ميزان', `تم حذف بطاقة الوزن رقم ${ticketToDelete.ticketNumber} بوزن صافي ${ticketToDelete.finalNetWeight} كجم`);
                  setTicketToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-colors shadow-md shadow-rose-200"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR ALL TICKETS MODAL */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">تأكيد مسح سجل الميزان بالكامل</h3>
                <p className="text-xs text-rose-500 font-semibold">تحذير: سيتم حذف جميع بطاقات الوزن ({state.scaleTickets.length} بون) نهائياً!</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/50 p-3 rounded-xl border border-rose-100">
              هل أنت متأكد من رغبتك في تفريغ سجل الأوزان بالكامل؟ لن تتمكن من استرجاع هذه البيانات بعد المسح.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  state.scaleTickets.forEach(t => deleteScaleTicket(t.id));
                  logActivity('مسح سجل الميزان', 'تم مسح سجل أوزان الميزان بالكامل');
                  setShowClearAllModal(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-colors shadow-md shadow-rose-200"
              >
                مسح جميع السجلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINT DIALOG OVERLAY */}
      {printingTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:absolute print:inset-0">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col print:overflow-visible print:max-h-none print:shadow-none print:border-none print:max-w-full">
            
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center print:hidden">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Printer className="w-5 h-5 text-emerald-600" />
                معاينة بون ميزان الحديد الأرضي المعتمد
              </h3>
              <button 
                onClick={() => setPrintingTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div id="print-area" className="p-10 space-y-8 text-slate-900 text-sm relative overflow-hidden">
              {/* Decorative Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-30deg] pointer-events-none select-none">
                <Scale className="w-[500px] h-[500px]" />
              </div>

              {/* Header */}
              <div className="text-center space-y-3 border-b-4 border-double border-slate-900 pb-6 relative z-10">
                <div className="flex justify-between items-center px-4">
                  <div className="text-right">
                    <h2 className="text-2xl font-black tracking-tighter text-slate-900">{companyName}</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Steel & Iron Trading Co.</p>
                  </div>
                  <Scale className="w-12 h-12 text-slate-900" />
                  <div className="text-left text-[10px] font-bold text-slate-500">
                    <p>{new Date().toLocaleDateString('ar-EG')}</p>
                    <p>{new Date().toLocaleTimeString('ar-EG')}</p>
                  </div>
                </div>
                <div className="bg-slate-900 text-white py-1 px-4 inline-block rounded-lg font-black text-xs uppercase tracking-widest">
                  بون ميزان معتمد - ميزان طبلية أرضي (حمولة ٤٠ طن)
                </div>
              </div>

              {/* Receipt Body Info */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-10 text-xs font-bold pb-6 border-b border-slate-100 relative z-10">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">رقم البون:</span>
                  <span className="text-slate-900 font-black">#{printingTicket.ticketNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">تاريخ العملية:</span>
                  <span className="text-slate-900">{printingTicket.date} {printingTicket.time}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">الصنف الموزون:</span>
                  <span className="text-slate-900 font-extrabold">{printingTicket.materialName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">الجهة / العميل:</span>
                  <span className="text-slate-900">{printingTicket.personName || 'حركة داخلية / جرد'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">رقم السيارة:</span>
                  <span className="text-slate-900 font-black">{printingTicket.plateNumber || 'ميزان ثابت'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span className="text-slate-400">أمين الميزان:</span>
                  <span className="text-slate-900">{printingTicket.operatorName || '-'}</span>
                </div>
              </div>

              {/* Detailed Weights Section */}
              <div className="bg-white rounded-3xl border-2 border-slate-900 p-6 space-y-4 relative z-10 shadow-sm">
                {printingTicket.batchItems && printingTicket.batchItems.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <table className="w-full text-[11px] text-right">
                        <thead className="bg-slate-900 text-white font-black">
                          <tr>
                            <th className="px-3 py-2">م</th>
                            <th className="px-3 py-2">وصف الصنف التفصيلي</th>
                            <th className="px-3 py-2 text-center">قائم (كجم)</th>
                            <th className="px-3 py-2 text-center">فارغ (كجم)</th>
                            <th className="px-3 py-2 text-left">صافي (كجم)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {printingTicket.batchItems.map((item, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-3 py-1.5 font-bold text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-1.5 font-black text-slate-900">{item.materialName}</td>
                              <td className="px-3 py-1.5 font-mono text-center text-slate-600">{item.weight.toLocaleString()}</td>
                              <td className="px-3 py-1.5 font-mono text-center text-rose-600">-{item.palletWeight.toLocaleString()}</td>
                              <td className="px-3 py-1.5 font-mono font-black text-left text-slate-950">{item.netWeight.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center text-xs px-2">
                      <span className="text-slate-500 font-black">إجمالي عدد الطرود الموزونة:</span>
                      <span className="font-black text-slate-900 underline decoration-double">{printingTicket.batchItems.length} طرد</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black">الوزن القائم (Gross):</span>
                      <span className="font-mono font-black text-slate-900">
                        {printingTicket.grossWeight.toLocaleString()} كجم
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm text-rose-700">
                      <span className="font-black">وزن الفارغ / الطرود (Tare):</span>
                      <span className="font-mono font-black">
                        -{printingTicket.tareWeight.toLocaleString()} كجم
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-t-4 border-double border-slate-900 pt-4 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-slate-900 font-black text-base">صافي وزن الحديد المعتمد (NET)</span>
                    <span className="text-[10px] text-slate-400 font-bold">CERTIFIED NET WEIGHT</span>
                  </div>
                  <div className="text-left bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl shadow-slate-900/20">
                    <span className="font-mono font-black text-4xl">
                      {printingTicket.finalNetWeight.toLocaleString()}
                    </span>
                    <span className="text-sm font-black mr-2 opacity-60">كجم</span>
                  </div>
                </div>
              </div>

              {/* Arabic Words Conversion block */}
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-semibold text-center space-y-1">
                <span className="text-slate-400 text-[10px] block">تفقيط الوزن المعتمد كتابةً:</span>
                <span className="text-amber-400 font-black">
                  {convertNumberToArabicWords(printingTicket.finalNetWeight)}
                </span>
              </div>

              {/* Price calculation block if completed */}
              {printingTicket.pricePerUnit && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block mb-0.5">سعر الطن/الكيلو:</span>
                    <span className="text-slate-800 font-extrabold">
                      {printingTicket.pricePerUnit.toLocaleString()} ج.م / {printingTicket.priceUnit === 'ton' ? 'طن' : 'كجم'}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-slate-400 block mb-0.5">إجمالي التكلفة التقريبية:</span>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      {printingTicket.totalPrice?.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              )}

              {/* Signatures Footer */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs pt-6">
                <div className="space-y-4">
                  <span className="text-slate-400 font-bold block">توقيع مستلم الحديد</span>
                  <div className="border-b border-slate-200 w-3/4 mx-auto h-4"></div>
                </div>
                <div className="space-y-4">
                  <span className="text-slate-400 font-bold block">أمين الميزان الأرضي: {printingTicket.operatorName}</span>
                  <div className="border-b border-slate-200 w-3/4 mx-auto h-4"></div>
                </div>
              </div>

              {/* Notice */}
              <div className="pt-6 border-t border-slate-100 space-y-2">
                <p className="text-[9px] text-center text-slate-400">
                  هذا البون يمثل مستند وزن معتمد وصادر إلكترونياً من ميزان طبلية الحديد الأرضي التابع لـ {companyName}.
                </p>
                <p className="text-[8px] text-center font-mono text-slate-300 opacity-80 uppercase tracking-tighter">
                  programmed by sabry elfeeb | Phone: 01065826742 | Email: sapry.eldeep@gmail.com
                </p>
              </div>

            </div>

            {/* Print Footer Action */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100 print:hidden">
              {printingTicket.personId ? (
                <button
                  onClick={() => {
                    handleCreateInvoiceFromTicket(printingTicket);
                    setPrintingTicket(null);
                  }}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  إصدار فاتورة محاسبية من كارت الميزان
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setPrintingTicket(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all text-sm"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    const printEl = document.getElementById('print-area');
                    if (printEl) triggerNativePrint(printEl, `تزكيت_ميزان_${printingTicket?.ticketNumber || ''}`);
                    else window.print();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all flex items-center gap-1 text-sm shadow-md"
                >
                  <Printer className="w-4 h-4" /> طباعة البون الفورية
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Embedded print styling for the invoice printable region */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            direction: rtl;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
