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
  categoriiExcluse: number;
}

// -----------------------------------------------
// PROPS
// -----------------------------------------------

export interface InscriereClubCardsProps extends InscriereClubWizardProps {
  selectedSportivi: Set<string>;
  autoCategorie: Map<string, CategorieCompetitie>;
  quyenAles: QuyenAlesMap;
  echipeFormate: EchipaFormata[];
  probeSkipped: Set<string>;
  excludedFromIndividual: Set<string>;
  onDeschideProba: (probaId: string) => void;
  onFinalizare: () => void;
  onPrevizualizare?: () => void;
}

// -----------------------------------------------
// HELPER: calculează status per card
// -----------------------------------------------

function calculeazaStatusCard(
  proba: ProbaCompetitie,
  props: InscriereClubCardsProps
): CardProba {
  const {
    categorii, sportivi, grade, selectedSportivi, autoCategorie,
    quyenAles, echipeFormate, probeSkipped, excludedFromIndividual,
    competitie,
  } = props;

  const catProba = categorii.filter(c => c.proba_id === proba.id);
  const isSkipped = probeSkipped.has(proba.id);

  if (isSkipped) {
    return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0 };
  }

  const tipIndiv = proba.tip_proba === 'thao_quyen_individual' || proba.tip_proba === 'thao_lo_individual';
  if (tipIndiv) {
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
      return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0 };
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
      };
    }

    return {
      proba,
      status: nrComplet === nrTotal ? 'completat' : 'incomplet',
      nrSportivi: nrTotal,
      nrComplet,
      nrTotal,
      categoriiExcluse: 0,
    };
  }

  if (proba.tip_proba === 'giao_dau') {
    const sportiviProba = Array.from(selectedSportivi).filter(id => {
      const cat = autoCategorie.get(id);
      return cat && cat.proba_id === proba.id;
    });
    const nrTotal = sportiviProba.length;
    if (nrTotal === 0) {
      return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0 };
    }
    return {
      proba,
      status: 'completat',
      nrSportivi: nrTotal,
      nrComplet: nrTotal,
      nrTotal,
      categoriiExcluse: 0,
    };
  }

  const catEchipa = catProba.filter(esteEchipaSauPereche);
  if (catEchipa.length > 0) {
    const dataComp = competitie.data_inceput;
    const sportiviSelectatiArr = sportivi.filter(s => selectedSportivi.has(s.id));

    let categoriiExcluse = 0;
    let nrComplet = 0;
    let nrTotal = 0;

    for (const cat of catEchipa) {
      const eligibili = sportiviSelectatiArr.filter(s => {
        if (cat.gen !== 'Mixt' && s.gen !== cat.gen) return false;
        return verificaEligibilitate(s, cat, grade, dataComp).eligibil;
      });

      if (eligibili.length === 0) {
        categoriiExcluse++;
        continue;
      }

      nrTotal++;
      const echipa = echipeFormate.find(e => e.categorieId === cat.id);
      if (!echipa) continue;
      if (echipa.echipaSkip) {
        nrComplet++;
        continue;
      }
      const titMin = cat.tip_participare === 'pereche' ? 2 : cat.sportivi_per_echipa_min;
      if (echipa.titulari.length >= titMin || echipa.echipaIncompleta) {
        nrComplet++;
      }
    }

    if (nrTotal === 0) {
      return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse };
    }

    return {
      proba,
      status: nrComplet === nrTotal ? 'completat' : 'incomplet',
      nrSportivi: sportiviSelectatiArr.length,
      nrComplet,
      nrTotal,
      categoriiExcluse,
    };
  }

  return { proba, status: 'exclus', nrSportivi: 0, nrComplet: 0, nrTotal: 0, categoriiExcluse: 0 };
}

// -----------------------------------------------
// CARD INDIVIDUAL
// -----------------------------------------------

const CardProbaItem: React.FC<{
  card: CardProba;
  onDeschide: () => void;
}> = ({ card, onDeschide }) => {
  const { proba, status, nrComplet, nrTotal, motivBlocat, categoriiExcluse } = card;
  const info = PROBA_INFO[proba.tip_proba];
  const colorKey = info?.color ?? 'amber';
  const colors = PROBA_COLOR_CLASSES[colorKey] ?? PROBA_COLOR_CLASSES.amber;
  const tipLabel = TIP_PROBA_LABELS[proba.tip_proba as keyof typeof TIP_PROBA_LABELS] ?? proba.tip_proba;

  const isExclus = status === 'exclus';
  const isBlocat = status === 'blocat';
  const isComplet = status === 'completat';

  const borderCls = isExclus
    ? 'border-dashed border-slate-600 opacity-40 pointer-events-none'
    : isBlocat
      ? 'border-yellow-600/70'
      : isComplet
        ? 'border-emerald-600/70'
        : 'border-slate-600';

  const badgeText = isExclus
    ? 'Nu concurăm'
    : isBlocat
      ? `Blocat — ${motivBlocat}`
      : isComplet
        ? nrTotal > 0 ? `${nrTotal} completate` : 'Completat'
        : `${nrComplet}/${nrTotal} completate`;

  const badgeCls = isExclus
    ? 'text-slate-500 bg-slate-800 border border-slate-700'
    : isBlocat
      ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-700/50'
      : isComplet
        ? 'text-emerald-400 bg-emerald-900/30 border border-emerald-700/50'
        : 'text-orange-400 bg-orange-900/30 border border-orange-700/50';

  return (
    <button
      type="button"
      onClick={!isExclus ? onDeschide : undefined}
      disabled={isExclus}
      style={{ touchAction: 'manipulation' }}
      className={`relative w-full text-left rounded-2xl border bg-slate-800/50 transition-all cursor-pointer ${borderCls} ${
        !isExclus ? 'hover:bg-slate-700/50 hover:border-opacity-100 active:scale-[0.99]' : 'cursor-default'
      }`}
    >
      {/* Checkmark badge top-right */}
      {isComplet && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-600/25 border border-emerald-500/60 flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-emerald-400">
            <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      {isBlocat && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-yellow-900/40 border border-yellow-600/60 flex items-center justify-center">
          <span className="text-yellow-400 text-xs font-bold">!</span>
        </div>
      )}

      {/* Icon + title */}
      <div className="px-4 pt-4 pb-3">
        <div className={`text-2xl mb-2 ${isExclus ? 'opacity-50' : ''}`}>
          {proba.tip_proba === 'thao_quyen_individual' ? '🥋'
            : proba.tip_proba === 'song_luyen' ? '👥'
            : proba.tip_proba === 'sincron' ? '🔄'
            : proba.tip_proba === 'giao_dau' ? '⚔️'
            : proba.tip_proba === 'thao_lo_individual' ? '🗡️'
            : '🏆'}
        </div>
        <p className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${!isExclus ? colors.text : 'text-slate-600'}`}>
          {tipLabel}
        </p>
        <p className="text-sm font-semibold text-white leading-tight pr-6">
          {proba.denumire}
        </p>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 space-y-2">
        {/* Badge status */}
        <span className={`inline-flex text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${badgeCls}`}>
          {badgeText}
        </span>

        {/* Categorii excluse sub badge */}
        {!isExclus && categoriiExcluse > 0 && (
          <div className="text-[11px] text-slate-500 italic">
            {categoriiExcluse} categor{categoriiExcluse === 1 ? 'ie exclusă' : 'ii excluse'} automat
          </div>
        )}

        {/* Bara progres */}
        {!isExclus && nrTotal > 0 && (
          <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplet ? 'bg-emerald-500' : isBlocat ? 'bg-yellow-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.round((nrComplet / nrTotal) * 100)}%` }}
            />
          </div>
        )}

        {/* CTA */}
        {!isExclus && (
          <div className="flex items-center justify-end pt-0.5">
            {isComplet ? (
              <span className="text-xs font-semibold text-slate-400 bg-slate-700 border border-slate-600 rounded-md px-2.5 py-1">
                Modifică
              </span>
            ) : (
              <span className={`text-xs font-semibold ${colors.text}`}>
                Configurează →
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

// -----------------------------------------------
// COMPONENTA PRINCIPALĂ
// -----------------------------------------------

const InscriereClubCards: React.FC<InscriereClubCardsProps> = (props) => {
  const {
    competitie, probe, numeClub,
    onBack, onDeschideProba, onFinalizare, onPrevizualizare,
    selectedSportivi,
  } = props;

  const [showExcluse, setShowExcluse] = useState(false);

  const probeActive = useMemo(
    () => [...probe].sort((a, b) => (a.ordine_afisare ?? 0) - (b.ordine_afisare ?? 0)),
    [probe]
  );

  const cards = useMemo<CardProba[]>(
    () => probeActive.map(p => calculeazaStatusCard(p, props)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [probeActive, props.selectedSportivi, props.autoCategorie, props.quyenAles, props.echipeFormate, props.probeSkipped, props.excludedFromIndividual]
  );

  const cardsActive = cards.filter(c => c.status !== 'exclus');
  const cardsExcluse = cards.filter(c => c.status === 'exclus');

  // Probe individuale vs echipe (din categorii)
  const probeIndividuale = cardsActive.filter(c =>
    c.proba.tip_proba === 'thao_quyen_individual' ||
    c.proba.tip_proba === 'thao_lo_individual' ||
    (c.proba.tip_proba === 'giao_dau' && !props.categorii.some(cat => cat.proba_id === c.proba.id && (cat.tip_participare === 'echipa' || cat.tip_participare === 'pereche')))
  );
  const probeEchipe = cardsActive.filter(c =>
    c.proba.tip_proba === 'song_luyen' ||
    c.proba.tip_proba === 'sincron' ||
    (c.proba.tip_proba === 'giao_dau' && props.categorii.some(cat => cat.proba_id === c.proba.id && (cat.tip_participare === 'echipa' || cat.tip_participare === 'pereche')))
  );

  const probleme = useMemo(() => cards.filter(c => c.status === 'blocat' || c.status === 'incomplet'), [cards]);
  const nrBlocate = cards.filter(c => c.status === 'blocat').length;
  const nrIncomplete = cards.filter(c => c.status === 'incomplet').length;
  const poateFinalizare = probleme.length === 0;

  const tooltipFinalizare = !poateFinalizare
    ? [
        nrBlocate > 0 ? `${nrBlocate} prob${nrBlocate !== 1 ? 'e' : 'a'} blocate (quyen lipsă)` : '',
        nrIncomplete > 0 ? `${nrIncomplete} prob${nrIncomplete !== 1 ? 'e' : 'a'} incomplete` : '',
      ].filter(Boolean).join(' · ')
    : '';

  const nrCompletate = cards.filter(c => c.status === 'completat').length;

  return (
    <div className="space-y-4">
      {/* Header nav */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white leading-tight">Selectează proba</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {competitie.denumire}
            {numeClub && ` · ${numeClub}`}
            {selectedSportivi.size > 0 && ` · ${selectedSportivi.size} sportiv${selectedSportivi.size !== 1 ? 'i' : ''}`}
          </p>
        </div>
        {/* Rezumat rapid */}
        <div className="shrink-0 text-right text-xs space-y-0.5">
          {nrCompletate > 0 && (
            <div className="text-emerald-400 font-semibold">{nrCompletate} completate</div>
          )}
          {probleme.length > 0 && (
            <div className="text-orange-400">{probleme.length} necesit{probleme.length === 1 ? 'a' : 'a'} atenție</div>
          )}
        </div>
      </div>

      {/* Banner warning — probe blocate */}
      {nrBlocate > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-700/50 bg-yellow-900/15 px-4 py-3">
          <span className="text-yellow-400 text-sm shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-xs font-semibold text-yellow-300">
              {nrBlocate} prob{nrBlocate !== 1 ? 'e' : 'a'} necesit{nrBlocate !== 1 ? 'a' : 'a'} atenție
            </p>
            <p className="text-xs text-yellow-400/80 mt-0.5">
              Sportivi fără quyen selectat. Finalizarea este blocată.
            </p>
          </div>
        </div>
      )}

      {/* ── Probe individuale ── */}
      {probeIndividuale.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">
            Probe individuale
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {probeIndividuale.map(card => (
              <CardProbaItem
                key={card.proba.id}
                card={card}
                onDeschide={() => onDeschideProba(card.proba.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Probe de echipe ── */}
      {probeEchipe.length > 0 && (
        <div className={probeIndividuale.length > 0 ? 'mt-2' : ''}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">
            Probe de echipe
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {probeEchipe.map(card => (
              <CardProbaItem
                key={card.proba.id}
                card={card}
                onDeschide={() => onDeschideProba(card.proba.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: probe fara grup */}
      {probeIndividuale.length === 0 && probeEchipe.length === 0 && cardsActive.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {cardsActive.map(card => (
            <CardProbaItem
              key={card.proba.id}
              card={card}
              onDeschide={() => onDeschideProba(card.proba.id)}
            />
          ))}
        </div>
      )}

      {/* ── Probe excluse automat (collapsible) ── */}
      {cardsExcluse.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowExcluse(v => !v)}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors py-1"
          >
            <span>{showExcluse ? '▼' : '▶'}</span>
            <span>{cardsExcluse.length} prob{cardsExcluse.length === 1 ? 'a exclusa' : 'e excluse'} automat</span>
          </button>
          {showExcluse && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
              {cardsExcluse.map(card => (
                <CardProbaItem
                  key={card.proba.id}
                  card={card}
                  onDeschide={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Banner probleme globale */}
      {!poateFinalizare && (
        <div className="rounded-xl border border-orange-700/50 bg-orange-900/15 px-4 py-3">
          <p className="text-xs font-semibold text-orange-400 mb-1">Nu poți finaliza încă:</p>
          <p className="text-xs text-orange-300">{tooltipFinalizare}</p>
        </div>
      )}

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <div className="flex items-center gap-3 flex-wrap justify-between">
          {onPrevizualizare && (
            <Button variant="secondary" size="sm" onClick={onPrevizualizare}>
              Previzualizare fișă
            </Button>
          )}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <span className="text-xs text-slate-500 hidden sm:block">
              {poateFinalizare ? 'Toate probele configurate' : tooltipFinalizare}
            </span>
            <Button
              variant="success"
              disabled={!poateFinalizare}
              onClick={poateFinalizare ? onFinalizare : undefined}
              className="min-w-[140px]"
              title={!poateFinalizare ? tooltipFinalizare : undefined}
            >
              {!poateFinalizare ? '🔒 Finalizează înscrierea' : 'Finalizează înscrierea'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InscriereClubCards;
