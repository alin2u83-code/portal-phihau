import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CategorieCompetitie, Sportiv, Grad, EchipaCompetitie, Inlantuire, ProbaCompetitie,
} from '../../../types';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { formatNume } from '../../../utils/formatareSportiv';
import { TIP_PROBA_LABELS } from '../../../utils/competitiiTemplates';
import { STEP_LABELS, ProbaHeader } from './constants';
import { WizardProgress, BadgeTipParticipare, esteEchipaSauPereche, getSLProg } from './shared';
import { EchipaFormata, RolEchipa } from './types';

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
// HELPER gender locking Mixt
// -----------------------------------------------
function canAddToTitulari(cat: CategorieCompetitie, athGen: string | undefined | null, titulari: string[], sportiviPool: Sportiv[]): boolean {
  if (cat.gen !== 'Mixt') return true;
  const nF = titulari.filter(id => sportiviPool.find(s => s.id === id)?.gen === 'Feminin').length;
  const nM = titulari.filter(id => sportiviPool.find(s => s.id === id)?.gen === 'Masculin').length;
  const remaining = cat.sportivi_per_echipa_max - titulari.length;
  if (remaining <= 0) return false;
  if (athGen === 'Masculin') return (remaining - 1) >= Math.max(0, 1 - nF);
  return (remaining - 1) >= Math.max(0, 1 - nM);
}

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

const SectiuneEchipaCategorie: React.FC<SectiuneEchipaCategorieProps> = ({
  cat, sportiviDisponibili, grade, dreptUri, numeClub, echipa, onUpdateEchipa, erroare, dbId,
  onOpenEditEchipa, dataCompetitie, eligibilitateMapCategorie,
}) => {
  const isPereche = cat.tip_participare === 'pereche';
  const titulariMax = isPereche ? 2 : cat.sportivi_per_echipa_max;
  const titulariMin = isPereche ? 2 : cat.sportivi_per_echipa_min;
  const rezerveMax = isPereche ? 0 : cat.rezerve_max;

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

  const isMixt = cat.gen === 'Mixt';
  const nF = echipa.titulari.filter(id => sportiviDisponibili.find(s => s.id === id)?.gen === 'Feminin').length;
  const nM = echipa.titulari.filter(id => sportiviDisponibili.find(s => s.id === id)?.gen === 'Masculin').length;
  const masculinBlocat = isMixt && !canAddToTitulari(cat, 'Masculin', echipa.titulari, sportiviDisponibili);
  const femininBlocat = isMixt && !canAddToTitulari(cat, 'Feminin', echipa.titulari, sportiviDisponibili);

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

      {/* Toggle "Nu participam" */}
      <div className="px-4 py-2.5 border-b border-slate-700/40">
        <button
          type="button"
          onClick={() => onUpdateEchipa({ echipaSkip: !(echipa.echipaSkip ?? false), titulari: [], rezerve: [] })}
          style={{ touchAction: 'manipulation' }}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
            echipa.echipaSkip
              ? 'bg-orange-950/40 border-orange-500 text-orange-300 font-semibold hover:bg-orange-950/60'
              : 'bg-slate-900 border-slate-500 text-slate-300 hover:border-orange-500/50 hover:text-orange-300'
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

      {/* Banner sportiv unic */}
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
            const titulariBlocati = titulariFull || genderBlocat || (ineligibil && rolCurent !== 'titular');
            const rezerveBlocate = (echipa.rezerve.length >= rezerveMax && rolCurent !== 'rezerva') || (ineligibil && rolCurent !== 'rezerva');
            const titularIneligibil = rolCurent === 'titular' && ineligibil;
            const rezervaIneligibil = rolCurent === 'rezerva' && ineligibil;

            return (
              <div key={sportiv.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{formatNume(sportiv)}</span>
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
                {ineligibil && rolCurent === 'nu_participa' && (
                  <p className="text-[10px] text-orange-400/80 leading-snug">
                    {eligibilitate.motive.join(' · ')}
                  </p>
                )}
                {(titularIneligibil || rezervaIneligibil) && (
                  <div className="rounded-md border border-orange-700/40 bg-orange-900/20 px-2 py-1.5">
                    <p className="text-[10px] text-orange-300 leading-snug">
                      ⚠ Sportiv ineligibil in echipa curenta: {eligibilitate.motive.join(' · ')}
                    </p>
                  </div>
                )}
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
                      className="flex-none px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-600 bg-slate-800 text-slate-300 hover:text-red-400 hover:border-red-500/50 active:text-red-400 active:border-red-700/50 transition-colors"
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

      {/* Program SL / Sincron */}
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
          <span className="text-sm text-white font-medium truncate max-w-[140px] sm:max-w-[200px] md:max-w-[240px] shrink-0">{numeClub}</span>
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
export interface Pas3Props {
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  numeClub: string;
  echipeFormate: EchipaFormata[];
  onUpdateEchipe: (next: EchipaFormata[]) => void;
  onContinua: () => void;
  onBack: () => void;
  echipeDB?: EchipaCompetitie[];
  myClubId?: string;
  onOpenEditEchipa?: (categorieId: string) => void;
  dataCompetitie: string;
  probe: ProbaCompetitie[];
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
  probe,
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

  const categoriiEchipa = useMemo<CategorieCompetitie[]>(() =>
    categorii
      .filter(esteEchipaSauPereche)
      .sort((a, b) => a.ordine_afisare - b.ordine_afisare),
    [categorii]
  );

  const sportiviSelectati = useMemo<Sportiv[]>(
    () => sportivi,
    [sportivi]
  );

  const sportiviDisponibiliPerCategorie = useMemo<Map<string, Sportiv[]>>(() => {
    const map = new Map<string, Sportiv[]>();
    for (const cat of categoriiEchipa) {
      // Filtrare completă: gen + vârstă + grad via verificaEligibilitate
      const disponibili = sportiviSelectati.filter(s =>
        verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil
      );
      map.set(cat.id, disponibili);
    }
    return map;
  }, [categoriiEchipa, sportiviSelectati, grade, dataCompetitie]);

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

  // State pentru nr categorii auto-excluse (afișat în banner)
  const [nrCategoriiAutoExcluse, setNrCategoriiAutoExcluse] = React.useState(0);

  /**
   * Auto-excludere categorii cu 0 sportivi eligibili.
   * Rulează după ce sportiviDisponibiliPerCategorie e calculat.
   * Marchează echipaSkip = true și golește titularii/rezervele.
   */
  useEffect(() => {
    if (categoriiEchipa.length === 0) return;
    let autoExcluse = 0;
    const updates: Array<{ catId: string }> = [];

    for (const cat of categoriiEchipa) {
      const disponibili = sportiviDisponibiliPerCategorie.get(cat.id) ?? [];
      if (disponibili.length > 0) continue;

      const echipa = echipeFormate.find(e => e.categorieId === cat.id);
      // Dacă echipa nu e deja skip, o marcăm
      if (!echipa?.echipaSkip) {
        updates.push({ catId: cat.id });
        autoExcluse++;
      } else {
        autoExcluse++;
      }
    }

    if (updates.length > 0) {
      const novaLista = echipeFormate.map(e => {
        if (updates.some(u => u.catId === e.categorieId)) {
          return { ...e, echipaSkip: true, titulari: [], rezerve: [] };
        }
        return e;
      });
      onUpdateEchipe(novaLista);
    }

    setNrCategoriiAutoExcluse(autoExcluse);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportiviDisponibiliPerCategorie, categoriiEchipa.length]);

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
        categorieId: catId,
        numeEchipa: '',
        titulari: [],
        rezerve: [],
        echipaIncompleta: false,
        ...update,
      }]);
    }
  };

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

  const categoriiLimitaAtinsa = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const cat of categoriiEchipa) {
      const limita = cat.max_echipe_per_club ?? 1;
      const existente = echipeActiveClubPerCategorie.get(cat.id) ?? 0;
      if (existente >= limita) s.add(cat.id);
    }
    return s;
  }, [categoriiEchipa, echipeActiveClubPerCategorie]);

  const eroriPerCategorie = useMemo<Map<string, string>>(() => {
    const erori = new Map<string, string>();
    for (const cat of categoriiEchipa) {
      if (categoriiLimitaAtinsa.has(cat.id)) continue;

      const echipa = getEchipa(cat.id);
      const isPereche = cat.tip_participare === 'pereche';
      const titMin = isPereche ? 2 : cat.sportivi_per_echipa_min;

      if (echipa.echipaSkip) continue;
      if (echipa.echipaIncompleta) continue;

      if (echipa.titulari.length < titMin) {
        const necesar = titMin - echipa.titulari.length;
        erori.set(
          cat.id,
          `Lipsesc ${necesar} titular${necesar !== 1 ? 'i' : ''} (minim ${titMin} necesari pentru start)`
        );
        continue;
      }

      const ineligibiliInEchipa = echipa.titulari.filter(id => {
        const elig = eligibilitateMap.get(cat.id)?.get(id);
        if (elig === undefined) {
          const sportivObj = sportiviSelectati.find(s => s.id === id);
          if (!sportivObj) return true;
          return !verificaEligibilitate(sportivObj, cat, grade, dataCompetitie).eligibil;
        }
        return !elig.eligibil;
      });
      if (ineligibiliInEchipa.length > 0) {
        erori.set(cat.id, `${ineligibiliInEchipa.length} titular${ineligibiliInEchipa.length !== 1 ? 'i' : ''} ineligibil${ineligibiliInEchipa.length !== 1 ? 'i' : ''} — scoateți-i din echipă`);
      }
    }
    return erori;
  }, [echipeFormate, categoriiEchipa, categoriiLimitaAtinsa, eligibilitateMap, sportiviSelectati, grade, dataCompetitie, getEchipa]);

  const poateContinua = eroriPerCategorie.size === 0;

  const tipProbeUniceEchipe = useMemo<string[]>(() => {
    const vazute = new Set<string>();
    const lista: string[] = [];
    for (const cat of categoriiEchipa) {
      const tip = probe.find(p => p.id === cat.proba_id)?.tip_proba;
      if (tip && !vazute.has(tip)) {
        vazute.add(tip);
        lista.push(tip);
      }
    }
    return lista;
  }, [categoriiEchipa, probe]);

  const [probaActivaTabEchipe, setProbaActivaTabEchipe] = useState<string>(() => {
    return probe[0]?.tip_proba ?? '';
  });

  const categoriiEchipaFiltrate = useMemo<CategorieCompetitie[]>(() => {
    if (!probaActivaTabEchipe) return categoriiEchipa;
    return categoriiEchipa.filter(cat =>
      probe.find(p => p.id === cat.proba_id)?.tip_proba === probaActivaTabEchipe
    );
  }, [categoriiEchipa, probaActivaTabEchipe, probe]);

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

      {/* Header colorat per tip probă activ */}
      {probaActivaTabEchipe && <ProbaHeader tipProba={probaActivaTabEchipe} />}

      {/* Tabs per tip probă */}
      {tipProbeUniceEchipe.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {tipProbeUniceEchipe.map(tip => (
            <button
              key={tip}
              onClick={() => setProbaActivaTabEchipe(tip)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                probaActivaTabEchipe === tip
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {TIP_PROBA_LABELS[tip as keyof typeof TIP_PROBA_LABELS] ?? tip}
            </button>
          ))}
        </div>
      )}

      {/* Banner categorii auto-excluse */}
      {nrCategoriiAutoExcluse > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-sky-700/50 bg-sky-900/15 px-4 py-3">
          <svg className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-sky-300">
            {nrCategoriiAutoExcluse} categor{nrCategoriiAutoExcluse !== 1 ? 'ii excluse' : 'ie exclusă'} automat — niciun sportiv eligibil selectat pentru aceste categorii.
          </p>
        </div>
      )}

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

      {/* Grid categorii */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
        {categoriiEchipaFiltrate.map(cat => {
          const disponibili = sportiviDisponibiliPerCategorie.get(cat.id) ?? [];
          const echipa = getEchipa(cat.id);
          const erroare = eroriPerCategorie.get(cat.id) ?? null;
          const limita = cat.max_echipe_per_club ?? 1;
          const limitaAtinsa = categoriiLimitaAtinsa.has(cat.id);

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
            onClick={poateContinua ? onContinua : undefined}
            className="min-w-[140px]"
          >
            Înapoi la probe
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pas3FormareEchipe;
