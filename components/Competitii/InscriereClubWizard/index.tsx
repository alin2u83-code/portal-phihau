import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { InscriereClubWizardProps, EchipaFormata, QuyenAlesMap } from './types';
import Pas1SelectareSportivi from './Pas1';
import Pas2SelectieQuyen from './Pas2Quyen';
import Pas3FormareEchipe from './Pas3Echipe';
import Pas4SumarTaxe from './Pas4Sumar';
import InscriereClubCards from './InscriereClubCards';

export type { InscriereClubWizardProps };
export type { EchipaFormata, QuyenAlesMap };
export type { PickCategorie, IndivPicks } from './types';

const InscriereClubWizard: React.FC<InscriereClubWizardProps> = ({
  competitie, probe, categorii, sportivi, grade,
  inscrieri, echipe, clubId, numeClub, vizeSportivi, myClubId, onBack, onSaved,
  onOpenEditEchipa, onOpenInscriereModal,
}) => {
  // step: 'hub'=carduri probe, 1=selectare sportivi (doar quyen), 2=quyen, 3=echipe/giao_dau, 4=sumar
  const [step, setStep] = useState<1 | 'hub' | 2 | 3 | 4>('hub');
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
  const [autoCategorie, setAutoCategorie] = useState<Map<string, import('../../../types').CategorieCompetitie>>(new Map());
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
      if (i.club_id !== clubId || i.status === 'retras') return false;
      const cat = catMap.get(i.categorie_id);
      return cat && probeIndivIds.has(cat.proba_id ?? '');
    });
    if (inscrieriIndiv.length === 0) return;
    initializedFromInscrieri.current = true;
    const newAuto = new Map<string, import('../../../types').CategorieCompetitie>();
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
    setSelectedSportiviMap(prev => prev.size > 0 ? prev : newSelectedMap);
  }, [inscrieri, categorii, probe, clubId]);

  const handleToggleExclus = useCallback((sportivId: string) => {
    setExcludedFromIndividual(prev => {
      const next = new Set(prev);
      if (next.has(sportivId)) next.delete(sportivId);
      else next.add(sportivId);
      return next;
    });
  }, []);

  // Fetch echipe salvate în BD la mount pentru editare
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
    })();
  }, []); // run once on mount

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
    const m = new Map<string, import('../../../types').CategorieCompetitie>();
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
        onContinua={handlePas1Continua}
        onBack={() => setStep('hub')}
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
        sportivi={sportivi}
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
          // Calculează probe skipped înainte de a merge la sumar — doar probe individuale
          const activeProbeIds = new Set<string>();
          autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
          const probeIndividuale = probe.filter(p =>
            p.tip_proba === 'thao_quyen_individual' || p.tip_proba === 'thao_lo_individual'
          );
          setProbeSkippedWizard(new Set(probeIndividuale.filter(p => !activeProbeIds.has(p.id)).map(p => p.id)));
          setStep(4);
        }}
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
        selectedSportivi={selectedSportiviMap.get(probaDeschisFocusId ?? '') ?? new Set()}
        autoCategorie={autoCategorie}
        quyenAles={quyenAles}
        onUpdateQuyenAles={setQuyenAles}
        varsteCompetitie={varsteCompetitie}
        onContinua={() => {
          const activeProbeIds = new Set<string>();
          autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
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
        sportivi={sportivi}
        grade={grade}
        dataCompetitie={competitie.data_inceput}
        competitieId={competitie.id}
        clubSolicitantId={clubId}
        skippedCategorii={skippedCategorii}
        onToggleSkipCategorie={(catId) => setSkippedCategorii(prev => {
          const next = new Set(prev);
          if (next.has(catId)) next.delete(catId); else next.add(catId);
          return next;
        })}
        onOpenInscriereModal={(cat) => onOpenInscriereModal?.(cat)}
        onBack={() => setStep('hub')}
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
      onBack={() => setStep('hub')}
      onSaved={onSaved}
    />
  );
};

export default InscriereClubWizard;
