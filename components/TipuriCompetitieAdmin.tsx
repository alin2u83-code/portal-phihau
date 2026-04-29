/**
 * TipuriCompetitieAdmin — editare denumiri tipuri de competiție
 * Vizibil și funcțional DOAR pentru SUPER_ADMIN_FEDERATIE / ADMIN.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Permissions } from '../types';
import { Button, Input, Modal } from './ui';
import { EditIcon } from './icons';
import { useError } from './ErrorProvider';

interface TipCompetitie {
  id: string;
  cod: string;
  denumire: string;
  descriere: string | null;
  activ: boolean;
  ordine: number;
}

interface Props {
  permissions: Permissions;
}

export const TipuriCompetitieAdmin: React.FC<Props> = ({ permissions }) => {
  const { showError } = useError();
  const [tipuri, setTipuri] = useState<TipCompetitie[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<TipCompetitie | null>(null);
  const [form, setForm] = useState({ denumire: '', descriere: '' });
  const [saving, setSaving] = useState(false);

  const canEdit = permissions.isSuperAdmin || permissions.isFederationAdmin;

  const fetchTipuri = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tipuri_competitie')
      .select()
      .order('ordine');
    if (error) {
      showError('Eroare', error.message);
    } else {
      setTipuri((data || []) as TipCompetitie[]);
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => { fetchTipuri(); }, [fetchTipuri]);

  const openEdit = (tip: TipCompetitie) => {
    setEditItem(tip);
    setForm({ denumire: tip.denumire, descriere: tip.descriere || '' });
  };

  const handleSave = async () => {
    if (!editItem) return;
    if (!form.denumire.trim()) {
      showError('Validare', 'Denumirea nu poate fi goala.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('tipuri_competitie')
      .update({
        denumire: form.denumire.trim(),
        descriere: form.descriere.trim() || null,
      })
      .eq('id', editItem.id);
    if (error) {
      showError('Eroare salvare', error.message);
    } else {
      setTipuri(prev =>
        prev.map(t =>
          t.id === editItem.id
            ? { ...t, denumire: form.denumire.trim(), descriere: form.descriere.trim() || null }
            : t
        )
      );
      setEditItem(null);
    }
    setSaving(false);
  };

  if (!canEdit) return null;

  const COD_BADGE: Record<string, string> = {
    tehnica:  'bg-purple-800 text-purple-200',
    giao_dau: 'bg-red-800 text-red-200',
    cvd:      'bg-orange-800 text-orange-200',
    stagiu:   'bg-teal-800 text-teal-200',
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Denumiri tipuri competiție
          </h3>
          <button
            onClick={fetchTipuri}
            disabled={loading}
            title="Reincarca"
            className="h-8 w-8 flex items-center justify-center rounded text-slate-500 hover:text-white border border-slate-700 bg-slate-800 transition-colors disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-4 text-sm">Se incarca...</div>
        ) : (
          <div className="space-y-1">
            {tipuri.map(tip => (
              <div
                key={tip.id}
                className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${COD_BADGE[tip.cod] || 'bg-slate-700 text-slate-300'}`}>
                  {tip.cod}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{tip.denumire}</div>
                  {tip.descriere && (
                    <div className="text-xs text-slate-500 truncate">{tip.descriere}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="!p-2 shrink-0 h-10 w-10"
                  onClick={() => openEdit(tip)}
                  title="Editeaza"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal editare */}
      <Modal
        isOpen={editItem !== null}
        onClose={() => setEditItem(null)}
        title={`Editeaza tip: ${editItem?.cod}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Codul <strong className="text-white">{editItem?.cod}</strong> este fix si nu poate fi schimbat.
            Poti modifica doar denumirea afisata si descrierea.
          </p>
          <Input
            label="Denumire afisata"
            value={form.denumire}
            onChange={e => setForm(p => ({ ...p, denumire: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Descriere (optional)</label>
            <textarea
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white resize-none"
              rows={2}
              value={form.descriere}
              onChange={e => setForm(p => ({ ...p, descriere: e.target.value }))}
              placeholder="Descriere scurta..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditItem(null)} disabled={saving}>
              Anuleaza
            </Button>
            <Button variant="success" onClick={handleSave} disabled={saving}>
              {saving ? 'Se salveaza...' : 'Salveaza'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
