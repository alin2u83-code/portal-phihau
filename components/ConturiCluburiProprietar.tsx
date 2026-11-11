import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useData } from '../contexts/DataContext';
import { useError } from './ErrorProvider';
import { useEsteProprietar } from '../hooks/useEsteProprietar';
import { Button, Card, Badge, Modal, EmptyState, Input } from './ui';
import { listaConturiCluburi, creeazaContClub, schimbaEmailContClub } from '../services/accesExternService';

interface Props {
  onBack: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ro-RO') : '—');

type Operatie = { tip: 'creeaza' | 'schimba'; clubId: string; clubNume: string; emailCurent?: string };

export const ConturiCluburiProprietar: React.FC<Props> = ({ onBack }) => {
  const esteProprietar = useEsteProprietar();
  const { clubs } = useData();
  const { showError, showSuccess } = useError();
  const queryClient = useQueryClient();
  const [cautare, setCautare] = useState('');
  const [op, setOp] = useState<Operatie | null>(null);
  const [email, setEmail] = useState('');
  const [eroareEmail, setEroareEmail] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const { data: conturi = [], isLoading } = useQuery({
    queryKey: ['conturi-cluburi'],
    queryFn: async () => (await listaConturiCluburi()).data,
    enabled: esteProprietar,
  });

  const contPeClub = useMemo(() => new Map(conturi.map(c => [c.club_id, c])), [conturi]);
  const cluburiFiltrate = useMemo(() => {
    const q = cautare.trim().toLowerCase();
    return [...(clubs ?? [])]
      .filter((c: any) => !q || (c.nume ?? '').toLowerCase().includes(q))
      .sort((a: any, b: any) => (a.nume ?? '').localeCompare(b.nume ?? '', 'ro'));
  }, [clubs, cautare]);

  if (!esteProprietar) {
    return (
      <Card className="p-6 space-y-3">
        <p className="text-sm text-slate-300">Acces interzis. Ecranul este disponibil doar proprietarului aplicației.</p>
        <Button type="button" variant="secondary" onClick={onBack}>Înapoi</Button>
      </Card>
    );
  }

  const deschide = (o: Operatie) => { setEmail(''); setEroareEmail(undefined); setOp(o); };

  const confirma = async () => {
    if (!op || busy) return;
    const emailNorm = email.trim().toLowerCase();
    if (!EMAIL_RE.test(emailNorm)) { setEroareEmail('Introdu un email valid.'); return; }
    setBusy(true);
    try {
      const r = op.tip === 'creeaza'
        ? await creeazaContClub(op.clubId, emailNorm)
        : await schimbaEmailContClub(op.clubId, emailNorm);
      if (!r.ok) {
        // 409: club cu cont existent / email existent; mesajul vine de la server
        showError('Conturi cluburi', r.error ?? 'Operația nu a putut fi efectuată.');
        return;
      }
      showSuccess(
        'Conturi cluburi',
        r.avertisment === 'ban_esuat'
          ? 'Emailul a fost schimbat și accesul vechi a fost retras, dar blocarea vechiului cont a eșuat: reverifică-l manual.'
          : op.tip === 'creeaza' ? 'Contul de competiție a fost creat.' : 'Emailul contului a fost schimbat.'
      );
      setOp(null);
      await queryClient.invalidateQueries({ queryKey: ['conturi-cluburi'] });
    } catch (err) {
      showError('Conturi cluburi', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Conturi cluburi (competiție)</h2>
        <Button type="button" variant="secondary" onClick={onBack}>Înapoi</Button>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-300">
        Creează conturile pe rând, începând cu 1-2 cluburi pilot. Emailul primește doar coduri de autentificare.
      </div>

      <Input label="Caută club" id="cautare-club" value={cautare} onChange={e => setCautare(e.target.value)} placeholder="Nume club" />

      {isLoading ? (
        <div className="text-center text-slate-500 py-8 text-sm animate-pulse">Se încarcă...</div>
      ) : cluburiFiltrate.length === 0 ? (
        <EmptyState title="Niciun club găsit." />
      ) : (
        cluburiFiltrate.map((club: any) => {
          const cont = contPeClub.get(club.id);
          return (
            <Card key={club.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white break-words">{club.nume}</p>
                  {cont
                    ? <p className="text-xs text-slate-400 break-all">{cont.email} · creat {fmt(cont.creat_la)}</p>
                    : <p className="text-xs text-slate-500">Fără cont</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={cont ? 'green' : 'slate'}>{cont ? 'Cont activ' : 'Fără cont'}</Badge>
                  {/* Comutatorul Acordă/Retrage management vine aici în 39-15 (D-18) */}
                  {cont
                    ? <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => deschide({ tip: 'schimba', clubId: club.id, clubNume: club.nume, emailCurent: cont.email })}>Schimbă emailul</Button>
                    : <Button type="button" size="sm" variant="success" disabled={busy} onClick={() => deschide({ tip: 'creeaza', clubId: club.id, clubNume: club.nume })}>Creează cont</Button>}
                </div>
              </div>
            </Card>
          );
        })
      )}

      <Modal
        isOpen={!!op}
        onClose={() => !busy && setOp(null)}
        title={op?.tip === 'creeaza' ? 'Creează cont de competiție' : 'Schimbă emailul contului'}
      >
        <div className="space-y-3">
          <p className="text-sm text-white font-semibold">{op?.clubNume}</p>
          {op?.tip === 'schimba' && <p className="text-xs text-slate-400 break-all">Email curent: {op.emailCurent}</p>}
          <Input
            label={op?.tip === 'creeaza' ? 'Email' : 'Email nou'}
            id="email-cont-club"
            type="email"
            value={email}
            error={eroareEmail}
            disabled={busy}
            onChange={e => { setEmail(e.target.value); setEroareEmail(undefined); }}
          />
          {op?.tip === 'creeaza' ? (
            <p className="text-xs text-slate-400">
              Contul intră implicit în zona de competiție a clubului. Emailul nu trebuie să aparțină unui cont existent.
            </p>
          ) : (
            <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-xs text-amber-300">
              Persoana veche pierde imediat accesul; sesiunile și dispozitivul ei de încredere se invalidează. Istoricul modificărilor se păstrează.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setOp(null)}>Anulează</Button>
            <Button type="button" variant={op?.tip === 'creeaza' ? 'success' : 'danger'} isLoading={busy} disabled={busy} onClick={confirma}>
              {op?.tip === 'creeaza' ? 'Creează' : 'Schimbă'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
