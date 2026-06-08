import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Permissions, Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, SolicitareEchipaIncompleta, Sportiv, Grad, TipProba } from '../../types';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Modal, Select, Card } from '../ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, ordineToLabel, TIP_PROBA_LABELS, TIP_COMPETITIE_LABELS,
  DEFAULT_PROBE_PER_TIP, TemplateCategorieInput
} from '../../utils/competitiiTemplates';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import CategoriiTemplateManager from './CategoriiTemplateManager';
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
import { AdminPanel } from './AdminPanel';
import { InscriereModal } from './InscriereModal';

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
