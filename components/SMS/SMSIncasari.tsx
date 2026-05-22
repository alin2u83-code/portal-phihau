import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Card } from '../ui';
import { useError } from '../ErrorProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsIncoming {
  id: string;
  club_id: string;
  telefon_sursa: string | null;
  continut: string;
  banca_detectata: string | null;
  suma_detectata: number | null;
  platitor_detectat: string | null;
  status: 'matched' | 'unmatched' | 'ignored' | 'processing' | 'manual_matched';
  confidence: number | null;
  plata_id: string | null;
  received_at: string;
  processed_at: string | null;
}

interface SportivOption {
  id: string;
  nume: string;
  prenume: string;
}

interface PlataOption {
  id: string;
  suma: number;
  data: string;
  descriere: string;
  tip: string;
}

type FilterTab = 'toate' | 'nerecunoscute' | 'potrivite';

interface SMSIncasariProps {
  clubId: string;
  /** Număr badge unmatched transmis din exterior (opțional — dacă lipsește, se calculează local) */
  unmatchedCount?: number;
  onUnmatchedCountChange?: (count: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatReceivedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} ${dd}/${mo}`;
  } catch {
    return iso;
  }
}

function formatCurrency(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const BancaBadge: React.FC<{ banca: string | null }> = ({ banca }) => {
  const map: Record<string, { cls: string; label: string }> = {
    ING: { cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', label: 'ING' },
    BCR: { cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: 'BCR' },
    BRD: { cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', label: 'BRD' },
    Raiffeisen: { cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', label: 'Raiffeisen' },
  };
  const key = banca ?? '';
  const { cls, label } = map[key] ?? {
    cls: 'bg-slate-700/60 text-slate-400 border border-slate-600/40',
    label: 'Necunoscut',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const StatusBadge: React.FC<{ status: SmsIncoming['status'] }> = ({ status }) => {
  const map: Record<SmsIncoming['status'], { cls: string; label: string }> = {
    matched: { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Potrivit' },
    unmatched: { cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', label: 'Nerecunoscut' },
    ignored: { cls: 'bg-slate-700/60 text-slate-400 border border-slate-600/40', label: 'Ignorat' },
    processing: { cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', label: 'Procesare' },
    manual_matched: { cls: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30', label: 'Manual' },
  };
  const { cls, label } = map[status] ?? map.unmatched;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// ─── Expanded row for manual matching ────────────────────────────────────────

interface ExpandedRowProps {
  sms: SmsIncoming;
  clubId: string;
  onConfirm: (smsId: string, plataId: string) => Promise<void>;
  onIgnore: (smsId: string) => Promise<void>;
}

const ExpandedRow: React.FC<ExpandedRowProps> = ({ sms, clubId, onConfirm, onIgnore }) => {
  const { showError } = useError();
  const [sportivi, setSportivi] = useState<SportivOption[]>([]);
  const [plati, setPlati] = useState<PlataOption[]>([]);
  const [selectedSportivId, setSelectedSportivId] = useState('');
  const [selectedPlataId, setSelectedPlataId] = useState('');
  const [loadingSportivi, setLoadingSportivi] = useState(false);
  const [loadingPlati, setLoadingPlati] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoadingSportivi(true);
    supabase
      .from('sportivi')
      .select('id, nume, prenume')
      .eq('club_id', clubId)
      .order('nume')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          showError('Eroare', error.message);
        } else {
          setSportivi(data ?? []);
        }
        setLoadingSportivi(false);
      });
    return () => { cancelled = true; };
  }, [clubId, showError]);

  useEffect(() => {
    if (!selectedSportivId) {
      setPlati([]);
      setSelectedPlataId('');
      return;
    }
    let cancelled = false;
    setLoadingPlati(true);
    setSelectedPlataId('');
    supabase
      .from('plati')
      .select('id, suma, data, descriere, tip')
      .eq('sportiv_id', selectedSportivId)
      .eq('status', 'Neachitat')
      .order('data', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          showError('Eroare', error.message);
        } else {
          setPlati(data ?? []);
        }
        setLoadingPlati(false);
      });
    return () => { cancelled = true; };
  }, [selectedSportivId, showError]);

  const filteredSportivi = search.trim()
    ? sportivi.filter(s =>
        `${s.nume} ${s.prenume}`.toLowerCase().includes(search.trim().toLowerCase())
      )
    : sportivi;

  const handleConfirm = async () => {
    if (!selectedPlataId) return;
    setConfirming(true);
    try {
      await onConfirm(sms.id, selectedPlataId);
    } finally {
      setConfirming(false);
    }
  };

  const handleIgnore = async () => {
    setIgnoring(true);
    try {
      await onIgnore(sms.id);
    } finally {
      setIgnoring(false);
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 bg-slate-800/60 border-t border-slate-700/60 rounded-b-xl space-y-3">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Potrivire manuală</p>

      {/* SMS content preview */}
      <p className="text-xs text-slate-500 font-mono bg-slate-900/60 rounded-lg px-3 py-2 break-all">
        {sms.continut}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Sportiv search + select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
            Caută sportiv
          </label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrează după nume..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <select
            value={selectedSportivId}
            onChange={e => setSelectedSportivId(e.target.value)}
            disabled={loadingSportivi}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50"
          >
            <option value="">{loadingSportivi ? 'Se încarcă...' : '— Selectează sportiv —'}</option>
            {filteredSportivi.map(s => (
              <option key={s.id} value={s.id}>
                {s.nume} {s.prenume}
              </option>
            ))}
          </select>
        </div>

        {/* Plată pending */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
            Plată pending
          </label>
          <select
            value={selectedPlataId}
            onChange={e => setSelectedPlataId(e.target.value)}
            disabled={!selectedSportivId || loadingPlati}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50 mt-[26px]"
          >
            <option value="">
              {!selectedSportivId
                ? '— Alege sportiv mai întâi —'
                : loadingPlati
                ? 'Se încarcă...'
                : plati.length === 0
                ? 'Nicio plată pending'
                : '— Selectează plată —'}
            </option>
            {plati.map(p => (
              <option key={p.id} value={p.id}>
                {formatCurrency(p.suma)} — {p.tip} ({p.data})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          variant="success"
          onClick={handleConfirm}
          isLoading={confirming}
          disabled={confirming || !selectedPlataId}
          className="w-full sm:w-auto"
        >
          Confirmă manual
        </Button>
        <Button
          variant="secondary"
          onClick={handleIgnore}
          isLoading={ignoring}
          disabled={ignoring || confirming}
          className="w-full sm:w-auto"
        >
          Ignoră
        </Button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const SMSIncasari: React.FC<SMSIncasariProps> = ({
  clubId,
  onUnmatchedCountChange,
}) => {
  const { showError, showSuccess } = useError();

  const [records, setRecords] = useState<SmsIncoming[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('nerecunoscute');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_incoming')
        .select('*')
        .eq('club_id', clubId)
        .order('received_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data ?? []) as SmsIncoming[];
      setRecords(rows);

      const unmatched = rows.filter(r => r.status === 'unmatched').length;
      onUnmatchedCountChange?.(unmatched);
    } catch (err: any) {
      showError('Eroare la încărcare SMS', err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId, showError, onUnmatchedCountChange]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleConfirm = async (smsId: string, plataId: string) => {
    try {
      // Update plata → Achitat
      const { error: errPlata } = await supabase
        .from('plati')
        .update({ status: 'Achitat' })
        .eq('id', plataId);
      if (errPlata) throw errPlata;

      // Update sms → manual_matched
      const { error: errSms } = await supabase
        .from('sms_incoming')
        .update({ status: 'manual_matched', plata_id: plataId })
        .eq('id', smsId);
      if (errSms) throw errSms;

      showSuccess('Confirmat', 'Plata a fost marcată ca achitată și SMS-ul potrivit.');
      setExpandedId(null);
      await fetchRecords();
    } catch (err: any) {
      showError('Eroare la confirmare', err.message);
    }
  };

  const handleIgnore = async (smsId: string) => {
    try {
      const { error } = await supabase
        .from('sms_incoming')
        .update({ status: 'ignored' })
        .eq('id', smsId);
      if (error) throw error;

      showSuccess('Ignorat', 'SMS-ul a fost marcat ca ignorat.');
      setExpandedId(null);
      await fetchRecords();
    } catch (err: any) {
      showError('Eroare la ignorare', err.message);
    }
  };

  const handleRowClick = (record: SmsIncoming) => {
    if (record.status !== 'unmatched') return;
    setExpandedId(prev => (prev === record.id ? null : record.id));
  };

  // ── Filtered records ───────────────────────────────────────────────────────

  const filtered = records.filter(r => {
    if (filter === 'nerecunoscute') return r.status === 'unmatched';
    if (filter === 'potrivite') return r.status === 'matched' || r.status === 'manual_matched';
    return true;
  });

  const unmatchedCount = records.filter(r => r.status === 'unmatched').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in-down">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Încasări SMS Bancă</h2>
          {unmatchedCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {unmatchedCount}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={fetchRecords}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? 'Se actualizează...' : 'Actualizează'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/60 w-fit">
        {(
          [
            { key: 'nerecunoscute', label: 'Nerecunoscute' },
            { key: 'potrivite', label: 'Potrivite' },
            { key: 'toate', label: 'Toate' },
          ] as { key: FilterTab; label: string }[]
        ).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filter === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            {tab.label}
            {tab.key === 'nerecunoscute' && unmatchedCount > 0 && (
              <span className="ml-1.5 text-xs bg-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded-full">
                {unmatchedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading spinner */}
      {loading && (
        <Card className="flex items-center justify-center py-12">
          <svg
            className="animate-spin h-6 w-6 text-indigo-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-3 text-slate-400 text-sm">Se încarcă SMS-urile...</span>
        </Card>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <svg
            className="h-10 w-10 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
          <p className="text-slate-400 text-sm">
            {filter === 'nerecunoscute'
              ? 'Niciun SMS nerecunoscut.'
              : filter === 'potrivite'
              ? 'Niciun SMS potrivit.'
              : 'Niciun SMS primit.'}
          </p>
        </Card>
      )}

      {/* Desktop table — hidden on mobile */}
      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold">Ora primirii</th>
                  <th className="px-4 py-3 text-left font-semibold">Bancă</th>
                  <th className="px-4 py-3 text-right font-semibold">Sumă</th>
                  <th className="px-4 py-3 text-left font-semibold">Plătitor</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Conf. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filtered.map(record => (
                  <React.Fragment key={record.id}>
                    <tr
                      onClick={() => handleRowClick(record)}
                      className={`transition-colors ${
                        record.status === 'unmatched'
                          ? 'cursor-pointer hover:bg-slate-700/40'
                          : 'cursor-default'
                      } ${expandedId === record.id ? 'bg-slate-700/30' : 'bg-slate-800/30'}`}
                    >
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {formatReceivedAt(record.received_at)}
                        {record.status === 'unmatched' && (
                          <span className="ml-2 text-slate-500 text-xs">
                            {expandedId === record.id ? '▲' : '▼'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BancaBadge banca={record.banca_detectata} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                        <span
                          className={
                            record.suma_detectata !== null && record.suma_detectata > 0
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }
                        >
                          {formatCurrency(record.suma_detectata)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">
                        {record.platitor_detectat ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {record.confidence !== null ? `${record.confidence}%` : '—'}
                      </td>
                    </tr>
                    {expandedId === record.id && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <ExpandedRow
                            sms={record}
                            clubId={clubId}
                            onConfirm={handleConfirm}
                            onIgnore={handleIgnore}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — shown only on mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map(record => (
              <div key={record.id} className="rounded-xl border border-slate-700/60 overflow-hidden">
                <div
                  onClick={() => handleRowClick(record)}
                  className={`p-4 space-y-3 ${
                    record.status === 'unmatched'
                      ? 'cursor-pointer active:bg-slate-700/40'
                      : 'cursor-default'
                  } bg-slate-800/50`}
                >
                  {/* Top row: time + badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-slate-300 text-sm font-medium">
                      {formatReceivedAt(record.received_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      <BancaBadge banca={record.banca_detectata} />
                      <StatusBadge status={record.status} />
                    </div>
                  </div>

                  {/* Sumă + Plătitor */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-mono font-semibold ${
                        record.suma_detectata !== null && record.suma_detectata > 0
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {formatCurrency(record.suma_detectata)}
                    </span>
                    <span className="text-slate-400 text-sm truncate max-w-[55%] text-right">
                      {record.platitor_detectat ?? '—'}
                    </span>
                  </div>

                  {/* Confidence + expand hint */}
                  <div className="flex items-center justify-between">
                    {record.confidence !== null ? (
                      <span className="text-xs text-slate-500">
                        Conf: {record.confidence}%
                      </span>
                    ) : (
                      <span />
                    )}
                    {record.status === 'unmatched' && (
                      <span className="text-xs text-indigo-400 font-medium">
                        {expandedId === record.id ? 'Închide ▲' : 'Potrivește ▼'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded row on mobile */}
                {expandedId === record.id && (
                  <ExpandedRow
                    sms={record}
                    clubId={clubId}
                    onConfirm={handleConfirm}
                    onIgnore={handleIgnore}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer count */}
      {!loading && records.length > 0 && (
        <p className="text-xs text-slate-500 text-right">
          {filtered.length} înregistrări afișate din {records.length} totale
        </p>
      )}
    </div>
  );
};
