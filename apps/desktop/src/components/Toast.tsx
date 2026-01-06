import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-success" />,
    error: <XCircle size={18} className="text-error" />,
    warning: <AlertCircle size={18} className="text-warning" />,
  };

  const colors = {
    success: 'border-success/40 bg-success/10',
    error: 'border-error/40 bg-error/10',
    warning: 'border-warning/40 bg-warning/10',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] animate-slide-up`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg card border-2 ${colors[type]} shadow-2xl backdrop-blur-xl min-w-[300px] max-w-md`}>
        <div className="flex-shrink-0">{icons[type]}</div>
        <p className="text-sm text-text-primary flex-1">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-surface-hover rounded transition-colors"
        >
          <X size={14} className="text-text-tertiary" />
        </button>
      </div>
    </div>
  );
};
