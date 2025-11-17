import React from 'react';
import { Loader2 } from 'lucide-react';

type Props = {
  message?: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
};

export default function ProgressIndicator({ 
  message = "Loading...", 
  progress,
  size = 'md' 
}: Props) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex items-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />
      <div className="flex-1">
        <span className="text-sm text-slate-600">{message}</span>
        {typeof progress === 'number' && (
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}