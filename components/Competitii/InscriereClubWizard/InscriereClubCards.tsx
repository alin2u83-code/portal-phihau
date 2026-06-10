import React, { useMemo, useState } from 'react';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { PROBA_INFO, PROBA_COLOR_CLASSES } from './constants';
import { InscriereClubWizardProps, EchipaFormata, QuyenAlesMap } from './types';
import { esteEchipaSauPereche } from './shared';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { ProbaCompetitie, CategorieCompetitie } from '../../../types';
import { TIP_PROBA_LABELS } from '../../../utils/competitiiTemplates';

// -----------------------------------------------
// TIPURI INTERNE
// -----------------------------------------------

type StatusCard = 'completat' | 'incomplet' | 'exclus' | 'blocat';

interface CardProba {
  proba: ProbaCompetitie;
  status: StatusCard;
  nrSportivi: number;
  nrComplet: number;
  nrTotal: number;
  motivBlocat?: string;
  /** count categorii echipă cu 0 eligibili */
  categoriiExcluse: number;
  /** probă marcată explicit cu "Nu participăm" de utilizator */
  isExplicitSkip: boolean;
}

// -----------------------------------------------
// PROPS
// -----------------------------------------------

export interface InscriereClubCardsProps extends InscriereClubWizardProps {
  /** sportivi deja selectați în Pasul 1 */
  selectedSportivi: Set<string>;
  autoCategorie: Map<string, CategorieCompetitie>;
  quyenAles: QuyenAlesMap;
  echipeFormate: EchipaFormata[];
  probeSkipped: Set<string>;
  excludedFromIndividual: Set<string>;
  skippedCategorii: Set<string>;
  /** Deschide ecranul de editare quyen pentru o probă individuală */
  onDeschideProba: (probaId: string) => void;
  /** Toggle "Nu participăm" per probă */
  onToggleSkipProba?: (probaId: string) => void;
  /** Finalizează înscrierea (merge la Pas4) */
  onFinalizare: () => void;
  /** Previzualizare fișă PDF */
  onPrevizualizare?: () => void;
}

// -----------------------------------------------
// HELPER: detectează dacă o probă individuală are
// sportivi fără Q1 selectat (blocată)
// -----------------------------------------------

function calculeazaStatusCard(
  proba: ProbaCompetitie,
  props: InscriereClubCardsProps
): CardProba {
  const {
    categorii, sportivi, grade, selectedSportivi, autoCategorie,
    quyenAles, echipe, clubId, echipeFormate, probeSkipped, excludedFromIndividual,
    competitie, skippedCategorii,
  } = props;

  const catProba = categorii.filter(c => c.proba_id === proba.id);
  const isSkipped = probeSkipped.has(proba.id);

  // Probă sărită explicit → exclus (cu flag isExplicitSkip)
  if (isSkipped) {
    return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0, isExplicitSkip: true };
  }

  // Probe individuale (thao_quyen, thao_lo)
  const tipIndiv = proba.tip_proba === 'thao_quyen_individual' || proba.tip_proba === 'thao_lo_individual';
  if (tipIndiv) {
    if (selectedSportivi.size === 0 || autoCategorie.size === 0) {
      if (catProba.length === 0) {
        return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0, isExplicitSkip: false };
      }
      return { proba, status: 'incomplet', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0, isExplicitSkip: false };
    }

    // Sportivii din selecție care au categorie auto-asignată pe această probă
    const sportiviProba = Array.from(selectedSportivi)
      .map(id => {
        const cat = autoCategorie.get(id);
        if (!cat || cat.proba_id !== proba.id) return null;
        return { id, cat };
      })
      .filter((x): x is { id: string; cat: CategorieCompetitie } => x !== null)
      .filter(x => !excludedFromIndividual.has(x.id));

    const nrTotal = sportiviProba.length;

    if (nrTotal === 0) {
      return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0, isExplicitSkip: false };
    }

    const nrComplet = sportiviProba.filter(({ id, cat }) => {
      const q = quyenAles.get(id);
      if (!q?.q1) return false;
      if (cat.doua_quyenuri && !q.q2) return false;
      return true;
    }).length;

    const nrFaraQ1 = sportiviProba.filter(({ id }) => !quyenAles.get(id)?.q1).length;

    if (nrFaraQ1 > 0) {
      return {
        proba,
        status: 'blocat',
        nrSportivi: nrTotal,
        nrComplet,
        nrTotal,
        motivBlocat: `${nrFaraQ1} sportiv${nrFaraQ1 !== 1 ? 'i' : ''} fără Q1`,
        categoriiExcluse: 0,
        isExplicitSkip: false,
      };
    }

    return {
      proba,
      status: nrComplet === nrTotal ? 'completat' : 'incomplet',
      nrSportivi: nrTotal,
      nrComplet,
      nrTotal,
      categoriiExcluse: 0,
      isExplicitSkip: false,
    };
  }

  // Giao Dau — categorii 'pereche', selecția în Pas3.
  // Card activ dacă există categorii (fără filtru eligibilitate — ca tab Categorii).
  if (proba.tip_proba === 'giao_dau') {
    if (catProba.length === 0) {
      return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0, isExplicitSkip: false };
    }
    const echipeProba = echipeFormate.filter(e => {
      const cat = categorii.find(c => c.id === e.categorieId);
      return cat && cat.proba_id === proba.id;
    });
    const areEchipeConfigurate = echipeProba.length > 0 && echipeProba.every(e => e.echipaSkip || e.titulari.length > 0 || e.echipaIncompleta);
    return {
      proba,
      status: areEchipeConfigurate ? 'completat' : 'incomplet',
      nrSportivi: 0,
      nrComplet: areEchipeConfigurate ? 1 : 0,
      nrTotal: 1,
      categoriiExcluse: 0,
      isExplicitSkip: false,
    };
  }

  // Probe echipă (song_luyen / sincron)
  const catEchipa = catProba.filter(esteEchipaSauPereche);
  if (catEchipa.length > 0) {
    const dataComp = competitie.data_inceput;
    // Probe echipă sunt independente de selecția individuală — Pas3 folosește toți sportivii clubului.
    const sportiviSelectatiArr = sportivi;

    let categoriiExcluse = 0;
    let nrComplet = 0;
    let nrTotal = 0;

    for (const cat of catEchipa) {
      // Verifică câți sportivi eligibili există pentru această categorie
      const eligibili = sportiviSelectatiArr.filter(s => {
        if (cat.gen !== 'Mixt' && s.gen !== cat.gen) return false;
        return verificaEligibilitate(s, cat, grade, dataComp).eligibil;
      });

      if (eligibili.length === 0) {
        categoriiExcluse++;
        continue;
      }

      nrTotal++;
      // categorie marcată explicit "Nu participăm" → contorizată ca configurată
      if (skippedCategorii.has(cat.id)) { nrComplet++; continue; }
      const echipaDB = echipe.find(e =>
        e.categorie_id === cat.id &&
        e.club_id === clubId &&
        e.status?.toLowerCase() !== 'retrasa'
      );
      if (!echipaDB) continue;
      const membri: Array<{ rol: string }> = (echipaDB as any).echipa_sportivi ?? [];
      const nrTitulari = membri.filter(m => m.rol === 'titular').length;
      const titMin = cat.tip_participare === 'pereche' ? 2 : (cat.sportivi_per_echipa_min ?? 1);
      if (nrTitulari >= titMin || echipaDB.echipa_incompleta) {
        nrComplet++;
      }
    }

    if (nrTotal === 0) {
      return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse, isExplicitSkip: false };
    }

    return {
      proba,
      status: nrComplet === nrTotal ? 'completat' : 'incomplet',
      nrSportivi: sportiviSelectatiArr.length,
      nrComplet,
      nrTotal,
      categoriiExcluse,
      isExplicitSkip: false,
    };
  }

  // Fallback — probă fără categorii → exclus
  return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0, isExplicitSkip: false };
}

// -----------------------------------------------
// CARD INDIVIDUAL
// -----------------------------------------------

const CardProbaItem: React.FC<{
  card: CardProba;
  onDeschide: () => void;
  onToggleSkip?: () => void;
}> = ({ card, onDeschide, onToggleSkip }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { proba, status, nrComplet, nrTotal, motivBlocat, categoriiExcluse } = card;
  const info = PROBA_INFO[proba.tip_proba];
  const colorKey = info?.color ?? 'amber';
  const colors = PROBA_COLOR_CLASSES[colorKey] ?? PROBA_COLOR_CLASSES.amber;
  const tipLabel = TIP_PROBA_LABELS[proba.tip_proba as keyof typeof TIP_PROBA_LABELS] ?? proba.tip_proba;

  const isExclus = status === 'exclus';
  const isBlocat = status === 'blocat';
  const isComplet = status === 'completat';

  const borderCls = isExclus
    ? 'border-dashed border-slate-600 opacity-50'
    : isBlocat
      ? 'border-yellow-600/70'
      : isComplet
        ? 'border-emerald-600/70'
        : 'border-slate-600';

  const badgeCls = isExclus
    ? 'text-slate-500 bg-slate-800'
    : isBlocat
      ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-700/50'
      : isComplet
        ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-700/50'
        : 'text-orange-400 bg-orange-900/30 border border-orange-700/50';

  const badgeText = isExclus
    ? 'Nu participăm'
    : isBlocat
      ? `Blocat — ${motivBlocat}`
      : isComplet
        ? 'Completat'
        : `${nrComplet}/${nrTotal} completate`;

  return (
    <div
      role={!isExclus ? 'button' : undefined}
      tabIndex={!isExclus ? 0 : undefined}
      onClick={!isExclus ? onDeschide : undefined}
      onKeyDown={!isExclus ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDeschide(); } } : undefined}
      style={{ touchAction: 'manipulation' }}
      className={`w-full text-left rounded-xl border bg-slate-800/40 transition-all ${borderCls} ${
        !isExclus ? 'hover:bg-slate-700/50 active:scale-[0.99] cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Header card */}
      <div className={`px-4 py-3 rounded-t-xl border-b border-slate-700/60 ${!isExclus ? colors.bg : 'bg-slate-800/30'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${!isExclus ? colors.text : 'text-slate-500'}`}>
              {tipLabel}
            </p>
            <p className="text-sm font-semibold text-white leading-tight">
              {proba.denumire}
            </p>
          </div>
          {/* Checkmark / warning */}
          {isComplet && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/50 flex items-center justify-center">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-emerald-400">
                <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {isBlocat && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-yellow-900/30 border border-yellow-600/50 flex items-center justify-center">
              <span className="text-yellow-400 text-sm font-bold">!</span>
            </div>
          )}
          {status === 'incomplet' && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-orange-900/30 border border-orange-600/50 flex items-center justify-center">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4 text-orange-400">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="currentColor" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Body card */}
      <div className="px-4 py-3 space-y-2">
        {/* Badge status */}
        <span className={`inline-flex text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${badgeCls}`}>
          {badgeText}
        </span>

        {/* Contor sportivi / categorii */}
        {!isExclus && nrTotal > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{nrTotal} categor{nrTotal === 1 ? 'ie' : 'ii'}</span>
            {categoriiExcluse > 0 && (
              <span className="text-slate-500 italic">({categoriiExcluse} excluse auto)</span>
            )}
          </div>
        )}

        {/* Bară progres */}
        {!isExclus && nrTotal > 0 && (
          <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplet ? 'bg-emerald-500' : isBlocat ? 'bg-yellow-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.round((nrComplet / nrTotal) * 100)}%` }}
            />
          </div>
        )}

        {/* CTA + meniu opțiuni */}
        {!isExclus && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-brand-primary">
              {isComplet ? 'Modifică →' : 'Configurează →'}
            </span>
            {onToggleSkip && (
              <div className="relative">
                {/* Backdrop transparent pentru închidere la click afară */}
                {menuOpen && (
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden="true"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Opțiuni probă"
                  className={`w-6 h-6 flex items-center justify-center rounded border text-xs transition-colors ${
                    menuOpen
                      ? 'border-slate-500 bg-slate-700 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className="absolute right-0 bottom-full mb-1 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[192px] overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeschide(); setMenuOpen(false); }}
                      style={{ touchAction: 'manipulation' }}
                      className="w-full text-left px-3 py-2.5 text-xs text-brand-primary hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <span>Configurează individual →</span>
                    </button>
                    <div className="border-t border-slate-700" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleSkip(); setMenuOpen(false); }}
                      style={{ touchAction: 'manipulation' }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                    >
                      Nu participăm la probă
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Undo skip */}
        {card.isExplicitSkip && onToggleSkip && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleSkip(); }}
              style={{ touchAction: 'manipulation' }}
              className="text-xs text-brand-primary underline hover:text-white transition-colors"
            >
              ← Participăm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -----------------------------------------------
// COMPONENTA PRINCIPALĂ
// -----------------------------------------------

const InscriereClubCards: React.FC<InscriereClubCardsProps> = (props) => {
  const {
    competitie, probe, categorii,
    onBack, onDeschideProba, onFinalizare, onPrevizualizare,
    selectedSportivi, onToggleSkipProba,
  } = props;

  const [filtruHub, setFiltruHub] = useState<'toate' | 'nefinalizate'>('toate');

  const probeActive = useMemo(
    () => [...probe].sort((a, b) => (a.ordine_afisare ?? 0) - (b.ordine_afisare ?? 0)),
    [probe]
  );

  const cards = useMemo<CardProba[]>(
    () => probeActive.map(p => calculeazaStatusCard(p, props)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [probeActive, props.selectedSportivi, props.autoCategorie, props.quyenAles, props.echipeFormate, props.probeSkipped, props.excludedFromIndividual, props.echipe, props.sportivi, props.grade, props.categorii, props.skippedCategorii]
  );

  const cardsFiltrate = useMemo(
    () => filtruHub === 'nefinalizate'
      ? cards.filter(c => c.status !== 'completat' && (c.status !== 'exclus' || c.isExplicitSkip))
      : cards,
    [cards, filtruHub]
  );

  const nrBlocate = cards.filter(c => c.status === 'blocat').length;
  const nrIncomplete = cards.filter(c => c.status === 'incomplet').length;
  // Blocat (quyen lipsă) = blochează finalizarea; Incomplet = permite finalizare cu avertisment
  const poateFinalizare = nrBlocate === 0;

  const tooltipFinalizare = nrBlocate > 0
    ? `${nrBlocate} prob${nrBlocate !== 1 ? 'e' : 'ă'} blocate (quyen lipsă)`
    : '';

  const nrSportiviSelectati = selectedSportivi.size;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">Înscriere club</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {competitie.denumire} · {nrSportiviSelectati} sportiv{nrSportiviSelectati !== 1 ? 'i' : ''} selectat{nrSportiviSelectati !== 1 ? 'i' : ''}
          </p>
        </div>
        {/* Rezumat rapid */}
        <div className="shrink-0 text-right text-xs text-slate-500 space-y-0.5">
          {cards.filter(c => c.status === 'completat').length > 0 && (
            <div className="text-emerald-400 font-semibold">
              {cards.filter(c => c.status === 'completat').length} completate
            </div>
          )}
          {(nrBlocate + nrIncomplete) > 0 && (
            <div className={nrBlocate > 0 ? 'text-red-400' : 'text-amber-400'}>
              {nrBlocate + nrIncomplete} necesita atentie
            </div>
          )}
        </div>
      </div>

      {/* Filtru probe */}
      <div className="flex items-center gap-2">
        {(['toate', 'nefinalizate'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltruHub(f)}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtruHub === f
                ? 'border-brand-primary bg-brand-primary/20 text-white'
                : 'border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f === 'toate' ? 'Toate' : 'Nefinalizate'}
          </button>
        ))}
      </div>

      {/* Grid carduri — 1 col mobil, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cardsFiltrate.map(card => (
          <CardProbaItem
            key={card.proba.id}
            card={card}
            onDeschide={() => onDeschideProba(card.proba.id)}
            onToggleSkip={onToggleSkipProba ? () => onToggleSkipProba(card.proba.id) : undefined}
          />
        ))}
        {cardsFiltrate.length === 0 && (
          <div className="col-span-full text-center py-8 text-sm text-slate-500 italic">
            Toate probele sunt finalizate.
          </div>
        )}
      </div>

      {/* Banner blocat — blochează finalizarea */}
      {nrBlocate > 0 && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/15 px-4 py-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Nu poți finaliza:</p>
          <p className="text-xs text-red-300">{tooltipFinalizare}</p>
        </div>
      )}
      {/* Banner avertisment — incomplet dar poate finaliza */}
      {nrBlocate === 0 && nrIncomplete > 0 && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/15 px-4 py-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">Atenție — probe incomplete:</p>
          <p className="text-xs text-amber-300">
            {nrIncomplete} prob{nrIncomplete !== 1 ? 'e' : 'ă'} incomplete. Poți finaliza cu categorii parțiale — sportivii neconfigurati nu vor fi înscriși.
          </p>
        </div>
      )}

      {/* Spacer: împiedică footer-ul sticky să acopere ultimul card/banner pe mobil */}
      <div className="h-20 sm:h-0" aria-hidden="true" />

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
          {onPrevizualizare && (
            <Button variant="secondary" size="sm" onClick={onPrevizualizare}>
              Previzualizare fișă
            </Button>
          )}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-xs text-slate-500 hidden sm:block">
              {nrBlocate > 0 ? tooltipFinalizare : nrIncomplete > 0 ? `${nrIncomplete} probe incomplete` : 'Gata de finalizare'}
            </span>
            <Button
              variant="success"
              disabled={!poateFinalizare}
              onClick={poateFinalizare ? onFinalizare : undefined}
              className="w-full sm:w-auto sm:min-w-[140px]"
              title={!poateFinalizare ? tooltipFinalizare : undefined}
            >
              {nrIncomplete > 0 && nrBlocate === 0 ? 'Finalizează parțial' : 'Finalizează înscrierea'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InscriereClubCards;
