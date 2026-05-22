import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Card } from '../ui';
import { useError } from '../ErrorProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SMSStatisticiProps {
  clubId: string;
}

interface Stats {
  totalTrimise: number;
  rataSucves: number;
  failed: number;
  platiConfirmate: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SMSStatistici: React.FC<SMSStatisticiProps> = ({ clubId }) => {
  const { showError } = useError();

  const [stats, setStats] = useState<Stats>({
    totalTrimise: 0,
    rataSucves: 0,
    failed: 0,
    platiConfirmate: 0,
  });
  const [loading, setLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const startMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      // Fetch 1: sms_queue — trimise luna curentă (status activ, nu pending/cancelled)
      const { data: queueData, error: queueError } = await supabase
        .from('sms_queue')
        .select('status')
        .eq('club_id', clubId)
        .gte('created_at', startMonth)
        .in('status', ['sent', 'sending', 'failed']);

      if (queueError) throw queueError;

      const queue = queueData ?? [];
      const totalTrimise = queue.length;
      const sentCount = queue.filter(r => r.status === 'sent').length;
      const failedCount = queue.filter(r => r.status === 'failed').length;
      const rataSucves =
        totalTrimise > 0 ? Math.round((sentCount / totalTrimise) * 100) : 0;

      // Fetch 2: sms_incoming — plăți auto-confirmate luna curentă
      const { data: incomingData, error: incomingError } = await supabase
        .from('sms_incoming')
        .select('id')
        .eq('club_id', clubId)
        .gte('received_at', startMonth)
        .in('status', ['matched', 'manual_matched']);

      if (incomingError) throw incomingError;

      const platiConfirmate = (incomingData ?? []).length;

      setStats({ totalTrimise, rataSucves, failed: failedCount, platiConfirmate });
    } catch (err: any) {
      showError('Eroare la încărcarea statisticilor SMS', err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId, showError]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const Spinner = () => (
    <svg
      className="animate-spin h-5 w-5 text-indigo-400"
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
  );

  return (
    <div className="space-y-4 animate-fade-in-down">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Statistici SMS</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Activitate luna curentă
        </p>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center py-16">
          <Spinner />
          <span className="ml-3 text-slate-400 text-sm">Se încarcă statisticile...</span>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1 — SMS Trimise */}
          <Card className="flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              SMS Trimise
            </p>
            <p className="text-3xl font-extrabold text-blue-400">
              {stats.totalTrimise}
            </p>
            <p className="text-xs text-slate-500">total luna curentă</p>
          </Card>

          {/* Card 2 — Rată Succes */}
          <Card className="flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Rată Succes
            </p>
            <p className="text-3xl font-extrabold text-emerald-400">
              {stats.rataSucves}%
            </p>
            <p className="text-xs text-slate-500">din SMS-urile trimise</p>
          </Card>

          {/* Card 3 — SMS Eșuate */}
          <Card className="flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              SMS Eșuate
            </p>
            <p
              className={`text-3xl font-extrabold ${
                stats.failed > 0 ? 'text-rose-400' : 'text-slate-500'
              }`}
            >
              {stats.failed}
            </p>
            <p className="text-xs text-slate-500">erori de trimitere</p>
          </Card>

          {/* Card 4 — Plăți Confirmate */}
          <Card className="flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Plăți Confirmate
            </p>
            <p className="text-3xl font-extrabold text-indigo-400">
              {stats.platiConfirmate}
            </p>
            <p className="text-xs text-slate-500">auto-confirmate din SMS bancă</p>
          </Card>
        </div>
      )}
    </div>
  );
};
