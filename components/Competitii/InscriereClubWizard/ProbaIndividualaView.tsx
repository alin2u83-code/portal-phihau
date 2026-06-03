/**
 * ProbaIndividualaView — ecran dedicat probei individuale cu 2 pași:
 * Pas 1: Selectare sportivi eligibili
 * Pas 2: Selecție quyen (butoane inline, nu dropdown)
 *
 * Afișat când utilizatorul apasă un card de probă individuală din hub.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Competitie, CategorieCompetitie, Sportiv, Grad, Inlantuire, VizaSportiv,
  ProbaCompetitie,
} from '../../../types';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { verificaEligibilitate, calculeazaVarstaLaData } from '../../../utils/eligibilitateCompetitie';
import { QuyenAlesMap } from './types';
import { PROBA_INFO, PROBA_COLOR_CLASSES } from './constants';

// -----------------------------------------------
// STEP INDICATOR
// -----------------------------------------------
const StepIndicator: React.FC<{ step: 1 | 2 }> = ({ step }) => (
  <div className="flex items-center gap-3 mb-4">
    {/* Step 1 */}
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
      step === 1
        ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
        : 'bg-emerald-600 text-white'
    }`}>
      {step > 1 ? (
        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
          <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : '1'}
    </div>
    <span className={`text-xs font-medium ${step === 1 ? 'text-white' : 'text-emerald-400'}`}>
      Sportivi
    </span>
    <div className={`flex-1 h-0.5 rounded-full ${step > 1 ? 'bg-emerald-600/60' : 'bg-slate-700'}`} />
    {/* Step 2 */}
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
      step === 2
        ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
        : 'bg-slate-700 text-slate-500 border border-slate-600'
    }`}>
      2
    </div>
    <span className={`text-xs font-medium ${step === 2 ? 'text-white' : 'text-slate-500'}`}>
      Quyen
    </span>
  </div>
);

// -----------------------------------------------
// PAS 1 — selectare sportivi
// -----------------------------------------------
interface Pas1Props {
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  vizeSportivi: VizaSportiv[];
  dataCompetitie: string;
  probaId: string;
  onToggle: (id: string) => void;
  onContinua: () => void;
}

const Pas1Sportivi: React.FC<Pas1Props> = ({
  sportivi, grade, categorii, selectedSportivi, dataCompetitie, probaId, onToggle, onContinua,
}) => {
  const catProba = useMemo(
    () => categorii.filter(c => c.proba_id === probaId),
    [categorii, probaId]
  );

  const sportiviEligibili = useMemo(() => {
    return sportivi.filter(s => {
      if (s.status !== 'Activ') return false;
      if (!s.data_nasterii || !s.grad_actual_id) return false;
      return catProba.some(cat => verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil);
    }).map(s => {
      const grad = grade.find(g => g.id === s.grad_actual_id);
      const varsta = s.data_nasterii ? calculeazaVarstaLaData(s.data_nasterii, dataCompetitie) : null;
      return { sportiv: s, grad, varsta };
    });
  }, [sportivi, catProba, grade, dataCompetitie]);

  const nrSelectati = sportiviEligibili.filter(e => selectedSportivi.has(e.sportiv.id)).length;
  const initials = (s: Sportiv) => `${(s.prenume ?? '')[0] ?? ''}${(s.nume ?? '')[0] ?? ''}`.toUpperCase();
  const avatarColors = ['bg-indigo-600', 'bg-violet-600', 'bg-sky-600', 'bg-teal-600', 'bg-rose-600'];

  return (
    <>
      <p className="text-base font-bold text-white mb-0.5">Selectează sportivii</p>
      <p className="text-xs text-slate-400 mb-3">
        Doar sportivi eligibili pentru această probă (grad + vârstă).
      </p>

      <StepIndicator step={1} />

      <p className="text-xs text-slate-400 mb-3">
        Selectați: <span className="text-white font-bold">{nrSelectati}</span> din {sportiviEligibili.length}
      </p>

      {sportiviEligibili.length === 0 ? (
        <div className="text-center text-slate-500 py-10 italic text-sm">
          Niciun sportiv eligibil pentru această probă.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-4">
          {sportiviEligibili.map(({ sportiv, grad, varsta }, idx) => {
            const isSel = selectedSportivi.has(sportiv.id);
            const avatarCls = avatarColors[idx % avatarColors.length];
            return (
              <button
                key={sportiv.id}
                type="button"
                onClick={() => onToggle(sportiv.id)}
                style={{ touchAction: 'manipulation' }}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isSel
                    ? 'border-indigo-500 bg-indigo-900/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSel ? 'bg-indigo-600 border-indigo-500' : 'border-slate-600'
                }`}>
                  {isSel && (
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 text-white">
                      <path d="M2 6.5l2.5 2.5 5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full ${avatarCls} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {initials(sportiv)}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-white">
                    {sportiv.prenume} {sportiv.nume}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {grad && (
                      <span className="text-[11px] bg-slate-700 rounded px-1.5 py-0.5 text-slate-300">
                        {grad.nume}
                      </span>
                    )}
                    {varsta !== null && (
                      <span className="text-[11px] bg-slate-700 rounded px-1.5 py-0.5 text-slate-300">
                        {varsta} ani
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {nrSelectati > 0
              ? `${nrSelectati} sportiv${nrSelectati !== 1 ? 'i' : ''} selectat${nrSelectati !== 1 ? 'i' : ''}`
              : 'Niciun sportiv selectat'}
          </span>
          <Button
            variant="success"
            disabled={nrSelectati === 0}
            onClick={nrSelectati > 0 ? onContinua : undefined}
            className="min-w-[160px]"
          >
            Continuă la Quyen →
          </Button>
        </div>
      </div>
    </>
  );
};

// -----------------------------------------------
// PAS 2 — selecție quyen (butoane inline)
// -----------------------------------------------
interface Pas2Props {
  sportiviSelectati: Set<string>;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  quyenAles: QuyenAlesMap;
  onUpdateQuyenAles: (next: QuyenAlesMap) => void;
  excludedFromIndividual: Set<string>;
  onToggleExclus: (id: string) => void;
  probaId: string;
  dataCompetitie: string;
  onBack: () => void;
  onSave: () => void;
}

interface SportivQuyen {
  sportiv: Sportiv;
  grad: Grad | null;
  autoCat: CategorieCompetitie | null;
  opts: Inlantuire[];
}

const Pas2Quyen: React.FC<Pas2Props> = ({
  sportiviSelectati, sportivi, grade, categorii, quyenAles, onUpdateQuyenAles,
  excludedFromIndividual, onToggleExclus, probaId, dataCompetitie, onBack, onSave,
}) => {
  const { showError } = useError();
  const [dreptMap, setDreptMap] = useState<Map<string, Map<string, Inlantuire[]>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showMissOnly, setShowMissOnly] = useState(false);
  const autoSelectDone = useRef(false);

  const catProba = useMemo(() => categorii.filter(c => c.proba_id === probaId), [categorii, probaId]);

  // Fetch inlantuiri
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  const sportiviDate = useMemo((): SportivQuyen[] => {
    return sportivi
      .filter(s => sportiviSelectati.has(s.id))
      .map(s => {
        const grad = grade.find(g => g.id === s.grad_actual_id) ?? null;
        const autoCat = catProba.find(cat => verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil) ?? null;
        const tipProba = autoCat?.proba?.tip_proba ?? 'thao_quyen_individual';
        const opts = grad ? (dreptMap.get(tipProba)?.get(grad.id) ?? []) : [];
        return { sportiv: s, grad, autoCat, opts };
      });
  }, [sportivi, sportiviSelectati, catProba, grade, dreptMap, dataCompetitie]);

  // Auto-select single option
  useEffect(() => {
    if (loading || autoSelectDone.current) return;
    autoSelectDone.current = true;
    const updates: Array<{ id: string; q1: string }> = [];
    for (const d of sportiviDate) {
      const q = quyenAles.get(d.sportiv.id);
      if (q?.q1) continue;
      if (d.opts.length === 1) {
        updates.push({ id: d.sportiv.id, q1: d.opts[0].id });
      }
    }
    if (updates.length > 0) {
      const next = new Map(quyenAles);
      for (const { id, q1 } of updates) {
        const cur = next.get(id) ?? { q1: '', q2: '' };
        next.set(id, { ...cur, q1 });
      }
      onUpdateQuyenAles(next);
    }
  }, [loading, sportiviDate, quyenAles, onUpdateQuyenAles]);

  const sportiviLipsaQ1 = sportiviDate.filter(d =>
    !excludedFromIndividual.has(d.sportiv.id) && !quyenAles.get(d.sportiv.id)?.q1
  );
  const esteBlockat = sportiviLipsaQ1.length > 0;

  const sportiviVizibili = showMissOnly ? sportiviLipsaQ1 : sportiviDate;

  const handlePickQ1 = (sportivId: string, val: string) => {
    const cur = quyenAles.get(sportivId) ?? { q1: '', q2: '' };
    const next = new Map(quyenAles);
    // Toggle: dacă deja ales — deselectează
    next.set(sportivId, { q1: cur.q1 === val ? '' : val, q2: cur.q2 });
    onUpdateQuyenAles(next);
  };

  const handleAutoAll = () => {
    const next = new Map(quyenAles);
    for (const d of sportiviLipsaQ1) {
      if (d.opts.length > 0) {
        const cur = next.get(d.sportiv.id) ?? { q1: '', q2: '' };
        next.set(d.sportiv.id, { ...cur, q1: d.opts[0].id });
      }
    }
    onUpdateQuyenAles(next);
  };

  const initials = (s: Sportiv) => `${(s.prenume ?? '')[0] ?? ''}${(s.nume ?? '')[0] ?? ''}`.toUpperCase();

  return (
    <>
      <p className="text-base font-bold text-white mb-0.5">Selectează quyenul</p>
      <p className="text-xs text-slate-400 mb-3">
        Apasă butonul quyenului pentru fiecare sportiv.
      </p>

      <StepIndicator step={2} />

      {loading ? (
        <div className="text-center text-xs text-slate-500 py-10 animate-pulse">
          Se încarcă drepturile de grad...
        </div>
      ) : (
        <>
          {/* Toggle "afișează doar fără quyen" */}
          <button
            onClick={() => setShowMissOnly(v => !v)}
            style={{ touchAction: 'manipulation' }}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold mb-3 transition-all ${
              showMissOnly
                ? 'border-yellow-600/60 bg-yellow-900/20 text-yellow-400'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
            }`}
          >
            <span>Afișează doar fără quyen</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              showMissOnly ? 'bg-yellow-900/40 text-yellow-300' : 'bg-slate-700 text-slate-400'
            }`}>
              {sportiviLipsaQ1.length}
            </span>
          </button>

          {/* Banner blocare */}
          {esteBlockat && (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-700/50 bg-yellow-900/15 px-4 py-3 mb-3">
              <span className="text-yellow-400 shrink-0">🔒</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-300">
                  {sportiviLipsaQ1.length} sportiv{sportiviLipsaQ1.length !== 1 ? 'i' : ''} fără quyen selectat
                </p>
                <p className="text-xs text-yellow-400/70 mt-0.5 mb-2">
                  Nu poți salva până când toți au quyen ales.
                </p>
                <button
                  onClick={handleAutoAll}
                  style={{ touchAction: 'manipulation' }}
                  className="text-xs font-semibold border border-slate-600 bg-slate-800 text-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-700 transition-colors"
                >
                  Auto-selectează primul quyen pentru toți
                </button>
              </div>
            </div>
          )}

          {/* Lista sporivi cu butoane quyen */}
          <div className="flex flex-col gap-1.5 mb-4">
            {sportiviVizibili.length === 0 && (
              <div className="text-center text-slate-500 py-8 italic text-sm">
                Toți sportivii au quyen selectat.
              </div>
            )}
            {sportiviVizibili.map(({ sportiv, grad, opts }) => {
              const q = quyenAles.get(sportiv.id) ?? { q1: '', q2: '' };
              const isExclus = excludedFromIndividual.has(sportiv.id);
              const hasQ1 = !!q.q1;

              return (
                <div
                  key={sportiv.id}
                  className={`rounded-xl border px-3 py-2.5 transition-all ${
                    isExclus
                      ? 'border-slate-700 bg-slate-800/30 opacity-50'
                      : hasQ1
                        ? 'border-emerald-700/50 bg-emerald-900/10'
                        : 'border-yellow-700/40 bg-yellow-900/10'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Dot status */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${hasQ1 ? 'bg-emerald-400' : 'bg-yellow-400'}`} />

                    {/* Avatar + nome */}
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {initials(sportiv)}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white min-w-[90px]">
                        {sportiv.prenume} {sportiv.nume}
                      </span>
                      {grad && (
                        <span className="text-[11px] text-slate-400">{grad.nume}</span>
                      )}
                    </div>

                    {/* Toggle excludere */}
                    <button
                      type="button"
                      onClick={() => onToggleExclus(sportiv.id)}
                      style={{ touchAction: 'manipulation' }}
                      className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 transition-colors shrink-0 ${
                        isExclus
                          ? 'border-indigo-500 text-indigo-400 hover:border-slate-500 hover:text-slate-400'
                          : 'border-slate-600 text-slate-500 hover:border-orange-500 hover:text-orange-400'
                      }`}
                    >
                      {isExclus ? '↩ Participă' : 'Exclude'}
                    </button>
                  </div>

                  {/* Butoane quyen inline */}
                  {!isExclus && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-4">
                      {opts.length === 0 && (
                        <span className="text-[11px] text-slate-500 italic">
                          Nicio înlănțuire disponibilă pentru gradul {grad?.nume ?? 'necunoscut'}
                        </span>
                      )}
                      {opts.map(opt => {
                        const isActive = q.q1 === opt.id;
                        const isAuto = opts.length === 1;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handlePickQ1(sportiv.id, opt.id)}
                            style={{ touchAction: 'manipulation' }}
                            className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-all ${
                              isActive
                                ? isAuto
                                  ? 'bg-emerald-900/30 border-emerald-600/60 text-emerald-300'
                                  : 'bg-emerald-900/30 border-emerald-600/60 text-emerald-300'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-indigo-500 hover:text-white'
                            }`}
                          >
                            {isActive ? '✓ ' : ''}{opt.denumire}{isAuto && isActive ? ' (auto)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center gap-3 justify-between">
          <button
            type="button"
            onClick={onBack}
            style={{ touchAction: 'manipulation' }}
            className="text-xs font-semibold border border-slate-600 text-slate-300 rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors"
          >
            ← Modifică sportivi
          </button>
          <Button
            variant="success"
            disabled={loading || esteBlockat}
            onClick={!loading && !esteBlockat ? onSave : undefined}
            className="min-w-[160px]"
            title={esteBlockat ? 'Rezolvă selecțiile Q1 lipsă' : undefined}
          >
            {esteBlockat ? '🔒 Salvează Quyen' : 'Salvează Quyen ✓'}
          </Button>
        </div>
      </div>
    </>
  );
};

// -----------------------------------------------
// CONTAINER PRINCIPAL
// -----------------------------------------------

export interface ProbaIndividualaViewProps {
  competitie: Competitie;
  proba: ProbaCompetitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  vizeSportivi: VizaSportiv[];
  quyenAles: QuyenAlesMap;
  onUpdateQuyenAles: (next: QuyenAlesMap) => void;
  excludedFromIndividual: Set<string>;
  onToggleExclus: (id: string) => void;
  onBack: () => void;
  onSave: () => void;
  /** Sportivi pre-selectați dal hub (din selecția globală) */
  selectedSportiviHub: Set<string>;
  myClubId?: string;
}

const ProbaIndividualaView: React.FC<ProbaIndividualaViewProps> = ({
  competitie, proba, sportivi, grade, categorii, vizeSportivi,
  quyenAles, onUpdateQuyenAles, excludedFromIndividual, onToggleExclus,
  onBack, onSave, selectedSportiviHub, myClubId,
}) => {
  const [internalStep, setInternalStep] = useState<1 | 2>(1);
  // Sportivi selectați LOCAL în pasul 1 (inițializăm cu sportivii eligibili deja în hub)
  const [localSelected, setLocalSelected] = useState<Set<string>>(() => new Set(selectedSportiviHub));

  const info = PROBA_INFO[proba.tip_proba];
  const colorKey = info?.color ?? 'amber';
  const colors = PROBA_COLOR_CLASSES[colorKey] ?? PROBA_COLOR_CLASSES.amber;

  const sportiviClub = useMemo(
    () => sportivi.filter(s => !myClubId || s.club_id === myClubId),
    [sportivi, myClubId]
  );

  const handleToggle = (id: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      {/* Header nav */}
      <div className="flex items-start gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center gap-1.5 border border-slate-600 text-slate-300 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-700 transition-colors shrink-0"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Probe
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${colors.text}`}>
            {info?.title ?? proba.tip_proba}
          </p>
          <p className="text-sm font-semibold text-white leading-tight">{proba.denumire}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pas {internalStep} din 2: {internalStep === 1 ? 'Selectează sportivii' : 'Alege quyenul'}
          </p>
        </div>
      </div>

      {internalStep === 1 ? (
        <Pas1Sportivi
          sportivi={sportiviClub}
          grade={grade}
          categorii={categorii}
          selectedSportivi={localSelected}
          vizeSportivi={vizeSportivi}
          dataCompetitie={competitie.data_inceput}
          probaId={proba.id}
          onToggle={handleToggle}
          onContinua={() => setInternalStep(2)}
        />
      ) : (
        <Pas2Quyen
          sportiviSelectati={localSelected}
          sportivi={sportiviClub}
          grade={grade}
          categorii={categorii}
          quyenAles={quyenAles}
          onUpdateQuyenAles={onUpdateQuyenAles}
          excludedFromIndividual={excludedFromIndividual}
          onToggleExclus={onToggleExclus}
          probaId={proba.id}
          dataCompetitie={competitie.data_inceput}
          onBack={() => setInternalStep(1)}
          onSave={onSave}
        />
      )}
    </div>
  );
};

export default ProbaIndividualaView;
