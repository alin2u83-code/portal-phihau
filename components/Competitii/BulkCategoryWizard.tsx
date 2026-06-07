import React, { useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select, SearchableSelect } from '../ui';
import { PlusIcon, EditIcon } from '../icons';
import { useError } from '../ErrorProvider';
import {
  TIP_PROBA_LABELS,
  ordineToLabel,
  generateBulkCategories,
  BulkGeneratorParams,
  BulkCategorieRow,
  GradeRange,
} from '../../utils/competitiiTemplates';
import type { CategorieTemplate } from './CategoriiTemplateManager';
import type { TipProba } from '../../types';
import toast from 'react-hot-toast';

const VARSTE_OPTIUNI = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,50,55,60];

const GRADE_OPTIONS = [
  { value: '1', label: 'Debutant' },
  { value: '2', label: '1 Câp Galben' }, { value: '3', label: '2 Câp Galben' },
  { value: '4', label: '3 Câp Galben' }, { value: '5', label: '4 Câp Galben' },
  { value: '6', label: '1 Câp Roșu' }, { value: '7', label: '2 Câp Roșu' },
  { value: '8', label: '3 Câp Roșu' }, { value: '9', label: '4 Câp Roșu' },
  { value: '10', label: 'Centura Violet' },
  { value: '11', label: 'C.V. 1 Câp Alb' }, { value: '12', label: 'C.V. 2 Câp Alb' },
  { value: '13', label: 'C.V. 3 Câp Alb' }, { value: '14', label: 'C.V. 4 Câp Alb' },
  { value: '15', label: '1 Câp Albastru' }, { value: '16', label: '2 Câp Albastru' },
  { value: '17', label: '3 Câp Albastru' }, { value: '18', label: '4 Câp Albastru' },
  { value: '19', label: 'Centura Neagră' },
  { value: '20', label: 'C.N. 1 Dang' }, { value: '21', label: 'C.N. 2 Dang' },
  { value: '22', label: 'C.N. 3 Dang' }, { value: '23', label: 'C.N. 4 Dang' },
];

interface BulkCategoryWizardProps {
  existingTemplates: CategorieTemplate[];
  onSaved: (saved: CategorieTemplate[]) => void;
  onClose: () => void;
}

const BulkCategoryWizard: React.FC<BulkCategoryWizardProps> = ({
  existingTemplates, onSaved, onClose,
}) => {
  const { showError } = useError();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [selectedVarste, setSelectedVarste] = useState<Set<number>>(new Set());
  const [selectedGenuri, setSelectedGenuri] = useState<Set<'Feminin' | 'Masculin' | 'Mixt'>>(new Set());
  const [tipProba, setTipProba] = useState<TipProba>('thao_quyen_individual');
  const [arma, setArma] = useState('');
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>([]);
  const [addingRange, setAddingRange] = useState(false);
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');

  // Step 2 state
  const [rows, setRows] = useState<BulkCategorieRow[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDenumire, setEditDenumire] = useState('');

  const gradeRangeLabel = (gr: GradeRange) => {
    if (gr.min === null && gr.max === null) return 'Orice grad';
    const minL = gr.min !== null ? ordineToLabel(gr.min) : '?';
    const maxL = gr.max !== null ? ordineToLabel(gr.max) : '+';
    return gr.min === gr.max ? minL : `${minL} – ${maxL}`;
  };

  const toggleVarsta = (v: number) => setSelectedVarste(prev => {
    const next = new Set(prev);
    if (next.has(v)) next.delete(v); else next.add(v);
    return next;
  });

  const toggleGen = (g: 'Feminin' | 'Masculin' | 'Mixt') => setSelectedGenuri(prev => {
    const next = new Set(prev);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next;
  });

  const addGradeRange = () => {
    const min = rangeMin ? parseInt(rangeMin) : null;
    const max = rangeMax ? parseInt(rangeMax) : null;
    setGradeRanges(prev => [...prev, { min, max }]);
    setRangeMin('');
    setRangeMax('');
    setAddingRange(false);
  };

  const removeGradeRange = (idx: number) =>
    setGradeRanges(prev => prev.filter((_, i) => i !== idx));

  const handleGeneratePreview = () => {
    if (selectedVarste.size === 0 || selectedGenuri.size === 0) return;
    const params: BulkGeneratorParams = {
      varste: Array.from(selectedVarste).sort((a, b) => a - b),
      genuri: Array.from(selectedGenuri),
      gradeRanges: gradeRanges.length > 0 ? gradeRanges : [{ min: null, max: null }],
      tip_proba: tipProba,
      arma,
    };
    const generated = generateBulkCategories(params, existingTemplates);
    setRows(generated);
    setStep(2);
  };

  const toggleRowSelect = (key: string) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));

  const toggleSelectAll = () => {
    const allSelected = rows.every(r => r.selected);
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  const startEditDenumire = (row: BulkCategorieRow) => {
    setEditingKey(row.key);
    setEditDenumire(row.denumire);
  };

  const commitEditDenumire = () => {
    if (!editingKey) return;
    setRows(prev => prev.map(r => r.key === editingKey ? { ...r, denumire: editDenumire } : r));
    setEditingKey(null);
  };

  const selectedRows = useMemo(() => rows.filter(r => r.selected), [rows]);
  const conflictCount = useMemo(() => rows.filter(r => r.hasConflict).length, [rows]);

  const handleSave = async () => {
    if (selectedRows.length === 0) return;
    setLoading(true);
    try {
      const payload = selectedRows.map((r, i) => ({
        denumire: r.denumire,
        tip_proba: r.tip_proba,
        varsta_min: r.varsta_min,
        varsta_max: r.varsta_max,
        gen: r.gen,
        grad_min_ordine: r.grad_min_ordine,
        grad_max_ordine: r.grad_max_ordine,
        arma: r.arma,
        tip_participare: r.tip_participare,
        sportivi_per_echipa_min: r.sportivi_per_echipa_min,
        sportivi_per_echipa_max: r.sportivi_per_echipa_max,
        rezerve_max: r.rezerve_max,
        max_echipe_per_club: r.max_echipe_per_club,
        ordine_afisare: i,
      }));
      const { data, error } = await supabase
        .from('categorii_template')
        .insert(payload)
        .select();
      if (error) throw error;
      toast.success(`${data.length} categorii salvate`);
      onSaved(data as CategorieTemplate[]);
    } catch (err: any) {
      showError('Eroare salvare', err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = step === 1
    ? 'Generator Bulk — Parametri'
    : step === 2
    ? 'Generator Bulk — Preview'
    : 'Generator Bulk — Confirmare';

  return (
    <Modal isOpen={true} onClose={onClose} title={stepTitle}>
      <div className="max-h-[78vh] overflow-y-auto pr-1">

        {/* ── PAS 1 ── */}
        {step === 1 && (
          <div className="space-y-5">

            {/* Vârste */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Vârste <span className="text-slate-600 normal-case font-normal">(selectează una sau mai multe)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARSTE_OPTIUNI.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleVarsta(v)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedVarste.has(v)
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
                    }`}
                  >{v}</button>
                ))}
              </div>
              {selectedVarste.size > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Selectate: {Array.from(selectedVarste).sort((a, b) => a - b).join(', ')} ani
                </p>
              )}
            </div>

            {/* Gen */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Gen</p>
              <div className="flex gap-2">
                {(['Feminin', 'Masculin', 'Mixt'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGen(g)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      selectedGenuri.has(g)
                        ? 'bg-brand-primary text-white border-brand-primary'
                        : 'border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
                    }`}
                  >{g}</button>
                ))}
              </div>
            </div>

            {/* Tip Probă + Armă */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Tip Probă"
                value={tipProba}
                onChange={e => setTipProba(e.target.value as TipProba)}
              >
                {Object.entries(TIP_PROBA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
              <Input
                label="Armă (opțional, ex: Bong)"
                value={arma}
                onChange={e => setArma(e.target.value)}
                placeholder="—"
              />
            </div>

            {/* Intervale grade */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Intervale Grade
                <span className="text-slate-600 normal-case font-normal ml-1">(gol = Orice grad)</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {gradeRanges.map((gr, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-indigo-900/40 border border-indigo-700/60 text-indigo-300"
                  >
                    {gradeRangeLabel(gr)}
                    <button
                      type="button"
                      onClick={() => removeGradeRange(i)}
                      className="text-indigo-400 hover:text-white ml-0.5"
                    >×</button>
                  </span>
                ))}
                {gradeRanges.length === 0 && !addingRange && (
                  <span className="text-xs text-slate-500 italic">Niciun interval adăugat — se va folosi „Orice grad"</span>
                )}
              </div>

              {addingRange ? (
                <div className="flex items-end gap-2 bg-[var(--t-surface-2)] rounded-xl p-3">
                  <div className="flex-1">
                    <SearchableSelect
                      label="De la grad"
                      options={GRADE_OPTIONS}
                      value={rangeMin}
                      onChange={setRangeMin}
                      placeholder="Orice"
                      emptyLabel="Orice"
                    />
                  </div>
                  <div className="flex-1">
                    <SearchableSelect
                      label="Până la grad"
                      options={GRADE_OPTIONS}
                      value={rangeMax}
                      onChange={setRangeMax}
                      placeholder="Orice"
                      emptyLabel="Orice"
                    />
                  </div>
                  <Button variant="success" size="sm" onClick={addGradeRange}>Adaugă</Button>
                  <Button variant="secondary" size="sm" onClick={() => setAddingRange(false)}>Anulează</Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddingRange(true)}
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1" />
                  Adaugă interval grad
                </Button>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={onClose}>Anulează</Button>
              <Button
                variant="info"
                onClick={handleGeneratePreview}
                disabled={selectedVarste.size === 0 || selectedGenuri.size === 0}
              >
                Generează Preview →
              </Button>
            </div>
          </div>
        )}

        {/* ── PAS 2 ── */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Stats */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400">
                <span className="text-white font-semibold">{rows.length}</span> categorii generate
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-400">
                <span className="text-emerald-400 font-semibold">{selectedRows.length}</span> selectate
              </span>
              {conflictCount > 0 && (
                <>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-amber-400">
                    ⚠ {conflictCount} conflicte cu template-uri existente
                  </span>
                </>
              )}
            </div>

            {/* Table */}
            <div className="-mx-1 overflow-x-auto border border-[var(--t-border)] rounded-xl">
              <table className="w-full text-xs text-slate-300 min-w-[480px]">
                <thead>
                  <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }} className="border-b border-[var(--t-border)] text-[11px] uppercase">
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every(r => r.selected)}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-2 text-left">Denumire</th>
                    <th className="p-2 text-center">Gen</th>
                    <th className="p-2 text-center">Vârstă</th>
                    <th className="p-2 text-left hidden sm:table-cell">Grad</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--t-border)]">
                  {rows.map(row => (
                    <tr
                      key={row.key}
                      className={`transition-colors ${
                        row.hasConflict ? 'bg-amber-900/10' : 'hover:bg-[var(--t-table-row-hover)]'
                      }`}
                    >
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRowSelect(row.key)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-2">
                        {editingKey === row.key ? (
                          <input
                            value={editDenumire}
                            onChange={e => setEditDenumire(e.target.value)}
                            onBlur={commitEditDenumire}
                            onKeyDown={e => e.key === 'Enter' && commitEditDenumire()}
                            autoFocus
                            className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-white text-xs"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className="text-white">{row.denumire}</span>
                            <button
                              type="button"
                              onClick={() => startEditDenumire(row)}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                            >
                              <EditIcon className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {row.arma && <div className="text-orange-400 text-[10px]">{row.arma}</div>}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          row.gen === 'Feminin' ? 'bg-pink-900/40 text-pink-300'
                            : row.gen === 'Masculin' ? 'bg-blue-900/40 text-blue-300'
                            : 'bg-purple-900/40 text-purple-300'
                        }`}>{row.gen[0]}</span>
                      </td>
                      <td className="p-2 text-center text-slate-400">{row.varsta_min} ani</td>
                      <td className="p-2 hidden sm:table-cell text-slate-400">
                        {row.grad_min_ordine !== null
                          ? (row.grad_min_ordine === row.grad_max_ordine
                            ? ordineToLabel(row.grad_min_ordine)
                            : `${ordineToLabel(row.grad_min_ordine)} – ${row.grad_max_ordine !== null ? ordineToLabel(row.grad_max_ordine) : '+'}`)
                          : 'Orice'}
                      </td>
                      <td className="p-2 text-center">
                        {row.hasConflict ? (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-900/50 text-amber-300 cursor-help"
                            title={`Conflict cu: ${row.conflictDenumire}`}
                          >⚠ Conflict</span>
                        ) : (
                          <span className="text-emerald-500 text-[10px]">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-1">
              <Button variant="secondary" onClick={() => setStep(1)}>← Înapoi</Button>
              <Button
                variant="info"
                onClick={() => setStep(3)}
                disabled={selectedRows.length === 0}
              >
                Continuă → ({selectedRows.length})
              </Button>
            </div>
          </div>
        )}

        {/* ── PAS 3 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-[var(--t-surface-2)] rounded-xl p-4 space-y-2">
              <p className="text-sm text-white font-semibold">
                Vei salva <span className="text-emerald-400">{selectedRows.length}</span> categorii în Biblioteca Federației.
              </p>
              {conflictCount > 0 && (
                <p className="text-xs text-amber-300">
                  ⚠ {selectedRows.filter(r => r.hasConflict).length} au conflict cu template-uri existente și vor fi salvate oricum.
                </p>
              )}
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {selectedRows.slice(0, 10).map(r => (
                <div key={r.key} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.hasConflict ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                  <span>{r.denumire}</span>
                </div>
              ))}
              {selectedRows.length > 10 && (
                <p className="text-xs text-slate-500 italic pl-3.5">
                  ... și {selectedRows.length - 10} altele
                </p>
              )}
            </div>

            <div className="flex justify-between pt-1">
              <Button variant="secondary" onClick={() => setStep(2)} disabled={loading}>← Înapoi</Button>
              <Button
                variant="success"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Se salvează...' : `Confirmă și Salvează (${selectedRows.length})`}
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default BulkCategoryWizard;
