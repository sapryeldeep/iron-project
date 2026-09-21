import React, { useEffect } from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { playWarningAlarm } from '../utils/audioAlarm';

interface WarningModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  onClose: () => void;
}

export default function WarningModal({
  isOpen,
  title,
  message,
  type = 'danger',
  onClose
}: WarningModalProps) {
  useEffect(() => {
    if (isOpen) {
      playWarningAlarm();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const headerColors = {
    danger: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-600 text-white',
  };

  const iconColors = {
    danger: 'text-rose-600 bg-rose-100',
    warning: 'text-amber-600 bg-amber-100',
    info: 'text-blue-600 bg-blue-100',
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 transform animate-in zoom-in-95 duration-200" dir="rtl">
        {/* Header Bar */}
        <div className={`px-5 py-3.5 flex justify-between items-center ${headerColors[type]}`}>
          <div className="flex items-center gap-2.5 font-black text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>{title}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-right space-y-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${iconColors[type]}`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-base">{title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed font-semibold whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-500 font-bold text-center">
            تنبيه حماية الأمان والحدود الائتمانية - اضغط Enter أو Esc للإغلاق
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100/80 px-6 py-3.5 flex justify-end border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            موافق وفهمت التنبيه
          </button>
        </div>
      </div>
    </div>
  );
}
