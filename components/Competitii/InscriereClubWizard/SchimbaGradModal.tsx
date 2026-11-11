import React, { useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import type { Grad, Sportiv } from '../../../types';
import { Button, Input, Modal, Select } from '../../ui';
import { formatNume } from '../../../utils/formatareSportiv';

interface Props {
  sportiv: Sportiv | null;
  grade: Grad[];
  onClose: () => void;
  onSaved: (sportivId: string, gradId: string) => void;
}

// Promovare grad din wizardul de înscriere: scrie în istoric_grade (grad_actual_id e derivat de trigger în DB,
// deci doar grade mai mari decât cel actual au efect), apoi parintele actualizeaza starea locala fara reload.
const SchimbaGradModal: React.FC<Props> = ({ sportiv, grade, onClose, onSaved }) => {
  const azi = new Date().toISOString().slice(0, 10);
  const [gradId, setGradId] = useState('');
  const [data, setData] = useState(azi);
  const [saving, setSaving] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const ordineCurent = grade.find(g => g.id === sportiv?.grad_actual_id)?.ordine ?? -1;
  const optiuni = useMemo(
    () => grade.filter(g => g.ordine > ordineCurent).sort((a, b) => a.ordine - b.ordine),
    [grade, ordineCurent],
  );

  if (!sportiv) return null;

  const salveaza = async () => {
    if (!gradId || !data) return;
    setSaving(true);
    setEroare(null);
    // fara upsert: un rand istoric existent pentru acest grad si-ar pierde data/observatiile
    const { data: existent, error: errCitire } = await supabase.from('istoric_grade')
      .select('data_obtinere').eq('sportiv_id', sportiv.id).eq('grad_id', gradId).limit(1);
    if (errCitire) { setSaving(false); setEroare(errCitire.message); return; }
    if (existent && existent.length > 0) {
      setSaving(false);
      setEroare(`Gradul există deja în istoric (${existent[0].data_obtinere}). Corectează-l din profil, tab „Evoluție & Grade".`);
      return;
    }
    const { error } = await supabase.from('istoric_grade').insert({
      sportiv_id: sportiv.id,
      grad_id: gradId,
      data_obtinere: data,
      observatii: 'Schimbare din înscriere competiție',
    });
    if (error) { setSaving(false); setEroare(error.message); return; }
    // grad_actual_id e derivat de trigger (max ordine din istoric): folosim valoarea reala din DB, nu pe cea aleasa
    const { data: real, error: errReal } = await supabase.from('sportivi').select('grad_actual_id').eq('id', sportiv.id).single();
    setSaving(false);
    if (errReal || !real) { setEroare('Gradul a fost salvat, dar nu s-a putut confirma. Reîncarcă pagina.'); return; }
    onSaved(sportiv.id, real.grad_actual_id);
    setGradId('');
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Schimbă grad — ${formatNume(sportiv)}`}>
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Grad actual: <span className="text-white">{grade.find(g => g.id === sportiv.grad_actual_id)?.nume ?? 'fără grad'}</span>.
          Se poate doar promova; o corecție în jos se face din profil, tab „Evoluție & Grade".
        </p>
        <Select label="Grad nou" value={gradId} onChange={e => setGradId(e.target.value)} disabled={saving}>
          <option value="">Alege gradul</option>
          {optiuni.map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
        </Select>
        <Input label="Data obținerii" type="date" value={data} max={azi} onChange={e => setData(e.target.value)} disabled={saving} />
        {eroare && <p className="text-xs text-red-400" role="alert">{eroare}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Anulează</Button>
          <Button variant="success" onClick={salveaza} disabled={saving || !gradId || !data}>{saving ? 'Se salvează…' : 'Salvează'}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default SchimbaGradModal;
