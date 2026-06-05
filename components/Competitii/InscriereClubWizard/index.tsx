import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { InscriereClubWizardProps, EchipaFormata, QuyenAlesMap } from './types';
import { esteEchipaSauPereche } from './shared';
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
  onOpenEditEchipa,
}) => {
  // step: 1=selectare sportivi, 'hub'=carduri probe, 2=quyen individual, 3=echipe, 4=sumar
  const [step, setStep] = useState<1 | 'hub' | 2 | 3 | 4>(1);
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

  // Ref pentru a urmări ultimul set de sportivi pentru care s-a calculat autoCategorie
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
    setStep('hub');
  };

  /**
   * Din hub, utilizatorul deschide o probă:
   * - probă individuală (thao_quyen / thao_lo / giao_dau) → Pas2
   * - probă echipă (song_luyen / sincron) → Pas3
   */
  const handleDeschideProba = useCallback((probaId: string) => {
    setProbaDeschisFocusId(probaId);
    const proba = probe.find(p => p.id === probaId);
    if (!proba) return;
    const isEchipa = categorii.some(c => c.proba_id === probaId && esteEchipaSauPereche(c));
    if (isEchipa) {
      setStep(3);
    } else {
      setStep(2);
    }
  }, [probe, categorii]);

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
        onBack={() => setStep(1)}
        onSaved={onSaved}
        // props suplimentare hub
        selectedSportivi={selectedSportivi}
        autoCategorie={autoCategorie}
        quyenAles={quyenAles}
        echipeFormate={echipeFormate}
        probeSkipped={probeSkippedWizard}
        excludedFromIndividual={excludedFromIndividual}
        onDeschideProba={handleDeschideProba}
        onFinalizare={() => {
          // Calculează probe skipped înainte de a merge la sumar
          const activeProbeIds = new Set<string>();
          autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
          setProbeSkippedWizard(new Set(probe.filter(p => !activeProbeIds.has(p.id)).map(p => p.id)));
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
        onContinua={() => {
          const activeProbeIds = new Set<string>();
          autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
          setProbeSkippedWizard(new Set(probe.filter(p => !activeProbeIds.has(p.id)).map(p => p.id)));
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
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        selectedSportivi={selectedSportivi}
        numeClub={numeClub}
        echipeFormate={echipeFormate}
        onUpdateEchipe={setEchipeFormate}
        onContinua={() => setStep('hub')}
        onBack={() => setStep('hub')}
        echipeDB={echipe}
        myClubId={myClubId}
        dataCompetitie={competitie.data_inceput}
        probe={probe}
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
