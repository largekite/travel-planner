import React from 'react';
import { Undo2, Redo2, Save, Share2, Printer, HelpCircle } from 'lucide-react';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onShare: () => void;
  onPrint: () => void;
  onHelp: () => void;
};

export default function QuickActionsToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onShare,
  onPrint,
  onHelp
}: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg border p-2 flex gap-1 z-50">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
      </button>
      <div className="w-px bg-slate-200 mx-1" />
      <button
        onClick={onSave}
        className="p-2 rounded-full hover:bg-slate-100"
        title="Save (Ctrl+S)"
      >
        <Save className="w-4 h-4" />
      </button>
      <button
        onClick={onShare}
        className="p-2 rounded-full hover:bg-slate-100"
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </button>
      <button
        onClick={onPrint}
        className="p-2 rounded-full hover:bg-slate-100"
        title="Print (Ctrl+P)"
      >
        <Printer className="w-4 h-4" />
      </button>
      <button
        onClick={onHelp}
        className="p-2 rounded-full hover:bg-slate-100"
        title="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </div>
  );
}