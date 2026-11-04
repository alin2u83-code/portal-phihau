import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { verificaEligibilitate, gradEfectivLaData } from '../../../utils/eligibilitateCompetitie';
import type { CategorieCompetitie, Sportiv } from '../../../types';
import { ConfirmModal } from '../../ui';
import { InscriereClubWizardProps, EchipaFormata, QuyenAlesMap, ArmeAlese, FormaPerArma, CategoriePerArma } from './types';
import { categoriePentruArma } from '../../../utils/armeCvd';
import { retrageInscrieri } from './retrage';
import Pas2Arme from './Pas2Arme';
import PasArme from './PasArme';
import Pas1SelectareSportivi from './Pas1';
import Pas2SelectieQuyen from './Pas2Quyen';
import Pas3FormareEchipe from './Pas3Echipe';
import Pas4SumarTaxe from './Pas4Sumar';
import InscriereClubCards from './InscriereClubCards';
import { esteInscrisActiv } from './shared';
import type { ItemDeRezolvat } from './BannerDeRezolvat';
import { calculeazaLipsuriCvd } from '../../../utils/armeCvdLipsuri';
import { formatNume } from '../../../utils/formatareSportiv';
import { useError } from '../../ErrorProvider';

export type { InscriereClubWizardProps };
export type { EchipaFormata, QuyenAlesMap };
export type { PickCategorie, IndivPicks } from './types';

const InscriereClubWizardInner: React.FC<InscriereClubWizardProps> = ({
  competitie, probe, categorii, sportivi, grade,
  inscrieri, echipe, clubId, numeClub, vizeSportivi, myClubId, onBack, onSaved,
  onOpenEditEchipa, onOpenInscriereModal, onEchipeRefresh, arme, canEdit = false, onViewSportiv, interclubDezactivat,
}) => {
  const { showError } = useError();
  // step: 'hub'=carduri probe, 1=selectare sportivi (doar quyen), 2=quyen, 3=echipe/giao_dau, 4=sumar
  const [step, setStep] = useState<'hub' | 'arme' | 1 | 2 | 3 | 4>('hub');
  // CVD: armele alese per sportiv, semanate o singura data din useArmeCvd (nu suprascrie editarile)
  const [armeAlese, setArmeAlese] = useState<ArmeAlese>(new Map());
  useEffect(() => {
    if (arme && !arme.loading && armeAlese.size === 0 && arme.competitieArme.size > 0) setArmeAlese(new Map(arme.competitieArme));
  }, [arme, armeAlese.size]);
  // CVD: forma aleasa per (sportiv, arma), semanata din inscrieri (nu suprascrie editarile)
  const [formaPerArma, setFormaPerArma] = useState<FormaPerArma>(new Map());
  useEffect(() => {
    if (competitie.tip !== 'cvd') return;
    const seed: FormaPerArma = new Map();
    for (const i of inscrieri) {
      if (i.club_id !== clubId || !i.arma_id || !i.inlantuire_id || !esteInscrisActiv(i)) continue;
      if (!seed.has(i.sportiv_id)) seed.set(i.sportiv_id, new Map());
      seed.get(i.sportiv_id)!.set(i.arma_id, i.inlantuire_id);
    }
    if (seed.size > 0) setFormaPerArma(prev => prev.size > 0 ? prev : seed);
  }, [inscrieri, clubId, competitie.tip]);
  // Proba deschisă din hub (pentru Pas2 / Pas3)
  const [probaDeschisFocusId, setProbaDeschisFocusId] = useState<string | null>(null);
  // Selecție per probă — fiecare probă individuală își ține propriul Set<sportiviId>
  const [selectedSportiviMap, setSelectedSportiviMap] = useState<Map<string, Set<string>>>(new Map());
  // Set merged pentru componente care nu disting proba (Pas4, InscriereClubCards, computeAutoCategorie)
  const selectedSportivi = useMemo(() => {
    const merged = new Set<string>();
    for (const set of selectedSportiviMap.values()) for (const id of set) merged.add(id);
    return merged;
  }, [selectedSportiviMap]);

  // Pas2: categorii auto-asignate + quyen ales
  const [autoCategorie, setAutoCategorie] = useState<Map<string, CategorieCompetitie>>(new Map());
  const [quyenAles, setQuyenAles] = useState<QuyenAlesMap>(new Map());

  // Pas3: echipe formate
  const [echipeFormate, setEchipeFormate] = useState<EchipaFormata[]>([]);

  // Pas2: probe sărite (nu avem concurenți) — propagate la Pas4 pentru filtrare sumar
  const [probeSkippedWizard, setProbeSkippedWizard] = useState<Set<string>>(new Set());

  // Sportivi excluși de la Thao Quyen individual
  const [excludedFromIndividual, setExcludedFromIndividual] = useState<Set<string>>(new Set());

  // Categorii marcate explicit "Nu participăm" (song_luyen/sincron)
  const [skippedCategorii, setSkippedCategorii] = useState<Set<string>>(new Set());

  // Ref pentru inițializare din inscrieri existente (rulează o singură dată)
  const initializedFromInscrieri = React.useRef(false);

  // P1: reconstruiește selectedSportivi + autoCategorie + quyenAles din inscrieri existente
  useEffect(() => {
    if (initializedFromInscrieri.current || inscrieri.length === 0) return;
    const probeIndivIds = new Set(
      probe.filter(p => p.tip_proba === 'thao_quyen_individual' || p.tip_proba === 'thao_lo_individual').map(p => p.id)
    );
    const catMap = new Map(categorii.filter(c => c.tip_participare === 'individual').map(c => [c.id, c]));
    const inscrieriIndiv = inscrieri.filter(i => {
      if (i.club_id !== clubId || !esteInscrisActiv(i)) return false;
      const cat = catMap.get(i.categorie_id);
      return cat && probeIndivIds.has(cat.proba_id ?? '');
    });
    if (inscrieriIndiv.length === 0) return;
    initializedFromInscrieri.current = true;
    const newAuto = new Map<string, CategorieCompetitie>();
    const newQuyen = new Map<string, { q1: string; q2: string }>();
    const newSelectedMap = new Map<string, Set<string>>();
    for (const ins of inscrieriIndiv) {
      const cat = catMap.get(ins.categorie_id)!;
      newAuto.set(ins.sportiv_id, cat);
      if (ins.inlantuire_id) newQuyen.set(ins.sportiv_id, { q1: ins.inlantuire_id, q2: ins.inlantuire_id_2 ?? '' });
      const probaId = cat.proba_id ?? '';
      if (!newSelectedMap.has(probaId)) newSelectedMap.set(probaId, new Set());
      newSelectedMap.get(probaId)!.add(ins.sportiv_id);
    }
    setAutoCategorie(prev => prev.size > 0 ? prev : newAuto);
    setQuyenAles(prev => prev.size > 0 ? prev : newQuyen);
    // start gol — nu pre-selectăm sportivii din înscrieri existente (utilizatorul alege explicit)
  }, [inscrieri, categorii, probe, clubId]);

  const handleToggleExclus = useCallback((sportivId: string) => {
    setExcludedFromIndividual(prev => {
      const next = new Set(prev);
      if (next.has(sportivId)) next.delete(sportivId);
      else next.add(sportivId);
      return next;
    });
  }, []);

  // Fetch echipe din BD — la mount și la revenire în hub/pas4 (Pas3 salvează direct în DB)
  useEffect(() => {
    if (step !== 'hub' && step !== 4) return;
    if (!clubId || !competitie?.id) return;
    let cancelled = false;
    (async () => {
      const { data: echipeDB } = await supabase
        .from('echipe_competitie')
        .select('id, categorie_id, denumire_echipa, inlantuire_id, echipa_incompleta, echipa_sportivi(sportiv_id, rol)')
        .eq('competitie_id', competitie.id)
        .eq('club_id', clubId)
        .neq('status', 'retrasa');
      if (cancelled || !echipeDB) return;
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
        armaId: e.arma_id ?? undefined,
      }));
      setEchipeFormate(initiale);
    })();
    return () => { cancelled = true; };
  }, [step, clubId, competitie?.id, numeClub]);

  // Vârstele individuale prezente în competiție (din toate categoriile)
  const varsteCompetitie = useMemo(() => {
    const set = new Set<number>();
    for (const cat of categorii) {
      const min = cat.varsta_min ?? 0;
      const max = cat.varsta_max ?? 80;
      for (let v = min; v <= Math.min(max, 80); v++) set.add(v);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [categorii]);

  // Ref pentru a urmări ultimul set de sportivi pentru care s-a calculat autoCategorie
  const lastComputedSportiviRef = React.useRef<string>('');

  // Retrage (șterge) înscrierile sportivului pe proba deschisă — folosit din Pas1 (tehnică / individual)
  const handleRetrageInscriere = async (sportivId: string) => {
    const catIds = new Set(categorii.filter(c => c.proba_id === probaDeschisFocusId).map(c => c.id));
    const randuri = inscrieri.filter(i => i.sportiv_id === sportivId && i.club_id === clubId && esteInscrisActiv(i) && catIds.has(i.categorie_id));
    if (randuri.length === 0) return;
    const rez = await retrageInscrieri(randuri);
    if (!rez.ok) {
      showError('Retragere înscriere', rez.mesaj ?? '');
      if (rez.partial) await onEchipeRefresh?.();
      return;
    }
    setAutoCategorie(prev => { const m = new Map(prev); m.delete(sportivId); return m; });
    setQuyenAles(prev => { const m = new Map(prev); m.delete(sportivId); return m; });
    // scoate sportivul și din selecția probei deschise, altfel Pas4 l-ar reînscrie
    setSelectedSportiviMap(prev => {
      const set = prev.get(probaDeschisFocusId ?? '');
      if (!set?.has(sportivId)) return prev;
      const m = new Map(prev);
      const nou = new Set(set); nou.delete(sportivId);
      m.set(probaDeschisFocusId ?? '', nou);
      return m;
    });
    await onEchipeRefresh?.();
  };

  // Doar sportivii activi pentru pașii 2-4 și hub; Pas1 primește și inactivii deja înscriși (ca să-i poată retrage)
  const sportiviActivi = useMemo(() => sportivi.filter(s => s.status === 'Activ'), [sportivi]);

  // CVD: categoria potrivita pentru fiecare (sportiv, arma aleasa)
  const categoriePerArma = useMemo<CategoriePerArma>(() => {
    const out: CategoriePerArma = new Map();
    if (competitie.tip !== 'cvd' || !arme || armeAlese.size === 0) return out;
    const armePeId = new Map(arme.arme.map(a => [a.id, a]));
    for (const s of sportiviActivi) {
      const alese = armeAlese.get(s.id);
      if (!alese || alese.size === 0) continue;
      const ordine = gradEfectivLaData(s, grade, competitie.data_inceput)?.ordine ?? 0;
      const m = new Map<string, CategorieCompetitie>();
      for (const armaId of alese) {
        const arma = armePeId.get(armaId);
        const cat = arma && categoriePentruArma(arma, s, ordine, competitie.data_inceput, categorii, arme.arme);
        if (cat) m.set(armaId, cat);
      }
      out.set(s.id, m);
    }
    return out;
  }, [competitie.tip, competitie.data_inceput, arme, armeAlese, sportiviActivi, grade, categorii]);

  // formele se semnaleaza abia dupa ce utilizatorul a vizitat Pas2 (acolo se auto-aleg optiunile unice)
  const [pas2Vizitat, setPas2Vizitat] = useState(false);
  useEffect(() => { if (step === 2) setPas2Vizitat(true); }, [step]);

  // CVD: lipsurile (nesetat) cu buton de salt direct la zona de rezolvare
  const bannerLipsuri = useMemo<ItemDeRezolvat[]>(() => {
    if (competitie.tip !== 'cvd' || !arme || arme.loading) return [];
    // doar proba individuala CVD (thao_lo): selectati acolo sau deja inscrisi cu arma; Giao Dau si armele implicite nu se semnaleaza
    const probaLo = probe.find(p => p.tip_proba === 'thao_lo_individual');
    const selectatiLo = (probaLo && selectedSportiviMap.get(probaLo.id)) || new Set<string>();
    const catLo = new Set(categorii.filter(c => c.proba_id === probaLo?.id).map(c => c.id));
    const inscrisi = new Set(inscrieri.filter(i => i.club_id === clubId && esteInscrisActiv(i) && i.arma_id && catLo.has(i.categorie_id)).map(i => i.sportiv_id));
    const relevanti = sportiviActivi.filter(s => selectatiLo.has(s.id) || inscrisi.has(s.id));
    const armePeId = new Map(arme.arme.map(a => [a.id, a]));
    const catPeId = new Map(categorii.map(c => [c.id, c]));
    const echipeFaraArma = echipe
      .filter(e => e.club_id === clubId && !e.arma_id && (e.status === 'inscrisa' || e.status === 'confirmata'))
      .map(e => ({ e, cat: catPeId.get(e.categorie_id) }))
      .filter(x => probe.find(p => p.id === x.cat?.proba_id)?.tip_proba === 'song_luyen')
      .map(x => ({ id: x.e.id, denumire: x.e.denumire_echipa ?? x.cat?.denumire ?? 'Song Luyen', categorieId: x.e.categorie_id, categorieArma: x.cat?.arma, probaId: x.cat?.proba_id ?? undefined }));
    const lipsuri = calculeazaLipsuriCvd({
      sportivi: relevanti, grade, dataCompetitie: competitie.data_inceput, armeAlese, categoriePerArma, formaPerArma, verificaForme: pas2Vizitat,
      denumireArma: id => armePeId.get(id)?.denumire ?? 'armă', nume: formatNume, echipeFaraArma,
    });
    const sportivPeId = new Map(relevanti.map(s => [s.id, s]));
    return lipsuri.map(l => {
      const baza = { id: l.id, text: l.text };
      if (l.tip === 'fara-arma' || l.tip === 'fara-categorie') return { ...baza, actiune: 'Mergi la Arme', onClick: () => setStep('arme') };
      if (l.tip === 'fara-forma') {
        // nu se adauga niciodata un sportiv in selectie: Pas2 doar pentru cei deja selectati, altfel Pas1
        const sel = !!probaLo && !!l.sportivId && selectatiLo.has(l.sportivId);
        return { ...baza, actiune: sel ? 'Mergi la Pas 2' : 'Mergi la Pas 1', onClick: () => { setProbaDeschisFocusId(probaLo?.id ?? null); setStep(sel ? 2 : 1); } };
      }
      if (l.tip === 'fara-date') return { ...baza, actiune: 'Deschide profilul', onClick: () => { const s = sportivPeId.get(l.sportivId!); if (s) onViewSportiv?.(s); } };
      return { ...baza, actiune: 'Mergi la Echipe', onClick: () => { setProbaDeschisFocusId(l.probaId ?? null); setStep(3); } };
    });
  }, [competitie.tip, competitie.data_inceput, arme, inscrieri, clubId, sportiviActivi, selectedSportivi, armeAlese, categorii, echipe, probe, grade,
    categoriePerArma, formaPerArma, selectedSportiviMap, onViewSportiv, pas2Vizitat]);

  const handleToggle = (id: string) => {
    if (!probaDeschisFocusId) return;
    const probaId = probaDeschisFocusId;
    setSelectedSportiviMap(prev => {
      const newMap = new Map(prev);
      const set = new Set(newMap.get(probaId) ?? []);
      if (set.has(id)) set.delete(id); else set.add(id);
      newMap.set(probaId, set);
      return newMap;
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
    const currentProbaSet = selectedSportiviMap.get(probaDeschisFocusId ?? '') ?? new Set();
    const currentKey = Array.from(currentProbaSet).sort().join(',');
    if (currentKey !== lastComputedSportiviRef.current) {
      computeAutoCategorie();
      lastComputedSportiviRef.current = currentKey;
    }
    setStep(2);
  };

  /**
   * Din hub, utilizatorul deschide o probă:
   * - thao_quyen_individual / thao_lo_individual → Pas1 (selectare sportivi) → Pas2 (quyen)
   * - orice altceva (song_luyen, sincron, giao_dau) → Pas3 direct (toți sportivii activi, per categorie)
   */
  // Probe în care clubul are deja înscrieri în DB — nu se marchează "skipped" automat la finalizare
  const probeCuInscrieriDB = useMemo(() => {
    const catProba = new Map(categorii.map(c => [c.id, c.proba_id]));
    const ids = new Set<string>();
    for (const i of inscrieri) {
      if (i.club_id !== clubId || !esteInscrisActiv(i)) continue;
      const pid = catProba.get(i.categorie_id);
      if (pid) ids.add(pid);
    }
    return ids;
  }, [inscrieri, categorii, clubId]);

  const handleDeschideProba = useCallback((probaId: string) => {
    setProbaDeschisFocusId(probaId);
    const proba = probe.find(p => p.id === probaId);
    if (!proba) return;
    const isIndividualQuyen =
      proba.tip_proba === 'thao_quyen_individual' ||
      proba.tip_proba === 'thao_lo_individual';
    setStep(isIndividualQuyen ? 1 : 3);
  }, [probe]);

  if (step === 1) {
    return (
      <Pas1SelectareSportivi
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii.filter(c => c.proba_id === probaDeschisFocusId)}
        inscrieri={inscrieri}
        vizeSportivi={vizeSportivi}
        selected={selectedSportiviMap.get(probaDeschisFocusId ?? '') ?? new Set()}
        myClubId={myClubId}
        varsteCompetitie={varsteCompetitie}
        onToggle={handleToggle}
        onRetrage={handleRetrageInscriere}
        onContinua={handlePas1Continua}
        onBack={() => setStep('hub')}
        cvd={competitie.tip === 'cvd' && !!arme}
        armeEroare={arme?.error}
        armeAlese={armeAlese}
        onMergiLaArme={() => setStep('arme')}
        bannerLipsuri={bannerLipsuri}
      />
    );
  }

  if (step === 'arme' && arme) {
    return (
      <PasArme
        competitie={competitie}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        inscrieri={inscrieri}
        armeAlese={armeAlese}
        onChange={setArmeAlese}
        canEdit={canEdit}
        onInscrieriRefresh={onEchipeRefresh}
        arme={arme}
        onContinua={() => setStep('hub')}
        onBack={() => setStep('hub')}
        bannerLipsuri={bannerLipsuri}
      />
    );
  }

  if (step === 'hub') {
    return (
      <InscriereClubCards
        // props InscriereClubWizardProps
        competitie={competitie}
        probe={probe}
        categorii={categorii}
        sportivi={sportiviActivi}
        grade={grade}
        inscrieri={inscrieri}
        echipe={echipe}
        clubId={clubId}
        numeClub={numeClub}
        vizeSportivi={vizeSportivi}
        myClubId={myClubId}
        onBack={onBack}
        onSaved={onSaved}
        onOpenInscriereModal={onOpenInscriereModal}
        // props suplimentare hub
        armeAlese={arme ? armeAlese : undefined}
        nrSportiviClub={sportiviActivi.length}
        armeLoading={arme?.loading}
        onDeschideArme={arme ? () => setStep('arme') : undefined}
        bannerLipsuri={bannerLipsuri}
        categoriePerArma={categoriePerArma}
        formaPerArma={formaPerArma}
        selectedSportivi={selectedSportivi}
        autoCategorie={autoCategorie}
        quyenAles={quyenAles}
        echipeFormate={echipeFormate}
        probeSkipped={probeSkippedWizard}
        excludedFromIndividual={excludedFromIndividual}
        skippedCategorii={skippedCategorii}
        onToggleSkipProba={(probaId) => setProbeSkippedWizard(prev => {
          const next = new Set(prev);
          if (next.has(probaId)) next.delete(probaId); else next.add(probaId);
          return next;
        })}
        onDeschideProba={handleDeschideProba}
        onFinalizare={() => {
          const activeProbeIds = new Set<string>();
          autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
          probeCuInscrieriDB.forEach(id => activeProbeIds.add(id));
          const probeIndividuale = probe.filter(p =>
            p.tip_proba === 'thao_quyen_individual' || p.tip_proba === 'thao_lo_individual'
          );
          const autoSkipped = new Set(probeIndividuale.filter(p => !activeProbeIds.has(p.id)).map(p => p.id));
          // Merge: păstrează probe marcate manual (sincron/song_luyen) + adaugă individuale fără sportivi
          setProbeSkippedWizard(prev => {
            const merged = new Set(prev);
            for (const id of autoSkipped) merged.add(id);
            return merged;
          });
          setStep(4);
        }}
      />
    );
  }

  if (step === 2 && competitie.tip === 'cvd' && arme) {
    const selectate = selectedSportiviMap.get(probaDeschisFocusId ?? '') ?? new Set<string>();
    return (
      <Pas2Arme
        competitie={competitie}
        sportivi={sportiviActivi.filter(s => selectate.has(s.id))}
        grade={grade}
        categorii={categorii}
        arme={arme.arme}
        armeAlese={armeAlese}
        categoriePerArma={categoriePerArma}
        formaPerArma={formaPerArma}
        inscrieri={inscrieri}
        onChange={setFormaPerArma}
        onContinua={() => setStep('hub')}
        onBack={() => setStep('hub')}
        bannerLipsuri={bannerLipsuri}
      />
    );
  }

  if (step === 2) {
    return (
      <Pas2SelectieQuyen
        competitie={competitie}
        sportivi={sportiviActivi}
        grade={grade}
        categorii={categorii}
        selectedSportivi={selectedSportiviMap.get(probaDeschisFocusId ?? '') ?? new Set()}
        autoCategorie={autoCategorie}
        quyenAles={quyenAles}
        onUpdateQuyenAles={setQuyenAles}
        varsteCompetitie={varsteCompetitie}
        onContinua={() => {
          const activeProbeIds = new Set<string>();
          autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
          probeCuInscrieriDB.forEach(id => activeProbeIds.add(id));
          const probeIndividuale = probe.filter(p =>
            p.tip_proba === 'thao_quyen_individual' || p.tip_proba === 'thao_lo_individual'
          );
          setProbeSkippedWizard(new Set(probeIndividuale.filter(p => !activeProbeIds.has(p.id)).map(p => p.id)));
          setStep('hub');
        }}
        onBack={() => setStep('hub')}
        excludedFromIndividual={excludedFromIndividual}
        onToggleExclus={handleToggleExclus}
      />
    );
  }

  if (step === 3) {
    return (
      <Pas3FormareEchipe
        categorii={categorii.filter(c => c.proba_id === probaDeschisFocusId)}
        probe={probe}
        echipe={echipe}
        clubId={clubId}
        sportivi={sportiviActivi}
        grade={grade}
        dataCompetitie={competitie.data_inceput}
        competitieId={competitie.id}
        clubSolicitantId={clubId}
        inscrieri={inscrieri}
        armeAlese={arme ? armeAlese : undefined}
        armeDefinitii={arme && !arme.loading ? arme.arme : undefined}
        skippedCategorii={skippedCategorii}
        onToggleSkipCategorie={(catId) => setSkippedCategorii(prev => {
          const next = new Set(prev);
          if (next.has(catId)) next.delete(catId); else next.add(catId);
          return next;
        })}
        onOpenInscriereModal={(cat) => onOpenInscriereModal?.(cat)}
        onEchipeRefresh={onEchipeRefresh}
        interclubDezactivat={interclubDezactivat}
        onBack={() => setStep('hub')}
      />
    );
  }

  return (
    <Pas4SumarTaxe
      interclubDezactivat={interclubDezactivat}
      competitie={competitie}
      // lista lată: sumarul afișează și înscrierile salvate ale inactivilor (altfel dispar din total)
      sportivi={sportivi}
      grade={grade}
      categorii={categorii}
      selectedSportivi={selectedSportivi}
      autoCategorie={autoCategorie}
      quyenAles={quyenAles}
      echipeFormate={echipeFormate}
      probeSkipped={probeSkippedWizard}
      skippedCategorii={skippedCategorii}
      excludedFromIndividual={excludedFromIndividual}
      categoriePerArma={categoriePerArma}
      formaPerArma={formaPerArma}
      arme={arme?.arme}
      bannerLipsuri={bannerLipsuri}
      clubId={clubId}
      numeClub={numeClub}
      inscrieri={inscrieri}
      onBack={() => setStep('hub')}
      onSaved={onSaved}
    />
  );
};

// Profilul sportivului demonteaza wizardul: confirmare inainte de a pierde modificarile nesalvate
const InscriereClubWizard: React.FC<InscriereClubWizardProps> = (props) => {
  const [deschideProfil, setDeschideProfil] = useState<Sportiv | null>(null);
  return (
    <>
      <InscriereClubWizardInner {...props} onViewSportiv={props.onViewSportiv ? setDeschideProfil : undefined} />
      <ConfirmModal
        isOpen={deschideProfil !== null}
        onClose={() => setDeschideProfil(null)}
        onConfirm={() => { const s = deschideProfil; setDeschideProfil(null); if (s) props.onViewSportiv?.(s); }}
        title="Deschide profilul"
        message="Modificările nesalvate din înscriere (arme, forme, selecții) se pierd la deschiderea profilului. Continui?"
        confirmLabel="Deschide profilul"
      />
    </>
  );
};

export default InscriereClubWizard;
