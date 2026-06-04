import React, { useState, useMemo } from 'react';
import { Permissions, Grad, ProbaCompetitie, CategorieCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select, SearchableSelect } from '../ui';
import { useError } from '../ErrorProvider';
import { TIP_PROBA_LABELS, ordineToLabel } from '../../utils/competitiiTemplates';
import type { CategorieTemplate } from './CategoriiTemplateManager';

// -----------------------------------------------
// Tipuri
// -----------------------------------------------
interface CategoryWizardProps {
  mode: 'template' | 'competitie';
  permissions: Permissions;
  grade: Grad[];
  onClose: () => void;
  // Template mode
  existingTemplates?: CategorieTemplate[];
  editTemplate?: CategorieTemplate | null;
  onTemplateSaved?: (t: CategorieTemplate) => void;
  // Competition mode
  competitieId?: string;
  probaId?: string;
  probe?: ProbaCompetitie[];
  categoriiExistente?: CategorieCompetitie[];
  onCategorieSaved?: (c: CategorieCompetitie) => void;
}

type ConflictType = 'exact' | 'contains' | 'overlap';

interface ConflictInfo {
  type: ConflictType;
  existingName: string;
  existingId: string;
  existingMin: number;
  existingMax: number | null;
  proposedShrinkMin?: number;
  proposedShrinkMax?: number | null;
}

interface FormValues {
  id?: string;
  denumire: string;
  tip_proba: string;
  varsta_min: string;
  varsta_max: string;
  gen: 'Feminin' | 'Masculin' | 'Mixt';
  grad_min_ordine: string;
  grad_max_ordine: string;
  arma: string;
  tip_participare: 'individual' | 'pereche' | 'echipa';
  sportivi_per_echipa_min: string;
  sportivi_per_echipa_max: string;
  rezerve_max: string;
  max_echipe_per_club: string;
  ordine_afisare: string;
}

// -----------------------------------------------
// Constante
// -----------------------------------------------
const VARSTE_OPTIUNI = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,50,55,60];
const VARSTE_OPTIONS = VARSTE_OPTIUNI.map(v => ({ value: String(v), label: String(v) }));

// -----------------------------------------------
// Detecție conflicte
// -----------------------------------------------
function detectConflicts(
  form: FormValues,
  existing: Array<{ id: string; gen: string; tip_proba: string; varsta_min: number; varsta_max: number | null; denumire: string }>
): ConflictInfo[] {
  const newMin = parseInt(form.varsta_min) || 0;
  const newMax = form.varsta_max ? parseInt(form.varsta_max) : null;
  const newMaxNum = newMax ?? 200;

  return existing
    .filter(e => e.gen === form.gen && e.tip_proba === form.tip_proba && e.id !== form.id)
    .filter(e => {
      const eMax = e.varsta_max ?? 200;
      return newMin <= eMax && newMaxNum >= e.varsta_min;
    })
    .map(e => {
      const eMax = e.varsta_max ?? 200;
      const isExact = e.varsta_min === newMin && e.varsta_max === newMax;
      const isContained = e.varsta_min <= newMin && eMax >= newMaxNum;
      return {
        type: (isExact ? 'exact' : isContained ? 'contains' : 'overlap') as ConflictType,
        existingName: e.denumire,
        existingId: e.id,
        existingMin: e.varsta_min,
        existingMax: e.varsta_max,
        proposedShrinkMin: isContained ? newMaxNum + 1 : undefined,
        proposedShrinkMax: isContained ? e.varsta_max : undefined,
      };
    });
}

// -----------------------------------------------
// WIZARD COMPONENT
// -----------------------------------------------
const CategoryWizard: React.FC<CategoryWizardProps> = ({
  mode,
  permissions: _permissions,
  grade,
  onClose,
  existingTemplates = [],
  editTemplate = null,
  onTemplateSaved,
  competitieId,
  probaId,
  probe = [],
  categoriiExistente = [],
  onCategorieSaved,
}) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormValues | null>(null);

  const initialForm: FormValues = {
    id: editTemplate?.id,
    denumire: editTemplate?.denumire || '',
    tip_proba: editTemplate?.tip_proba || (probe[0]?.tip_proba) || 'thao_quyen_individual',
    varsta_min: String(editTemplate?.varsta_min ?? '7'),
    varsta_max: editTemplate?.varsta_max != null ? String(editTemplate.varsta_max) : '',
    gen: editTemplate?.gen ?? 'Feminin',
    grad_min_ordine: editTemplate?.grad_min_ordine != null ? String(editTemplate.grad_min_ordine) : '',
    grad_max_ordine: editTemplate?.grad_max_ordine != null ? String(editTemplate.grad_max_ordine) : '',
    arma: editTemplate?.arma || '',
    tip_participare: editTemplate?.tip_participare ?? 'individual',
    sportivi_per_echipa_min: String(editTemplate?.sportivi_per_echipa_min ?? '1'),
    sportivi_per_echipa_max: String(editTemplate?.sportivi_per_echipa_max ?? '1'),
    rezerve_max: String(editTemplate?.rezerve_max ?? '0'),
    max_echipe_per_club: String(editTemplate?.max_echipe_per_club ?? '1'),
    ordine_afisare: String(editTemplate?.ordine_afisare ?? '0'),
  };

  const [form, setForm] = useState<FormValues>(initialForm);

  const f = (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const gradeOptions = useMemo(
    () => [...grade].sort((a, b) => a.ordine - b.ordine).map(g => ({ value: String(g.ordine), label: g.nume })),
    [grade]
  );

  const probeOptions = useMemo(
    () => probe.map(p => ({ value: p.id, label: p.denumire || TIP_PROBA_LABELS[p.tip_proba as keyof typeof TIP_PROBA_LABELS] || p.tip_proba })),
    [probe]
  );

  // Construiește sursa pentru verificarea conflictelor în funcție de mode
  const conflictSource = useMemo(() => {
    if (mode === 'template') {
      return existingTemplates.map(t => ({
        id: t.id,
        gen: t.gen,
        tip_proba: t.tip_proba,
        varsta_min: t.varsta_min,
        varsta_max: t.varsta_max,
        denumire: t.denumire,
      }));
    }
    return categoriiExistente.map(c => ({
      id: c.id,
      gen: c.gen,
      tip_proba: c.proba?.tip_proba || '',
      varsta_min: c.varsta_min,
      varsta_max: c.varsta_max,
      denumire: c.denumire || '',
    }));
  }, [mode, existingTemplates, categoriiExistente]);

  // -----------------------------------------------
  // Salvare template
  // -----------------------------------------------
  const buildTemplatePayload = (f: FormValues) => ({
    denumire: f.denumire.trim(),
    tip_proba: f.tip_proba,
    varsta_min: parseInt(f.varsta_min) || 0,
    varsta_max: f.varsta_max ? parseInt(f.varsta_max) : null,
    gen: f.gen,
    grad_min_ordine: f.grad_min_ordine ? parseInt(f.grad_min_ordine) : null,
    grad_max_ordine: f.grad_max_ordine ? parseInt(f.grad_max_ordine) : null,
    arma: f.arma.trim() || null,
    tip_participare: f.tip_participare,
    sportivi_per_echipa_min: parseInt(f.sportivi_per_echipa_min) || 1,
    sportivi_per_echipa_max: parseInt(f.sportivi_per_echipa_max) || 1,
    rezerve_max: parseInt(f.rezerve_max) || 0,
    max_echipe_per_club: parseInt(f.max_echipe_per_club) || 1,
    ordine_afisare: parseInt(f.ordine_afisare) || 0,
  });

  const buildCategoriePayload = (f: FormValues) => {
    const probeMap: Record<string, string> = {};
    for (const p of probe) probeMap[p.tip_proba] = p.id;
    return {
      competitie_id: competitieId,
      proba_id: probaId || probeMap[f.tip_proba] || null,
      numar_categorie: Math.max(0, ...categoriiExistente.map(c => c.numar_categorie ?? 0)) + 1,
      denumire: f.denumire.trim(),
      varsta_min: parseInt(f.varsta_min) || 0,
      varsta_max: f.varsta_max ? parseInt(f.varsta_max) : null,
      gen: f.gen,
      grad_min_ordine: f.grad_min_ordine ? parseInt(f.grad_min_ordine) : null,
      grad_max_ordine: f.grad_max_ordine ? parseInt(f.grad_max_ordine) : null,
      arma: f.arma.trim() || null,
      tip_participare: f.tip_participare,
      sportivi_per_echipa_min: parseInt(f.sportivi_per_echipa_min) || 1,
      sportivi_per_echipa_max: parseInt(f.sportivi_per_echipa_max) || 1,
      rezerve_max: parseInt(f.rezerve_max) || 0,
      max_echipe_per_club: parseInt(f.max_echipe_per_club) || 1,
      min_participanti_start: 3,
      ordine_afisare: parseInt(f.ordine_afisare) || 0,
    };
  };

  const saveTemplate = async (fv: FormValues, shrinkConflict?: ConflictInfo) => {
    setLoading(true);
    try {
      // Restrânge existentul dacă s-a ales "Modifică existenta"
      if (shrinkConflict && shrinkConflict.proposedShrinkMin !== undefined) {
        const { error: shrinkErr } = await supabase
          .from('categorii_template')
          .update({ varsta_min: shrinkConflict.proposedShrinkMin, varsta_max: shrinkConflict.proposedShrinkMax ?? null })
          .eq('id', shrinkConflict.existingId);
        if (shrinkErr) throw shrinkErr;
      }
      const payload = buildTemplatePayload(fv);
      let saved: CategorieTemplate;
      if (fv.id) {
        const { data, error } = await supabase.from('categorii_template').update(payload).eq('id', fv.id).select().single();
        if (error) throw error;
        saved = data as CategorieTemplate;
      } else {
        const { data, error } = await supabase.from('categorii_template').insert(payload).select().single();
        if (error) throw error;
        saved = data as CategorieTemplate;
      }
      onTemplateSaved?.(saved);
    } catch (err: any) {
      showError('Eroare', err.message || 'Eroare la salvarea template-ului');
    } finally {
      setLoading(false);
    }
  };

  const saveCategorie = async (fv: FormValues) => {
    if (!competitieId) return;
    setLoading(true);
    try {
      const payload = buildCategoriePayload(fv);
      const { data, error } = await supabase.from('categorii_competitie').insert(payload).select().single();
      if (error) throw error;
      onCategorieSaved?.(data as CategorieCompetitie);
    } catch (err: any) {
      showError('Eroare', err.message || 'Eroare la salvarea categoriei');
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------
  // Submit handler
  // -----------------------------------------------
  const handleSubmit = () => {
    if (!form.denumire.trim()) { showError('Validare', 'Denumirea este obligatorie.'); return; }
    const detected = detectConflicts(form, conflictSource);
    if (detected.length > 0) {
      setConflicts(detected);
      setPendingForm(form);
      setShowConflictDialog(true);
    } else {
      if (mode === 'template') saveTemplate(form);
      else saveCategorie(form);
    }
  };

  // -----------------------------------------------
  // Acțiuni conflict dialog
  // -----------------------------------------------
  const handleModificaExistenta = () => {
    if (!pendingForm) return;
    // Aplică restrângere pentru primul conflict de tip "contains"
    const containsConflict = conflicts.find(c => c.type === 'contains');
    setShowConflictDialog(false);
    if (mode === 'template') saveTemplate(pendingForm, containsConflict);
    else saveCategorie(pendingForm);
  };

  const handleCreeazaOricum = () => {
    if (!pendingForm) return;
    setShowConflictDialog(false);
    if (mode === 'template') saveTemplate(pendingForm);
    else saveCategorie(pendingForm);
  };

  const handleAnuleazaConflict = () => {
    setShowConflictDialog(false);
    setPendingForm(null);
    setConflicts([]);
  };

  const conflictTypeLabel: Record<ConflictType, string> = {
    exact: 'Categorie identică',
    contains: 'Intervalul existent conține complet noul interval',
    overlap: 'Suprapunere parțială de interval',
  };

  const canModificaExistenta = conflicts.some(c => c.type === 'contains');

  // -----------------------------------------------
  // Render
  // -----------------------------------------------
  return (
    <Modal isOpen={true} onClose={onClose} title={editTemplate ? 'Wizard Editare Categorie' : 'Wizard Adăugare Categorie'}>
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {!showConflictDialog ? (
          /* ---- Formular ---- */
          <div className="space-y-3">
            <Input label="Denumire *" value={form.denumire} onChange={f('denumire')} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mode === 'competitie' && probe.length > 0 ? (
                <Select label="Probă" value={form.tip_proba} onChange={f('tip_proba')}>
                  {probeOptions.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </Select>
              ) : (
                <Select label="Tip Probă" value={form.tip_proba} onChange={f('tip_proba')}>
                  {Object.entries(TIP_PROBA_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              )}
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
            {/* Previzualizare interval */}
            {form.varsta_min && (
              <div className="bg-slate-800 rounded-lg p-2 text-xs text-slate-400">
                <span className="font-medium text-white">Previzualizare: </span>
                <span className="text-brand-primary">{form.gen}</span>
                {' · '}
                <span>
                  {form.varsta_max
                    ? `${form.varsta_min}–${form.varsta_max} ani`
                    : `${form.varsta_min}+ ani`}
                </span>
                {form.grad_min_ordine && (
                  <>
                    {' · '}
                    <span>
                      {form.grad_max_ordine
                        ? `${ordineToLabel(parseInt(form.grad_min_ordine))} – ${ordineToLabel(parseInt(form.grad_max_ordine))}`
                        : `min ${ordineToLabel(parseInt(form.grad_min_ordine))}`}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
              <Button variant="success" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Se salvează...' : (editTemplate ? 'Actualizează' : 'Salvează')}
              </Button>
            </div>
          </div>
        ) : (
          /* ---- Dialog conflicte ---- */
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-white">Conflict detectat</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Categoria nouă se suprapune cu {conflicts.length === 1 ? 'o categorie existentă' : `${conflicts.length} categorii existente`}.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white truncate">{c.existingName}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      c.type === 'exact' ? 'bg-red-900/50 text-red-300'
                      : c.type === 'contains' ? 'bg-orange-900/50 text-orange-300'
                      : 'bg-yellow-900/50 text-yellow-300'
                    }`}>{conflictTypeLabel[c.type]}</span>
                  </div>
                  <p className="text-slate-400">
                    Interval existent: <span className="text-white">
                      {c.existingMax === null ? `${c.existingMin}+` : `${c.existingMin}–${c.existingMax}`} ani
                    </span>
                    {c.type === 'contains' && c.proposedShrinkMin !== undefined && (
                      <span className="ml-2 text-green-400">
                        → ar fi restrâns la: {c.proposedShrinkMax === null ? `${c.proposedShrinkMin}+` : `${c.proposedShrinkMin}–${c.proposedShrinkMax}`} ani
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    Interval nou: <span className="text-brand-primary">
                      {pendingForm?.varsta_max ? `${pendingForm.varsta_min}–${pendingForm.varsta_max}` : `${pendingForm?.varsta_min}+`} ani
                    </span>
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400">Ce dorești?</p>

            <div className="flex flex-col sm:flex-row gap-2">
              {canModificaExistenta && (
                <Button
                  variant="info"
                  size="sm"
                  onClick={handleModificaExistenta}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Se salvează...' : 'Modifică existenta + Creează'}
                </Button>
              )}
              <Button
                variant="warning"
                size="sm"
                onClick={handleCreeazaOricum}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Se salvează...' : 'Creează oricum'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAnuleazaConflict}
                disabled={loading}
                className="flex-1"
              >
                Anulează
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CategoryWizard;
