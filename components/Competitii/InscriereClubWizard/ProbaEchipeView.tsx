/**
 * ProbaEchipeView — ecran dedicat pentru o probă de echipe.
 *
 * Principiu: fiecare probă are PROPRIILE categorii, filtrate după tip_proba.
 * - Song Luyen: categorii tip_proba = 'song_luyen'
 * - Sincron: categorii tip_proba = 'sincron'
 * - Giao Dau Echipe: categorii cu tip_participare = 'echipa'/'pereche'
 *
 * Layout: banner info + carduri categorii expandabile/colapsibile.
 * Categorii cu 0 eligibili: excluse automat, afișate în collapsible.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CategorieCompetitie, Sportiv, Grad, Inlantuire, ProbaCompetitie,
} from '../../../types';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { verificaEligibilitate, calculeazaVarstaLaData } from '../../../utils/eligibilitateCompetitie';
import { formatNume } from '../../../utils/formatareSportiv';
import { BadgeTipParticipare, esteEchipaSauPereche, getSLProg } from './shared';
import { EchipaFormata, RolEchipa } from './types';
import { PROBA_INFO, PROBA_COLOR_CLASSES } from './constants';

// -----------------------------------------------
// PROPS
// -----------------------------------------------
export interface ProbaEchipeViewProps {
  proba: ProbaCompetitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  numeClub: string;
  echipeFormate: EchipaFormata[];
  onUpdateEchipe: (next: EchipaFormata[]) => void;
  dataCompetitie: string;
  onBack: () => void;
  onSave: () => void;
  myClubId?: string;
}

// -----------------------------------------------
// HELPER: descriere tip echipă
// -----------------------------------------------
function descrieTipEchipa(cat: CategorieCompetitie): string {
  if (cat.tip_participare === 'pereche') return 'Pereche 2 sportivi';
  const titMax = cat.sportivi_per_echipa_max;
  const rezMax = cat.rezerve_max;
  return `Echipă ${titMax} titular${titMax !== 1 ? 'i' : ''} + ${rezMax} rezerv${rezMax !== 1 ? 'e' : 'ă'}`;
}

function canAddToTitulari(
  cat: CategorieCompetitie, athGen: string | undefined | null,
  titulari: string[], sportiviPool: Sportiv[]
): boolean {
  if (cat.gen !== 'Mixt') return true;
  const nF = titulari.filter(id => sportiviPool.find(s => s.id === id)?.gen === 'Feminin').length;
  const nM = titulari.filter(id => sportiviPool.find(s => s.id === id)?.gen === 'Masculin').length;
  const remaining = cat.sportivi_per_echipa_max - titulari.length;
  if (remaining <= 0) return false;
  if (athGen === 'Masculin') return (remaining - 1) >= Math.max(0, 1 - nF);
  return (remaining - 1) >= Math.max(0, 1 - nM);
}

// -----------------------------------------------
// CHIP SPORTIV SELECTAT
// -----------------------------------------------
const ChipSportiv: React.FC<{ sportiv: Sportiv; onRemove: () => void }> = ({ sportiv, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 bg-indigo-900/30 border border-indigo-700/40 rounded-full px-2.5 py-1 text-xs font-medium text-indigo-300">
    {formatNume(sportiv)}
    <button
      type="button"
      onClick={onRemove}
      style={{ touchAction: 'manipulation' }}
      className="text-slate-400 hover:text-red-400 transition-colors leading-none"
    >
      ×
    </button>
  </span>
);

// -----------------------------------------------
// CARD CATEGORIE (expandabil)
// -----------------------------------------------
interface CardCategorieProps {
  cat: CategorieCompetitie;
  sportiviDisponibili: Sportiv[];
  grade: Grad[];
  dreptUri: Map<string, Inlantuire[]>;
  numeClub: string;
  echipa: EchipaFormata;
  onUpdateEchipa: (update: Partial<EchipaFormata>) => void;
  erroare: string | null;
  dataCompetitie: string;
  defaultOpen?: boolean;
}

const CardCategorie: React.FC<CardCategorieProps> = ({
  cat, sportiviDisponibili, grade, dreptUri, numeClub, echipa,
  onUpdateEchipa, erroare, dataCompetitie, defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isPereche = cat.tip_participare === 'pereche';
  const titulariMax = isPereche ? 2 : cat.sportivi_per_echipa_max;
  const titulariMin = isPereche ? 2 : cat.sportivi_per_echipa_min;
  const rezerveMax = isPereche ? 0 : cat.rezerve_max;
  const isMixt = cat.gen === 'Mixt';

  const echipaCompleta = echipa.titulari.length >= titulariMin && echipa.titulari.length <= titulariMax;

  // Badge status header
  const nrTitulari = echipa.titulari.length;
  let badgeCls = 'text-violet-400 bg-violet-900/30 border border-violet-700/50'; // neînceput
  let badgeText = `${sportiviDisponibili.length} eligibili`;
  if (echipa.echipaSkip) {
    badgeCls = 'text-slate-400 bg-slate-700/60 border border-slate-600';
    badgeText = 'Nu participăm';
  } else if (echipaCompleta || echipa.echipaIncompleta) {
    badgeCls = 'text-emerald-400 bg-emerald-900/30 border border-emerald-700/50';
    badgeText = `✓ ${nrTitulari}/${titulariMin} complet`;
  } else if (nrTitulari > 0) {
    badgeCls = 'text-yellow-400 bg-yellow-900/30 border border-yellow-700/50';
    badgeText = `⚠ ${nrTitulari}/${titulariMin} (incompletă)`;
  }

  const getRolSportiv = (sportivId: string): RolEchipa => {
    if (echipa.titulari.includes(sportivId)) return 'titular';
    if (echipa.rezerve.includes(sportivId)) return 'rezerva';
    return 'nu_participa';
  };

  const handleRolChange = (sportivId: string, rol: RolEchipa) => {
    const titulariNoi = echipa.titulari.filter(id => id !== sportivId);
    const rezerveNoi = echipa.rezerve.filter(id => id !== sportivId);
    if (rol === 'titular') {
      if (titulariNoi.length < titulariMax) titulariNoi.push(sportivId);
    } else if (rol === 'rezerva' && !isPereche) {
      if (rezerveNoi.length < rezerveMax) rezerveNoi.push(sportivId);
    }
    onUpdateEchipa({ titulari: titulariNoi, rezerve: rezerveNoi });
  };

  // Program SL/Sincron
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
  const programOptions: Inlantuire[] = gradMinGrade !== null && isSincron
    ? (dreptUri.get(gradMinGrade.id) ?? [])
    : [];
  const slProgAuto: string | null = isPereche && gradMinGrade !== null ? getSLProg(gradMinGrade.ordine) : null;

  // Chips pentru titulari selectați
  const titulariSportivi = echipa.titulari
    .map(id => sportiviDisponibili.find(s => s.id === id))
    .filter((s): s is Sportiv => !!s);

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      isOpen ? 'border-indigo-600/50 bg-indigo-900/5' : 'border-slate-700 bg-slate-800/40'
    }`}>
      {/* Header categorie (clickabil) */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        style={{ touchAction: 'manipulation' }}
        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white leading-tight">
              {cat.denumire ?? `Categoria ${cat.numar_categorie}`}
            </span>
            <BadgeTipParticipare tip={cat.tip_participare} />
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {cat.varsta_max !== null
              ? `${cat.varsta_min}–${cat.varsta_max} ani`
              : `${cat.varsta_min}+ ani`
            }
            {cat.gen !== 'Mixt' ? ` · ${cat.gen}` : ' · Mixt'}
            {' · '}{descrieTipEchipa(cat)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${badgeCls}`}>
            {badgeText}
          </span>
          <svg
            viewBox="0 0 12 12" fill="none"
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* Body (collapse/expand) */}
      {isOpen && (
        <div className="border-t border-slate-700/60">
          {/* Toggle "Nu participăm" */}
          <div className="px-4 py-2.5 border-b border-slate-700/40">
            <button
              type="button"
              onClick={() => onUpdateEchipa({ echipaSkip: !echipa.echipaSkip, titulari: [], rezerve: [] })}
              style={{ touchAction: 'manipulation' }}
              className={`w-full py-2 rounded-lg text-xs font-semibold border transition-colors ${
                echipa.echipaSkip
                  ? 'bg-orange-950/40 border-orange-500 text-orange-300 hover:bg-orange-950/60'
                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-orange-500/50 hover:text-orange-300'
              }`}
            >
              {echipa.echipaSkip ? '↩ Reactiva participarea' : 'Nu participăm la această categorie'}
            </button>
          </div>

          {!echipa.echipaSkip && (
            <>
              {/* Lista sportivi eligibili */}
              {sportiviDisponibili.length === 0 ? (
                <div className="px-4 py-5 text-center text-sm text-slate-500 italic">
                  Niciun sportiv eligibil pentru această categorie.
                </div>
              ) : (
                <div className="divide-y divide-slate-700/40">
                  {sportiviDisponibili.map(sportiv => {
                    const rolCurent = getRolSportiv(sportiv.id);
                    const titulariFull = echipa.titulari.length >= titulariMax && rolCurent !== 'titular';
                    const genderBlocat = rolCurent !== 'titular' && !canAddToTitulari(cat, sportiv.gen, echipa.titulari, sportiviDisponibili);
                    const eligibilitate = verificaEligibilitate(sportiv, cat, grade, dataCompetitie);
                    const ineligibil = !eligibilitate.eligibil;
                    const titulariBlocati = titulariFull || genderBlocat || (ineligibil && rolCurent !== 'titular');
                    const rezerveBlocate = (echipa.rezerve.length >= rezerveMax && rolCurent !== 'rezerva') || (ineligibil && rolCurent !== 'rezerva');
                    const varsta = sportiv.data_nasterii
                      ? calculeazaVarstaLaData(sportiv.data_nasterii, dataCompetitie)
                      : null;
                    const grad = grade.find(g => g.id === sportiv.grad_actual_id);

                    return (
                      <div key={sportiv.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {formatNume(sportiv)}
                          </span>
                          {grad && (
                            <span className="text-[10px] bg-slate-700 rounded px-1.5 py-0.5 text-slate-300">
                              {grad.nume}
                            </span>
                          )}
                          {varsta !== null && (
                            <span className="text-[10px] bg-slate-700 rounded px-1.5 py-0.5 text-slate-300">
                              {varsta} ani
                            </span>
                          )}
                          {ineligibil && (
                            <span
                              className="text-[10px] font-semibold text-orange-400 bg-orange-900/30 border border-orange-700/50 rounded-full px-2 py-0.5"
                              title={eligibilitate.motive.join(' · ')}
                            >
                              Ineligibil
                            </span>
                          )}
                          {genderBlocat && !ineligibil && (
                            <span className="text-[10px] text-yellow-400">
                              {sportiv.gen === 'Masculin' ? 'Trebuie fată mai întâi' : 'Trebuie băiat mai întâi'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRolChange(sportiv.id, rolCurent === 'titular' ? 'nu_participa' : 'titular')}
                            disabled={titulariBlocati}
                            style={{ touchAction: 'manipulation' }}
                            className={`flex-1 sm:flex-none sm:min-w-[80px] py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                              rolCurent === 'titular'
                                ? 'bg-emerald-700 border-emerald-500 text-white'
                                : titulariBlocati
                                  ? 'opacity-30 bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-emerald-500/50'
                            }`}
                          >
                            {rolCurent === 'titular' ? '✓ Titular' : '+ Titular'}
                          </button>
                          {!isPereche && rezerveMax > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRolChange(sportiv.id, rolCurent === 'rezerva' ? 'nu_participa' : 'rezerva')}
                              disabled={rezerveBlocate}
                              style={{ touchAction: 'manipulation' }}
                              className={`flex-1 sm:flex-none sm:min-w-[80px] py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                                rolCurent === 'rezerva'
                                  ? 'bg-sky-700 border-sky-500 text-white'
                                  : rezerveBlocate
                                    ? 'opacity-30 bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-sky-500/50'
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
                              className="px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-800 text-slate-300 hover:text-red-400 hover:border-red-500/50 transition-colors"
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

              {/* Chips membrii selectați */}
              {titulariSportivi.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-700/40 bg-slate-800/20">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Titulari selectați
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {titulariSportivi.map(s => (
                      <ChipSportiv
                        key={s.id}
                        sportiv={s}
                        onRemove={() => handleRolChange(s.id, 'nu_participa')}
                      />
                    ))}
                  </div>
                  {/* Mesaj completitudine */}
                  <p className={`text-xs mt-2 font-medium ${
                    echipaCompleta || echipa.echipaIncompleta ? 'text-emerald-400' : 'text-yellow-400'
                  }`}>
                    {echipaCompleta || echipa.echipaIncompleta
                      ? `Echipă completă (${titulariSportivi.length} sportivi)`
                      : `Incompletă (min ${titulariMin} necesari)`
                    }
                  </p>
                </div>
              )}

              {/* Banner sportiv unic */}
              {sportiviDisponibili.length === 1 && (
                <div className="mx-4 mb-3 rounded-lg border border-amber-600/50 bg-amber-900/20 px-3 py-2.5">
                  <p className="text-xs text-amber-300 mb-2">
                    Echipă incompletă — Poți solicita partener de la alt club.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={echipa.echipaIncompleta ?? false}
                      onChange={e => onUpdateEchipa({ echipaIncompleta: e.target.checked })}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs text-amber-400 font-medium">Solicit partener inter-club</span>
                  </label>
                </div>
              )}

              {/* Program SL / Sincron */}
              {(programOptions.length > 0 || slProgAuto !== null) && (
                <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-800/20">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {isPereche ? 'Program Song Luyen' : 'Program Sincron'}
                  </p>
                  {isPereche && slProgAuto ? (
                    <p className="text-sm text-slate-300">{slProgAuto}</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {programOptions.map(il => (
                        <label key={il.id} className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                          <input
                            type="radio"
                            name={`program-${cat.id}`}
                            value={il.id}
                            checked={echipa.program === il.id}
                            onChange={() => onUpdateEchipa({ program: il.id })}
                            className="accent-indigo-600"
                          />
                          <span className="text-sm text-slate-300">{il.denumire}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {!echipa.program && !slProgAuto && (
                    <p className="text-xs text-yellow-400 mt-1">Program neselecționat</p>
                  )}
                </div>
              )}

              {/* Câmp nume echipă */}
              <div className="px-4 py-3 border-t border-slate-700/60 bg-slate-800/20">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  Nume echipă
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5">
                  <span className="text-sm text-white font-medium shrink-0 truncate max-w-[200px]">{numeClub}</span>
                  <span className="hidden sm:inline text-slate-600">—</span>
                  <input
                    type="text"
                    value={echipa.numeEchipa}
                    onChange={e => onUpdateEchipa({ numeEchipa: e.target.value })}
                    placeholder="suffix opțional..."
                    className="w-full sm:flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Eroare */}
              {erroare && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-lg border border-red-700/40 bg-red-900/20">
                  <p className="text-xs text-red-400">{erroare}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// COMPONENTA PRINCIPALĂ
// -----------------------------------------------

const ProbaEchipeView: React.FC<ProbaEchipeViewProps> = ({
  proba, sportivi, grade, categorii, selectedSportivi,
  numeClub, echipeFormate, onUpdateEchipe, dataCompetitie,
  onBack, onSave, myClubId,
}) => {
  const { showError } = useError();
  const [dreptUri, setDreptUri] = useState<Map<string, Inlantuire[]>>(new Map());
  const [showExcluse, setShowExcluse] = useState(false);

  const info = PROBA_INFO[proba.tip_proba];
  const colorKey = info?.color ?? 'indigo';
  const colors = PROBA_COLOR_CLASSES[colorKey] ?? PROBA_COLOR_CLASSES.indigo;

  // Fetch inlantuiri sincron
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
          for (const row of (data ?? []) as unknown as { grade_id: string; inlantuiri: Inlantuire | null }[]) {
            if (!row.inlantuiri) continue;
            if (!m.has((row as any).grade_id)) m.set((row as any).grade_id, []);
            m.get((row as any).grade_id)!.push(row.inlantuiri);
          }
          setDreptUri(m);
        }
      } catch (err) {
        showError('Incarcare inlantuiri (echipe)', err);
      }
    })();
    return () => { cancelled = true; };
  }, [showError]);

  // Categorii pentru această probă, filtrate per tip_proba
  const categoriiProba = useMemo(() =>
    categorii
      .filter(c => c.proba_id === proba.id && esteEchipaSauPereche(c))
      .sort((a, b) => a.ordine_afisare - b.ordine_afisare),
    [categorii, proba.id]
  );

  const sportiviSelectati = useMemo(
    () => sportivi.filter(s => !myClubId || s.club_id === myClubId),
    [sportivi, myClubId]
  );

  const sportiviDisponibiliPerCategorie = useMemo<Map<string, Sportiv[]>>(() => {
    const map = new Map<string, Sportiv[]>();
    for (const cat of categoriiProba) {
      const disponibili = sportiviSelectati.filter(s =>
        verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil
      );
      map.set(cat.id, disponibili);
    }
    return map;
  }, [categoriiProba, sportiviSelectati, grade, dataCompetitie]);

  const categoriiCuEligibili = categoriiProba.filter(c => (sportiviDisponibiliPerCategorie.get(c.id) ?? []).length > 0);
  const categoriiExcluse = categoriiProba.filter(c => (sportiviDisponibiliPerCategorie.get(c.id) ?? []).length === 0);

  // Init echipeFormate pentru categorii noi
  useEffect(() => {
    if (categoriiProba.length === 0) return;
    const existingIds = new Set(echipeFormate.map(e => e.categorieId));
    const lipsesc = categoriiProba.filter(cat => !existingIds.has(cat.id));
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
  }, [categoriiProba.length, echipeFormate.length]);

  // Auto-excludere categorii cu 0 eligibili
  useEffect(() => {
    const updates: string[] = [];
    for (const cat of categoriiProba) {
      const disponibili = sportiviDisponibiliPerCategorie.get(cat.id) ?? [];
      if (disponibili.length > 0) continue;
      const echipa = echipeFormate.find(e => e.categorieId === cat.id);
      if (!echipa?.echipaSkip) updates.push(cat.id);
    }
    if (updates.length > 0) {
      onUpdateEchipe(echipeFormate.map(e =>
        updates.includes(e.categorieId) ? { ...e, echipaSkip: true, titulari: [], rezerve: [] } : e
      ));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportiviDisponibiliPerCategorie, categoriiProba.length]);

  const getEchipa = useCallback((catId: string): EchipaFormata => {
    return echipeFormate.find(e => e.categorieId === catId) ?? {
      categorieId: catId,
      numeEchipa: '',
      titulari: [],
      rezerve: [],
      echipaIncompleta: false,
    };
  }, [echipeFormate]);

  const handleUpdateEchipa = (catId: string, update: Partial<EchipaFormata>) => {
    const exists = echipeFormate.some(e => e.categorieId === catId);
    if (exists) {
      onUpdateEchipe(echipeFormate.map(e => e.categorieId === catId ? { ...e, ...update } : e));
    } else {
      onUpdateEchipe([...echipeFormate, {
        categorieId: catId, numeEchipa: '', titulari: [], rezerve: [],
        echipaIncompleta: false, ...update,
      }]);
    }
  };

  // Validare
  const eroriPerCategorie = useMemo<Map<string, string>>(() => {
    const erori = new Map<string, string>();
    for (const cat of categoriiCuEligibili) {
      const echipa = getEchipa(cat.id);
      if (echipa.echipaSkip || echipa.echipaIncompleta) continue;
      const isPereche = cat.tip_participare === 'pereche';
      const titMin = isPereche ? 2 : cat.sportivi_per_echipa_min;
      if (echipa.titulari.length < titMin) {
        const necesar = titMin - echipa.titulari.length;
        erori.set(cat.id, `Lipsesc ${necesar} titular${necesar !== 1 ? 'i' : ''} (minim ${titMin})`);
      }
    }
    return erori;
  }, [echipeFormate, categoriiCuEligibili, getEchipa]);

  const poateSalva = eroriPerCategorie.size === 0;

  const nrCompletate = categoriiCuEligibili.filter(cat => {
    const echipa = getEchipa(cat.id);
    if (echipa.echipaSkip || echipa.echipaIncompleta) return true;
    const isPereche = cat.tip_participare === 'pereche';
    const titMin = isPereche ? 2 : cat.sportivi_per_echipa_min;
    return echipa.titulari.length >= titMin;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header nav */}
      <div className="flex items-start gap-3">
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
        </div>
      </div>

      {/* Banner info */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3">
        <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-slate-400">
          <span className="text-white font-semibold">{categoriiCuEligibili.length} categor{categoriiCuEligibili.length === 1 ? 'ie' : 'ii'} disponibile</span>
          {categoriiExcluse.length > 0 && ` · ${categoriiExcluse.length} excluse automat`}
          {nrCompletate > 0 && ` · ${nrCompletate} completate`}
        </p>
      </div>

      {/* Carduri categorii */}
      {categoriiCuEligibili.length === 0 && (
        <div className="text-center text-slate-500 py-10 italic text-sm">
          Nicio categorie cu sportivi eligibili pentru această probă.
        </div>
      )}
      <div className="space-y-3">
        {categoriiCuEligibili.map((cat, idx) => (
          <CardCategorie
            key={cat.id}
            cat={cat}
            sportiviDisponibili={sportiviDisponibiliPerCategorie.get(cat.id) ?? []}
            grade={grade}
            dreptUri={dreptUri}
            numeClub={numeClub}
            echipa={getEchipa(cat.id)}
            onUpdateEchipa={update => handleUpdateEchipa(cat.id, update)}
            erroare={eroriPerCategorie.get(cat.id) ?? null}
            dataCompetitie={dataCompetitie}
            defaultOpen={idx === 0}
          />
        ))}
      </div>

      {/* Categorii excluse (collapsible) */}
      {categoriiExcluse.length > 0 && (
        <div>
          <button
            onClick={() => setShowExcluse(v => !v)}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors py-1"
          >
            <span>{showExcluse ? '▼' : '▶'}</span>
            <span>
              {categoriiExcluse.length} categor{categoriiExcluse.length === 1 ? 'ie exclusă' : 'ii excluse'} automat
            </span>
          </button>
          {showExcluse && (
            <div className="space-y-2 mt-2">
              {categoriiExcluse.map(cat => (
                <div key={cat.id} className="rounded-xl border border-dashed border-slate-600 bg-slate-800/20 opacity-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-400 line-through">
                    {cat.denumire ?? `Categoria ${cat.numar_categorie}`}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">0 sportivi eligibili → Nu concurăm</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Erori globale */}
      {!poateSalva && (
        <div className="rounded-xl border border-red-700/50 bg-red-900/15 px-4 py-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Echipe incomplete:</p>
          {Array.from(eroriPerCategorie.entries()).map(([catId, msg]) => {
            const cat = categoriiProba.find(c => c.id === catId);
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
        <div className="flex items-center gap-3 justify-between">
          <span className="text-xs text-slate-400">
            {poateSalva
              ? `${nrCompletate}/${categoriiCuEligibili.length} categor${nrCompletate === 1 ? 'ie' : 'ii'} configurate`
              : 'Completează echipele înainte de a salva'}
          </span>
          <Button
            variant="success"
            disabled={!poateSalva}
            onClick={poateSalva ? onSave : undefined}
            className="min-w-[160px]"
          >
            {poateSalva
              ? `Salvează ${info?.title ?? proba.tip_proba} ✓`
              : '🔒 Salvează'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProbaEchipeView;
