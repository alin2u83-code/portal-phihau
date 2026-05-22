import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Card, Select } from '../ui';
import { useError } from '../ErrorProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type SmsTip = 'reminder_24h' | 'reminder_2h' | 'expirare_abonament' | 'confirmare_plata' | 'custom';
type SmsStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

interface SmsQueueItem {
  id: string;
  club_id: string;
  telefon: string;
  tip: SmsTip;
  status: SmsStatus;
  sent_at: string | null;
  created_at: string;
  retry_count: number;
  error_message: string | null;
  scheduled_at: string | null;
}

interface SMSLogProps {
  clubId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ro-RO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function truncatePhone(phone: string): string {
  if (phone.length <= 8) return phone;
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const TipBadge: React.FC<{ tip: SmsTip }> = ({ tip }) => {
  const map: Record<SmsTip, { cls: string; label: string }> = {
    reminder_24h: { cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: 'Reminder 24h' },
    reminder_2h: { cls: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30', label: 'Reminder 2h' },
    expirare_abonament: { cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', label: 'Expirare abonament' },
    confirmare_plata: { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Confirmare plată' },
    custom: { cls: 'bg-slate-600/40 text-slate-300 border border-slate-500/30', label: 'Custom' },
  };
  const { cls, label } = map[tip] ?? map.custom;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const StatusBadge: React.FC<{ status: SmsStatus }> = ({ status }) => {
  const map: Record<SmsStatus, { cls: string; label: string }> = {
    pending: { cls: 'bg-slate-600/40 text-slate-300 border border-slate-500/30', label: 'În așteptare' },
    sending: { cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse', label: 'Se trimite...' },
    sent: { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Trimis' },
    failed: { cls: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', label: 'Eșuat' },
    cancelled: { cls: 'bg-slate-500/20 text-slate-400 border border-slate-400/30', label: 'Anulat' },
  };
  const { cls, label } = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SMSLog: React.FC<SMSLogProps> = ({ clubId }) => {
  const { showError, showSuccess } = useError();

  const [items, setItems] = useState<SmsQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTip, setFilterTip] = useState<string>('all');

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchLog = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_queue')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setItems(data ?? []);
    } catch (err: any) {
      showError('Eroare la încărcarea log-ului SMS', err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId, showError]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  // ── Retry ────────────────────────────────────────────────────────────────────

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      const { error } = await supabase
        .from('sms_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          scheduled_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', id);

      if (error) throw error;
      showSuccess('Reprogramat', 'SMS-ul a fost reprogramat pentru trimitere.');
      await fetchLog();
    } catch (err: any) {
      showError('Eroare la retrimitere', err.message);
    } finally {
      setRetrying(null);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────────

  const filtered = items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterTip !== 'all' && item.tip !== filterTip) return false;
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  const Spinner = () => (
    <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <div className="space-y-4 animate-fade-in-down">
      {/* Header + Filtre */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Istoric SMS</h2>
          <p className="text-sm text-slate-400 mt-0.5">Ultimele 100 SMS-uri trimise</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="w-40">
            <Select
              label="Status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Toate</option>
              <option value="pending">pending</option>
              <option value="sending">Se trimite</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
              <option value="cancelled">Anulat</option>
            </Select>
          </div>
          <div className="w-48">
            <Select
              label="Tip"
              value={filterTip}
              onChange={e => setFilterTip(e.target.value)}
            >
              <option value="all">Toate</option>
              <option value="reminder_24h">reminder_24h</option>
              <option value="reminder_2h">reminder_2h</option>
              <option value="expirare_abonament">expirare_abonament</option>
              <option value="confirmare_plata">confirmare_plata</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={fetchLog} disabled={loading} className="h-[42px]">
              {loading ? <Spinner /> : '↻ Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <Card className="flex items-center justify-center py-16">
          <Spinner />
          <span className="ml-3 text-slate-400 text-sm">Se încarcă...</span>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex items-center justify-center py-12 text-slate-400 text-sm">
          Niciun SMS găsit cu filtrele selectate.
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60">
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Telefon</th>
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Tip</th>
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Trimis la</th>
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Retry</th>
                    <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-3">Eroare</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{item.telefon}</td>
                      <td className="px-4 py-3"><TipBadge tip={item.tip} /></td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(item.sent_at)}</td>
                      <td className="px-4 py-3">
                        {item.retry_count > 0 && (
                          <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            {item.retry_count}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-rose-400 text-xs max-w-[200px]">
                        {item.error_message ? (
                          <span
                            title={item.error_message}
                            className="truncate block cursor-help"
                          >
                            {item.error_message.length > 50
                              ? item.error_message.slice(0, 50) + '...'
                              : item.error_message}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.status === 'failed' && (
                          <Button
                            variant="secondary"
                            onClick={() => handleRetry(item.id)}
                            isLoading={retrying === item.id}
                            disabled={retrying !== null}
                            className="text-xs py-1 px-3"
                          >
                            Retrimite
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(item => (
              <Card key={item.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-slate-300 text-sm">{truncatePhone(item.telefon)}</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <TipBadge tip={item.tip} />
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Trimis: {formatDate(item.sent_at)}</span>
                  {item.retry_count > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      Retry: {item.retry_count}
                    </span>
                  )}
                </div>
                {item.error_message && (
                  <p className="text-xs text-rose-400 truncate" title={item.error_message}>
                    {item.error_message.length > 50
                      ? item.error_message.slice(0, 50) + '...'
                      : item.error_message}
                  </p>
                )}
                {item.status === 'failed' && (
                  <Button
                    variant="secondary"
                    onClick={() => handleRetry(item.id)}
                    isLoading={retrying === item.id}
                    disabled={retrying !== null}
                    className="w-full text-xs py-2"
                  >
                    Retrimite
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
