import { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      hideToast(id);
    }, duration);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'info':
        return <Info className="w-5 h-5 text-accent" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-success';
      case 'error':
        return 'border-l-error';
      case 'warning':
        return 'border-l-warning';
      case 'info':
        return 'border-l-accent';
    }
  };

  return (
    <div 
      className={`glass rounded-lg p-4 border-l-4 ${getBorderColor()} shadow-2xl backdrop-blur-lg animate-slide-up flex items-start gap-3 min-w-[320px]`}
    >
      {getIcon()}
      <p className="flex-1 text-sm text-white/90">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
