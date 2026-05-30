import React, { useState, useEffect } from 'react';
import { Inlantuire } from '../../types';
import { Modal, Button, Input } from '../ui';

interface Props {
  inlantuire?: Inlantuire;
  onSave: (values: Pick<Inlantuire, 'denumire' | 'ordine' | 'activ'>) => Promise<void>;
  onClose: () => void;
}

export const InlantuireFormModal: React.FC<Props> = ({ inlantuire, onSave, onClose }) => {
  const [denumire, setDenumire] = useState('');
  const [ordine, setOrdine] = useState(0);
  const [activ, setActiv] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (inlantuire) {
      setDenumire(inlantuire.denumire);
      setOrdine(inlantuire.ordine);
      setActiv(inlantuire.activ);
    } else {
      setDenumire('');
      setOrdine(0);
      setActiv(true);
    }
    setErr('');
  }, [inlantuire]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!denumire.trim()) { setErr('Denumirea este obligatorie.'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({ denumire: denumire.trim(), ordine, activ });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={inlantuire ? 'Editare Ã®nlÄƒnÈ›uire' : 'AdaugÄƒ Ã®nlÄƒnÈ›uire'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Denumire"
          value={denumire}
          onChange={e => setDenumire(e.target.value)}
          autoFocus
          required
        />
        <Input
          label="Ordine afiÈ™are"
          type="number"
          value={String(ordine)}
          onChange={e => setOrdine(Number(e.target.value))}
        />
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activ}
            onChange={e => setActiv(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          <span className="text-sm text-slate-300">Activ (vizibil Ã®n wizard)</span>
        </label>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            AnuleazÄƒ
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvare...' : 'SalveazÄƒ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

