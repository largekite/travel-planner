import React from 'react';
import { Undo2, Redo2, Save, Share2, Printer, HelpCircle, Trash2, FileDown } from 'lucide-react';

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

type BtnProps = {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  label: string;
  className?: string;
  children: React.ReactNode;
};

function ToolbarBtn({ onClick, disabled, title, label, className = '', children }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
      <span className="text-[10px] text-slate-500 leading-none">{label}</span>
    </button>
  );
}

export default function QuickActionsToolbar({
  canUndo, canRedo, onUndo, onRedo, onSave, onShare, onPrint, onExportPDF, onHelp, onClearSaved
}: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-lg border px-2 py-1 flex items-end gap-0.5 z-50">
      <ToolbarBtn onClick={onUndo} disabled={!canUndo} title="Undo last change (Ctrl+Z)" label="Undo">
        <Undo2 className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" label="Redo">
        <Redo2 className="w-4 h-4" />
      </ToolbarBtn>

      <div className="w-px h-8 bg-slate-200 mx-1 self-center" />

      <ToolbarBtn onClick={onSave} title="Save to browser (auto-saves every 2 sec)" label="Save">
        <Save className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onShare} title="Share itinerary" label="Share">
        <Share2 className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onPrint} title="Print (Ctrl+P)" label="Print">
        <Printer className="w-4 h-4" />
      </ToolbarBtn>
      {onExportPDF && (
        <ToolbarBtn onClick={onExportPDF} title="Export as PDF" label="PDF">
          <FileDown className="w-4 h-4 text-indigo-600" />
        </ToolbarBtn>
      )}
      <ToolbarBtn onClick={onHelp} title="Help" label="Help">
        <HelpCircle className="w-4 h-4" />
      </ToolbarBtn>

      {onClearSaved && (
        <>
          <div className="w-px h-8 bg-slate-200 mx-1 self-center" />
          <ToolbarBtn onClick={onClearSaved} title="Clear all saved data and reset" label="Reset" className="hover:bg-rose-50">
            <Trash2 className="w-4 h-4 text-rose-500" />
          </ToolbarBtn>
        </>
      )}
    </div>
  );
}
