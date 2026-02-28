// Mobile view toggle between list and map views
import { Map, List } from 'lucide-react';

type Props = {
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
};

export default function ViewToggle({ view, onViewChange }: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden">
      <div className="bg-white rounded-full shadow-lg border border-slate-200 p-1 flex gap-1">
        <button
          onClick={() => onViewChange('list')}
          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
            view === 'list'
              ? 'bg-kite-blue text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <List className="w-4 h-4" />
          <span className="text-sm font-medium">List</span>
        </button>
        <button
          onClick={() => onViewChange('map')}
          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
            view === 'map'
              ? 'bg-kite-blue text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Map className="w-4 h-4" />
          <span className="text-sm font-medium">Map</span>
        </button>
      </div>
    </div>
  );
}
