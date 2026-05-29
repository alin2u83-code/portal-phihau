/**
 * InscriereClubWizard — Wizard 4 pași pentru înscrierea sportivilor din club la competiție.
 *
 * Pasul 1 (implementat): Selectare sportivi cu eligibilitate generală
 * Pasul 2 (implementat): Categorii per sportiv — eligibilitate per categorie, inlantuire_id, acord_parental, CVD Bong
 * Pasul 3 (placeholder): Echipe
 * Pasul 4 (placeholder): Sumar + taxe
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie,
  EchipaCompetitie, Sportiv, Grad, VizaSportiv, TipParticipare, StagiuCVDParticipare,
  Inlantuire,
} from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import { calculeazaVarstaLaData, verificaEligibilitate } from '../../utils/eligibilitateCompetitie';
import { exportFisaParticipare, exportBorderoClub, RandIndividualPDF, RandEchipaPDF } from '../../utils/exportPDFCompetitie';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from '../../utils/taxeCompetitie';

// -----------------------------------------------
// HELPERS INTERNI
// -----------------------------------------------

function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return vizeSportivi.some(
    v => v.sportiv_id === sportivId && v.an === an && v.status_viza === 'Activ'
  );
}

/**
 * Returnează un Set cu ID-urile sportivilor care au cel puțin o înscriere activă
 * (status != 'retras') la oricare categorie a competiției curente.
 */
function buildDejaInscrisiSet(inscrieri: InscriereCompetitie[]): Set<string> {
  const s = new Set<string>();
  for (const i of inscrieri) {
    if (i.status?.toLowerCase() !== 'retras') s.add(i.sportiv_id);
  }
  return s;
}

// -----------------------------------------------
// STEP INDICATOR (STEPPER)
// -----------------------------------------------

const STEP_LABELS = [
  'Selectare sportivi',
  'Categorii per sportiv',
  'Formare echipe',
  'Sumar + taxe',
];

const STEP_LABELS_SCURT = [
  'Sportivi',
  'Categorii',
  'Echipe',
  'Sumar',
];

/**
 * StepIndicator — afișează progresul wizardului pas cu pas.
 *
 * Desktop (md+): pași orizontali cu etichete text complete.
 * Mobil (< md): pași orizontali compacti cu etichete scurte, numerele mai mici.
 *
 * Stări vizuale:
 *  - completat (n < step): cerc verde cu bifa ✓
 *  - activ    (n === step): cerc albastru (brand-primary) cu ring exterior
 *  - următor  (n > step):  cerc gri slate-700
 */
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
              {/* Cercul + eticheta */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {/* Cerc */}
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

                {/* Eticheta desktop */}
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

              {/* Linie de conexiune (nu după ultimul pas) */}
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
                {/* Cerc mic */}
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

                {/* Eticheta scurta mobil */}
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

              {/* Linie de conexiune mobil */}
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

/** Alias backward-compat — componentele Pas1–Pas4 continuă să folosească WizardProgress */
const WizardProgress = StepIndicator;

// -----------------------------------------------
// BADGE ELIGIBILITATE GENERALĂ
// -----------------------------------------------
type EligibilitateGeneralaStatus = 'eligibil' | 'atentionare' | 'neeligibil' | 'date_incomplete';

interface EligibilitateGenerala {
  status: EligibilitateGeneralaStatus;
  motiv: string | null;
  avertismente: string[];
}

function calculeazaEligibilitateGenerala(
  s: Sportiv,
  dataCompetitie: string,
  anComp: number,
  vizeSportivi: VizaSportiv[],
  categorii?: CategorieCompetitie[],
  grade?: Grad[]
): EligibilitateGenerala {
  // Date incomplete — blocker hard
  if (!s.data_nasterii) {
    return { status: 'date_incomplete', motiv: 'Lipsă dată naștere', avertismente: [] };
  }
  if (!s.grad_actual_id) {
    return { status: 'date_incomplete', motiv: 'Lipsă grad', avertismente: [] };
  }

  // Verificare eligibilitate față de categoriile competiției (dacă sunt disponibile)
  if (categorii && categorii.length > 0 && grade) {
    const nrEligibile = categorii.filter(cat => {
      const r = verificaEligibilitate(s, cat, grade, dataCompetitie);
      return r.eligibil;
    }).length;

    if (nrEligibile === 0) {
      // Determinăm motivul principal (prima categorie — ce anume nu se încadrează)
      // Colectăm toate motivele unice din toate categoriile pentru a forma un mesaj concis
      const toateMotivelePrimaCategorie = verificaEligibilitate(s, categorii[0], grade, dataCompetitie).motive;
      // Verificăm ce fel de probleme există la nivel global
      const varsta = calculeazaVarstaLaData(s.data_nasterii, dataCompetitie);
      const gradSportiv = grade.find(g => g.id === s.grad_actual_id);

      // Construim un mesaj concis cu vârsta și gradul sportivului
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

  // Viză FRAM — blocker soft (afișat ca avertisment, nu blochează selecția)
  const areViza = areVizaFRAM(s.id, anComp, vizeSportivi);
  if (!areViza) {
    avertismente.push('Fără viză FRAM');
  }

  // Viză medicală — warning dacă lipsă sau mai veche de 6 luni față de data competiției
  // Câmpul data_viza_medicala nu există în tipul Sportiv, deci omitem pentru moment
  // (va fi adăugat când tabelul vizele_medicale va fi expus prin context)

  if (avertismente.length > 0) {
    return { status: 'atentionare', motiv: null, avertismente };
  }

  return { status: 'eligibil', motiv: null, avertismente: [] };
}

const BadgeEligibilitateGenerala: React.FC<{ info: EligibilitateGenerala }> = ({ info }) => {
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
            {sportiv.nume} {sportiv.prenume}
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
            {sportiv.nume} {sportiv.prenume}
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
interface Pas1Props {
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
  // Filtre avansate
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

  // Grade unice existente la sportivii activi (pentru filtrul de grade)
  const gradeDisponibile = useMemo(() => {
    const ids = new Set(sportiviActivi.map(s => s.grad_actual_id).filter(Boolean));
    return grade.filter(g => ids.has(g.id)).sort((a, b) => a.ordine - b.ordine);
  }, [sportiviActivi, grade]);

  // Vârsta maximă implicită per grad (= varsta_minima al gradului următor - 1)
  const gradMaxAgeMap = useMemo(() => {
    const sorted = [...grade].sort((a, b) => a.ordine - b.ordine);
    const m = new Map<string, number>();
    sorted.forEach((g, i) => {
      m.set(g.id, i + 1 < sorted.length ? sorted[i + 1].varsta_minima - 1 : 99);
    });
    return m;
  }, [grade]);

  // Grade valide pentru intervalul de vârstă ales (cascadă)
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

  // Deselectează automat gradele ieșite din cascadă când se schimbă filtrul de vârstă
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
      // Blocăm selecția pentru date incomplete SAU pentru sportivi complet neeligibili față de categorii
      const isDisabled = eligibilitate.status === 'date_incomplete' || eligibilitate.status === 'neeligibil';
      // Anomalie grad: sportivul este mai bătrân decât vârsta maximă implicită a gradului + 2 ani toleranță
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
          <p className="text-xs text-slate-400 mt-0.5">
            Pasul 1 din 4: {STEP_LABELS[0]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs text-slate-500">{selected.size} selectati</span>
        </div>
      </div>

      {/* Progress */}
      <WizardProgress step={1} total={4} />

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
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[36px] ${
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
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[36px] ${
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
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={filterVarstaMin}
                  onChange={e => setFilterVarstaMin(e.target.value)}
                  placeholder="Min"
                  min={0}
                  className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-primary"
                />
                <span className="text-slate-500 text-xs">—</span>
                <input
                  type="number"
                  value={filterVarstaMax}
                  onChange={e => setFilterVarstaMax(e.target.value)}
                  placeholder="Max"
                  min={0}
                  className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-primary"
                />
                <span className="text-xs text-slate-500">ani</span>
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

      {/* Select all — afișat doar dacă există sportivi selectabili */}
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
          {/* MOBIL: carduri (ascuns pe md+) */}
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

          {/* DESKTOP: tabel (ascuns sub md) */}
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

      {/* Footer fix pe mobil / inline pe desktop */}
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

// -----------------------------------------------
// TIPURI STARE — Pasul 2
// -----------------------------------------------

/** Datele suplimentare per (sportiv, categorie) alese în Pasul 2 */
export interface PickCategorie {
  inlantuire_id?: string;
  acord_parental?: boolean;
}

/**
 * indivPicks: Map<sportivId, Map<categorieId, PickCategorie>>
 * Reține selecțiile individuale (non-echipă) din Pasul 2.
 * echipaPicks: categorieId[] — categorii tip echipă bifate, pasate la Pasul 3.
 */
export type IndivPicks = Map<string, Map<string, PickCategorie>>;

export interface QuyenPick { q1: string; q2: string; }
export type QuyenAlesMap = Map<string, QuyenPick>;

// -----------------------------------------------
// TIP: inlantuiri_grade row agregat
// -----------------------------------------------
interface DreptGrad {
  grade_id: string;
  tip_proba: string;
  inlantuiri: Inlantuire[];
}

// -----------------------------------------------
// BADGE TIP PARTICIPARE
// -----------------------------------------------
const BADGE_TIP: Record<TipParticipare, { label: string; cls: string }> = {
  individual: { label: 'Individual', cls: 'text-sky-400 bg-sky-900/30 border-sky-700/50' },
  pereche:    { label: 'Pereche',    cls: 'text-purple-400 bg-purple-900/30 border-purple-700/50' },
  echipa:     { label: 'Echipa',     cls: 'text-orange-400 bg-orange-900/30 border-orange-700/50' },
};

const BadgeTipParticipare: React.FC<{ tip: TipParticipare }> = ({ tip }) => {
  const { label, cls } = BADGE_TIP[tip];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${cls}`}>
      {label}
    </span>
  );
};

// -----------------------------------------------
// HELPER: categorie de tip thao_quyen individual?
// -----------------------------------------------
function esteThaoQuyenIndividual(cat: CategorieCompetitie): boolean {
  return (
    cat.tip_participare === 'individual' &&
    (cat.proba?.tip_proba === 'thao_quyen_individual' ||
      cat.proba?.tip_proba === 'thao_lo_individual')
  );
}

// -----------------------------------------------
// HELPER: categorie de tip echipă sau pereche?
// -----------------------------------------------
function esteEchipaSauPereche(cat: CategorieCompetitie): boolean {
  return cat.tip_participare === 'echipa' || cat.tip_participare === 'pereche';
}

// -----------------------------------------------
// HELPER: grup probe pentru afișare
// -----------------------------------------------
function grupeazaDupaProba(
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

// -----------------------------------------------
// SUB-COMPONENTĂ: rând categorie eligibilă per sportiv
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

const RandCategorie: React.FC<RandCategorieProps> = ({
  cat, gradeId, isBifat, isDejaInscris, isDisabledBong,
  pickData, drepturi, onToggle, onUpdatePick,
}) => {
  const isDisabled = isDejaInscris || isDisabledBong;
  const arataQuyenDropdown = isBifat && !isDejaInscris && esteThaoQuyenIndividual(cat);

  // Programele permise pentru gradul curent
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

      {/* Dropdown inlantuire_id */}
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
// SUB-COMPONENTĂ: card sportiv cu categorii — Pasul 2
// -----------------------------------------------
interface CardSportivCategoriiProps {
  sportiv: Sportiv;
  varsta: number;
  gradNume: string | null;
  gradOrdine: number | null;
  gradeId: string | null;
  categoriiEligibile: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  picks: Map<string, PickCategorie>;
  drepturi: DreptGrad[];
  stagiiCVD?: StagiuCVDParticipare[];
  effectiveGen?: 'Masculin' | 'Feminin' | null;
  onSetGen?: (gen: 'Masculin' | 'Feminin') => void;
  onToggleCategorie: (catId: string) => void;
  onUpdatePick: (catId: string, update: Partial<PickCategorie>) => void;
  onToggleAcord: () => void;
}

const CardSportivCategorii: React.FC<CardSportivCategoriiProps> = ({
  sportiv, varsta, gradNume, gradOrdine, gradeId,
  categoriiEligibile, inscrieri, picks, drepturi, stagiiCVD,
  effectiveGen, onSetGen,
  onToggleCategorie, onUpdatePick, onToggleAcord,
}) => {
  const esteMajor = varsta >= 18;

  // ID-uri categorii unde sportivul e deja înscris (status != retras)
  const dejaInscrisiCatIds = useMemo(() => {
    const s = new Set<string>();
    for (const ins of inscrieri) {
      if (ins.sportiv_id === sportiv.id && ins.status?.toLowerCase() !== 'retras') {
        s.add(ins.categorie_id);
      }
    }
    return s;
  }, [inscrieri, sportiv.id]);

  // Restricție CVD: Bong exclude Long Gian/Song Cot/Moc Can (și invers), DOAR pentru grade (ordine ≤ 4)
  const esteGrad = gradOrdine !== null && gradOrdine <= 4;
  const ARMA_BONG = 'Bong';
  const ARMA_INCOMPATIBILA_BONG = 'Long Gian / Song Cot / Moc Can';

  const areBong = useMemo(() => {
    if (!esteGrad) return false;
    return categoriiEligibile.some(cat => picks.has(cat.id) && cat.arma === ARMA_BONG);
  }, [picks, categoriiEligibile, esteGrad]);

  const areArmaIncompatibilaBong = useMemo(() => {
    if (!esteGrad) return false;
    return categoriiEligibile.some(cat => picks.has(cat.id) && cat.arma === ARMA_INCOMPATIBILA_BONG);
  }, [picks, categoriiEligibile, esteGrad]);

  const grupeProbile = useMemo(
    () => grupeazaDupaProba(categoriiEligibile),
    [categoriiEligibile]
  );

  // acordul parental — extras din primul pick (nu e per-categorie, ci per-sportiv)
  const acordParental = picks.get('__acord__')?.acord_parental ?? false;

  const nuAreNicio = picks.size === 0 || [...picks.values()].every(p => p === null);
  const areVreoCategorieIndividuala = categoriiEligibile.some(c => !esteEchipaSauPereche(c));

  // CVD stagii warning: verificare per armă selectată
  // Arme selectate de sportiv (din categoriile bifate)
  const armeCVDSelectate = useMemo(() => {
    const arme = new Set<string>();
    for (const catId of picks.keys()) {
      if (catId === '__acord__') continue;
      const cat = categoriiEligibile.find(c => c.id === catId);
      if (cat?.arma) arme.add(cat.arma);
    }
    return arme;
  }, [picks, categoriiEligibile]);

  // Mapare: arma categorie → arme individuale din stagii_cvd_participare
  const armeStaguriPerArmaCategorie = useMemo(() => {
    if (!stagiiCVD) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const participare of stagiiCVD) {
      // arma din stagii e individuală (ex: 'Bong', 'Long Gian')
      // arma din categorie poate fi combinată (ex: 'Long Gian / Song Cot / Moc Can')
      for (const armaCateg of armeCVDSelectate) {
        if (armaCateg.includes(participare.arma)) {
          counts.set(armaCateg, (counts.get(armaCateg) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [stagiiCVD, armeCVDSelectate]);

  const minStagiiCVD = (gradOrdine !== null && gradOrdine <= 4) ? 1 : 3;

  // Warning dacă oricare armă selectată are stagii insuficiente
  const armeCuStagiiInsuficiente = useMemo(() => {
    if (!stagiiCVD || armeCVDSelectate.size === 0) return [];
    return [...armeCVDSelectate].filter(arma => {
      const count = armeStaguriPerArmaCategorie.get(arma) ?? 0;
      return count < minStagiiCVD;
    });
  }, [stagiiCVD, armeCVDSelectate, armeStaguriPerArmaCategorie, minStagiiCVD]);

  const stagiiWarning = armeCuStagiiInsuficiente.length > 0;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
      {/* Header card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">
              {sportiv.nume} {sportiv.prenume}
            </span>
            {!esteMajor && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-2 py-0.5">
                Minor
              </span>
            )}
            {stagiiWarning && (
              <span
                className="text-[10px] font-bold text-yellow-300 bg-yellow-900/30 border border-yellow-700/50 rounded-full px-2 py-0.5"
                title={`Stagii CVD insuficiente (min ${minStagiiCVD}): ${armeCuStagiiInsuficiente.join(', ')}`}
              >
                ⚠ Stagii CVD
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span>{varsta} ani</span>
            {gradNume && <><span className="text-slate-600">·</span><span>{gradNume}</span></>}
          </div>
        </div>
        <div className="text-xs text-slate-500 shrink-0">
          {picks.size > 0
            ? `${picks.size} categor${picks.size === 1 ? 'ie' : 'ii'}`
            : 'Nicio categorie'}
        </div>
      </div>

      {/* Gen picker — afișat dacă sportivul nu are gen setat */}
      {effectiveGen === null && onSetGen && (
        <div className="px-4 py-2.5 border-b border-orange-700/40 bg-orange-900/10">
          <p className="text-xs text-orange-300 mb-2 font-medium">
            Gen nespecificat — alege genul pentru a filtra categoriile corect:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onSetGen('Masculin')}
              className="flex-1 py-1.5 rounded-lg border border-blue-600/60 bg-blue-900/30 text-xs font-semibold text-blue-300 hover:bg-blue-900/60 transition-colors"
            >
              Masculin
            </button>
            <button
              onClick={() => onSetGen('Feminin')}
              className="flex-1 py-1.5 rounded-lg border border-pink-600/60 bg-pink-900/30 text-xs font-semibold text-pink-300 hover:bg-pink-900/60 transition-colors"
            >
              Feminin
            </button>
          </div>
        </div>
      )}

      {/* Corp: categorii grupate pe probă */}
      <div className="divide-y divide-slate-700/50">
        {categoriiEligibile.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500 italic">
            Nicio categorie eligibila gasita.
          </div>
        ) : (
          grupeProbile.map(grup => (
            <div key={grup.proba?.id ?? '__fara_proba__'} className="py-2">
              {/* Titlu probă */}
              <div className="px-3 pb-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {grup.probaDenumire}
                </span>
              </div>
              {/* Categorii în probă */}
              {grup.categorii.map(cat => {
                const isBifat = picks.has(cat.id);
                const isDejaInscris = dejaInscrisiCatIds.has(cat.id);
                // CVD grade: Bong ↔ Long Gian/Song Cot/Moc Can sunt mutual exclusive
                const isDisabledBong = (areBong && cat.arma === ARMA_INCOMPATIBILA_BONG) ||
                  (areArmaIncompatibilaBong && cat.arma === ARMA_BONG);

                return (
                  <RandCategorie
                    key={cat.id}
                    cat={cat}
                    sportivId={sportiv.id}
                    gradeId={gradeId}
                    isBifat={isBifat}
                    isDejaInscris={isDejaInscris}
                    isDisabledBong={isDisabledBong}
                    pickData={picks.get(cat.id) ?? {}}
                    drepturi={drepturi}
                    onToggle={() => onToggleCategorie(cat.id)}
                    onUpdatePick={update => onUpdatePick(cat.id, update)}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Acord parental — doar minori */}
      {!esteMajor && areVreoCategorieIndividuala && (
        <div className="px-4 py-3 border-t border-amber-700/40 bg-amber-900/10">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acordParental}
              onChange={onToggleAcord}
              className="mt-0.5 w-5 h-5 min-w-[20px] rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-amber-300 leading-relaxed">
              Confirm ca am acordul scris al parintelui / tutorelui legal pentru participarea la aceasta competitie.
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// VEDERE PER CATEGORIE — bulk assignment Pasul 2
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

const VederePerCategorie: React.FC<VederePerCategorieProps> = ({
  sportiviSelectati, eligibilePerSportiv, inscrieri, indivPicks, categorii,
  probe, probeSkipped, onToggleCategorie, onToggleProbaSkipped,
}) => {
  // Construim un map: categorieId → sportivi eligibili pentru ea (din cei selectați)
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
    // Sortăm după ordine_afisare
    return Array.from(map.values()).sort((a, b) =>
      (a.categorie.ordine_afisare ?? 0) - (b.categorie.ordine_afisare ?? 0)
    );
  }, [sportiviSelectati, eligibilePerSportiv]);

  // Grupare pe proba_id pentru butonul "Nu avem concurenți"
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
            {/* Header categorie */}
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

            {/* Lista sportivi eligibili pentru această categorie */}
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
                      <span className="text-sm text-white">{sportiv.nume} {sportiv.prenume}</span>
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

// -----------------------------------------------
// SL_PROG — program Song Luyen după grad minim
// -----------------------------------------------
function getSLProg(gradMin: number): string {
  if (gradMin <= 1) return 'Song Doi Mot';
  if (gradMin === 2) return 'Dang Mon Song Luyen';
  if (gradMin <= 4) return 'QK 1 contra QK 3';
  return 'QK 2 contra QK 4';
}

// -----------------------------------------------
// PASUL 2 — Selecție înlănțuiri (NOU)
// -----------------------------------------------
interface Pas2QuyenProps {
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

  const sportiviLipsaQ1 = sportiviDate.filter(d => !quyenAles.get(d.sportiv.id)?.q1);
  const sportiviLipsaQ2 = sportiviDate.filter(d =>
    d.autoCat.doua_quyenuri && quyenAles.get(d.sportiv.id)?.q1 && !quyenAles.get(d.sportiv.id)?.q2
  );

  if (sportiviDate.length === 0 && !loadingDrepturi) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">Inscriere sportivi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pasul 2 din 4: {STEP_LABELS[1]}</p>
          </div>
        </div>
        <WizardProgress step={2} total={4} />
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
          <p className="text-xs text-slate-400 mt-0.5">Pasul 2 din 4: {STEP_LABELS[1]}</p>
        </div>
        <div className="text-right shrink-0 text-xs text-slate-500">
          {nrComplet}/{sportiviDate.length} complet
        </div>
      </div>

      <WizardProgress step={2} total={4} />

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

          {/* Bulk Q1 */}
          <button
            onClick={handleBulkQ1}
            className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            ↓ Prima opțiune Q1 pentru toți vizibili
          </button>

          {/* Tabel înlănțuiri */}
          <div className="overflow-x-auto rounded-lg border border-slate-700" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                          {sportiv.nume} {sportiv.prenume}
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
                          {sportiv.nume} {sportiv.prenume}
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
          <span className="text-sm text-slate-400">
            {nrComplet}/{sportiviDate.length} sportivi cu înlănțuire completă
          </span>
          <Button
            variant="success"
            disabled={loadingDrepturi}
            onClick={onContinua}
            className="min-w-[140px]"
          >
            Continuă
          </Button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------
// PASUL 2 — Categorii per sportiv (VECHI — păstrat pentru compatibilitate)
// -----------------------------------------------
interface Pas2Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  selectedSportivi: Set<string>;
  genOverrides: Record<string, 'Masculin' | 'Feminin'>;
  onSetGen: (id: string, gen: 'Masculin' | 'Feminin') => void;
  indivPicks: IndivPicks;
  onUpdateIndivPicks: (next: IndivPicks) => void;
  onContinua: (echipaPicks: string[], probeSkipped: Set<string>) => void;
  onBack: () => void;
}

const Pas2CategoriiPerSportiv: React.FC<Pas2Props> = ({
  competitie, sportivi, grade, categorii, probe, inscrieri,
  selectedSportivi, genOverrides, onSetGen, indivPicks, onUpdateIndivPicks, onContinua, onBack,
}) => {
  const { showError } = useError();
  const [drepturi, setDrepturi] = useState<DreptGrad[]>([]);
  const [loadingDrepturi, setLoadingDrepturi] = useState(true);
  // stagiiCVD: sportivId → lista participări naționale CVD (cu arma)
  const [stagiiCVD, setStagiiCVD] = useState<Map<string, StagiuCVDParticipare[]>>(new Map());

  // Fetch stagii_cvd_participare pentru sportivii selectați (warning non-blocant)
  useEffect(() => {
    if (competitie.tip !== 'cvd') return;
    let cancelled = false;
    const sportiviIds = Array.from(selectedSportivi);
    if (!sportiviIds.length) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('stagii_cvd_participare')
          .select('*')
          .in('sportiv_id', sportiviIds)
          .eq('nivel', 'national');
        if (cancelled) return;
        const m = new Map<string, StagiuCVDParticipare[]>();
        for (const row of (data ?? []) as StagiuCVDParticipare[]) {
          const list = m.get(row.sportiv_id) ?? [];
          list.push(row);
          m.set(row.sportiv_id, list);
        }
        setStagiiCVD(m);
      } catch {
        // warning non-critic — ignorăm eroarea silențios
      }
    })();
    return () => { cancelled = true; };
  }, [competitie.tip, selectedSportivi]);

  // Fetch inlantuiri_grade o singură dată la mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('inlantuiri_grade')
          .select('grade_id, tip_proba, inlantuiri!inlantuire_id(id, denumire, ordine, activ)');
        if (error) throw error;
        if (!cancelled) {
          const dreptMap = new Map<string, DreptGrad>();
          for (const row of (data ?? []) as unknown as { grade_id: string; tip_proba: string; inlantuiri: Inlantuire | null }[]) {
            if (!row.inlantuiri) continue;
            const key = `${row.grade_id}::${row.tip_proba}`;
            if (!dreptMap.has(key)) dreptMap.set(key, { grade_id: row.grade_id, tip_proba: row.tip_proba, inlantuiri: [] });
            dreptMap.get(key)!.inlantuiri.push(row.inlantuiri);
          }
          setDrepturi(Array.from(dreptMap.values()));
        }
      } catch (err) {
        showError('Incarcare inlantuiri grad competitie', err);
      } finally {
        if (!cancelled) setLoadingDrepturi(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  // Sportivii selectați în Pasul 1, cu datele enriched
  const sportiviSelectati = useMemo(() =>
    sportivi
      .filter(s => selectedSportivi.has(s.id))
      .map(s => {
        const varsta = s.data_nasterii
          ? calculeazaVarstaLaData(s.data_nasterii, competitie.data_inceput)
          : 0;
        const grad = grade.find(g => g.id === s.grad_actual_id) ?? null;
        return { sportiv: s, varsta, grad, gradNume: grad?.nume ?? null, gradOrdine: grad?.ordine ?? null, gradeId: grad?.id ?? null };
      }),
    [sportivi, selectedSportivi, grade, competitie.data_inceput]
  );

  // Categoriile eligibile per sportiv (cu gen overrides aplicate)
  const eligibilePerSportiv = useMemo(() => {
    const result = new Map<string, CategorieCompetitie[]>();
    for (const { sportiv } of sportiviSelectati) {
      const effectiveGen = genOverrides[sportiv.id] ?? sportiv.gen;
      const sportivEff = effectiveGen !== undefined ? { ...sportiv, gen: effectiveGen } : sportiv;
      const eligibile = categorii
        .filter(cat => {
          const r = verificaEligibilitate(sportivEff, cat, grade, competitie.data_inceput);
          return r.eligibil;
        })
        .sort((a, b) => a.ordine_afisare - b.ordine_afisare);
      result.set(sportiv.id, eligibile);
    }
    return result;
  }, [sportiviSelectati, categorii, grade, competitie.data_inceput, genOverrides]);

  // Pre-bifare automată: o singură categorie eligibilă per tip de probă → se bifează automat
  // Rulăm o singură dată când eligibilePerSportiv e gata
  useEffect(() => {
    if (loadingDrepturi) return;
    const nextPicks: IndivPicks = new Map(indivPicks);
    let changed = false;

    for (const { sportiv } of sportiviSelectati) {
      const eligibile = eligibilePerSportiv.get(sportiv.id) ?? [];
      if (eligibile.length === 0) continue;

      // Grupăm pe proba_id
      const perProba = new Map<string | null, CategorieCompetitie[]>();
      for (const cat of eligibile) {
        const key = cat.proba_id;
        if (!perProba.has(key)) perProba.set(key, []);
        perProba.get(key)!.push(cat);
      }

      const sportivPicks = nextPicks.get(sportiv.id) ?? new Map<string, PickCategorie>();

      for (const [, cats] of perProba) {
        // Dacă exact 1 categorie în această probă și nu e deja bifată → pre-bifează
        if (cats.length === 1) {
          const cat = cats[0];
          if (!sportivPicks.has(cat.id)) {
            // Nu pre-bifăm echipă/pereche automat (vor fi tratate în Pasul 3)
            if (!esteEchipaSauPereche(cat)) {
              sportivPicks.set(cat.id, {});
              changed = true;
            }
          }
        }
      }

      if (sportivPicks.size > 0) {
        nextPicks.set(sportiv.id, sportivPicks);
      }
    }

    if (changed) {
      onUpdateIndivPicks(nextPicks);
    }
    // Intenționat: rulăm o singură dată după ce drepturi s-au încărcat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDrepturi]);

  // Toggle categorie individuală
  const handleToggleCategorie = useCallback((sportivId: string, catId: string) => {
    const nextPicks: IndivPicks = new Map(indivPicks);
    const sportivPicks = new Map(nextPicks.get(sportivId) ?? new Map<string, PickCategorie>());

    if (sportivPicks.has(catId)) {
      sportivPicks.delete(catId);
    } else {
      sportivPicks.set(catId, {});
    }
    nextPicks.set(sportivId, sportivPicks);
    onUpdateIndivPicks(nextPicks);
  }, [indivPicks, onUpdateIndivPicks]);

  // Update date suplimentare (inlantuire_id, acord_parental)
  const handleUpdatePick = useCallback((sportivId: string, catId: string, update: Partial<PickCategorie>) => {
    const nextPicks: IndivPicks = new Map(indivPicks);
    const sportivPicks = new Map(nextPicks.get(sportivId) ?? new Map<string, PickCategorie>());
    const existing = sportivPicks.get(catId) ?? {};
    sportivPicks.set(catId, { ...existing, ...update });
    nextPicks.set(sportivId, sportivPicks);
    onUpdateIndivPicks(nextPicks);
  }, [indivPicks, onUpdateIndivPicks]);

  // Toggle acord parental (stocat cu cheia specială '__acord__')
  const handleToggleAcord = useCallback((sportivId: string) => {
    const nextPicks: IndivPicks = new Map(indivPicks);
    const sportivPicks = new Map(nextPicks.get(sportivId) ?? new Map<string, PickCategorie>());
    const existing = sportivPicks.get('__acord__') ?? {};
    sportivPicks.set('__acord__', { ...existing, acord_parental: !existing.acord_parental });
    nextPicks.set(sportivId, sportivPicks);
    onUpdateIndivPicks(nextPicks);
  }, [indivPicks, onUpdateIndivPicks]);

  // Validare pentru "Continuă →"
  const eroriValidare = useMemo<string[]>(() => {
    const erori: string[] = [];
    for (const { sportiv, varsta } of sportiviSelectati) {
      const eligibile = eligibilePerSportiv.get(sportiv.id) ?? [];
      const sportivPicks = indivPicks.get(sportiv.id) ?? new Map<string, PickCategorie>();

      // Filtrăm cheile reale de categorii (excludem __acord__)
      const catBifate = [...sportivPicks.keys()].filter(k => k !== '__acord__');
      // Doar categoriile individuale contează pentru validarea „cel puțin una"
      const catIndivBifate = catBifate.filter(catId => {
        const cat = categorii.find(c => c.id === catId);
        return cat && !esteEchipaSauPereche(cat);
      });

      // NB: sportiv fără nicio categorie individuală NU mai blochează continuarea — devine warning (sportivifaraCategorie)

      // inlantuire_id obligatoriu dacă există drepturi pentru gradul sportivului
      for (const catId of catIndivBifate) {
        const cat = categorii.find(c => c.id === catId);
        if (!cat || !esteThaoQuyenIndividual(cat)) continue;
        const tipProba = cat.proba?.tip_proba;
        if (!tipProba) continue;
        const drept = drepturi.find(d => d.grade_id === sportiv.grad_actual_id && d.tip_proba === tipProba);
        if (drept && drept.inlantuiri.length > 0) {
          const pick = sportivPicks.get(catId);
          if (!pick?.inlantuire_id) {
            erori.push(`${sportiv.nume} ${sportiv.prenume}: alege inlantuirea pentru ${cat.denumire ?? 'Thao Quyen'}`);
          }
        }
      }

      // Acord parental pentru minori
      if (varsta < 18 && catIndivBifate.length > 0) {
        const acord = sportivPicks.get('__acord__');
        if (!acord?.acord_parental) {
          erori.push(`${sportiv.nume} ${sportiv.prenume}: acord parental obligatoriu`);
        }
      }
    }
    return erori;
  }, [sportiviSelectati, eligibilePerSportiv, indivPicks, categorii, grade, drepturi]);

  // Warning: sportivi fără nicio categorie individuală selectată (nu blochează continuarea)
  const sportivifaraCategorie = useMemo<string[]>(() => {
    const lista: string[] = [];
    for (const { sportiv } of sportiviSelectati) {
      const eligibile = eligibilePerSportiv.get(sportiv.id) ?? [];
      const sportivPicks = indivPicks.get(sportiv.id) ?? new Map<string, PickCategorie>();
      const catBifate = [...sportivPicks.keys()].filter(k => k !== '__acord__');
      const catIndivBifate = catBifate.filter(catId => {
        const cat = categorii.find(c => c.id === catId);
        return cat && !esteEchipaSauPereche(cat);
      });
      if (catIndivBifate.length === 0 && eligibile.some(c => !esteEchipaSauPereche(c))) {
        lista.push(`${sportiv.nume} ${sportiv.prenume}`);
      }
    }
    return lista;
  }, [sportiviSelectati, eligibilePerSportiv, indivPicks, categorii]);

  // Categoriile de tip echipă bifate de orice sportiv → Pasul 3
  const echipaPicks = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const [, sportivPicks] of indivPicks) {
      for (const catId of sportivPicks.keys()) {
        if (catId === '__acord__') continue;
        const cat = categorii.find(c => c.id === catId);
        if (cat && esteEchipaSauPereche(cat)) set.add(catId);
      }
    }
    return Array.from(set);
  }, [indivPicks, categorii]);

  const poateContinua = eroriValidare.length === 0;

  // Vedere: per_sportiv (default) sau per_categorie (bulk assignment)
  const [vedere, setVedere] = useState<'per_sportiv' | 'per_categorie'>('per_sportiv');
  // Task 6: probe sărite (nu avem concurenți)
  const [probeSkipped, setProbeSkipped] = useState<Set<string>>(new Set());
  const handleToggleProbaSkipped = useCallback((probaId: string) => {
    setProbeSkipped(prev => {
      const next = new Set(prev);
      if (next.has(probaId)) next.delete(probaId); else next.add(probaId);
      return next;
    });
  }, []);

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
          <p className="text-xs text-slate-400 mt-0.5">
            Pasul 2 din 4: {STEP_LABELS[1]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs text-slate-500">{sportiviSelectati.length} sportivi</span>
        </div>
      </div>

      {/* Progress */}
      <WizardProgress step={2} total={4} />

      {/* Toggle vedere */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/60 rounded-lg border border-slate-700 w-fit">
        <button
          onClick={() => setVedere('per_sportiv')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${vedere === 'per_sportiv' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Per sportiv
        </button>
        <button
          onClick={() => setVedere('per_categorie')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${vedere === 'per_categorie' ? 'bg-brand-primary text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Per categorie (bulk)
        </button>
      </div>

      {/* Loading state drepturi */}
      {loadingDrepturi && (
        <div className="text-center text-xs text-slate-500 py-4 animate-pulse">
          Se incarca drepturile de grad...
        </div>
      )}

      {/* Carduri sportivi — grid responsiv */}
      {!loadingDrepturi && vedere === 'per_sportiv' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sportiviSelectati.map(({ sportiv, varsta, gradNume, gradOrdine, gradeId }) => {
            const eligibile = eligibilePerSportiv.get(sportiv.id) ?? [];
            const sportivPicks = indivPicks.get(sportiv.id) ?? new Map<string, PickCategorie>();
            const effectiveGen = genOverrides[sportiv.id] ?? sportiv.gen;

            return (
              <CardSportivCategorii
                key={sportiv.id}
                sportiv={sportiv}
                varsta={varsta}
                gradNume={gradNume}
                gradOrdine={gradOrdine}
                gradeId={gradeId}
                categoriiEligibile={eligibile}
                inscrieri={inscrieri}
                picks={sportivPicks}
                drepturi={drepturi}
                stagiiCVD={competitie.tip === 'cvd' ? (stagiiCVD.get(sportiv.id) ?? []) : undefined}
                effectiveGen={effectiveGen ?? null}
                onSetGen={gen => onSetGen(sportiv.id, gen)}
                onToggleCategorie={catId => handleToggleCategorie(sportiv.id, catId)}
                onUpdatePick={(catId, update) => handleUpdatePick(sportiv.id, catId, update)}
                onToggleAcord={() => handleToggleAcord(sportiv.id)}
              />
            );
          })}
        </div>
      )}

      {/* Vedere per categorie — bulk assignment */}
      {!loadingDrepturi && vedere === 'per_categorie' && (
        <VederePerCategorie
          sportiviSelectati={sportiviSelectati}
          eligibilePerSportiv={eligibilePerSportiv}
          inscrieri={inscrieri}
          indivPicks={indivPicks}
          categorii={categorii}
          probe={probe}
          probeSkipped={probeSkipped}
          onToggleCategorie={handleToggleCategorie}
          onToggleProbaSkipped={handleToggleProbaSkipped}
        />
      )}

      {/* Erori validare — afișate compact deasupra footer-ului */}
      {!poateContinua && eroriValidare.length > 0 && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 space-y-1">
          {eroriValidare.map((err, i) => (
            <p key={i} className="text-xs text-red-400">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Warning: sportivi fără categorii individuale — nu blochează continuarea */}
      {sportivifaraCategorie.length > 0 && (
        <div className="rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 space-y-1">
          <p className="text-xs text-yellow-400 font-semibold">
            ⚠ {sportivifaraCategorie.length} sportiv{sportivifaraCategorie.length !== 1 ? 'i' : ''} fără categorii selectate — vor fi incluși în competiție fără probe individuale:
          </p>
          <p className="text-xs text-yellow-400/80">{sportivifaraCategorie.join(', ')}</p>
        </div>
      )}

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {echipaPicks.length > 0 && (
              <span className="text-orange-400">
                {echipaPicks.length} categor{echipaPicks.length === 1 ? 'ie' : 'ii'} echipa → Pasul 3
              </span>
            )}
          </div>
          <Button
            variant="success"
            disabled={!poateContinua || loadingDrepturi}
            onClick={() => onContinua(echipaPicks, probeSkipped)}
            className="min-w-[140px]"
          >
            Continua
          </Button>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------
// TIP: EchipaFormata — starea produsă de Pasul 3
// -----------------------------------------------

/** O echipă formată pentru o categorie de tip echipă/pereche. */
export interface EchipaFormata {
  categorieId: string;
  dbId?: string; // id din echipe_competitie — UPDATE dacă există
  numeEchipa: string;
  titulari: string[];  // sportivId[]
  rezerve: string[];   // sportivId[]
  program?: string;    // program ales (SL/Sincron)
  echipaIncompleta?: boolean; // solicitare partener inter-club
  echipaSkip?: boolean; // nu participam la aceasta proba
}

// -----------------------------------------------
// HELPER: descriere tip participare pentru header
// -----------------------------------------------
function descrieTipEchipa(cat: CategorieCompetitie): string {
  if (cat.tip_participare === 'pereche') {
    return 'Pereche 2 sportivi';
  }
  const titMax = cat.sportivi_per_echipa_max;
  const rezMax = cat.rezerve_max;
  return `Echipa ${titMax} titular${titMax !== 1 ? 'i' : ''} + ${rezMax} rezerv${rezMax !== 1 ? 'e' : 'a'}`;
}

// -----------------------------------------------
// SUB-COMPONENTĂ: contor vizual titulari/rezerve
// -----------------------------------------------
interface ContorEchipaProps {
  titulariCurenti: number;
  titulariMin: number;
  titulariMax: number;
  rezerveCurente: number;
  rezerveMax: number;
  isPereche: boolean;
}

const ContorEchipa: React.FC<ContorEchipaProps> = ({
  titulariCurenti, titulariMin, titulariMax,
  rezerveCurente, rezerveMax, isPereche,
}) => {
  const titulariComplet = isPereche
    ? titulariCurenti === 2
    : titulariCurenti >= titulariMin && titulariCurenti <= titulariMax;
  const clsTitulari = titulariComplet ? 'text-green-400' : titulariCurenti < titulariMin ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="flex items-center gap-3 text-xs font-semibold">
      <span className={clsTitulari}>
        Titulari: {titulariCurenti}/{isPereche ? 2 : titulariMax}
      </span>
      {!isPereche && rezerveMax > 0 && (
        <>
          <span className="text-slate-600">·</span>
          <span className={rezerveCurente <= rezerveMax ? 'text-slate-300' : 'text-red-400'}>
            Rezerve: {rezerveCurente}/{rezerveMax}
          </span>
        </>
      )}
    </div>
  );
};

// -----------------------------------------------
// TIP ROL SPORTIV ÎN ECHIPĂ
// -----------------------------------------------
type RolEchipa = 'titular' | 'rezerva' | 'nu_participa';

// -----------------------------------------------
// SUB-COMPONENTĂ: secțiune per categorie echipă
// -----------------------------------------------
interface SectiuneEchipaCategorieProps {
  cat: CategorieCompetitie;
  sportiviDisponibili: Sportiv[];
  grade: Grad[];
  dreptUri: Map<string, Inlantuire[]>;
  numeClub: string;
  echipa: EchipaFormata;
  onUpdateEchipa: (update: Partial<EchipaFormata>) => void;
  erroare: string | null;
  dbId?: string;
  dataCompetitie: string;
  onOpenEditEchipa?: (categorieId: string) => void;
  eligibilitateMapCategorie?: Map<string, { eligibil: boolean; motive: string[] }>;
}

function canAddToTitulari(cat: CategorieCompetitie, athGen: string | undefined | null, titulari: string[], sportiviPool: Sportiv[]): boolean {
  if (cat.gen !== 'Mixt') return true;
  const nF = titulari.filter(id => sportiviPool.find(s => s.id === id)?.gen === 'Feminin').length;
  const nM = titulari.filter(id => sportiviPool.find(s => s.id === id)?.gen === 'Masculin').length;
  const remaining = cat.sportivi_per_echipa_max - titulari.length;
  if (remaining <= 0) return false;
  if (athGen === 'Masculin') return (remaining - 1) >= Math.max(0, 1 - nF);
  return (remaining - 1) >= Math.max(0, 1 - nM);
}

const SectiuneEchipaCategorie: React.FC<SectiuneEchipaCategorieProps> = ({
  cat, sportiviDisponibili, grade, dreptUri, numeClub, echipa, onUpdateEchipa, erroare, dbId,
  onOpenEditEchipa, dataCompetitie, eligibilitateMapCategorie,
}) => {
  const isPereche = cat.tip_participare === 'pereche';
  const titulariMax = isPereche ? 2 : cat.sportivi_per_echipa_max;
  const titulariMin = isPereche ? 2 : cat.sportivi_per_echipa_min;
  const rezerveMax = isPereche ? 0 : cat.rezerve_max;

  // Sportivul unic → banner amber
  const areUnSingurSportiv = sportiviDisponibili.length === 1;

  const getRolSportiv = (sportivId: string): RolEchipa => {
    if (echipa.titulari.includes(sportivId)) return 'titular';
    if (echipa.rezerve.includes(sportivId)) return 'rezerva';
    return 'nu_participa';
  };

  const handleRolChange = (sportivId: string, rol: RolEchipa) => {
    const titulariNoi = echipa.titulari.filter(id => id !== sportivId);
    const rezerveNoi = echipa.rezerve.filter(id => id !== sportivId);

    if (rol === 'titular') {
      if (titulariNoi.length < titulariMax) {
        titulariNoi.push(sportivId);
      }
    } else if (rol === 'rezerva' && !isPereche) {
      if (rezerveNoi.length < rezerveMax) {
        rezerveNoi.push(sportivId);
      }
    }

    onUpdateEchipa({ titulari: titulariNoi, rezerve: rezerveNoi });
  };

  // Gender locking pentru Mixt
  const isMixt = cat.gen === 'Mixt';
  const nF = echipa.titulari.filter(id => sportiviDisponibili.find(s => s.id === id)?.gen === 'Feminin').length;
  const nM = echipa.titulari.filter(id => sportiviDisponibili.find(s => s.id === id)?.gen === 'Masculin').length;
  const masculinBlocat = isMixt && !canAddToTitulari(cat, 'Masculin', echipa.titulari, sportiviDisponibili);
  const femininBlocat = isMixt && !canAddToTitulari(cat, 'Feminin', echipa.titulari, sportiviDisponibili);

  // Program SL / Sincron — apare doar după ce titularii sunt completați
  const echipaCompleta = echipa.titulari.length >= titulariMin && echipa.titulari.length <= titulariMax;
  const gradMinGrade: Grad | null = echipaCompleta && echipa.titulari.length > 0
    ? (() => {
        const gs = echipa.titulari
          .map(id => {
            const s = sportiviDisponibili.find(sp => sp.id === id);
            return grade.find(gr => gr.id === s?.grad_actual_id) ?? null;
          })
          .filter((g): g is Grad => g !== null);
        if (!gs.length) return null;
        return gs.reduce((min, g) => g.ordine < min.ordine ? g : min);
      })()
    : null;
  const isSincron = !isPereche && titulariMax === 3;
  const programOptions: Inlantuire[] = gradMinGrade !== null
    ? isSincron
      ? (dreptUri.get(gradMinGrade.id) ?? [])
      : []
    : [];
  // Song Luyen pereche: program auto-selectat după grad minim
  const slProgAuto: string | null = isPereche && gradMinGrade !== null ? getSLProg(gradMinGrade.ordine) : null;
  const areSelectieProgram = programOptions.length > 0 || slProgAuto !== null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
      {/* Header categorie */}
      <div className="px-4 py-3 bg-slate-800/70 border-b border-slate-700 space-y-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white leading-tight">
                {cat.denumire ?? `Categoria ${cat.numar_categorie}`}
              </span>
              <BadgeTipParticipare tip={cat.tip_participare} />
              {dbId && (
                <span className="text-[10px] font-bold text-sky-400 bg-sky-900/30 border border-sky-700/50 rounded-full px-2 py-0.5 shrink-0">
                  Editare
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {descrieTipEchipa(cat)} {isMixt && `· Mixt (${nM}M+${nF}F)`}
            </div>
          </div>
        </div>
        <ContorEchipa
          titulariCurenti={echipa.titulari.length}
          titulariMin={titulariMin}
          titulariMax={titulariMax}
          rezerveCurente={echipa.rezerve.length}
          rezerveMax={rezerveMax}
          isPereche={isPereche}
        />
      </div>

      {/* Toggle "Nu participam" — buton mare, touch-friendly */}
      <div className="px-4 py-2.5 border-b border-slate-700/40">
        <button
          type="button"
          onClick={() => onUpdateEchipa({ echipaSkip: !(echipa.echipaSkip ?? false), titulari: [], rezerve: [] })}
          style={{ touchAction: 'manipulation' }}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
            echipa.echipaSkip
              ? 'bg-slate-700 border-brand-primary text-brand-primary'
              : 'bg-slate-800/60 border-slate-600 text-slate-400 active:border-yellow-600 active:text-yellow-400'
          }`}
        >
          {echipa.echipaSkip ? '✓ Nu participăm — apasă pentru a reactiva' : 'Nu participăm la această probă'}
        </button>
      </div>

      {!echipa.echipaSkip && (
      <>
      {/* Banner gender locking Mixt */}
      {isMixt && (masculinBlocat || femininBlocat) && (
        <div className="mx-4 mt-3 rounded-lg border border-yellow-600/50 bg-yellow-900/20 px-3 py-2">
          <p className="text-xs text-yellow-300">
            {masculinBlocat ? '⚠ Trebuie cel puțin o fată înainte de a mai adăuga băieți' : '⚠ Trebuie cel puțin un băiat înainte de a mai adăuga fete'}
          </p>
        </div>
      )}

      {/* Banner sportiv unic → inter-club */}
      {areUnSingurSportiv && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-600/50 bg-amber-900/20 px-3 py-2.5">
          <p className="text-xs text-amber-300 leading-relaxed mb-2">
            Echipa incompleta — Poti solicita partener de la alt club.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={echipa.echipaIncompleta ?? false}
              onChange={e => onUpdateEchipa({ echipaIncompleta: e.target.checked })}
              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-amber-400 font-medium">
              Solicit partener inter-club
            </span>
          </label>
        </div>
      )}

      {/* Lista sportivi disponibili */}
      {sportiviDisponibili.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-slate-500 italic">
          Niciun sportiv eligibil pentru aceasta categorie.
        </div>
      ) : (
        <div className="divide-y divide-slate-700/50">
          {sportiviDisponibili.map(sportiv => {
            const rolCurent = getRolSportiv(sportiv.id);
            const titulariFull = echipa.titulari.length >= titulariMax && rolCurent !== 'titular';
            const genderBlocat = rolCurent !== 'titular' && !canAddToTitulari(cat, sportiv.gen, echipa.titulari, sportiviDisponibili);
            const eligibilitate = eligibilitateMapCategorie?.get(sportiv.id)
              ?? verificaEligibilitate(sportiv, cat, grade, dataCompetitie);
            const ineligibil = !eligibilitate.eligibil;
            // Titular blocat dacă: capacitate depășită, gen blocat, sau ineligibil (vârstă/grad)
            const titulariBlocati = titulariFull || genderBlocat || (ineligibil && rolCurent !== 'titular');
            const rezerveBlocate = (echipa.rezerve.length >= rezerveMax && rolCurent !== 'rezerva') || (ineligibil && rolCurent !== 'rezerva');
            // Sportiv deja titular dar ineligibil (edge case: categoria s-a schimbat)
            const titularIneligibil = rolCurent === 'titular' && ineligibil;
            const rezervaIneligibil = rolCurent === 'rezerva' && ineligibil;

            return (
              <div key={sportiv.id} className="px-4 py-3 space-y-2">
                {/* Nume sportiv + badge ineligibil */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{sportiv.prenume} {sportiv.nume}</span>
                  {ineligibil && (
                    <span
                      className="text-[10px] font-semibold text-orange-400 bg-orange-900/30 border border-orange-700/50 rounded-full px-2 py-0.5"
                      title={eligibilitate.motive.join(' · ')}
                    >
                      ⚠ Ineligibil
                    </span>
                  )}
                  {genderBlocat && !ineligibil && (
                    <span className="text-[10px] font-semibold text-yellow-400">
                      🔒 {sportiv.gen === 'Masculin' ? 'Trebuie fată mai întâi' : 'Trebuie băiat mai întâi'}
                    </span>
                  )}
                </div>
                {/* Motiv ineligibilitate detaliat (vizibil dacă ineligibil și nu e deja în echipă) */}
                {ineligibil && rolCurent === 'nu_participa' && (
                  <p className="text-[10px] text-orange-400/80 leading-snug">
                    {eligibilitate.motive.join(' · ')}
                  </p>
                )}
                {/* Warning vizibil dacă titular/rezervă ineligibil (edge case categoria schimbată) */}
                {(titularIneligibil || rezervaIneligibil) && (
                  <div className="rounded-md border border-orange-700/40 bg-orange-900/20 px-2 py-1.5">
                    <p className="text-[10px] text-orange-300 leading-snug">
                      ⚠ Sportiv ineligibil in echipa curenta: {eligibilitate.motive.join(' · ')}
                    </p>
                  </div>
                )}
                {/* Butoane rol — full-width pe mobil, inline pe desktop */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRolChange(sportiv.id, rolCurent === 'titular' ? 'nu_participa' : 'titular')}
                    disabled={titulariBlocati}
                    title={ineligibil && rolCurent !== 'titular' ? eligibilitate.motive.join(' · ') : undefined}
                    style={{ touchAction: 'manipulation' }}
                    className={`flex-1 sm:flex-none sm:min-w-[80px] py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                      rolCurent === 'titular'
                        ? 'bg-green-700 border-green-500 text-white'
                        : titulariBlocati
                          ? 'opacity-30 bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-700 border-slate-600 text-slate-300 active:bg-green-900/60'
                    }`}
                  >
                    {rolCurent === 'titular' ? '✓ Titular' : '+ Titular'}
                  </button>

                  {!isPereche && rezerveMax > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRolChange(sportiv.id, rolCurent === 'rezerva' ? 'nu_participa' : 'rezerva')}
                      disabled={rezerveBlocate}
                      title={ineligibil && rolCurent !== 'rezerva' ? eligibilitate.motive.join(' · ') : undefined}
                      style={{ touchAction: 'manipulation' }}
                      className={`flex-1 sm:flex-none sm:min-w-[80px] py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                        rolCurent === 'rezerva'
                          ? 'bg-sky-700 border-sky-500 text-white'
                          : rezerveBlocate
                            ? 'opacity-30 bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 border-slate-600 text-slate-300 active:bg-sky-900/60'
                      }`}
                    >
                      {rolCurent === 'rezerva' ? '✓ Rezervă' : '+ Rezervă'}
                    </button>
                  )}

                  {rolCurent !== 'nu_participa' && (
                    <button
                      type="button"
                      onClick={() => handleRolChange(sportiv.id, 'nu_participa')}
                      style={{ touchAction: 'manipulation' }}
                      className="flex-none px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-800 text-slate-500 active:text-red-400 active:border-red-700/50 transition-colors"
                    >
                      Scoate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Program SL / Sincron — după ce titularii sunt completați */}
      {areSelectieProgram && (
        <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-800/30">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {isPereche ? 'Program Song Luyen' : 'Program Sincron'}
          </p>
          {isPereche && slProgAuto ? (
            <p className="text-sm text-slate-300">{slProgAuto}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {programOptions.map(il => (
                <label key={il.id} className="flex items-center gap-2 cursor-pointer min-h-[36px]" style={{ touchAction: 'manipulation' }}>
                  <input
                    type="radio"
                    name={`program-${cat.id}`}
                    value={il.id}
                    checked={echipa.program === il.id}
                    onChange={() => onUpdateEchipa({ program: il.id })}
                    className="accent-brand-primary"
                  />
                  <span className="text-sm text-slate-300">{il.denumire}</span>
                </label>
              ))}
            </div>
          )}
          {!echipa.program && !slProgAuto && (
            <p className="text-xs text-yellow-400 mt-1.5">⚠ Program neselecționat</p>
          )}
        </div>
      )}

      {/* Câmp nume echipă */}
      <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-800/20">
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          Nume echipă
        </label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
          <span className="text-sm text-white font-medium truncate max-w-[160px] sm:max-w-[200px] shrink-0">{numeClub}</span>
          <span className="hidden sm:inline text-slate-600">—</span>
          <input
            type="text"
            value={echipa.numeEchipa}
            onChange={e => onUpdateEchipa({ numeEchipa: e.target.value })}
            placeholder="suffix opțional..."
            className="w-full sm:flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
          />
        </div>
        <p className="text-[11px] text-slate-600 mt-1">Clubul este adăugat automat ca prefix</p>
      </div>

      {/* Eroare validare */}
      {erroare && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
            {erroare}
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
};

// -----------------------------------------------
// PASUL 3 — Formare echipe
// -----------------------------------------------
interface Pas3Props {
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  numeClub: string;
  echipeFormate: EchipaFormata[];
  onUpdateEchipe: (next: EchipaFormata[]) => void;
  onContinua: () => void;
  onBack: () => void;
  /** Echipe deja salvate în DB pentru această competiție (pentru validare limită per club) */
  echipeDB?: EchipaCompetitie[];
  /** ID-ul clubului curent — necesar pentru validarea limitei per club */
  myClubId?: string;
  onOpenEditEchipa?: (categorieId: string) => void;
  /** Data de start a competiției — pentru calculul vârstei la eligibilitate */
  dataCompetitie: string;
}

const Pas3FormareEchipe: React.FC<Pas3Props> = ({
  sportivi, grade, categorii,
  selectedSportivi,
  numeClub, echipeFormate, onUpdateEchipe,
  onContinua, onBack,
  echipeDB = [],
  myClubId,
  onOpenEditEchipa,
  dataCompetitie,
}) => {
  const { showError } = useError();
  const [dreptUri, setDreptUri] = useState<Map<string, Inlantuire[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('inlantuiri_grade')
          .select('grade_id, tip_proba, inlantuiri!inlantuire_id(id, denumire, ordine, activ)')
          .eq('tip_proba', 'sincron');
        if (error) throw error;
        if (!cancelled) {
          const m = new Map<string, Inlantuire[]>();
          for (const row of (data ?? []) as unknown as { grade_id: string; tip_proba: string; inlantuiri: Inlantuire | null }[]) {
            if (!row.inlantuiri) continue;
            if (!m.has(row.grade_id)) m.set(row.grade_id, []);
            m.get(row.grade_id)!.push(row.inlantuiri);
          }
          setDreptUri(m);
        }
      } catch (err) {
        showError('Incarcare inlantuiri grad (echipe)', err);
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  // Toate categoriile de echipă/pereche din competiție
  const categoriiEchipa = useMemo<CategorieCompetitie[]>(() =>
    categorii
      .filter(esteEchipaSauPereche)
      .sort((a, b) => a.ordine_afisare - b.ordine_afisare),
    [categorii]
  );

  // Sportivii selectați în Pasul 1 (obiecte complete)
  const sportiviSelectati = useMemo<Sportiv[]>(() =>
    sportivi.filter(s => selectedSportivi.has(s.id)),
    [sportivi, selectedSportivi]
  );

  // Pool per categorie: toți sportivii selectați cu gen compatibil
  const sportiviDisponibiliPerCategorie = useMemo<Map<string, Sportiv[]>>(() => {
    const map = new Map<string, Sportiv[]>();
    for (const cat of categoriiEchipa) {
      const disponibili = sportiviSelectati.filter(s => {
        if (cat.gen !== 'Mixt' && s.gen !== cat.gen) return false;
        return true;
      });
      map.set(cat.id, disponibili);
    }
    return map;
  }, [categoriiEchipa, sportiviSelectati]);

  // Precompute eligibility for all sportivi × categorii (avoids 60-80 inline calls per render)
  const eligibilitateMap = useMemo<Map<string, Map<string, { eligibil: boolean; motive: string[] }>>>(() => {
    const outer = new Map<string, Map<string, { eligibil: boolean; motive: string[] }>>();
    for (const cat of categoriiEchipa) {
      const inner = new Map<string, { eligibil: boolean; motive: string[] }>();
      const sportivii = sportiviDisponibiliPerCategorie.get(cat.id) ?? [];
      for (const s of sportivii) {
        inner.set(s.id, verificaEligibilitate(s, cat, grade, dataCompetitie));
      }
      outer.set(cat.id, inner);
    }
    return outer;
  }, [categoriiEchipa, sportiviDisponibiliPerCategorie, grade, dataCompetitie]);

  // Asigură că toate categoriile au entry în echipeFormate (inclusiv după DB fetch)
  useEffect(() => {
    if (categoriiEchipa.length === 0) return;
    const existingIds = new Set(echipeFormate.map(e => e.categorieId));
    const lipsesc = categoriiEchipa.filter(cat => !existingIds.has(cat.id));
    if (lipsesc.length > 0) {
      const noi: EchipaFormata[] = lipsesc.map(cat => ({
        categorieId: cat.id,
        numeEchipa: '',
        titulari: [],
        rezerve: [],
        echipaIncompleta: false,
      }));
      onUpdateEchipe([...echipeFormate, ...noi]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriiEchipa.length, echipeFormate.length]);

  const getEchipa = (catId: string): EchipaFormata => {
    return echipeFormate.find(e => e.categorieId === catId) ?? {
      categorieId: catId,
      numeEchipa: '',
      titulari: [],
      rezerve: [],
      echipaIncompleta: false,
    };
  };

  const handleUpdateEchipa = (catId: string, update: Partial<EchipaFormata>) => {
    const exists = echipeFormate.some(e => e.categorieId === catId);
    if (exists) {
      onUpdateEchipe(echipeFormate.map(e => e.categorieId === catId ? { ...e, ...update } : e));
    } else {
      onUpdateEchipe([...echipeFormate, {
        categorieId: catId,
        numeEchipa: '',
        titulari: [],
        rezerve: [],
        echipaIncompleta: false,
        ...update,
      }]);
    }
  };

  // Item 3: calcul echipe active ale clubului curent per categorie (din DB)
  const echipeActiveClubPerCategorie = useMemo<Map<string, number>>(() => {
    if (!myClubId) return new Map();
    const m = new Map<string, number>();
    for (const e of echipeDB) {
      if (e.club_id !== myClubId) continue;
      if (e.status?.toLowerCase() === 'retrasa') continue;
      m.set(e.categorie_id, (m.get(e.categorie_id) ?? 0) + 1);
    }
    return m;
  }, [echipeDB, myClubId]);

  // Categorii pentru care clubul a atins limita de echipe
  const categoriiLimitaAtinsa = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const cat of categoriiEchipa) {
      const limita = cat.max_echipe_per_club ?? 1;
      const existente = echipeActiveClubPerCategorie.get(cat.id) ?? 0;
      if (existente >= limita) s.add(cat.id);
    }
    return s;
  }, [categoriiEchipa, echipeActiveClubPerCategorie]);

  // Validare per categorie
  const eroriPerCategorie = useMemo<Map<string, string>>(() => {
    const erori = new Map<string, string>();
    for (const cat of categoriiEchipa) {
      // Sari categoriile blocate de limita per club — nu e eroare, e limită
      if (categoriiLimitaAtinsa.has(cat.id)) continue;

      const echipa = getEchipa(cat.id);
      const isPereche = cat.tip_participare === 'pereche';
      const titMin = isPereche ? 2 : cat.sportivi_per_echipa_min;

      if (echipa.echipaSkip) continue; // nu participam → skip validare
      if (echipa.echipaIncompleta) continue; // inter-club → permis

      if (echipa.titulari.length < titMin) {
        const necesar = titMin - echipa.titulari.length;
        erori.set(
          cat.id,
          `Lipsesc ${necesar} titular${necesar !== 1 ? 'i' : ''} (minim ${titMin} necesari pentru start)`
        );
        continue;
      }

      // Block continue if any titular is ineligible
      const ineligibiliInEchipa = echipa.titulari.filter(id => {
        const elig = eligibilitateMap.get(cat.id)?.get(id);
        return elig && !elig.eligibil;
      });
      if (ineligibiliInEchipa.length > 0) {
        erori.set(cat.id, `${ineligibiliInEchipa.length} titular${ineligibiliInEchipa.length !== 1 ? 'i' : ''} ineligibil${ineligibiliInEchipa.length !== 1 ? 'i' : ''} — scoateți-i din echipă`);
      }
    }
    return erori;
  }, [echipeFormate, categoriiEchipa, categoriiLimitaAtinsa, eligibilitateMap]);

  const poateContinua = eroriPerCategorie.size === 0;

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
          <p className="text-xs text-slate-400 mt-0.5">
            Pasul 3 din 4: {STEP_LABELS[2]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs text-slate-500">
            {categoriiEchipa.length} categor{categoriiEchipa.length === 1 ? 'ie' : 'ii'}
          </span>
        </div>
      </div>

      {/* Progress */}
      <WizardProgress step={3} total={4} />

      {/* Banner skip toate probele */}
      {categoriiEchipa.length > 0 && (() => {
        const nrSkipped = echipeFormate.filter(e => e.echipaSkip).length;
        const toateSkipped = categoriiEchipa.length > 0 && nrSkipped === categoriiEchipa.length;
        const handleToggleToateSkip = () => {
          onUpdateEchipe(echipeFormate.map(e => ({ ...e, echipaSkip: !toateSkipped })));
        };
        return (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border border-slate-700 bg-slate-800/40">
            <span className="text-sm text-slate-400">
              {toateSkipped
                ? 'Toate probele marcate ca "Nu participăm"'
                : nrSkipped > 0
                  ? `${nrSkipped} din ${categoriiEchipa.length} probe sărite`
                  : 'Marchează toate probele ca neparticipate'}
            </span>
            <button
              onClick={handleToggleToateSkip}
              style={{ touchAction: 'manipulation' }}
              className={`w-full sm:w-auto text-xs px-3 py-2 rounded-lg border transition-colors min-h-[40px] ${
                toateSkipped
                  ? 'border-brand-primary text-brand-primary hover:bg-brand-primary/10'
                  : 'border-slate-600 text-slate-400 hover:border-yellow-600 hover:text-yellow-400'
              }`}
            >
              {toateSkipped ? 'Reactivează toate' : 'Nu participăm la nicio probă'}
            </button>
          </div>
        );
      })()}

      {/* Grid categorii — responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
        {categoriiEchipa.map(cat => {
          const disponibili = sportiviDisponibiliPerCategorie.get(cat.id) ?? [];
          const echipa = getEchipa(cat.id);
          const erroare = eroriPerCategorie.get(cat.id) ?? null;
          const limita = cat.max_echipe_per_club ?? 1;
          const limitaAtinsa = categoriiLimitaAtinsa.has(cat.id);

          // Dacă limita e atinsă pentru această categorie — afișează banner blocat în loc de form
          if (limitaAtinsa) {
            const existente = echipeActiveClubPerCategorie.get(cat.id) ?? 0;
            return (
              <div key={cat.id} className="rounded-xl border border-slate-700 bg-slate-800/20 overflow-hidden opacity-70">
                <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-400 leading-tight">
                      {cat.denumire ?? `Categoria ${cat.numar_categorie}`}
                    </span>
                    <BadgeTipParticipare tip={cat.tip_participare} />
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-2 text-xs text-slate-400">
                  <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>
                    Limita de {limita} echip{limita === 1 ? 'a' : 'e'} per club atinsa ({existente} echip{existente === 1 ? 'a' : 'e'} inscrise).
                  </span>
                </div>
              </div>
            );
          }

          return (
            <SectiuneEchipaCategorie
              key={cat.id}
              cat={cat}
              sportiviDisponibili={disponibili}
              grade={grade}
              dreptUri={dreptUri}
              numeClub={numeClub}
              echipa={echipa}
              onUpdateEchipa={update => handleUpdateEchipa(cat.id, update)}
              erroare={erroare}
              dbId={echipa.dbId}
              dataCompetitie={dataCompetitie}
              eligibilitateMapCategorie={eligibilitateMap.get(cat.id)}
            />
          );
        })}
      </div>

      {/* Sumar validare global */}
      {!poateContinua && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3">
          <p className="text-xs text-red-400 font-semibold mb-1">
            Echipe incomplete:
          </p>
          {Array.from(eroriPerCategorie.entries()).map(([catId, msg]) => {
            const cat = categorii.find(c => c.id === catId);
            return (
              <p key={catId} className="text-xs text-red-400">
                {cat?.denumire ?? catId}: {msg}
              </p>
            );
          })}
        </div>
      )}

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {poateContinua
              ? `${categoriiEchipa.length} echip${categoriiEchipa.length === 1 ? 'a' : 'e'} configurate`
              : 'Completeaza echipele inainte de a continua'}
          </span>
          <Button
            variant="success"
            disabled={!poateContinua}
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

// -----------------------------------------------
// PASUL 4 — Sumar + taxe + save DB
// -----------------------------------------------

interface Pas4Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  autoCategorie: Map<string, CategorieCompetitie>;
  quyenAles: QuyenAlesMap;
  echipeFormate: EchipaFormata[];
  probeSkipped: Set<string>;
  excludedFromIndividual: Set<string>;
  clubId: string;
  numeClub: string;
  onBack: () => void;
  onSaved: () => void;
}


const Pas4SumarTaxe: React.FC<Pas4Props> = ({
  competitie, sportivi, grade, categorii,
  selectedSportivi, autoCategorie, quyenAles, echipeFormate,
  probeSkipped, excludedFromIndividual, clubId, numeClub, onBack, onSaved,
}) => {
  const { showError, showSuccess } = useError();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inlantuiriById, setInlantuiriById] = useState<Map<string, Inlantuire>>(new Map());

  useEffect(() => {
    supabase.from('inlantuiri').select('id, denumire, ordine, activ').then(({ data }) => {
      if (!data) return;
      const m = new Map<string, Inlantuire>();
      for (const il of data as Inlantuire[]) m.set(il.id, il);
      setInlantuiriById(m);
    });
  }, []);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Rânduri înscrieri individuale pentru sumar (din autoCategorie + quyenAles)
  interface RandIndividual {
    sportiv: Sportiv;
    varsta: number;
    categorie: CategorieCompetitie;
    inlantuire_id?: string;
    inlantuire_id_2?: string;
    taxa: number;
  }

  const randuriIndividuale = useMemo<RandIndividual[]>(() => {
    const rezultat: RandIndividual[] = [];
    for (const sportivId of Array.from(selectedSportivi)) {
      if (excludedFromIndividual.has(sportivId)) continue;
      const cat = autoCategorie.get(sportivId);
      if (!cat) continue;
      // Excludem categoriile care aparțin probelor sărite
      if (cat.proba_id && probeSkipped.has(cat.proba_id)) continue;
      const sportiv = sportivi.find(s => s.id === sportivId);
      if (!sportiv) continue;
      const varsta = sportiv.data_nasterii
        ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput)
        : 0;
      const pick = quyenAles.get(sportivId);
      rezultat.push({
        sportiv,
        varsta,
        categorie: cat,
        inlantuire_id: pick?.q1 || undefined,
        inlantuire_id_2: pick?.q2 || undefined,
        taxa: calculeazaTaxaIndividuala(competitie, cat),
      });
    }
    return rezultat;
  }, [selectedSportivi, autoCategorie, sportivi, quyenAles, competitie, probeSkipped, excludedFromIndividual]);

  // Rânduri echipe pentru sumar
  interface RandEchipa {
    echipa: EchipaFormata;
    categorie: CategorieCompetitie;
    taxa: number;
    incompleta: boolean;
    titulariNume: string[];
    rezerveNume: string[];
  }

  const randuriEchipe = useMemo<RandEchipa[]>(() => {
    return echipeFormate.map(echipa => {
      const cat = categorii.find(c => c.id === echipa.categorieId);
      const taxa = cat ? calculeazaTaxaEchipa(cat, competitie) : (competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120);
      const getNumeSportiv = (id: string) => {
        const s = sportivi.find(sp => sp.id === id);
        return s ? `${s.nume} ${s.prenume}` : id;
      };
      return {
        echipa,
        categorie: cat!,
        taxa,
        incompleta: echipa.echipaIncompleta ?? false,
        titulariNume: echipa.titulari.map(getNumeSportiv),
        rezerveNume: echipa.rezerve.map(getNumeSportiv),
      };
    }).filter(r => {
      if (!r.categorie) return false;
      // Excludem echipele ale căror categorii aparțin probelor sărite
      if (r.categorie.proba_id && probeSkipped.has(r.categorie.proba_id)) return false;
      // Excludem echipele marcate cu "nu participam"
      if (r.echipa?.echipaSkip) return false;
      return true;
    });
  }, [echipeFormate, categorii, competitie, sportivi, probeSkipped]);

  const totalIndividual = useMemo(
    () => randuriIndividuale.reduce((acc, r) => acc + r.taxa, 0),
    [randuriIndividuale]
  );

  const totalEchipe = useMemo(
    () => randuriEchipe.reduce((acc, r) => acc + r.taxa, 0),
    [randuriEchipe]
  );

  const totalGeneral = totalIndividual + totalEchipe;

  // Grupare rânduri individuale pe sportiv
  const grupatePeSportiv = useMemo(() => {
    const map = new Map<string, RandIndividual[]>();
    for (const rand of randuriIndividuale) {
      const key = rand.sportiv.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rand);
    }
    return map;
  }, [randuriIndividuale]);

  // Date pentru export PDF
  const randuriFisaPDF = useMemo<RandIndividualPDF[]>(() =>
    randuriIndividuale.map(r => {
      const gradEntry = grade.find(g => g.id === r.sportiv.grad_actual_id);
      return {
        numeComplet: `${r.sportiv.nume} ${r.sportiv.prenume}`,
        categorie: r.categorie.denumire ?? `Categoria ${r.categorie.numar_categorie}`,
        proba: r.categorie.proba?.denumire ?? '—',
        inlantuireArma: (r.inlantuire_id ? inlantuiriById.get(r.inlantuire_id)?.denumire : null) ?? '—',
        grad: gradEntry?.nume ?? '—',
        taxa: r.taxa,
      };
    }),
    [randuriIndividuale, grade]
  );

  const randuriEchipePDF = useMemo<RandEchipaPDF[]>(() =>
    randuriEchipe.map(r => ({
      numeEchipa: numeClub + (r.echipa.numeEchipa ? ' — ' + r.echipa.numeEchipa : ''),
      categorie: r.categorie.denumire ?? `Categoria ${r.categorie.numar_categorie}`,
      titulari: r.titulariNume.join(', '),
      rezerve: r.rezerveNume.join(', '),
      taxa: r.taxa,
      incompleta: r.incompleta,
    })),
    [randuriEchipe, numeClub]
  );

  const handleExportFisa = () => {
    exportFisaParticipare(competitie, numeClub, randuriFisaPDF, randuriEchipePDF);
  };

  const handleExportBorderou = () => {
    exportBorderoClub(competitie, numeClub, randuriFisaPDF, randuriEchipePDF, totalIndividual, totalEchipe, totalGeneral);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Insert/reactivare înscrieri individuale
      let skippedCount = 0;
      for (const rand of randuriIndividuale) {
        const catName = rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`;
        const sportivName = `${rand.sportiv.nume} ${rand.sportiv.prenume}`;

        const { data: existent } = await supabase
          .from('inscrieri_competitie')
          .select('id, status')
          .eq('competitie_id', competitie.id)
          .eq('sportiv_id', rand.sportiv.id)
          .eq('categorie_id', rand.categorie.id)
          .maybeSingle();

        if (existent) {
          if (existent.status?.toLowerCase() !== 'retras') {
            skippedCount++;
            continue;
          }
          // Re-activare sportiv retras
          const { error: updErr } = await supabase
            .from('inscrieri_competitie')
            .update({
              status: 'inscris',
              inlantuire_id: rand.inlantuire_id ?? null,
              inlantuire_id_2: rand.inlantuire_id_2 ?? null,
            })
            .eq('id', existent.id);
          if (updErr) throw updErr;
          continue;
        }

        const payload = {
          inlantuire_id: rand.inlantuire_id ?? null,
          inlantuire_id_2: rand.inlantuire_id_2 ?? null,
          status: 'inscris',
          taxa_achitata: false,
        };

        if (false) {
          // bloc mort — păstrat pentru structură
        } else {
          const { error } = await supabase.from('inscrieri_competitie').insert({
            competitie_id: competitie.id,
            sportiv_id: rand.sportiv.id,
            categorie_id: rand.categorie.id,
            club_id: clubId,
            borderou_club_id: clubId,
            ...payload,
          });
          if (error) throw new Error(error.message);
        }
      }

      // 2. Insert/update echipe și sportivii lor
      for (const rand of randuriEchipe) {
        const denEchipa = numeClub + (rand.echipa.numeEchipa ? ' — ' + rand.echipa.numeEchipa : '');
        if (rand.echipa.dbId) {
          // UPDATE echipă existentă
          const { error: updErr } = await supabase
            .from('echipe_competitie')
            .update({
              denumire_echipa: denEchipa,
              echipa_incompleta: rand.echipa.echipaIncompleta ?? false,
              inlantuire_id: rand.echipa.program ?? null,
            })
            .eq('id', rand.echipa.dbId);
          if (updErr) throw new Error(updErr.message);
          // Re-sync membri
          await supabase.from('echipa_sportivi').delete().eq('echipa_id', rand.echipa.dbId);
          const sportiviEchipa = [
            ...rand.echipa.titulari.map(id => ({ echipa_id: rand.echipa.dbId!, sportiv_id: id, rol: 'titular' as const })),
            ...rand.echipa.rezerve.map(id => ({ echipa_id: rand.echipa.dbId!, sportiv_id: id, rol: 'rezerva' as const })),
          ];
          if (sportiviEchipa.length > 0) {
            const { error: errSp } = await supabase.from('echipa_sportivi').insert(sportiviEchipa);
            if (errSp) throw new Error(errSp.message);
          }
          if (rand.echipa.echipaIncompleta) {
            await supabase.from('solicitari_echipe_incomplete').upsert({
              competitie_id: competitie.id,
              categorie_id: rand.echipa.categorieId,
              club_solicitant_id: clubId,
              sportivi_disponibili: rand.echipa.titulari,
              status: 'deschisa',
            }, { onConflict: 'competitie_id,categorie_id,club_solicitant_id' });
          }
        } else {
          // INSERT echipă nouă
          const { data: echipaDB, error: errEchipa } = await supabase
            .from('echipe_competitie')
            .insert({
              competitie_id: competitie.id,
              categorie_id: rand.echipa.categorieId,
              club_id: clubId,
              denumire_echipa: denEchipa,
              status: 'inscrisa',
              taxa_achitata: false,
              echipa_incompleta: rand.echipa.echipaIncompleta ?? false,
              inlantuire_id: rand.echipa.program ?? null,
            })
            .select()
            .single();
          if (errEchipa) throw new Error(errEchipa.message);
          if (echipaDB) {
            const sportiviEchipa = [
              ...rand.echipa.titulari.map(id => ({
                echipa_id: echipaDB.id,
                sportiv_id: id,
                rol: 'titular' as const,
              })),
              ...rand.echipa.rezerve.map(id => ({
                echipa_id: echipaDB.id,
                sportiv_id: id,
                rol: 'rezerva' as const,
              })),
            ];
            if (sportiviEchipa.length > 0) {
              const { error: errSportivi } = await supabase.from('echipa_sportivi').insert(sportiviEchipa);
              if (errSportivi) throw new Error(errSportivi.message);
            }
            // Dacă e echipă incompletă → creează solicitare inter-club
            if (rand.echipa.echipaIncompleta) {
              await supabase.from('solicitari_echipe_incomplete').insert({
                competitie_id: competitie.id,
                categorie_id: rand.echipa.categorieId,
                club_solicitant_id: clubId,
                sportivi_disponibili: rand.echipa.titulari,
                status: 'deschisa',
              });
            }
          }
        }
      }

      setSuccessMsg('Inscrierea a fost finalizata cu succes!');
      setConfirmOpen(false);
      if (skippedCount > 0) showSuccess('Info', `${skippedCount} sportivi ignorați (deja înscriși activ).`);
      showSuccess('Inscriere finalizata', `Inscrierea la ${competitie.denumire} a fost trimisa.`);
      setTimeout(() => onSaved(), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConfirmOpen(false);
      setErrorMsg(msg);
      showError('Salvare inscriere', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5" disabled={saving}>
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">
            Inscriere sportivi
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pasul 4 din 4: {STEP_LABELS[3]}
          </p>
        </div>
      </div>

      {/* Progress */}
      <WizardProgress step={4} total={4} />

      {/* Sectiunea 1 — Inscrieri individuale */}
      {randuriIndividuale.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">
              Inscrieri individuale
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({randuriIndividuale.length} {randuriIndividuale.length === 1 ? 'inscriere' : 'inscrieri'})
              </span>
            </h3>
          </div>

          {/* DESKTOP: tabel */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/40">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Sportiv</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Categorie</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Q1</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Q2</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Taxa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {randuriIndividuale.map(rand => (
                  <tr key={rand.sportiv.id} className="bg-slate-800/10 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-white whitespace-nowrap">
                      {rand.sportiv.nume} {rand.sportiv.prenume}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">
                      {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">
                      {(rand.inlantuire_id ? inlantuiriById.get(rand.inlantuire_id)?.denumire : null) ?? <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">
                      {rand.categorie.doua_quyenuri
                        ? (rand.inlantuire_id_2
                            ? (inlantuiriById.get(rand.inlantuire_id_2)?.denumire ?? rand.inlantuire_id_2)
                            : <span className="text-yellow-500 italic text-xs">⚠ lipsă Q2</span>)
                        : <span className="text-slate-700">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-sm font-semibold text-green-400">{rand.taxa} lei</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBIL: carduri */}
          <div className="md:hidden divide-y divide-slate-700/50">
            {randuriIndividuale.map(rand => (
              <div key={rand.sportiv.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white">
                    {rand.sportiv.nume} {rand.sportiv.prenume}
                  </span>
                  <span className="text-sm font-semibold text-green-400">{rand.taxa} lei</span>
                </div>
                <div className="bg-slate-800/50 rounded-lg px-3 py-2 space-y-1">
                  <div className="text-xs font-medium text-slate-300">
                    {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                  </div>
                  {rand.inlantuire_id && <div className="text-[11px] text-slate-400">Q1: {inlantuiriById.get(rand.inlantuire_id)?.denumire ?? rand.inlantuire_id}</div>}
                  {rand.categorie.doua_quyenuri && (
                    rand.inlantuire_id_2
                      ? <div className="text-[11px] text-slate-400">Q2: {inlantuiriById.get(rand.inlantuire_id_2)?.denumire ?? rand.inlantuire_id_2}</div>
                      : <div className="text-[11px] text-yellow-500">Q2: ⚠ lipsă</div>
                  )}
                  {rand.categorie.proba && (
                    <div className="text-[11px] text-slate-500">{rand.categorie.proba.denumire}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sectiunea 2 — Echipe */}
      {randuriEchipe.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">
              Echipe formate
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({randuriEchipe.length} {randuriEchipe.length === 1 ? 'echipa' : 'echipe'})
              </span>
            </h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {randuriEchipe.map(rand => (
              <div key={rand.echipa.categorieId} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">
                        {numeClub + (rand.echipa.numeEchipa ? ' — ' + rand.echipa.numeEchipa : '')}
                      </span>
                      {rand.incompleta && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                          Partener solicitat
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {rand.incompleta ? (
                      <span className="text-sm font-semibold text-amber-400">
                        ~{rand.taxa} lei <span className="text-[10px] font-normal text-amber-600">(estimat)</span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-green-400">
                        {rand.taxa} lei
                      </span>
                    )}
                  </div>
                </div>

                {rand.titulariNume.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rand.titulariNume.map((nume, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-green-900/30 border border-green-700/40 text-green-300 rounded-full px-2 py-0.5"
                      >
                        T: {nume}
                      </span>
                    ))}
                    {rand.rezerveNume.map((nume, i) => (
                      <span
                        key={`r-${i}`}
                        className="text-[11px] bg-sky-900/30 border border-sky-700/40 text-sky-300 rounded-full px-2 py-0.5"
                      >
                        R: {nume}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sectiunea 3 — Total */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/60 overflow-hidden">
        <div className="px-4 py-3 space-y-2">
          {randuriIndividuale.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total inscrieri individuale:</span>
              <span className="text-white font-medium">{totalIndividual} lei</span>
            </div>
          )}
          {randuriEchipe.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total echipe:</span>
              <span className="text-white font-medium">{totalEchipe} lei</span>
            </div>
          )}
          <div className="border-t border-slate-600 pt-2 flex items-center justify-between">
            <span className="font-bold text-white">TOTAL DE ACHITAT:</span>
            <span className="font-bold text-xl text-green-400">{totalGeneral} lei</span>
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-500 italic">
            Plata se efectueaza la secretariatul competitiei / prin virament bancar.
          </p>
        </div>
      </div>

      {/* Mesaje feedback */}
      {successMsg && (
        <div className="rounded-lg border border-green-600/50 bg-green-900/20 px-4 py-3">
          <p className="text-sm text-green-400 font-medium">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3">
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        {/* Butoane export PDF */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportFisa}
            className="text-xs"
          >
            Export fisa participare
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportBorderou}
            className="text-xs"
          >
            Export borderou club
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-green-400 md:hidden">
            Total: {totalGeneral} lei
          </div>
          <Button
            variant="success"
            onClick={() => setConfirmOpen(true)}
            disabled={saving || !!successMsg}
            className="min-w-[180px] ml-auto"
          >
            Finalizeaza inscrierea
          </Button>
        </div>
      </div>

      {/* Dialog confirmare finalizare inscriere */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setConfirmOpen(false)}
          />
          {/* Panel */}
          <div className="relative w-full md:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl md:rounded-2xl shadow-2xl p-5 space-y-4">
            {/* Titlu */}
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-green-900/50 border border-green-700/60 flex items-center justify-center text-lg">
                ✓
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Finalizeaza inscrierea</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verificati sumarul inainte de trimitere
                </p>
              </div>
            </div>

            {/* Sumar */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 divide-y divide-slate-700/60 text-sm">
              {randuriIndividuale.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-300">
                    Inscrieri individuale
                    <span className="ml-1.5 text-xs text-slate-500">({randuriIndividuale.length})</span>
                  </span>
                  <span className="font-semibold text-white">{totalIndividual} lei</span>
                </div>
              )}
              {randuriEchipe.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-300">
                    Echipe
                    <span className="ml-1.5 text-xs text-slate-500">({randuriEchipe.length})</span>
                  </span>
                  <span className="font-semibold text-white">{totalEchipe} lei</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
                <span className="font-bold text-white">Total de achitat</span>
                <span className="font-bold text-lg text-green-400">{totalGeneral} lei</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic">
              Dupa finalizare, inscrierea va fi trimisa organizatorilor. Poti retrage individual sportivii ulterior.
            </p>

            {randuriIndividuale.length === 0 && randuriEchipe.length === 0 && (
              <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
                ⚠ Nu ai adăugat nicio înscriere. Dorești să continui fără a înscrie sportivi?
              </p>
            )}

            {/* Actiuni */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="flex-1"
              >
                Anuleaza
              </Button>
              <Button
                variant="success"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Se trimite...
                  </span>
                ) : (
                  'Confirma si trimite'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// COMPONENT PRINCIPAL — InscriereClubWizard
// -----------------------------------------------
export interface InscriereClubWizardProps {
  competitie: Competitie;
  probe: ProbaCompetitie[];
  categorii: CategorieCompetitie[];
  sportivi: Sportiv[];
  grade: Grad[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  myClubId?: string;
  onBack: () => void;
  onSaved: () => void;
  onOpenEditEchipa?: (categorieId: string) => void;
}

const InscriereClubWizard: React.FC<InscriereClubWizardProps> = ({
  competitie, probe, categorii, sportivi, grade,
  inscrieri, echipe, clubId, numeClub, vizeSportivi, myClubId, onBack, onSaved,
  onOpenEditEchipa,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSportivi, setSelectedSportivi] = useState<Set<string>>(new Set());

  // Pas2: categorii auto-asignate + quyen ales
  const [autoCategorie, setAutoCategorie] = useState<Map<string, CategorieCompetitie>>(new Map());
  const [quyenAles, setQuyenAles] = useState<QuyenAlesMap>(new Map());

  // Pas3: echipe formate
  const [echipeFormate, setEchipeFormate] = useState<EchipaFormata[]>([]);

  // Pas2: probe sărite (nu avem concurenți) — propagate la Pas4 pentru filtrare sumar
  const [probeSkippedWizard, setProbeSkippedWizard] = useState<Set<string>>(new Set());

  // Feature 2: sportivi excluși de la Thao Quyen individual
  const [excludedFromIndividual, setExcludedFromIndividual] = useState<Set<string>>(new Set());

  const handleToggleExclus = useCallback((sportivId: string) => {
    setExcludedFromIndividual(prev => {
      const next = new Set(prev);
      if (next.has(sportivId)) next.delete(sportivId);
      else next.add(sportivId);
      return next;
    });
  }, []);

  // Feature 3: fetch echipe salvate în BD la mount pentru editare
  useEffect(() => {
    if (!clubId || !competitie?.id) return;
    (async () => {
      const { data: echipeDB } = await supabase
        .from('echipe_competitie')
        .select('id, categorie_id, denumire_echipa, inlantuire_id, echipa_incompleta, echipa_sportivi(sportiv_id, rol)')
        .eq('competitie_id', competitie.id)
        .eq('club_id', clubId)
        .neq('status', 'retrasa');
      if (!echipeDB || echipeDB.length === 0) return;
      const initiale: EchipaFormata[] = (echipeDB as any[]).map(e => ({
        categorieId: e.categorie_id,
        dbId: e.id,
        numeEchipa: e.denumire_echipa
          ? e.denumire_echipa.replace(numeClub + ' — ', '').replace(numeClub, '').trim()
          : '',
        titulari: (e.echipa_sportivi ?? []).filter((m: any) => m.rol === 'titular').map((m: any) => m.sportiv_id),
        rezerve: (e.echipa_sportivi ?? []).filter((m: any) => m.rol === 'rezerva').map((m: any) => m.sportiv_id),
        program: e.inlantuire_id ?? undefined,
        echipaIncompleta: e.echipa_incompleta ?? false,
        echipaSkip: false,
      }));
      setEchipeFormate(initiale);
      const sportiviDinEchipe = new Set<string>();
      initiale.forEach(e => {
        e.titulari.forEach(id => sportiviDinEchipe.add(id));
        e.rezerve.forEach(id => sportiviDinEchipe.add(id));
      });
      if (sportiviDinEchipe.size > 0) {
        setSelectedSportivi(prev => new Set([...prev, ...sportiviDinEchipe]));
      }
    })();
  }, []); // run once on mount

  // Item 9: ref pentru a urmări ultimul set de sportivi pentru care s-a calculat autoCategorie
  // Astfel, dacă userul merge Înapoi din Pas2 la Pas1 fără să schimbe selecțiile,
  // autoCategorie NU se recalculează și quyenAles rămâne intact.
  const lastComputedSportiviRef = React.useRef<string>('');

  // Categorii echipă existente în competiție
  const areEchipe = useMemo(
    () => categorii.some(esteEchipaSauPereche),
    [categorii]
  );

  const handleToggle = (id: string) => {
    setSelectedSportivi(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const computeAutoCategorie = useCallback(() => {
    const m = new Map<string, CategorieCompetitie>();
    const catIndiv = categorii
      .filter(c => c.tip_participare === 'individual')
      .sort((a, b) => (a.ordine_afisare ?? 0) - (b.ordine_afisare ?? 0));
    for (const sportivId of Array.from(selectedSportivi)) {
      const s = sportivi.find(sp => sp.id === sportivId);
      if (!s) continue;
      const autoCat = catIndiv.find(cat => verificaEligibilitate(s, cat, grade, competitie.data_inceput).eligibil);
      if (autoCat) m.set(sportivId, autoCat);
    }
    setAutoCategorie(m);
  }, [selectedSportivi, sportivi, categorii, grade, competitie.data_inceput]);

  const handlePas1Continua = () => {
    // Item 9: recalculăm autoCategorie doar dacă selecția s-a schimbat față de ultima calcul.
    // Astfel quyenAles este păstrat intact când userul merge Înapoi și Înainte fără să schimbe selecțiile.
    const currentKey = Array.from(selectedSportivi).sort().join(',');
    if (currentKey !== lastComputedSportiviRef.current) {
      computeAutoCategorie();
      lastComputedSportiviRef.current = currentKey;
    }
    setStep(2);
  };

  if (step === 1) {
    return (
      <Pas1SelectareSportivi
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        inscrieri={inscrieri}
        vizeSportivi={vizeSportivi}
        selected={selectedSportivi}
        myClubId={myClubId}
        onToggle={handleToggle}
        onContinua={handlePas1Continua}
        onBack={onBack}
      />
    );
  }

  if (step === 2) {
    return (
      <Pas2SelectieQuyen
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        selectedSportivi={selectedSportivi}
        autoCategorie={autoCategorie}
        quyenAles={quyenAles}
        onUpdateQuyenAles={setQuyenAles}
        onContinua={() => areEchipe ? setStep(3) : setStep(4)}
        onBack={() => setStep(1)}
        excludedFromIndividual={excludedFromIndividual}
        onToggleExclus={handleToggleExclus}
      />
    );
  }

  if (step === 3) {
    return (
      <Pas3FormareEchipe
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        selectedSportivi={selectedSportivi}
        numeClub={numeClub}
        echipeFormate={echipeFormate}
        onUpdateEchipe={setEchipeFormate}
        onContinua={() => setStep(4)}
        onBack={() => setStep(2)}
        echipeDB={echipe}
        myClubId={myClubId}
        dataCompetitie={competitie.data_inceput}
      />
    );
  }

  return (
    <Pas4SumarTaxe
      competitie={competitie}
      sportivi={sportivi}
      grade={grade}
      categorii={categorii}
      selectedSportivi={selectedSportivi}
      autoCategorie={autoCategorie}
      quyenAles={quyenAles}
      echipeFormate={echipeFormate}
      probeSkipped={probeSkippedWizard}
      excludedFromIndividual={excludedFromIndividual}
      clubId={clubId}
      numeClub={numeClub}
      onBack={() => setStep(areEchipe ? 3 : 2)}
      onSaved={onSaved}
    />
  );
};

export default InscriereClubWizard;
