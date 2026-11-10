// components/Competitii/constants.tsx
import React from 'react';
import { VizaSportiv, Arma, CategorieCompetitie } from '../../types';
import { armePermiseGiaoDau } from '../../utils/armeCvd';
import { TIP_COMPETITIE_LABELS } from '../../utils/competitiiTemplates';
import { areTaxaAchitata } from '../../utils/taxeAnuale';

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
// HELPERI categorii: fuzionate / împărțite / anulate nu mai primesc înscrieri noi
// -----------------------------------------------
export const categorieActiva = (c: CategorieCompetitie) => !c.status_categorie || c.status_categorie === 'activa';

/** Text scurt de insignă pentru starea categoriei (null = nimic de afișat) */
export function categorieEticheta(c: CategorieCompetitie, toate: CategorieCompetitie[]): { text: string; clasa: string } | null {
  const nr = (id: string) => {
    const x = toate.find(k => k.id === id);
    return x ? `${x.numar_categorie}` : '?';
  };
  if (c.status_categorie === 'impartita') {
    const copii = (c.categorii_fuzionate_din ?? []).map(nr).join(', ');
    return { text: `Împărțită în ${copii || 'categorii noi'}`, clasa: 'bg-blue-500/20 text-blue-300' };
  }
  if (c.status_categorie === 'fuzionata') {
    const tinta = toate.find(k => k.este_fuzionata && k.id !== c.id && (k.categorii_fuzionate_din ?? []).includes(c.id));
    return { text: tinta ? `Fuzionată în ${tinta.numar_categorie}` : 'Fuzionată', clasa: 'bg-amber-500/20 text-amber-300' };
  }
  if (c.status_categorie === 'anulata') return { text: 'Anulată', clasa: 'bg-slate-500/30 text-slate-300' };
  if (c.este_fuzionata) {
    const surse = (c.categorii_fuzionate_din ?? []).filter(id => id !== c.id).map(nr).join(', ');
    return { text: surse ? `Fuzionată cu ${surse}` : 'Fuzionată', clasa: 'bg-amber-500/20 text-amber-300' };
  }
  return null;
}

// -----------------------------------------------
// HELPER: verifică taxa FRAM (an calendaristic) achitată sau scutită pentru un an dat.
// Vizele FRQKD (sezon fiscal) sunt ignorate. Doar avertisment — nu blochează înscrierea.
// -----------------------------------------------
export function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return areTaxaAchitata(vizeSportivi, sportivId, 'FRAM', an);
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
      <span>Viza FRAM <strong>neachitată</strong> pentru anul curent. Sportivul nu va fi acceptat în competiție fără această viză. Avertisment — înscrierea nu este blocată în portal.</span>
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

/** Giao Dau CVD: armele de lemn permise la lupta = permise ∩ alese de sportiv. Nu blocheaza inscrierea. */
export const ArmePermiseGiaoDau: React.FC<{ arme: Arma[]; alese?: Set<string> }> = ({ arme, alese }) => {
  if (arme.length === 0) return null;
  const permise = armePermiseGiaoDau(arme).filter(a => alese?.has(a.id));
  if (permise.length === 0) return (
    <div className="text-[11px] text-yellow-300 bg-yellow-900/30 border border-yellow-700/50 rounded px-2 py-1 mt-1">
      ⚠ Nicio armă permisă la luptă aleasă. Înscrierea rămâne permisă.
    </div>
  );
  return <div className="text-[11px] text-slate-300 mt-1">Arme permise la luptă: {permise.map(a => a.denumire).join(', ')}</div>;
};
