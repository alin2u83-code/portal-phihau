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
  const [selectedSportivi, setSelectedSportivi] = useState<Set<string>>(new Set());

  // Pas2: categorii auto-asignate + quyen ales
  const [autoCategorie, setAutoCategorie] = useState<Map<string, import('../../../types').CategorieCompetitie>>(new Map());
  const [quyenAles, setQuyenAles] = useState<QuyenAlesMap>(new Map());

  // Pas3: echipe formate
  const [echipeFormate, setEchipeFormate] = useState<EchipaFormata[]>([]);

  // Pas2: probe sărite (nu avem concurenți) — propagate la Pas4 pentru filtrare sumar
  const [probeSkippedWizard, setProbeSkippedWizard] = useState<Set<string>>(new Set());

  // Sportivi excluși de la Thao Quyen individual
  const [excludedFromIndividual, setExcludedFromIndividual] = useState<Set<string>>(new Set());

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
    setSelectedSportivi(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
    const currentKey = Array.from(selectedSportivi).sort().join(',');
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
        selected={selectedSportivi}
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
        selectedSportivi={selectedSportivi}
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
        onOpenInscriereModal={(cat) => onOpenInscriereModal?.(cat, () => setStep('hub'))}
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
