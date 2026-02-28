import { useState } from 'react';

// Deterministic pastel-to-vivid gradient per place name
const GRADIENTS = [
  'linear-gradient(135deg,#4F46E5,#7C3AED)',
  'linear-gradient(135deg,#E11D48,#F97316)',
  'linear-gradient(135deg,#059669,#0284C7)',
  'linear-gradient(135deg,#D97706,#DC2626)',
  'linear-gradient(135deg,#0284C7,#6366F1)',
  'linear-gradient(135deg,#7C3AED,#DB2777)',
  'linear-gradient(135deg,#0891B2,#059669)',
  'linear-gradient(135deg,#9333EA,#2563EB)',
];

function gradient(name: string): string {
  const hash = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return GRADIENTS[hash % GRADIENTS.length];
}

type Props = {
  src?: string;
  name: string;
  /** Square size in px. Default 48 */
  size?: number;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

export default function PlacePhoto({ src, name, size = 48, className = '', rounded = 'lg' }: Props) {
  const [imgErr, setImgErr] = useState(false);
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const fontSize = Math.round(size * 0.38);
  const roundedClass = `rounded-${rounded}`;

  if (src && !imgErr) {
    return (
      <div
        className={`overflow-hidden flex-shrink-0 ${roundedClass} ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 text-white font-bold select-none ${roundedClass} ${className}`}
      style={{ width: size, height: size, background: gradient(name), fontSize }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
