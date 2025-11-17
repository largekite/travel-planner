import { useEffect } from 'react';

export function useKeyboard(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (shortcuts[key]) {
          e.preventDefault();
          shortcuts[key]();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);
}