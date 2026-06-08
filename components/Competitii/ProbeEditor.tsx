import React, { useState } from 'react';
import { ProbaCompetitie, CategorieCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Input } from '../ui';
import { EditIcon, TrashIcon, PlusIcon } from '../icons';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';
import { ProbaForm } from './ProbaForm';

export const ProbeEditor: React.FC<{
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
