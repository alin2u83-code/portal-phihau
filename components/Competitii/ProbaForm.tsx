import React, { useState } from 'react';
import { ProbaCompetitie, TipProba } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Input, Select } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';

export interface ProbaFormProps {
  competitieId: string;
  onClose: () => void;
  onSaved: (p: ProbaCompetitie) => void;
}

export const ProbaForm: React.FC<ProbaFormProps> = ({ competitieId, onClose, onSaved }) => {
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
