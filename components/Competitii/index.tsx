import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { OperatieCategorii } from '../../types';
import { Permissions, Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, SolicitareEchipaIncompleta, Sportiv, Grad, TipProba } from '../../types';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Card, Badge, ConfirmModal } from '../ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, CopyIcon } from '../icons';
import { useError } from '../ErrorProvider';
import { TIP_PROBA_LABELS, TIP_COMPETITIE_LABELS } from '../../utils/competitiiTemplates';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import CategoriiTemplateManager from './CategoriiTemplateManager';
import { VizaSportiv } from '../../types';
import InscriereClubWizard from './InscriereClubWizard';
import { useArmeCvd } from '../../hooks/useArmeCvd';
import { anFramCompetitie } from '../../utils/editareCompetitie';
import { useVizeFramClub } from '../../hooks/useVizeFramClub';
import { TipuriCompetitieAdmin } from './TipuriCompetitieAdmin';
import { CereriInterclubAdmin } from './CereriInterclubAdmin';
import { CereriAccesAdmin } from './CereriAccesAdmin';
import { JurnalActori } from './JurnalActori';
import { SchimbariGrad } from './SchimbariGrad';

import {
  SS_KEY_COMP_ID, SS_KEY_TAB, ssGet, ssSet, ssDel,
  areVizaFRAM, WarningVizaFRAM,
  fmtDate, statusLabel, tipBadge, TipuriLabelsContext,
  categorieActiva, categorieEticheta,
  SELECT_INSCRIERI_COMPETITIE, SELECT_ECHIPE_COMPETITIE,
} from './constants';
import { CategorieForm } from './CategorieForm';
import { CategorieOperatieModal } from './CategorieOperatieModal';
import { FaraCategoriePanel } from './FaraCategoriePanel';
import { participanti } from '../../utils/categoriiAdmin';
import { gradEfectivLaData } from '../../utils/eligibilitateCompetitie';
import { CompetitieForm } from './CompetitieForm';
import { CloneazaCompetitieModal } from './CloneazaCompetitieModal';
import { RaportInscrieri } from './RaportInscrieri';
import { FinanciarView } from './FinanciarView';
import { PlatiClubExtern } from './PlatiClubExtern';
import { ProbaForm } from './ProbaForm';
import { AdminPanel } from './AdminPanel';
import { InscriereModal } from './InscriereModal';
import { InscrieriView } from './InscrieriView';
import { MigrareModal, EvenimentLegacy } from './MigrareModal';
import { useCompetitieFilters, aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
import { useRegisterRefresh } from '../../contexts/RefreshContext';

interface CompetitiiProps {
  permissions: Permissions;
  onBack: () => void;
  onViewSportiv?: (s: Sportiv) => void;
}

type View = 'list' | 'detail' | 'inscrieri';

const STATUS_BADGE: Record<string, 'green' | 'amber' | 'blue' | 'slate'> = {
  draft: 'slate', inscrieri_deschise: 'green', inscrieri_inchise: 'amber', finalizata: 'blue',
};

// -----------------------------------------------
// COMPETITION DETAIL (categories + registrations view)
// -----------------------------------------------
interface CompetitieDetailProps {
  competitie: Competitie;
  permissions: Permissions;
  onBack?: () => void;
  onUpdated?: (c: Competitie) => void;
  onViewSportiv?: (s: Sportiv) => void;
  /** zona externa (link + parolă): doar Inscrieri/Categorii/Taxe/Detalii, date filtrate pe clubul din context */
  mode?: 'extern';
  /** rol context extern: 'ADMIN_CLUB' | 'INSTRUCTOR' | 'REPREZENTANT_COMPETITIE' */
  externRol?: string;
}

type TabCompetitie = 'categorii' | 'inscrieri' | 'raport' | 'admin' | 'rezultate_legacy' | 'financiar' | 'template' | 'cereri_interclub' | 'acces_extern' | 'jurnal_cont_club' | 'schimbari_grad' | 'plati' | 'detalii';
const TABURI_EXTERN: TabCompetitie[] = ['inscrieri', 'categorii', 'plati', 'detalii'];

export const CompetitieDetail: React.FC<CompetitieDetailProps> = ({ competitie, permissions, onBack, onUpdated, onViewSportiv, mode, externRol }) => {
  const extern = mode === 'extern';
  const tipuriLabelsCtx = React.useContext(TipuriLabelsContext);
  const { filteredData, grade, currentUser, vizeSportivi, activeRoleContext, setSportivi, clubs } = useData();
  const { showError } = useError();
  const [probe, setProbe] = useState<ProbaCompetitie[]>([]);
  const [categorii, setCategorii] = useState<CategorieCompetitie[]>([]);
  const [inscrieri, setInscrieri] = useState<InscriereCompetitie[]>([]);
  const [echipe, setEchipe] = useState<EchipaCompetitie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabCompetitie>(() => {
    if (extern) return 'inscrieri'; // nu citim tab-ul salvat de portalul principal
    const saved = ssGet(SS_KEY_TAB);
    if (saved === 'categorii' || saved === 'inscrieri' || saved === 'raport' || saved === 'admin' || saved === 'rezultate_legacy' || saved === 'financiar' || saved === 'template' || saved === 'cereri_interclub' || saved === 'acces_extern' || saved === 'jurnal_cont_club' || saved === 'schimbari_grad') return saved;
    return 'inscrieri';
  });
  const [wizardOpen, setWizardOpen] = useState(true);
  const [rezultateLegacy, setRezultateLegacy] = useState<Array<{ id: string; rezultat: string; probe?: string; sportiv?: { id: string; nume: string; prenume: string } }>>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [selectedProbaId, setSelectedProbaId] = useState<string>('');
  const [inscriereModal, setInscriereModal] = useState<CategorieCompetitie | null>(null);
  const goToHubAfterModalRef = React.useRef<(() => void) | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState<CategorieCompetitie | null>(null);
  const [probaFormOpen, setProbaFormOpen] = useState(false);
  // Faza 41: administrare categorii (doar super admin, tab Categorii)
  const [selectieCat, setSelectieCat] = useState<Set<string>>(new Set());
  const [operatieCat, setOperatieCat] = useState<{ operatie: OperatieCategorii; surse: CategorieCompetitie[]; selectie?: { tip: 'inscriere' | 'echipa'; id: string }[] } | null>(null);
  const [catCloneDin, setCatCloneDin] = useState<CategorieCompetitie | null>(null);
  // Task 1: vizualizare sportivi înscriși per categorie
  const [viewInscrieriCatId, setViewInscrieriCatId] = useState<string | null>(null);

  // Sistem Filtrare Unificat — instanțiat O SINGURĂ DATĂ la nivel CompetitieDetail (D-01)
  const { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive } = useCompetitieFilters();

  const isAdmin = permissions.isSuperAdmin || permissions.isFederationAdmin;
  const isClubAdmin = permissions.isAdminClub;
  // D-01, D-09: doar super admin, nu in zona externa, nu pe competitie finalizata (garda reala: RPC is_super_admin)
  const poateAdminCategorii = !extern && permissions.isSuperAdmin && competitie.status !== 'finalizata';

  // Persistă tab-ul activ în sessionStorage la fiecare schimbare
  // INSC-03: resetFiltre() la fiecare schimbare de tab — filtrele se șterg automat
  const handleSetActiveTab = useCallback((tab: TabCompetitie) => {
    if (extern && !TABURI_EXTERN.includes(tab)) return;
    resetFiltre();
    setSelectieCat(prev => (prev.size ? new Set() : prev));
    setActiveTab(tab);
    if (!extern) ssSet(SS_KEY_TAB, tab);
  }, [resetFiltre, extern]);

  // Contor cereri de acces extern în așteptare (doar super admin, doar portal); eroarea ascunde contorul
  const [cereriAccesPending, setCereriAccesPending] = useState<number | null>(null);
  useEffect(() => {
    if (extern || !permissions.isSuperAdmin) return;
    let anulat = false;
    supabase.from('cereri_acces_competitie').select('id', { count: 'exact', head: true })
      .eq('competitie_id', competitie.id).eq('status', 'in_asteptare')
      .then(({ count, error }) => { if (!anulat) setCereriAccesPending(error ? null : count ?? 0); });
    return () => { anulat = true; };
  }, [extern, permissions.isSuperAdmin, competitie.id, activeTab]);

  // Federatia alege clubul pentru care inscrie (nu are club in context); ceilalti raman pe clubul lor
  const [clubAlesFed, setClubAlesFed] = useState('');
  const myClubId = activeRoleContext?.club_id ?? currentUser?.club_id;
  // doar wizardul (si modalul deschis din el) lucreaza pe clubul ales; restul tab-urilor raman pe myClubId
  const clubInscriere = (isAdmin && !extern && clubAlesFed) ? clubAlesFed : myClubId;
  // E1-1: in zona externa, competitia terminata (istoric) e doar pentru citire; RLS 20261111c2 e garda reala
  const istoricExtern = extern && (competitie.status === 'finalizata'
    || (!!competitie.data_sfarsit && competitie.data_sfarsit < new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' })));
  const poateInscrie = !istoricExtern && (isClubAdmin || (!extern && (permissions.isInstructor || isAdmin)));
  const anFram = anFramCompetitie(competitie);
  const vizeFram = useVizeFramClub(competitie.id, anFram, clubInscriere);
  const numeClubInscriere = (isAdmin && !extern && clubAlesFed ? clubs?.find((c: any) => c.id === clubAlesFed)?.nume : null) ?? currentUser?.cluburi?.nume ?? '';

  // Extern: filtru club in query (defense in depth; poarta reala este RLS, D-12)
  const doarClubul = (q: any) => (extern && myClubId ? q.eq('club_id', myClubId) : q);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [probeRes, catRes, inRes, echRes] = await Promise.all([
      supabase.from('probe_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('categorii_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      doarClubul(supabase.from('inscrieri_competitie').select(SELECT_INSCRIERI_COMPETITIE).eq('competitie_id', competitie.id)),
      doarClubul(supabase.from('echipe_competitie').select(SELECT_ECHIPE_COMPETITIE).eq('competitie_id', competitie.id)),
    ]);
    setProbe((probeRes.data || []) as ProbaCompetitie[]);
    const loadedCats = (catRes.data || []) as CategorieCompetitie[];
    setCategorii(loadedCats);
    setInscrieri((inRes.data || []) as InscriereCompetitie[]);
    setEchipe((echRes.data || []) as EchipaCompetitie[]);
    setLoading(false);
  }, [competitie.id, extern, myClubId]);

  // Refresh silențios — nu setează loading=true, nu remontează wizard-ul
  // La eroare NU se suprascrie starea (altfel listele ar deveni goale) si se afiseaza eroarea; nu arunca niciodata
  const ultimaEroareReload = useRef(0);
  const fetchDataSilent = useCallback(async () => {
    try {
      const [probeRes, catRes, inRes, echRes] = await Promise.all([
        supabase.from('probe_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
        supabase.from('categorii_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
        doarClubul(supabase.from('inscrieri_competitie').select(SELECT_INSCRIERI_COMPETITIE).eq('competitie_id', competitie.id)),
        doarClubul(supabase.from('echipe_competitie').select(SELECT_ECHIPE_COMPETITIE).eq('competitie_id', competitie.id)),
      ]);
      const err = probeRes.error ?? catRes.error ?? inRes.error ?? echRes.error;
      if (err) throw err;
      setProbe((probeRes.data || []) as ProbaCompetitie[]);
      setCategorii((catRes.data || []) as CategorieCompetitie[]);
      setInscrieri((inRes.data || []) as InscriereCompetitie[]);
      setEchipe((echRes.data || []) as EchipaCompetitie[]);
    } catch (e) {
      // maxim un toast / 10 s: la o cădere persistentă fiecare apelant (onEchipeRefresh, onSaved, ...) ar afișa altfel unul
      const acum = Date.now();
      if (acum - ultimaEroareReload.current > 10_000) { ultimaEroareReload.current = acum; showError('Reîncărcarea datelor competiției a eșuat', e); }
    }
  }, [competitie.id, extern, myClubId, showError]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRegisterRefresh(fetchData);

  useEffect(() => {
    if (extern || !competitie.legacy_eveniment_id) return;
    setLoadingLegacy(true);
    supabase
      .from('rezultate')
      .select('id, rezultat, probe, sportiv:sportivi(id, nume, prenume)')
      .eq('eveniment_id', competitie.legacy_eveniment_id)
      .order('created_at')
      .then(({ data }) => {
        setRezultateLegacy((data || []) as unknown as typeof rezultateLegacy);
        setLoadingLegacy(false);
      });
  }, [competitie.legacy_eveniment_id, extern]);

  // TAB-02/TAB-03: filteredCategorii combină selectedProbaId (pills probă standalone)
  // cu filtrele complete din useCompetitieFilters (gen, vârstă, grad)
  const filteredCategorii = useMemo(() => {
    const baza = selectedProbaId
      ? categorii.filter(c => c.proba_id === selectedProbaId)
      : categorii;
    return aplicaFiltreCategorie(baza, filtre);
  }, [categorii, selectedProbaId, filtre]);

  // Fuzionarea actioneaza doar pe categoriile selectate care sunt si vizibile (filtrele pot ascunde selectii)
  const selectieVizibila = useMemo(() => {
    if (!selectieCat.size) return selectieCat;
    const vizibile = new Set(filteredCategorii.map(c => c.id));
    return new Set([...selectieCat].filter(id => vizibile.has(id)));
  }, [selectieCat, filteredCategorii]);

  // Înscrieri noi (wizard / modal admin): doar categoriile active, nu cele fuzionate/împărțite/anulate
  const categoriiActive = useMemo(() => categorii.filter(categorieActiva), [categorii]);

  const inscrieriCount = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId && i.status?.toLowerCase() !== 'retras').length +
    echipe.filter(e => e.categorie_id === catId && e.status?.toLowerCase() !== 'retrasa').length;

  const canRegister = competitie.status === 'inscrieri_deschise';

  // Sportivii clubului pentru înscriere: doar activi; cei inactivi rămân vizibili numai dacă sunt deja înscriși aici (ca să poată fi retrași)
  const sportiviClubInscriere = useMemo(() => {
    const inscrisi = new Set(
      inscrieri.filter(i => i.club_id === clubInscriere && i.status?.toLowerCase() !== 'retras').map(i => i.sportiv_id)
    );
    return filteredData.sportivi.filter(s => s.club_id === clubInscriere && (s.status === 'Activ' || inscrisi.has(s.id)));
  }, [filteredData.sportivi, inscrieri, clubInscriere]);

  // CVD: armele se incarca o singura data aici si se paseaza wizardului
  const sportivIdsClub = useMemo(() => sportiviClubInscriere.map(s => s.id), [sportiviClubInscriere]);
  const armeCvd = useArmeCvd(competitie, sportivIdsClub, competitie.tip === 'cvd');
  // schimbarea gradului: doar cine poate scrie istoric_grade (federatie, admin club, instructor); nu in modul extern
  const canEditGrad = !extern && (permissions.canGradeStudents || isAdmin || isClubAdmin || permissions.isInstructor);
  // reprezentantul poate schimba gradul prin RPC (Faza 40); instructorii externi doar vad. Garda reala e in RPC.
  const canEditGradExtern = extern && externRol === 'REPREZENTANT_COMPETITIE' && !istoricExtern;
  const canEditArme = competitie.status === 'inscrieri_deschise' && (permissions.isAdminClub || permissions.isSuperAdmin || permissions.isFederationAdmin) && externRol !== 'INSTRUCTOR';
  // Faza 42 D-07: editare inscrieri (quyen/categorie/componenta). Doar UX; poarta reala e RLS 20261106e + inghetul DB pe competitie finalizata.
  // Super admin din portalul federatiei: pana la finalizare; ceilalti: inscrieri deschise si termen nedepasit (zi calendaristica Bucuresti).
  const azi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' });
  const canEditEchipe = (permissions.isSuperAdmin && !extern)
    ? competitie.status !== 'finalizata'
    : (competitie.status === 'inscrieri_deschise' && (!competitie.deadline_inscrieri || competitie.deadline_inscrieri >= azi) && !istoricExtern
      && (permissions.isAdminClub || permissions.isFederationAdmin) && externRol !== 'INSTRUCTOR');

  // Modal categorie: activi + inactivii înscriși DOAR la categoria deschisă (nu apar selectabili la alte categorii)
  const sportiviModalInscriere = useMemo(() => {
    const inscrisiCat = new Set(
      inscrieri
        .filter(i => i.club_id === clubInscriere && i.categorie_id === inscriereModal?.id && i.status?.toLowerCase() !== 'retras')
        .map(i => i.sportiv_id)
    );
    return filteredData.sportivi.filter(s => s.club_id === clubInscriere && (s.status === 'Activ' || inscrisiCat.has(s.id)));
  }, [filteredData.sportivi, inscrieri, clubInscriere, inscriereModal?.id]);

  const inchideFormCat = () => { setCatFormOpen(false); setCatToEdit(null); setCatCloneDin(null); };
  // sportivii inscrisi in categoria editata, pentru avertismentul de eligibilitate din formular
  const inscrisiCatEditata = useMemo(() => {
    if (!catFormOpen || !catToEdit) return undefined;
    return participanti([catToEdit.id], { categorii, inscrieri, echipe, grade, competitie }).flatMap(r => (r.sportiv ? [r.sportiv] : r.membri));
  }, [catFormOpen, catToEdit, categorii, inscrieri, echipe, grade, competitie]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        {!extern && (
          <Button variant="secondary" size="sm" onClick={onBack} className="!p-2">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[var(--t-text)]">{competitie.denumire}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipBadge[competitie.tip]}`}>
              {tipuriLabelsCtx.get(competitie.tip) ?? TIP_COMPETITIE_LABELS[competitie.tip as keyof typeof TIP_COMPETITIE_LABELS] ?? competitie.tip}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabel[competitie.status]?.color}`}>
              {statusLabel[competitie.status]?.label}
            </span>
            {competitie.fram_obligatoriu && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">Doar cu FRAM {anFram}</span>
            )}
            <span className="text-xs text-slate-400">{fmtDate(competitie.data_inceput)} – {fmtDate(competitie.data_sfarsit)}</span>
            {competitie.locatie && <span className="text-xs text-slate-400">{competitie.locatie}</span>}
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm" variant="secondary"
            onClick={async () => {
              const newStatus = competitie.status === 'draft' ? 'inscrieri_deschise'
                : competitie.status === 'inscrieri_deschise' ? 'inscrieri_inchise'
                  : competitie.status === 'inscrieri_inchise' ? 'finalizata' : 'draft';
              const { data, error } = await supabase.from('competitii')
                .update({ status: newStatus }).eq('id', competitie.id).select().single();
              if (!error && data) onUpdated?.(data as Competitie);
            }}
          >
            {competitie.status === 'draft' ? 'Deschide Înscrierile' :
              competitie.status === 'inscrieri_deschise' ? 'Închide Înscrierile' :
                competitie.status === 'inscrieri_inchise' ? 'Finalizează' : 'Redeschide'}
          </Button>
        )}
      </div>

      {/* Tabs — scroll orizontal conținut, fără să lărgească pagina */}
      <div className="overflow-x-hidden -mx-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 px-4 scroll-smooth scrollbar-hide">
        <button onClick={() => handleSetActiveTab('inscrieri')} style={{ touchAction: 'manipulation' }}
          className={`shrink-0 h-9 flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'inscrieri' ? 'bg-brand-primary text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Înscrieri <span className="opacity-70">({
            isAdmin
              ? inscrieri.length + echipe.length
              : inscrieri.filter(i => i.club_id === myClubId && i.status?.toLowerCase() !== 'retras').length
                + echipe.filter(e => e.club_id === myClubId && e.status?.toLowerCase() !== 'retrasa').length
          })</span>
        </button>
        {!extern && (isAdmin || isClubAdmin) && (
          <button onClick={() => handleSetActiveTab('raport')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'raport' ? 'bg-brand-primary text-white' : 'bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
            Raport
          </button>
        )}
        <button onClick={() => handleSetActiveTab('categorii')} style={{ touchAction: 'manipulation' }}
          className={`shrink-0 h-9 flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'categorii' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Categorii <span className="opacity-70">({filteredCategorii.length})</span>
        </button>
        {!extern && isAdmin && (
          <button onClick={() => handleSetActiveTab('admin')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'bg-yellow-600 text-white shadow-md' : 'bg-slate-800 text-yellow-400 hover:bg-slate-700 border border-slate-700'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </button>
        )}
        {!extern && isAdmin && (
          <button onClick={() => handleSetActiveTab('financiar')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'financiar' ? 'bg-brand-primary text-white' : 'bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
            Financiar
          </button>
        )}
        {!extern && isAdmin && (
          <button onClick={() => handleSetActiveTab('template')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'template' ? 'bg-emerald-700 text-white' : 'bg-slate-800 border border-emerald-700/60 text-emerald-400 hover:text-white hover:bg-slate-700'}`}>
            Template-uri
          </button>
        )}
        {!extern && permissions.isSuperAdmin && (
          <button onClick={() => handleSetActiveTab('cereri_interclub')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'cereri_interclub' ? 'bg-indigo-700 text-white' : 'bg-slate-800 border border-indigo-700/60 text-indigo-400 hover:text-white hover:bg-slate-700'}`}>
            Cereri inter-club
          </button>
        )}
        {!extern && permissions.isSuperAdmin && (
          <button onClick={() => handleSetActiveTab('acces_extern')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'acces_extern' ? 'bg-indigo-700 text-white' : 'bg-slate-800 border border-indigo-700/60 text-indigo-400 hover:text-white hover:bg-slate-700'}`}>
            Acces extern
            {cereriAccesPending != null && cereriAccesPending > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-900/60 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">({cereriAccesPending})</span>
            )}
          </button>
        )}
        {!extern && (isAdmin || isClubAdmin || permissions.isInstructor) && (
          <button onClick={() => handleSetActiveTab('jurnal_cont_club')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'jurnal_cont_club' ? 'bg-brand-primary text-white' : 'bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
            Jurnal cont club
          </button>
        )}
        {!extern && permissions.isSuperAdmin && (
          <button onClick={() => handleSetActiveTab('schimbari_grad')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'schimbari_grad' ? 'bg-brand-primary text-white' : 'bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
            Schimbări grad
          </button>
        )}
        {extern && (['plati', 'detalii'] as const).map(t => (
          <button key={t} onClick={() => handleSetActiveTab(t)} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === t ? 'bg-brand-primary text-white' : 'bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700'}`}>
            {t === 'plati' ? 'Taxe' : 'Detalii'}
          </button>
        ))}
        {!extern && competitie.legacy_eveniment_id && (
          <button onClick={() => handleSetActiveTab('rezultate_legacy')} style={{ touchAction: 'manipulation' }}
            className={`shrink-0 h-9 px-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'rezultate_legacy' ? 'bg-amber-700 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700'}`}>
            Rezultate Vechi
          </button>
        )}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-sm text-[var(--t-text-muted)] py-12">Se încarcă...</div>
      ) : (
        <>
          {/* CATEGORII TAB */}
          {activeTab === 'categorii' && (
            <div className="space-y-3">
              {/* TAB-01: CompetitieFilterBar înlocuiește pills probe standalone */}
              <CompetitieFilterBar
                filtre={filtre}
                toggleGen={toggleGen}
                setFiltre={setFiltre}
                resetFiltre={resetFiltre}
                nrFiltreActive={nrFiltreActive}
                probe={probe}
                grade={grade}
              />

              {poateAdminCategorii && selectieVizibila.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] px-3 py-2">
                  <span className="text-sm text-[var(--t-text)]">{selectieVizibila.size} categorii selectate</span>
                  <Button size="sm" variant="warning" disabled={selectieVizibila.size < 2} onClick={() => setOperatieCat({ operatie: 'fuziune', surse: categorii.filter(c => selectieVizibila.has(c.id)) })}>Fuzionează</Button>
                  <Button size="sm" variant="secondary" onClick={() => setSelectieCat(new Set())}>Golește selecția</Button>
                </div>
              )}

              {/* Category list */}
              <div className="-mx-4 sm:mx-0 overflow-x-auto">
                <table className="w-full text-sm text-slate-300 min-w-[320px]">
                  <thead>
                    <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                      {poateAdminCategorii && <th className="p-2 w-8"></th>}
                      <th className="p-2 text-left w-10">#</th>
                      <th className="p-2 text-left">Categorie</th>
                      <th className="p-2 text-left hidden md:table-cell">Probă</th>
                      <th className="p-2 text-left hidden md:table-cell">Participare</th>
                      <th className="p-2 text-center">Înscriși</th>
                      {canRegister && isClubAdmin && <th className="p-2 text-right">Acțiuni</th>}
                      {poateAdminCategorii && <th className="p-2 text-right">Acțiuni</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--t-border)]">
                    {filteredCategorii.map(cat => {
                      const proba = probe.find(p => p.id === cat.proba_id);
                      const count = inscrieriCount(cat.id);
                      const isTeam = cat.tip_participare !== 'individual';
                      const isExpanded = viewInscrieriCatId === cat.id;
                      // Sportivi individuali înscriși în această categorie
                      const inscrieriCat = inscrieri.filter(i => i.categorie_id === cat.id && i.status?.toLowerCase() !== 'retras');
                      // Echipe înscrise în această categorie
                      const echipeCat = echipe.filter(e => e.categorie_id === cat.id && e.status?.toLowerCase() !== 'retrasa');
                      const activa = categorieActiva(cat);
                      const colCount = 5 + ((canRegister && isClubAdmin) ? 1 : 0) + (poateAdminCategorii ? 2 : 0);
                      return (
                        <React.Fragment key={cat.id}>
                          <tr className="hover:bg-[var(--t-table-row-hover)]">
                            {poateAdminCategorii && (
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  aria-label={`Selectează ${cat.denumire}`}
                                  disabled={!activa}
                                  checked={activa && selectieCat.has(cat.id)}
                                  onChange={() => setSelectieCat(prev => { const n = new Set(prev); if (n.has(cat.id)) n.delete(cat.id); else n.add(cat.id); return n; })}
                                />
                              </td>
                            )}
                            <td className="p-2 text-[var(--t-text-muted)]">{cat.numar_categorie}</td>
                            <td className="p-2">
                              <div className="font-medium text-white">{cat.denumire}</div>
                              {(() => {
                                const et = categorieEticheta(cat, categorii);
                                return et ? <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${et.clasa}`}>{et.text}</span> : null;
                              })()}
                              {cat.arma && <div className="text-xs text-orange-400">{cat.arma}</div>}
                            </td>
                            <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                              {proba ? TIP_PROBA_LABELS[proba.tip_proba] : '-'}
                            </td>
                            <td className="p-2 hidden md:table-cell text-xs">
                              {isTeam ? (
                                <span className="text-purple-300">
                                  {cat.tip_participare === 'pereche' ? 'Pereche' : 'Echipă'} ({cat.sportivi_per_echipa_max} sp.)
                                </span>
                              ) : 'Individual'}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => count > 0 && setViewInscrieriCatId(isExpanded ? null : cat.id)}
                                style={{ touchAction: 'manipulation' }}
                                title={count > 0 ? 'Click pentru a vedea sportivii înscriși' : undefined}
                                className={`text-xs font-bold transition-colors ${count >= cat.min_participanti_start ? 'text-green-400' : count > 0 ? 'text-yellow-400' : 'text-slate-500'} ${count > 0 ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                              >
                                {count}
                                {count > 0 && <span className="ml-1 text-slate-500">{isExpanded ? '▲' : '▼'}</span>}
                              </button>
                            </td>
                            {canRegister && isClubAdmin && (
                              <td className="p-2 text-right">
                              </td>
                            )}
                            {poateAdminCategorii && (
                              <td className="p-2 text-right whitespace-nowrap">
                                <div className="flex justify-end gap-1 flex-wrap">
                                  {activa && <Button size="sm" variant="secondary" title="Editează categoria" onClick={() => { setCatCloneDin(null); setCatToEdit(cat); setCatFormOpen(true); }}>Editează</Button>}
                                  <Button size="sm" variant="secondary" title="Creează o categorie nouă pornind de la aceasta" onClick={() => { setCatToEdit(null); setCatCloneDin(cat); setCatFormOpen(true); }}>Clonează</Button>
                                  {activa && <Button size="sm" variant="secondary" title="Împarte categoria în două sau mai multe" onClick={() => setOperatieCat({ operatie: 'impartire', surse: [cat] })}>Împarte</Button>}
                                  {activa && <Button size="sm" variant="danger" title="Anulează categoria" onClick={() => setOperatieCat({ operatie: 'anulare', surse: [cat] })}>Anulează</Button>}
                                </div>
                              </td>
                            )}
                          </tr>
                          {/* Task 1: panou expandat cu sportivii înscriși */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={colCount} className="px-2 pb-2 pt-0 bg-[var(--t-surface-2)]">
                                <div className="rounded-lg border border-[var(--t-border)] overflow-hidden">
                                  <div className="px-3 py-2 bg-[var(--t-surface-2)] border-b border-[var(--t-border)] text-xs font-semibold text-[var(--t-text-muted)] uppercase tracking-wide flex items-center justify-between">
                                    <span>Înscriși în: {cat.denumire}</span>
                                    <button
                                      onClick={() => setViewInscrieriCatId(null)}
                                      style={{ touchAction: 'manipulation' }}
                                      className="text-slate-500 hover:text-white transition-colors"
                                    >✕</button>
                                  </div>
                                  {inscrieriCat.length === 0 && echipeCat.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-slate-500 italic">Niciun înscris activ.</div>
                                  ) : (
                                    <div className="divide-y divide-slate-700/50">
                                      {inscrieriCat.map((ins, idx) => {
                                        const sp = ins.sportiv as any;
                                        const numeClub = sp?.cluburi?.nume || null;
                                        const gradSp = sp ? (gradEfectivLaData(sp, grade, competitie.data_inceput)?.nume ?? '—') : '—';
                                        const quyenSp = [(ins as any).inlantuire?.denumire, (ins as any).inlantuire_2?.denumire].filter(Boolean).join(' + ');
                                        return (
                                          <div key={ins.id} className="flex items-center gap-3 px-3 py-2">
                                            <span className="text-xs text-slate-500 w-5 shrink-0">{idx + 1}.</span>
                                            <div className="flex-1 min-w-0">
                                              <span className="text-sm text-white font-medium uppercase">
                                                {sp ? `${sp.nume} ${sp.prenume}` : ins.sportiv_id}
                                              </span>
                                              {numeClub && (
                                                <span className="ml-2 text-[10px] text-slate-400 font-normal normal-case">{numeClub}</span>
                                              )}
                                              <span className="ml-2 text-[10px] text-slate-400 font-normal normal-case">Grad: {gradSp}</span>
                                              {quyenSp && <span className="ml-2 text-[10px] text-slate-400 font-normal normal-case">Quyen: {quyenSp}</span>}
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ins.status === 'confirmat' ? 'bg-green-800 text-green-200' : ins.status === 'retras' ? 'bg-red-800 text-red-200' : 'bg-slate-700 text-slate-300'}`}>
                                              {ins.status}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {echipeCat.map((ec, idxEc) => {
                                        const membri = (ec as any).echipa_sportivi || [];
                                        return (
                                          <div key={ec.id} className="px-3 py-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm text-white font-medium flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-slate-500 shrink-0">{inscrieriCat.length + idxEc + 1}.</span>
                                                {ec.denumire_echipa || 'Echipă fără denumire'}
                                                {(ec as any).club?.nume && (
                                                  <span className="text-[10px] text-slate-400 font-normal normal-case">{(ec as any).club.nume}</span>
                                                )}
                                                {(ec as any).inlantuire?.denumire && (
                                                  <span className="text-[10px] text-slate-400 font-normal normal-case">Quyen: {(ec as any).inlantuire.denumire}</span>
                                                )}
                                              </span>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${ec.status === 'confirmata' ? 'bg-green-800 text-green-200' : 'bg-slate-700 text-slate-300'}`}>
                                                {ec.status}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {membri.map((ms: any) => {
                                                const numeClubMembru = ms.sportiv?.cluburi?.nume || null;
                                                const gradMembru = ms.sportiv ? gradEfectivLaData(ms.sportiv, grade, competitie.data_inceput)?.nume : null;
                                                return (
                                                <span key={ms.sportiv_id} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                                                  <span className="uppercase">{ms.sportiv ? `${ms.sportiv.nume} ${ms.sportiv.prenume}` : ms.sportiv_id}</span>
                                                  {numeClubMembru && <span className="text-slate-500 ml-1 normal-case">({numeClubMembru})</span>}
                                                  {gradMembru && <span className="text-slate-500 ml-1 normal-case">· {gradMembru}</span>}
                                                  {ms.rol === 'rezerva' && <span className="text-slate-500 ml-1">[R]</span>}
                                                </span>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredCategorii.length === 0 && (
                <div className="text-center text-slate-500 py-8">Nicio categorie definită.</div>
              )}

              <FaraCategoriePanel
                competitie={competitie}
                categorii={categorii}
                inscrieri={inscrieri}
                echipe={echipe}
                grade={grade}
                poateRealoca={poateAdminCategorii}
                onRealoca={sel => setOperatieCat({ operatie: 'mutare', surse: [], selectie: sel })}
              />

              {operatieCat && (
                <CategorieOperatieModal
                  operatie={operatieCat.operatie}
                  competitie={competitie}
                  surse={operatieCat.surse}
                  selectie={operatieCat.selectie}
                  categorii={categorii}
                  inscrieri={inscrieri}
                  echipe={echipe}
                  grade={grade}
                  onClose={() => setOperatieCat(null)}
                  onDone={async () => {
                    setOperatieCat(null); setSelectieCat(new Set());
                    await fetchDataSilent();
                  }}
                />
              )}

              {catFormOpen && (
                <CategorieForm
                  competitieId={competitie.id}
                  probe={probe}
                  grade={grade}
                  categorie={catToEdit}
                  cloneDin={catCloneDin}
                  nextNumarCategorie={catToEdit ? undefined : Math.max(0, ...categorii.map(c => c.numar_categorie ?? 0)) + 1}
                  inscrisi={inscrisiCatEditata}
                  dataCompetitie={competitie.data_inceput}
                  areInscrieri={catToEdit ? inscrieriCount(catToEdit.id) > 0 : false}
                  onClose={inchideFormCat}
                  onSaved={() => { inchideFormCat(); void fetchDataSilent(); }}
                />
              )}
            </div>
          )}

          {/* INSCRIERI TAB */}
          {activeTab === 'inscrieri' && competitie.fram_obligatoriu && vizeFram.eroare && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Vizele FRAM nu au putut fi verificate ({vizeFram.eroare}). Verificarea finală se face la salvare.
            </div>
          )}
          {activeTab === 'inscrieri' && (
            loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Se încarcă datele competiției...
              </div>
            ) : (wizardOpen && poateInscrie && !(isAdmin && !extern && !clubInscriere)) ? (
              <InscriereClubWizard
                competitie={competitie}
                probe={probe}
                categorii={categoriiActive}
                categoriiToate={categorii}
                sportivi={sportiviClubInscriere}
                grade={grade}
                inscrieri={inscrieri}
                echipe={echipe}
                clubId={clubInscriere || ''}
                numeClub={numeClubInscriere}
                vizeSportivi={vizeFram.vize}
                myClubId={clubInscriere}
                arme={competitie.tip === 'cvd' ? armeCvd : undefined}
                canEdit={canEditArme}
                onViewSportiv={extern ? undefined : onViewSportiv}
                onGradSchimbat={(canEditGrad || canEditGradExtern) ? (id, gradId) => {
                  setSportivi?.(prev => prev.map(s => s.id === id ? { ...s, grad_actual_id: gradId } : s));
                  // gradul schimbat muta sportivul in alte categorii/arme: reincarca armele, inscrierile si echipele fara sa inchida wizardul
                  void armeCvd.reload();
                  void fetchDataSilent?.();
                } : undefined}
                interclubDezactivat={extern}
                gradPrinCompetitie={canEditGradExtern}
                onBack={() => setWizardOpen(false)}
                onSaved={() => { setWizardOpen(false); fetchData(); }}
                onEchipeRefresh={fetchDataSilent}
                onOpenInscriereModal={(cat, goToHub) => {
                  setInscriereModal(cat);
                  goToHubAfterModalRef.current = goToHub ?? null;
                }}
              />
            ) : (
              <div className="space-y-3">
                {canRegister && poateInscrie && (
                  <div className="flex justify-end items-center gap-2 flex-wrap">
                    {isAdmin && !extern && (
                      <select
                        value={clubAlesFed}
                        onChange={e => setClubAlesFed(e.target.value)}
                        aria-label="Club pentru înscriere"
                        className="h-9 rounded-lg bg-slate-800 border border-slate-600 text-sm text-slate-200 px-2"
                      >
                        <option value="">Alege clubul…</option>
                        {(clubs ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nume}</option>)}
                      </select>
                    )}
                    <Button variant="success" disabled={isAdmin && !extern && !clubInscriere} onClick={() => setWizardOpen(true)}>
                      + Înscrie Sportivi din Club
                    </Button>
                  </div>
                )}
                <InscrieriView
                  competitie={competitie}
                  categorii={categorii}
                  categoriiToate={categorii}
                  probe={probe}
                  inscrieri={inscrieri}
                  echipe={echipe}
                  grade={grade}
                  isAdmin={isAdmin}
                  isClubAdmin={isClubAdmin}
                  isSuperAdmin={permissions.isSuperAdmin}
                  poateEdita={canEditEchipe}
                  myClubId={myClubId || null}
                  numeClub={currentUser?.cluburi?.nume ?? ''}
                  vizeSportivi={vizeSportivi}
                  sportivi={filteredData.sportivi.filter((s: Sportiv) => s.status === 'Activ')}
                  onRefresh={fetchData}
                  filtre={filtre}
                  toggleGen={toggleGen}
                  setFiltre={setFiltre}
                  resetFiltre={resetFiltre}
                  nrFiltreActive={nrFiltreActive}
                />
              </div>
            )
          )}

          {/* TAXE (extern, read-only) */}
          {activeTab === 'plati' && extern && (
            <PlatiClubExtern
              competitie={competitie}
              categorii={categorii}
              probe={probe}
              inscrieri={inscrieri}
              echipe={echipe}
              clubId={myClubId || ''}
            />
          )}

          {/* DETALII (extern) */}
          {activeTab === 'detalii' && extern && (
            <Card className="space-y-2 text-sm text-[var(--t-text)]">
              <div><span className="text-[var(--t-text-muted)]">Denumire: </span>{competitie.denumire}</div>
              <div><span className="text-[var(--t-text-muted)]">Tip: </span>{tipuriLabelsCtx.get(competitie.tip) ?? TIP_COMPETITIE_LABELS[competitie.tip as keyof typeof TIP_COMPETITIE_LABELS] ?? competitie.tip}</div>
              <div><span className="text-[var(--t-text-muted)]">Perioadă: </span>{fmtDate(competitie.data_inceput)} – {fmtDate(competitie.data_sfarsit)}</div>
              {competitie.locatie && <div><span className="text-[var(--t-text-muted)]">Locație: </span>{competitie.locatie}</div>}
              {competitie.organizator && <div><span className="text-[var(--t-text-muted)]">Organizator: </span>{competitie.organizator}</div>}
              {competitie.deadline_inscrieri && <div><span className="text-[var(--t-text-muted)]">Termen limită înscrieri: </span>{fmtDate(competitie.deadline_inscrieri)}</div>}
              {competitie.observatii && <div><span className="text-[var(--t-text-muted)]">Observații: </span>{competitie.observatii}</div>}
              {competitie.fram_obligatoriu && <div><span className="text-[var(--t-text-muted)]">Participare: </span>doar sportivi cu viza FRAM {anFram} achitată sau scutită</div>}
              <div>
                <span className="text-[var(--t-text-muted)]">Probe: </span>
                {[...probe].sort((a, b) => (a.ordine_afisare ?? 0) - (b.ordine_afisare ?? 0)).map(p => p.denumire).join(', ') || '—'}
              </div>
              <div><span className="text-[var(--t-text-muted)]">Categorii: </span>{categorii.length}</div>
            </Card>
          )}

          {/* RAPORT TAB */}
          {activeTab === 'raport' && (isAdmin || isClubAdmin) && (
            <RaportInscrieri
              competitie={competitie}
              categorii={categorii}
              probe={probe}
              inscrieri={inscrieri}
              echipe={echipe}
              isAdmin={isAdmin}
              myClubId={myClubId || null}
              filtre={filtre}
              toggleGen={toggleGen}
              setFiltre={setFiltre}
              resetFiltre={resetFiltre}
              nrFiltreActive={nrFiltreActive}
              grade={grade}
            />
          )}

          {/* REZULTATE LEGACY TAB */}
          {activeTab === 'rezultate_legacy' && competitie.legacy_eveniment_id && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Rezultate înregistrate în sistemul vechi pentru această competiție.
              </p>
              {loadingLegacy ? (
                <div className="text-center text-slate-400 py-8">Se încarcă...</div>
              ) : rezultateLegacy.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic">Nicio înregistrare găsită în sistemul vechi.</div>
              ) : (
                <div className="-mx-4 sm:mx-0 overflow-x-auto">
                  <table className="w-full text-sm text-slate-300 min-w-[320px]">
                    <thead>
                      <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }} className="text-xs uppercase">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Sportiv</th>
                        <th className="p-2 text-left">Probe</th>
                        <th className="p-2 text-left">Rezultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rezultateLegacy.map((r, idx) => (
                        <tr key={r.id} className="border-b border-[var(--t-border)] hover:bg-[var(--t-table-row-hover)]">
                          <td className="p-2 text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-medium text-white">
                            <span className="uppercase">{r.sportiv ? `${r.sportiv.nume} ${r.sportiv.prenume}` : '—'}</span>
                          </td>
                          <td className="p-2 text-slate-400">{r.probe || '—'}</td>
                          <td className="p-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.rezultat === 'Participare' ? 'bg-slate-700 text-slate-300' : 'bg-amber-900/40 text-amber-300'}`}>
                              {r.rezultat}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB */}
          {activeTab === 'financiar' && isAdmin && (
            <FinanciarView
              competitie={competitie}
              categorii={categorii}
              inscrieri={inscrieri}
              echipe={echipe}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              <AdminPanel
                competitie={competitie}
                probe={probe}
                setProbe={setProbe}
                categorii={categorii}
                setCategorii={setCategorii}
                inscrieri={inscrieri}
                echipe={echipe}
                grade={grade}
                vizeSportivi={vizeSportivi}
                catFormOpen={catFormOpen}
                setCatFormOpen={setCatFormOpen}
                catToEdit={catToEdit}
                setCatToEdit={setCatToEdit}
                probaFormOpen={probaFormOpen}
                setProbaFormOpen={setProbaFormOpen}
                onRefresh={fetchData}
              />
              {/* Cerința 4 — editare denumiri tipuri competiție, doar SUPER_ADMIN */}
              {permissions.isSuperAdmin && (
                <div className="pt-4 border-t border-slate-700/60">
                  <TipuriCompetitieAdmin permissions={permissions} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'template' && isAdmin && (
            <CategoriiTemplateManager
              permissions={permissions}
              competitieId={competitie.id}
              probe={probe}
              categoriiExistente={categorii}
              onImported={(cats) => setCategorii(prev => [...prev, ...cats])}
              filtre={filtre}
              toggleGen={toggleGen}
              resetFiltreHook={resetFiltre}
              nrFiltreActiveHook={nrFiltreActive}
            />
          )}

          {activeTab === 'acces_extern' && permissions.isSuperAdmin && !extern && (
            <CereriAccesAdmin competitieId={competitie.id} />
          )}

          {activeTab === 'jurnal_cont_club' && !extern && (isAdmin || isClubAdmin || permissions.isInstructor) && (
            <JurnalActori competitieId={competitie.id} />
          )}

          {activeTab === 'schimbari_grad' && !extern && permissions.isSuperAdmin && (
            <SchimbariGrad competitieId={competitie.id} poateMarca={permissions.isSuperAdmin} />
          )}

          {activeTab === 'cereri_interclub' && permissions.isSuperAdmin && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">Cereri inter-club</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cereri de coechipier de la cluburi diferite pentru aceasta competitie.
                </p>
              </div>
              <CereriInterclubAdmin competitieId={competitie.id} />
            </div>
          )}
        </>
      )}

      {/* Inscriere modal */}
      {inscriereModal && (
        <InscriereModal
          competitie={competitie}
          categorie={inscriereModal}
          sportivi={sportiviModalInscriere}
          grade={grade}
          inscrieri={inscrieri}
          echipe={echipe}
          clubId={clubInscriere || ''}
          numeClub={numeClubInscriere}
          vizeSportivi={vizeFram.vize}
          arme={competitie.tip === 'cvd' ? armeCvd : undefined}
          tipProba={probe.find(p => p.id === inscriereModal.proba_id)?.tip_proba}
          categorii={categoriiActive}
          categoriiToate={categorii}
          onClose={() => { setInscriereModal(null); fetchDataSilent(); }}
          onSaved={() => {
            const goToHub = goToHubAfterModalRef.current;
            goToHubAfterModalRef.current = null;
            setInscriereModal(null);
            fetchDataSilent();
            goToHub?.();
          }}
        />
      )}
    </div>
  );
};

// -----------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------

export const CompetitiiManagement: React.FC<CompetitiiProps> = ({ permissions, onBack, onViewSportiv }) => {
  const { showError } = useError();
  const [competitii, setCompetitii] = useState<Competitie[]>([]);
  const [legacyEvents, setLegacyEvents] = useState<EvenimentLegacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedComp, setSelectedComp] = useState<Competitie | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editComp, setEditComp] = useState<Competitie | null>(null);
  const [cloneSursa, setCloneSursa] = useState<Competitie | null>(null);
  const [search, setSearch] = useState('');
  const [migrareEv, setMigrareEv] = useState<EvenimentLegacy | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
  const openConfirm = (message: string, onConfirm: () => void, opts?: { title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info' }) => setConfirmDialog({ open: true, message, onConfirm, ...opts });
  const savedScrollRef = useRef(0);
  // ID-ul competiției salvat la mount — restaurat după ce lista se încarcă
  const pendingRestoreId = useRef<string | null>(ssGet(SS_KEY_COMP_ID));
  const autoEnteredRef = useRef(false);
  const { labels: tipuriLabels } = useTipuriCompetitie();

  const isAdmin = permissions.isSuperAdmin || permissions.isFederationAdmin;

  const fetchCompetitii = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: legacyData }] = await Promise.all([
      supabase.from('competitii').select().order('data_inceput', { ascending: false }),
      supabase.from('evenimente').select('id,denumire,data,data_sfarsit,locatie,organizator,probe_disponibile,club_id').eq('tip', 'Competitie').order('data', { ascending: false }),
    ]);
    if (error) { showError("Eroare", error.message); }
    const competitiiData = (data || []) as Competitie[];
    setCompetitii(competitiiData);
    // Exclude evenimentele deja migrate (au legacy_eveniment_id setat în competitii)
    const migratedIds = new Set(competitiiData.map(c => c.legacy_eveniment_id).filter(Boolean));
    setLegacyEvents(((legacyData || []) as EvenimentLegacy[]).filter(e => !migratedIds.has(e.id)));
    setLoading(false);

    // Cerința 1 — restaurare stare după refresh
    if (pendingRestoreId.current) {
      const found = competitiiData.find(c => c.id === pendingRestoreId.current);
      if (found) {
        setSelectedComp(found);
        setView('detail');
      }
      pendingRestoreId.current = null;
    } else if (!autoEnteredRef.current && !error) {
      // O singură competiție cu înscrieri deschise -> intrăm direct în ea (o singură dată pe mount, doar după fetch reușit)
      const deschise = competitiiData.filter(c => c.status === 'inscrieri_deschise');
      if (deschise.length === 1) {
        setSelectedComp(deschise[0]);
        ssDel(SS_KEY_TAB); // tab rămas de la altă competiție nu trebuie aplicat
        ssSet(SS_KEY_COMP_ID, deschise[0].id);
        setView('detail');
      }
      autoEnteredRef.current = true;
    }
  }, [showError]);

  useEffect(() => { fetchCompetitii(); }, [fetchCompetitii]);

  const filteredCompetitii = competitii.filter(c =>
    c.denumire.toLowerCase().includes(search.toLowerCase()) ||
    (c.locatie || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredLegacy = legacyEvents.filter(e =>
    e.denumire.toLowerCase().includes(search.toLowerCase()) ||
    (e.locatie || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    openConfirm('Ștergi această competiție și toate datele aferente?', async () => {
      const { error } = await supabase.from('competitii').delete().eq('id', id);
      if (error) showError("Eroare", error.message);
      else setCompetitii(prev => prev.filter(c => c.id !== id));
    }, { title: 'Șterge competiție', confirmLabel: 'Șterge', variant: 'danger' });
  };

  if (view === 'detail' && selectedComp) {
    return (
      <CompetitieDetail
        competitie={selectedComp}
        permissions={permissions}
        onViewSportiv={onViewSportiv}
        onBack={() => {
          setView('list');
          setSelectedComp(null);
          ssDel(SS_KEY_COMP_ID);
          ssDel(SS_KEY_TAB);
          requestAnimationFrame(() => {
            try {
              window.scrollTo({ top: savedScrollRef.current, left: 0, behavior: 'instant' as ScrollBehavior });
            } catch {
              window.scrollTo(0, savedScrollRef.current);
            }
          });
        }}
        onUpdated={(updated) => {
          setSelectedComp(updated);
          setCompetitii(prev => prev.map(c => c.id === updated.id ? updated : c));
        }}
      />
    );
  }

  return (
    <TipuriLabelsContext.Provider value={tipuriLabels}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack} className="!p-2">
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        </div>
        {isAdmin && (
          <Button variant="primary" className="min-h-11 lg:min-h-10" onClick={() => { setEditComp(null); setFormOpen(true); }}>
            <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Competiție
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută competiție..."
          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] text-[var(--t-text)] placeholder:text-[var(--t-text-muted)] rounded-lg h-11 lg:h-10 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-input-focus-ring)]"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusLabel).map(([k, { label }]) => (
          <Card key={k} className="md:p-6">
            <div className="text-2xl font-semibold text-[var(--t-text)]">{competitii.filter(c => c.status === k).length}</div>
            <div className="text-xs font-semibold text-[var(--t-text-muted)] mt-0.5">{label}</div>
          </Card>
        ))}
        {legacyEvents.length > 0 && (
          <Card className="md:p-6">
            <div className="text-2xl font-semibold text-[var(--t-text)]">{legacyEvents.length}</div>
            <div className="text-xs font-semibold text-[var(--t-text-muted)] mt-0.5">Legacy</div>
          </Card>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-sm text-[var(--t-text-muted)] py-12">Se încarcă...</div>
      ) : (
        <div className="space-y-2">
          {filteredCompetitii.map(comp => (
            <Card
              key={comp.id}
              className="p-4 cursor-pointer hover:border-[var(--t-primary)] transition-colors"
              style={{ touchAction: 'manipulation' }}
              onClick={() => { savedScrollRef.current = window.scrollY; setSelectedComp(comp); ssSet(SS_KEY_COMP_ID, comp.id); setView('detail'); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-[var(--t-text)]">{comp.denumire}</h3>
                    <Badge variant={STATUS_BADGE[comp.status] ?? 'slate'}>{statusLabel[comp.status]?.label}</Badge>
                    <span className="text-xs text-[var(--t-text-muted)]">
                      {tipuriLabels.get(comp.tip) ?? TIP_COMPETITIE_LABELS[comp.tip as keyof typeof TIP_COMPETITIE_LABELS] ?? comp.tip}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--t-text-muted)] mt-1">
                    {fmtDate(comp.data_inceput)} – {fmtDate(comp.data_sfarsit)}
                    {comp.locatie && ` · ${comp.locatie}`}
                    {comp.deadline_inscrieri && ` · Deadline: ${fmtDate(comp.deadline_inscrieri)}`}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {permissions.isSuperAdmin && (
                      <Button size="sm" variant="secondary" className="!p-2" title="Clonează" aria-label="Clonează competiția"
                        onClick={() => setCloneSursa(comp)}>
                        <CopyIcon className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" className="!p-2"
                      onClick={() => { setEditComp(comp); setFormOpen(true); }}>
                      <EditIcon className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="danger" className="!p-2"
                      onClick={() => handleDelete(comp.id)}>
                      <TrashIcon className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {comp.observatii && (
                <div className="text-xs text-slate-500 mt-2">{comp.observatii}</div>
              )}
            </Card>
          ))}
          {filteredLegacy.length > 0 && (
            <div className="pt-2 pb-1">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                Competiții din sistemul vechi — necesită migrare
              </p>
            </div>
          )}
          {filteredLegacy.map(ev => (
            <Card key={`legacy-${ev.id}`} className="p-4 border-dashed border-amber-800/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white">{ev.denumire}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50">
                      Legacy
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {fmtDate(ev.data)}{ev.data_sfarsit && ev.data_sfarsit !== ev.data ? ` – ${fmtDate(ev.data_sfarsit)}` : ''}
                    {ev.locatie && ` · ${ev.locatie}`}
                    {ev.organizator && ` · ${ev.organizator}`}
                  </div>
                  {ev.probe_disponibile && ev.probe_disponibile.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">Probe: {ev.probe_disponibile.join(', ')}</div>
                  )}
                </div>
                {isAdmin && (
                  <Button size="sm" variant="secondary" onClick={() => setMigrareEv(ev)}>
                    Migrează
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {filteredCompetitii.length === 0 && filteredLegacy.length === 0 && !loading && (
            <div className="text-center text-slate-500 py-16 italic">
              {isAdmin
                ? 'Nicio competiție creată. Apasă "Adaugă Competiție" pentru a începe.'
                : 'Nu există competiții disponibile momentan.'}
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      <CompetitieForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        comp={editComp}
        poateSetaFram={permissions.isSuperAdmin}
        onSaved={(comp) => {
          if (editComp) {
            setCompetitii(prev => prev.map(c => c.id === comp.id ? comp : c));
          } else {
            setCompetitii(prev => [comp, ...prev]);
          }
        }}
      />

      {/* Clonare competitie (super admin, Faza 45) */}
      <CloneazaCompetitieModal
        sursa={cloneSursa}
        numeExistente={competitii.map(c => c.denumire)}
        onClose={() => setCloneSursa(null)}
        onCloned={(nou) => {
          setCloneSursa(null);
          setCompetitii(prev => [nou, ...prev]);
          savedScrollRef.current = window.scrollY;
          setSelectedComp(nou);
          ssDel(SS_KEY_TAB);
          ssSet(SS_KEY_COMP_ID, nou.id);
          setView('detail');
        }}
      />

      {/* Migrare legacy modal */}
      <MigrareModal
        ev={migrareEv}
        onClose={() => setMigrareEv(null)}
        onMigrated={(newComp, legacyId) => {
          setCompetitii(prev => [newComp, ...prev]);
          setLegacyEvents(prev => prev.filter(e => e.id !== legacyId));
          setMigrareEv(null);
        }}
      />

      <ConfirmModal
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        message={confirmDialog.message}
        title={confirmDialog.title}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
    </TipuriLabelsContext.Provider>
  );
};
