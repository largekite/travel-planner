import React from 'react';
import { Undo2, Redo2, Save, Share2, Printer, FileDown, HelpCircle, Trash2, Keyboard } from 'lucide-react';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onShare: () => void;
  onPrint: () => void;
  onExportPDF?: () => void;
  onHelp: () => void;
  onClearSaved?: () => void;
};

function Btn({ onClick, disabled, title, shortcut, children }: {
  onClick: () => void; disabled?: boolean; title: string; shortcut?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${title} (${shortcut})` : title}
      className="group relative p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
      {shortcut && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
          <Keyboard className="w-2.5 h-2.5" />{shortcut}
        </span>
      )}
    </button>
  );
}

export default function QuickActionsToolbar({
  canUndo, canRedo, onUndo, onRedo, onSave, onShare, onPrint, onExportPDF, onHelp, onClearSaved
}: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl shadow-lg border px-1.5 py-1 flex items-center gap-0.5 z-50">
      <Btn onClick={onUndo} disabled={!canUndo} title="Undo" shortcut="Ctrl+Z">
        <Undo2 className="w-4 h-4" />
      </Btn>
      <Btn onClick={onRedo} disabled={!canRedo} title="Redo" shortcut="Ctrl+Y">
        <Redo2 className="w-4 h-4" />
      </Btn>
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      <Btn onClick={onSave} title="Save" shortcut="Ctrl+S">
        <Save className="w-4 h-4" />
      </Btn>
      <Btn onClick={onShare} title="Share">
        <Share2 className="w-4 h-4" />
      </Btn>
      {onExportPDF && (
        <Btn onClick={onExportPDF} title="Export PDF">
          <FileDown className="w-4 h-4 text-indigo-600" />
        </Btn>
      )}
      <div className="w-px h-5 bg-slate-200 mx-0.5" />
      <Btn onClick={onHelp} title="Help">
        <HelpCircle className="w-3.5 h-3.5" />
      </Btn>
      {onClearSaved && (
        <Btn onClick={onClearSaved} title="Reset">
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        </Btn>
      )}
    </div>
  );
}
