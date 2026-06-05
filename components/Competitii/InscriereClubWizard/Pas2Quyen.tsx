import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Competitie, CategorieCompetitie, Sportiv, Grad, Inlantuire,
} from '../../../types';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { formatNume } from '../../../utils/formatareSportiv';
import { QuyenAlesMap } from './types';

// -----------------------------------------------
// PASUL 2 — Selecție înlănțuiri (NOU)
// -----------------------------------------------
export interface Pas2QuyenProps {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  autoCategorie: Map<string, CategorieCompetitie>;
  quyenAles: QuyenAlesMap;
  onUpdateQuyenAles: (next: QuyenAlesMap) => void;
  onContinua: () => void;
  onBack: () => void;
  excludedFromIndividual: Set<string>;
  onToggleExclus: (sportivId: string) => void;
}

const Pas2SelectieQuyen: React.FC<Pas2QuyenProps> = ({
  competitie, sportivi, grade, selectedSportivi,
  autoCategorie, quyenAles, onUpdateQuyenAles, onContinua, onBack,
  excludedFromIndividual, onToggleExclus,
}) => {
  const { showError } = useError();
  const [dreptMap, setDreptMap] = useState<Map<string, Map<string, Inlantuire[]>>>(new Map());
  const [loadingDrepturi, setLoadingDrepturi] = useState(true);
  const [gradFilter, setGradFilter] = useState<number | null>(null);
  // Ref pentru a preveni auto-select repetat (rulează o singură dată după load)
  const autoSelectDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('inlantuiri_grade')
          .select('grade_id, tip_proba, inlantuiri!inlantuire_id(id, denumire, ordine, activ)');
        if (error) throw error;
        if (!cancelled) {
          const m = new Map<string, Map<string, Inlantuire[]>>();
          for (const row of (data ?? []) as unknown as { grade_id: string; tip_proba: string; inlantuiri: Inlantuire | null }[]) {
            if (!row.inlantuiri) continue;
            if (!m.has(row.tip_proba)) m.set(row.tip_proba, new Map());
            const gm = m.get(row.tip_proba)!;
            if (!gm.has(row.grade_id)) gm.set(row.grade_id, []);
            gm.get(row.grade_id)!.push(row.inlantuiri);
          }
          setDreptMap(m);
        }
      } catch (err) {
        showError('Incarcare drepturi grad', err);
      } finally {
        if (!cancelled) setLoadingDrepturi(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  const sportiviDate = useMemo(() =>
    sportivi
      .filter(s => selectedSportivi.has(s.id) && autoCategorie.has(s.id))
      .map(s => {
        const grad = grade.find(g => g.id === s.grad_actual_id) ?? null;
        const autoCat = autoCategorie.get(s.id)!;
        const tipProba = autoCat.proba?.tip_proba ?? 'thao_quyen_individual';
        const opts = grad ? (dreptMap.get(tipProba)?.get(grad.id) ?? []) : [];
        return { sportiv: s, grad, autoCat, opts };
      }),
    [sportivi, selectedSportivi, autoCategorie, grade, dreptMap]
  );

  /**
   * Auto-select Q1: după încărcarea drepturilor, pentru fiecare sportiv
   * care NU are deja Q1 ales și are exact O singură opțiune — setează automat.
   * Se rulează o singură dată (după primul load complet).
   */
  useEffect(() => {
    if (loadingDrepturi) return;
    if (autoSelectDone.current) return;
    autoSelectDone.current = true;

    const actualizari: Array<{ id: string; q1: string }> = [];
    for (const d of sportiviDate) {
      const q = quyenAles.get(d.sportiv.id);
      if (q?.q1) continue; // deja ales — nu suprascrie
      if (d.opts.length === 1) {
        actualizari.push({ id: d.sportiv.id, q1: d.opts[0].id });
      }
    }
    if (actualizari.length > 0) {
      const next = new Map(quyenAles);
      for (const { id, q1 } of actualizari) {
        const cur = next.get(id) ?? { q1: '', q2: '' };
        next.set(id, { ...cur, q1 });
      }
      onUpdateQuyenAles(next);
    }
  }, [loadingDrepturi, sportiviDate, quyenAles, onUpdateQuyenAles]);

  const sportiviVizibili = useMemo(() =>
    gradFilter === null
      ? sportiviDate
      : sportiviDate.filter(d => d.grad?.ordine === gradFilter),
    [sportiviDate, gradFilter]
  );

  const maxOpts = useMemo(() =>
    Math.max(2, ...sportiviVizibili.map(d => d.opts.length)),
    [sportiviVizibili]
  );

  const gradePresente = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of sportiviDate) {
      if (d.grad) m.set(d.grad.ordine, d.grad.nume);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a - b);
  }, [sportiviDate]);

  const nrComplet = useMemo(() =>
    sportiviDate.filter(d => {
      const q = quyenAles.get(d.sportiv.id);
      if (!q?.q1) return false;
      if (d.autoCat.doua_quyenuri && !q.q2) return false;
      return true;
    }).length,
    [sportiviDate, quyenAles]
  );

  const handlePickQ1 = (sportivId: string, val: string) => {
    const cur = quyenAles.get(sportivId) ?? { q1: '', q2: '' };
    const next = new Map(quyenAles);
    next.set(sportivId, { q1: val, q2: cur.q2 === val ? '' : cur.q2 });
    onUpdateQuyenAles(next);
  };

  const handlePickQ2 = (sportivId: string, val: string) => {
    const cur = quyenAles.get(sportivId) ?? { q1: '', q2: '' };
    const next = new Map(quyenAles);
    next.set(sportivId, { ...cur, q2: val });
    onUpdateQuyenAles(next);
  };

  const handleBulkQ1 = () => {
    const next = new Map(quyenAles);
    for (const d of sportiviVizibili) {
      if (d.opts.length > 0) {
        const cur = next.get(d.sportiv.id) ?? { q1: '', q2: '' };
        next.set(d.sportiv.id, { ...cur, q1: d.opts[0].id });
      }
    }
    onUpdateQuyenAles(next);
  };

  // Sportivi fără Q1 (excluși nu se contorizează — nu participă)
  const sportiviLipsaQ1 = sportiviDate.filter(d =>
    !excludedFromIndividual.has(d.sportiv.id) && !quyenAles.get(d.sportiv.id)?.q1
  );
  const sportiviLipsaQ2 = sportiviDate.filter(d =>
    !excludedFromIndividual.has(d.sportiv.id) &&
    d.autoCat.doua_quyenuri && quyenAles.get(d.sportiv.id)?.q1 && !quyenAles.get(d.sportiv.id)?.q2
  );
  // Blocat = există sportivi fără Q1 cu mai mult de o opțiune (dacă e o singură opțiune s-a auto-setat)
  const esteBlockat = sportiviLipsaQ1.some(d => d.opts.length > 1) || sportiviLipsaQ1.some(d => d.opts.length === 0);

  if (sportiviDate.length === 0 && !loadingDrepturi) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">Inscriere sportivi</h2>
          </div>
        </div>
        <div className="text-center text-slate-500 py-10 italic text-sm">
          Niciun sportiv cu categorie individuală auto-asignată.
        </div>
        <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4 flex justify-end">
          <Button variant="success" onClick={onContinua} className="min-w-[140px]">Continuă</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">Inscriere sportivi</h2>
        </div>
        <div className="text-right shrink-0 text-xs text-slate-500">
          {nrComplet}/{sportiviDate.length} complet
        </div>
      </div>

      {loadingDrepturi ? (
        <div className="text-center text-xs text-slate-500 py-8 animate-pulse">Se incarca drepturile de grad...</div>
      ) : (
        <>
          {/* Grade filter chips */}
          {gradePresente.length > 1 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-slate-500 shrink-0">Grad:</span>
              <button
                onClick={() => setGradFilter(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] ${
                  gradFilter === null ? 'border-brand-primary bg-brand-primary/20 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >Toți</button>
              {gradePresente.map(([ord, name]) => (
                <button
                  key={ord}
                  onClick={() => setGradFilter(ord)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors min-h-[36px] ${
                    gradFilter === ord ? 'border-brand-primary bg-brand-primary/20 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >{name}</button>
              ))}
            </div>
          )}

          {/* Banner blocare — sportivi cu multiple opțiuni fără Q1 ales */}
          {esteBlockat && (
            <div className="rounded-lg border border-red-700/50 bg-red-900/15 px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-red-400">
                  {sportiviLipsaQ1.length} sportiv{sportiviLipsaQ1.length !== 1 ? 'i' : ''} fără Q1 ales — nu poți continua
                </p>
                <p className="text-xs text-red-300/70 mt-0.5">
                  Alege înlănțuirea pentru fiecare sportiv sau dezactivează participarea lui.
                </p>
              </div>
            </div>
          )}

          {/* Bulk Q1 */}
          {sportiviLipsaQ1.length > 0 && (
            <button
              onClick={handleBulkQ1}
              className="text-xs px-3 py-2 rounded-lg border border-brand-primary/50 text-brand-primary hover:bg-brand-primary/10 transition-colors font-medium"
            >
              Setează prima opțiune Q1 pentru toți ({sportiviLipsaQ1.length})
            </button>
          )}
          {sportiviLipsaQ1.length === 0 && (
            <button
              onClick={handleBulkQ1}
              className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              ↓ Prima opțiune Q1 pentru toți vizibili
            </button>
          )}

          {/* Tabel înlănțuiri */}
          <div className="overflow-x-auto max-w-full rounded-lg border border-slate-700" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm" style={{ minWidth: `${Math.max(480, 300 + maxOpts * 120)}px` }}>
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">Participă</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Sportiv</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Categorie</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Grad</th>
                  {Array.from({ length: maxOpts }, (_, i) => (
                    <th key={i} className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Opțiunea {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-slate-800/20 divide-y divide-slate-800">
                {sportiviVizibili.map(({ sportiv, grad, autoCat, opts }) => {
                  const q = quyenAles.get(sportiv.id) ?? { q1: '', q2: '' };
                  const is2Q = autoCat.doua_quyenuri;

                  const cellCls = (opt: Inlantuire | undefined, isSelected: boolean, isDisabled = false) =>
                    `p-3 cursor-pointer transition-colors text-xs ${
                      !opt ? 'text-slate-700 cursor-default' :
                      isDisabled ? 'opacity-30 cursor-not-allowed text-slate-500' :
                      isSelected ? 'bg-brand-primary/20 text-white font-semibold border-l-2 border-brand-primary' :
                      'text-slate-300 hover:bg-slate-700/50'
                    }`;

                  if (!is2Q) {
                    const isExclus = excludedFromIndividual.has(sportiv.id);
                    return (
                      <tr key={sportiv.id} className={`${q.q1 ? 'bg-green-900/5' : 'bg-red-900/5'} ${isExclus ? 'opacity-40' : ''}`}>
                        <td className="p-3 w-24">
                          <label className="flex items-center gap-2 cursor-pointer" title="Bifat = participă la Thao Quyen">
                            <input
                              type="checkbox"
                              checked={!isExclus}
                              onChange={() => onToggleExclus(sportiv.id)}
                              className="w-4 h-4 rounded accent-brand-primary cursor-pointer"
                            />
                            <span className="text-xs text-slate-400">Da</span>
                          </label>
                        </td>
                        <td className={`p-3 font-medium whitespace-nowrap ${isExclus ? 'text-slate-500' : 'text-white'}`}>
                          {formatNume(sportiv)}
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{autoCat.denumire ?? `Cat ${autoCat.numar_categorie}`}</td>
                        <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{grad?.nume ?? '—'}</td>
                        {Array.from({ length: maxOpts }, (_, i) => {
                          const opt = opts[i];
                          return (
                            <td
                              key={i}
                              onClick={() => !isExclus && opt && handlePickQ1(sportiv.id, opt.id)}
                              className={isExclus ? 'p-3 text-xs text-slate-700 cursor-not-allowed' : cellCls(opt, q.q1 === opt?.id)}
                            >
                              {opt?.denumire ?? '—'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }

                  // 2Q — două rânduri
                  return (
                    <React.Fragment key={sportiv.id}>
                      <tr className="bg-green-900/5">
                        <td rowSpan={2} className="p-3 text-white font-medium whitespace-nowrap border-r border-slate-700/50">
                          {formatNume(sportiv)}
                          <span className="ml-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-900/40 border border-emerald-700/50 rounded-full px-1.5 py-0.5">2Q</span>
                        </td>
                        <td rowSpan={2} className="p-3 text-slate-400 text-xs border-r border-slate-700/50">
                          {autoCat.denumire ?? `Cat ${autoCat.numar_categorie}`}
                        </td>
                        <td rowSpan={2} className="p-3 text-slate-400 text-xs whitespace-nowrap border-r border-slate-700/50">
                          {grad?.nume ?? '—'}
                        </td>
                        <td className="px-2 py-1">
                          <span className="text-[10px] font-bold text-green-400 bg-green-900/40 border border-green-700/50 rounded px-1.5 py-0.5">Q1</span>
                        </td>
                        {Array.from({ length: maxOpts }, (_, i) => {
                          const opt = opts[i];
                          return (
                            <td key={i} onClick={() => opt && handlePickQ1(sportiv.id, opt.id)} className={cellCls(opt, q.q1 === opt?.id)}>
                              {opt?.denumire ?? '—'}
                            </td>
                          );
                        })}
                      </tr>
                      <tr className="bg-yellow-900/5">
                        <td className="px-2 py-1">
                          <span className="text-[10px] font-bold text-yellow-400 bg-yellow-900/40 border border-yellow-700/50 rounded px-1.5 py-0.5">Q2</span>
                        </td>
                        {Array.from({ length: maxOpts }, (_, i) => {
                          const opt = opts[i];
                          const isDisabledByQ1 = !!opt && opt.id === q.q1;
                          const isQ1Missing = !q.q1;
                          return (
                            <td
                              key={i}
                              onClick={() => opt && !isDisabledByQ1 && !isQ1Missing && handlePickQ2(sportiv.id, opt.id)}
                              title={isQ1Missing ? 'Selectează Q1 mai întâi' : isDisabledByQ1 ? 'Nu poți alege același quyen' : undefined}
                              className={isQ1Missing ? 'p-3 text-xs text-slate-600 italic' : cellCls(opt, q.q2 === opt?.id, isDisabledByQ1)}
                            >
                              {isQ1Missing ? (i === 0 ? 'Selectează Q1 mai întâi' : '') : (opt?.denumire ?? '—')}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Avertismente */}
          {(sportiviLipsaQ1.length > 0 || sportiviLipsaQ2.length > 0) && (
            <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 space-y-1">
              {sportiviLipsaQ1.length > 0 && (
                <p className="text-xs text-yellow-400">
                  {sportiviLipsaQ1.length} sportiv{sportiviLipsaQ1.length !== 1 ? 'i' : ''} fără înlănțuire Q1 selectată
                </p>
              )}
              {sportiviLipsaQ2.length > 0 && (
                <p className="text-xs text-yellow-400">
                  {sportiviLipsaQ2.length} sportiv{sportiviLipsaQ2.length !== 1 ? 'i' : ''} cu 2Q fără Q2 selectat
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <span className={`text-sm ${esteBlockat ? 'text-red-400' : 'text-slate-400'}`}>
            {esteBlockat
              ? `${sportiviLipsaQ1.length} sportiv${sportiviLipsaQ1.length !== 1 ? 'i' : ''} fără Q1`
              : `${nrComplet}/${sportiviDate.length} sportivi cu înlănțuire completă`
            }
          </span>
          <Button
            variant="success"
            disabled={loadingDrepturi || esteBlockat}
            onClick={(!loadingDrepturi && !esteBlockat) ? onContinua : undefined}
            className="min-w-[140px]"
            title={esteBlockat ? 'Rezolvă selecțiile Q1 lipsă înainte de a continua' : undefined}
          >
            Înapoi la probe
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pas2SelectieQuyen;
