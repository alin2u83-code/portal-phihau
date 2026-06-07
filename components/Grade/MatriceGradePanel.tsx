import React, { useState, useMemo } from 'react';
import { Grad, Inlantuire } from '../../types';
import { useInlantuiriPivot } from '../../hooks/useInlantuiriPivot';
import { useError } from '../ErrorProvider';

// ---------------------------------------------------------------------------
// Constante
// ---------------------------------------------------------------------------

export type TabMatrice = 'thao_quyen' | 'song_luyen' | 'sincron' | 'thao_lo' | 'arme_cvd';

interface TabConfig {
  tipProba: string;
  categoriiInlantuiri: string[];
}

const TAB_CONFIG: Record<TabMatrice, TabConfig> = {
  thao_quyen: { tipProba: 'thao_quyen_individual', categoriiInlantuiri: ['quyen'] },
  sincron:    { tipProba: 'sincron',               categoriiInlantuiri: ['quyen'] },
  song_luyen: { tipProba: 'song_luyen',            categoriiInlantuiri: ['song_luyen'] },
  thao_lo:    { tipProba: 'thao_lo_individual',    categoriiInlantuiri: ['thao_lo_bong', 'thao_lo_dao', 'thao_lo_guom'] },
  arme_cvd:   { tipProba: 'thao_lo_individual',    categoriiInlantuiri: ['arma_cvd'] },
};

interface GrupGrade {
  label: string;
  ordineMin: number;
  ordineMax: number;
  colorChip: string;
  colorHeader: string;
}

const GRADE_GRUPURI: GrupGrade[] = [
  {
    label: 'Grade Galbene',
    ordineMin: 2,  ordineMax: 5,
    colorChip:   'bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-700',
    colorHeader: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
  },
  {
    label: 'Grade Roșii',
    ordineMin: 6,  ordineMax: 9,
    colorChip:   'bg-red-700 border-red-600 text-white hover:bg-red-800',
    colorHeader: 'bg-red-900/40 text-red-300 border-red-700/50',
  },
  {
    label: 'Centuri Violet',
    ordineMin: 10, ordineMax: 14,
    colorChip:   'bg-violet-700 border-violet-600 text-white hover:bg-violet-800',
    colorHeader: 'bg-violet-900/40 text-violet-300 border-violet-700/50',
  },
  {
    label: 'Grade Albastre',
    ordineMin: 15, ordineMax: 18,
    colorChip:   'bg-blue-700 border-blue-600 text-white hover:bg-blue-800',
    colorHeader: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  },
  {
    label: 'Centuri Negre',
    ordineMin: 19, ordineMax: Infinity,
    colorChip:   'bg-slate-600 border-slate-500 text-white hover:bg-slate-500',
    colorHeader: 'bg-slate-700/60 text-slate-200 border-slate-600/50',
  },
];

const CATEGORII_ARMA = [
  { value: 'toate',        label: 'Toate armele' },
  { value: 'thao_lo_bong', label: 'Bong' },
  { value: 'thao_lo_dao',  label: 'Dao' },
  { value: 'thao_lo_guom', label: 'Guom' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  tab: TabMatrice;
  canEdit: boolean;
}

// ---------------------------------------------------------------------------
// Sub-tabel per grup
// ---------------------------------------------------------------------------

interface SubTabelProps {
  grup: GrupGrade;
  gradeVizibile: Grad[];
  coloane: Inlantuire[];
  isActive: (grade_id: string, inlantuire_id: string) => boolean;
  onToggle: (grade_id: string, inlantuire_id: string) => Promise<void>;
  busy: string | null;
  canEdit: boolean;
}

const SubTabelGrup: React.FC<SubTabelProps> = ({
  grup, gradeVizibile, coloane, isActive, onToggle, busy, canEdit,
}) => {
  if (gradeVizibile.length === 0 || coloane.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Header grup */}
      <div className={`px-3 py-1.5 rounded-t-lg border text-xs font-semibold uppercase tracking-wide ${grup.colorHeader}`}>
        {grup.label}
      </div>

      <div className="overflow-x-auto rounded-b-lg border border-[var(--t-border)]">
        <table className="text-xs border-collapse min-w-max w-full">
          <thead>
            <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }} className="border-b border-[var(--t-border)]">
              <th className="sticky left-0 z-10 py-2 px-3 text-left font-medium whitespace-nowrap border-r border-[var(--t-border)] min-w-[130px]" style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                Grad
              </th>
              {coloane.map(col => (
                <th
                  key={col.id}
                  title={col.denumire}
                  className="py-2 px-1.5 text-center text-slate-400 font-medium whitespace-nowrap"
                >
                  <span className="block truncate max-w-[80px] mx-auto" title={col.denumire}>
                    {col.denumire}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gradeVizibile.map((grad, ri) => (
              <tr
                key={grad.id}
                className={`border-t border-[var(--t-border)] hover:bg-[var(--t-table-row-hover)] ${ri % 2 === 0 ? '' : 'bg-[var(--t-surface-2)]'}`}
              >
                <td className="sticky left-0 z-10 bg-[var(--t-surface)] py-1.5 px-3 text-[var(--t-text)] whitespace-nowrap border-r border-[var(--t-border)] font-medium">
                  {grad.nume}
                </td>
                {coloane.map(col => {
                  const key = `${grad.id}:${col.id}`;
                  const active = isActive(grad.id, col.id);
                  const isBusy = busy === key;
                  return (
                    <td key={col.id} className="py-1.5 px-1.5 text-center">
                      {canEdit ? (
                        <button
                          onClick={() => onToggle(grad.id, col.id)}
                          disabled={isBusy}
                          title={active
                            ? `Dezactivează ${col.denumire} pentru ${grad.nume}`
                            : `Activează ${col.denumire} pentru ${grad.nume}`}
                          className={`w-6 h-6 rounded border transition-colors flex items-center justify-center mx-auto ${
                            isBusy
                              ? 'opacity-40 cursor-wait border-slate-500 bg-slate-700'
                              : active
                              ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700'
                              : 'bg-slate-700 border-slate-600 hover:bg-slate-600 cursor-pointer'
                          }`}
                        >
                          {active && !isBusy ? (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : !active && !isBusy ? (
                            <span className="text-slate-500 text-xs leading-none select-none">â€”</span>
                          ) : null}
                        </button>
                      ) : (
                        <div className={`w-6 h-6 rounded border flex items-center justify-center mx-auto ${
                          active ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-700 border-slate-600'
                        }`}>
                          {active ? (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-slate-500 text-xs leading-none select-none">â€”</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Componenta principală
// ---------------------------------------------------------------------------

export const MatriceGradePanel: React.FC<Props> = ({ tab, canEdit }) => {
  const { showError } = useError();
  const { tipProba, categoriiInlantuiri } = TAB_CONFIG[tab];

  const { grade, inlantuiri, loading, isActive, toggle } = useInlantuiriPivot(
    tipProba,
    categoriiInlantuiri
  );

  const [selectedGradeIds, setSelectedGradeIds] = useState<Set<string>>(new Set());
  const [filtruArma, setFiltruArma] = useState<string>('toate');
  const [busy, setBusy] = useState<string | null>(null);

  const toggleGrad = (id: string) => {
    setSelectedGradeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFiltre = () => setSelectedGradeIds(new Set());

  // Coloane filtrate după armă (doar pentru Thao Lo)
  const coloaneBaza: Inlantuire[] = useMemo(() => {
    if (tab !== 'thao_lo' || filtruArma === 'toate') return inlantuiri;
    return inlantuiri.filter(i => i.categorie === filtruArma);
  }, [inlantuiri, tab, filtruArma]);

  // Construiește datele per grup
  const grupuriDate = useMemo(() => {
    return GRADE_GRUPURI.map(grup => {
      // Toate gradele din acest grup
      const gradeInGrup = grade.filter(
        g => g.ordine >= grup.ordineMin && g.ordine <= grup.ordineMax
      );

      // Dacă există selecție, filtrează rândurile
      const gradeVizibile = selectedGradeIds.size === 0
        ? gradeInGrup
        : gradeInGrup.filter(g => selectedGradeIds.has(g.id));

      // Coloane: înlănțuirile care au cel puțin o asociere activă pentru gradele vizibile
      // (dacă nu e filtrare, bazat pe toate gradele din grup)
      const bazaColoane = selectedGradeIds.size === 0 ? gradeInGrup : gradeVizibile;
      const coloane = coloaneBaza.filter(inl =>
        bazaColoane.some(g => isActive(g.id, inl.id))
      );

      return { grup, gradeVizibile, coloane };
    }).filter(({ gradeVizibile }) => {
      // Când e filtrare activă: ascunde grupurile fără grade selectate
      if (selectedGradeIds.size > 0) return gradeVizibile.length > 0;
      return true;
    });
  }, [grade, coloaneBaza, selectedGradeIds, isActive]);

  const handleToggle = async (grade_id: string, inlantuire_id: string) => {
    if (!canEdit) return;
    const key = `${grade_id}:${inlantuire_id}`;
    setBusy(key);
    const err = await toggle(grade_id, inlantuire_id);
    if (err) showError('Eroare toggle', err.message);
    setBusy(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        Se încarcă matricea...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtre */}
      <div className="space-y-2">
        {/* Filtru armă (doar Thao Lo) */}
        {tab === 'thao_lo' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">Armă:</label>
            <select
              value={filtruArma}
              onChange={e => setFiltruArma(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {CATEGORII_ARMA.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Chips grade */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedGradeIds.size > 0 && (
            <button
              onClick={clearFiltre}
              className="text-xs px-2 py-1 rounded border border-[var(--t-border)] bg-[var(--t-surface)] text-[var(--t-text-muted)] hover:text-white hover:border-slate-500 transition-colors"
            >
              âœ• Toate
            </button>
          )}
          {grade.map(g => {
            const grup = GRADE_GRUPURI.find(
              gr => g.ordine >= gr.ordineMin && g.ordine <= gr.ordineMax
            );
            const selected = selectedGradeIds.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGrad(g.id)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                  selected
                    ? (grup?.colorChip ?? 'bg-emerald-600 border-emerald-500 text-white')
                    : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text-muted)] hover:border-slate-400 hover:text-white'
                }`}
              >
                {g.nume}
              </button>
            );
          })}
        </div>

        {selectedGradeIds.size > 0 && (
          <p className="text-xs text-slate-500">
            {selectedGradeIds.size} grad{selectedGradeIds.size !== 1 ? 'e' : ''} selectat{selectedGradeIds.size !== 1 ? 'e' : ''}
          </p>
        )}
      </div>

      {/* Sub-tabele per grup */}
      <div className="space-y-6">
        {grupuriDate.map(({ grup, gradeVizibile, coloane }) => (
          <SubTabelGrup
            key={grup.label}
            grup={grup}
            gradeVizibile={gradeVizibile}
            coloane={coloane}
            isActive={isActive}
            onToggle={handleToggle}
            busy={busy}
            canEdit={canEdit}
          />
        ))}
        {grupuriDate.length === 0 && (
          <div className="text-slate-400 text-sm py-8 text-center italic">
            Niciun grad pentru selecția curentă.
          </div>
        )}
      </div>
    </div>
  );
};

