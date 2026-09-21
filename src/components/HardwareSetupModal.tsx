import React, { useState } from 'react';
import { X, RefreshCw, Printer, Scale } from 'lucide-react';
import { useAppStore } from '../store';

interface HardwareSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'printer' | 'scale';
}

export default function HardwareSetupModal({ isOpen, onClose, type }: HardwareSetupModalProps) {
  const { state, updateSettings } = useAppStore();
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [scaleModel, setScaleModel] = useState<string>('Yaohua XK3190');
  const [connecting, setConnecting] = useState(false);

  const requestSerialDevice = async () => {
    if (!('serial' in navigator)) {
      alert('متصفحك الحالي لا يدعم الوصول المباشر لمنافذ RS232/Serial (Web Serial API). يرجى استخدام متصفح Google Chrome.');
      return;
    }
    try {
      setConnecting(true);
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      updateSettings({
        ...state.settings,
        enableScaleIntegration: true,
      });
      alert(`تم الاقتران والاتصال المباشر بنجاح بمؤشر الميزان (${scaleModel}) عبر المنفذ التسلسلي بسرعة ${baudRate}.`);
      await port.close();
      onClose();
    } catch (err: any) {
      const isCancellation = 
        err.name === 'NotFoundError' || 
        err.name === 'AbortError' || 
        (err.message && (err.message.includes('No port selected') || err.message.includes('user cancelled') || err.message.includes('canceled')));
      if (!isCancellation) {
        alert(`فشل الاتصال بمنفذ الميزان: ${err.message || err}`);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleSavePrinter = (printerName: string) => {
    updateSettings({ ...state.settings, printerName });
    alert(`تم اعتماد طابعة النظام المباشرة: ${printerName}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <h2 className="text-lg font-black flex items-center gap-2">
            {type === 'scale' ? <Scale className="w-5 h-5 text-amber-400" /> : <Printer className="w-5 h-5 text-blue-400" />}
            {type === 'scale' ? 'إعدادات ربط الميزان البسكول والموازين المباشرة' : 'إعدادات طابعات الفواتير والإيصالات'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {type === 'scale' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 font-semibold space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-950">
                  🔌 الربط المباشر بمؤشر الميزان (Serial / RS232 / USB)
                </p>
                <p>يدعم النظام جميع شاشات الموازين العالمية (Yaohua, CAS, Avery, Toledo, Matrix, Rice Lake) بفك تشفير القراءات لحظياً.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع شاشة/مؤشر الميزان</label>
                  <select 
                    value={scaleModel} 
                    onChange={e => setScaleModel(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="Yaohua XK3190">Yaohua XK3190 (شائع الموازين)</option>
                    <option value="CAS ER-Plus / CI">CAS Series (كاس الكوري)</option>
                    <option value="Avery Weigh-Tronix">Avery Weigh-Tronix</option>
                    <option value="Mettler Toledo">Mettler Toledo</option>
                    <option value="Rice Lake IQ">Rice Lake IQ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">معدل نقل البيانات (Baud Rate)</label>
                  <select 
                    value={baudRate} 
                    onChange={e => setBaudRate(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold font-mono bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value={2400}>2400 Baud</option>
                    <option value={4800}>4800 Baud</option>
                    <option value={9600}>9600 Baud (قياسي)</option>
                    <option value={19200}>19200 Baud</option>
                    <option value={115200}>115200 Baud</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={requestSerialDevice}
                  disabled={connecting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 px-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} />
                  <span>{connecting ? 'جاري الاقتران بـ COM/USB...' : 'اختر منفذ الميزان واقترن الآن (Web Serial)'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 font-semibold space-y-1">
                <p className="font-bold flex items-center gap-1 text-blue-950">
                  🖨️ طباعة الفواتير والإيصالات الفورية
                </p>
                <p>يدعم النظام طابعات الحرارية (80mm) وطابعات الورق العادي (A4) مع إتاحة المعاينة الفورية قبل الطباعة.</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">طابعات النظام المتاحة للربط:</p>
                {['طابعة البون الحرارية (Thermal Receipt 80mm)', 'طابعة المستندات والعقود (A4 Printer)', 'معاينة القوالب وطباعة PDF المباشرة'].map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800">{p}</span>
                    </div>
                    <button
                      onClick={() => handleSavePrinter(p)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                    >
                      تعيين كافتراضي
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
