import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '../ui';
import {
  createProdus,
  updateProdus,
  createVarianta,
  updateVarianta,
  deleteVarianta,
  fetchProduse,
} from '../../services/produseService';
import type { Produs, ProdusCategorieDB, ProdusDB, ProdusVariantaDB } from '../../types';
import { PlusIcon, XIcon } from '../icons';

interface VariantaForm {
  id?: string;
  culoare: string;
  marime: string;
  pret_intrare: string;
  pret_vanzare: string;
  stoc_minim: string;
  _toDelete?: boolean;
}

const MARIMI_PREDEFINITE = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unic', 'Alt...'];

function variantaToForm(v: ProdusVariantaDB): VariantaForm {
  return {
    id: v.id,
    culoare: v.culoare ?? '',
    marime: v.marime ?? '',
    pret_intrare: String(v.pret_intrare),
    pret_vanzare: String(v.pret_vanzare),
    stoc_minim: String(v.stoc_minim),
    _toDelete: false,
  };
}

function newVariantaForm(): VariantaForm {
  return {
    culoare: '',
    marime: 'Unic',
    pret_intrare: '',
    pret_vanzare: '',
    stoc_minim: '0',
    _toDelete: false,
  };
}

export interface ProdusFormModalProps {
  produs?: Produs | null;
  categorii: ProdusCategorieDB[];
  clubId: string;
  onSave: (produs: Produs) => void;
  onClose: () => void;
}

const ProdusFormModal: React.FC<ProdusFormModalProps> = ({
  produs,
  categorii,
  clubId,
  onSave,
  onClose,
}) => {
  const [denumire, setDenumire] = useState(produs?.denumire ?? '');
  const [categorieId, setCategorieId] = useState(produs?.categorie_id ?? (categorii[0]?.id ?? ''));
  const [descriere, setDescriere] = useState(produs?.descriere ?? '');
  const [tipProdus, setTipProdus] = useState<ProdusDB['tip_produs']>(
    produs?.tip_produs ?? 'per_sportiv'
  );
  const [variante, setVariante] = useState<VariantaForm[]>(
    produs?.variante?.filter(v => v.activa).map(variantaToForm) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (produs) {
      setDenumire(produs.denumire);
      setCategorieId(produs.categorie_id);
      setDescriere(produs.descriere ?? '');
      setTipProdus(produs.tip_produs ?? 'per_sportiv');
      setVariante(produs.variante?.filter(v => v.activa).map(variantaToForm) ?? []);
    }
  }, [produs]);

  const addVarianta = () => {
    setVariante(prev => [...prev, newVariantaForm()]);
  };

  const updateVariantaField = (
    idx: number,
    field: keyof VariantaForm,
    value: string | boolean
  ) => {
    setVariante(prev =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const markToDelete = (idx: number) => {
    setVariante(prev =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        // If it has an id (existing in DB), mark for deletion; otherwise remove immediately
        if (v.id) return { ...v, _toDelete: true };
        return null as unknown as VariantaForm;
      }).filter(Boolean)
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!denumire.trim()) {
      setError('Denumirea produsului este obligatorie.');
      return;
    }
    if (!categorieId) {
      setError('Selectați o categorie.');
      return;
    }

    setSaving(true);
    try {
      let produsId: string;

      if (produs) {
        await updateProdus(produs.id, {
          denumire: denumire.trim(),
          categorie_id: categorieId,
          descriere: descriere.trim() || null,
          tip_produs: tipProdus,
        });
        produsId = produs.id;
      } else {
        const nou = await createProdus({
          club_id: clubId,
          categorie_id: categorieId,
          denumire: denumire.trim(),
          descriere: descriere.trim() || null,
          tip_produs: tipProdus,
        });
        produsId = nou.id;
      }

      // Process variants in parallel
      const ops: Promise<unknown>[] = [];
      for (const v of variante) {
        if (v._toDelete && v.id) {
          ops.push(deleteVarianta(v.id));
        } else if (!v._toDelete && v.id) {
          ops.push(
            updateVarianta(v.id, {
              culoare: v.culoare || null,
              marime: v.marime === 'Alt...' ? v.culoare : v.marime || null,
              pret_intrare: parseFloat(v.pret_intrare) || 0,
              pret_vanzare: parseFloat(v.pret_vanzare) || 0,
              stoc_minim: parseFloat(v.stoc_minim) || 0,
            })
          );
        } else if (!v._toDelete && !v.id) {
          ops.push(
            createVarianta({
              produs_id: produsId,
              culoare: v.culoare || null,
              marime: v.marime === 'Alt...' ? null : v.marime || null,
              pret_intrare: parseFloat(v.pret_intrare) || 0,
              pret_vanzare: parseFloat(v.pret_vanzare) || 0,
              stoc_curent: 0,
              stoc_minim: parseFloat(v.stoc_minim) || 0,
            })
          );
        }
      }
      await Promise.all(ops);

      // Fetch updated produs with variants
      const allProduse = await fetchProduse();
      const produsActualizat = allProduse.find(p => p.id === produsId);
      if (!produsActualizat) throw new Error('Produsul nu a putut fi regăsit după salvare.');

      onSave(produsActualizat);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eroare la salvare.');
    } finally {
      setSaving(false);
    }
  };

  const title = produs ? `Editare ${produs.denumire}` : 'Produs nou';
  const varianteVizibile = variante.filter(v => !v._toDelete);

  return (
    <Modal isOpen onClose={onClose} title={title}>
      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Secțiunea Produs */}
      <div className="space-y-4 mb-6">
        <Input
          label="Denumire"
          value={denumire}
          onChange={e => setDenumire(e.target.value)}
          placeholder="ex. Vo-phuc alb"
          required
        />
        <Select
          label="Categorie"
          value={categorieId}
          onChange={e => setCategorieId(e.target.value)}
        >
          <option value="">— Selectați categoria —</option>
          {categorii.map(c => (
            <option key={c.id} value={c.id}>
              {c.denumire}
            </option>
          ))}
        </Select>
        <Select
          label="Tip distribuție produs"
          value={tipProdus ?? 'per_sportiv'}
          onChange={e => setTipProdus(e.target.value as ProdusDB['tip_produs'])}
        >
          <option value="per_sportiv">Per sportiv — se distribuie individual</option>
          <option value="per_club">Per club — rămâne la club</option>
        </Select>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
            Descriere (opțional)
          </label>
          <textarea
            value={descriere}
            onChange={e => setDescriere(e.target.value)}
            rows={3}
            placeholder="Descriere produs..."
            className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none"
          />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-[var(--t-border)] mb-4" />

      {/* Secțiunea Variante */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Variante
          </h3>
          <Button variant="secondary" size="sm" onClick={addVarianta} leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>
            Adaugă variantă
          </Button>
        </div>

        {varianteVizibile.length === 0 ? (
          <p className="text-slate-500 text-sm italic py-4 text-center">
            Nicio variantă adăugată. Click pe "Adaugă variantă" pentru a adăuga.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--t-border)] text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-2 text-left font-semibold pr-2">Culoare</th>
                  <th className="pb-2 text-left font-semibold pr-2">Mărime</th>
                  <th className="pb-2 text-left font-semibold pr-2">Preț intrare (RON)</th>
                  <th className="pb-2 text-left font-semibold pr-2">Preț vânzare (RON)</th>
                  <th className="pb-2 text-left font-semibold pr-2">Stoc minim</th>
                  <th className="pb-2 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--t-border)]">
                {variante.map((v, idx) => {
                  if (v._toDelete) return null;
                  return (
                    <tr key={idx} className="align-top">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={v.culoare}
                          onChange={e => updateVariantaField(idx, 'culoare', e.target.value)}
                          placeholder="ex. Alb"
                          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all min-w-[80px]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={MARIMI_PREDEFINITE.includes(v.marime) ? v.marime : 'Alt...'}
                          onChange={e => updateVariantaField(idx, 'marime', e.target.value)}
                          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] focus:outline-none focus:ring-1 transition-all min-w-[80px] appearance-none"
                        >
                          {MARIMI_PREDEFINITE.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {v.marime === 'Alt...' && (
                          <input
                            type="text"
                            value={MARIMI_PREDEFINITE.includes(v.marime) ? '' : v.marime}
                            onChange={e => updateVariantaField(idx, 'marime', e.target.value)}
                            placeholder="Mărime personalizată"
                            className="mt-1 w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all"
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.pret_intrare}
                          onChange={e => updateVariantaField(idx, 'pret_intrare', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all min-w-[90px]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.pret_vanzare}
                          onChange={e => updateVariantaField(idx, 'pret_vanzare', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all min-w-[90px]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={v.stoc_minim}
                          onChange={e => updateVariantaField(idx, 'stoc_minim', e.target.value)}
                          placeholder="0"
                          className="w-full bg-[var(--t-input-bg)] border border-[var(--t-border)] rounded-lg px-2 py-1.5 text-sm text-[var(--t-text)] placeholder-slate-500 focus:outline-none focus:ring-1 transition-all min-w-[60px]"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => markToDelete(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Șterge varianta"
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
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 border-t border-[var(--t-border)] pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Anulează
        </Button>
        <Button onClick={handleSave} isLoading={saving}>
          Salvează
        </Button>
      </div>
    </Modal>
  );
};

export default ProdusFormModal;
