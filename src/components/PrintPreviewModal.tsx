import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Layout, Type, Image, FileSpreadsheet, FileText, CheckCircle, Wrench } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

import { triggerNativePrint } from '../utils/printHelper';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function PrintPreviewModal({ isOpen, onClose, title, children }: PrintPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Custom interactive layout toggles
  const [printerType, setPrinterType] = useState<'a4' | 'thermal' | 'workshop'>('a4');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showLogo, setShowLogo] = useState(true);
  const [showMiniStatement, setShowMiniStatement] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [customNotes, setCustomNotes] = useState('');

  // Extract initial notes from children if possible
  useEffect(() => {
    if (isOpen) {
      // Find default note if passed
      try {
        const props = (children as any)?.props;
        if (props?.settings?.invoiceNotes) {
          setCustomNotes(props.settings.invoiceNotes);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen, children]);

  // Handle printer activation
  const reactToPrintFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: title,
  });

  const handlePrint = () => {
    if (printRef.current) {
      triggerNativePrint(printRef.current, title);
    } else if (reactToPrintFn) {
      reactToPrintFn();
    } else {
      window.print();
    }
  };

  if (!isOpen) return null;

  // Clone child with interactive styling overrides
  const renderedTemplate = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        printerType,
        fontSize,
        showLogo,
        showMiniStatement,
        showSignatures,
        customNotes,
      })
    : children;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in transition-all">
      <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden border border-slate-300">
        
        {/* Header Dashboard & Styling Controls */}
        <div className="no-print bg-white px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Printer className="w-6 h-6 text-emerald-600 animate-pulse" />
              أستوديو الطباعة الذكي والمعاينة المباشرة
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              اضبط خصائص التصميم وشاهد التغييرات مباشرة قبل الطباعة الفعلية
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              تأكيد الطباعة الفعلية
            </button>
            <button 
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm cursor-pointer"
            >
              <X className="w-5 h-5" />
              إلغاء وإغلاق
            </button>
          </div>
        </div>

        {/* Workspace: Sidebar Settings on Left, Live View on Right */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Settings Sidebar */}
          <div className="no-print w-full lg:w-80 bg-white border-l border-slate-200 p-5 space-y-5 overflow-y-auto shrink-0 max-h-[30vh] lg:max-h-none text-right shadow-inner" dir="rtl">
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2">
              خيارات إعداد وتصميم الفاتورة
            </h3>

            {/* 1. Printer Layout */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700">نوع طابعة ونموذج الفاتورة المستهدفة</label>
              <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setPrinterType('a4')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${printerType === 'a4' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  A4 قياسي
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterType('thermal')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${printerType === 'thermal' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  حراري 80مم
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterType('workshop')}
                  className={`py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1 ${printerType === 'workshop' ? 'bg-amber-600 text-white shadow-sm font-black' : 'text-slate-600 hover:bg-slate-200'}`}
                  title="بون الورشة الداخلي للعمال - بدون أسعار مع حاسبة أبعاد الصاج"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  بون الورشة
                </button>
              </div>
            </div>

            {/* 2. Font size */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700">حجم الخط في الطباعة</label>
              <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setFontSize('sm')}
                  className={`py-1.5 rounded-lg transition-all ${fontSize === 'sm' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  صغير
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('md')}
                  className={`py-1.5 rounded-lg transition-all ${fontSize === 'md' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  متوسط
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('lg')}
                  className={`py-1.5 rounded-lg transition-all ${fontSize === 'lg' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                  كبير
                </button>
              </div>
            </div>

            {/* 3. Toggle items */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[11px] font-black text-slate-400">إظهار / إخفاء مكونات البون</h4>
              
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900">
                <input 
                  type="checkbox" 
                  checked={showLogo} 
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                />
                شعار الشركة والترويسة العلوية
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900">
                <input 
                  type="checkbox" 
                  checked={showMiniStatement} 
                  onChange={(e) => setShowMiniStatement(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                />
                كشف الحساب المصغر (الرصيد السابق والجديد)
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900">
                <input 
                  type="checkbox" 
                  checked={showSignatures} 
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4" 
                />
                خانات التوقيعات الرسمية للإدارة
              </label>
            </div>

            {/* 4. Live notes override */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-700">شروط وملاحظات الفاتورة (مباشر)</label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium"
                placeholder="اكتب ملاحظات إضافية تظهر أسفل الفاتورة المطبوعة..."
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-[11px] text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1 text-emerald-950">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                متوافق مع طابعات الإيصالات
              </p>
              <p className="font-semibold text-emerald-700">
                يتغير حجم وبنية الورقة تلقائياً لتناسب طابعات الحراري 80 مم أو ورق A4 بشكل كامل بدون أي هوامش تالفة.
              </p>
            </div>
          </div>

          {/* Live Preview Paper Canvas */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-slate-200/50 relative">
            <style>
              {`
                @media print {
                  body {
                    background: white !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  /* Custom page configuration based on selected printer type */
                  @page {
                    size: ${printerType === 'thermal' ? '80mm auto' : 'A4'};
                    margin: ${printerType === 'thermal' ? '2mm' : '15mm'};
                  }
                  /* Ensure full width in print mode */
                  .printable-content-width {
                    width: ${printerType === 'thermal' ? '100% !important' : '210mm !important'};
                    max-width: ${printerType === 'thermal' ? '80mm !important' : '100% !important'};
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 auto !important;
                  }
                }
              `}
            </style>
            
            {/* Wrapper adjusting dimensions dynamically to simulate the print target perfectly */}
            <div 
              ref={printRef}
              className={`printable-content-width bg-white shadow-xl transition-all duration-300 rounded-2xl relative overflow-hidden ${
                printerType === 'thermal' 
                  ? 'w-[80mm] p-4 min-h-[140mm] border border-slate-300 shadow-slate-300' 
                  : 'w-[210mm] min-h-[297mm] p-[15mm] border border-slate-300'
              }`}
            >
              {renderedTemplate}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
