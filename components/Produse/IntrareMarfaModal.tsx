import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { createIntrareMarfa } from '../../services/produseService';
import type { Produs, ProdusVariantaDB } from '../../types';
import { PlusIcon, XIcon } from '../icons';

interface LiniIntrare {
  produs_id: string;
  varianta_id: string;
  cantitate: string;
  pret_intrare: string;
}

export interface IntrareMarfaModalProps {
  produse: Produs[];
  clubId: string;
  onSave: () => void;
  onClose: () => void;
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

function newLinie(): LiniIntrare {
  return { produs_id: '', varianta_id: '', cantitate: '', pret_intrare: '' };
}

const IntrareMarfaModal: React.FC<IntrareMarfaModalProps> = ({
  produse,
  clubId,
  onSave,
  onClose,
}) => {
  const [furnizor, setFurnizor] = useState('');
  const [nrFactura, setNrFactura] = useState('');
  const [dataFactura, setDataFactura] = useState(getTodayIso());
  const [observatii, setObservatii] = useState('');
  const [linii, setLinii] = useState<LiniIntrare[]>([newLinie()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLinie = () => {
    setLinii(prev => [...prev, newLinie()]);
  };

  const removeLinie = (idx: number) => {
    setLinii(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLinie = (idx: number, field: keyof LiniIntrare, value: string) => {
    setLinii(prev =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: value };
        // La schimbarea produsului, resetăm varianta și prețul
        if (field === 'produs_id') {
          updated.varianta_id = '';
          updated.pret_intrare = '';
        }
        // La schimbarea variantei, pre-populăm prețul de intrare
        if (field === 'varianta_id' && value) {
          const produs = produse.find(p => p.id === updated.produs_id);
          const varianta = produs?.variante.find(v => v.id === value);
          if (varianta) {
            updated.pret_intrare = String(varianta.pret_intrare);
          }
        }
        return updated;
      })
    );
  };

  const handleSave = async () => {
    setError(null);

    // Validare: cel puțin o linie completă
    const liniiComplete = linii.filter(
      l => l.varianta_id && l.cantitate && parseInt(l.cantitate, 10) > 0
    );
    if (liniiComplete.length === 0) {
      setError('Adaugă cel puțin un produs cu variantă și cantitate pentru a salva intrarea.');
      return;
    }
    if (!dataFactura) {
      setError('Data facturii este obligatorie.');
      return;
    }

    setSaving(true);
    try {
      await createIntrareMarfa({
        club_id: clubId,
        furnizor: furnizor.trim() || undefined,
        nr_factura: nrFactura.trim() || undefined,
        data_factura: dataFactura,
        observatii: observatii.trim() || undefined,
        linii: liniiComplete.map(l => ({
          varianta_id: l.varianta_id,
          cantitate: parseInt(l.cantitate, 10),
          pret_intrare_snapshot: parseFloat(l.pret_intrare) || 0,
        })),
      });
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare intrare marfă.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Intrare Marfă Nouă">
      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Câmpuri header */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Furnizor"
            value={furnizor}
            onChange={e => setFurnizor(e.target.value)}
            placeholder="ex. Distribuitorul X"
          />
          <Input
            label="Nr. Factură"
            value={nrFactura}
            onChange={e => setNrFactura(e.target.value)}
            placeholder="ex. FX-12345"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
            Data facturii
          </label>
          <input
            type="date"
            value={dataFactura}
            onChange={e => setDataFactura(e.target.value)}
            className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--t-text)] focus:outline-none focus:ring-2 transition-all"
          />
        </div>
        <div>
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
      </div>

      {/* Separator + titlu */}
      <div className="border-t border-[var(--t-border)] mb-4" />
      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
        Produse intrate
      </h3>

      {/* Tabel linii */}
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--t-border)] text-slate-400 text-xs uppercase tracking-wider">
              <th className="pb-2 text-left font-semibold pr-2 min-w-[130px]">Produs</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[110px]">Variantă</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[80px]">Cantitate</th>
              <th className="pb-2 text-left font-semibold pr-2 min-w-[110px]">Preț intrare (RON)</th>
              <th className="pb-2 text-right font-semibold w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--t-border)]">
            {linii.map((linie, idx) => {
              const produsSelectat = produse.find(p => p.id === linie.produs_id);
              const varianteDisponibile = produsSelectat
                ? getVarianteActive(produsSelectat)
                : [];

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

                  {/* Preț intrare */}
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={linie.pret_intrare}
                      onChange={e => updateLinie(idx, 'pret_intrare', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all"
                    />
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
        className="mb-6"
      >
        Adaugă produs
      </Button>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t border-[var(--t-border)] pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Anulează
        </Button>
        <Button onClick={handleSave} isLoading={saving}>
          Salvează intrarea
        </Button>
      </div>
    </Modal>
  );
};

export default IntrareMarfaModal;
