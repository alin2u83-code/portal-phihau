import React, { useState } from 'react';
import { Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, ConfirmModal } from '../ui';
import { PlusIcon, EditIcon, TrashIcon } from '../icons';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { areVizaFRAM } from './constants';
import { ProbeEditor } from './ProbeEditor';
import { FuzionariPanel } from './FuzionariPanel';
import { SolicitariEchipePanel } from './SolicitariEchipePanel';
import { GenerareSabloaneModal } from './GenerareSabloaneModal';
import { CategorieForm } from './CategorieForm';

export interface AdminPanelProps {
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

export const AdminPanel: React.FC<AdminPanelProps> = ({
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
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
  const openConfirm = (message: string, onConfirm: () => void, opts?: { title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info' }) => setConfirmDialog({ open: true, message, onConfirm, ...opts });

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

  const handleDeleteCategorie = (id: string) => {
    openConfirm('Ștergi această categorie? Toate înscrierile aferente vor fi șterse.', async () => {
      const { error } = await supabase.from('categorii_competitie').delete().eq('id', id);
      if (error) { showError('Eroare', error.message); return; }
      setCategorii(prev => prev.filter(c => c.id !== id));
    }, { title: 'Șterge categorie', confirmLabel: 'Șterge', variant: 'danger' });
  };

  const handleDeleteProba = (id: string) => {
    openConfirm('Ștergi această probă? Categoriile asociate vor rămâne fără probă.', async () => {
      const { error } = await supabase.from('probe_competitie').delete().eq('id', id);
      if (error) { showError('Eroare', error.message); return; }
      setProbe(prev => prev.filter(p => p.id !== id));
    }, { title: 'Șterge probă', confirmLabel: 'Șterge', variant: 'danger' });
  };

  // Group categorii by proba for stats
  const catByProba = probe.map(p => ({
    proba: p,
    cats: categorii.filter(c => c.proba_id === p.id),
  }));

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
  );
};
