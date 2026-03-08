import React, { useState, useMemo } from 'react';
import { X, FileDown, Check, Eye, Sheet, Pencil, Download } from 'lucide-react';
import { DayPlan } from '../lib/types';
import {
  PDFTheme,
  AccentPreset,
  PDFExportOptions,
  ACCENT_PRESETS,
  generatePDFContent,
  exportToPDF,
  exportEditablePDF,
} from '../utils/exportPDF';
import { downloadCSV, openInGoogleSheets } from '../utils/exportSheets';

type Props = {
  plan: DayPlan[];
  city: string;
  vibe: string;
  onClose: () => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

// ─── Theme thumbnail previews (pure CSS mockups) ──────────────────────────

function ClassicThumb({ color }: { color: string }) {
  return (
    <div className="w-full h-full p-2 space-y-1 bg-white">
      <div className="h-5 rounded-md" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }} />
      {[0, 1, 2].map(i => (
        <div key={i} className="flex gap-1 items-stretch h-3">
          <div className="w-1 rounded-sm flex-shrink-0" style={{ background: color }} />
          <div className="flex-1 rounded-sm bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ModernThumb({ color }: { color: string }) {
  return (
    <div className="w-full h-full bg-slate-100 p-1.5 space-y-1">
      <div className="h-5 rounded bg-slate-800 px-1.5 flex items-center">
        <div className="w-10 h-1.5 bg-white/30 rounded" />
      </div>
      <div className="bg-white rounded shadow-sm p-1.5 space-y-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: `${color}22` }} />
          <div className="flex-1 h-1.5 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: `${color}22` }} />
          <div className="flex-1 h-1.5 rounded bg-slate-200" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: `${color}22` }} />
          <div className="flex-1 h-1.5 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function PassportThumb({ color }: { color: string }) {
  return (
    <div className="w-full h-full p-1.5 bg-[#fdf8f0] border-2 border-[#2d1b0e] rounded space-y-1">
      <div className="text-center border-b border-[#c8a96e] pb-1">
        <div className="text-[8px] font-bold" style={{ color }}>✦ ITINERARY ✦</div>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="border border-[#c8a96e] rounded-sm px-1 py-0.5 bg-[#fdf8f0]">
          <div className="h-1.5 bg-[#c8a96e]/40 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function MinimalThumb({ color }: { color: string }) {
  return (
    <div className="w-full h-full p-2 bg-white space-y-2">
      <div className="border-b-2 border-slate-900 pb-1.5">
        <div className="h-3 w-3/4 bg-slate-900 rounded-sm" />
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-baseline gap-2 border-b border-slate-100 pb-1">
          <div className="w-6 h-1 rounded flex-shrink-0" style={{ background: `${color}66` }} />
          <div className="flex-1 h-1.5 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

const THEME_META: Record<PDFTheme, { label: string; description: string; Thumb: React.FC<{ color: string }> }> = {
  classic:  { label: 'Classic',  description: 'Gradient headers, accent borders',     Thumb: ClassicThumb },
  modern:   { label: 'Modern',   description: 'Dark header, emoji cards',              Thumb: ModernThumb },
  passport: { label: 'Passport', description: 'Vintage travel journal',                Thumb: PassportThumb },
  minimal:  { label: 'Minimal',  description: 'Clean typography, no clutter',          Thumb: MinimalThumb },
};

const THEMES: PDFTheme[] = ['classic', 'modern', 'passport', 'minimal'];

// ─── Component ────────────────────────────────────────────────────────────

export default function PDFExportModal({ plan, city, vibe, onClose, onToast }: Props) {
  const [theme, setTheme]             = useState<PDFTheme>('classic');
  const [accent, setAccent]           = useState<AccentPreset>(ACCENT_PRESETS[0]);
  const [includeNotes, setNotes]      = useState(true);
  const [includeLinks, setLinks]      = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting]     = useState(false);

  const opts: PDFExportOptions = { theme, accent, includeNotes, includeLinks };

  const previewHTML = useMemo(
    () => generatePDFContent(plan, city, vibe, opts),
    [theme, accent, includeNotes, includeLinks, plan, city, vibe],
  );

  async function handleExport() {
    setExporting(true);
    try {
      await exportToPDF(plan, city, vibe, opts);
      onToast?.('PDF ready — use "Save as PDF" in the print dialog', 'info');
      onClose();
    } catch (e: any) {
      onToast?.(e.message, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleEditableExport() {
    setExporting(true);
    try {
      await exportEditablePDF(plan, city, vibe, opts);
      onToast?.('Editable itinerary opened — click any text to edit, then save as PDF', 'info');
      onClose();
    } catch (e: any) {
      onToast?.(e.message, 'error');
    } finally {
      setExporting(false);
    }
  }

  function handleDownloadCSV() {
    downloadCSV(plan, city, vibe, false);
    onToast?.('CSV downloaded — open it in Google Sheets or Excel', 'info');
  }

  function handleOpenGoogleSheets() {
    openInGoogleSheets(plan, city, vibe);
    onToast?.('Itinerary copied to clipboard — paste it into the new Google Sheet (Ctrl+V)', 'info');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-lg">Export Itinerary</h2>
            <p className="text-xs text-slate-500 mt-0.5">Pick a design, then print or save as PDF</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — two column */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: settings */}
          <div className="w-72 flex-shrink-0 border-r overflow-y-auto p-5 space-y-6">

            {/* Theme */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Design Theme</div>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => {
                  const { label, description, Thumb } = THEME_META[t];
                  const selected = theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all ${
                        selected ? 'border-indigo-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="h-20 w-full overflow-hidden bg-slate-50">
                        <Thumb color={accent.main} />
                      </div>
                      {/* Label */}
                      <div className="px-2 py-1.5">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          {label}
                          {selected && <Check className="w-3 h-3 text-indigo-500 ml-auto" />}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">{description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Accent Color</div>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map(a => (
                  <button
                    key={a.name}
                    onClick={() => setAccent(a)}
                    title={a.name}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      accent.name === a.name ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                    }`}
                    style={{ background: a.main }}
                    aria-label={a.name}
                    aria-pressed={accent.name === a.name}
                  />
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Include</div>
              <div className="space-y-2">
                {([
                  { label: 'Day notes',      value: includeNotes, set: setNotes },
                  { label: 'Clickable links', value: includeLinks, set: setLinks },
                ] as const).map(({ label, value, set }) => (
                  <label key={label} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <div
                      onClick={() => set(!value)}
                      className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${value ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Right: preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-white/80 backdrop-blur text-xs text-slate-500">
              <Eye className="w-3.5 h-3.5" />
              Live Preview — <span className="font-medium text-slate-700 capitalize">{THEME_META[theme].label}</span>
              <span className="ml-1 text-slate-400">· {accent.name}</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ minHeight: 600 }}>
                <iframe
                  srcDoc={previewHTML}
                  className="w-full"
                  style={{ height: Math.max(600, plan.length * 340) }}
                  title="PDF Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 space-y-3">
          {/* Google Sheets / CSV row */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Sheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs text-slate-600 font-medium">Spreadsheet:</span>
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              Download CSV
            </button>
            <button
              onClick={handleOpenGoogleSheets}
              className="px-3 py-1.5 rounded-lg border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium flex items-center gap-1.5"
            >
              <Sheet className="w-3 h-3" />
              Open in Google Sheets
            </button>
            <span className="text-[10px] text-slate-400 ml-1">Editable in Sheets / Excel</span>
          </div>

          {/* PDF export row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Choose <strong>"Save as PDF"</strong> in print dialog, or use editable mode to customize first.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={handleEditableExport}
                disabled={exporting}
                className="px-4 py-2 rounded-lg border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium flex items-center gap-2 disabled:opacity-60"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editable PDF
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-60"
              >
                <FileDown className="w-4 h-4" />
                {exporting ? 'Opening…' : 'Print / Save as PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
