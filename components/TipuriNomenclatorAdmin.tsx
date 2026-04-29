/**
 * TipuriNomenclatorAdmin — componentă generică pentru editarea denumirilor
 * din tabele de nomenclator (tipuri_competitie, tipuri_stagii etc.)
 * Vizibil și funcțional DOAR pentru SUPER_ADMIN_FEDERATIE / ADMIN.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Permissions } from '../types';
import { Button, Input, Modal } from './ui';
import { EditIcon } from './icons';
import { useError } from './ErrorProvider';

interface TipNomenclator {
  id: string;
  cod: string;
  denumire: string;
  activ: boolean;
  ordine: number;
}

interface Props {
  permissions: Permissions;
  tableName: 'tipuri_competitie' | 'tipuri_stagii';
  title: string;
}

const COD_BADGE_COMPETITIE: Record<string, string> = {
  tehnica:  'bg-purple-800 text-purple-200',
  giao_dau: 'bg-red-800 text-red-200',
  cvd:      'bg-orange-800 text-orange-200',
  stagiu:   'bg-teal-800 text-teal-200',
};

const COD_BADGE_STAGII: Record<string, string> = {
  qkd:     'bg-blue-800 text-blue-200',
  cvd:     'bg-orange-800 text-orange-200',
  tam_the: 'bg-green-800 text-green-200',
  general: 'bg-slate-700 text-slate-300',
};

export const TipuriNomenclatorAdmin: React.FC<Props> = ({ permissions, tableName, title }) => {
  const { showError } = useError();
  const [tipuri, setTipuri] = useState<TipNomenclator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<TipNomenclator | null>(null);
  const [form, setForm] = useState({ denumire: '' });
  const [saving, setSaving] = useState(false);

  const canEdit = permissions.isSuperAdmin || permissions.isFederationAdmin;

  const fetchTipuri = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select('id, cod, denumire, activ, ordine')
      .order('ordine');
    if (error) {
      showError('Eroare', error.message);
    } else {
      setTipuri((data || []) as TipNomenclator[]);
    }
    setLoading(false);
  }, [tableName, showError]);

  useEffect(() => { fetchTipuri(); }, [fetchTipuri]);

  const openEdit = (tip: TipNomenclator) => {
    setEditItem(tip);
    setForm({ denumire: tip.denumire });
  };

  const handleSave = async () => {
    if (!editItem) return;
    if (!form.denumire.trim()) {
      showError('Validare', 'Denumirea nu poate fi goala.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from(tableName)
      .update({ denumire: form.denumire.trim() })
      .eq('id', editItem.id);
    if (error) {
      showError('Eroare salvare', error.message);
    } else {
      setTipuri(prev =>
        prev.map(t =>
          t.id === editItem.id
            ? { ...t, denumire: form.denumire.trim() }
            : t
        )
      );
      setEditItem(null);
    }
    setSaving(false);
  };

  if (!canEdit) return null;

  const badgeMap = tableName === 'tipuri_competitie' ? COD_BADGE_COMPETITIE : COD_BADGE_STAGII;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            {title}
          </h3>
          <button
            onClick={fetchTipuri}
            disabled={loading}
            title="Reincarca"
            className="h-10 w-10 flex items-center justify-center rounded text-slate-500 hover:text-white border border-slate-700 bg-slate-800 transition-colors disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-4 text-sm">Se incarca...</div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {tipuri.map(tip => (
              <div
                key={tip.id}
                className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeMap[tip.cod] || 'bg-slate-700 text-slate-300'}`}>
                  {tip.cod}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{tip.denumire}</div>
                  {!tip.activ && (
                    <div className="text-xs text-slate-500">inactiv</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="!p-2 shrink-0 h-10 min-w-[2.5rem]"
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
        title={`Editeaza: ${editItem?.cod}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Codul <strong className="text-white">{editItem?.cod}</strong> este fix si nu poate fi schimbat.
            Poti modifica doar denumirea afisata.
          </p>
          <Input
            label="Denumire afisata"
            value={form.denumire}
            onChange={e => setForm({ denumire: e.target.value })}
            required
          />
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
