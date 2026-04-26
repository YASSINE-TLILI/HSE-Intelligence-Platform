import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#1a1f2e] border border-[#2a3040] rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-500/20' : 'bg-amber-500/20'
          }`}>
            <AlertTriangle size={24} className={variant === 'danger' ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-[#2a3040] text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;