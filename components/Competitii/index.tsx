import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Permissions, Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, SolicitareEchipaIncompleta, Sportiv, Grad, TipProba } from '../../types';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Modal, Input, Select, Card, SearchableSelect } from '../ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, ordineToLabel, TIP_PROBA_LABELS, TIP_COMPETITIE_LABELS,
  DEFAULT_PROBE_PER_TIP, TemplateCategorieInput
} from '../../utils/competitiiTemplates';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import { filtreazaSportiviEligibili, calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';
import CategoriiTemplateManager from './CategoriiTemplateManager';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from '../../utils/taxeCompetitie';
import { VizaSportiv } from '../../types';
import InscriereClubWizard from './InscriereClubWizard';
import { TipuriCompetitieAdmin } from './TipuriCompetitieAdmin';
import { CereriInterclubAdmin } from './CereriInterclubAdmin';

import {
  SS_KEY_COMP_ID, SS_KEY_TAB, ssGet, ssSet, ssDel,
  areVizaFRAM, WarningVizaFRAM,
  fmtDate, statusLabel, tipBadge, TipuriLabelsContext,
} from './constants';
import { CompetitieForm } from './CompetitieForm';
import { RaportInscrieri } from './RaportInscrieri';
import { FinanciarView } from './FinanciarView';
import { ProbaForm } from './ProbaForm';
import { CategorieForm } from './CategorieForm';
import { ProbeEditor } from './ProbeEditor';
import { FuzionariPanel } from './FuzionariPanel';
import { SolicitariEchipePanel } from './SolicitariEchipePanel';
import { GenerareSabloaneModal } from './GenerareSabloaneModal';

interface CompetitiiProps {
  permissions: Permissions;
  onBack: () => void;
}

type View = 'list' | 'detail' | 'inscrieri';

// -----------------------------------------------
// COMPETITION DETAIL (categories + registrations view)
// -----------------------------------------------
interface CompetitieDetailProps {
  competitie: Competitie;
  permissions: Permissions;
  onBack: () => void;
  onUpdated: (c: Competitie) => void;
}

const CompetitieDetail: React.FC<CompetitieDetailProps> = ({ competitie, permissions, onBack, onUpdated }) => {
  const tipuriLabelsCtx = React.useContext(TipuriLabelsContext);
  const { filteredData, grade, currentUser, vizeSportivi, activeRoleContext } = useData();
  const { showError } = useError();
  const [probe, setProbe] = useState<ProbaCompetitie[]>([]);
  const [categorii, setCategorii] = useState<CategorieCompetitie[]>([]);
  const [inscrieri, setInscrieri] = useState<InscriereCompetitie[]>([]);
  const [echipe, setEchipe] = useState<EchipaCompetitie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categorii' | 'inscrieri' | 'raport' | 'admin' | 'rezultate_legacy' | 'financiar' | 'template' | 'cereri_interclub'>(() => {
    const saved = ssGet(SS_KEY_TAB);
    if (saved === 'categorii' || saved === 'inscrieri' || saved === 'raport' || saved === 'admin' || saved === 'rezultate_legacy' || saved === 'financiar' || saved === 'cereri_interclub') return saved;
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
  // Task 1: vizualizare sportivi înscriși per categorie
  const [viewInscrieriCatId, setViewInscrieriCatId] = useState<string | null>(null);
  // Task 5: expand/collapse tabele per categorie (tab Categorii)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const isAdmin = permissions.isSuperAdmin || permissions.isFederationAdmin;
  const isClubAdmin = permissions.isAdminClub;

  // Persistă tab-ul activ în sessionStorage la fiecare schimbare
  const handleSetActiveTab = useCallback((tab: 'categorii' | 'inscrieri' | 'raport' | 'admin' | 'rezultate_legacy' | 'financiar' | 'template' | 'cereri_interclub') => {
    setActiveTab(tab);
    ssSet(SS_KEY_TAB, tab);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [probeRes, catRes, inRes, echRes] = await Promise.all([
      supabase.from('probe_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('categorii_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('inscrieri_competitie').select('*, sportiv:sportivi(id, nume, prenume, grad_actual_id, data_nasterii, club_id, cluburi(id, nume))').eq('competitie_id', competitie.id),
      supabase.from('echipe_competitie').select('*, club:cluburi(id, nume), echipa_sportivi(sportiv_id, rol, sportiv:sportivi(id, nume, prenume, club_id, cluburi(id, nume)))').eq('competitie_id', competitie.id),
    ]);
    setProbe((probeRes.data || []) as ProbaCompetitie[]);
    const loadedCats = (catRes.data || []) as CategorieCompetitie[];
    setCategorii(loadedCats);
    setExpandedCats(new Set(loadedCats.map(c => c.id)));
    setInscrieri((inRes.data || []) as InscriereCompetitie[]);
    setEchipe((echRes.data || []) as EchipaCompetitie[]);
    setLoading(false);
  }, [competitie.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!competitie.legacy_eveniment_id) return;
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
  }, [competitie.legacy_eveniment_id]);

  const filteredCategorii = selectedProbaId
    ? categorii.filter(c => c.proba_id === selectedProbaId)
    : categorii;

  const inscrieriCount = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId && i.status?.toLowerCase() !== 'retras').length +
    echipe.filter(e => e.categorie_id === catId && e.status?.toLowerCase() !== 'retrasa').length;

  const canRegister = competitie.status === 'inscrieri_deschise';
  const myClubId = activeRoleContext?.club_id ?? currentUser?.club_id;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white">{competitie.denumire}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipBadge[competitie.tip]}`}>
              {tipuriLabelsCtx.get(competitie.tip) ?? TIP_COMPETITIE_LABELS[competitie.tip as keyof typeof TIP_COMPETITIE_LABELS] ?? competitie.tip}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabel[competitie.status]?.color}`}>
              {statusLabel[competitie.status]?.label}
            </span>
            <span className="text-xs text-slate-400">{fmtDate(competitie.data_inceput)} – {fmtDate(competitie.data_sfarsit)}</span>
            {competitie.locatie && <span className="text-xs text-slate-400">{competitie.locatie}</span>}
          </div>
        </div>
        {/* Cerința 2 — buton Refresh */}
        <button
          onClick={fetchData}
          disabled={loading}
          title="Reîncarcă datele competiției"
          style={{ touchAction: 'manipulation' }}
          className="h-10 w-10 flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-400 transition-colors disabled:opacity-40 shrink-0"
          aria-label="Refresh"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        {isAdmin && (
          <Button
            size="sm" variant="secondary"
            onClick={async () => {
              const newStatus = competitie.status === 'draft' ? 'inscrieri_deschise'
                : competitie.status === 'inscrieri_deschise' ? 'inscrieri_inchise'
                  : competitie.status === 'inscrieri_inchise' ? 'finalizata' : 'draft';
              const { data, error } = await supabase.from('competitii')
                .update({ status: newStatus }).eq('id', competitie.id).select().single();
              if (!error && data) onUpdated(data as Competitie);
            }}
          >
            {competitie.status === 'draft' ? 'Deschide Înscrierile' :
              competitie.status === 'inscrieri_deschise' ? 'Închide Înscrierile' :
                competitie.status === 'inscrieri_inchise' ? 'Finalizează' : 'Redeschide'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scroll-smooth scrollbar-hide">
        <button onClick={() => handleSetActiveTab('inscrieri')} style={{ touchAction: 'manipulation' }}
          className={`flex-1 min-w-[120px] h-12 flex items-center justify-center gap-2 px-4 rounded-lg text-base font-semibold transition-colors whitespace-nowrap ${activeTab === 'inscrieri' ? 'bg-brand-primary text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'}`}>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Înscrieri <span className="text-sm font-normal opacity-75">({
            isAdmin
              ? inscrieri.length + echipe.length
              : inscrieri.filter(i => i.club_id === myClubId && i.status?.toLowerCase() !== 'retras').length
                + echipe.filter(e => e.club_id === myClubId && e.status?.toLowerCase() !== 'retrasa').length
          })</span></span>
        </button>
        {(isAdmin || isClubAdmin) && (
          <button
            onClick={() => handleSetActiveTab('raport')}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'raport'
                ? 'bg-brand-primary text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Raport
          </button>
        )}
        <button onClick={() => handleSetActiveTab('categorii')} style={{ touchAction: 'manipulation' }}
          className={`flex-1 min-w-[120px] h-12 flex items-center justify-center gap-2 px-4 rounded-lg text-base font-semibold transition-colors whitespace-nowrap ${activeTab === 'categorii' ? 'bg-slate-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'}`}>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span>Categorii <span className="text-sm font-normal opacity-75">({categorii.length})</span></span>
        </button>
        {isAdmin && (
          <button onClick={() => handleSetActiveTab('admin')} style={{ touchAction: 'manipulation' }}
            className={`h-12 flex items-center justify-center gap-2 px-4 rounded-lg text-base font-semibold transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-slate-800 text-yellow-400 hover:bg-slate-700 border border-slate-700'}`}>
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => handleSetActiveTab('financiar')}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'financiar'
                ? 'bg-brand-primary text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Financiar
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => handleSetActiveTab('template')}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'template'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Template-uri
          </button>
        )}
        {permissions.isSuperAdmin && (
          <button
            onClick={() => handleSetActiveTab('cereri_interclub')}
            style={{ touchAction: 'manipulation' }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'cereri_interclub'
                ? 'bg-indigo-700 text-white'
                : 'text-indigo-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Cereri inter-club
          </button>
        )}
        {competitie.legacy_eveniment_id && (
          <button onClick={() => handleSetActiveTab('rezultate_legacy')} style={{ touchAction: 'manipulation' }}
            className={`h-12 flex items-center justify-center gap-2 px-4 rounded-lg text-base font-semibold transition-colors whitespace-nowrap ${activeTab === 'rezultate_legacy' ? 'bg-amber-700 text-white shadow-lg' : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700'}`}>
            Rezultate Vechi
          </button>
        )}
        <button
          onClick={fetchData}
          disabled={loading}
          title="Reîncarcă datele competiției"
          style={{ touchAction: 'manipulation' }}
          className="h-12 w-12 flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-400 hover:text-white hover:border-slate-400 transition-colors disabled:opacity-40 shrink-0 ml-auto"
          aria-label="Refresh"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-12">Se încarcă...</div>
      ) : (
        <>
          {/* CATEGORII TAB */}
          {activeTab === 'categorii' && (
            <div className="space-y-3">
              {/* Filter by proba */}
              {probe.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedProbaId('')}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${!selectedProbaId ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                  >
                    Toate ({categorii.length})
                  </button>
                  {probe.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProbaId(p.id)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedProbaId === p.id ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                    >
                      {p.denumire} ({categorii.filter(c => c.proba_id === p.id).length})
                    </button>
                  ))}
                </div>
              )}

              {/* Category list */}
              <div className="-mx-4 sm:mx-0 overflow-x-auto">
                <table className="w-full text-sm text-slate-300 min-w-[480px]">
                  <thead>
                    <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                      <th className="p-2 text-left w-10">#</th>
                      <th className="p-2 text-left">Categorie</th>
                      <th className="p-2 text-left hidden md:table-cell">Probă</th>
                      <th className="p-2 text-left hidden md:table-cell">Participare</th>
                      <th className="p-2 text-center">Înscriși</th>
                      {canRegister && isClubAdmin && <th className="p-2 text-right">Acțiuni</th>}
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
                      const colCount = (canRegister && isClubAdmin) ? 6 : 5;
                      return (
                        <React.Fragment key={cat.id}>
                          <tr className="hover:bg-[var(--t-table-row-hover)]">
                            <td className="p-2 text-[var(--t-text-muted)]">{cat.numar_categorie}</td>
                            <td className="p-2">
                              <div className="font-medium text-white">{cat.denumire}</div>
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
                                <Button size="sm" variant="info" onClick={() => setInscriereModal(cat)}>
                                  Înscrie
                                </Button>
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
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ins.status === 'confirmat' ? 'bg-green-800 text-green-200' : ins.status === 'retras' ? 'bg-red-800 text-red-200' : 'bg-slate-700 text-slate-300'}`}>
                                              {ins.status}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {echipeCat.map((ec) => {
                                        const membri = (ec as any).echipa_sportivi || [];
                                        return (
                                          <div key={ec.id} className="px-3 py-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm text-white font-medium flex items-center gap-2 flex-wrap">
                                                {ec.denumire_echipa || 'Echipă fără denumire'}
                                                {(ec as any).club?.nume && (
                                                  <span className="text-[10px] text-slate-400 font-normal normal-case">{(ec as any).club.nume}</span>
                                                )}
                                              </span>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${ec.status === 'confirmata' ? 'bg-green-800 text-green-200' : 'bg-slate-700 text-slate-300'}`}>
                                                {ec.status}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {membri.map((ms: any) => {
                                                const numeClubMembru = ms.sportiv?.cluburi?.nume || null;
                                                return (
                                                <span key={ms.sportiv_id} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                                                  <span className="uppercase">{ms.sportiv ? `${ms.sportiv.nume} ${ms.sportiv.prenume}` : ms.sportiv_id}</span>
                                                  {numeClubMembru && <span className="text-slate-500 ml-1 normal-case">({numeClubMembru})</span>}
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
            </div>
          )}

          {/* INSCRIERI TAB */}
          {activeTab === 'inscrieri' && (
            loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Se încarcă datele competiției...
              </div>
            ) : (wizardOpen && isClubAdmin) ? (
              <InscriereClubWizard
                competitie={competitie}
                probe={probe}
                categorii={categorii}
                sportivi={filteredData.sportivi.filter(s => s.club_id === myClubId)}
                grade={grade}
                inscrieri={inscrieri}
                echipe={echipe}
                clubId={myClubId || ''}
                numeClub={currentUser?.cluburi?.nume ?? ''}
                vizeSportivi={vizeSportivi}
                myClubId={myClubId}
                onBack={() => setWizardOpen(false)}
                onSaved={() => { setWizardOpen(false); fetchData(); }}
                onOpenInscriereModal={(cat, goToHub) => {
                  setInscriereModal(cat);
                  goToHubAfterModalRef.current = goToHub ?? null;
                }}
              />
            ) : (
              <div className="space-y-3">
                {canRegister && isClubAdmin && (
                  <div className="flex justify-end">
                    <Button variant="success" onClick={() => setWizardOpen(true)}>
                      + Înscrie Sportivi din Club
                    </Button>
                  </div>
                )}
                <InscrieriView
                  competitie={competitie}
                  categorii={categorii}
                  probe={probe}
                  inscrieri={inscrieri}
                  echipe={echipe}
                  grade={grade}
                  isAdmin={isAdmin}
                  isClubAdmin={isClubAdmin}
                  myClubId={myClubId || null}
                  numeClub={currentUser?.cluburi?.nume ?? ''}
                  vizeSportivi={vizeSportivi}
                  sportivi={filteredData.sportivi.filter((s: Sportiv) => s.status === 'Activ')}
                  onRefresh={fetchData}
                />
              </div>
            )
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
                  <table className="w-full text-sm text-slate-300 min-w-[480px]">
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
            />
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
          sportivi={filteredData.sportivi.filter(s => s.club_id === myClubId)}
          grade={grade}
          inscrieri={inscrieri}
          echipe={echipe}
          clubId={myClubId || ''}
          numeClub={currentUser?.cluburi?.nume ?? ''}
          vizeSportivi={vizeSportivi}
          onClose={() => setInscriereModal(null)}
          onSaved={() => {
            const goToHub = goToHubAfterModalRef.current;
            goToHubAfterModalRef.current = null;
            setInscriereModal(null);
            fetchData();
            goToHub?.();
          }}
        />
      )}
    </div>
  );
};

// -----------------------------------------------
// ADMIN PANEL — category + probe management + statistics
// -----------------------------------------------
interface AdminPanelProps {
  competitie: Competitie;
  probe: ProbaCompetitie[];
  setProbe: React.Dispatch<React.SetStateAction<ProbaCompetitie[]>>;
  categorii: CategorieCompetitie[];
  setCategorii: React.Dispatch<React.SetStateAction<CategorieCompetitie[]>>;
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  vizeSportivi: VizaSportiv[];
  catFormOpen: boolean;
  setCatFormOpen: (v: boolean) => void;
  catToEdit: CategorieCompetitie | null;
  setCatToEdit: (c: CategorieCompetitie | null) => void;
  probaFormOpen: boolean;
  setProbaFormOpen: (v: boolean) => void;
  onRefresh: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  competitie, probe, setProbe, categorii, setCategorii,
  inscrieri, echipe, grade, vizeSportivi, catFormOpen, setCatFormOpen, catToEdit, setCatToEdit,
  probaFormOpen, setProbaFormOpen, onRefresh,
}) => {
  const { showError } = useError();
  const [adminSection, setAdminSection] = useState<'stats' | 'probe' | 'categorii' | 'fuzionari' | 'echipe_incomplete'>('stats');
  // Expand/collapse detalii per categorie în tab Categorii din Admin
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [generareOpen, setGenerareOpen] = useState(false);
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();

  const inscrieriCount = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId && i.status?.toLowerCase() !== 'retras').length +
    echipe.filter(e => e.categorie_id === catId && e.status?.toLowerCase() !== 'retrasa').length;

  const totalInscrisi = inscrieri.filter(i => i.status?.toLowerCase() !== 'retras').length +
    echipe.filter(e => e.status?.toLowerCase() !== 'retrasa').length;
  const categoriiActive = categorii.filter(c => inscrieriCount(c.id) >= c.min_participanti_start).length;
  const categoriiInsuficiente = categorii.filter(c => {
    const cnt = inscrieriCount(c.id);
    return cnt > 0 && cnt < c.min_participanti_start;
  }).length;

  // Sportivi înscriși fără viza FRAM activă
  const sportivifaraViza = inscrieri.filter(i => {
    const sportiv = (i as any).sportiv;
    return sportiv && !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
  }).length;

  const handleDeleteCategorie = async (id: string) => {
    if (!window.confirm('Ștergi această categorie? Toate înscrierile aferente vor fi șterse.')) return;
    const { error } = await supabase.from('categorii_competitie').delete().eq('id', id);
    if (error) { showError('Eroare', error.message); return; }
    setCategorii(prev => prev.filter(c => c.id !== id));
  };

  const handleDeleteProba = async (id: string) => {
    if (!window.confirm('Ștergi această probă? Categoriile asociate vor rămâne fără probă.')) return;
    const { error } = await supabase.from('probe_competitie').delete().eq('id', id);
    if (error) { showError('Eroare', error.message); return; }
    setProbe(prev => prev.filter(p => p.id !== id));
  };

  // Group categorii by proba for stats
  const catByProba = probe.map(p => ({
    proba: p,
    cats: categorii.filter(c => c.proba_id === p.id),
  }));
  const catFaraProba = categorii.filter(c => !c.proba_id);

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex gap-2 flex-wrap">
        {(['stats', 'probe', 'categorii', 'fuzionari', 'echipe_incomplete'] as const).map(s => (
          <button key={s} onClick={() => setAdminSection(s)}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${adminSection === s ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {s === 'stats' ? 'Statistici'
              : s === 'probe' ? `Probe (${probe.length})`
              : s === 'categorii' ? `Categorii (${categorii.length})`
              : s === 'fuzionari' ? `Fuzionări ${categoriiInsuficiente > 0 ? `(${categoriiInsuficiente})` : ''}`
              : 'Echipe incomplete'}
          </button>
        ))}
      </div>

      {/* STATISTICI */}
      {adminSection === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="text-2xl font-bold text-white">{categorii.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total categorii</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="text-2xl font-bold text-white">{totalInscrisi}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total înscrieri</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-green-800">
              <div className="text-2xl font-bold text-green-400">{categoriiActive}</div>
              <div className="text-xs text-slate-400 mt-0.5">Categorii cu minim atins</div>
            </div>
            <div className={`rounded-lg p-3 border ${sportivifaraViza > 0 ? 'bg-yellow-900/30 border-yellow-700' : 'bg-slate-800 border-slate-700'}`}>
              <div className={`text-2xl font-bold ${sportivifaraViza > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{sportivifaraViza}</div>
              <div className="text-xs text-slate-400 mt-0.5">Fără viză FRAM {anCompetitie}</div>
            </div>
          </div>
          {sportivifaraViza > 0 && (
            <div className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300">
              <span className="text-base shrink-0">⚠</span>
              <span><strong>{sportivifaraViza} sportivi înscriși</strong> nu au viza FRAM achitată pentru {anCompetitie}. Aceștia nu vor putea participa în competiție fără vizarea legitimației FRAM.</span>
            </div>
          )}

          {/* Per probe stats */}
          {catByProba.map(({ proba, cats }) => {
            const total = cats.reduce((s, c) => s + inscrieriCount(c.id), 0);
            return (
              <div key={proba.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-4 py-2 bg-slate-700 flex justify-between items-center">
                  <span className="font-medium text-white text-sm">{proba.denumire}</span>
                  <span className="text-xs text-slate-400">{cats.length} categorii · {total} înscriși</span>
                </div>
                <div className="divide-y divide-slate-700/50">
                  {cats.filter(c => inscrieriCount(c.id) > 0).map(cat => {
                    const cnt = inscrieriCount(cat.id);
                    const ok = cnt >= cat.min_participanti_start;
                    return (
                      <div key={cat.id} className="px-4 py-2 flex items-center justify-between text-sm">
                        <span className="text-slate-300 truncate flex-1 mr-2">{cat.denumire}</span>
                        <span className={`text-xs font-bold shrink-0 ${ok ? 'text-green-400' : 'text-yellow-400'}`}>
                          {cnt} {ok ? '✓' : `(min ${cat.min_participanti_start}) ⚠`}
                        </span>
                      </div>
                    );
                  })}
                  {cats.filter(c => inscrieriCount(c.id) === 0).length > 0 && (
                    <div className="px-4 py-2 text-xs text-slate-500 italic">
                      {cats.filter(c => inscrieriCount(c.id) === 0).length} categorii fără înscrieri
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PROBE */}
      {adminSection === 'probe' && (
        <ProbeEditor
          competitieId={competitie.id}
          probe={probe}
          setProbe={setProbe}
          categorii={categorii}
          probaFormOpen={probaFormOpen}
          setProbaFormOpen={setProbaFormOpen}
          onDeleteProba={handleDeleteProba}
        />
      )}

      {/* CATEGORII */}
      {adminSection === 'categorii' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-slate-400">{categorii.length} categorii definite</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setGenerareOpen(true)}>
                Generează din șabloane
              </Button>
              <Button variant="success" size="sm" onClick={() => { setCatToEdit(null); setCatFormOpen(true); }}>
                <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Categorie
              </Button>
            </div>
          </div>
          <div className="-mx-4 sm:mx-0 overflow-x-auto">
            <table className="w-full text-sm text-slate-300 min-w-[480px]">
              <thead>
                <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                  <th className="p-2 text-left w-10">#</th>
                  <th className="p-2 text-left">Categorie</th>
                  <th className="p-2 text-left hidden md:table-cell">Probă</th>
                  <th className="p-2 text-center hidden md:table-cell">Tip</th>
                  <th className="p-2 text-center">Înscriși</th>
                  <th className="p-2 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--t-border)]">
                {categorii.map(cat => {
                  const proba = probe.find(p => p.id === cat.proba_id);
                  const cnt = inscrieriCount(cat.id);
                  const isCatExpanded = expandedCats.has(cat.id);
                  const toggleCat = () => setExpandedCats(prev => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id);
                    return next;
                  });
                  return (
                    <React.Fragment key={cat.id}>
                    <tr className="hover:bg-[var(--t-table-row-hover)]">
                      <td className="p-2 text-[var(--t-text-muted)] text-xs">{cat.numar_categorie}</td>
                      <td className="p-2">
                        <div className="text-white text-xs font-medium">{cat.denumire}</div>
                        {cat.arma && <div className="text-orange-400 text-[11px]">{cat.arma}</div>}
                      </td>
                      <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                        {proba ? TIP_PROBA_LABELS[proba.tip_proba] : <span className="text-red-400">Fără probă</span>}
                      </td>
                      <td className="p-2 hidden md:table-cell text-center text-xs text-slate-400">
                        {cat.tip_participare}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`text-xs font-bold ${cnt >= cat.min_participanti_start ? 'text-green-400' : cnt > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>
                          {cnt}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={toggleCat}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title={isCatExpanded ? 'Restrânge' : 'Extinde'}
                          >
                            {isCatExpanded ? '▲' : '▼'}
                          </button>
                          <Button size="sm" variant="secondary" className="!p-1.5" onClick={() => { setCatToEdit(cat); setCatFormOpen(true); }}>
                            <EditIcon className="w-3 h-3" />
                          </Button>
                          {cnt === 0 && (
                            <Button size="sm" variant="danger" className="!p-1.5" onClick={() => handleDeleteCategorie(cat.id)}>
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isCatExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 py-2 bg-[var(--t-surface-2)] text-xs text-[var(--t-text-muted)]">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div><span className="text-slate-500">Vârstă:</span> {cat.varsta_min ?? '?'}–{cat.varsta_max ?? '∞'}</div>
                            <div><span className="text-slate-500">Gen:</span> {cat.gen ?? '-'}</div>
                            <div><span className="text-slate-500">Grad:</span> {cat.grad_min_ordine ?? '0'}–{cat.grad_max_ordine ?? '∞'}</div>
                            <div><span className="text-slate-500">Min start:</span> {cat.min_participanti_start}</div>
                            {cat.tip_participare !== 'individual' && (
                              <div><span className="text-slate-500">Sportivi/echipă:</span> {cat.sportivi_per_echipa_min}–{cat.sportivi_per_echipa_max}</div>
                            )}
                            <div><span className="text-slate-500">Max echipe/club:</span> {cat.max_echipe_per_club}</div>
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
          {catFormOpen && (
            <CategorieForm
              competitieId={competitie.id}
              probe={probe}
              grade={grade}
              categorie={catToEdit}
              nextNumarCategorie={catToEdit ? undefined : Math.max(0, ...categorii.map(c => c.numar_categorie ?? 0)) + 1}
              onClose={() => { setCatFormOpen(false); setCatToEdit(null); }}
              onSaved={(cat) => {
                if (catToEdit) {
                  setCategorii(prev => prev.map(c => c.id === cat.id ? cat : c));
                } else {
                  setCategorii(prev => [...prev, cat]);
                }
                setCatFormOpen(false); setCatToEdit(null);
              }}
            />
          )}
          {generareOpen && (
            <GenerareSabloaneModal
              competitie={competitie}
              probe={probe}
              categoriiExistente={categorii}
              onClose={() => setGenerareOpen(false)}
              onGenerated={(cats) => { setCategorii(prev => [...prev, ...cats]); setGenerareOpen(false); }}
            />
          )}
        </div>
      )}

      {/* FUZIONĂRI */}
      {adminSection === 'fuzionari' && (
        <FuzionariPanel
          categorii={categorii}
          setCategorii={setCategorii}
          inscrieri={inscrieri}
          echipe={echipe}
          probe={probe}
          onRefresh={onRefresh}
        />
      )}

      {/* ECHIPE INCOMPLETE */}
      {adminSection === 'echipe_incomplete' && (
        <SolicitariEchipePanel
          competitieId={competitie.id}
          categorii={categorii}
        />
      )}
    </div>
  );
};

// -----------------------------------------------
// ECHIPA EDIT MODAL
// -----------------------------------------------
// -----------------------------------------------
// INSCRIERI VIEW
// -----------------------------------------------
interface InscrieriViewProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  isAdmin: boolean;
  isClubAdmin: boolean;
  myClubId: string | null;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  sportivi: Sportiv[];
  onRefresh: () => void;
}

const InscrieriView: React.FC<InscrieriViewProps> = ({
  competitie, categorii, probe, inscrieri, echipe, grade, isAdmin, isClubAdmin, myClubId, numeClub, vizeSportivi, sportivi, onRefresh
}) => {
  const { showError } = useError();
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();
  const [echipeRetraseLocal, setEchipeRetraseLocal] = useState<Set<string>>(new Set());
  // Expand/collapse secțiuni per probă în tab Înscrieri
  const [expandedProbe, setExpandedProbe] = useState<Set<string>>(new Set(['__individual__', '__echipe__', ...probe.map(p => p.id)]));
  const [editEchipaCategorie, setEditEchipaCategorie] = useState<CategorieCompetitie | null>(null);
  const [editEchipaClubId, setEditEchipaClubId] = useState<string>('');
  const [filtreVisible, setFiltreVisible] = useState(false);
  const [filterGen, setFilterGen] = useState<Set<string>>(new Set());
  const [filterProbaId, setFilterProbaId] = useState<string>('');
  const [filterVarstaMin, setFilterVarstaMin] = useState('');
  const [filterVarstaMax, setFilterVarstaMax] = useState('');
  const [filterGradMin, setFilterGradMin] = useState('');
  const [filterGradMax, setFilterGradMax] = useState('');

  const categoriiVizibile = useMemo(() => {
    const areFiltre = filterGen.size > 0 || filterProbaId || filterVarstaMin || filterVarstaMax || filterGradMin || filterGradMax;
    if (!areFiltre) return null; // null = no filtering, show all
    return new Set(
      categorii.filter(cat => {
        if (filterGen.size > 0 && !filterGen.has(cat.gen)) return false;
        if (filterProbaId && cat.proba_id !== filterProbaId) return false;
        if (filterVarstaMin !== '' && cat.varsta_min < Number(filterVarstaMin)) return false;
        if (filterVarstaMax !== '' && (cat.varsta_max === null || cat.varsta_max > Number(filterVarstaMax))) return false;
        if (filterGradMin !== '' && (cat.grad_min_ordine === null || cat.grad_min_ordine < Number(filterGradMin))) return false;
        if (filterGradMax !== '' && (cat.grad_max_ordine === null || cat.grad_max_ordine > Number(filterGradMax))) return false;
        return true;
      }).map(c => c.id)
    );
  }, [categorii, filterGen, filterProbaId, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  const nrFiltreActive = useMemo(() => {
    let n = 0;
    if (filterGen.size > 0) n++;
    if (filterProbaId) n++;
    if (filterVarstaMin !== '' || filterVarstaMax !== '') n++;
    if (filterGradMin !== '' || filterGradMax !== '') n++;
    return n;
  }, [filterGen, filterProbaId, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  const toggleGen = (gen: string) => {
    setFilterGen(prev => {
      const next = new Set(prev);
      if (next.has(gen)) next.delete(gen); else next.add(gen);
      return next;
    });
  };

  const resetFiltre = () => {
    setFilterGen(new Set());
    setFilterProbaId('');
    setFilterVarstaMin('');
    setFilterVarstaMax('');
    setFilterGradMin('');
    setFilterGradMax('');
  };

  const canSeeAll = isAdmin;
  const statusOrdine: Record<string, number> = { inscris: 0, confirmat: 1 };
  const filteredInscrieri = (canSeeAll ? inscrieri : inscrieri.filter(i => i.club_id === myClubId))
    .filter(i => i.status?.toLowerCase() !== 'retras')
    .filter(i => !categoriiVizibile || categoriiVizibile.has(i.categorie_id))
    .slice()
    .sort((a, b) => (statusOrdine[a.status] ?? 9) - (statusOrdine[b.status] ?? 9));
  const filteredEchipe = (canSeeAll ? echipe : echipe.filter(e => e.club_id === myClubId))
    .filter(e => e.status?.toLowerCase() !== 'retrasa')
    .filter(e => !echipeRetraseLocal.has((e as any).id))
    .filter(e => !categoriiVizibile || categoriiVizibile.has(e.categorie_id));

  const toggleProba = (key: string) => {
    setExpandedProbe(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleRetrage = async (id: string, type: 'inscris' | 'echipa') => {
    if (type === 'inscris') {
      // DELETE definitiv din inscrieri_competitie (confirmat de utilizator)
      // NOTA RLS: dacă DELETE este blocat, adaugă în Supabase Dashboard:
      // CREATE POLICY "club_admin_delete_inscrieri" ON inscrieri_competitie
      //   FOR DELETE USING (
      //     club_id IN (
      //       SELECT club_id FROM roluri_utilizatori
      //       WHERE user_id = auth.uid() AND rol_denumire IN ('ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
      //     )
      //   );
      const { error } = await supabase.from('inscrieri_competitie').delete().eq('id', id);
      if (error) { showError("Eroare retragere", error.message); return; }
    } else {
      // Echipe rămân cu status update (nu DELETE — confirmat doar pentru inscrieri individuale)
      const { error } = await supabase.from('echipe_competitie').update({ status: 'retrasa' }).eq('id', id);
      if (error) { showError("Eroare retragere echipă", error.message); return; }
      setEchipeRetraseLocal(prev => new Set(prev).add(id));
    }
    onRefresh();
  };

  const individualExpanded = expandedProbe.has('__individual__');
  const echipeExpanded = expandedProbe.has('__echipe__');

  return (
    <div className="space-y-6">
      {/* Panou filtre */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setFiltreVisible(v => !v)}
            style={{ touchAction: 'manipulation' }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${nrFiltreActive > 0 ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {`Filtrează${nrFiltreActive > 0 ? ` (${nrFiltreActive})` : ''}`}
            <svg className={`w-3 h-3 transition-transform ${filtreVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {nrFiltreActive > 0 && (
            <button onClick={resetFiltre} className="text-xs text-slate-400 hover:text-white underline">
              Reset
            </button>
          )}
        </div>

        {filtreVisible && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Gen */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Gen</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Feminin', 'Masculin', 'Mixt'].map(gen => (
                    <label key={gen} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${filterGen.has(gen) ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                      <input type="checkbox" checked={filterGen.has(gen)} onChange={() => toggleGen(gen)} className="w-3 h-3 accent-brand-primary" />
                      {gen}
                    </label>
                  ))}
                </div>
              </div>

              {/* Probă */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Probă</div>
                <select
                  value={filterProbaId}
                  onChange={e => setFilterProbaId(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-primary/60"
                >
                  <option value="">Toate probele</option>
                  {probe.map(p => (
                    <option key={p.id} value={p.id}>{p.denumire}</option>
                  ))}
                </select>
              </div>

              {/* Vârstă */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vârstă (ani)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={filterVarstaMin}
                    onChange={e => setFilterVarstaMin(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                  <span className="text-slate-500 text-xs">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={filterVarstaMax}
                    onChange={e => setFilterVarstaMax(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                </div>
              </div>

              {/* Grad */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Grad (ordine)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min"
                    value={filterGradMin}
                    onChange={e => setFilterGradMin(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                  <span className="text-slate-500 text-xs">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max"
                    value={filterGradMax}
                    onChange={e => setFilterGradMax(e.target.value)}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Individual */}
      {filteredInscrieri.length > 0 && (
        <div>
          <button
            onClick={() => toggleProba('__individual__')}
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Înregistrări Individuale ({filteredInscrieri.length})
            </h3>
            <svg className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform ${individualExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {individualExpanded && (
          <div className="-mx-4 sm:mx-0 overflow-x-auto">
            <table className="w-full text-sm text-slate-300 min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left">Sportiv</th>
                  <th className="p-2 text-left hidden md:table-cell">Categorie</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-center hidden md:table-cell">Taxă</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInscrieri.map(ins => {
                  const cat = categorii.find(c => c.id === ins.categorie_id);
                  const sportiv = ins.sportiv as any;
                  const faraViza = sportiv && !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
                  return (
                    <tr key={ins.id} className={faraViza ? 'bg-yellow-900/10' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-white uppercase">
                            {sportiv?.nume} {sportiv?.prenume}
                          </span>
                          {canSeeAll && (sportiv as any)?.cluburi?.nume && (
                            <span className="text-[10px] text-slate-400 normal-case">{(sportiv as any).cluburi.nume}</span>
                          )}
                          <WarningVizaFRAM show={faraViza} inline />
                        </div>
                      </td>
                      <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                        {cat?.denumire || '-'}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ins.status === 'confirmat' ? 'bg-green-800 text-green-200' :
                          ins.status === 'retras' ? 'bg-red-800 text-red-200' :
                          'bg-slate-700 text-slate-300'
                        }`}>{ins.status}</span>
                      </td>
                      <td className="p-2 text-center hidden md:table-cell">
                        {ins.taxa_achitata
                          ? <span className="text-green-400 text-xs">Achitată</span>
                          : <span className="text-red-400 text-xs">Neachitată</span>}
                      </td>
                      <td className="p-2 text-right">
                        {ins.status === 'inscris' && (isAdmin || ins.club_id === myClubId) && (
                          <Button size="sm" variant="danger" onClick={() => handleRetrage(ins.id, 'inscris')}
                            className="text-xs !py-1">Retrage</Button>
                        )}
                        {isAdmin && ins.status !== 'confirmat' && ins.status !== 'retras' && (
                          <Button size="sm" variant="success" className="text-xs !py-1 ml-1"
                            onClick={async () => {
                              await supabase.from('inscrieri_competitie').update({ status: 'confirmat' }).eq('id', ins.id);
                              onRefresh();
                            }}>
                            Confirmă
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Echipe */}
      {filteredEchipe.length > 0 && (
        <div>
          <button
            onClick={() => toggleProba('__echipe__')}
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Echipe ({filteredEchipe.length})
            </h3>
            <svg className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform ${echipeExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {echipeExpanded && (
          <div className="space-y-2">
            {filteredEchipe.map(ec => {
              const cat = categorii.find(c => c.id === ec.categorie_id);
              const sportivi = (ec as any).echipa_sportivi || [];
              return (
                <Card key={ec.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">
                        {ec.denumire_echipa || 'Echipă fără denumire'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{cat?.denumire}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sportivi.map((ms: any) => {
                          const faraViza = ms.sportiv && !areVizaFRAM(ms.sportiv.id, anCompetitie, vizeSportivi);
                          return (
                            <span key={ms.sportiv_id} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${faraViza ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-700/50' : 'bg-slate-700 text-slate-300'}`}>
                              <span className="uppercase">{ms.sportiv?.nume} {ms.sportiv?.prenume}</span>
                              {ms.rol === 'rezerva' && <span className="text-slate-500 ml-1">(R)</span>}
                              {faraViza && <span title="Fără viză FRAM">⚠</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ec.status === 'confirmata' ? 'bg-green-800 text-green-200' :
                        ec.status === 'retrasa' ? 'bg-red-800 text-red-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>{ec.status}</span>
                      {(isAdmin || (isClubAdmin && ec.club_id === myClubId)) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const cat = categorii.find(c => c.id === ec.categorie_id);
                            if (cat) {
                              setEditEchipaCategorie(cat);
                              setEditEchipaClubId((ec as any).club_id || myClubId || '');
                            }
                          }}
                          style={{ touchAction: 'manipulation' }}
                        >
                          Editează componența
                        </Button>
                      )}
                      {ec.status === 'inscrisa' && (isAdmin || ec.club_id === myClubId) && (
                        <Button size="sm" variant="danger" className="text-xs !py-1"
                          onClick={() => handleRetrage(ec.id, 'echipa')}>Retrage</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          )}
        </div>
      )}

      {filteredInscrieri.length === 0 && filteredEchipe.length === 0 && (
        <div className="text-center text-slate-500 py-12 italic">
          {nrFiltreActive > 0
            ? 'Nicio înscriere nu corespunde filtrelor aplicate.'
            : canSeeAll ? 'Nicio înscriere înregistrată.' : 'Clubul tău nu are sportivi înscriși la această competiție.'}
        </div>
      )}

      {editEchipaCategorie && (
        <InscriereModal
          competitie={competitie}
          categorie={editEchipaCategorie}
          sportivi={sportivi.filter((s: any) => s.club_id === editEchipaClubId)}
          grade={grade}
          inscrieri={inscrieri}
          echipe={echipe}
          clubId={editEchipaClubId}
          numeClub={numeClub}
          vizeSportivi={vizeSportivi}
          initialEditMode={true}
          onClose={() => { setEditEchipaCategorie(null); setEditEchipaClubId(''); }}
          onSaved={() => { setEditEchipaCategorie(null); setEditEchipaClubId(''); onRefresh(); }}
        />
      )}
    </div>
  );
};

// InscriereClubWizard este importat din ./InscriereClubWizard.tsx


// -----------------------------------------------
// INSCRIERE MODAL
// -----------------------------------------------
interface InscriereModalProps {
  competitie: Competitie;
  categorie: CategorieCompetitie;
  sportivi: Sportiv[];
  grade: Grad[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  initialEditMode?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const InscriereModal: React.FC<InscriereModalProps> = ({
  competitie, categorie, sportivi, grade, inscrieri, echipe, clubId, numeClub, vizeSportivi, initialEditMode, onClose, onSaved
}) => {
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [retragereLoading, setRetragereLoading] = useState<string | null>(null);
  const isTeam = categorie.tip_participare !== 'individual';

  // IDs sportivi retrași local în această sesiune a modalului (pentru a actualiza lista fără a închide modalul)
  const [retrasiLocal, setRetrasiLocal] = useState<Set<string>>(new Set());

  // Retragere sportiv individual deja înscris (din modal) — rămâne deschis, actualizează local
  const handleRetrageIndividual = async (sportivId: string) => {
    const ins = inscrieri.find(i => i.categorie_id === categorie.id && i.sportiv_id === sportivId && i.status?.toLowerCase() !== 'retras');
    if (!ins) return;
    setRetragereLoading(sportivId);
    // DELETE definitiv din inscrieri_competitie (confirmat de utilizator)
    // NOTA: necesită politică RLS pentru DELETE pe inscrieri_competitie:
    // CREATE POLICY "club_admin_delete_inscrieri" ON inscrieri_competitie
    //   FOR DELETE USING (
    //     club_id IN (
    //       SELECT club_id FROM roluri_utilizatori
    //       WHERE user_id = auth.uid() AND rol_denumire IN ('ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
    //     )
    //   );
    const { error } = await supabase.from('inscrieri_competitie').delete().eq('id', ins.id);
    if (error) {
      showError('Eroare retragere', error.message);
    } else {
      setRetrasiLocal(prev => new Set(prev).add(sportivId));
    }
    setRetragereLoading(null);
  };


  // For echipa/pereche
  const [selectedTitulari, setSelectedTitulari] = useState<string[]>([]);
  const [selectedRezerve, setSelectedRezerve] = useState<string[]>([]);

  // Eligibility check
  const eligibilitati = filtreazaSportiviEligibili(
    sportivi, categorie, grade, competitie.data_inceput
  );

  const eligibili = eligibilitati.filter(e => e.eligibilitate.eligibil);

  // Task 4: editMode și echipaDejaInscrisa — declarate ÎNAINTE de inscrisInEchipa
  // (inscrisInEchipa depinde de editMode și echipaDejaInscrisa)
  const [editMode, setEditMode] = useState(initialEditMode ?? false);

  // Task 4: echipă deja înscrisă din clubul curent
  const echipaDejaInscrisa = useMemo(() => {
    if (!isTeam) return null;
    return (echipe as any[]).find(
      e => e.categorie_id === categorie.id && e.club_id === clubId && e.status?.toLowerCase() !== 'retrasa'
    ) ?? null;
  }, [echipe, categorie.id, clubId, isTeam]);

  // Check already inscribed (pentru această categorie) — exclude sportivii retrași local în această sesiune
  const inscrisPrev = new Set(
    inscrieri
      .filter(i => i.categorie_id === categorie.id && i.status?.toLowerCase() !== 'retras' && !retrasiLocal.has(i.sportiv_id))
      .map(i => i.sportiv_id)
  );
  // inscrisInEchipa: sportivi din echipe ALTELE DECÂT echipa proprie (în editMode), sau toate
  const inscrisInEchipa = new Set(
    (echipe.filter(e =>
      e.categorie_id === categorie.id &&
      e.status?.toLowerCase() !== 'retrasa' &&
      // la editMode, excludem echipa proprie din "deja înscriși" ca să devină editabili
      !(editMode && echipaDejaInscrisa && (e as any).id === (echipaDejaInscrisa as any).id)
    ) as any[])
      .flatMap(e => (e.echipa_sportivi || []).map((ms: any) => ms.sportiv_id))
  );

  // Task 2: sortare — eligibili neinscrisi → eligibili deja inscriși
  const eligibiliSortati = useMemo(() => {
    const neinscrisi = eligibili.filter(e => !inscrisPrev.has(e.sportiv.id) && !inscrisInEchipa.has(e.sportiv.id));
    const dejaInscrisiLst = eligibili.filter(e => inscrisPrev.has(e.sportiv.id) || inscrisInEchipa.has(e.sportiv.id));
    return { neinscrisi, dejaInscrisiLst };
  }, [eligibili, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Task 3: verificare categorie thao_quyen individual (nelimitat = sportivi_per_echipa_max === 0 sau tip_participare individual + proba thao_quyen)
  const esteThaoQuyenIndividualModal = !isTeam && (
    categorie.proba?.tip_proba === 'thao_quyen_individual' ||
    categorie.proba?.tip_proba === 'thao_lo_individual'
  );

  // Problemă 5: multi-select pentru categorii individuale standard
  const [selectedIndividuali, setSelectedIndividuali] = useState<string[]>([]);
  const toggleIndividual = (id: string) => {
    setSelectedIndividuali(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Task 3: selectare în masă
  const allEligibiliNeinscrisi = eligibiliSortati.neinscrisi.map(e => e.sportiv.id);
  const allSelected = allEligibiliNeinscrisi.length > 0 &&
    allEligibiliNeinscrisi.every(id => selectedTitulari.includes(id));
  // Selectare toți individuali
  const allIndividualiSelected = allEligibiliNeinscrisi.length > 0 &&
    allEligibiliNeinscrisi.every(id => selectedIndividuali.includes(id));

  useEffect(() => {
    if (echipaDejaInscrisa && !editMode) return;
    if (editMode && echipaDejaInscrisa) {
      // Precompletăm cu membrii echipei existente
      const membri = (echipaDejaInscrisa as any).echipa_sportivi || [];
      const titulari = membri.filter((m: any) => m.rol === 'titular').map((m: any) => m.sportiv_id);
      const rezerve = membri.filter((m: any) => m.rol === 'rezerva').map((m: any) => m.sportiv_id);
      setSelectedTitulari(titulari);
      setSelectedRezerve(rezerve);
    }
  }, [editMode, echipaDejaInscrisa]);

  const toggleTitular = (id: string) => {
    setSelectedTitulari(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (!esteThaoQuyenIndividualModal && categorie.sportivi_per_echipa_max > 0 && prev.length >= categorie.sportivi_per_echipa_max) return prev;
      // Mixt: dacă adăugând sportivul nu mai rămân locuri pentru genul lipsă, blochează
      if (categorie.gen === 'Mixt' && categorie.sportivi_per_echipa_max > 0) {
        const newList = [...prev, id];
        const nM = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Masculin').length;
        const nF = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Feminin').length;
        const libre = categorie.sportivi_per_echipa_max - newList.length;
        if ((nM === 0 ? 1 : 0) + (nF === 0 ? 1 : 0) > libre) return prev;
      }
      return [...prev, id];
    });
  };

  const toggleRezerva = (id: string) => {
    setSelectedRezerve(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= categorie.rezerve_max) return prev;
      return [...prev, id];
    });
  };

  // Task 3: selectare/deselectare toți
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTitulari([]);
    } else {
      setSelectedTitulari(allEligibiliNeinscrisi);
    }
  };

  const validateMixtGender = (ids: string[]) => {
    if (categorie.gen !== 'Mixt' || !isTeam) return;
    const selected = sportivi.filter(s => ids.includes(s.id));
    const hasMale = selected.some(s => s.gen === 'Masculin');
    const hasFemale = selected.some(s => s.gen === 'Feminin');
    if (!hasMale || !hasFemale) {
      throw new Error('Echipa Mixt trebuie să conțină cel puțin un băiat și o fată');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!isTeam) {
        // Problemă 5: multi-select individual — inserăm toți sportivii selectați
        if (selectedIndividuali.length === 0) throw new Error('Selectează cel puțin un sportiv');
        const inserts = selectedIndividuali.map(sportivId => ({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          sportiv_id: sportivId,
        }));
        const { error } = await supabase.from('inscrieri_competitie').insert(inserts);
        if (error) throw error;
      } else if (editMode && echipaDejaInscrisa) {
        // Task 4: actualizare componență echipă existentă
        if (selectedTitulari.length === 0) {
          throw new Error('Selectează cel puțin un titular');
        }
        const eIncompleta = selectedTitulari.length < categorie.sportivi_per_echipa_min;
        if (!eIncompleta) validateMixtGender(selectedTitulari);
        // Ștergem membrii vechi și inserăm cei noi
        const { error: delErr } = await supabase
          .from('echipa_sportivi')
          .delete()
          .eq('echipa_id', (echipaDejaInscrisa as any).id);
        if (delErr) throw delErr;
        const members = [
          ...selectedTitulari.map(id => ({ echipa_id: (echipaDejaInscrisa as any).id, sportiv_id: id, rol: 'titular' })),
          ...selectedRezerve.map(id => ({ echipa_id: (echipaDejaInscrisa as any).id, sportiv_id: id, rol: 'rezerva' })),
        ];
        if (members.length > 0) {
          const { error: mErr } = await supabase.from('echipa_sportivi').insert(members);
          if (mErr) throw mErr;
        }
        await supabase.from('echipe_competitie')
          .update({ denumire_echipa: numeClub.trim().toUpperCase(), echipa_incompleta: eIncompleta })
          .eq('id', (echipaDejaInscrisa as any).id);
      } else {
        if (selectedTitulari.length === 0) {
          throw new Error('Selectează cel puțin un titular');
        }
        const eIncompleta = selectedTitulari.length < categorie.sportivi_per_echipa_min;
        if (!eIncompleta) validateMixtGender(selectedTitulari);
        const { data: ec, error: ecErr } = await supabase.from('echipe_competitie').insert({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          denumire_echipa: numeClub.trim().toUpperCase() || null,
          echipa_incompleta: eIncompleta,
        }).select().single();
        if (ecErr) throw ecErr;

        const members = [
          ...selectedTitulari.map(id => ({ echipa_id: ec.id, sportiv_id: id, rol: 'titular' })),
          ...selectedRezerve.map(id => ({ echipa_id: ec.id, sportiv_id: id, rol: 'rezerva' })),
        ];
        const { error: mErr } = await supabase.from('echipa_sportivi').insert(members);
        if (mErr) throw mErr;
      }
      onSaved();
    } catch (err: any) {
      showError("Eroare", err.message || "Eroare la înscriere");
    } finally {
      setLoading(false);
    }
  };

  // Helper randare rând sportiv individual — Problemă 5: checkbox multi-select
  const renderSportivIndividual = (sportiv: Sportiv, deja: boolean) => {
    const varsta = sportiv.data_nasterii
      ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput)
      : null;
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    const faraViza = !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
    const isChecked = selectedIndividuali.includes(sportiv.id);
    const isRetragandLoading = retragereLoading === sportiv.id;
    return (
      <div
        key={sportiv.id}
        className={`flex items-center gap-3 p-2 rounded border transition-colors ${
          deja ? 'border-blue-700/40 bg-blue-900/10' :
          isChecked ? 'border-brand-primary bg-brand-primary/10' :
          'border-slate-700 hover:border-slate-500'
        }`}
      >
        <input
          type="checkbox"
          value={sportiv.id}
          disabled={deja}
          checked={isChecked || deja}
          onChange={() => !deja && toggleIndividual(sportiv.id)}
          className="w-4 h-4 cursor-pointer"
          style={{ cursor: deja ? 'default' : 'pointer' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-white font-medium uppercase">{sportiv.nume} {sportiv.prenume}</span>
            {deja && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-2 py-0.5">
                Inscris
              </span>
            )}
            <WarningVizaFRAM show={faraViza} inline />
          </div>
          <div className="text-xs text-slate-400">
            {varsta !== null ? `${varsta} ani` : ''}{grad?.nume ? ` · ${grad.nume}` : ''}
          </div>
        </div>
        {deja && (
          <button
            onClick={() => handleRetrageIndividual(sportiv.id)}
            disabled={isRetragandLoading}
            style={{ touchAction: 'manipulation' }}
            className="shrink-0 text-[10px] font-medium px-2 py-1 rounded border border-red-700/60 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40"
            title="Retrage sportivul din această categorie"
          >
            {isRetragandLoading ? '...' : 'Retrage'}
          </button>
        )}
      </div>
    );
  };

  // Helper randare rând sportiv echipă
  const renderSportivEchipa = (sportiv: Sportiv, deja: boolean) => {
    const varsta = sportiv.data_nasterii
      ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput) : null;
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    const isRezerva = selectedRezerve.includes(sportiv.id);
    const faraViza = !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
    const isMixtBlocked = !deja && !selectedTitulari.includes(sportiv.id) && categorie.gen === 'Mixt' && (() => {
      const newList = [...selectedTitulari, sportiv.id];
      const nM = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Masculin').length;
      const nF = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Feminin').length;
      const libre = (categorie.sportivi_per_echipa_max || 0) - newList.length;
      return (nM === 0 ? 1 : 0) + (nF === 0 ? 1 : 0) > libre;
    })();
    const isDisabled = deja || isRezerva || isMixtBlocked;
    return (
      <label key={sportiv.id} style={{ touchAction: 'manipulation' }} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${
        isDisabled ? 'opacity-40 cursor-not-allowed border-transparent' :
        selectedTitulari.includes(sportiv.id) ? 'border-brand-primary bg-brand-primary/10' :
        'border-slate-700 hover:border-slate-500'
      }`}
        title={isMixtBlocked ? 'Trebuie adăugat cel puțin un sportiv din genul lipsă' : undefined}
      >
        <input type="checkbox" checked={selectedTitulari.includes(sportiv.id) || deja}
          disabled={isDisabled}
          onChange={() => !isDisabled && toggleTitular(sportiv.id)}
          className="w-4 h-4" />
        <div className="flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-white uppercase">{sportiv.nume} {sportiv.prenume}</span>
            {deja && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-1.5 py-0.5">
                In echipă
              </span>
            )}
            <WarningVizaFRAM show={faraViza} inline />
          </div>
          <div className="text-xs text-slate-400">{varsta !== null ? `${varsta} ani` : ''}{grad?.nume ? ` · ${grad.nume}` : ''}</div>
        </div>
      </label>
    );
  };

  const handleClose = () => {
    if (retrasiLocal.size > 0) {
      onSaved();
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title={`Înscrie la: ${categorie.denumire}`}>
      <div className="-m-4 sm:-m-6">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="bg-slate-800 rounded-lg p-3 text-sm">
          <div className="text-slate-300">{categorie.denumire}</div>
          {categorie.arma && <div className="text-orange-400 text-xs mt-0.5">Armă: {categorie.arma}</div>}
          <div className="text-xs text-slate-500 mt-1">
            Participare: <strong className="text-slate-300">{categorie.tip_participare}</strong>
            {isTeam && categorie.sportivi_per_echipa_max > 0 && ` · ${categorie.sportivi_per_echipa_max} sportivi/echipă`}
            {categorie.rezerve_max > 0 && ` · max ${categorie.rezerve_max} rezerve`}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Taxă: <strong className="text-green-400">{isTeam ? competitie.taxa_echipa : competitie.taxa_individual} lei</strong>
          </div>
        </div>

        {/* Task 4: blocare înscriere echipă dublă */}
        {isTeam && echipaDejaInscrisa && !editMode ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-300">Clubul tău are deja o echipă înscrisă</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  {(echipaDejaInscrisa as any).denumire_echipa || 'Echipă fără denumire'} — {
                    ((echipaDejaInscrisa as any).echipa_sportivi || []).length
                  } membri
                </p>
              </div>
            </div>
            <Button
              variant="warning"
              onClick={() => setEditMode(true)}
              className="w-full"
            >
              Modifică componența echipei
            </Button>
          </div>
        ) : !isTeam ? (
          /* Individual — Problemă 5: multi-select checkbox */
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-sm text-slate-300 font-medium">
                Sportivi eligibili ({eligibili.length})
                {selectedIndividuali.length > 0 && (
                  <span className="ml-2 text-brand-primary font-bold">— {selectedIndividuali.length} selectați</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {allEligibiliNeinscrisi.length > 1 && (
                  <button
                    onClick={() => {
                      if (allIndividualiSelected) {
                        setSelectedIndividuali([]);
                      } else {
                        setSelectedIndividuali(allEligibiliNeinscrisi);
                      }
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className="text-xs font-medium text-brand-primary hover:underline transition-colors min-h-[32px] px-2"
                  >
                    {allIndividualiSelected ? 'Deselectează toți' : `Selectează toți (${allEligibiliNeinscrisi.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto overscroll-contain space-y-1">
              {/* Primii — eligibili neinscrisi */}
              {eligibiliSortati.neinscrisi.map(({ sportiv }) => renderSportivIndividual(sportiv, false))}
              {/* Dedesubt — eligibili deja inscriși */}
              {eligibiliSortati.dejaInscrisiLst.length > 0 && (
                <>
                  {eligibiliSortati.neinscrisi.length > 0 && (
                    <div className="py-1 px-2">
                      <div className="border-t border-slate-700/60 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide whitespace-nowrap bg-slate-900 pr-2">
                          Deja înscriși în această categorie
                        </span>
                      </div>
                    </div>
                  )}
                  {eligibiliSortati.dejaInscrisiLst.map(({ sportiv }) => renderSportivIndividual(sportiv, true))}
                </>
              )}
              {eligibili.length === 0 && (
                <div className="text-center text-slate-500 py-4 italic text-sm">
                  Niciun sportiv eligibil din club pentru această categorie.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Echipă / Pereche */
          <div className="space-y-3">
            {editMode && echipaDejaInscrisa && (
              <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700/40 rounded-lg text-xs text-blue-300">
                <span>Editezi componența echipei existente.</span>
                <button onClick={() => setEditMode(false)} className="text-blue-400 hover:underline ml-auto">Anulează</button>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm text-slate-300 font-medium flex items-center gap-2 flex-wrap">
                  Titulari ({selectedTitulari.length}{categorie.sportivi_per_echipa_max > 0 ? `/${categorie.sportivi_per_echipa_max}` : ''})
                  {categorie.gen === 'Mixt' && (() => {
                    const sel = sportivi.filter(s => selectedTitulari.includes(s.id));
                    const m = sel.filter(s => s.gen === 'Masculin').length;
                    const f = sel.filter(s => s.gen === 'Feminin').length;
                    const ok = m >= 1 && f >= 1;
                    return (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ok ? 'bg-green-800 text-green-200' : 'bg-red-900/60 text-red-300'}`}>
                        {m}M / {f}F {ok ? '✓' : '— minim 1M+1F'}
                      </span>
                    );
                  })()}
                </span>
              </div>

              {/* Categorii MIXT: afișare separată pe gen Masculin / Feminin */}
              {categorie.gen === 'Mixt' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Coloana Masculin */}
                  <div>
                    <div className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> Masculin
                    </div>
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                      {(() => {
                        const masculini = [
                          ...eligibiliSortati.neinscrisi.filter(e => e.sportiv.gen === 'Masculin'),
                          ...eligibiliSortati.dejaInscrisiLst.filter(e => e.sportiv.gen === 'Masculin'),
                        ];
                        const faraGen = [
                          ...eligibiliSortati.neinscrisi.filter(e => !e.sportiv.gen),
                          ...eligibiliSortati.dejaInscrisiLst.filter(e => !e.sportiv.gen),
                        ];
                        return (
                          <>
                            {masculini.map(({ sportiv }) => renderSportivEchipa(sportiv,
                              eligibiliSortati.dejaInscrisiLst.some(e => e.sportiv.id === sportiv.id) && !editMode
                            ))}
                            {faraGen.length > 0 && (
                              <div className="pt-1 border-t border-slate-700/40">
                                <div className="text-[10px] text-amber-400/80 mb-0.5 px-1">Gen neconfigurat — selecteaza gen in profilul sportivului</div>
                                {faraGen.map(({ sportiv }) => (
                                  <div key={sportiv.id} className="flex items-center gap-2 p-2 rounded border border-amber-800/40 bg-amber-900/10 opacity-70">
                                    <input type="checkbox" disabled className="w-4 h-4 opacity-40" />
                                    <span className="text-xs text-amber-300 uppercase">{sportiv.nume} {sportiv.prenume}</span>
                                    <span className="text-[9px] text-amber-500 ml-auto">fara gen</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {masculini.length === 0 && faraGen.length === 0 && (
                              <div className="text-xs text-slate-500 italic py-2 text-center">Niciun sportiv M</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Coloana Feminin */}
                  <div>
                    <div className="text-xs font-semibold text-pink-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pink-400 inline-block"></span> Feminin
                    </div>
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                      {(() => {
                        const feminine = [
                          ...eligibiliSortati.neinscrisi.filter(e => e.sportiv.gen === 'Feminin'),
                          ...eligibiliSortati.dejaInscrisiLst.filter(e => e.sportiv.gen === 'Feminin'),
                        ];
                        return (
                          <>
                            {feminine.map(({ sportiv }) => renderSportivEchipa(sportiv,
                              eligibiliSortati.dejaInscrisiLst.some(e => e.sportiv.id === sportiv.id) && !editMode
                            ))}
                            {feminine.length === 0 && (
                              <div className="text-xs text-slate-500 italic py-2 text-center">Niciun sportiv F</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                /* Categorii non-MIXT: lista unificata, filtrata dupa gen daca categoria nu e Mixt */
                (() => {
                  const genFiltru = categorie.gen === 'Masculin' ? 'Masculin' : categorie.gen === 'Feminin' ? 'Feminin' : null;
                  const neinscrisiFiltered = genFiltru
                    ? eligibiliSortati.neinscrisi.filter(e => e.sportiv.gen === genFiltru)
                    : eligibiliSortati.neinscrisi;
                  const dejaFiltered = genFiltru
                    ? eligibiliSortati.dejaInscrisiLst.filter(e => e.sportiv.gen === genFiltru)
                    : eligibiliSortati.dejaInscrisiLst;
                  return (
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1">
                      {neinscrisiFiltered.map(({ sportiv }) => renderSportivEchipa(sportiv, false))}
                      {dejaFiltered.length > 0 && (
                        <>
                          {neinscrisiFiltered.length > 0 && (
                            <div className="py-1 px-2">
                              <div className="border-t border-slate-700/60">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide bg-slate-900 pr-2">
                                  {editMode ? 'Membri actuali (editabili)' : 'Deja in echipa'}
                                </span>
                              </div>
                            </div>
                          )}
                          {dejaFiltered.map(({ sportiv }) => renderSportivEchipa(sportiv, !editMode))}
                        </>
                      )}
                      {neinscrisiFiltered.length === 0 && dejaFiltered.length === 0 && (
                        <div className="text-center text-slate-500 py-3 italic text-sm">
                          Niciun sportiv eligibil din club pentru aceasta categorie.
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

            </div>
            {categorie.rezerve_max > 0 && (
              <div>
                <div className="text-sm text-slate-300 font-medium mb-1">
                  Rezerve ({selectedRezerve.length}/{categorie.rezerve_max})
                </div>
                <div className="max-h-32 overflow-y-auto overscroll-contain space-y-1">
                  {eligibili.map(({ sportiv }) => {
                    const isTitular = selectedTitulari.includes(sportiv.id);
                    return (
                      <label key={sportiv.id} style={{ touchAction: 'manipulation' }} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border text-xs ${
                        isTitular ? 'opacity-40 cursor-not-allowed border-transparent' :
                        selectedRezerve.includes(sportiv.id) ? 'border-purple-500 bg-purple-900/20' :
                        'border-slate-700 hover:border-slate-500'
                      }`}>
                        <input type="checkbox" checked={selectedRezerve.includes(sportiv.id)}
                          disabled={isTitular}
                          onChange={() => toggleRezerva(sportiv.id)}
                          className="w-3 h-3" />
                        <span className="text-slate-300 uppercase">{sportiv.nume} {sportiv.prenume}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning FRAM pentru selecția curentă */}
        {(() => {
          const selectedIds = isTeam
            ? [...selectedTitulari, ...selectedRezerve]
            : selectedIndividuali;
          const faraVizaCount = selectedIds.filter(id => !areVizaFRAM(id, anCompetitie, vizeSportivi)).length;
          return faraVizaCount > 0 ? (
            <WarningVizaFRAM show={true} />
          ) : null;
        })()}
      </div>

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm px-4 py-3 sm:px-6 rounded-b-2xl">
        {isTeam && selectedTitulari.length > 0 && selectedTitulari.length < categorie.sportivi_per_echipa_min && (
          <p className="text-xs text-amber-400 mb-2">
            Echipă incompletă ({selectedTitulari.length}/{categorie.sportivi_per_echipa_min} titulari) — se va salva cu flag "incompletă". Poți solicita completare din alt club ulterior.
          </p>
        )}
        {!(isTeam && echipaDejaInscrisa && !editMode) ? (
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading} className="w-full sm:w-auto h-11">Anulează</Button>
            <Button variant="success" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto h-11">
              {loading ? 'Se salvează...' : editMode ? 'Salvează Modificările' : 'Confirmă Înscrierea'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto h-11">Închide</Button>
          </div>
        )}
      </div>
      </div>
    </Modal>
  );
};

// -----------------------------------------------
// MIGRARE LEGACY
// -----------------------------------------------
interface EvenimentLegacy {
  id: string;
  denumire: string;
  data: string;
  data_sfarsit?: string;
  locatie?: string;
  organizator?: string;
  probe_disponibile?: string[];
  club_id?: string;
}

const MigrareModal: React.FC<{
  ev: EvenimentLegacy | null;
  onClose: () => void;
  onMigrated: (newComp: Competitie, legacyId: string) => void;
}> = ({ ev, onClose, onMigrated }) => {
  const { showError } = useError();
  const [tip, setTip] = useState<string>('tehnica');
  const [seedCategories, setSeedCategories] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!ev) return null;

  const handleMigrate = async () => {
    setLoading(true);
    // 1. Insert in competitii (păstrăm legacy_eveniment_id pentru a nu pierde rezultatele)
    const payload: Record<string, unknown> = {
      denumire: ev.denumire,
      tip,
      data_inceput: ev.data,
      data_sfarsit: ev.data_sfarsit || ev.data,
      locatie: ev.locatie || null,
      organizator: ev.organizator || null,
      status: 'finalizata',
      club_id: ev.club_id || null,
      legacy_eveniment_id: ev.id,
    };
    const { data: compData, error: compErr } = await supabase
      .from('competitii').insert(payload).select().single();
    if (compErr) { showError("Eroare migrare", compErr.message); setLoading(false); return; }

    const newComp = compData as Competitie;

    // 2. Seed categories if requested
    if (seedCategories) {
      let templates: TemplateCategorieInput[] = [];
      if (tip === 'tehnica') templates = generateTemplateTehnnica();
      else if (tip === 'giao_dau') templates = generateTemplateGiaoDau();
      else if (tip === 'cvd') templates = generateTemplateCVD();

      const probe = DEFAULT_PROBE_PER_TIP[tip as keyof typeof DEFAULT_PROBE_PER_TIP] || [];
      const probeInsert = probe.map((p: { tip_proba: string; denumire: string }, i: number) => ({
        competitie_id: newComp.id, tip_proba: p.tip_proba, denumire: p.denumire, ordine_afisare: i,
      }));
      const { data: probeData } = await supabase.from('probe_competitie').insert(probeInsert).select();
      if (probeData && templates.length > 0) {
        const probeMap: Record<string, string> = {};
        (probeData as ProbaCompetitie[]).forEach(p => { probeMap[p.tip_proba] = p.id; });
        const cats = templates.map((t, i) => ({
          competitie_id: newComp.id,
          proba_id: t.tip_proba ? probeMap[t.tip_proba] || null : null,
          numar_categorie: t.numar_categorie,
          denumire: buildCategorieDenumire(t),
          varsta_min: t.varsta_min,
          varsta_max: t.varsta_max ?? null,
          gen: t.gen,
          grad_min_ordine: t.grad_min_ordine ?? null,
          grad_max_ordine: t.grad_max_ordine ?? null,
          arma: t.arma ?? null,
          tip_participare: t.tip_participare,
          sportivi_per_echipa_min: t.sportivi_per_echipa_min ?? 1,
          sportivi_per_echipa_max: t.sportivi_per_echipa_max ?? 1,
          rezerve_max: t.rezerve_max ?? 0,
          max_echipe_per_club: t.max_echipe_per_club ?? 1,
          min_participanti_start: t.min_participanti_start ?? 3,
          ordine_afisare: i,
        }));
        await supabase.from('categorii_competitie').insert(cats);
      }
    }

    // 3. NU ștergem din evenimente — rezultatele sportivilor (tabela rezultate)
    // sunt legate de eveniment_id cu ON DELETE CASCADE și s-ar pierde.
    // legacy_eveniment_id din competitii permite filtrarea din lista legacy.

    onMigrated(newComp, ev.id);
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Migrează: ${ev.denumire}`}>
      <div className="space-y-4">
        <div className="bg-slate-700/40 rounded p-3 text-sm text-slate-300 space-y-1">
          <div>{fmtDate(ev.data)}{ev.data_sfarsit && ev.data_sfarsit !== ev.data ? ` – ${fmtDate(ev.data_sfarsit)}` : ''}</div>
          {ev.locatie && <div>{ev.locatie}</div>}
          {ev.probe_disponibile?.length ? <div>Probe: {ev.probe_disponibile.join(', ')}</div> : null}
        </div>
        <Select label="Tip competiție (nou sistem)" value={tip} onChange={e => setTip(e.target.value)}>
          <option value="tehnica">CN Copii/Juniori – Tehnică</option>
          <option value="giao_dau">CN Giao Dau – Lupte</option>
          <option value="cvd">CN Co Vo Dao – Arme</option>
        </Select>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
          <input type="checkbox" checked={seedCategories} onChange={e => setSeedCategories(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700" />
          Generează categorii automat
        </label>
        <p className="text-xs text-slate-400 bg-green-900/20 border border-green-700/30 rounded p-2">
          Competiția va fi creată cu status <strong>Finalizată</strong>. Evenimentul vechi <strong>nu se șterge</strong> — rezultatele sportivilor înregistrați rămân păstrate și pot fi consultate din secțiunea Rezultate.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Anulează</Button>
          <Button variant="success" onClick={handleMigrate} disabled={loading}>
            {loading ? 'Se migrează...' : 'Migrează'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// -----------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------

export const CompetitiiManagement: React.FC<CompetitiiProps> = ({ permissions, onBack }) => {
  const { showError } = useError();
  const [competitii, setCompetitii] = useState<Competitie[]>([]);
  const [legacyEvents, setLegacyEvents] = useState<EvenimentLegacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedComp, setSelectedComp] = useState<Competitie | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editComp, setEditComp] = useState<Competitie | null>(null);
  const [search, setSearch] = useState('');
  const [migrareEv, setMigrareEv] = useState<EvenimentLegacy | null>(null);
  const savedScrollRef = useRef(0);
  // ID-ul competiției salvat la mount — restaurat după ce lista se încarcă
  const pendingRestoreId = useRef<string | null>(ssGet(SS_KEY_COMP_ID));
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ștergi această competiție și toate datele aferente?')) return;
    const { error } = await supabase.from('competitii').delete().eq('id', id);
    if (error) showError("Eroare", error.message);
    else setCompetitii(prev => prev.filter(c => c.id !== id));
  };

  if (view === 'detail' && selectedComp) {
    return (
      <CompetitieDetail
        competitie={selectedComp}
        permissions={permissions}
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
          <h2 className="text-xl font-bold text-white">Competiții Qwan Ki Do</h2>
        </div>
        {isAdmin && (
          <Button variant="success" onClick={() => { setEditComp(null); setFormOpen(true); }}>
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
          className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusLabel).map(([k, { label, color }]) => (
          <div key={k} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xl font-bold text-white">{competitii.filter(c => c.status === k).length}</div>
            <div className={`text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${color}`}>{label}</div>
          </div>
        ))}
        {legacyEvents.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xl font-bold text-white">{legacyEvents.length}</div>
            <div className="text-xs mt-0.5 px-1.5 py-0.5 rounded-full inline-block bg-slate-700 text-slate-300">Legacy</div>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Se încarcă...</div>
      ) : (
        <div className="space-y-2">
          {filteredCompetitii.map(comp => (
            <Card
              key={comp.id}
              className="p-4 cursor-pointer hover:border-brand-primary/50 transition-colors"
              style={{ touchAction: 'manipulation' }}
              onClick={() => { savedScrollRef.current = window.scrollY; setSelectedComp(comp); ssSet(SS_KEY_COMP_ID, comp.id); setView('detail'); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white">{comp.denumire}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tipBadge[comp.tip]}`}>
                      {tipuriLabels.get(comp.tip) ?? TIP_COMPETITIE_LABELS[comp.tip as keyof typeof TIP_COMPETITIE_LABELS] ?? comp.tip}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel[comp.status]?.color}`}>
                      {statusLabel[comp.status]?.label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {fmtDate(comp.data_inceput)} – {fmtDate(comp.data_sfarsit)}
                    {comp.locatie && ` · ${comp.locatie}`}
                    {comp.deadline_inscrieri && ` · Deadline: ${fmtDate(comp.deadline_inscrieri)}`}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
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
        onSaved={(comp) => {
          if (editComp) {
            setCompetitii(prev => prev.map(c => c.id === comp.id ? comp : c));
          } else {
            setCompetitii(prev => [comp, ...prev]);
          }
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
    </div>
    </TipuriLabelsContext.Provider>
  );
};
