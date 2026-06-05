import React, { useState, useMemo, useEffect } from 'react';
import {
  Competitie, CategorieCompetitie, InscriereCompetitie, Sportiv, Grad, VizaSportiv,
} from '../../../types';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { calculeazaVarstaLaData, verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { formatNume } from '../../../utils/formatareSportiv';
import { BadgeEligibilitateGenerala } from './shared';
import { EligibilitateGenerala } from './types';

// -----------------------------------------------
// HELPERS INTERNI
// -----------------------------------------------

function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return vizeSportivi.some(
    v => v.sportiv_id === sportivId && v.an === an && v.status_viza === 'Activ'
  );
}

function buildDejaInscrisiSet(inscrieri: InscriereCompetitie[]): Set<string> {
  const s = new Set<string>();
  for (const i of inscrieri) {
    if (i.status?.toLowerCase() !== 'retras') s.add(i.sportiv_id);
  }
  return s;
}

function calculeazaEligibilitateGenerala(
  s: Sportiv,
  dataCompetitie: string,
  anComp: number,
  vizeSportivi: VizaSportiv[],
  categorii?: CategorieCompetitie[],
  grade?: Grad[]
): EligibilitateGenerala {
  if (!s.data_nasterii) {
    return { status: 'date_incomplete', motiv: 'Lipsă dată naștere', avertismente: [] };
  }
  if (!s.grad_actual_id) {
    return { status: 'date_incomplete', motiv: 'Lipsă grad', avertismente: [] };
  }

  if (categorii && categorii.length > 0 && grade) {
    const nrEligibile = categorii.filter(cat => {
      const r = verificaEligibilitate(s, cat, grade, dataCompetitie);
      return r.eligibil;
    }).length;

    if (nrEligibile === 0) {
      const toateMotivelePrimaCategorie = verificaEligibilitate(s, categorii[0], grade, dataCompetitie).motive;
      const varsta = calculeazaVarstaLaData(s.data_nasterii, dataCompetitie);
      const gradSportiv = grade.find(g => g.id === s.grad_actual_id);

      const partsMesaj: string[] = [];
      const areProblemaVarsta = categorii.every(cat => {
        const r = verificaEligibilitate(s, cat, grade, dataCompetitie);
        return r.motive.some(m => m.includes('Vârst') || m.includes('vârst'));
      });
      const areProblemaGrad = categorii.every(cat => {
        const r = verificaEligibilitate(s, cat, grade, dataCompetitie);
        return r.motive.some(m => m.includes('Grad') || m.includes('grad'));
      });

      if (areProblemaVarsta) {
        partsMesaj.push(`Vârstă: ${varsta} ani`);
      }
      if (areProblemaGrad && gradSportiv) {
        partsMesaj.push(`Grad: ${gradSportiv.nume}`);
      }
      if (partsMesaj.length === 0 && toateMotivelePrimaCategorie.length > 0) {
        partsMesaj.push(toateMotivelePrimaCategorie[0]);
      }

      return {
        status: 'neeligibil',
        motiv: partsMesaj.length > 0 ? partsMesaj.join(', ') : 'Nu se încadrează în nicio categorie',
        avertismente: [],
      };
    }
  }

  const avertismente: string[] = [];
  const areViza = areVizaFRAM(s.id, anComp, vizeSportivi);
  if (!areViza) {
    avertismente.push('Fără viză FRAM');
  }

  if (avertismente.length > 0) {
    return { status: 'atentionare', motiv: null, avertismente };
  }

  return { status: 'eligibil', motiv: null, avertismente: [] };
}

// -----------------------------------------------
// CARD SPORTIV — mobil (< md)
// -----------------------------------------------
interface CardSportivProps {
  sportiv: Sportiv;
  isSelected: boolean;
  isDisabled: boolean;
  isDejaInscris: boolean;
  eligibilitate: EligibilitateGenerala;
  varsta: number | null;
  gradNume: string | null;
  gradAnomalie?: boolean;
  onToggle: () => void;
}

const CardSportiv: React.FC<CardSportivProps> = ({
  sportiv, isSelected, isDisabled, isDejaInscris,
  eligibilitate, varsta, gradNume, gradAnomalie, onToggle,
}) => {
  return (
    <label
      style={{ touchAction: 'manipulation' }}
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed border-slate-700 bg-slate-800/30'
          : isSelected
            ? 'border-brand-primary bg-brand-primary/10 shadow-sm'
            : 'border-slate-700 hover:border-slate-500 bg-slate-800/50 active:bg-slate-700/50'
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        disabled={isDisabled}
        onChange={onToggle}
        className="mt-0.5 w-6 h-6 min-w-[24px] rounded accent-brand-primary cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${isDisabled ? 'text-slate-400' : 'text-white'}`}>
            {formatNume(sportiv)}
          </span>
          {isDejaInscris && (
            <span className="inline-flex items-center text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-2 py-0.5 shrink-0">
              Deja inscris
            </span>
          )}
          <BadgeEligibilitateGenerala info={eligibilitate} />
        </div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
          {varsta !== null && <span>{varsta} ani</span>}
          {gradNume && <span className="text-slate-500">·</span>}
          {gradNume && <span>{gradNume}</span>}
          {gradAnomalie && (
            <span
              title="Vârsta depășește limita obișnuită a gradului — solicitați actualizarea gradului"
              className="text-[10px] font-semibold text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded px-1.5 py-0.5"
            >
              ⚠ grad neactualizat
            </span>
          )}
          {isDisabled && eligibilitate.status === 'date_incomplete' && eligibilitate.motiv && (
            <span className="text-slate-500 italic">— {eligibilitate.motiv}</span>
          )}
        </div>
        {eligibilitate.avertismente.length > 1 && (
          <div className="text-[10px] text-yellow-400/80 mt-0.5">
            {eligibilitate.avertismente.slice(1).join(' · ')}
          </div>
        )}
      </div>
    </label>
  );
};

// -----------------------------------------------
// RÂND TABEL SPORTIV — desktop (>= md)
// -----------------------------------------------
interface RandTabelSportivProps {
  sportiv: Sportiv;
  isSelected: boolean;
  isDisabled: boolean;
  isDejaInscris: boolean;
  eligibilitate: EligibilitateGenerala;
  varsta: number | null;
  gradNume: string | null;
  gradAnomalie?: boolean;
  onToggle: () => void;
}

const RandTabelSportiv: React.FC<RandTabelSportivProps> = ({
  sportiv, isSelected, isDisabled, isDejaInscris,
  eligibilitate, varsta, gradNume, gradAnomalie, onToggle,
}) => {
  return (
    <tr
      onClick={() => !isDisabled && onToggle()}
      style={{ touchAction: 'manipulation' }}
      className={`border-b border-slate-800 transition-colors ${
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-slate-800/60'
      } ${isSelected ? 'bg-brand-primary/10' : ''}`}
    >
      <td className="p-3 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isDisabled}
          onChange={onToggle}
          onClick={e => e.stopPropagation()}
          className="w-5 h-5 rounded accent-brand-primary cursor-pointer"
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${isDisabled ? 'text-slate-400' : 'text-white'}`}>
            {formatNume(sportiv)}
          </span>
          {isDejaInscris && (
            <span className="inline-flex items-center text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-1.5 py-0.5 shrink-0">
              Deja inscris
            </span>
          )}
        </div>
      </td>
      <td className="p-3 text-sm text-slate-400">
        {varsta !== null ? `${varsta} ani` : <span className="text-slate-600 italic">—</span>}
      </td>
      <td className="p-3 text-sm text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          {gradNume ?? <span className="text-slate-600 italic">—</span>}
          {gradAnomalie && (
            <span
              title="Vârsta depășește limita obișnuită a gradului — solicitați actualizarea gradului"
              className="text-[10px] font-semibold text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded px-1.5 py-0.5"
            >
              ⚠ neactualizat
            </span>
          )}
        </div>
      </td>
      <td className="p-3">
        <BadgeEligibilitateGenerala info={eligibilitate} />
      </td>
    </tr>
  );
};

// -----------------------------------------------
// PASUL 1 — Selectare sportivi
// -----------------------------------------------
export interface Pas1Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  vizeSportivi: VizaSportiv[];
  selected: Set<string>;
  myClubId?: string;
  onToggle: (id: string) => void;
  onContinua: () => void;
  onBack: () => void;
}

const Pas1SelectareSportivi: React.FC<Pas1Props> = ({
  competitie, sportivi, grade, categorii, inscrieri, vizeSportivi,
  selected, myClubId, onToggle, onContinua, onBack,
}) => {
  const [search, setSearch] = useState('');
  const [filterGen, setFilterGen] = useState<'' | 'Masculin' | 'Feminin'>('');
  const [filterGradeIds, setFilterGradeIds] = useState<Set<string>>(new Set());
  const [filterVarstaMin, setFilterVarstaMin] = useState('');
  const [filterVarstaMax, setFilterVarstaMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const anComp = new Date(competitie.data_inceput).getFullYear();

  const dejaInscrisiSet = useMemo(() => buildDejaInscrisiSet(inscrieri), [inscrieri]);

  const sportiviActivi = useMemo(
    () => sportivi.filter(s => s.status === 'Activ' && (!myClubId || s.club_id === myClubId)),
    [sportivi, myClubId]
  );

  const gradeDisponibile = useMemo(() => {
    const ids = new Set(sportiviActivi.map(s => s.grad_actual_id).filter(Boolean));
    return grade.filter(g => ids.has(g.id)).sort((a, b) => a.ordine - b.ordine);
  }, [sportiviActivi, grade]);

  const gradMaxAgeMap = useMemo(() => {
    const sorted = [...grade].sort((a, b) => a.ordine - b.ordine);
    const m = new Map<string, number>();
    sorted.forEach((g, i) => {
      m.set(g.id, i + 1 < sorted.length ? sorted[i + 1].varsta_minima - 1 : 99);
    });
    return m;
  }, [grade]);

  const gradeValideForVarsta = useMemo((): Set<string> | null => {
    const vMin = filterVarstaMin ? parseInt(filterVarstaMin) : null;
    const vMax = filterVarstaMax ? parseInt(filterVarstaMax) : null;
    if (vMin === null && vMax === null) return null;
    const sorted = [...grade].sort((a, b) => a.ordine - b.ordine);
    const valid = new Set<string>();
    sorted.forEach((g, i) => {
      const gMin = g.varsta_minima;
      const gMax = i + 1 < sorted.length ? sorted[i + 1].varsta_minima - 1 : 99;
      const fMin = vMin ?? 0;
      const fMax = vMax ?? 99;
      if (gMin <= fMax && gMax >= fMin) valid.add(g.id);
    });
    return valid;
  }, [grade, filterVarstaMin, filterVarstaMax]);

  useEffect(() => {
    if (!gradeValideForVarsta) return;
    setFilterGradeIds(prev => {
      const next = new Set([...prev].filter(id => gradeValideForVarsta.has(id)));
      return next.size !== prev.size ? next : prev;
    });
  }, [gradeValideForVarsta]);

  const sportiviFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const varstaMin = filterVarstaMin ? parseInt(filterVarstaMin) : null;
    const varstaMax = filterVarstaMax ? parseInt(filterVarstaMax) : null;

    return sportiviActivi.filter(s => {
      if (q && !`${s.nume} ${s.prenume}`.toLowerCase().includes(q)) return false;
      if (filterGen && s.gen !== filterGen) return false;
      if (filterGradeIds.size > 0 && (!s.grad_actual_id || !filterGradeIds.has(s.grad_actual_id))) return false;
      if ((varstaMin !== null || varstaMax !== null) && s.data_nasterii) {
        const varsta = calculeazaVarstaLaData(s.data_nasterii, competitie.data_inceput);
        if (varstaMin !== null && varsta < varstaMin) return false;
        if (varstaMax !== null && varsta > varstaMax) return false;
      }
      return true;
    });
  }, [sportiviActivi, search, filterGen, filterGradeIds, filterVarstaMin, filterVarstaMax, competitie.data_inceput]);

  const nrFiltreCactive = (filterGen ? 1 : 0) + (filterGradeIds.size > 0 ? 1 : 0) +
    (filterVarstaMin || filterVarstaMax ? 1 : 0);

  const enriched = useMemo(() =>
    sportiviFiltered.map(s => {
      const varsta = s.data_nasterii
        ? calculeazaVarstaLaData(s.data_nasterii, competitie.data_inceput)
        : null;
      const grad = grade.find(g => g.id === s.grad_actual_id);
      const eligibilitate = calculeazaEligibilitateGenerala(
        s, competitie.data_inceput, anComp, vizeSportivi, categorii, grade
      );
      const isDejaInscris = dejaInscrisiSet.has(s.id);
      const isDisabled = eligibilitate.status === 'date_incomplete' || eligibilitate.status === 'neeligibil';
      const gradAnomalie = !!(
        s.grad_actual_id && varsta !== null &&
        varsta > (gradMaxAgeMap.get(s.grad_actual_id) ?? 99) + 2
      );
      return { sportiv: s, varsta, gradNume: grad?.nume ?? null, eligibilitate, isDejaInscris, isDisabled, gradAnomalie };
    }),
    [sportiviFiltered, grade, categorii, vizeSportivi, dejaInscrisiSet, competitie.data_inceput, anComp, gradMaxAgeMap]
  );

  const enrichedFiltrat = useMemo(
    () => enriched.filter(e => e.eligibilitate.status !== 'neeligibil'),
    [enriched]
  );

  const selectableIds = useMemo(
    () => enrichedFiltrat.filter(e => !e.isDisabled).map(e => e.sportiv.id),
    [enrichedFiltrat]
  );

  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every(id => selected.has(id));

  const handleSelectAll = () => {
    if (allSelectableSelected) {
      selectableIds.forEach(id => selected.has(id) && onToggle(id));
    } else {
      selectableIds.forEach(id => !selected.has(id) && onToggle(id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">
            Inscriere sportivi
          </h2>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs text-slate-500">{selected.size} selectati</span>
        </div>
      </div>


      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cauta sportiv dupa nume..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtre avansate */}
      <div>
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{ touchAction: 'manipulation' }}
          className={`text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5 min-h-[40px] ${
            nrFiltreCactive > 0
              ? 'border-brand-primary text-brand-primary bg-brand-primary/10'
              : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
          }`}
        >
          Filtre avansate
          {nrFiltreCactive > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-primary text-white text-[10px] font-bold">
              {nrFiltreCactive}
            </span>
          )}
          <span className="text-[10px]">{showFilters ? '▲' : '▼'}</span>
        </button>

        {showFilters && (
          <div className="mt-2 p-3 rounded-xl border border-slate-700 bg-slate-800/60 space-y-3">
            {/* Gen */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Gen</p>
              <div className="flex gap-2">
                {(['', 'Masculin', 'Feminin'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setFilterGen(g)}
                    style={{ touchAction: 'manipulation' }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${
                      filterGen === g
                        ? 'border-brand-primary bg-brand-primary/20 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {g || 'Toate'}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade */}
            {gradeDisponibile.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Grade</p>
                  {gradeValideForVarsta && (
                    <span className="text-[10px] text-sky-400/70 italic">cascadă după vârstă activă</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {gradeDisponibile.map(g => {
                    const outsideCascade = gradeValideForVarsta !== null && !gradeValideForVarsta.has(g.id);
                    return (
                      <button
                        key={g.id}
                        disabled={outsideCascade}
                        onClick={() => {
                          if (outsideCascade) return;
                          setFilterGradeIds(prev => {
                            const next = new Set(prev);
                            if (next.has(g.id)) next.delete(g.id);
                            else next.add(g.id);
                            return next;
                          });
                        }}
                        title={outsideCascade ? `${g.nume} — în afara intervalului de vârstă selectat` : undefined}
                        style={{ touchAction: 'manipulation' }}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${
                          outsideCascade
                            ? 'border-slate-700 text-slate-600 opacity-40 cursor-not-allowed'
                            : filterGradeIds.has(g.id)
                              ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                              : 'border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {g.nume}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vârstă */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Vârstă la competiție</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Copii', min: 4, max: 8 },
                  { label: 'Jun. Mici', min: 9, max: 12 },
                  { label: 'Jun. 2', min: 13, max: 15 },
                  { label: 'Jun. 1', min: 16, max: 17 },
                  { label: 'Seniori', min: 18, max: 39 },
                  { label: 'Veterani', min: 40, max: 99 },
                ].map(cat => {
                  const isActive =
                    filterVarstaMin === String(cat.min) && filterVarstaMax === String(cat.max);
                  return (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setFilterVarstaMin('');
                          setFilterVarstaMax('');
                        } else {
                          setFilterVarstaMin(String(cat.min));
                          setFilterVarstaMax(String(cat.max));
                        }
                      }}
                      style={{ touchAction: 'manipulation' }}
                      className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                          : 'border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {cat.label}
                      <span className="block text-[10px] opacity-70">{cat.min === 40 ? '40+' : `${cat.min}–${cat.max}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset */}
            {nrFiltreCactive > 0 && (
              <button
                onClick={() => {
                  setFilterGen('');
                  setFilterGradeIds(new Set());
                  setFilterVarstaMin('');
                  setFilterVarstaMax('');
                }}
                className="text-xs text-red-400 hover:underline"
              >
                Resetează filtrele
              </button>
            )}
          </div>
        )}
      </div>

      {/* Select all */}
      {selectableIds.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-brand-primary hover:underline"
          >
            {allSelectableSelected ? 'Deselecteaza tot' : `Selecteaza toti (${selectableIds.length})`}
          </button>
          {enrichedFiltrat.filter(e => e.isDisabled).length > 0 && (
            <span className="text-xs text-slate-500">
              · {enrichedFiltrat.filter(e => e.isDisabled).length} cu date incomplete (exclusi)
            </span>
          )}
        </div>
      )}

      {/* Lista sportivi */}
      {enrichedFiltrat.length === 0 ? (
        <div className="text-center text-slate-500 py-12 italic text-sm">
          {search ? 'Niciun sportiv gasit pentru cautarea ta.' : 'Nu exista sportivi activi in club.'}
        </div>
      ) : (
        <>
          {/* MOBIL: carduri */}
          <div className="flex flex-col gap-2 md:hidden">
            {enrichedFiltrat.map(({ sportiv, varsta, gradNume, eligibilitate, isDejaInscris, isDisabled, gradAnomalie }) => (
              <CardSportiv
                key={sportiv.id}
                sportiv={sportiv}
                isSelected={selected.has(sportiv.id)}
                isDisabled={isDisabled}
                isDejaInscris={isDejaInscris}
                eligibilitate={eligibilitate}
                varsta={varsta}
                gradNume={gradNume}
                gradAnomalie={gradAnomalie}
                onToggle={() => !isDisabled && onToggle(sportiv.id)}
              />
            ))}
          </div>

          {/* DESKTOP: tabel */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={handleSelectAll}
                      disabled={selectableIds.length === 0}
                      className="w-4 h-4 rounded accent-brand-primary cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Sportiv
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Varsta la competitie
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Grad
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800/20">
                {enrichedFiltrat.map(({ sportiv, varsta, gradNume, eligibilitate, isDejaInscris, isDisabled, gradAnomalie }) => (
                  <RandTabelSportiv
                    key={sportiv.id}
                    sportiv={sportiv}
                    isSelected={selected.has(sportiv.id)}
                    isDisabled={isDisabled}
                    isDejaInscris={isDejaInscris}
                    eligibilitate={eligibilitate}
                    varsta={varsta}
                    gradNume={gradNume}
                    gradAnomalie={gradAnomalie}
                    onToggle={() => !isDisabled && onToggle(sportiv.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-400">
            {selected.size > 0
              ? `${selected.size} sportiv${selected.size !== 1 ? 'i' : ''} selectat${selected.size !== 1 ? 'i' : ''}`
              : 'Niciun sportiv selectat'}
          </span>
          <Button
            variant="success"
            disabled={selected.size === 0}
            onClick={onContinua}
            className="min-w-[140px]"
          >
            Continua
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pas1SelectareSportivi;
