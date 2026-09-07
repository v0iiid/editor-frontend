import React from 'react';
import { X, CheckCircle2, AlertCircle, Info, HelpCircle } from 'lucide-react';

export interface NotificationState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'confirm' | 'info';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationModalProps {
  notification: NotificationState;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  notification,
  onClose
}) => {
  if (!notification.isOpen) return null;

  const { title, message, type, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' } = notification;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-400" />;
      case 'confirm':
        return <HelpCircle className="w-8 h-8 text-indigo-400" />;
      default:
        return <Info className="w-8 h-8 text-indigo-400" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'confirm':
        return 'bg-indigo-500/10 border-indigo-500/20';
      default:
        return 'bg-indigo-500/10 border-indigo-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-800 border border-dark-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header Icon */}
        <div className={`p-5 flex flex-col items-center justify-center text-center border-b ${getHeaderBg()}`}>
          <div className="mb-2">{getIcon()}</div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        </div>

        {/* Body Message */}
        <div className="p-5 text-center text-xs text-slate-300 leading-relaxed">
          {message}
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-dark-900/60 border-t border-dark-700/60 flex items-center justify-center space-x-2">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-3 bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
