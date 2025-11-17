import React from 'react';

type Props = {
  count?: number;
  height?: string;
};

export default function LoadingSkeleton({ count = 3, height = "h-16" }: Props) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} bg-slate-200 rounded`} />
      ))}
    </div>
  );
}