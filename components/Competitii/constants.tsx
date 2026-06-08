// components/Competitii/constants.ts
import React from 'react';
import { VizaSportiv } from '../../types';
import { TIP_COMPETITIE_LABELS } from '../../utils/competitiiTemplates';

// -----------------------------------------------
// HELPERS persistare stare în sessionStorage
// -----------------------------------------------
export const SS_KEY_COMP_ID = 'competitii_selected_comp_id';
export const SS_KEY_TAB = 'competitii_active_tab';

export function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function ssSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* ignorat */ }
}
export function ssDel(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignorat */ }
}

// -----------------------------------------------
// HELPER: verifică dacă sportivul are viza FRAM activă pentru un an dat
// -----------------------------------------------
export function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return vizeSportivi.some(v => v.sportiv_id === sportivId && v.an === an && v.status_viza === 'Activ');
}

export const WarningVizaFRAM: React.FC<{ show: boolean; inline?: boolean }> = ({ show, inline }) => {
  if (!show) return null;
  if (inline) return (
    <span title="Viza FRAM neachitată pentru anul curent"
      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-400 bg-yellow-900/40 border border-yellow-700/50 rounded px-1.5 py-0.5 ml-1 shrink-0">
      ⚠ FRAM
    </span>
  );
  return (
    <div className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-2.5 text-xs text-yellow-300">
      <span className="text-base leading-none shrink-0">⚠</span>
      <span>Viza FRAM <strong>neachitată</strong> pentru anul curent. Sportivul nu va fi acceptat în competiție fără această viză.</span>
    </div>
  );
};

// -----------------------------------------------
// HELPERS
// -----------------------------------------------
export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ro-RO') : '-';

export const statusLabel: Record<string, { label: string; color: string }> = {
  draft: { label: 'Schiță', color: 'bg-slate-700 text-slate-300' },
  inscrieri_deschise: { label: 'Înscrieri deschise', color: 'bg-green-800 text-green-200' },
  inscrieri_inchise: { label: 'Înscrieri închise', color: 'bg-yellow-800 text-yellow-200' },
  finalizata: { label: 'Finalizată', color: 'bg-blue-900 text-blue-200' },
};

export const tipBadge: Record<string, string> = {
  tehnica: 'bg-purple-800 text-purple-200',
  giao_dau: 'bg-red-800 text-red-200',
  cvd: 'bg-orange-800 text-orange-200',
};

// Context local pentru labels dinamice (citite din DB)
export const TipuriLabelsContext = React.createContext<Map<string, string>>(
  new Map(Object.entries(TIP_COMPETITIE_LABELS))
);
