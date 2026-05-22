import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Card, Input, Select } from '../ui';
import { useError } from '../ErrorProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type SmsTip = 'reminder_24h' | 'reminder_2h' | 'expirare_abonament' | 'confirmare_plata' | 'custom';

interface SmsTemplate {
  id?: string;
  club_id: string;
  tip: SmsTip;
  titlu: string;
  continut: string;
  activ: boolean;
}

interface SMSTemplatesProps {
  clubId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TIPS: { tip: SmsTip; label: string; variabile: string[] }[] = [
  { tip: 'reminder_24h', label: 'Reminder 24h', variabile: ['name', 'hour', 'club'] },
  { tip: 'reminder_2h', label: 'Reminder 2h', variabile: ['name', 'hour'] },
  { tip: 'expirare_abonament', label: 'Expirare abonament', variabile: ['name', 'days'] },
  { tip: 'confirmare_plata', label: 'Confirmare plată', variabile: ['name', 'amount'] },
  { tip: 'custom', label: 'Custom', variabile: ['name', 'club'] },
];

const PREVIEW_VALUES: Record<string, string> = {
  name: 'Ion Popescu',
  hour: '18:00',
  days: '7',
  amount: '150 RON',
  club: 'Clubul Meu',
};

const TIP_COLORS: Record<SmsTip, string> = {
  reminder_24h: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  reminder_2h: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  expirare_abonament: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  confirmare_plata: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  custom: 'bg-slate-600/40 text-slate-300 border border-slate-500/30',
};

function getTipLabel(tip: SmsTip): string {
  return TEMPLATE_TIPS.find(t => t.tip === tip)?.label ?? tip;
}

function renderPreview(continut: string): string {
  return continut.replace(/\{\{(\w+)\}\}/g, (_, key) => PREVIEW_VALUES[key] ?? `{{${key}}}`);
}

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm = (clubId: string): SmsTemplate => ({
  club_id: clubId,
  tip: 'reminder_24h',
  titlu: '',
  continut: '',
  activ: true,
});

// ─── Component ────────────────────────────────────────────────────────────────

export const SMSTemplates: React.FC<SMSTemplatesProps> = ({ clubId }) => {
  const { showError, showSuccess } = useError();

  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SmsTemplate>(defaultForm(clubId));

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('club_id', clubId)
        .order('tip');

      if (error) throw error;
      setTemplates(data ?? []);
    } catch (err: any) {
      showError('Eroare la încărcarea template-urilor', err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId, showError]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Insert variable at cursor ─────────────────────────────────────────────────

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    const tag = `{{${variable}}}`;
    if (!textarea) {
      setForm(prev => ({ ...prev, continut: prev.continut + tag }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue =
      form.continut.slice(0, start) + tag + form.continut.slice(end);
    setForm(prev => ({ ...prev, continut: newValue }));
    // restore cursor after tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null);
    setForm(defaultForm(clubId));
    setShowForm(true);
  };

  const openEdit = (t: SmsTemplate) => {
    setEditingId(t.id ?? null);
    setForm({ ...t });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm(clubId));
  };

  const handleSave = async () => {
    if (!form.titlu.trim() || !form.continut.trim()) {
      showError('Câmpuri obligatorii', 'Completați titlul și conținutul template-ului.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        club_id: clubId,
        tip: form.tip,
        titlu: form.titlu,
        continut: form.continut,
        activ: form.activ,
        ...(editingId ? { id: editingId } : {}),
      };
      const { error } = await supabase
        .from('sms_templates')
        .upsert(payload, { onConflict: 'club_id,tip' });

      if (error) throw error;
      showSuccess('Salvat', 'Template-ul a fost salvat cu succes.');
      closeForm();
      await fetchTemplates();
    } catch (err: any) {
      showError('Eroare la salvare', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActiv = async (t: SmsTemplate) => {
    if (!t.id) return;
    setTogglingId(t.id);
    try {
      const { error } = await supabase
        .from('sms_templates')
        .update({ activ: !t.activ })
        .eq('id', t.id);

      if (error) throw error;
      setTemplates(prev =>
        prev.map(item => (item.id === t.id ? { ...item, activ: !item.activ } : item))
      );
    } catch (err: any) {
      showError('Eroare la actualizare', err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Selected tip info ─────────────────────────────────────────────────────────

  const selectedTipInfo = TEMPLATE_TIPS.find(t => t.tip === form.tip);

  // ── Render ───────────────────────────────────────────────────────────────────

  const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <div className="space-y-5 animate-fade-in-down">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Template-uri SMS</h2>
          <p className="text-sm text-slate-400 mt-0.5">Mesaje predefinite per tip notificare</p>
        </div>
        <Button variant="success" onClick={openNew} className="w-full sm:w-auto">
          + Adaugă template
        </Button>
      </div>

      {/* Form modal/inline */}
      {showForm && (
        <Card className="border border-indigo-500/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {editingId ? 'Editează template' : 'Template nou'}
            </h3>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
              aria-label="Închide"
            >
              ×
            </button>
          </div>

          {/* Tip */}
          <Select
            label="Tip"
            value={form.tip}
            onChange={e => setForm(prev => ({ ...prev, tip: e.target.value as SmsTip }))}
          >
            {TEMPLATE_TIPS.map(t => (
              <option key={t.tip} value={t.tip}>{t.label}</option>
            ))}
          </Select>

          {/* Titlu */}
          <Input
            label="Titlu"
            value={form.titlu}
            onChange={e => setForm(prev => ({ ...prev, titlu: e.target.value }))}
            placeholder="ex: Reminder antrenament"
          />

          {/* Variabile disponibile */}
          {selectedTipInfo && selectedTipInfo.variabile.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                Variabile disponibile (click pentru inserare)
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTipInfo.variabile.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conținut */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
              Conținut mesaj
            </label>
            <textarea
              ref={textareaRef}
              value={form.continut}
              onChange={e => setForm(prev => ({ ...prev, continut: e.target.value }))}
              placeholder='Salut {{name}}, ai programare la {{hour}}.'
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm resize-none"
            />
            <p className="text-xs text-slate-500 mt-1 ml-1">
              {form.continut.length} caractere
            </p>
          </div>

          {/* Preview */}
          {form.continut.trim() && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 px-4 py-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Preview</p>
              <p className="text-sm text-slate-200">{renderPreview(form.continut)}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700/60">
            <Button
              variant="success"
              onClick={handleSave}
              isLoading={saving}
              className="flex-1 sm:flex-none"
            >
              Salvează
            </Button>
            <Button
              variant="secondary"
              onClick={closeForm}
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              Anulează
            </Button>
          </div>
        </Card>
      )}

      {/* Templates list */}
      {loading && templates.length === 0 ? (
        <Card className="flex items-center justify-center py-16">
          <Spinner />
          <span className="ml-3 text-slate-400 text-sm">Se încarcă...</span>
        </Card>
      ) : templates.length === 0 ? (
        <Card className="flex items-center justify-center py-12 text-slate-400 text-sm">
          Niciun template configurat. Adaugă primul template.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(t => (
            <Card
              key={t.id}
              className={`space-y-3 transition-opacity ${t.activ ? 'opacity-100' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TIP_COLORS[t.tip]}`}>
                  {getTipLabel(t.tip)}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.activ
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-600/40 text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {t.activ ? 'Activ' : 'Inactiv'}
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-white">{t.titlu}</p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.continut}</p>
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-700/40">
                <Button
                  variant="secondary"
                  onClick={() => openEdit(t)}
                  className="text-xs py-1.5 px-3 flex-1"
                >
                  Editează
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleToggleActiv(t)}
                  isLoading={togglingId === t.id}
                  disabled={togglingId !== null}
                  className="text-xs py-1.5 px-3 flex-1"
                >
                  {t.activ ? 'Dezactivează' : 'Activează'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
