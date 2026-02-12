// Regenerate button for refreshing individual slot suggestions
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

type Props = {
  onRegenerate: () => Promise<void>;
};

export default function RegenerateButton({ onRegenerate }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onRegenerate();
    } catch (error) {
      console.error('Regenerate failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Regenerate this suggestion"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}
