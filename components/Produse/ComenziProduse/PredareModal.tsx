import React, { useState } from 'react';
import { Modal, Button } from '../../ui';
import { marcheazaPredare } from '../../../services/comenziService';
import type { CerereProdusFull } from '../../../types';

interface PredareModalProps {
  cerere: CerereProdusFull;
  clubId: string;
  tipPlataEchipamenteId: string;
  onDone: () => void;
  onClose: () => void;
}

function getDenumireVarianta(cerere: CerereProdusFull): string {
  const produs = cerere.varianta?.produs?.denumire ?? '—';
  const parts = [
    cerere.varianta?.culoare ?? '',
    cerere.varianta?.marime ?? '',
  ].filter(Boolean);
  return parts.length > 0 ? `${produs} (${parts.join(' ')})` : produs;
}

const PredareModal: React.FC<PredareModalProps> = ({
  cerere,
  clubId,
  tipPlataEchipamenteId,
  onDone,
  onClose,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const denumire = getDenumireVarianta(cerere);
  const pret = cerere.varianta?.pret_vanzare ?? 0;
  const total = pret * (cerere.cantitate ?? 1);
  const tipProdus = cerere.varianta?.produs?.tip_produs ?? null;

  const handleConfirm = async () => {
    if (!cerere.sportiv_id) {
      setError('Cererea nu are sportiv asociat.');
      return;
    }
    if (!tipPlataEchipamenteId) {
      setError('Tipul de plată "Echipamente" lipsește. Adaugă-l în Config → Tipuri Plăți.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await marcheazaPredare(cerere.id, {
        sportiv_id: cerere.sportiv_id,
        club_id: clubId,
        varianta_id: cerere.varianta_id,
        tip_plata_id: tipPlataEchipamenteId,
        suma: total,
        cantitate: cerere.cantitate ?? 1,
        tip_produs: tipProdus,
        denumire_varianta: denumire,
        sportiv_user_id: cerere.sportiv?.user_id ?? null,
      });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la predare.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} title="Predare echipament" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-[var(--t-surface-2)] border border-[var(--t-border)] rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Sportiv</span>
            <span className="text-white font-semibold">{cerere.sportiv_nume ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Produs</span>
            <span className="text-white font-semibold">{denumire}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Cantitate</span>
            <span className="text-white font-semibold">{cerere.cantitate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Preț unitar</span>
            <span className="text-white font-semibold">{pret.toFixed(2)} RON</span>
          </div>
          <div className="flex justify-between text-sm border-t border-[var(--t-border)] pt-2 mt-2">
            <span className="text-slate-400 font-semibold">Total factură</span>
            <span className="text-white font-bold text-base">{total.toFixed(2)} RON</span>
          </div>
        </div>

        <p className="text-slate-400 text-xs">
          La confirmare se va crea o factură cu status <strong className="text-amber-400">Neachitat</strong> în portofelul sportivului
          {tipProdus === 'per_sportiv' ? ' și se va scădea stocul variantei.' : '.'}
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="flex-1">
            Anulează
          </Button>
          <Button onClick={handleConfirm} isLoading={saving} className="flex-1">
            Confirmă predarea
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PredareModal;
