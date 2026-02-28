import React, { useEffect } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type ToastData = {
  message: string;
  type?: 'success' | 'error' | 'info';
};

type Props = ToastData & {
  onDismiss: () => void;
  duration?: number;
};

export default function Toast({ message, type = 'success', onDismiss, duration = 2500 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const Icon = type === 'success' ? Check : type === 'error' ? AlertCircle : Info;

  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border text-sm font-medium toast-enter ${styles[type]}`}
      role="status"
      aria-live="polite"
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
