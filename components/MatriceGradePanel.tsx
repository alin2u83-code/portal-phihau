import React, { useState, useMemo } from 'react';
import { Grad, Inlantuire } from '../types';
import { useInlantuiriPivot } from '../hooks/useInlantuiriPivot';
import { useError } from './ErrorProvider';

// ---------------------------------------------------------------------------
// Constante
// ---------------------------------------------------------------------------

const CATEGORII_VARSTA = [
  { value: 'toate',   label: 'Toate gradele' },
  { value: 'copii',   label: 'Copii (Cap Roșu)' },
  { value: 'juniori', label: 'Juniori (1-4 CAP)' },
  { value: 'seniori', label: 'Seniori (C.N.+)' },
];

const CATEGORII_ARMA = [
  { value: 'toate',          label: 'Toate armele' },
  { value: 'thao_lo_bong',   label: 'Bong' },
  { value: 'thao_lo_dao',    label: 'Dao' },
  { value: 'thao_lo_guom',   label: 'Guom' },
];

// Mapare tip tab → categorii inlantuiri + tip_proba
export type TabMatrice = 'thao_quyen' | 'song_luyen' | 'sincron' | 'thao_lo' | 'arme_cvd';

interface TabConfig {
  tipProba: string;
  categoriiInlantuiri: string[];
}

const TAB_CONFIG: Record<TabMatrice, TabConfig> = {
  thao_quyen:  { tipProba: 'thao_quyen_individual', categoriiInlantuiri: ['quyen'] },
  sincron:     { tipProba: 'sincron',               categoriiInlantuiri: ['quyen'] },
  song_luyen:  { tipProba: 'song_luyen',            categoriiInlantuiri: ['song_luyen'] },
  thao_lo:     { tipProba: 'thao_lo_individual',    categoriiInlantuiri: ['thao_lo_bong', 'thao_lo_dao', 'thao_lo_guom'] },
  arme_cvd:    { tipProba: 'thao_lo_individual',    categoriiInlantuiri: ['arma_cvd'] },
};

// ---------------------------------------------------------------------------
// Helpers filtrare grade după categorie vârstă
// ---------------------------------------------------------------------------

function filtreazaGradeDupaCategorieVarsta(grade: Grad[], categorie: string): Grad[] {
  if (categorie === 'toate') return grade;

  return grade.filter(g => {
    const n = g.nume.toLowerCase();
    if (categorie === 'copii') {
      return n.includes('cap ro') || n.includes('centură violet') || n.includes('centura violet');
    }
    if (categorie === 'juniori') {
      return /^\d\s*cap/i.test(n) || /^[1-4]\s*c\.?a\.?p/i.test(n);
    }
    if (categorie === 'seniori') {
      return n.includes('c.n') || n.includes('cn') || n.includes('dang') || n.includes('đẳng');
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  tab: TabMatrice;
  canEdit: boolean;
}

// ---------------------------------------------------------------------------
// Componenta
// ---------------------------------------------------------------------------

export const MatriceGradePanel: React.FC<Props> = ({ tab, canEdit }) => {
  const { showError } = useError();
  const { tipProba, categoriiInlantuiri } = TAB_CONFIG[tab];

  const { grade, inlantuiri, loading, isActive, toggle } = useInlantuiriPivot(
    tipProba,
    categoriiInlantuiri
  );

  const [filtruGrad, setFiltruGrad] = useState<string>('toate');
  const [filtruVarsta, setFiltruVarsta] = useState<string>('toate');
  const [filtruArma, setFiltruArma] = useState<string>('toate');
  const [busy, setBusy] = useState<string | null>(null);

  // Filtrare coloane: pentru Thao Lo, aplică filtrul armă
  const coloane: Inlantuire[] = useMemo(() => {
    if (tab !== 'thao_lo' || filtruArma === 'toate') return inlantuiri;
    return inlantuiri.filter(i => i.categorie === filtruArma);
  }, [inlantuiri, tab, filtruArma]);

  // Filtrare rânduri: categorie vârstă + grad individual
  const randuri: Grad[] = useMemo(() => {
    let result = filtreazaGradeDupaCategorieVarsta(grade, filtruVarsta);
    if (filtruGrad !== 'toate') {
      result = result.filter(g => g.id === filtruGrad);
    }
    return result;
  }, [grade, filtruVarsta, filtruGrad]);

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
    <div className="space-y-3">
      {/* Filtre */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap">
        {/* Filtru categorie vârstă */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Categorie:</label>
          <select
            value={filtruVarsta}
            onChange={e => { setFiltruVarsta(e.target.value); setFiltruGrad('toate'); }}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {CATEGORII_VARSTA.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Filtru grad individual */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Grad:</label>
          <select
            value={filtruGrad}
            onChange={e => setFiltruGrad(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="toate">Toate gradele</option>
            {grade
              .filter(g => {
                if (filtruVarsta === 'toate') return true;
                return filtreazaGradeDupaCategorieVarsta([g], filtruVarsta).length > 0;
              })
              .map(g => (
                <option key={g.id} value={g.id}>{g.nume}</option>
              ))}
          </select>
        </div>

        {/* Filtru armă — doar pentru Thao Lo */}
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

        {/* Sumar */}
        <span className="text-xs text-slate-500 md:ml-auto">
          {randuri.length} grad{randuri.length !== 1 ? 'e' : ''} · {coloane.length} înlănțuiri
        </span>
      </div>

      {/* Tabel matrice */}
      {coloane.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center italic">
          Nicio înlănțuire pentru această selecție.
        </div>
      ) : randuri.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center italic">
          Niciun grad pentru această selecție.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="text-xs border-collapse min-w-max w-full">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700">
                {/* Celula header stânga */}
                <th className="sticky left-0 z-10 bg-slate-800 py-2 px-3 text-left text-slate-400 font-medium whitespace-nowrap border-r border-slate-700 min-w-[130px]">
                  Grad
                </th>
                {coloane.map(col => (
                  <th
                    key={col.id}
                    title={col.denumire}
                    className="py-2 px-1.5 text-center text-slate-400 font-medium whitespace-nowrap max-w-[80px] overflow-hidden"
                  >
                    <span className="block truncate max-w-[72px] mx-auto" title={col.denumire}>
                      {col.denumire}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {randuri.map((grad, ri) => (
                <tr
                  key={grad.id}
                  className={`border-t border-slate-700/50 hover:bg-slate-700/20 ${
                    ri % 2 === 0 ? '' : 'bg-slate-800/30'
                  }`}
                >
                  {/* Rând fix stânga */}
                  <td className="sticky left-0 z-10 bg-slate-800 py-1.5 px-3 text-slate-200 whitespace-nowrap border-r border-slate-700 font-medium">
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
                            onClick={() => handleToggle(grad.id, col.id)}
                            disabled={isBusy}
                            title={active ? `Dezactivează ${col.denumire} pentru ${grad.nume}` : `Activează ${col.denumire} pentru ${grad.nume}`}
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
                              <span className="text-slate-500 text-xs leading-none select-none">—</span>
                            ) : null}
                          </button>
                        ) : (
                          /* Read-only: afișaj simplu fără interacțiune */
                          <div
                            className={`w-6 h-6 rounded border flex items-center justify-center mx-auto ${
                              active
                                ? 'bg-emerald-600 border-emerald-500'
                                : 'bg-slate-700 border-slate-600'
                            }`}
                          >
                            {active ? (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-slate-500 text-xs leading-none select-none">—</span>
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
      )}
    </div>
  );
};
