import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { createVanzare } from '../../services/produseService';
import type { Produs, ProdusVariantaDB, Sportiv } from '../../types';
import { PlusIcon, XIcon } from '../icons';

interface LinieVanzare {
  produs_id: string;
  varianta_id: string;
  cantitate: string;
}

export interface VanzareModalProps {
  produse: Produs[];
  sportivi: Sportiv[];
  clubId: string;
  tipPlataId: string;
  onSave: () => void;
  onClose: () => void;
  sportivPreSelectat?: Sportiv;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getVarianteActive(produs: Produs): ProdusVariantaDB[] {
  return produs.variante.filter(v => v.activa);
}

function getLabelVarianta(v: ProdusVariantaDB): string {
  const parts = [v.culoare ?? '', v.marime ?? ''].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Standard';
}

function newLinie(): LinieVanzare {
  return { produs_id: '', varianta_id: '', cantitate: '' };
}

const VanzareModal: React.FC<VanzareModalProps> = ({
  produse,
  sportivi,
  clubId,
  tipPlataId,
  onSave,
  onClose,
  sportivPreSelectat,
}) => {
  const [sportivId, setSportivId] = useState(sportivPreSelectat?.id ?? '');
  const [dataVanzare, setDataVanzare] = useState(getTodayIso());
  const [observatii, setObservatii] = useState('');
  const [linii, setLinii] = useState<LinieVanzare[]>([newLinie()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sportiviSortati = [...sportivi].sort((a, b) =>
    `${a.prenume} ${a.nume}`.localeCompare(`${b.prenume} ${b.nume}`)
  );

  const addLinie = () => {
    setLinii(prev => [...prev, newLinie()]);
  };

  const removeLinie = (idx: number) => {
    setLinii(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLinie = (idx: number, field: keyof LinieVanzare, value: string) => {
    setLinii(prev =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: value };
        if (field === 'produs_id') {
          updated.varianta_id = '';
        }
        return updated;
      })
    );
  };

  const getVariantaPret = (linie: LinieVanzare): number => {
    if (!linie.produs_id || !linie.varianta_id) return 0;
    const produs = produse.find(p => p.id === linie.produs_id);
    const varianta = produs?.variante.find(v => v.id === linie.varianta_id);
    return varianta?.pret_vanzare ?? 0;
  };

  const getSubtotal = (linie: LinieVanzare): number => {
    const pret = getVariantaPret(linie);
    const cant = parseInt(linie.cantitate, 10) || 0;
    return pret * cant;
  };

  const totalCalculat = linii.reduce((sum, l) => sum + getSubtotal(l), 0);

  const handleSave = async () => {
    setError(null);

    if (!sportivId) {
      setError('Selectează un sportiv pentru a înregistra vânzarea.');
      return;
    }

    const liniiComplete = linii.filter(
      l => l.varianta_id && l.cantitate && parseInt(l.cantitate, 10) > 0
    );
    if (liniiComplete.length === 0) {
      setError('Adaugă cel puțin un produs cu variantă și cantitate pentru a salva vânzarea.');
      return;
    }

    setSaving(true);
    try {
      const liniiSnapshot = liniiComplete.map(l => {
        const produs = produse.find(p => p.id === l.produs_id);
        const varianta = produs?.variante.find(v => v.id === l.varianta_id);
        return {
          varianta_id: l.varianta_id,
          cantitate: parseInt(l.cantitate, 10),
          pret_vanzare_snapshot: varianta?.pret_vanzare ?? 0,
          pret_intrare_snapshot: varianta?.pret_intrare ?? 0,
          denumire_snapshot: `${produs?.denumire ?? ''} ${varianta?.culoare ?? ''} ${varianta?.marime ?? ''}`.trim(),
        };
      });

      await createVanzare({
        club_id: clubId,
        sportiv_id: sportivId,
        data_vanzare: dataVanzare,
        observatii: observatii.trim() || undefined,
        linii: liniiSnapshot,
        tip_plata_id: tipPlataId,
      });
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare vânzare.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Vânzare Echipamente">
      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        {/* Selectare sportiv — ascuns dacă e pre-selectat */}
        {!sportivPreSelectat && (
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
              Sportiv
            </label>
            <select
              value={sportivId}
              onChange={e => setSportivId(e.target.value)}
              className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 transition-all appearance-none"
            >
              <option value="">— Selectează sportiv —</option>
              {sportiviSortati.map(s => (
                <option key={s.id} value={s.id}>
                  {s.prenume} {s.nume}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Data vânzării */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
            Data vânzării
          </label>
          <input
            type="date"
            value={dataVanzare}
            onChange={e => setDataVanzare(e.target.value)}
            className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 transition-all"
          />
        </div>
      </div>

      {/* Separator + titlu */}
      <div className="border-t border-[var(--t-border)] mb-4" />
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
        Produse vândute
      </h3>

      {/* Tabel linii */}
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--t-border)] text-slate-400 text-xs uppercase tracking-wider">
              <th className="pb-2 text-left font-semibold pr-2 min-w-[130px]">Produs</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[110px]">Variantă</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[80px]">Cantitate</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[110px]">Preț unitar (RON)</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[90px]">Subtotal</th>
              <th className="pb-2 text-right font-semibold w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--t-border)]">
            {linii.map((linie, idx) => {
              const produsSelectat = produse.find(p => p.id === linie.produs_id);
              const varianteDisponibile = produsSelectat
                ? getVarianteActive(produsSelectat)
                : [];
              const pretUnitar = getVariantaPret(linie);
              const subtotal = getSubtotal(linie);

              return (
                <tr key={idx} className="align-top">
                  {/* Select Produs */}
                  <td className="py-2 pr-2">
                    <select
                      value={linie.produs_id}
                      onChange={e => updateLinie(idx, 'produs_id', e.target.value)}
                      className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] focus:outline-none focus:ring-1 transition-all appearance-none"
                    >
                      <option value="">— Produs —</option>
                      {produse.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.denumire}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Select Variantă */}
                  <td className="py-2 pr-2">
                    <select
                      value={linie.varianta_id}
                      onChange={e => updateLinie(idx, 'varianta_id', e.target.value)}
                      disabled={varianteDisponibile.length === 0}
                      className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] focus:outline-none focus:ring-1 transition-all appearance-none disabled:opacity-40"
                    >
                      <option value="">— Variantă —</option>
                      {varianteDisponibile.map(v => (
                        <option key={v.id} value={v.id}>
                          {getLabelVarianta(v)}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Cantitate */}
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={linie.cantitate}
                      onChange={e => updateLinie(idx, 'cantitate', e.target.value)}
                      placeholder="0"
                      className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all"
                    />
                  </td>

                  {/* Preț unitar (read-only) */}
                  <td className="py-2 pr-2">
                    <div className="px-2 py-1.5 text-sm text-slate-300">
                      {linie.varianta_id ? pretUnitar.toFixed(2) : '—'}
                    </div>
                  </td>

                  {/* Subtotal */}
                  <td className="py-2 pr-2">
                    <div className="px-2 py-1.5 text-sm text-white font-medium">
                      {linie.varianta_id && linie.cantitate ? subtotal.toFixed(2) : '—'}
                    </div>
                  </td>

                  {/* Șterge linia */}
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeLinie(idx)}
                      disabled={linii.length === 1}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Șterge linia"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Buton adaugă linie */}
      <Button
        variant="secondary"
        size="sm"
        onClick={addLinie}
        leftIcon={<PlusIcon className="w-3.5 h-3.5" />}
        className="mb-4"
      >
        Adaugă produs
      </Button>

      {/* Total calculat */}
      <div className="flex justify-end items-center gap-2 mt-3 mb-4">
        <span className="text-slate-400 text-sm">Total vânzare:</span>
        <span className="text-xl font-bold text-white">{totalCalculat.toFixed(2)} RON</span>
      </div>

      {/* Observații */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
          Observații (opțional)
        </label>
        <textarea
          value={observatii}
          onChange={e => setObservatii(e.target.value)}
          rows={2}
          placeholder="Notițe suplimentare..."
          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none"
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t border-[var(--t-border)] pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Anulează
        </Button>
        <Button onClick={handleSave} isLoading={saving}>
          Salvează vânzarea
        </Button>
      </div>
    </Modal>
  );
};

export default VanzareModal;
