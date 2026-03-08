import React from 'react';
import { Undo2, Redo2, Save, Share2, Printer, HelpCircle, Trash2, FileDown, Keyboard } from 'lucide-react';

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
  shortcut?: string;
  className?: string;
  children: React.ReactNode;
};

function ToolbarBtn({ onClick, disabled, title, label, shortcut, className = '', children }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${title} (${shortcut})` : title}
      aria-label={title}
      className={`group relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
      <span className="text-[10px] text-slate-500 leading-none">{label}</span>
      {/* Keyboard shortcut tooltip on hover */}
      {shortcut && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
          <Keyboard className="w-2.5 h-2.5" />
          {shortcut}
        </span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-slate-200 mx-0.5 self-center" />;
}

export default function QuickActionsToolbar({
  canUndo, canRedo, onUndo, onRedo, onSave, onShare, onPrint, onExportPDF, onHelp, onClearSaved
}: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur rounded-2xl shadow-lg border px-2 py-1.5 flex items-end gap-0.5 z-50">
      {/* History group */}
      <ToolbarBtn onClick={onUndo} disabled={!canUndo} title="Undo" label="Undo" shortcut="Ctrl+Z">
        <Undo2 className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onRedo} disabled={!canRedo} title="Redo" label="Redo" shortcut="Ctrl+Y">
        <Redo2 className="w-4 h-4" />
      </ToolbarBtn>

      <Divider />

      {/* Save & Share group */}
      <ToolbarBtn onClick={onSave} title="Save to browser" label="Save" shortcut="Ctrl+S">
        <Save className="w-4 h-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onShare} title="Share itinerary" label="Share">
        <Share2 className="w-4 h-4" />
      </ToolbarBtn>

      <Divider />

      {/* Export group */}
      <ToolbarBtn onClick={onPrint} title="Print" label="Print" shortcut="Ctrl+P">
        <Printer className="w-4 h-4" />
      </ToolbarBtn>
      {onExportPDF && (
        <ToolbarBtn onClick={onExportPDF} title="Export as PDF" label="PDF">
          <FileDown className="w-4 h-4 text-indigo-600" />
        </ToolbarBtn>
      )}

      <Divider />

      {/* Utility group */}
      <ToolbarBtn onClick={onHelp} title="Help & shortcuts" label="Help">
        <HelpCircle className="w-4 h-4" />
      </ToolbarBtn>

      {onClearSaved && (
        <ToolbarBtn onClick={onClearSaved} title="Clear all saved data and reset" label="Reset" className="hover:bg-rose-50">
          <Trash2 className="w-4 h-4 text-rose-500" />
        </ToolbarBtn>
      )}
    </div>
  );
}
