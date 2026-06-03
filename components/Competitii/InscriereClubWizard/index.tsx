import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { InscriereClubWizardProps, EchipaFormata, QuyenAlesMap } from './types';
import { esteEchipaSauPereche } from './shared';
import InscriereClubCards from './InscriereClubCards';
import ProbaIndividualaView from './ProbaIndividualaView';
import ProbaEchipeView from './ProbaEchipeView';
import Pas4SumarTaxe from './Pas4Sumar';

export type { InscriereClubWizardProps };
export type { EchipaFormata, QuyenAlesMap };
export type { PickCategorie, IndivPicks } from './types';

// -----------------------------------------------
// NAVIGARE NOUĂ — hub-first, fără pași numerici globali
// -----------------------------------------------
type NavState =
  | { view: 'hub' }
  | { view: 'proba-individuala'; probaId: string }
  | { view: 'proba-echipe'; probaId: string }
  | { view: 'sumar' };

const InscriereClubWizard: React.FC<InscriereClubWizardProps> = ({
  competitie, probe, categorii, sportivi, grade,
  inscrieri, echipe, clubId, numeClub, vizeSportivi, myClubId, onBack, onSaved,
  onOpenEditEchipa,
}) => {
  const [nav, setNav] = useState<NavState>({ view: 'hub' });

  // Sportivi selectați global (uniți din toate probele)
  const [selectedSportivi, setSelectedSportivi] = useState<Set<string>>(new Set());

  // Categorii auto-asignate per sportiv (pentru probe individuale)
  const [autoCategorie, setAutoCategorie] = useState<Map<string, import('../../../types').CategorieCompetitie>>(new Map());

  // Quyen ales per sportiv
  const [quyenAles, setQuyenAles] = useState<QuyenAlesMap>(new Map());

  // Echipe formate per categorie
  const [echipeFormate, setEchipeFormate] = useState<EchipaFormata[]>([]);

  // Probe skipped (fără concurenți)
  const [probeSkipped, setProbeSkipped] = useState<Set<string>>(new Set());

  // Sportivi excluși de la probe individuale
  const [excludedFromIndividual, setExcludedFromIndividual] = useState<Set<string>>(new Set());

  const handleToggleExclus = useCallback((sportivId: string) => {
    setExcludedFromIndividual(prev => {
      const next = new Set(prev);
      if (next.has(sportivId)) next.delete(sportivId);
      else next.add(sportivId);
      return next;
    });
  }, []);

  // Fetch echipe salvate în BD la mount
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

  // Compute autoCategorie: pentru fiecare sportiv selectat → prima categorie individuală eligibilă
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

  // Re-compute autoCategorie când selectedSportivi se schimbă
  const lastComputedKey = React.useRef<string>('');
  useEffect(() => {
    const currentKey = Array.from(selectedSportivi).sort().join(',');
    if (currentKey !== lastComputedKey.current) {
      computeAutoCategorie();
      lastComputedKey.current = currentKey;
    }
  }, [selectedSportivi, computeAutoCategorie]);

  // Probe skipped calculation
  const calcProbeSkipped = useCallback(() => {
    const activeProbeIds = new Set<string>();
    autoCategorie.forEach((cat) => { if (cat.proba_id) activeProbeIds.add(cat.proba_id); });
    return new Set(probe.filter(p => !activeProbeIds.has(p.id)).map(p => p.id));
  }, [autoCategorie, probe]);

  // Toggle sportiv global
  const handleToggle = (id: string) => {
    setSelectedSportivi(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Deschide probă din hub
  const handleDeschideProba = useCallback((probaId: string) => {
    const proba = probe.find(p => p.id === probaId);
    if (!proba) return;
    const isEchipa = categorii.some(c => c.proba_id === probaId && esteEchipaSauPereche(c));
    if (isEchipa) {
      setNav({ view: 'proba-echipe', probaId });
    } else {
      setNav({ view: 'proba-individuala', probaId });
    }
  }, [probe, categorii]);

  // ── HUB ──────────────────────────────────────────
  if (nav.view === 'hub') {
    return (
      <InscriereClubCards
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
        selectedSportivi={selectedSportivi}
        autoCategorie={autoCategorie}
        quyenAles={quyenAles}
        echipeFormate={echipeFormate}
        probeSkipped={probeSkipped}
        excludedFromIndividual={excludedFromIndividual}
        onDeschideProba={handleDeschideProba}
        onFinalizare={() => {
          setProbeSkipped(calcProbeSkipped());
          setNav({ view: 'sumar' });
        }}
      />
    );
  }

  // ── PROBĂ INDIVIDUALĂ ────────────────────────────
  if (nav.view === 'proba-individuala') {
    const probaObj = probe.find(p => p.id === nav.probaId);
    if (!probaObj) return null;

    return (
      <ProbaIndividualaView
        competitie={competitie}
        proba={probaObj}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        vizeSportivi={vizeSportivi}
        quyenAles={quyenAles}
        onUpdateQuyenAles={setQuyenAles}
        excludedFromIndividual={excludedFromIndividual}
        onToggleExclus={handleToggleExclus}
        onBack={() => setNav({ view: 'hub' })}
        onSave={() => {
          // Update selectedSportivi cu sportivii selectați în probă individuală
          // (vizibili via ProbaIndividualaView -> localSelected -> expus prin onSave callback)
          setNav({ view: 'hub' });
        }}
        selectedSportiviHub={selectedSportivi}
        myClubId={myClubId}
      />
    );
  }

  // ── PROBĂ ECHIPE ────────────────────────────────
  if (nav.view === 'proba-echipe') {
    const probaObj = probe.find(p => p.id === nav.probaId);
    if (!probaObj) return null;

    return (
      <ProbaEchipeView
        proba={probaObj}
        sportivi={sportivi}
        grade={grade}
        categorii={categorii}
        selectedSportivi={selectedSportivi}
        numeClub={numeClub}
        echipeFormate={echipeFormate}
        onUpdateEchipe={setEchipeFormate}
        dataCompetitie={competitie.data_inceput}
        onBack={() => setNav({ view: 'hub' })}
        onSave={() => setNav({ view: 'hub' })}
        myClubId={myClubId}
      />
    );
  }

  // ── SUMAR ───────────────────────────────────────
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
      probeSkipped={probeSkipped}
      excludedFromIndividual={excludedFromIndividual}
      clubId={clubId}
      numeClub={numeClub}
      onBack={() => setNav({ view: 'hub' })}
      onSaved={onSaved}
    />
  );
};

export default InscriereClubWizard;
