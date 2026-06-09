import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Permissions, Grad, ProbaCompetitie, CategorieCompetitie } from '../../types';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Modal, Input, Select, SearchableSelect } from '../ui';
import { PlusIcon, EditIcon, TrashIcon } from '../icons';
import { useError } from '../ErrorProvider';
import { TIP_PROBA_LABELS, ordineToLabel } from '../../utils/competitiiTemplates';
import CategoryWizard from './CategoryWizard';
import BulkCategoryWizard from './BulkCategoryWizard';

// -----------------------------------------------
// TIP entitate categorii_template
// -----------------------------------------------
export interface CategorieTemplate {
  id: string;
  denumire: string;
  tip_proba: string;
  varsta_min: number;
  varsta_max: number | null;
  gen: 'Feminin' | 'Masculin' | 'Mixt';
  grad_min_ordine: number | null;
  grad_max_ordine: number | null;
  arma: string | null;
  tip_participare: 'individual' | 'pereche' | 'echipa';
  sportivi_per_echipa_min: number;
  sportivi_per_echipa_max: number;
  rezerve_max: number;
  max_echipe_per_club: number;
  activ: boolean;
  ordine_afisare: number;
}

// Tipuri de probă afișate ca taburi (cheie -> label scurt)
const TIP_PROBA_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'Toate' },
  { key: 'thao_quyen_individual', label: 'Thao Quyen' },
  { key: 'song_luyen', label: 'Song Luyen' },
  { key: 'sincron', label: 'Sincron' },
  { key: 'thao_lo_individual', label: 'CVD / Arme' },
  { key: 'giao_dau', label: 'Giao Dau' },
];


const GEN_OPTIONS: ('Feminin' | 'Masculin' | 'Mixt')[] = ['Feminin', 'Masculin', 'Mixt'];
const PARTICIPARE_OPTIONS: { key: 'individual' | 'pereche' | 'echipa'; label: string }[] = [
  { key: 'individual', label: 'Individual' },
  { key: 'pereche', label: 'Pereche' },
  { key: 'echipa', label: 'Echipă' },
];

const VARSTE_OPTIUNI = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,50,55,60];
const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: String(v) }));

const fmtVarsta = (min: number, max: number | null) =>
  max === null ? `${min}+` : min === max ? `${min}` : `${min}-${max}`;

const fmtGrad = (min: number | null, max: number | null) => {
  if (min === null && max === null) return 'Orice';
  if (min !== null && max === null) return `min ${ordineToLabel(min)}`;
  if (min === null && max !== null) return `max ${ordineToLabel(max)}`;
  if (min === max) return ordineToLabel(min!);
  return `${ordineToLabel(min!)} – ${ordineToLabel(max!)}`;
};

// -----------------------------------------------
// FORM MODAL (add / edit template)
// -----------------------------------------------
interface TemplateFormProps {
  template: CategorieTemplate | null;
  grade: Grad[];
  onClose: () => void;
  onSaved: (t: CategorieTemplate) => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, grade, onClose, onSaved }) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    denumire: template?.denumire || '',
    tip_proba: template?.tip_proba || 'thao_quyen_individual',
    varsta_min: String(template?.varsta_min ?? '7'),
    varsta_max: template?.varsta_max != null ? String(template.varsta_max) : '',
    gen: (template?.gen ?? 'Feminin') as 'Feminin' | 'Masculin' | 'Mixt',
    grad_min_ordine: template?.grad_min_ordine != null ? String(template.grad_min_ordine) : '',
    grad_max_ordine: template?.grad_max_ordine != null ? String(template.grad_max_ordine) : '',
    arma: template?.arma || '',
    tip_participare: (template?.tip_participare ?? 'individual') as 'individual' | 'pereche' | 'echipa',
    sportivi_per_echipa_min: String(template?.sportivi_per_echipa_min ?? '1'),
    sportivi_per_echipa_max: String(template?.sportivi_per_echipa_max ?? '1'),
    rezerve_max: String(template?.rezerve_max ?? '0'),
    max_echipe_per_club: String(template?.max_echipe_per_club ?? '1'),
    ordine_afisare: String(template?.ordine_afisare ?? '0'),
  });

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const gradeOptions = useMemo(
    () => [...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({ value: String(g.ordine), label: g.nume })),
    [grade]
  );

  const handleSave = async () => {
    if (!form.denumire.trim()) { showError('Validare', 'Denumirea este obligatorie.'); return; }
    setLoading(true);
    const payload = {
      denumire: form.denumire.trim(),
      tip_proba: form.tip_proba,
      varsta_min: parseInt(form.varsta_min) || 0,
      varsta_max: form.varsta_max ? parseInt(form.varsta_max) : null,
      gen: form.gen,
      grad_min_ordine: form.grad_min_ordine ? parseInt(form.grad_min_ordine) : null,
      grad_max_ordine: form.grad_max_ordine ? parseInt(form.grad_max_ordine) : null,
      arma: form.arma.trim() || null,
      tip_participare: form.tip_participare,
      sportivi_per_echipa_min: parseInt(form.sportivi_per_echipa_min) || 1,
      sportivi_per_echipa_max: parseInt(form.sportivi_per_echipa_max) || 1,
      rezerve_max: parseInt(form.rezerve_max) || 0,
      max_echipe_per_club: parseInt(form.max_echipe_per_club) || 1,
      ordine_afisare: parseInt(form.ordine_afisare) || 0,
    };
    try {
      if (template) {
        const { data, error } = await supabase.from('categorii_template').update(payload).eq('id', template.id).select().single();
        if (error) throw error;
        onSaved(data as CategorieTemplate);
      } else {
        const { data, error } = await supabase.from('categorii_template').insert(payload).select().single();
        if (error) throw error;
        onSaved(data as CategorieTemplate);
      }
    } catch (err: any) {
      showError('Eroare', err.message || 'Eroare la salvarea template-ului');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={template ? 'Editează Template' : 'Adaugă Template'}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="Denumire" value={form.denumire} onChange={f('denumire')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Tip Probă" value={form.tip_proba} onChange={f('tip_proba')}>
            {Object.entries(TIP_PROBA_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select label="Gen" value={form.gen} onChange={f('gen')}>
            <option value="Feminin">Feminin</option>
            <option value="Masculin">Masculin</option>
            <option value="Mixt">Mixt</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchableSelect
            label="Vârstă Min"
            options={VARSTE_OPTIONS}
            value={form.varsta_min}
            onChange={v => setForm(p => ({ ...p, varsta_min: v }))}
            placeholder="Selectează..."
          />
          <SearchableSelect
            label="Vârstă Max"
            options={VARSTE_OPTIONS}
            value={form.varsta_max}
            onChange={v => setForm(p => ({ ...p, varsta_max: v }))}
            placeholder="Fără limită"
            emptyLabel="Fără limită"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchableSelect
            label="Grad Min (gol = orice)"
            options={gradeOptions}
            value={form.grad_min_ordine}
            onChange={v => setForm(p => ({ ...p, grad_min_ordine: v }))}
            placeholder="Orice grad"
            emptyLabel="Orice grad"
          />
          <SearchableSelect
            label="Grad Max (gol = orice)"
            options={gradeOptions}
            value={form.grad_max_ordine}
            onChange={v => setForm(p => ({ ...p, grad_max_ordine: v }))}
            placeholder="Orice grad"
            emptyLabel="Orice grad"
          />
        </div>
        <Input label="Armă (ex: Bong)" value={form.arma} onChange={f('arma')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Tip Participare" value={form.tip_participare} onChange={f('tip_participare')}>
            <option value="individual">Individual</option>
            <option value="pereche">Pereche</option>
            <option value="echipa">Echipă</option>
          </Select>
          <Input label="Ordine afișare" type="number" value={form.ordine_afisare} onChange={f('ordine_afisare')} />
        </div>
        {form.tip_participare !== 'individual' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input label="Sportivi min" type="number" value={form.sportivi_per_echipa_min} onChange={f('sportivi_per_echipa_min')} />
            <Input label="Sportivi max" type="number" value={form.sportivi_per_echipa_max} onChange={f('sportivi_per_echipa_max')} />
            <Input label="Rezerve max" type="number" value={form.rezerve_max} onChange={f('rezerve_max')} />
            <Input label="Max echipe/club" type="number" value={form.max_echipe_per_club} onChange={f('max_echipe_per_club')} />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="success" onClick={handleSave} disabled={loading}>
            {loading ? 'Se salvează...' : (template ? 'Actualizează' : 'Adaugă')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// -----------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------
interface CategoriiTemplateManagerProps {
  permissions: Permissions;
  /** Context competiție: dacă e furnizat, apar butoanele de Import */
  competitieId?: string;
  /** Probă curentă pentru asociere la import (opțional) */
  probaId?: string;
  /** Probe ale competiției — folosit pentru maparea automată tip_proba -> proba_id la import */
  probe?: ProbaCompetitie[];
  /** Categorii deja existente — pentru calcul numar_categorie și callback */
  categoriiExistente?: CategorieCompetitie[];
  /** Apelat după ce un/mai multe template-uri sunt importate ca categorii */
  onImported?: (cats: CategorieCompetitie[]) => void;
  /** Filtre din useCompetitieFilters (gen selectat) — opțional pentru utilizare standalone */
  filtre?: CompetitieFiltre;
  /** Toggle gen din useCompetitieFilters */
  toggleGen?: (gen: string) => void;
  /** Reset filtre din useCompetitieFilters */
  resetFiltreHook?: () => void;
  /** Număr filtre active din useCompetitieFilters */
  nrFiltreActiveHook?: number;
}

// Constantă stabilă pentru fallback standalone — evită new Set() la fiecare render
const FILTRE_FALLBACK: CompetitieFiltre = {
  gen: new Set(),
  probaId: '',
  varstaMin: '',
  varstaMax: '',
  gradMin: '',
  gradMax: '',
};

const CategoriiTemplateManager: React.FC<CategoriiTemplateManagerProps> = ({
  permissions, competitieId, probaId, probe = [], categoriiExistente = [], onImported,
  filtre: filtreProp, toggleGen: toggleGenProp, resetFiltreHook, nrFiltreActiveHook,
}) => {
  const { grade } = useData();
  const { showError } = useError();

  const canEdit = permissions.isSuperAdmin || permissions.isFederationAdmin;
  const isImportContext = !!competitieId;

  const [templates, setTemplates] = useState<CategorieTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [toEdit, setToEdit] = useState<CategorieTemplate | null>(null);

  // --- Filtre ---
  const [filterTipProba, setFilterTipProba] = useState<string>('all');
  // Fallback local gen pentru utilizare standalone (fără props din useCompetitieFilters)
  const [filterGenSetLocal, setFilterGenSetLocal] = useState<Set<string>>(new Set());
  const [filterParticipare, setFilterParticipare] = useState<'all' | 'individual' | 'pereche' | 'echipa'>('all');
  const [filterVarsteValues, setFilterVarsteValues] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filtreVisible, setFiltreVisible] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [bulkWizardOpen, setBulkWizardOpen] = useState(false);

  // Rezolvare props vs fallback local — permite utilizare standalone (AppRouter) sau controlat (CompetitieDetail/index)
  const filtre: CompetitieFiltre = filtreProp ?? { ...FILTRE_FALLBACK, gen: filterGenSetLocal };
  const toggleGen = toggleGenProp ?? ((g: string) => setFilterGenSetLocal(prev => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next;
  }));
  const nrFiltreActiveHookResolved = nrFiltreActiveHook ?? (filterGenSetLocal.size > 0 ? 1 : 0);
  const resetFiltreHookResolved = resetFiltreHook ?? (() => setFilterGenSetLocal(new Set()));

  const toggleVarstaValue = (v: number) => setFilterVarsteValues(prev => {
    const next = new Set(prev);
    if (next.has(v)) next.delete(v); else next.add(v);
    return next;
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categorii_template').select('*').order('ordine_afisare');
    if (error) { showError('Eroare', error.message); setLoading(false); return; }
    setTemplates((data || []) as CategorieTemplate[]);
    setLoading(false);
  }, [showError]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (filterTipProba !== 'all' && t.tip_proba !== filterTipProba) return false;
      if (filtre.gen.size > 0 && !filtre.gen.has(t.gen)) return false;
      if (filterParticipare !== 'all' && t.tip_participare !== filterParticipare) return false;
      if (filterVarsteValues.size > 0) {
        const match = Array.from(filterVarsteValues).some(v => v >= t.varsta_min && (t.varsta_max === null || v <= t.varsta_max));
        if (!match) return false;
      }
      if (search.trim() && !t.denumire.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [templates, filterTipProba, filtre, filterParticipare, filterVarsteValues, search]);

  const probeMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of probe) m[p.tip_proba] = p.id;
    return m;
  }, [probe]);

  // Construiește payload categorie_competitie dintr-un template
  const buildCategoriePayload = (t: CategorieTemplate, numar: number) => ({
    competitie_id: competitieId,
    proba_id: probaId || probeMap[t.tip_proba] || null,
    numar_categorie: numar,
    denumire: t.denumire,
    varsta_min: t.varsta_min,
    varsta_max: t.varsta_max,
    gen: t.gen,
    grad_min_ordine: t.grad_min_ordine,
    grad_max_ordine: t.grad_max_ordine,
    arma: t.arma,
    tip_participare: t.tip_participare,
    sportivi_per_echipa_min: t.sportivi_per_echipa_min,
    sportivi_per_echipa_max: t.sportivi_per_echipa_max,
    rezerve_max: t.rezerve_max,
    max_echipe_per_club: t.max_echipe_per_club,
    min_participanti_start: 3,
    ordine_afisare: t.ordine_afisare,
  });

  const nextNumar = () => Math.max(0, ...categoriiExistente.map(c => c.numar_categorie ?? 0));

  const handleImportOne = async (t: CategorieTemplate) => {
    if (!competitieId) return;
    setImportingIds(prev => new Set(prev).add(t.id));
    try {
      const payload = buildCategoriePayload(t, nextNumar() + 1);
      const { data, error } = await supabase.from('categorii_competitie').insert(payload).select().single();
      if (error) throw error;
      onImported?.([data as CategorieCompetitie]);
    } catch (err: any) {
      showError('Eroare import', err.message);
    } finally {
      setImportingIds(prev => { const n = new Set(prev); n.delete(t.id); return n; });
    }
  };

  const handleImportSelected = async () => {
    if (!competitieId || selected.size === 0) return;
    const toInsert = filtered.filter(t => selected.has(t.id));
    if (toInsert.length === 0) return;
    setImportingIds(new Set(toInsert.map(t => t.id)));
    try {
      const base = nextNumar();
      const payload = toInsert.map((t, i) => buildCategoriePayload(t, base + i + 1));
      const { data, error } = await supabase.from('categorii_competitie').insert(payload).select();
      if (error) throw error;
      onImported?.((data || []) as CategorieCompetitie[]);
      setSelected(new Set());
    } catch (err: any) {
      showError('Eroare import', err.message);
    } finally {
      setImportingIds(new Set());
    }
  };

  const handleDelete = async (t: CategorieTemplate) => {
    if (!window.confirm(`Ștergi template-ul „${t.denumire}"?`)) return;
    const { error } = await supabase.from('categorii_template').delete().eq('id', t.id);
    if (error) { showError('Eroare', error.message); return; }
    setTemplates(prev => prev.filter(x => x.id !== t.id));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  const nrFiltreActive =
    (filterTipProba !== 'all' ? 1 : 0) +
    (nrFiltreActiveHookResolved > 0 ? 1 : 0) +
    (filterParticipare !== 'all' ? 1 : 0) +
    (filterVarsteValues.size > 0 ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const resetFiltre = () => {
    setFilterTipProba('all');
    resetFiltreHookResolved();
    setFilterParticipare('all');
    setFilterVarsteValues(new Set());
    setSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-white">Bibliotecă Categorii (Federație)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {filtered.length} din {templates.length} template-uri
            {!canEdit && <span className="ml-2 text-slate-500">(doar vizualizare)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {isImportContext && selected.size > 0 && (
            <Button variant="info" size="sm" onClick={handleImportSelected} disabled={importingIds.size > 0}>
              {importingIds.size > 0 ? 'Se importă...' : `Importă selectate (${selected.size})`}
            </Button>
          )}
          {canEdit && (
            <>
              <Button variant="warning" size="sm" onClick={() => setBulkWizardOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-1" /> Generator Bulk
              </Button>
              <Button variant="info" size="sm" onClick={() => setWizardOpen(true)}>
                <PlusIcon className="w-4 h-4 mr-1" /> Wizard Adăugare
              </Button>
              <Button variant="success" size="sm" onClick={() => { setToEdit(null); setFormOpen(true); }}>
                <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Template
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs tip probă */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TIP_PROBA_TABS.map(tab => {
          const count = tab.key === 'all'
            ? templates.length
            : templates.filter(t => t.tip_proba === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterTipProba(tab.key)}
              style={{ touchAction: 'manipulation' }}
              className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition-colors ${
                filterTipProba === tab.key
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Toggle filtre */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFiltreVisible(v => !v)}
          style={{ touchAction: 'manipulation' }}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-400 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filtre {nrFiltreActive > 0 && <span className="bg-brand-primary text-white rounded-full px-1.5">{nrFiltreActive}</span>}
        </button>
        {nrFiltreActive > 0 && (
          <button onClick={resetFiltre} className="text-xs text-slate-500 hover:text-white underline">
            Resetează
          </button>
        )}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută denumire..."
          className="flex-1 min-w-[160px] bg-[var(--t-surface)] border border-[var(--t-border)] rounded px-3 py-1.5 text-xs text-[var(--t-text)] placeholder-slate-500"
        />
      </div>

      {/* Panou filtre */}
      {filtreVisible && (
        <div className="bg-[var(--t-bg)] border border-[var(--t-border)] rounded-lg p-3 space-y-3">
          {/* Gen */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Gen <span className="text-slate-600 font-normal normal-case">(nimic selectat = toate)</span></p>
            <div className="flex gap-1.5 flex-wrap">
              {GEN_OPTIONS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGen(g)}
                  style={{ touchAction: 'manipulation' }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filtre.gen.has(g) ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'}`}
                >{g}</button>
              ))}
            </div>
          </div>
          {/* Participare */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Tip Participare</p>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterParticipare('all')}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterParticipare === 'all' ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
              >Toate</button>
              {PARTICIPARE_OPTIONS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setFilterParticipare(p.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterParticipare === p.key ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                >{p.label}</button>
              ))}
            </div>
          </div>
          {/* Vârstă (valori individuale) */}
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Vârstă <span className="text-slate-600 font-normal normal-case">(nimic selectat = toate)</span></p>
            <div className="flex gap-1.5 flex-wrap">
              {VARSTE_OPTIUNI.map(v => (
                <button
                  key={v}
                  onClick={() => toggleVarstaValue(v)}
                  style={{ touchAction: 'manipulation' }}
                  className={`text-xs px-2 py-1 rounded border transition-colors min-w-[32px] text-center ${filterVarsteValues.has(v) ? 'bg-brand-primary text-white border-brand-primary' : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'}`}
                >{v >= 40 ? `${v}+` : String(v)}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabel */}
      {loading ? (
        <div className="text-center text-slate-400 py-12">Se încarcă...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-500 py-12 italic">
          {templates.length === 0 ? 'Niciun template în bibliotecă.' : 'Niciun template pentru filtrele selectate.'}
        </div>
      ) : (
        <div className="-mx-4 sm:mx-0 overflow-x-auto border border-[var(--t-border)] rounded-xl">
          <table className="w-full text-sm text-slate-300 min-w-[640px]">
            <thead>
              <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }} className="border-b border-[var(--t-border)] text-xs uppercase">
                {isImportContext && (
                  <th className="p-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer"
                      aria-label="Selectează toate"
                    />
                  </th>
                )}
                <th className="p-2 text-left">Denumire</th>
                <th className="p-2 text-left hidden md:table-cell">Tip Probă</th>
                <th className="p-2 text-center">Gen</th>
                <th className="p-2 text-center hidden sm:table-cell">Vârstă</th>
                <th className="p-2 text-left hidden lg:table-cell">Grad</th>
                <th className="p-2 text-center hidden md:table-cell">Participare</th>
                <th className="p-2 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--t-border)]">
              {filtered.map(t => {
                const isImporting = importingIds.has(t.id);
                return (
                  <tr key={t.id} className="hover:bg-[var(--t-table-row-hover)]">
                    {isImportContext && (
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="w-4 h-4 rounded cursor-pointer"
                          aria-label={`Selectează ${t.denumire}`}
                        />
                      </td>
                    )}
                    <td className="p-2">
                      <div className="font-medium text-white text-xs">{t.denumire}</div>
                      {t.arma && <div className="text-orange-400 text-[11px]">{t.arma}</div>}
                    </td>
                    <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                      {TIP_PROBA_LABELS[t.tip_proba as keyof typeof TIP_PROBA_LABELS] ?? t.tip_proba}
                    </td>
                    <td className="p-2 text-center text-xs">
                      <span className={`px-1.5 py-0.5 rounded-full ${
                        t.gen === 'Feminin' ? 'bg-pink-900/40 text-pink-300'
                          : t.gen === 'Masculin' ? 'bg-blue-900/40 text-blue-300'
                          : 'bg-purple-900/40 text-purple-300'
                      }`}>{t.gen}</span>
                    </td>
                    <td className="p-2 text-center hidden sm:table-cell text-xs text-slate-400">{fmtVarsta(t.varsta_min, t.varsta_max)}</td>
                    <td className="p-2 hidden lg:table-cell text-[11px] text-slate-400">{fmtGrad(t.grad_min_ordine, t.grad_max_ordine)}</td>
                    <td className="p-2 text-center hidden md:table-cell text-xs text-slate-400">{t.tip_participare}</td>
                    <td className="p-2 text-right">
                      <div className="flex gap-1 justify-end items-center">
                        {isImportContext && (
                          <Button size="sm" variant="info" className="!px-2 !py-1 !text-[11px]" onClick={() => handleImportOne(t)} disabled={isImporting}>
                            {isImporting ? '...' : 'Import'}
                          </Button>
                        )}
                        {canEdit && (
                          <>
                            <Button size="sm" variant="secondary" className="!p-1.5" onClick={() => { setToEdit(t); setFormOpen(true); }}>
                              <EditIcon className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="danger" className="!p-1.5" onClick={() => handleDelete(t)}>
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <TemplateForm
          template={toEdit}
          grade={grade}
          onClose={() => { setFormOpen(false); setToEdit(null); }}
          onSaved={(t) => {
            if (toEdit) setTemplates(prev => prev.map(x => x.id === t.id ? t : x));
            else setTemplates(prev => [...prev, t]);
            setFormOpen(false); setToEdit(null);
          }}
        />
      )}

      {/* Wizard modal */}
      {wizardOpen && (
        <CategoryWizard
          mode="template"
          permissions={permissions}
          grade={grade}
          existingTemplates={templates}
          onTemplateSaved={t => { setTemplates(prev => [...prev, t]); setWizardOpen(false); }}
          onClose={() => setWizardOpen(false)}
        />
      )}

      {/* Generator Bulk modal */}
      {bulkWizardOpen && (
        <BulkCategoryWizard
          existingTemplates={templates}
          onSaved={saved => {
            setTemplates(prev => [...prev, ...saved]);
            setBulkWizardOpen(false);
          }}
          onClose={() => setBulkWizardOpen(false)}
        />
      )}
    </div>
  );
};

export default CategoriiTemplateManager;
