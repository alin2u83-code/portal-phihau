import React, { useState, useEffect } from 'react';
import {
  CategorieCompetitie, Grad, InscriereCompetitie, Inlantuire,
  ProbaCompetitie, Sportiv, TipParticipare, StagiuCVDParticipare,
} from '../../../types';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { formatNume } from '../../../utils/formatareSportiv';
import { STEP_LABELS, STEP_LABELS_SCURT } from './constants';
import { EligibilitateGenerala, DreptGrad, PickCategorie, IndivPicks } from './types';

// -----------------------------------------------
// FILTER TYPES & COMPONENTS
// -----------------------------------------------

export interface FilterOption {
  value: string;
  label: string;
}

// -----------------------------------------------
// STEP INDICATOR (STEPPER)
// -----------------------------------------------

const StepIndicator: React.FC<{ step: number; total: number }> = ({ step, total }) => {
  return (
    <nav aria-label="Progres wizard inscriere" className="mb-2">
      {/* ---- DESKTOP (md+): orizontal cu etichete complete ---- */}
      <ol className="hidden md:flex items-center w-full">
        {Array.from({ length: total }, (_, i) => i + 1).map(n => {
          const isCompleted = n < step;
          const isActive    = n === step;
          const isLast      = n === total;

          return (
            <li
              key={n}
              className={`flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}
            >
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={[
                    'flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-200',
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                      : isActive
                        ? 'bg-[var(--brand-primary)] text-white ring-4 ring-[var(--brand-primary)]/20 shadow-md'
                        : 'bg-slate-700 text-slate-500 border border-slate-600',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
                      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    n
                  )}
                </div>
                <span
                  className={[
                    'text-[11px] font-medium text-center leading-tight whitespace-nowrap',
                    isCompleted
                      ? 'text-emerald-400'
                      : isActive
                        ? 'text-white'
                        : 'text-slate-500',
                  ].join(' ')}
                >
                  {STEP_LABELS[n - 1]}
                </span>
              </div>

              {!isLast && (
                <div
                  className={[
                    'flex-1 mx-2 mt-[-20px] h-0.5 rounded-full transition-all duration-300',
                    isCompleted ? 'bg-emerald-600/60' : 'bg-slate-700',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* ---- MOBIL (< md): orizontal compact cu etichete scurte ---- */}
      <ol className="flex md:hidden items-center w-full">
        {Array.from({ length: total }, (_, i) => i + 1).map(n => {
          const isCompleted = n < step;
          const isActive    = n === step;
          const isLast      = n === total;

          return (
            <li
              key={n}
              className={`flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  aria-current={isActive ? 'step' : undefined}
                  className={[
                    'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-200',
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-[var(--brand-primary)] text-white ring-2 ring-[var(--brand-primary)]/25'
                        : 'bg-slate-700 text-slate-500 border border-slate-600',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    n
                  )}
                </div>
                <span
                  className={[
                    'text-[10px] font-medium text-center leading-none',
                    isCompleted
                      ? 'text-emerald-500'
                      : isActive
                        ? 'text-white'
                        : 'text-slate-600',
                  ].join(' ')}
                >
                  {STEP_LABELS_SCURT[n - 1]}
                </span>
              </div>

              {!isLast && (
                <div
                  className={[
                    'flex-1 mx-1.5 mt-[-14px] h-0.5 rounded-full transition-all duration-300',
                    isCompleted ? 'bg-emerald-600/50' : 'bg-slate-700',
                  ].join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/** Alias backward-compat */
export const WizardProgress = StepIndicator;

// -----------------------------------------------
// BADGE ELIGIBILITATE GENERALĂ
// -----------------------------------------------

export const BadgeEligibilitateGenerala: React.FC<{ info: EligibilitateGenerala }> = ({ info }) => {
  if (info.status === 'eligibil') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-700/50 rounded-full px-2 py-0.5 shrink-0">
        Eligibil
      </span>
    );
  }
  if (info.status === 'date_incomplete') {
    return (
      <span
        title={info.motiv || ''}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-700/60 border border-slate-600 rounded-full px-2 py-0.5 shrink-0"
      >
        Date incomplete
      </span>
    );
  }
  if (info.status === 'atentionare') {
    return (
      <span
        title={info.avertismente.join(', ')}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-900/30 border border-yellow-700/50 rounded-full px-2 py-0.5 shrink-0"
      >
        {info.avertismente[0]}
      </span>
    );
  }
  return (
    <span
      title={info.motiv || 'Nu se încadrează în nicio categorie a competiției'}
      className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-700/50 rounded-full px-2 py-0.5 shrink-0"
    >
      Neeligibil{info.motiv ? `: ${info.motiv}` : ''}
    </span>
  );
};

// -----------------------------------------------
// BADGE TIP PARTICIPARE
// -----------------------------------------------
const BADGE_TIP: Record<TipParticipare, { label: string; cls: string }> = {
  individual: { label: 'Individual', cls: 'text-sky-400 bg-sky-900/30 border-sky-700/50' },
  pereche:    { label: 'Pereche',    cls: 'text-purple-400 bg-purple-900/30 border-purple-700/50' },
  echipa:     { label: 'Echipa',     cls: 'text-orange-400 bg-orange-900/30 border-orange-700/50' },
};

export const BadgeTipParticipare: React.FC<{ tip: TipParticipare }> = ({ tip }) => {
  const { label, cls } = BADGE_TIP[tip];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${cls}`}>
      {label}
    </span>
  );
};

// -----------------------------------------------
// HELPERS
// -----------------------------------------------

export function esteThaoQuyenIndividual(cat: CategorieCompetitie): boolean {
  return (
    cat.tip_participare === 'individual' &&
    (cat.proba?.tip_proba === 'thao_quyen_individual' ||
      cat.proba?.tip_proba === 'thao_lo_individual')
  );
}

export function esteEchipaSauPereche(cat: CategorieCompetitie): boolean {
  return cat.tip_participare === 'echipa' || cat.tip_participare === 'pereche';
}

export function grupeazaDupaProba(
  categorii: CategorieCompetitie[]
): Array<{ proba: ProbaCompetitie | null; probaDenumire: string; categorii: CategorieCompetitie[] }> {
  const map = new Map<string, { proba: ProbaCompetitie | null; probaDenumire: string; categorii: CategorieCompetitie[] }>();

  for (const cat of categorii) {
    const key = cat.proba_id ?? '__fara_proba__';
    if (!map.has(key)) {
      map.set(key, {
        proba: cat.proba ?? null,
        probaDenumire: cat.proba?.denumire ?? 'Fara proba',
        categorii: [],
      });
    }
    map.get(key)!.categorii.push(cat);
  }

  return Array.from(map.values()).sort((a, b) =>
    (a.proba?.ordine_afisare ?? 99) - (b.proba?.ordine_afisare ?? 99)
  );
}

// SL program după grad minim
export function getSLProg(gradMin: number): string {
  if (gradMin <= 1) return 'Song Doi Mot';
  if (gradMin === 2) return 'Dang Mon Song Luyen';
  if (gradMin <= 4) return 'QK 1 contra QK 3';
  return 'QK 2 contra QK 4';
}

// -----------------------------------------------
// RandCategorie — rând categorie eligibilă per sportiv (folosit în Pas2 vechi, acum doar în shared)
// -----------------------------------------------
interface RandCategorieProps {
  cat: CategorieCompetitie;
  sportivId: string;
  gradeId: string | null;
  isBifat: boolean;
  isDejaInscris: boolean;
  isDisabledBong: boolean;
  pickData: PickCategorie;
  drepturi: DreptGrad[];
  onToggle: () => void;
  onUpdatePick: (update: Partial<PickCategorie>) => void;
}

export const RandCategorie: React.FC<RandCategorieProps> = ({
  cat, gradeId, isBifat, isDejaInscris, isDisabledBong,
  pickData, drepturi, onToggle, onUpdatePick,
}) => {
  const { useMemo } = React;
  const isDisabled = isDejaInscris || isDisabledBong;
  const arataQuyenDropdown = isBifat && !isDejaInscris && esteThaoQuyenIndividual(cat);

  const programePermise = useMemo<Inlantuire[]>(() => {
    if (!arataQuyenDropdown || gradeId === null) return [];
    const drept = drepturi.find(
      d => d.grade_id === gradeId && d.tip_proba === cat.proba?.tip_proba
    );
    return drept?.inlantuiri ?? [];
  }, [arataQuyenDropdown, gradeId, drepturi, cat.proba?.tip_proba]);

  const tooltipBong = isDisabledBong
    ? 'Regulament CVD (grade): Bong și Long Gian/Song Cot/Moc Can nu pot fi combinate'
    : undefined;

  return (
    <div className={`transition-all ${isDisabledBong ? 'opacity-40' : ''}`}>
      <label
        title={tooltipBong}
        style={{ touchAction: 'manipulation' }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          isDisabled
            ? 'cursor-not-allowed'
            : isBifat
              ? 'bg-brand-primary/10'
              : 'hover:bg-slate-700/50'
        }`}
      >
        <input
          type="checkbox"
          checked={isBifat || isDejaInscris}
          disabled={isDisabled}
          onChange={onToggle}
          className="w-5 h-5 min-w-[20px] rounded accent-brand-primary cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm leading-tight ${isDisabled && !isDejaInscris ? 'text-slate-500' : 'text-white'}`}>
              {cat.denumire ?? `Categoria ${cat.numar_categorie}`}
            </span>
            <BadgeTipParticipare tip={cat.tip_participare} />
            {cat.arma && (
              <span className="text-[10px] text-slate-400 bg-slate-700/60 rounded-full px-2 py-0.5 border border-slate-600">
                {cat.arma}
              </span>
            )}
            {isDejaInscris && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-2 py-0.5">
                Deja inscris
              </span>
            )}
          </div>
          {cat.varsta_max !== null ? (
            <div className="text-[11px] text-slate-500 mt-0.5">
              {cat.varsta_min}–{cat.varsta_max} ani · {cat.gen}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Peste {cat.varsta_min} ani · {cat.gen}
            </div>
          )}
        </div>
      </label>

      {arataQuyenDropdown && (
        <div className="ml-10 mb-2 mr-3">
          {programePermise.length > 0 ? (
            <select
              value={pickData.inlantuire_id ?? ''}
              onChange={e => onUpdatePick({ inlantuire_id: e.target.value || undefined })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
            >
              <option value="">
                {cat.proba?.tip_proba === 'thao_lo_individual'
                  ? 'Alege forma / arma...'
                  : 'Alege inlantuire...'}
              </option>
              {programePermise.map(il => (
                <option key={il.id} value={il.id}>{il.denumire}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={pickData.inlantuire_id ?? ''}
              onChange={e => onUpdatePick({ inlantuire_id: e.target.value || undefined })}
              placeholder={
                cat.proba?.tip_proba === 'thao_lo_individual'
                  ? 'Introdu forma / arma aleasa...'
                  : 'Introdu inlantuirea aleasa...'
              }
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
            />
          )}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// FilterDropdown — reusable multi-select filter dropdown
// -----------------------------------------------

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    const next = new Set(selected);
    next.has(val) ? next.delete(val) : next.add(val);
    onChange(next);
  };

  const count = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ touchAction: 'manipulation' }}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all min-h-[36px] ${
          count > 0
            ? 'border-indigo-500 bg-indigo-900/20 text-indigo-300'
            : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
        }`}
      >
        {label}
        {count > 0 && (
          <span className="bg-indigo-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
            {count}
          </span>
        )}
        <span className="text-slate-500 text-[10px]">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-slate-800 border border-slate-600 rounded-xl shadow-xl overflow-hidden">
          {options.map(opt => {
            const isSel = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                style={{ touchAction: 'manipulation' }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-slate-700 transition-colors min-h-[44px]"
              >
                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border text-[10px] ${
                  isSel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-500'
                }`}>
                  {isSel ? '✓' : ''}
                </span>
                <span className={isSel ? 'text-indigo-300 font-semibold' : 'text-slate-300'}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// VederePerCategorie — bulk assignment (folosit în wizard)
// -----------------------------------------------
interface VederePerCategorieProps {
  sportiviSelectati: Array<{ sportiv: Sportiv; varsta: number; gradNume: string | null; gradOrdine: number | null }>;
  eligibilePerSportiv: Map<string, CategorieCompetitie[]>;
  inscrieri: InscriereCompetitie[];
  indivPicks: IndivPicks;
  categorii: CategorieCompetitie[];
  probe?: ProbaCompetitie[];
  probeSkipped?: Set<string>;
  onToggleCategorie: (sportivId: string, catId: string) => void;
  onToggleProbaSkipped?: (probaId: string) => void;
}

export const VederePerCategorie: React.FC<VederePerCategorieProps> = ({
  sportiviSelectati, eligibilePerSportiv, inscrieri, indivPicks, categorii,
  probe, probeSkipped, onToggleCategorie, onToggleProbaSkipped,
}) => {
  const { useMemo } = React;

  const categoriiCuSportivi = useMemo(() => {
    const map = new Map<string, { categorie: CategorieCompetitie; sportivi: typeof sportiviSelectati }>();
    for (const entry of sportiviSelectati) {
      const eligibile = eligibilePerSportiv.get(entry.sportiv.id) ?? [];
      for (const cat of eligibile) {
        if (!map.has(cat.id)) {
          map.set(cat.id, { categorie: cat, sportivi: [] });
        }
        map.get(cat.id)!.sportivi.push(entry);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.categorie.ordine_afisare ?? 0) - (b.categorie.ordine_afisare ?? 0)
    );
  }, [sportiviSelectati, eligibilePerSportiv]);

  const grupe = useMemo(() => {
    const map = new Map<string | null, { proba: ProbaCompetitie | null; items: typeof categoriiCuSportivi }>();
    for (const item of categoriiCuSportivi) {
      const pid = item.categorie.proba_id ?? null;
      if (!map.has(pid)) {
        const proba = probe?.find(p => p.id === pid) ?? null;
        map.set(pid, { proba, items: [] });
      }
      map.get(pid)!.items.push(item);
    }
    return Array.from(map.values());
  }, [categoriiCuSportivi, probe]);

  if (categoriiCuSportivi.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 italic text-sm">
        Nicio categorie eligibilă pentru sportivii selectați.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grupe.map(({ proba, items }) => {
        const isSkipped = proba ? (probeSkipped?.has(proba.id) ?? false) : false;
        return (
          <div key={proba?.id ?? 'fara-proba'} className="space-y-2">
            {proba && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{proba.denumire}</span>
                {onToggleProbaSkipped && (
                  <button
                    onClick={() => onToggleProbaSkipped(proba.id)}
                    className={`text-xs border rounded px-2 py-0.5 transition-colors ${isSkipped ? 'border-yellow-600 text-yellow-400 hover:border-yellow-400' : 'border-slate-600 text-slate-400 hover:text-yellow-400 hover:border-yellow-600'}`}
                  >
                    {isSkipped ? '↩ Reactivează' : 'Nu avem concurenți'}
                  </button>
                )}
              </div>
            )}
            {isSkipped ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
                <span className="text-xs text-yellow-500 italic">Probă sărită — categoriile nu vor fi incluse în sumar</span>
              </div>
            ) : (
              items.map(({ categorie, sportivi: sportiviFiltrati }) => {
                const nrBifati = sportiviFiltrati.filter(e => {
                  const picks = indivPicks.get(e.sportiv.id);
                  return picks?.has(categorie.id);
                }).length;

                return (
                  <div key={categorie.id} className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-700">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-white">
                            {categorie.denumire ?? `Categoria ${categorie.numar_categorie}`}
                          </span>
                          <BadgeTipParticipare tip={categorie.tip_participare} />
                          {categorie.arma && (
                            <span className="text-[10px] text-slate-400 bg-slate-700/60 rounded-full px-2 py-0.5 border border-slate-600">
                              {categorie.arma}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {categorie.varsta_max !== null
                            ? `${categorie.varsta_min}–${categorie.varsta_max} ani`
                            : `Peste ${categorie.varsta_min} ani`
                          } · {categorie.gen} · {categorie.proba?.denumire ?? '—'}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">
                        {nrBifati}/{sportiviFiltrati.length} selectați
                      </div>
                    </div>

                    <div className="divide-y divide-slate-700/40">
                      {sportiviFiltrati.map(({ sportiv, varsta, gradNume }) => {
                        const dejaInscrisActiv = inscrieri.some(
                          i => i.sportiv_id === sportiv.id && i.categorie_id === categorie.id && i.status?.toLowerCase() !== 'retras'
                        );
                        const isBifat = (indivPicks.get(sportiv.id)?.has(categorie.id)) ?? false;

                        return (
                          <label
                            key={sportiv.id}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                              dejaInscrisActiv
                                ? 'opacity-50 cursor-not-allowed'
                                : isBifat
                                  ? 'bg-brand-primary/10'
                                  : 'hover:bg-slate-700/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isBifat || dejaInscrisActiv}
                              disabled={dejaInscrisActiv}
                              onChange={() => !dejaInscrisActiv && !esteEchipaSauPereche(categorie) && onToggleCategorie(sportiv.id, categorie.id)}
                              className="w-4 h-4 rounded accent-brand-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white">{formatNume(sportiv)}</span>
                              <span className="text-xs text-slate-500 ml-2">{varsta} ani{gradNume ? ` · ${gradNume}` : ''}</span>
                            </div>
                            {dejaInscrisActiv && (
                              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-2 py-0.5 shrink-0">
                                Deja inscris
                              </span>
                            )}
                            {esteEchipaSauPereche(categorie) && (
                              <span className="text-[10px] text-slate-500 italic shrink-0">via Pasul 3</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
};
