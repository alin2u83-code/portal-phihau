import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Permissions, Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, SolicitareEchipaIncompleta, Sportiv, Grad, TipProba } from '../../types';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Modal, Input, Select, Card } from '../ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from '../icons';
import { useError } from '../ErrorProvider';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, ordineToLabel, TIP_PROBA_LABELS, TIP_COMPETITIE_LABELS,
  DEFAULT_PROBE_PER_TIP, TemplateCategorieInput
} from '../../utils/competitiiTemplates';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import { filtreazaSportiviEligibili, calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';
import { VizaSportiv } from '../../types';
import InscriereClubWizard from './InscriereClubWizard';
import { TipuriCompetitieAdmin } from '../TipuriCompetitieAdmin';

// -----------------------------------------------
// HELPERS persistare stare în sessionStorage
// -----------------------------------------------
const SS_KEY_COMP_ID = 'competitii_selected_comp_id';
const SS_KEY_TAB = 'competitii_active_tab';

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* ignorat */ }
}
function ssDel(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignorat */ }
}

// -----------------------------------------------
// HELPER: verifică dacă sportivul are viza FRAM activă pentru un an dat
// -----------------------------------------------
function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return vizeSportivi.some(v => v.sportiv_id === sportivId && v.an === an && v.status_viza === 'Activ');
}

const WarningVizaFRAM: React.FC<{ show: boolean; inline?: boolean }> = ({ show, inline }) => {
  if (!show) return null;
  if (inline) return (
    <span title="Viza FRAM neachitată pentru anul curent"
      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-400 bg-yellow-900/40 border border-yellow-700/50 rounded px-1.5 py-0.5 ml-1 shrink-0">
      ⚠ FRAM
    </span>
  );
  return (
    <div className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-2.5 text-xs text-yellow-300">
      <span className="text-base leading-none shrink-0">⚠</span>
      <span>Viza FRAM <strong>neachitată</strong> pentru anul curent. Sportivul nu va fi acceptat în competiție fără această viză.</span>
    </div>
  );
};

interface CompetitiiProps {
  permissions: Permissions;
  onBack: () => void;
}

type View = 'list' | 'detail' | 'inscrieri';

// -----------------------------------------------
// HELPERS
// -----------------------------------------------
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ro-RO') : '-';

const statusLabel: Record<string, { label: string; color: string }> = {
  draft: { label: 'Schiță', color: 'bg-slate-700 text-slate-300' },
  inscrieri_deschise: { label: 'Înscrieri deschise', color: 'bg-green-800 text-green-200' },
  inscrieri_inchise: { label: 'Înscrieri închise', color: 'bg-yellow-800 text-yellow-200' },
  finalizata: { label: 'Finalizată', color: 'bg-blue-900 text-blue-200' },
};

const tipBadge: Record<string, string> = {
  tehnica: 'bg-purple-800 text-purple-200',
  giao_dau: 'bg-red-800 text-red-200',
  cvd: 'bg-orange-800 text-orange-200',
};

// Context local pentru labels dinamice (citite din DB)
const TipuriLabelsContext = React.createContext<Map<string, string>>(
  new Map(Object.entries(TIP_COMPETITIE_LABELS))
);

// -----------------------------------------------
// CREATE / EDIT COMPETITION MODAL
// -----------------------------------------------
interface CompetitieFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (c: Competitie) => void;
  comp: Competitie | null;
}

const CompetitieForm: React.FC<CompetitieFormProps> = ({ isOpen, onClose, onSaved, comp }) => {
  const tipuriLabelsCtx = React.useContext(TipuriLabelsContext);
  const [form, setForm] = useState({
    denumire: '', tip: 'tehnica' as Competitie['tip'],
    data_inceput: new Date().toISOString().split('T')[0],
    data_sfarsit: new Date().toISOString().split('T')[0],
    locatie: '', organizator: '', deadline_inscrieri: '',
    individual_tehnica: '80', individual_cvd: '80',
    echipa_seniori: '120', echipa_juniori: '150', cvd_echipa: '80',
    observatii: '',
    status: 'draft' as Competitie['status'],
  });
  const [loading, setLoading] = useState(false);
  const [seedCategories, setSeedCategories] = useState(true);
  const { showError } = useError();

  useEffect(() => {
    if (isOpen) {
      if (comp) {
        const ct = comp.config_taxe;
        setForm({
          denumire: comp.denumire, tip: comp.tip,
          data_inceput: comp.data_inceput, data_sfarsit: comp.data_sfarsit,
          locatie: comp.locatie || '', organizator: comp.organizator || '',
          deadline_inscrieri: comp.deadline_inscrieri || '',
          individual_tehnica: String(ct?.individual_tehnica ?? comp.taxa_individual ?? 80),
          individual_cvd: String(ct?.individual_cvd ?? 80),
          echipa_seniori: String(ct?.echipa_seniori ?? comp.taxa_echipa ?? 120),
          echipa_juniori: String(ct?.echipa_juniori ?? 150),
          cvd_echipa: String(ct?.cvd_echipa ?? 80),
          observatii: comp.observatii || '',
          status: comp.status,
        });
      } else {
        setForm({
          denumire: '', tip: 'tehnica',
          data_inceput: new Date().toISOString().split('T')[0],
          data_sfarsit: new Date().toISOString().split('T')[0],
          locatie: '', organizator: '', deadline_inscrieri: '',
          individual_tehnica: '80', individual_cvd: '80',
          echipa_seniori: '120', echipa_juniori: '150', cvd_echipa: '80',
          observatii: '',
          status: 'draft',
        });
        setSeedCategories(true);
      }
    }
  }, [isOpen, comp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const configTaxe = {
        individual_tehnica: parseFloat(form.individual_tehnica) || 80,
        individual_cvd: parseFloat(form.individual_cvd) || 80,
        echipa_seniori: parseFloat(form.echipa_seniori) || 120,
        echipa_juniori: parseFloat(form.echipa_juniori) || 150,
        cvd_echipa: parseFloat(form.cvd_echipa) || 80,
        currency: 'RON',
      };
      const payload = {
        denumire: form.denumire.trim(), tip: form.tip,
        data_inceput: form.data_inceput, data_sfarsit: form.data_sfarsit,
        locatie: form.locatie.trim() || null, organizator: form.organizator.trim() || null,
        deadline_inscrieri: form.deadline_inscrieri || null,
        taxa_individual: configTaxe.individual_tehnica,
        taxa_echipa: configTaxe.echipa_seniori,
        config_taxe: configTaxe,
        observatii: form.observatii.trim() || null,
        status: form.status,
      };

      let competitieId: string;

      if (comp) {
        const { data, error } = await supabase.from('competitii').update(payload).eq('id', comp.id).select().single();
        if (error) throw error;
        onSaved(data as Competitie);
        onClose();
        return;
      } else {
        const { data, error } = await supabase.from('competitii').insert(payload).select().single();
        if (error) throw error;
        competitieId = (data as Competitie).id;

        // Seed probe implicite
        const probeDefault = DEFAULT_PROBE_PER_TIP[form.tip] || [];
        if (probeDefault.length > 0) {
          const probePayload = probeDefault.map((p, i) => ({
            competitie_id: competitieId,
            tip_proba: p.tip_proba,
            denumire: p.denumire,
            ordine_afisare: i,
          }));
          const { data: probeData, error: probeErr } = await supabase
            .from('probe_competitie').insert(probePayload).select();
          if (probeErr) throw probeErr;

          // Seed categorii din template
          if (seedCategories && probeData) {
            const probeMap: Record<string, string> = {};
            for (const p of probeData as ProbaCompetitie[]) {
              probeMap[p.tip_proba] = p.id;
            }

            let templateCats: TemplateCategorieInput[] = [];
            if (form.tip === 'tehnica') templateCats = generateTemplateTehnnica();
            else if (form.tip === 'giao_dau') templateCats = generateTemplateGiaoDau();
            else if (form.tip === 'cvd') templateCats = generateTemplateCVD();

            if (templateCats.length > 0) {
              const catPayload = templateCats.map((cat, i) => ({
                competitie_id: competitieId,
                proba_id: probeMap[cat.tip_proba] || null,
                numar_categorie: cat.numar_categorie,
                denumire: buildCategorieDenumire(cat),
                varsta_min: cat.varsta_min,
                varsta_max: cat.varsta_max,
                gen: cat.gen,
                grad_min_ordine: cat.grad_min_ordine,
                grad_max_ordine: cat.grad_max_ordine,
                arma: cat.arma,
                tip_participare: cat.tip_participare,
                sportivi_per_echipa_min: cat.sportivi_per_echipa_min,
                sportivi_per_echipa_max: cat.sportivi_per_echipa_max,
                rezerve_max: cat.rezerve_max,
                max_echipe_per_club: cat.max_echipe_per_club,
                min_participanti_start: cat.min_participanti_start,
                ordine_afisare: i,
              }));
              const { error: catErr } = await supabase.from('categorii_competitie').insert(catPayload);
              if (catErr) throw catErr;
            }
          }
        }

        const { data: freshComp } = await supabase.from('competitii').select().eq('id', competitieId).single();
        onSaved(freshComp as Competitie);
        onClose();
      }
    } catch (err: any) {
      showError("Eroare", err.message || "Eroare la salvare competiție");
    } finally {
      setLoading(false);
    }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={comp ? 'Editează Competiție' : 'Adaugă Competiție Nouă'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Denumire" value={form.denumire} onChange={f('denumire')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Tip Competiție" value={form.tip} onChange={f('tip')}>
            {Array.from(tipuriLabelsCtx.entries()).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select label="Status" value={form.status} onChange={f('status')}>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Data Început" type="date" value={form.data_inceput} onChange={f('data_inceput')} required />
          <Input label="Data Sfârșit" type="date" value={form.data_sfarsit} onChange={f('data_sfarsit')} required />
        </div>
        <Input label="Deadline Înscrieri" type="date" value={form.deadline_inscrieri} onChange={f('deadline_inscrieri')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Locație" value={form.locatie} onChange={f('locatie')} />
          <Input label="Organizator" value={form.organizator} onChange={f('organizator')} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Taxe înscriere (RON)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Input label="Individual Tehnică" type="number" min="0" value={form.individual_tehnica} onChange={f('individual_tehnica')} />
            <Input label="Individual CVD" type="number" min="0" value={form.individual_cvd} onChange={f('individual_cvd')} />
            <Input label="Echipă Seniori" type="number" min="0" value={form.echipa_seniori} onChange={f('echipa_seniori')} />
            <Input label="Echipă Juniori" type="number" min="0" value={form.echipa_juniori} onChange={f('echipa_juniori')} />
            <Input label="CVD Echipă" type="number" min="0" value={form.cvd_echipa} onChange={f('cvd_echipa')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Observații</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white resize-none"
            rows={3}
            value={form.observatii}
            onChange={f('observatii')}
          />
        </div>
        {!comp && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={seedCategories} onChange={e => setSeedCategories(e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-300">
              Generează automat categoriile din template ({form.tip === 'tehnica' ? '~100' : form.tip === 'giao_dau' ? '20' : '~80'} categorii)
            </span>
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? 'Se salvează...' : (comp ? 'Actualizează' : 'Creează Competiție')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

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
  const { filteredData, grade, currentUser, vizeSportivi } = useData();
  const { showError } = useError();
  const [probe, setProbe] = useState<ProbaCompetitie[]>([]);
  const [categorii, setCategorii] = useState<CategorieCompetitie[]>([]);
  const [inscrieri, setInscrieri] = useState<InscriereCompetitie[]>([]);
  const [echipe, setEchipe] = useState<EchipaCompetitie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categorii' | 'inscrieri' | 'admin' | 'rezultate_legacy'>(() => {
    const saved = ssGet(SS_KEY_TAB);
    if (saved === 'inscrieri' || saved === 'admin' || saved === 'rezultate_legacy') return saved;
    return 'categorii';
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [rezultateLegacy, setRezultateLegacy] = useState<Array<{ id: string; rezultat: string; probe?: string; sportiv?: { id: string; nume: string; prenume: string } }>>([]);
  const [loadingLegacy, setLoadingLegacy] = useState(false);
  const [selectedProbaId, setSelectedProbaId] = useState<string>('');
  const [inscriereModal, setInscriereModal] = useState<CategorieCompetitie | null>(null);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catToEdit, setCatToEdit] = useState<CategorieCompetitie | null>(null);
  const [probaFormOpen, setProbaFormOpen] = useState(false);
  // Task 1: vizualizare sportivi înscriși per categorie
  const [viewInscrieriCatId, setViewInscrieriCatId] = useState<string | null>(null);

  const isAdmin = permissions.isSuperAdmin || permissions.isFederationAdmin;
  const isClubAdmin = permissions.isAdminClub;

  // Persistă tab-ul activ în sessionStorage la fiecare schimbare
  const handleSetActiveTab = useCallback((tab: 'categorii' | 'inscrieri' | 'admin' | 'rezultate_legacy') => {
    setActiveTab(tab);
    ssSet(SS_KEY_TAB, tab);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [probeRes, catRes, inRes, echRes] = await Promise.all([
      supabase.from('probe_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('categorii_competitie').select().eq('competitie_id', competitie.id).order('ordine_afisare'),
      supabase.from('inscrieri_competitie').select('*, sportiv:sportivi(id, nume, prenume, grad_actual_id, data_nasterii)').eq('competitie_id', competitie.id),
      supabase.from('echipe_competitie').select('*, echipa_sportivi(sportiv_id, rol, sportiv:sportivi(id, nume, prenume))').eq('competitie_id', competitie.id),
    ]);
    setProbe((probeRes.data || []) as ProbaCompetitie[]);
    setCategorii((catRes.data || []) as CategorieCompetitie[]);
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
    inscrieri.filter(i => i.categorie_id === catId).length +
    echipe.filter(e => e.categorie_id === catId).length;

  const canRegister = competitie.status === 'inscrieri_deschise';
  const myClubId = currentUser?.club_id;

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
      <div className="flex gap-2 border-b border-slate-700 pb-0 overflow-x-auto">
        <button onClick={() => handleSetActiveTab('categorii')} style={{ touchAction: 'manipulation' }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'categorii' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 hover:text-white'}`}>
          Categorii ({categorii.length})
        </button>
        <button onClick={() => handleSetActiveTab('inscrieri')} style={{ touchAction: 'manipulation' }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'inscrieri' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 hover:text-white'}`}>
          Inscrieri ({inscrieri.length + echipe.length})
        </button>
        {isAdmin && (
          <button onClick={() => handleSetActiveTab('admin')} style={{ touchAction: 'manipulation' }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
            Admin
          </button>
        )}
        {competitie.legacy_eveniment_id && (
          <button onClick={() => handleSetActiveTab('rezultate_legacy')} style={{ touchAction: 'manipulation' }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rezultate_legacy' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
            Rezultate Vechi
          </button>
        )}
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="p-2 text-left w-10">#</th>
                      <th className="p-2 text-left">Categorie</th>
                      <th className="p-2 text-left hidden md:table-cell">Probă</th>
                      <th className="p-2 text-left hidden md:table-cell">Participare</th>
                      <th className="p-2 text-center">Înscriși</th>
                      {canRegister && isClubAdmin && <th className="p-2 text-right">Acțiuni</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCategorii.map(cat => {
                      const proba = probe.find(p => p.id === cat.proba_id);
                      const count = inscrieriCount(cat.id);
                      const isTeam = cat.tip_participare !== 'individual';
                      const isExpanded = viewInscrieriCatId === cat.id;
                      // Sportivi individuali înscriși în această categorie
                      const inscrieriCat = inscrieri.filter(i => i.categorie_id === cat.id && i.status !== 'retras');
                      // Echipe înscrise în această categorie
                      const echipeCat = echipe.filter(e => e.categorie_id === cat.id && e.status !== 'retrasa');
                      const colCount = (canRegister && isClubAdmin) ? 6 : 5;
                      return (
                        <React.Fragment key={cat.id}>
                          <tr className="hover:bg-slate-800/50">
                            <td className="p-2 text-slate-500">{cat.numar_categorie}</td>
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
                                {count}/{cat.min_participanti_start}
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
                              <td colSpan={colCount} className="px-2 pb-2 pt-0 bg-slate-800/40">
                                <div className="rounded-lg border border-slate-700 overflow-hidden">
                                  <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center justify-between">
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
                                        return (
                                          <div key={ins.id} className="flex items-center gap-3 px-3 py-2">
                                            <span className="text-xs text-slate-500 w-5 shrink-0">{idx + 1}.</span>
                                            <div className="flex-1 min-w-0">
                                              <span className="text-sm text-white font-medium uppercase">
                                                {sp ? `${sp.nume} ${sp.prenume}` : ins.sportiv_id}
                                              </span>
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
                                              <span className="text-sm text-white font-medium">
                                                {ec.denumire_echipa || 'Echipă fără denumire'}
                                              </span>
                                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${ec.status === 'confirmata' ? 'bg-green-800 text-green-200' : 'bg-slate-700 text-slate-300'}`}>
                                                {ec.status}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {membri.map((ms: any) => (
                                                <span key={ms.sportiv_id} className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                                                  <span className="uppercase">{ms.sportiv ? `${ms.sportiv.nume} ${ms.sportiv.prenume}` : ms.sportiv_id}</span>
                                                  {ms.rol === 'rezerva' && <span className="text-slate-500 ml-1">(R)</span>}
                                                </span>
                                              ))}
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
            wizardOpen ? (
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
                onBack={() => setWizardOpen(false)}
                onSaved={() => { setWizardOpen(false); fetchData(); }}
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
                  myClubId={myClubId || null}
                  vizeSportivi={vizeSportivi}
                  onRefresh={fetchData}
                />
              </div>
            )
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-500 text-xs uppercase">
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Sportiv</th>
                        <th className="p-2 text-left">Probe</th>
                        <th className="p-2 text-left">Rezultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rezultateLegacy.map((r, idx) => (
                        <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/40">
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
          vizeSportivi={vizeSportivi}
          onClose={() => setInscriereModal(null)}
          onSaved={() => { setInscriereModal(null); fetchData(); }}
        />
      )}
    </div>
  );
};

// -----------------------------------------------
// PROBE EDITOR — inline rename + add + delete
// -----------------------------------------------
const ProbeEditor: React.FC<{
  competitieId: string;
  probe: ProbaCompetitie[];
  setProbe: React.Dispatch<React.SetStateAction<ProbaCompetitie[]>>;
  categorii: CategorieCompetitie[];
  probaFormOpen: boolean;
  setProbaFormOpen: (v: boolean) => void;
  onDeleteProba: (id: string) => void;
}> = ({ competitieId, probe, setProbe, categorii, probaFormOpen, setProbaFormOpen, onDeleteProba }) => {
  const { showError } = useError();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState('');

  const startEdit = (p: ProbaCompetitie) => {
    setEditingId(p.id);
    setEditingVal(p.denumire);
  };

  const saveEdit = async (id: string) => {
    const val = editingVal.trim();
    if (!val) { setEditingId(null); return; }
    const { error } = await supabase.from('probe_competitie').update({ denumire: val }).eq('id', id);
    if (error) { showError('Eroare', error.message); return; }
    setProbe(prev => prev.map(p => p.id === id ? { ...p, denumire: val } : p));
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <Button variant="success" size="sm" onClick={() => setProbaFormOpen(true)}>
        <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Probă
      </Button>
      <div className="space-y-2">
        {probe.map(p => (
          <div key={p.id} className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
            {editingId === p.id ? (
              <input
                autoFocus
                className="flex-1 bg-slate-700 border border-brand-primary rounded px-2 py-1 text-sm text-white"
                value={editingVal}
                onChange={e => setEditingVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(p.id); if (e.key === 'Escape') setEditingId(null); }}
                onBlur={() => saveEdit(p.id)}
              />
            ) : (
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{p.denumire}</div>
                <div className="text-xs text-slate-400">{TIP_PROBA_LABELS[p.tip_proba]} · {categorii.filter(c => c.proba_id === p.id).length} categorii</div>
              </div>
            )}
            <div className="flex gap-1 shrink-0">
              {editingId === p.id ? (
                <Button size="sm" variant="success" className="!p-2" onClick={() => saveEdit(p.id)}>✓</Button>
              ) : (
                <Button size="sm" variant="secondary" className="!p-2" onClick={() => startEdit(p)}>
                  <EditIcon className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="danger" className="!p-2" onClick={() => onDeleteProba(p.id)}>
                <TrashIcon className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {probe.length === 0 && <div className="text-slate-500 italic text-sm text-center py-4">Nicio probă definită.</div>}
      </div>
      {probaFormOpen && (
        <ProbaForm
          competitieId={competitieId}
          onClose={() => setProbaFormOpen(false)}
          onSaved={(p) => { setProbe(prev => [...prev, p]); setProbaFormOpen(false); }}
        />
      )}
    </div>
  );
};

// -----------------------------------------------
// FUZIONARI PANEL — sugestii de combinare categorii
// -----------------------------------------------
interface MergeSugestie {
  catA: CategorieCompetitie;
  catB: CategorieCompetitie;
  countA: number;
  countB: number;
  tip: 'varste_adiacente' | 'grade_adiacente' | 'varste_si_grade';
  newVarstaMin: number;
  newVarstaMax: number | null;
  newGradMin: number | null;
  newGradMax: number | null;
}

const FuzionariPanel: React.FC<{
  categorii: CategorieCompetitie[];
  setCategorii: React.Dispatch<React.SetStateAction<CategorieCompetitie[]>>;
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  probe: ProbaCompetitie[];
  onRefresh: () => void;
}> = ({ categorii, setCategorii, inscrieri, echipe, probe, onRefresh }) => {
  const { showError } = useError();
  const [loading, setLoading] = useState<string | null>(null);

  const count = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId).length +
    echipe.filter(e => e.categorie_id === catId).length;

  // Generează sugestii de fuzionare pentru categorii sub minim
  const sugestii = useMemo((): MergeSugestie[] => {
    const result: MergeSugestie[] = [];
    const seen = new Set<string>();

    for (const catA of categorii) {
      const cntA = count(catA.id);
      if (cntA >= catA.min_participanti_start) continue; // ok, skip

      for (const catB of categorii) {
        if (catA.id === catB.id) continue;
        const pairKey = [catA.id, catB.id].sort().join('::');
        if (seen.has(pairKey)) continue;

        // Trebuie să aibă același gen, aceeași probă, același tip participare
        if (catA.gen !== catB.gen) continue;
        if (catA.proba_id !== catB.proba_id) continue;
        if (catA.tip_participare !== catB.tip_participare) continue;

        const cntB = count(catB.id);

        // Calculează adiacența vârstelor
        const aVMin = catA.varsta_min, aVMax = catA.varsta_max ?? catA.varsta_min;
        const bVMin = catB.varsta_min, bVMax = catB.varsta_max ?? catB.varsta_min;
        const varsteAdiacente = Math.abs(aVMax - bVMin) <= 2 || Math.abs(bVMax - aVMin) <= 2;
        const aceaVarsta = aVMin === bVMin && catA.varsta_max === catB.varsta_max;

        // Calculează adiacența gradelor
        const aGMin = catA.grad_min_ordine, aGMax = catA.grad_max_ordine;
        const bGMin = catB.grad_min_ordine, bGMax = catB.grad_max_ordine;
        const gradeAdiacente = aGMin !== null && bGMin !== null &&
          (Math.abs((aGMax ?? aGMin) - bGMin) <= 2 || Math.abs((bGMax ?? bGMin) - aGMin) <= 2);
        const acelasGrad = aGMin === bGMin && aGMax === bGMax;

        let tip: MergeSugestie['tip'] | null = null;
        if (varsteAdiacente && acelasGrad) tip = 'varste_adiacente';
        else if (aceaVarsta && gradeAdiacente) tip = 'grade_adiacente';
        else if (varsteAdiacente && gradeAdiacente) tip = 'varste_si_grade';

        if (!tip) continue;

        // Nu sugera dacă intervalul rezultat e prea larg (>3 ani sau >4 grade)
        const newVMin = Math.min(aVMin, bVMin);
        const newVMax = Math.max(aVMax, bVMax);
        if (newVMax - newVMin > 3) continue;
        const newGMin = aGMin !== null && bGMin !== null ? Math.min(aGMin, bGMin) : (aGMin ?? bGMin);
        const newGMax = aGMax !== null && bGMax !== null ? Math.max(aGMax, bGMax) : (aGMax ?? bGMax);
        if (newGMin !== null && newGMax !== null && newGMax - newGMin > 4) continue;

        seen.add(pairKey);
        result.push({
          catA, catB, countA: cntA, countB: cntB, tip,
          newVarstaMin: newVMin,
          newVarstaMax: catA.varsta_max === null && catB.varsta_max === null ? null : newVMax,
          newGradMin: newGMin, newGradMax: newGMax,
        });
      }
    }

    // Sortează: cele cu total mai aproape de minim primele
    return result.sort((a, b) => {
      const totA = a.countA + a.countB;
      const totB = b.countA + b.countB;
      return totB - totA;
    });
  }, [categorii, inscrieri, echipe]);

  const subMinim = categorii.filter(c => {
    const cnt = count(c.id);
    return cnt > 0 && cnt < c.min_participanti_start;
  });
  const goale = categorii.filter(c => count(c.id) === 0);

  const handleFuzioneaza = async (s: MergeSugestie) => {
    const key = `${s.catA.id}::${s.catB.id}`;
    setLoading(key);
    try {
      // 1. Mută înscrierile din B în A
      const { error: e1 } = await supabase.from('inscrieri_competitie')
        .update({ categorie_id: s.catA.id }).eq('categorie_id', s.catB.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('echipe_competitie')
        .update({ categorie_id: s.catA.id }).eq('categorie_id', s.catB.id);
      if (e2) throw e2;

      // 2. Actualizează categoria A cu noul interval
      const newDenumire = buildCategorieDenumire({
        varsta_min: s.newVarstaMin, varsta_max: s.newVarstaMax,
        gen: s.catA.gen, grad_min_ordine: s.newGradMin, grad_max_ordine: s.newGradMax,
        arma: s.catA.arma, tip_participare: s.catA.tip_participare,
        sportivi_per_echipa_min: s.catA.sportivi_per_echipa_min,
        sportivi_per_echipa_max: s.catA.sportivi_per_echipa_max,
        rezerve_max: s.catA.rezerve_max, max_echipe_per_club: s.catA.max_echipe_per_club,
        min_participanti_start: s.catA.min_participanti_start, numar_categorie: s.catA.numar_categorie,
      });
      const { error: e3 } = await supabase.from('categorii_competitie').update({
        varsta_min: s.newVarstaMin, varsta_max: s.newVarstaMax,
        grad_min_ordine: s.newGradMin, grad_max_ordine: s.newGradMax,
        denumire: newDenumire,
      }).eq('id', s.catA.id);
      if (e3) throw e3;

      // 3. Șterge categoria B
      const { error: e4 } = await supabase.from('categorii_competitie').delete().eq('id', s.catB.id);
      if (e4) throw e4;

      onRefresh();
    } catch (err: any) {
      showError('Eroare fuzionare', err.message);
    } finally {
      setLoading(null);
    }
  };

  const tipLabel: Record<MergeSugestie['tip'], string> = {
    varste_adiacente: 'Vârste adiacente, același grad',
    grade_adiacente: 'Aceeași vârstă, grade adiacente',
    varste_si_grade: 'Vârste + grade adiacente',
  };
  const tipColor: Record<MergeSugestie['tip'], string> = {
    varste_adiacente: 'bg-blue-900/30 border-blue-700/50 text-blue-300',
    grade_adiacente: 'bg-purple-900/30 border-purple-700/50 text-purple-300',
    varste_si_grade: 'bg-orange-900/30 border-orange-700/50 text-orange-300',
  };

  return (
    <div className="space-y-4">
      {/* Sumar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 border ${subMinim.length > 0 ? 'bg-red-900/20 border-red-700/50' : 'bg-slate-800 border-slate-700'}`}>
          <div className={`text-2xl font-bold ${subMinim.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{subMinim.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Sub minim (au inscrisi)</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="text-2xl font-bold text-slate-500">{goale.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Goale (0 înscriși)</div>
        </div>
        <div className={`rounded-lg p-3 border ${sugestii.length > 0 ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-slate-800 border-slate-700'}`}>
          <div className={`text-2xl font-bold ${sugestii.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{sugestii.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Sugestii fuzionare</div>
        </div>
      </div>

      {subMinim.length === 0 && goale.length === 0 ? (
        <div className="text-center text-green-400 py-8">✓ Toate categoriile cu înscriși ating minimul necesar.</div>
      ) : (
        <>
          {/* Categorii sub minim */}
          {subMinim.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-2">Categorii sub minim ({subMinim.length})</h4>
              <div className="space-y-1">
                {subMinim.map(cat => {
                  const proba = probe.find(p => p.id === cat.proba_id);
                  const cnt = count(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center gap-3 p-2 bg-red-900/10 border border-red-800/30 rounded text-sm">
                      <span className="font-bold text-red-400">{cnt}/{cat.min_participanti_start}</span>
                      <span className="text-white flex-1">{cat.denumire}</span>
                      {proba && <span className="text-xs text-slate-500">{proba.denumire}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorii goale */}
          {goale.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Categorii fără înscriși ({goale.length})</h4>
              <div className="flex flex-wrap gap-1">
                {goale.map(cat => (
                  <span key={cat.id} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">
                    {cat.denumire}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sugestii fuzionare */}
      {sugestii.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">Sugestii de fuzionare ({sugestii.length})</h4>
          <div className="space-y-2">
            {sugestii.map(s => {
              const key = `${s.catA.id}::${s.catB.id}`;
              const total = s.countA + s.countB;
              const atingeMinim = total >= s.catA.min_participanti_start;
              const newDen = buildCategorieDenumire({
                varsta_min: s.newVarstaMin, varsta_max: s.newVarstaMax,
                gen: s.catA.gen, grad_min_ordine: s.newGradMin, grad_max_ordine: s.newGradMax,
                arma: s.catA.arma, tip_participare: s.catA.tip_participare,
                sportivi_per_echipa_min: s.catA.sportivi_per_echipa_min,
                sportivi_per_echipa_max: s.catA.sportivi_per_echipa_max,
                rezerve_max: s.catA.rezerve_max, max_echipe_per_club: s.catA.max_echipe_per_club,
                min_participanti_start: s.catA.min_participanti_start, numar_categorie: s.catA.numar_categorie,
              });
              const proba = probe.find(p => p.id === s.catA.proba_id);
              return (
                <div key={key} className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tipColor[s.tip]}`}>{tipLabel[s.tip]}</span>
                    {proba && <span className="text-xs text-slate-500">{proba.denumire}</span>}
                    {atingeMinim
                      ? <span className="text-xs text-green-400 ml-auto">✓ Atinge minimul ({total}/{s.catA.min_participanti_start})</span>
                      : <span className="text-xs text-yellow-400 ml-auto">Parțial ({total}/{s.catA.min_participanti_start})</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{s.catA.denumire}</span>
                      <span className="text-xs text-slate-500">{s.countA} înscriși</span>
                    </div>
                    <span className="text-slate-500">+</span>
                    <div className="flex flex-col">
                      <span className="text-slate-300">{s.catB.denumire}</span>
                      <span className="text-xs text-slate-500">{s.countB} înscriși</span>
                    </div>
                    <span className="text-slate-500">→</span>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{newDen}</span>
                      <span className="text-xs text-green-400">{total} înscriși total</span>
                    </div>
                  </div>
                  <Button size="sm" variant="warning" disabled={loading === key}
                    onClick={() => handleFuzioneaza(s)}>
                    {loading === key ? 'Se fuzionează...' : 'Fuzionează'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------
// SOLICITĂRI ECHIPE INCOMPLETE — panou admin federație
// -----------------------------------------------
const SolicitariEchipePanel: React.FC<{
  competitieId: string;
  categorii: CategorieCompetitie[];
}> = ({ competitieId, categorii }) => {
  const { showError } = useError();
  const [solicitari, setSolicitari] = useState<SolicitareEchipaIncompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSolicitari = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitari_echipe_incomplete')
      .select('*, club_solicitant:cluburi!club_solicitant_id(id, nume), club_acceptant:cluburi!club_acceptant_id(id, nume)')
      .eq('competitie_id', competitieId)
      .order('created_at', { ascending: false });
    if (error) { showError('Eroare', error.message); }
    else setSolicitari((data || []) as SolicitareEchipaIncompleta[]);
    setLoading(false);
  }, [competitieId]);

  useEffect(() => { fetchSolicitari(); }, [fetchSolicitari]);

  const handleStatus = async (id: string, status: 'acceptata' | 'anulata') => {
    setUpdating(id);
    const { error } = await supabase
      .from('solicitari_echipe_incomplete')
      .update({ status })
      .eq('id', id);
    if (error) showError('Eroare', error.message);
    else setSolicitari(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setUpdating(null);
  };

  const statusColor: Record<string, string> = {
    deschisa: 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300',
    acceptata: 'bg-green-900/30 border-green-700/50 text-green-300',
    anulata: 'bg-slate-800 border-slate-700 text-slate-500',
  };

  if (loading) return <div className="text-center text-slate-400 py-8">Se încarcă...</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Cluburi care solicită partener inter-club pentru completarea echipelor.
      </p>
      {solicitari.length === 0 ? (
        <div className="text-center text-slate-500 py-8 italic">Nicio solicitare înregistrată.</div>
      ) : (
        <div className="space-y-3">
          {solicitari.map(s => {
            const cat = categorii.find(c => c.id === s.categorie_id);
            return (
              <div key={s.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium text-sm text-white">
                      {(s.club_solicitant as any)?.nume ?? s.club_solicitant_id}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {cat?.denumire ?? s.categorie_id} · {s.sportivi_disponibili.length} sportivi disponibili
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[s.status]}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </div>
                {s.club_acceptant && (
                  <div className="text-xs text-green-400">
                    Partener: {(s.club_acceptant as any)?.nume}
                  </div>
                )}
                {s.status === 'deschisa' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" disabled={updating === s.id}
                      onClick={() => handleStatus(s.id, 'acceptata')}>
                      Marchează acceptată
                    </Button>
                    <Button size="sm" variant="danger" disabled={updating === s.id}
                      onClick={() => handleStatus(s.id, 'anulata')}>
                      Anulează
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  inscrieri, echipe, vizeSportivi, catFormOpen, setCatFormOpen, catToEdit, setCatToEdit,
  probaFormOpen, setProbaFormOpen, onRefresh,
}) => {
  const { showError } = useError();
  const [adminSection, setAdminSection] = useState<'stats' | 'probe' | 'categorii' | 'fuzionari' | 'echipe_incomplete'>('stats');
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();

  const inscrieriCount = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId).length +
    echipe.filter(e => e.categorie_id === catId).length;

  const totalInscrisi = inscrieri.length + echipe.length;
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
                          {cnt}/{cat.min_participanti_start} {ok ? '✓' : '⚠'}
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{categorii.length} categorii definite</span>
            <Button variant="success" size="sm" onClick={() => { setCatToEdit(null); setCatFormOpen(true); }}>
              <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Categorie
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left w-10">#</th>
                  <th className="p-2 text-left">Categorie</th>
                  <th className="p-2 text-left hidden md:table-cell">Probă</th>
                  <th className="p-2 text-center hidden md:table-cell">Tip</th>
                  <th className="p-2 text-center">Înscriși</th>
                  <th className="p-2 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {categorii.map(cat => {
                  const proba = probe.find(p => p.id === cat.proba_id);
                  const cnt = inscrieriCount(cat.id);
                  return (
                    <tr key={cat.id} className="hover:bg-slate-800/50">
                      <td className="p-2 text-slate-500 text-xs">{cat.numar_categorie}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
          {catFormOpen && (
            <CategorieForm
              competitieId={competitie.id}
              probe={probe}
              categorie={catToEdit}
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
// PROBA FORM
// -----------------------------------------------
interface ProbaFormProps {
  competitieId: string;
  onClose: () => void;
  onSaved: (p: ProbaCompetitie) => void;
}
const ProbaForm: React.FC<ProbaFormProps> = ({ competitieId, onClose, onSaved }) => {
  const { showError } = useError();
  const [tipProba, setTipProba] = useState<TipProba>('thao_quyen_individual');
  const [denumire, setDenumire] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!denumire.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from('probe_competitie').insert({
      competitie_id: competitieId,
      tip_proba: tipProba,
      denumire: denumire.trim(),
      ordine_afisare: 0,
    }).select().single();
    if (error) { showError('Eroare', error.message); setLoading(false); return; }
    onSaved(data as ProbaCompetitie);
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-bold text-white">Adaugă Probă Nouă</h4>
      <Select label="Tip Probă" value={tipProba} onChange={e => {
        const t = e.target.value as TipProba;
        setTipProba(t);
        setDenumire(TIP_PROBA_LABELS[t]);
      }}>
        {Object.entries(TIP_PROBA_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>
      <Input label="Denumire" value={denumire} onChange={e => setDenumire(e.target.value)} />
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Anulează</Button>
        <Button variant="success" size="sm" onClick={handleSave} disabled={loading}>Salvează</Button>
      </div>
    </div>
  );
};

// -----------------------------------------------
// CATEGORIE FORM (add / edit)
// -----------------------------------------------
interface CategorieFormProps {
  competitieId: string;
  probe: ProbaCompetitie[];
  categorie: CategorieCompetitie | null;
  onClose: () => void;
  onSaved: (c: CategorieCompetitie) => void;
}

const CategorieForm: React.FC<CategorieFormProps> = ({ competitieId, probe, categorie, onClose, onSaved }) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    proba_id: categorie?.proba_id || probe[0]?.id || '',
    numar_categorie: String(categorie?.numar_categorie ?? ''),
    denumire: categorie?.denumire || '',
    varsta_min: String(categorie?.varsta_min ?? '7'),
    varsta_max: String(categorie?.varsta_max ?? ''),
    gen: (categorie?.gen ?? 'Feminin') as 'Feminin' | 'Masculin' | 'Mixt',
    grad_min_ordine: String(categorie?.grad_min_ordine ?? ''),
    grad_max_ordine: String(categorie?.grad_max_ordine ?? ''),
    arma: categorie?.arma || '',
    tip_participare: (categorie?.tip_participare ?? 'individual') as 'individual' | 'pereche' | 'echipa',
    sportivi_per_echipa_min: String(categorie?.sportivi_per_echipa_min ?? '1'),
    sportivi_per_echipa_max: String(categorie?.sportivi_per_echipa_max ?? '1'),
    rezerve_max: String(categorie?.rezerve_max ?? '0'),
    max_echipe_per_club: String(categorie?.max_echipe_per_club ?? '1'),
    min_participanti_start: String(categorie?.min_participanti_start ?? '3'),
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      competitie_id: competitieId,
      proba_id: form.proba_id || null,
      numar_categorie: parseInt(form.numar_categorie) || null,
      denumire: form.denumire.trim() || null,
      varsta_min: parseInt(form.varsta_min) || 0,
      varsta_max: parseInt(form.varsta_max) || null,
      gen: form.gen,
      grad_min_ordine: parseInt(form.grad_min_ordine) || null,
      grad_max_ordine: parseInt(form.grad_max_ordine) || null,
      arma: form.arma.trim() || null,
      tip_participare: form.tip_participare,
      sportivi_per_echipa_min: parseInt(form.sportivi_per_echipa_min) || 1,
      sportivi_per_echipa_max: parseInt(form.sportivi_per_echipa_max) || 1,
      rezerve_max: parseInt(form.rezerve_max) || 0,
      max_echipe_per_club: parseInt(form.max_echipe_per_club) || 1,
      min_participanti_start: parseInt(form.min_participanti_start) || 3,
    };
    try {
      if (categorie) {
        const { data, error } = await supabase.from('categorii_competitie').update(payload).eq('id', categorie.id).select().single();
        if (error) throw error;
        onSaved(data as CategorieCompetitie);
      } else {
        const { data, error } = await supabase.from('categorii_competitie').insert(payload).select().single();
        if (error) throw error;
        onSaved(data as CategorieCompetitie);
      }
    } catch (err: any) {
      showError('Eroare', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={categorie ? 'Editează Categorie' : 'Adaugă Categorie'}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nr. Categorie" type="number" value={form.numar_categorie} onChange={f('numar_categorie')} />
          <Select label="Probă" value={form.proba_id} onChange={f('proba_id')}>
            <option value="">Fără probă</option>
            {probe.map(p => <option key={p.id} value={p.id}>{p.denumire}</option>)}
          </Select>
        </div>
        <Input label="Denumire (auto sau personalizată)" value={form.denumire} onChange={f('denumire')} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Vârstă Min" type="number" value={form.varsta_min} onChange={f('varsta_min')} />
          <Input label="Vârstă Max (gol = fără limită)" type="number" value={form.varsta_max} onChange={f('varsta_max')} />
          <Select label="Gen" value={form.gen} onChange={f('gen')}>
            <option value="Feminin">Feminin</option>
            <option value="Masculin">Masculin</option>
            <option value="Mixt">Mixt</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Grad Min (ordine, gol = orice)" type="number" value={form.grad_min_ordine} onChange={f('grad_min_ordine')} />
          <Input label="Grad Max (ordine, gol = orice)" type="number" value={form.grad_max_ordine} onChange={f('grad_max_ordine')} />
        </div>
        <Input label="Armă (pentru CVD, ex: Bong)" value={form.arma} onChange={f('arma')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Tip Participare" value={form.tip_participare} onChange={f('tip_participare')}>
            <option value="individual">Individual</option>
            <option value="pereche">Pereche</option>
            <option value="echipa">Echipă</option>
          </Select>
          <Input label="Min. participanți start" type="number" value={form.min_participanti_start} onChange={f('min_participanti_start')} />
        </div>
        {form.tip_participare !== 'individual' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Sportivi/echipă min" type="number" value={form.sportivi_per_echipa_min} onChange={f('sportivi_per_echipa_min')} />
            <Input label="Sportivi/echipă max" type="number" value={form.sportivi_per_echipa_max} onChange={f('sportivi_per_echipa_max')} />
            <Input label="Rezerve max" type="number" value={form.rezerve_max} onChange={f('rezerve_max')} />
          </div>
        )}
        <Input label="Max echipe/club" type="number" value={form.max_echipe_per_club} onChange={f('max_echipe_per_club')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" onClick={handleSave} disabled={loading}>
            {loading ? 'Se salvează...' : (categorie ? 'Actualizează' : 'Adaugă')}
          </Button>
        </div>
      </div>
    </Modal>
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
  myClubId: string | null;
  vizeSportivi: VizaSportiv[];
  onRefresh: () => void;
}

const InscrieriView: React.FC<InscrieriViewProps> = ({
  competitie, categorii, probe, inscrieri, echipe, grade, isAdmin, myClubId, vizeSportivi, onRefresh
}) => {
  const { showError } = useError();
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();

  const statusOrdine: Record<string, number> = { inscris: 0, confirmat: 1, retras: 2 };
  const filteredInscrieri = (isAdmin ? inscrieri : inscrieri.filter(i => i.club_id === myClubId))
    .slice()
    .sort((a, b) => (statusOrdine[a.status] ?? 9) - (statusOrdine[b.status] ?? 9));
  const filteredEchipe = isAdmin ? echipe : echipe.filter(e => e.club_id === myClubId);

  const handleRetrage = async (id: string, type: 'inscris' | 'echipa') => {
    const table = type === 'inscris' ? 'inscrieri_competitie' : 'echipe_competitie';
    // inscrieri_competitie acceptă 'retras', echipe_competitie acceptă 'retrasa'
    const statusRetras = type === 'inscris' ? 'retras' : 'retrasa';
    const { error } = await supabase.from(table).update({ status: statusRetras }).eq('id', id);
    if (error) { showError("Eroare", error.message); return; }
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Individual */}
      {filteredInscrieri.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
            Înregistrări Individuale ({filteredInscrieri.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
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
                  const farаViza = sportiv && !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
                  return (
                    <tr key={ins.id} className={farаViza ? 'bg-yellow-900/10' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-white uppercase">
                            {sportiv?.nume} {sportiv?.prenume}
                          </span>
                          <WarningVizaFRAM show={farаViza} inline />
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
                        {ins.status === 'inscris' && (
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
        </div>
      )}

      {/* Echipe */}
      {filteredEchipe.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
            Echipe ({filteredEchipe.length})
          </h3>
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
                      {ec.status === 'inscrisa' && (
                        <Button size="sm" variant="danger" className="text-xs !py-1"
                          onClick={() => handleRetrage(ec.id, 'echipa')}>Retrage</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {filteredInscrieri.length === 0 && filteredEchipe.length === 0 && (
        <div className="text-center text-slate-500 py-12 italic">
          {isAdmin ? 'Nicio înscriere înregistrată.' : 'Clubul tău nu are sportivi înscriși la această competiție.'}
        </div>
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
  vizeSportivi: VizaSportiv[];
  onClose: () => void;
  onSaved: () => void;
}

const InscriereModal: React.FC<InscriereModalProps> = ({
  competitie, categorie, sportivi, grade, inscrieri, echipe, clubId, vizeSportivi, onClose, onSaved
}) => {
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const isTeam = categorie.tip_participare !== 'individual';

  // Task 2: toggle afișare sportivi neeligibili
  const [showNeeligibili, setShowNeeligibili] = useState(false);

  // For individual
  const [selectedSportivId, setSelectedSportivId] = useState('');
  // For echipa/pereche
  const [selectedTitulari, setSelectedTitulari] = useState<string[]>([]);
  const [selectedRezerve, setSelectedRezerve] = useState<string[]>([]);
  const [denEchipa, setDenEchipa] = useState('');

  // Eligibility check
  const eligibilitati = filtreazaSportiviEligibili(
    sportivi, categorie, grade, competitie.data_inceput
  );

  const eligibili = eligibilitati.filter(e => e.eligibilitate.eligibil);
  const neeligibili = eligibilitati.filter(e => !e.eligibilitate.eligibil);

  // Check already inscribed (pentru această categorie)
  const inscrisPrev = new Set(inscrieri.filter(i => i.categorie_id === categorie.id && i.status !== 'retras').map(i => i.sportiv_id));
  const inscrisInEchipa = new Set(
    (echipe.filter(e => e.categorie_id === categorie.id && e.status !== 'retrasa') as any[])
      .flatMap(e => (e.echipa_sportivi || []).map((ms: any) => ms.sportiv_id))
  );

  // Task 2: sortare — eligibili neinscrisi → eligibili deja inscriși
  const eligibiliSortati = useMemo(() => {
    const neinscrisi = eligibili.filter(e => !inscrisPrev.has(e.sportiv.id) && !inscrisInEchipa.has(e.sportiv.id));
    const dejaInscrisiLst = eligibili.filter(e => inscrisPrev.has(e.sportiv.id) || inscrisInEchipa.has(e.sportiv.id));
    return { neinscrisi, dejaInscrisiLst };
  }, [eligibili]); // eslint-disable-line react-hooks/exhaustive-deps

  // Task 3: verificare categorie thao_quyen individual (nelimitat = sportivi_per_echipa_max === 0 sau tip_participare individual + proba thao_quyen)
  const esteThaoQuyenIndividualModal = !isTeam && (
    categorie.proba?.tip_proba === 'thao_quyen_individual' ||
    categorie.proba?.tip_proba === 'thao_lo_individual'
  );

  // Task 3: selectare în masă
  const allEligibiliNeinscrisi = eligibiliSortati.neinscrisi.map(e => e.sportiv.id);
  const allSelected = allEligibiliNeinscrisi.length > 0 &&
    allEligibiliNeinscrisi.every(id => selectedTitulari.includes(id));

  // Task 4: echipă deja înscrisă din clubul curent
  const echipaDejaInscrisa = useMemo(() => {
    if (!isTeam) return null;
    return (echipe as any[]).find(
      e => e.categorie_id === categorie.id && e.club_id === clubId && e.status !== 'retrasa'
    ) ?? null;
  }, [echipe, categorie.id, clubId, isTeam]);

  // Task 4: precompletare pentru editare echipă existentă
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (echipaDejaInscrisa && !editMode) return;
    if (editMode && echipaDejaInscrisa) {
      // Precompletăm cu membrii echipei existente
      const membri = (echipaDejaInscrisa as any).echipa_sportivi || [];
      const titulari = membri.filter((m: any) => m.rol === 'titular').map((m: any) => m.sportiv_id);
      const rezerve = membri.filter((m: any) => m.rol === 'rezerva').map((m: any) => m.sportiv_id);
      setSelectedTitulari(titulari);
      setSelectedRezerve(rezerve);
      setDenEchipa((echipaDejaInscrisa as any).denumire_echipa || '');
    }
  }, [editMode, echipaDejaInscrisa]);

  const toggleTitular = (id: string) => {
    setSelectedTitulari(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      // Task 3: thao quyen individual — nelimitat
      if (!esteThaoQuyenIndividualModal && prev.length >= categorie.sportivi_per_echipa_max) return prev;
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!isTeam) {
        if (!selectedSportivId) throw new Error('Selectează un sportiv');
        const { error } = await supabase.from('inscrieri_competitie').insert({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          sportiv_id: selectedSportivId,
        });
        if (error) throw error;
      } else if (editMode && echipaDejaInscrisa) {
        // Task 4: actualizare componență echipă existentă
        if (selectedTitulari.length < categorie.sportivi_per_echipa_min) {
          throw new Error(`Selectează minim ${categorie.sportivi_per_echipa_min} titulari`);
        }
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
        // Actualizăm și denumirea
        if (denEchipa.trim()) {
          await supabase.from('echipe_competitie').update({ denumire_echipa: denEchipa.trim().toUpperCase() }).eq('id', (echipaDejaInscrisa as any).id);
        }
      } else {
        if (selectedTitulari.length < categorie.sportivi_per_echipa_min) {
          throw new Error(`Selectează minim ${categorie.sportivi_per_echipa_min} titulari`);
        }
        const { data: ec, error: ecErr } = await supabase.from('echipe_competitie').insert({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          denumire_echipa: denEchipa.trim().toUpperCase() || null,
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

  // Helper randare rând sportiv individual
  const renderSportivIndividual = (sportiv: Sportiv, deja: boolean) => {
    const varsta = sportiv.data_nasterii
      ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput)
      : null;
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    const faraViza = !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
    return (
      <label
        key={sportiv.id}
        style={{ touchAction: 'manipulation' }}
        className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${
          deja ? 'opacity-60 cursor-not-allowed border-blue-700/40 bg-blue-900/10' :
          selectedSportivId === sportiv.id ? 'border-brand-primary bg-brand-primary/10' :
          'border-slate-700 hover:border-slate-500'
        }`}
      >
        <input
          type="radio"
          name="sportiv"
          value={sportiv.id}
          disabled={deja}
          checked={selectedSportivId === sportiv.id}
          onChange={() => !deja && setSelectedSportivId(sportiv.id)}
          className="w-4 h-4"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-white font-medium uppercase">{sportiv.nume} {sportiv.prenume}</span>
            {deja && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-2 py-0.5">
                Deja inscris
              </span>
            )}
            <WarningVizaFRAM show={faraViza} inline />
          </div>
          <div className="text-xs text-slate-400">
            {varsta !== null ? `${varsta} ani` : ''}{grad?.nume ? ` · ${grad.nume}` : ''}
          </div>
        </div>
      </label>
    );
  };

  // Helper randare rând sportiv echipă
  const renderSportivEchipa = (sportiv: Sportiv, deja: boolean) => {
    const varsta = sportiv.data_nasterii
      ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput) : null;
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    const isRezerva = selectedRezerve.includes(sportiv.id);
    const faraViza = !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
    return (
      <label key={sportiv.id} style={{ touchAction: 'manipulation' }} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${
        deja || isRezerva ? 'opacity-40 cursor-not-allowed border-transparent' :
        selectedTitulari.includes(sportiv.id) ? 'border-brand-primary bg-brand-primary/10' :
        'border-slate-700 hover:border-slate-500'
      }`}>
        <input type="checkbox" checked={selectedTitulari.includes(sportiv.id) || deja}
          disabled={deja || isRezerva}
          onChange={() => !deja && !isRezerva && toggleTitular(sportiv.id)}
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

  return (
    <Modal isOpen={true} onClose={onClose} title={`Înscrie la: ${categorie.denumire}`}>
      <div className="space-y-4">
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
          /* Individual — Task 2: sortare + Task 2: neeligibili exclud */
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300 font-medium">
                Sportivi eligibili ({eligibili.length})
              </span>
              {neeligibili.length > 0 && (
                <button
                  onClick={() => setShowNeeligibili(v => !v)}
                  style={{ touchAction: 'manipulation' }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNeeligibili ? 'Ascunde' : 'Arată'} neeligibili ({neeligibili.length})
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto overscroll-contain space-y-1">
              {/* Task 2: Primii — eligibili neinscrisi */}
              {eligibiliSortati.neinscrisi.map(({ sportiv }) => renderSportivIndividual(sportiv, false))}
              {/* Task 2: Dedesubt — eligibili deja inscriși */}
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
              {/* Task 2: Neeligibili — toggle separat */}
              {showNeeligibili && neeligibili.length > 0 && (
                <>
                  <div className="py-1 px-2">
                    <div className="border-t border-red-700/30 flex items-center gap-2">
                      <span className="text-[10px] text-red-500 uppercase tracking-wide whitespace-nowrap bg-slate-900 pr-2">
                        Neeligibili (exclus)
                      </span>
                    </div>
                  </div>
                  {neeligibili.map(({ sportiv, eligibilitate }) => (
                    <div key={sportiv.id} className="flex items-center gap-3 p-2 rounded border border-slate-800 opacity-50">
                      <input type="radio" disabled className="w-4 h-4 opacity-40" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-400 uppercase">{sportiv.nume} {sportiv.prenume}</span>
                        <div className="text-[10px] text-red-400/80 mt-0.5">{eligibilitate.motive.join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        ) : (
          /* Echipă / Pereche — Task 2: sortare + Task 3: select all */
          <div className="space-y-3">
            {editMode && echipaDejaInscrisa && (
              <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700/40 rounded-lg text-xs text-blue-300">
                <span>Editezi componența echipei existente.</span>
                <button onClick={() => setEditMode(false)} className="text-blue-400 hover:underline ml-auto">Anulează</button>
              </div>
            )}
            <Input label="Denumire Echipă (opțional)" value={denEchipa} onChange={e => setDenEchipa(e.target.value)} />
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm text-slate-300 font-medium">
                  Titulari ({selectedTitulari.length}{categorie.sportivi_per_echipa_max > 0 ? `/${categorie.sportivi_per_echipa_max}` : ''})
                </span>
                {/* Task 3: buton selectare în masă — thao quyen sau categorie nelimitată */}
                {(esteThaoQuyenIndividualModal || categorie.sportivi_per_echipa_max === 0) && allEligibiliNeinscrisi.length > 1 && (
                  <button
                    onClick={handleSelectAll}
                    style={{ touchAction: 'manipulation' }}
                    className="text-xs font-medium text-brand-primary hover:underline transition-colors min-h-[32px] px-2"
                  >
                    {allSelected ? 'Deselectează toți' : `Selectează toți (${allEligibiliNeinscrisi.length})`}
                  </button>
                )}
              </div>
              <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1">
                {/* Task 2: eligibili neinscrisi primii */}
                {eligibiliSortati.neinscrisi.map(({ sportiv }) => renderSportivEchipa(sportiv, false))}
                {/* Task 2: deja în echipă */}
                {eligibiliSortati.dejaInscrisiLst.length > 0 && (
                  <>
                    {eligibiliSortati.neinscrisi.length > 0 && (
                      <div className="py-1 px-2">
                        <div className="border-t border-slate-700/60">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wide bg-slate-900 pr-2">
                            Deja în echipă
                          </span>
                        </div>
                      </div>
                    )}
                    {eligibiliSortati.dejaInscrisiLst.map(({ sportiv }) => renderSportivEchipa(sportiv, true))}
                  </>
                )}
                {eligibili.length === 0 && (
                  <div className="text-center text-slate-500 py-3 italic text-sm">
                    Niciun sportiv eligibil din club pentru această categorie.
                  </div>
                )}
                {/* Task 2: neeligibili toggle */}
                {showNeeligibili && neeligibili.length > 0 && (
                  neeligibili.map(({ sportiv, eligibilitate }) => (
                    <div key={sportiv.id} className="flex items-center gap-3 p-2 rounded border border-slate-800 opacity-40">
                      <input type="checkbox" disabled className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-400 uppercase">{sportiv.nume} {sportiv.prenume}</span>
                        <div className="text-[10px] text-red-400/80">{eligibilitate.motive.join(' · ')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {neeligibili.length > 0 && (
                <button
                  onClick={() => setShowNeeligibili(v => !v)}
                  style={{ touchAction: 'manipulation' }}
                  className="mt-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNeeligibili ? 'Ascunde' : 'Arată'} neeligibili ({neeligibili.length})
                </button>
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
            : selectedSportivId ? [selectedSportivId] : [];
          const faraVizaCount = selectedIds.filter(id => !areVizaFRAM(id, anCompetitie, vizeSportivi)).length;
          return faraVizaCount > 0 ? (
            <WarningVizaFRAM show={true} />
          ) : null;
        })()}

        {/* Footer butoane — responsive */}
        {!(isTeam && echipaDejaInscrisa && !editMode) && (
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-700">
            <Button variant="secondary" onClick={onClose} disabled={loading} className="w-full sm:w-auto">Anulează</Button>
            <Button variant="success" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Se salvează...' : editMode ? 'Salvează Modificările' : 'Confirmă Înscrierea'}
            </Button>
          </div>
        )}
        {isTeam && echipaDejaInscrisa && !editMode && (
          <div className="flex justify-end pt-2 border-t border-slate-700">
            <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Închide</Button>
          </div>
        )}
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
