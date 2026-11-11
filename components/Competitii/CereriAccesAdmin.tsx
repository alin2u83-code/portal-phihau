import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { Button, Card, Badge, Modal, EmptyState } from '../ui';
import { useEsteProprietar } from '../../hooks/useEsteProprietar';

interface Props {
  competitieId: string;
}

interface CerereAcces {
  id: string;
  email: string;
  nume: string;
  mesaj: string | null;
  status: 'in_asteptare' | 'aprobata' | 'respinsa';
  motiv_respingere: string | null;
  created_at: string;
  procesat_la: string | null;
  club: { nume: string } | null;
}

const MOTIV_MAX = 300;
const STATUS_BADGE: Record<CerereAcces['status'], { label: string; variant: 'amber' | 'green' | 'red' }> = {
  in_asteptare: { label: 'În așteptare', variant: 'amber' },
  aprobata: { label: 'Aprobată', variant: 'green' },
  respinsa: { label: 'Respinsă', variant: 'red' },
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ro-RO') : '—');

export const CereriAccesAdmin: React.FC<Props> = ({ competitieId }) => {
  const { showError, showSuccess } = useError();
  const [cereri, setCereri] = useState<CerereAcces[]>([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiat, setCopiat] = useState(false);
  const [confirmAproba, setConfirmAproba] = useState<CerereAcces | null>(null);
  const [respinge, setRespinge] = useState<CerereAcces | null>(null);
  const [motiv, setMotiv] = useState('');
  const [confirmSterge, setConfirmSterge] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  // doar afișare; endpoint-ul refuză oricum non-proprietarul
  const esteProprietar = useEsteProprietar();
  const link = `${window.location.origin}/competitie/${competitieId}`;

  const incarca = useCallback(async () => {
    const c = await supabase
      .from('cereri_acces_competitie')
      .select('id, email, nume, mesaj, status, motiv_respingere, created_at, procesat_la, club:club_id(nume)')
      .eq('competitie_id', competitieId)
      .order('created_at', { ascending: false });
    if (c.error) {
      setEroare('Nu s-au putut încărca datele de acces extern.');
    } else {
      setEroare(null);
      const lista = (c.data ?? []) as unknown as CerereAcces[];
      // în așteptare primele; sortarea e stabilă, deci ordinea după dată se păstrează
      setCereri([...lista].sort((a, b) => Number(b.status === 'in_asteptare') - Number(a.status === 'in_asteptare')));
    }
    setLoading(false);
  }, [competitieId]);

  useEffect(() => { incarca(); }, [incarca]);

  // clipboard fără await înainte de setState (feedback_react_clipboard_await_setstate_timing)
  const copiaza = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).catch(() => {});
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } else {
      linkRef.current?.select();
    }
  };

  const proceseaza = async (cerere: CerereAcces, actiune: 'aproba' | 'respinge', motivText?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showError('Acces extern', 'Sesiune expirată. Reautentifică-te.');
        return;
      }
      const res = await fetch('/api/aproba-cerere-acces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ cerere_id: cerere.id, actiune, motiv: motivText || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409/403: mesajul serverului (club cu cont, email existent, cerere deja procesată, doar proprietar)
        showError('Acces extern', body?.error || 'Cererea nu a putut fi procesată.');
      } else {
        showSuccess('Acces extern', actiune === 'aproba' ? 'Cererea a fost aprobată.' : 'Cererea a fost respinsă.');
      }
      setConfirmAproba(null);
      setRespinge(null);
      setMotiv('');
      await incarca();
    } catch (err) {
      showError('Acces extern', err);
    } finally {
      setBusy(false);
    }
  };

  const stergeInAsteptare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('sterge_cereri_in_asteptare', { p_competitie: competitieId });
      if (error) throw error;
      showSuccess('Acces extern', `${data ?? 0} cereri în așteptare au fost șterse.`);
      setConfirmSterge(false);
      await incarca();
    } catch (err) {
      showError('Acces extern', err);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-center text-slate-500 py-8 text-sm animate-pulse">Se încarcă...</div>;

  return (
    <div className="flex flex-col gap-4">
      {eroare && <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300">{eroare}</div>}

      <Card className="p-4 space-y-2">
        <h3 className="text-base font-semibold text-white">Link de acces extern</h3>
        <div className="flex gap-2">
          <input ref={linkRef} readOnly value={link} onFocus={e => e.currentTarget.select()}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200" />
          <Button type="button" variant="secondary" onClick={copiaza}>{copiat ? 'Copiat!' : 'Copiază linkul'}</Button>
        </div>
        <p className="text-xs text-slate-400">
          Linkul nu dă acces singur. Intră contul de competiție al clubului (creat de administratorul aplicației) sau administratorii/instructorii clubului. Emailul de autentificare conține un cod, nu un link.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white">Cereri de acces</h3>
          {cereri.some(c => c.status === 'in_asteptare') && (
            <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => setConfirmSterge(true)}>
              Șterge cererile în așteptare
            </Button>
          )}
        </div>
        {cereri.length === 0 ? (
          <EmptyState title="Nu există cereri de acces." />
        ) : (
          cereri.map(c => (
            <div key={c.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white break-words">{c.nume}</p>
                  <p className="text-xs text-slate-400 break-all">{c.email}</p>
                  <p className="text-xs text-slate-400">{c.club?.nume ?? '—'} · {fmt(c.created_at)}</p>
                </div>
                <Badge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</Badge>
              </div>
              {c.mesaj && <p className="text-xs text-slate-300 whitespace-pre-wrap break-words">{c.mesaj}</p>}
              {c.status === 'respinsa' && c.motiv_respingere && (
                <p className="text-xs text-red-300 break-words">Motiv: {c.motiv_respingere}</p>
              )}
              {c.status === 'in_asteptare' && (
                <div className="flex flex-wrap items-center gap-2">
                  {esteProprietar && (
                    <>
                      <Button type="button" size="sm" variant="success" disabled={busy} onClick={() => setConfirmAproba(c)}>Aprobă</Button>
                      <span className="text-xs text-slate-400">Aprobarea creează contul de competiție al clubului.</span>
                    </>
                  )}
                  <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => { setMotiv(''); setRespinge(c); }}>Respinge</Button>
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      <Modal isOpen={!!confirmAproba} onClose={() => !busy && setConfirmAproba(null)} title="Aprobă cererea">
        <p className="text-sm text-slate-300 mb-4">
          Se creează contul de competiție al clubului {confirmAproba?.club?.nume ?? '—'} cu emailul {confirmAproba?.email}. Clubul trebuie să nu aibă deja cont.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmAproba(null)}>Anulează</Button>
          <Button type="button" variant="success" isLoading={busy} disabled={busy} onClick={() => confirmAproba && proceseaza(confirmAproba, 'aproba')}>Aprobă</Button>
        </div>
      </Modal>

      <Modal isOpen={!!respinge} onClose={() => !busy && setRespinge(null)} title="Respinge cererea">
        <label className="block text-sm text-slate-300 mb-1" htmlFor="motiv-respingere">Motiv (opțional)</label>
        <textarea id="motiv-respingere" value={motiv} maxLength={MOTIV_MAX} rows={3}
          onChange={e => setMotiv(e.target.value)}
          className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-slate-200" />
        <p className="text-xs text-slate-500 text-right mb-4">{motiv.length}/{MOTIV_MAX}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setRespinge(null)}>Anulează</Button>
          <Button type="button" variant="danger" isLoading={busy} disabled={busy} onClick={() => respinge && proceseaza(respinge, 'respinge', motiv.trim())}>Respinge</Button>
        </div>
      </Modal>

      <Modal isOpen={confirmSterge} onClose={() => !busy && setConfirmSterge(false)} title="Șterge cererile în așteptare">
        <p className="text-sm text-slate-300 mb-4">
          Se șterg definitiv toate cererile aflate în așteptare la această competiție (inclusiv cele legitime). Cererile aprobate și respinse rămân.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmSterge(false)}>Anulează</Button>
          <Button type="button" variant="danger" isLoading={busy} disabled={busy} onClick={stergeInAsteptare}>Șterge</Button>
        </div>
      </Modal>

    </div>
  );
};
