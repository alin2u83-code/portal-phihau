/**
 * InscriereClubWizard — Wizard 4 pași pentru înscrierea sportivilor din club la competiție.
 *
 * Pasul 1 (implementat): Selectare sportivi cu eligibilitate generală
 * Pasul 2 (implementat): Categorii per sportiv — eligibilitate per categorie, quyen_ales, acord_parental, CVD Bong
 * Pasul 3 (placeholder): Echipe
 * Pasul 4 (placeholder): Sumar + taxe
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie,
  EchipaCompetitie, Sportiv, Grad, VizaSportiv, TipParticipare,
} from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import { calculeazaVarstaLaData, verificaEligibilitate } from '../../utils/eligibilitateCompetitie';

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
    if (i.status !== 'retras') s.add(i.sportiv_id);
  }
  return s;
}

// -----------------------------------------------
// PROGRESS BAR
// -----------------------------------------------
const WizardProgress: React.FC<{ step: number; total: number }> = ({ step, total }) => (
  <div className="flex items-center gap-1 mb-1">
    {Array.from({ length: total }, (_, i) => i + 1).map(n => (
      <React.Fragment key={n}>
        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
          n < step
            ? 'bg-brand-primary/70 text-white'
            : n === step
              ? 'bg-brand-primary text-white ring-2 ring-brand-primary/40'
              : 'bg-slate-700 text-slate-500'
        }`}>
          {n < step ? '✓' : n}
        </div>
        {n < total && (
          <div className={`flex-1 h-0.5 rounded ${n < step ? 'bg-brand-primary/60' : 'bg-slate-700'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const STEP_LABELS = [
  'Selectare sportivi',
  'Categorii per sportiv',
  'Echipe',
  'Sumar + taxe',
];

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
  vizeSportivi: VizaSportiv[]
): EligibilitateGenerala {
  // Date incomplete — blocker hard
  if (!s.data_nasterii) {
    return { status: 'date_incomplete', motiv: 'Lipsă dată naștere', avertismente: [] };
  }
  if (!s.grad_actual_id) {
    return { status: 'date_incomplete', motiv: 'Lipsă grad', avertismente: [] };
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
      title={info.motiv || ''}
      className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-700/50 rounded-full px-2 py-0.5 shrink-0"
    >
      Neeligibil
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
  onToggle: () => void;
}

const CardSportiv: React.FC<CardSportivProps> = ({
  sportiv, isSelected, isDisabled, isDejaInscris,
  eligibilitate, varsta, gradNume, onToggle,
}) => {
  return (
    <label
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
            {sportiv.prenume} {sportiv.nume}
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
  onToggle: () => void;
}

const RandTabelSportiv: React.FC<RandTabelSportivProps> = ({
  sportiv, isSelected, isDisabled, isDejaInscris,
  eligibilitate, varsta, gradNume, onToggle,
}) => {
  return (
    <tr
      onClick={() => !isDisabled && onToggle()}
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
            {sportiv.prenume} {sportiv.nume}
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
        {gradNume ?? <span className="text-slate-600 italic">—</span>}
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
  inscrieri: InscriereCompetitie[];
  vizeSportivi: VizaSportiv[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onContinua: () => void;
  onBack: () => void;
}

const Pas1SelectareSportivi: React.FC<Pas1Props> = ({
  competitie, sportivi, grade, inscrieri, vizeSportivi,
  selected, onToggle, onContinua, onBack,
}) => {
  const [search, setSearch] = useState('');
  const anComp = new Date(competitie.data_inceput).getFullYear();

  const dejaInscrisiSet = useMemo(() => buildDejaInscrisiSet(inscrieri), [inscrieri]);

  const sportiviActivi = useMemo(
    () => sportivi.filter(s => s.status === 'Activ'),
    [sportivi]
  );

  const sportiviFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sportiviActivi;
    return sportiviActivi.filter(s =>
      `${s.prenume} ${s.nume}`.toLowerCase().includes(q)
    );
  }, [sportiviActivi, search]);

  const enriched = useMemo(() =>
    sportiviFiltered.map(s => {
      const varsta = s.data_nasterii
        ? calculeazaVarstaLaData(s.data_nasterii, competitie.data_inceput)
        : null;
      const grad = grade.find(g => g.id === s.grad_actual_id);
      const eligibilitate = calculeazaEligibilitateGenerala(s, competitie.data_inceput, anComp, vizeSportivi);
      const isDejaInscris = dejaInscrisiSet.has(s.id);
      const isDisabled = eligibilitate.status === 'date_incomplete';
      return { sportiv: s, varsta, gradNume: grad?.nume ?? null, eligibilitate, isDejaInscris, isDisabled };
    }),
    [sportiviFiltered, grade, vizeSportivi, dejaInscrisiSet, competitie.data_inceput, anComp]
  );

  const selectableIds = useMemo(
    () => enriched.filter(e => !e.isDisabled).map(e => e.sportiv.id),
    [enriched]
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

      {/* Select all — afișat doar dacă există sportivi selectabili */}
      {selectableIds.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-brand-primary hover:underline"
          >
            {allSelectableSelected ? 'Deselecteaza tot' : `Selecteaza toti (${selectableIds.length})`}
          </button>
          {enriched.filter(e => e.isDisabled).length > 0 && (
            <span className="text-xs text-slate-500">
              · {enriched.filter(e => e.isDisabled).length} cu date incomplete (exclusi)
            </span>
          )}
        </div>
      )}

      {/* Lista sportivi */}
      {enriched.length === 0 ? (
        <div className="text-center text-slate-500 py-12 italic text-sm">
          {search ? 'Niciun sportiv gasit pentru cautarea ta.' : 'Nu exista sportivi activi in club.'}
        </div>
      ) : (
        <>
          {/* MOBIL: carduri (ascuns pe md+) */}
          <div className="flex flex-col gap-2 md:hidden">
            {enriched.map(({ sportiv, varsta, gradNume, eligibilitate, isDejaInscris, isDisabled }) => (
              <CardSportiv
                key={sportiv.id}
                sportiv={sportiv}
                isSelected={selected.has(sportiv.id)}
                isDisabled={isDisabled}
                isDejaInscris={isDejaInscris}
                eligibilitate={eligibilitate}
                varsta={varsta}
                gradNume={gradNume}
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
                {enriched.map(({ sportiv, varsta, gradNume, eligibilitate, isDejaInscris, isDisabled }) => (
                  <RandTabelSportiv
                    key={sportiv.id}
                    sportiv={sportiv}
                    isSelected={selected.has(sportiv.id)}
                    isDisabled={isDisabled}
                    isDejaInscris={isDejaInscris}
                    eligibilitate={eligibilitate}
                    varsta={varsta}
                    gradNume={gradNume}
                    onToggle={() => !isDisabled && onToggle(sportiv.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer fix pe mobil / inline pe desktop */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 -mx-4 px-4 md:static md:bg-transparent md:border-0 md:pt-2 md:pb-0 md:mx-0 md:px-0">
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
  quyen_ales?: string;
  arma_ales?: string;
  acord_parental?: boolean;
}

/**
 * indivPicks: Map<sportivId, Map<categorieId, PickCategorie>>
 * Reține selecțiile individuale (non-echipă) din Pasul 2.
 * echipaPicks: categorieId[] — categorii tip echipă bifate, pasate la Pasul 3.
 */
export type IndivPicks = Map<string, Map<string, PickCategorie>>;

// -----------------------------------------------
// TIP: drepturi_grad_competitie row (fetch Supabase)
// -----------------------------------------------
interface DreptGrad {
  grad_ordine: number;
  tip_proba: string;
  programe_permise: string[];
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
  gradOrdine: number | null;
  isBifat: boolean;
  isDejaInscris: boolean;
  isDisabledBong: boolean;
  pickData: PickCategorie;
  drepturi: DreptGrad[];
  onToggle: () => void;
  onUpdatePick: (update: Partial<PickCategorie>) => void;
}

const RandCategorie: React.FC<RandCategorieProps> = ({
  cat, gradOrdine, isBifat, isDejaInscris, isDisabledBong,
  pickData, drepturi, onToggle, onUpdatePick,
}) => {
  const isDisabled = isDejaInscris || isDisabledBong;
  const arataQuyenDropdown = isBifat && !isDejaInscris && esteThaoQuyenIndividual(cat);

  // Programele permise pentru gradul curent
  const programePermise = useMemo<string[]>(() => {
    if (!arataQuyenDropdown || gradOrdine === null) return [];
    const drept = drepturi.find(
      d => d.grad_ordine === gradOrdine && d.tip_proba === cat.proba?.tip_proba
    );
    return drept?.programe_permise ?? [];
  }, [arataQuyenDropdown, gradOrdine, drepturi, cat.proba?.tip_proba]);

  const tooltipBong = isDisabledBong
    ? 'Bong exclude alte arme (regulament CVD)'
    : undefined;

  return (
    <div className={`transition-all ${isDisabledBong ? 'opacity-40' : ''}`}>
      <label
        title={tooltipBong}
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

      {/* Dropdown quyen_ales sau input text liber */}
      {arataQuyenDropdown && (
        <div className="ml-10 mb-2 mr-3">
          {programePermise.length > 0 ? (
            <select
              value={pickData.quyen_ales ?? ''}
              onChange={e => onUpdatePick({ quyen_ales: e.target.value || undefined })}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-primary"
            >
              <option value="">Alege inlantuire...</option>
              {programePermise.map(prog => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={pickData.quyen_ales ?? ''}
              onChange={e => onUpdatePick({ quyen_ales: e.target.value || undefined })}
              placeholder="Introdu inlantuirea aleasa..."
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
  categoriiEligibile: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  picks: Map<string, PickCategorie>;
  drepturi: DreptGrad[];
  onToggleCategorie: (catId: string) => void;
  onUpdatePick: (catId: string, update: Partial<PickCategorie>) => void;
  onToggleAcord: () => void;
}

const CardSportivCategorii: React.FC<CardSportivCategoriiProps> = ({
  sportiv, varsta, gradNume, gradOrdine,
  categoriiEligibile, inscrieri, picks, drepturi,
  onToggleCategorie, onUpdatePick, onToggleAcord,
}) => {
  const esteMajor = varsta >= 18;

  // ID-uri categorii unde sportivul e deja înscris (status != retras)
  const dejaInscrisiCatIds = useMemo(() => {
    const s = new Set<string>();
    for (const ins of inscrieri) {
      if (ins.sportiv_id === sportiv.id && ins.status !== 'retras') {
        s.add(ins.categorie_id);
      }
    }
    return s;
  }, [inscrieri, sportiv.id]);

  // Detectăm dacă sportivul a bifat o categorie cu arma Bong
  const areBong = useMemo(() => {
    for (const cat of categoriiEligibile) {
      if (picks.has(cat.id) && cat.arma === 'Bong') return true;
    }
    return false;
  }, [picks, categoriiEligibile]);

  const grupeProbile = useMemo(
    () => grupeazaDupaProba(categoriiEligibile),
    [categoriiEligibile]
  );

  // acordul parental — extras din primul pick (nu e per-categorie, ci per-sportiv)
  const acordParental = picks.get('__acord__')?.acord_parental ?? false;

  const nuAreNicio = picks.size === 0 || [...picks.values()].every(p => p === null);
  const areVreoCategorieIndividuala = categoriiEligibile.some(c => !esteEchipaSauPereche(c));

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
      {/* Header card */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border-b border-slate-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">
              {sportiv.prenume} {sportiv.nume}
            </span>
            {!esteMajor && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-2 py-0.5">
                Minor
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
                // CVD Bong: dacă e bifat Bong și această categorie are altă armă → disabled
                const isDisabledBong = areBong && cat.arma !== null && cat.arma !== 'Bong';

                return (
                  <RandCategorie
                    key={cat.id}
                    cat={cat}
                    sportivId={sportiv.id}
                    gradOrdine={gradOrdine}
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
// PASUL 2 — Categorii per sportiv
// -----------------------------------------------
interface Pas2Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  selectedSportivi: Set<string>;
  indivPicks: IndivPicks;
  onUpdateIndivPicks: (next: IndivPicks) => void;
  onContinua: (echipaPicks: string[]) => void;
  onBack: () => void;
}

const Pas2CategoriiPerSportiv: React.FC<Pas2Props> = ({
  competitie, sportivi, grade, categorii, inscrieri,
  selectedSportivi, indivPicks, onUpdateIndivPicks, onContinua, onBack,
}) => {
  const { showError } = useError();
  const [drepturi, setDrepturi] = useState<DreptGrad[]>([]);
  const [loadingDrepturi, setLoadingDrepturi] = useState(true);

  // Fetch drepturi_grad_competitie o singură dată la mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('drepturi_grad_competitie')
          .select('grad_ordine, tip_proba, programe_permise');
        if (error) throw error;
        if (!cancelled) setDrepturi((data as DreptGrad[]) ?? []);
      } catch (err) {
        showError('Incarcare drepturi grad competitie', err);
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
        return { sportiv: s, varsta, grad, gradNume: grad?.nume ?? null, gradOrdine: grad?.ordine ?? null };
      }),
    [sportivi, selectedSportivi, grade, competitie.data_inceput]
  );

  // Categoriile eligibile per sportiv
  const eligibilePerSportiv = useMemo(() => {
    const result = new Map<string, CategorieCompetitie[]>();
    for (const { sportiv, grad } of sportiviSelectati) {
      const eligibile = categorii
        .filter(cat => {
          const r = verificaEligibilitate(sportiv, cat, grade, competitie.data_inceput);
          return r.eligibil;
        })
        .sort((a, b) => a.ordine_afisare - b.ordine_afisare);
      result.set(sportiv.id, eligibile);
    }
    return result;
  }, [sportiviSelectati, categorii, grade, competitie.data_inceput]);

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

  // Update date suplimentare (quyen_ales, arma_ales)
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

      if (catIndivBifate.length === 0 && eligibile.some(c => !esteEchipaSauPereche(c))) {
        erori.push(`${sportiv.prenume} ${sportiv.nume}: nicio categorie individuala selectata`);
      }

      // quyen_ales obligatoriu dacă există drepturi pentru gradul sportivului
      for (const catId of catIndivBifate) {
        const cat = categorii.find(c => c.id === catId);
        if (!cat || !esteThaoQuyenIndividual(cat)) continue;
        const grad = grade.find(g => g.id === sportiv.grad_actual_id);
        if (!grad) continue;
        const drept = drepturi.find(d => d.grad_ordine === grad.ordine && d.tip_proba === cat.proba?.tip_proba);
        if (drept && drept.programe_permise.length > 0) {
          const pick = sportivPicks.get(catId);
          if (!pick?.quyen_ales) {
            erori.push(`${sportiv.prenume} ${sportiv.nume}: alege inlantuirea pentru ${cat.denumire ?? 'Thao Quyen'}`);
          }
        }
      }

      // Acord parental pentru minori
      if (varsta < 18 && catIndivBifate.length > 0) {
        const acord = sportivPicks.get('__acord__');
        if (!acord?.acord_parental) {
          erori.push(`${sportiv.prenume} ${sportiv.nume}: acord parental obligatoriu`);
        }
      }
    }
    return erori;
  }, [sportiviSelectati, eligibilePerSportiv, indivPicks, categorii, grade, drepturi]);

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

      {/* Loading state drepturi */}
      {loadingDrepturi && (
        <div className="text-center text-xs text-slate-500 py-4 animate-pulse">
          Se incarca drepturile de grad...
        </div>
      )}

      {/* Carduri sportivi — grid responsiv */}
      {!loadingDrepturi && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sportiviSelectati.map(({ sportiv, varsta, gradNume, gradOrdine }) => {
            const eligibile = eligibilePerSportiv.get(sportiv.id) ?? [];
            const sportivPicks = indivPicks.get(sportiv.id) ?? new Map<string, PickCategorie>();

            return (
              <CardSportivCategorii
                key={sportiv.id}
                sportiv={sportiv}
                varsta={varsta}
                gradNume={gradNume}
                gradOrdine={gradOrdine}
                categoriiEligibile={eligibile}
                inscrieri={inscrieri}
                picks={sportivPicks}
                drepturi={drepturi}
                onToggleCategorie={catId => handleToggleCategorie(sportiv.id, catId)}
                onUpdatePick={(catId, update) => handleUpdatePick(sportiv.id, catId, update)}
                onToggleAcord={() => handleToggleAcord(sportiv.id)}
              />
            );
          })}
        </div>
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

      {/* Footer sticky */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 -mx-4 px-4 md:static md:bg-transparent md:border-0 md:pt-2 md:pb-0 md:mx-0 md:px-0">
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
            onClick={() => onContinua(echipaPicks)}
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
  numeEchipa: string;
  titulari: string[];  // sportivId[]
  rezerve: string[];   // sportivId[]
  echipaIncompleta?: boolean; // solicitare partener inter-club
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
  numeClub: string;
  echipa: EchipaFormata;
  onUpdateEchipa: (update: Partial<EchipaFormata>) => void;
  erroare: string | null;
}

const SectiuneEchipaCategorie: React.FC<SectiuneEchipaCategorieProps> = ({
  cat, sportiviDisponibili, numeClub, echipa, onUpdateEchipa, erroare,
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
      // Verificare limita titulari
      if (titulariNoi.length < titulariMax) {
        titulariNoi.push(sportivId);
      }
    } else if (rol === 'rezerva' && !isPereche) {
      // Verificare limita rezerve
      if (rezerveNoi.length < rezerveMax) {
        rezerveNoi.push(sportivId);
      }
    }
    // 'nu_participa' → nu adaugă nicăieri

    onUpdateEchipa({ titulari: titulariNoi, rezerve: rezerveNoi });
  };

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
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {descrieTipEchipa(cat)}
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
            const titulariBlocati = echipa.titulari.length >= titulariMax && rolCurent !== 'titular';
            const rezerveBlocate = echipa.rezerve.length >= rezerveMax && rolCurent !== 'rezerva';

            return (
              <div
                key={sportiv.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Nume sportiv */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-white">
                    {sportiv.prenume} {sportiv.nume}
                  </span>
                </div>

                {/* Butoane rol — mobil: verticale, desktop: orizontale */}
                <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                  {/* Titular */}
                  <button
                    onClick={() => handleRolChange(sportiv.id, rolCurent === 'titular' ? 'nu_participa' : 'titular')}
                    disabled={titulariBlocati}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-w-[76px] ${
                      rolCurent === 'titular'
                        ? 'bg-green-700 border-green-500 text-white'
                        : titulariBlocati
                          ? 'opacity-30 bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-green-900/40 hover:border-green-600 hover:text-green-300'
                    }`}
                  >
                    Titular
                  </button>

                  {/* Rezerva — ascuns pentru pereche */}
                  {!isPereche && rezerveMax > 0 && (
                    <button
                      onClick={() => handleRolChange(sportiv.id, rolCurent === 'rezerva' ? 'nu_participa' : 'rezerva')}
                      disabled={rezerveBlocate}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-w-[76px] ${
                        rolCurent === 'rezerva'
                          ? 'bg-sky-700 border-sky-500 text-white'
                          : rezerveBlocate
                            ? 'opacity-30 bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-sky-900/40 hover:border-sky-600 hover:text-sky-300'
                      }`}
                    >
                      Rezerva
                    </button>
                  )}

                  {/* Nu participa — vizibil implicit prin lipsa selecției */}
                  {rolCurent !== 'nu_participa' && (
                    <button
                      onClick={() => handleRolChange(sportiv.id, 'nu_participa')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-800 text-slate-500 hover:text-red-400 hover:border-red-700/50 transition-colors min-w-[76px]"
                    >
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Câmp nume echipă */}
      <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-800/20">
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
          Nume echipa (optional)
        </label>
        <input
          type="text"
          value={echipa.numeEchipa}
          onChange={e => onUpdateEchipa({ numeEchipa: e.target.value })}
          placeholder={numeClub}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Eroare validare */}
      {erroare && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
            {erroare}
          </p>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// PASUL 3 — Formare echipe
// -----------------------------------------------
interface Pas3Props {
  sportivi: Sportiv[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  indivPicks: IndivPicks;
  echipaPicks: string[];         // categorieId[] din Pasul 2
  numeClub: string;
  echipeFormate: EchipaFormata[];
  onUpdateEchipe: (next: EchipaFormata[]) => void;
  onContinua: () => void;
  onBack: () => void;
}

const Pas3FormareEchipe: React.FC<Pas3Props> = ({
  sportivi, categorii,
  selectedSportivi, indivPicks, echipaPicks,
  numeClub, echipeFormate, onUpdateEchipe,
  onContinua, onBack,
}) => {
  // Categoriile de echipă selectate în Pasul 2
  const categoriiEchipa = useMemo<CategorieCompetitie[]>(() =>
    echipaPicks
      .map(id => categorii.find(c => c.id === id))
      .filter((c): c is CategorieCompetitie => c !== undefined),
    [echipaPicks, categorii]
  );

  // Sportivii selectați în Pasul 1 (obiecte complete)
  const sportiviSelectati = useMemo<Sportiv[]>(() =>
    sportivi.filter(s => selectedSportivi.has(s.id)),
    [sportivi, selectedSportivi]
  );

  // Sportivii eligibili per categorie echipă:
  // un sportiv e disponibil dacă a bifat acea categorie în Pasul 2
  const sportiviDisponibiliPerCategorie = useMemo<Map<string, Sportiv[]>>(() => {
    const map = new Map<string, Sportiv[]>();
    for (const cat of categoriiEchipa) {
      const disponibili = sportiviSelectati.filter(s => {
        const picks = indivPicks.get(s.id);
        return picks?.has(cat.id) ?? false;
      });
      map.set(cat.id, disponibili);
    }
    return map;
  }, [categoriiEchipa, sportiviSelectati, indivPicks]);

  // Inițializare echipeFormate dacă sunt goale
  useEffect(() => {
    if (echipeFormate.length === 0 && categoriiEchipa.length > 0) {
      const initiale: EchipaFormata[] = categoriiEchipa.map(cat => ({
        categorieId: cat.id,
        numeEchipa: numeClub,
        titulari: [],
        rezerve: [],
        echipaIncompleta: false,
      }));
      onUpdateEchipe(initiale);
    }
    // Rulat o singură dată la mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getEchipa = (catId: string): EchipaFormata => {
    return echipeFormate.find(e => e.categorieId === catId) ?? {
      categorieId: catId,
      numeEchipa: numeClub,
      titulari: [],
      rezerve: [],
      echipaIncompleta: false,
    };
  };

  const handleUpdateEchipa = (catId: string, update: Partial<EchipaFormata>) => {
    onUpdateEchipe(
      echipeFormate.map(e =>
        e.categorieId === catId ? { ...e, ...update } : e
      )
    );
  };

  // Validare per categorie
  const eroriPerCategorie = useMemo<Map<string, string>>(() => {
    const erori = new Map<string, string>();
    for (const cat of categoriiEchipa) {
      const echipa = getEchipa(cat.id);
      const isPereche = cat.tip_participare === 'pereche';
      const titMin = isPereche ? 2 : cat.sportivi_per_echipa_min;

      if (echipa.echipaIncompleta) continue; // inter-club → permis

      if (echipa.titulari.length < titMin) {
        const necesar = titMin - echipa.titulari.length;
        erori.set(
          cat.id,
          `Lipsesc ${necesar} titular${necesar !== 1 ? 'i' : ''} (minim ${titMin} necesari pentru start)`
        );
      }
    }
    return erori;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echipeFormate, categoriiEchipa]);

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

      {/* Grid categorii — responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
        {categoriiEchipa.map(cat => {
          const disponibili = sportiviDisponibiliPerCategorie.get(cat.id) ?? [];
          const echipa = getEchipa(cat.id);
          const erroare = eroriPerCategorie.get(cat.id) ?? null;

          return (
            <SectiuneEchipaCategorie
              key={cat.id}
              cat={cat}
              sportiviDisponibili={disponibili}
              numeClub={numeClub}
              echipa={echipa}
              onUpdateEchipa={update => handleUpdateEchipa(cat.id, update)}
              erroare={erroare}
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
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 -mx-4 px-4 md:static md:bg-transparent md:border-0 md:pt-2 md:pb-0 md:mx-0 md:px-0">
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
  indivPicks: IndivPicks;
  echipaPicks: string[];
  echipeFormate: EchipaFormata[];
  clubId: string;
  numeClub: string;
  onBack: () => void;
  onSaved: () => void;
}

/** Calculează taxa pentru o categorie individuală pe baza tipului probei și configurației competiției. */
function calculeazaTaxaIndividuala(competitie: Competitie): number {
  return competitie.taxa_individual ?? 80;
}

/** Calculează taxa pentru o echipă pe baza categoriei (juniori/seniori) și configurației competiției. */
function calculeazaTaxaEchipa(cat: CategorieCompetitie, competitie: Competitie): number {
  // Dacă varsta_max <= 17 → juniori (taxă diferită)
  const esteJuniori = cat.varsta_max !== null && cat.varsta_max <= 17;
  if (esteJuniori) {
    // Folosim taxa_echipa ca baza; pentru juniori adaugam 30 lei conventional
    return (competitie.taxa_echipa ?? 150);
  }
  return competitie.taxa_echipa ?? 120;
}

const Pas4SumarTaxe: React.FC<Pas4Props> = ({
  competitie, sportivi, grade, categorii,
  selectedSportivi, indivPicks, echipaPicks, echipeFormate,
  clubId, numeClub, onBack, onSaved,
}) => {
  const { showError } = useError();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sportivii selectați cu date enriched
  const sportiviSelectati = useMemo(() =>
    sportivi
      .filter(s => selectedSportivi.has(s.id))
      .map(s => {
        const varsta = s.data_nasterii
          ? calculeazaVarstaLaData(s.data_nasterii, competitie.data_inceput)
          : 0;
        const grad = grade.find(g => g.id === s.grad_actual_id) ?? null;
        return { sportiv: s, varsta, grad };
      }),
    [sportivi, selectedSportivi, grade, competitie.data_inceput]
  );

  // ID-uri categorii echipă
  const echipaPicksSet = useMemo(() => new Set(echipaPicks), [echipaPicks]);

  // Rânduri înscrieri individuale pentru sumar
  interface RandIndividual {
    sportiv: Sportiv;
    varsta: number;
    categorie: CategorieCompetitie;
    quyen_ales?: string;
    arma_ales?: string;
    acord_parental: boolean;
    taxa: number;
  }

  const randuriIndividuale = useMemo<RandIndividual[]>(() => {
    const rezultat: RandIndividual[] = [];
    for (const { sportiv, varsta } of sportiviSelectati) {
      const sportivPicks = indivPicks.get(sportiv.id) ?? new Map<string, PickCategorie>();
      const acordParental = sportivPicks.get('__acord__')?.acord_parental ?? false;

      for (const [catId, pick] of sportivPicks) {
        if (catId === '__acord__') continue;
        if (echipaPicksSet.has(catId)) continue; // echipele se afișează separat

        const cat = categorii.find(c => c.id === catId);
        if (!cat) continue;

        rezultat.push({
          sportiv,
          varsta,
          categorie: cat,
          quyen_ales: pick.quyen_ales,
          arma_ales: pick.arma_ales,
          acord_parental: acordParental,
          taxa: calculeazaTaxaIndividuala(competitie),
        });
      }
    }
    return rezultat;
  }, [sportiviSelectati, indivPicks, echipaPicksSet, categorii, competitie]);

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
      const taxa = cat ? calculeazaTaxaEchipa(cat, competitie) : (competitie.taxa_echipa ?? 120);
      const getNumeSportiv = (id: string) => {
        const s = sportivi.find(sp => sp.id === id);
        return s ? `${s.prenume} ${s.nume}` : id;
      };
      return {
        echipa,
        categorie: cat!,
        taxa,
        incompleta: echipa.echipaIncompleta ?? false,
        titulariNume: echipa.titulari.map(getNumeSportiv),
        rezerveNume: echipa.rezerve.map(getNumeSportiv),
      };
    }).filter(r => r.categorie !== undefined);
  }, [echipeFormate, categorii, competitie, sportivi]);

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

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Insert înscrieri individuale
      for (const rand of randuriIndividuale) {
        const { error } = await supabase.from('inscrieri_competitie').insert({
          competitie_id: competitie.id,
          sportiv_id: rand.sportiv.id,
          categorie_id: rand.categorie.id,
          club_id: clubId,
          quyen_ales: rand.quyen_ales ?? null,
          arma_ales: rand.arma_ales ?? null,
          acord_parental: rand.acord_parental,
          borderou_club_id: clubId,
          status: 'inscris',
          taxa_achitata: false,
        });

        if (error) {
          // UNIQUE constraint → sportiv deja inscris
          if (error.code === '23505') {
            throw new Error(
              `Sportivul ${rand.sportiv.prenume} ${rand.sportiv.nume} este deja inscris la categoria "${rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}".`
            );
          }
          throw new Error(error.message);
        }
      }

      // 2. Insert echipe și sportivii lor
      for (const rand of randuriEchipe) {
        const { data: echipaDB, error: errEchipa } = await supabase
          .from('echipe_competitie')
          .insert({
            competitie_id: competitie.id,
            categorie_id: rand.echipa.categorieId,
            club_id: clubId,
            denumire_echipa: rand.echipa.numeEchipa || numeClub,
            status: 'inscrisa',
            taxa_achitata: false,
          })
          .select()
          .single();

        if (errEchipa) {
          throw new Error(errEchipa.message);
        }

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
            const { error: errSportivi } = await supabase
              .from('echipa_sportivi')
              .insert(sportiviEchipa);

            if (errSportivi) {
              throw new Error(errSportivi.message);
            }
          }
        }
      }

      setSuccessMsg('Inscrierea a fost salvata cu succes!');
      setTimeout(() => onSaved(), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Sportiv
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Categorie
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Proba
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Inlantuire / Arma
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Taxa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {Array.from(grupatePeSportiv.entries()).map(([sportivId, randuri]) => {
                  const primaInscriere = randuri[0];
                  const esteMajor = primaInscriere.varsta >= 18;
                  return randuri.map((rand, idx) => (
                    <tr key={`${sportivId}-${rand.categorie.id}`} className="bg-slate-800/10 hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5">
                        {idx === 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-white">
                              {rand.sportiv.prenume} {rand.sportiv.nume}
                            </span>
                            {!esteMajor && rand.acord_parental && (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                                Acord parental
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-300">
                        {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">
                        {rand.categorie.proba?.denumire ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">
                        {rand.quyen_ales ?? rand.arma_ales ?? <span className="text-slate-600 italic">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-sm font-semibold text-green-400">
                          {rand.taxa} lei
                        </span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* MOBIL: carduri */}
          <div className="md:hidden divide-y divide-slate-700/50">
            {Array.from(grupatePeSportiv.entries()).map(([sportivId, randuri]) => {
              const primaInscriere = randuri[0];
              const esteMajor = primaInscriere.varsta >= 18;
              return (
                <div key={sportivId} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-white">
                      {primaInscriere.sportiv.prenume} {primaInscriere.sportiv.nume}
                    </span>
                    {!esteMajor && primaInscriere.acord_parental && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-1.5 py-0.5">
                        Acord parental
                      </span>
                    )}
                  </div>
                  {randuri.map(rand => (
                    <div
                      key={rand.categorie.id}
                      className="flex items-center justify-between gap-2 bg-slate-800/50 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-300">
                          {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                        </div>
                        {rand.categorie.proba && (
                          <div className="text-[11px] text-slate-500">
                            {rand.categorie.proba.denumire}
                          </div>
                        )}
                        {(rand.quyen_ales || rand.arma_ales) && (
                          <div className="text-[11px] text-slate-400 italic">
                            {rand.quyen_ales ?? rand.arma_ales}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-green-400 shrink-0">
                        {rand.taxa} lei
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
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
                        {rand.echipa.numeEchipa || numeClub}
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
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 -mx-4 px-4 md:static md:bg-transparent md:border-0 md:pt-2 md:pb-0 md:mx-0 md:px-0">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-green-400 md:hidden">
            Total: {totalGeneral} lei
          </div>
          <Button
            variant="success"
            onClick={handleSave}
            disabled={saving || !!successMsg}
            className="min-w-[180px] ml-auto"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                Se salveaza...
              </span>
            ) : (
              'Confirma inscrierea'
            )}
          </Button>
        </div>
      </div>
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
  onBack: () => void;
  onSaved: () => void;
}

const InscriereClubWizard: React.FC<InscriereClubWizardProps> = ({
  competitie, probe, categorii, sportivi, grade,
  inscrieri, echipe, clubId, numeClub, vizeSportivi, onBack, onSaved,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSportivi, setSelectedSportivi] = useState<Set<string>>(new Set());

  // Starea Pasului 2
  const [indivPicks, setIndivPicks] = useState<IndivPicks>(new Map());
  // Categoriile de tip echipă/pereche bifate în Pasul 2 → pasate la Pasul 3
  const [echipaPicks, setEchipaPicks] = useState<string[]>([]);
  // Starea Pasului 3
  const [echipeFormate, setEchipeFormate] = useState<EchipaFormata[]>([]);

  const handleToggle = (id: string) => {
    setSelectedSportivi(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePas2Continua = (picks: string[]) => {
    setEchipaPicks(picks);
    // Dacă nicio categorie de echipă → sărim direct la Pasul 4
    if (picks.length === 0) {
      setStep(4);
    } else {
      setStep(3);
    }
  };

  if (step === 1) {
    return (
      <Pas1SelectareSportivi
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        inscrieri={inscrieri}
        vizeSportivi={vizeSportivi}
        selected={selectedSportivi}
        onToggle={handleToggle}
        onContinua={() => setStep(2)}
        onBack={onBack}
      />
    );
  }

  if (step === 2) {
    return (
      <Pas2CategoriiPerSportiv
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        inscrieri={inscrieri}
        selectedSportivi={selectedSportivi}
        indivPicks={indivPicks}
        onUpdateIndivPicks={setIndivPicks}
        onContinua={handlePas2Continua}
        onBack={() => setStep(1)}
      />
    );
  }

  if (step === 3) {
    return (
      <Pas3FormareEchipe
        sportivi={sportivi}
        categorii={categorii}
        selectedSportivi={selectedSportivi}
        indivPicks={indivPicks}
        echipaPicks={echipaPicks}
        numeClub={numeClub}
        echipeFormate={echipeFormate}
        onUpdateEchipe={setEchipeFormate}
        onContinua={() => setStep(4)}
        onBack={() => setStep(2)}
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
      indivPicks={indivPicks}
      echipaPicks={echipaPicks}
      echipeFormate={echipeFormate}
      clubId={clubId}
      numeClub={numeClub}
      onBack={() => setStep(echipaPicks.length > 0 ? 3 : 2)}
      onSaved={onSaved}
    />
  );
};

export default InscriereClubWizard;
