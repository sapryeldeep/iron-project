import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white'
  };

  const iconColors = {
    danger: 'text-rose-500 bg-rose-50',
    warning: 'text-amber-500 bg-amber-50',
    info: 'text-blue-500 bg-blue-50'
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-2xl ${iconColors[variant]}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-800">{title}</h3>
            </div>
            
            <p className="text-slate-600 font-bold leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-2xl font-black transition-all active:scale-95 ${colors[variant]}`}
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl font-black bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
              >
                {cancelLabel}
              </button>
            </div>
          </div>
          
          <button 
            onClick={onCancel}
            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
