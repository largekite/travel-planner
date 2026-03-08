// Google Sheets / CSV export functionality
import { DayPlan, SelectedItem } from '../lib/types';

const ORDERED_SLOTS = ['hotel', 'breakfast', 'activity', 'lunch', 'activity2', 'coffee', 'dinner'] as const;

const SLOT_LABELS: Record<string, string> = {
  hotel:     'Hotel',
  breakfast: 'Breakfast',
  activity:  'Morning Activity',
  lunch:     'Lunch',
  activity2: 'Afternoon Activity',
  coffee:    'Coffee Break',
  dinner:    'Dinner',
};

function escapeCSV(value: string): string {
  if (!value) return '';
  // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV content from the travel plan
 */
export function generateCSV(plan: DayPlan[], city: string, vibe: string): string {
  const headers = ['Day', 'Hotel', 'Breakfast', 'Morning Activity', 'Lunch', 'Afternoon Activity', 'Coffee Break', 'Dinner', 'Notes'];
  const headerRow = headers.map(escapeCSV).join(',');

  const rows = plan.map((day, i) => {
    const values = [
      `Day ${i + 1}`,
      ...ORDERED_SLOTS.map(slot => {
        const item = day[slot as keyof DayPlan] as SelectedItem | undefined;
        if (!item?.name) return '';
        const parts = [item.name];
        if (item.area) parts.push(item.area);
        return parts.join(' - ');
      }),
      day.notes || '',
    ];
    return values.map(escapeCSV).join(',');
  });

  // Title row
  const titleRow = escapeCSV(`${vibe.charAt(0).toUpperCase() + vibe.slice(1)} Trip to ${city}`);

  return [titleRow, '', headerRow, ...rows].join('\n');
}

/**
 * Generate a detailed CSV with separate columns for name, area, description, and links
 */
export function generateDetailedCSV(plan: DayPlan[], city: string, vibe: string): string {
  // Build headers: Day, then for each slot: Name, Area, Link
  const slotHeaders = ORDERED_SLOTS.flatMap(slot => [
    `${SLOT_LABELS[slot]} Name`,
    `${SLOT_LABELS[slot]} Area`,
    `${SLOT_LABELS[slot]} Link`,
  ]);
  const headers = ['Day', ...slotHeaders, 'Notes'];
  const headerRow = headers.map(escapeCSV).join(',');

  const rows = plan.map((day, i) => {
    const slotValues = ORDERED_SLOTS.flatMap(slot => {
      const item = day[slot as keyof DayPlan] as SelectedItem | undefined;
      return [item?.name || '', item?.area || '', item?.url || ''];
    });
    const values = [`Day ${i + 1}`, ...slotValues, day.notes || ''];
    return values.map(escapeCSV).join(',');
  });

  const titleRow = escapeCSV(`${vibe.charAt(0).toUpperCase() + vibe.slice(1)} Trip to ${city}`);
  return [titleRow, '', headerRow, ...rows].join('\n');
}

/**
 * Download CSV file to user's computer
 */
export function downloadCSV(plan: DayPlan[], city: string, vibe: string, detailed = false): void {
  const csv = detailed
    ? generateDetailedCSV(plan, city, vibe)
    : generateCSV(plan, city, vibe);

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${city.replace(/[^a-zA-Z0-9]/g, '_')}_itinerary.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open the plan in Google Sheets by uploading CSV data
 * Creates a Google Sheets import via a data URI workaround
 */
export function openInGoogleSheets(plan: DayPlan[], city: string, vibe: string): void {
  const csv = generateDetailedCSV(plan, city, vibe);

  // Google Sheets can import from a pasted CSV. We'll copy to clipboard and open Sheets.
  // The most reliable no-auth approach is to download CSV and let user import,
  // but we can also open a blank sheet with instructions.

  // Copy CSV to clipboard for easy paste
  navigator.clipboard.writeText(csv).catch(() => {});

  // Open Google Sheets with a new blank spreadsheet
  window.open('https://sheets.google.com/create', '_blank');
}
