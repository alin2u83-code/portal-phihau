import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Club } from '../../types';
import { Button, Card, Input, Select } from '../ui';
import { useError } from '../ErrorProvider';
import { usePermissions } from '../../hooks/usePermissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsConfig {
  id?: string;
  club_id: string;
  provider: 'android_gateway' | 'smslink';
  gateway_url: string;
  api_key: string;
  telefon_sender: string;
  nickname: string;
  gateway_device_id: string;
  status: 'unconfigured' | 'connected' | 'error';
  last_check_at: string | null;
  last_error: string | null;
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  activ: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

interface SMSConfigurareProps {
  /** Club ID setat din exterior (de la ADMIN_CLUB sau selectat de SUPER_ADMIN) */
  clubId: string;
  /** Lista tuturor cluburilor — necesară pentru selectorul SUPER_ADMIN */
  clubs?: Club[];
  /** Context rol activ, transmis din App.tsx — același pattern ca în AdminConsole */
  activeRoleContext: any | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultConfig = (club_id: string): SmsConfig => ({
  club_id,
  provider: 'android_gateway',
  gateway_url: '',
  api_key: '',
  telefon_sender: '',
  nickname: '',
  gateway_device_id: '',
  status: 'unconfigured',
  last_check_at: null,
  last_error: null,
  rate_limit_per_hour: 20,
  rate_limit_per_day: 100,
  activ: true,
});

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ro-RO', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Badge Status ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: SmsConfig['status'] }> = ({ status }) => {
  const map: Record<SmsConfig['status'], { cls: string; label: string }> = {
    connected: { cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', label: 'Conectat' },
    error: { cls: 'bg-rose-500/20 text-rose-400 border border-rose-500/30', label: 'Eroare' },
    unconfigured: { cls: 'bg-slate-700/60 text-slate-400 border border-slate-600/40', label: 'Neconfigurat' },
  };
  const { cls, label } = map[status] ?? map.unconfigured;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-emerald-400' : status === 'error' ? 'bg-rose-400' : 'bg-slate-500'
        }`}
      />
      {label}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SMSConfigurare: React.FC<SMSConfigurareProps> = ({
  clubId: initialClubId,
  clubs = [],
  activeRoleContext,
}) => {
  const { showError, showSuccess } = useError();
  const permissions = usePermissions(activeRoleContext);

  // SUPER_ADMIN poate comuta clubul
  const [selectedClubId, setSelectedClubId] = useState<string>(initialClubId);

  const [config, setConfig] = useState<SmsConfig>(defaultConfig(selectedClubId));
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  // Test conexiune
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // ── Fetch config ────────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async (club_id: string) => {
    setLoadingConfig(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase
        .from('sms_config')
        .select('*')
        .eq('club_id', club_id)
        .maybeSingle();

      if (error) throw error;
      setConfig(data ? { ...defaultConfig(club_id), ...data } : defaultConfig(club_id));
    } catch (err: any) {
      showError('Eroare la încărcare', err.message);
      setConfig(defaultConfig(club_id));
    } finally {
      setLoadingConfig(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchConfig(selectedClubId);
  }, [selectedClubId, fetchConfig]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    if (!selectedClubId) return;
    setSaving(true);
    try {
      const payload: Omit<SmsConfig, 'id'> = {
        club_id: selectedClubId,
        provider: config.provider,
        gateway_url: config.gateway_url,
        api_key: config.api_key,
        telefon_sender: config.telefon_sender,
        nickname: config.nickname,
        gateway_device_id: config.gateway_device_id,
        status: config.status,
        last_check_at: config.last_check_at,
        last_error: config.last_error,
        rate_limit_per_hour: config.rate_limit_per_hour,
        rate_limit_per_day: config.rate_limit_per_day,
        activ: config.activ,
      };

      if (config.id) {
        // UPDATE
        const { error } = await supabase
          .from('sms_config')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('sms_config')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      showSuccess('Salvat', 'Configurarea SMS a fost salvată cu succes.');
    } catch (err: any) {
      showError('Eroare la salvare', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedClubId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/sms-test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: selectedClubId, test_phone: testPhone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Eroare server');
      setTestResult({
        success: json.success ?? true,
        message: json.message || 'Conexiune reușită',
        latency_ms: json.latency_ms,
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const clubName =
    clubs.find(c => c.id === selectedClubId)?.nume ?? selectedClubId;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-down">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Configurare Gateway SMS</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Setări conexiune Android SMS pentru{' '}
            <span className="text-slate-300 font-medium">{clubName}</span>
          </p>
        </div>

        {/* Selector club — doar SUPER_ADMIN */}
        {permissions.isSuperAdmin && clubs.length > 0 && (
          <div className="w-full sm:w-64">
            <Select
              label="Club"
              value={selectedClubId}
              onChange={e => setSelectedClubId(e.target.value)}
            >
              {clubs.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nume}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {loadingConfig ? (
        <Card className="flex items-center justify-center py-16">
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
          <span className="ml-3 text-slate-400 text-sm">Se încarcă configurarea...</span>
        </Card>
      ) : (
        <>
          {/* ── Secțiunea 1: Status live ─────────────────────────────────── */}
          <Card>
            <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider border-b border-slate-700/60 pb-2">
              Status Gateway
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Stare curentă:</span>
                <StatusBadge status={config.status} />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-400">
                <span>
                  Ultima verificare:{' '}
                  <span className="text-slate-300">{formatDate(config.last_check_at)}</span>
                </span>
                {config.last_error && (
                  <span className="text-rose-400 truncate max-w-xs" title={config.last_error}>
                    Eroare: {config.last_error}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* ── Secțiunea 2: Conexiune ───────────────────────────────────── */}
          <Card>
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-wider border-b border-slate-700/60 pb-2">
              Conexiune
            </h3>
            <div className="space-y-4">
              {/* Provider + Nickname — 2 coloane pe md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Provider"
                  name="provider"
                  value={config.provider}
                  onChange={handleChange}
                >
                  <option value="android_gateway">Android Gateway</option>
                  <option value="smslink">SMSLink</option>
                </Select>
                <Input
                  label="Nickname (etichetă internă)"
                  name="nickname"
                  value={config.nickname}
                  onChange={handleChange}
                  placeholder="ex: Gateway Club Central"
                />
              </div>

              {/* Gateway URL */}
              <Input
                label="Gateway URL"
                name="gateway_url"
                value={config.gateway_url}
                onChange={handleChange}
                placeholder="https://192.168.1.x:8080"
                type="url"
              />

              {/* API Key */}
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                  API Key / Parolă
                </label>
                <input
                  name="api_key"
                  type="password"
                  value={config.api_key}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm touch-manipulation appearance-none"
                />
              </div>

              {/* Telefon Sender + Device ID — 2 coloane pe md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Telefon Sender"
                  name="telefon_sender"
                  value={config.telefon_sender}
                  onChange={handleChange}
                  placeholder="+40740000000"
                />
                <Input
                  label="Gateway Device ID"
                  name="gateway_device_id"
                  value={config.gateway_device_id}
                  onChange={handleChange}
                  placeholder="ex: device_1"
                />
              </div>
            </div>
          </Card>

          {/* ── Secțiunea 3: Rate Limiting ───────────────────────────────── */}
          <Card>
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-wider border-b border-slate-700/60 pb-2">
              Rate Limiting
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                  Limită per oră (max 100)
                </label>
                <input
                  name="rate_limit_per_hour"
                  type="number"
                  min={1}
                  max={100}
                  value={config.rate_limit_per_hour}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm touch-manipulation appearance-none"
                />
              </div>
              <div className="w-full">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                  Limită per zi (max 500)
                </label>
                <input
                  name="rate_limit_per_day"
                  type="number"
                  min={1}
                  max={500}
                  value={config.rate_limit_per_day}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm touch-manipulation appearance-none"
                />
              </div>
            </div>
          </Card>

          {/* ── Testare conexiune ────────────────────────────────────────── */}
          <Card>
            <h3 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-wider border-b border-slate-700/60 pb-2">
              Testează Conexiunea
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="w-full sm:w-64">
                <Input
                  label="Telefon test"
                  name="test_phone"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="+40740000000"
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleTest}
                isLoading={testing}
                disabled={testing || !testPhone.trim()}
                className="w-full sm:w-auto"
              >
                Testează conexiunea
              </Button>
            </div>

            {testResult && (
              <div
                className={`mt-4 flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <span className="text-lg font-bold">{testResult.success ? '✓' : '✗'}</span>
                <span>{testResult.message}</span>
                {testResult.latency_ms !== undefined && (
                  <span className="ml-auto text-xs opacity-70">{testResult.latency_ms} ms</span>
                )}
              </div>
            )}
          </Card>

          {/* ── Buton Salvare ─────────────────────────────────────────────── */}
          <div className="flex justify-end pt-2 border-t border-slate-700/60">
            <Button
              variant="success"
              onClick={handleSave}
              isLoading={saving}
              className="w-full sm:w-auto"
            >
              Salvează Configurarea
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
