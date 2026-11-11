import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useData } from '../contexts/DataContext';
import { useError } from './ErrorProvider';
import { useEsteProprietar } from '../hooks/useEsteProprietar';
import { Button, Card, Badge, Modal, EmptyState, Input, Select } from './ui';
import {
  listaConturiCluburi, creeazaContClub, schimbaEmailContClub,
  incarcaManagementConturi, acordaManagementContClub, revocaManagementContClub, type RolManagementAcordabil,
} from '../services/accesExternService';

interface Props {
  onBack: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ro-RO') : '—');

const ETICHETA_ROL: Record<RolManagementAcordabil, string> = { INSTRUCTOR: 'Instructor', ADMIN_CLUB: 'Admin club' };

type OperatieManagement = { tip: 'acorda' | 'retrage'; clubId: string; clubNume: string };

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
  const [opMgmt, setOpMgmt] = useState<OperatieManagement | null>(null);
  const [rolMgmt, setRolMgmt] = useState<RolManagementAcordabil>('INSTRUCTOR');

  const { data: conturi = [], isLoading } = useQuery({
    queryKey: ['conturi-cluburi'],
    queryFn: async () => (await listaConturiCluburi()).data,
    enabled: esteProprietar,
  });

  const { data: management = [] } = useQuery({
    queryKey: ['management-conturi'],
    queryFn: async () => (await incarcaManagementConturi()).data,
    enabled: esteProprietar,
  });

  const mgmtPeClub = useMemo(() => new Map(management.map(m => [m.club_id, m])), [management]);
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

  const deschideMgmt = (o: OperatieManagement) => { setRolMgmt('INSTRUCTOR'); setOpMgmt(o); };

  const confirmaMgmt = async () => {
    if (!opMgmt || busy) return;
    setBusy(true);
    try {
      const { error } = opMgmt.tip === 'acorda'
        ? await acordaManagementContClub(opMgmt.clubId, rolMgmt)
        : await revocaManagementContClub(opMgmt.clubId);
      if (error) {
        const cod = error.code;
        showError('Conturi cluburi',
          cod === '23505' ? 'Clubul are deja management acordat.'
          : cod === '42501' ? 'Doar proprietarul aplicației poate gestiona managementul.'
          : cod === 'P0002' ? 'Clubul nu are management acordat.'
          : error);
        return;
      }
      showSuccess('Conturi cluburi', opMgmt.tip === 'acorda' ? 'Accesul la management a fost acordat.' : 'Accesul la management a fost retras.');
      setOpMgmt(null);
      await queryClient.invalidateQueries({ queryKey: ['management-conturi'] });
    } catch (err) {
      showError('Conturi cluburi', err);
    } finally {
      setBusy(false);
    }
  };

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
      const avert = r.avertisment ?? '';
      const mesaje = [
        avert.includes('ban_esuat') && 'Accesul vechi a fost retras, dar blocarea vechiului cont a eșuat: reverifică-l manual.',
        avert.includes('management_nemutat') && 'Managementul acordat nu a putut fi mutat pe noul email: retrage-l și acordă-l din nou.',
        avert.includes('rol_vechi_ramas') && 'Vechiul cont mai are rol de management până îi expiră sesiunea; verifică-l.',
      ].filter(Boolean);
      showSuccess(
        'Conturi cluburi',
        mesaje.length ? `Emailul a fost schimbat. ${mesaje.join(' ')}`
          : op.tip === 'creeaza' ? 'Contul de competiție a fost creat.' : 'Emailul contului a fost schimbat.'
      );
      await queryClient.invalidateQueries({ queryKey: ['management-conturi'] });
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
          const mgmt = mgmtPeClub.get(club.id);
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
                  {cont && mgmt && <Badge variant="amber">Management: {ETICHETA_ROL[mgmt.rol_denumire] ?? mgmt.rol_denumire}</Badge>}
                  {cont && mgmt?.user_vechi && <Badge variant="red">Management pe email vechi: retrage și acordă din nou</Badge>}
                  {cont && (mgmt
                    ? <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => deschideMgmt({ tip: 'retrage', clubId: club.id, clubNume: club.nume })}>Retrage management</Button>
                    : <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => deschideMgmt({ tip: 'acorda', clubId: club.id, clubNume: club.nume })}>Acordă management</Button>)}
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

      <Modal
        isOpen={!!opMgmt}
        onClose={() => !busy && setOpMgmt(null)}
        title={opMgmt?.tip === 'acorda' ? 'Acordă acces la management' : 'Retrage accesul la management'}
      >
        <div className="space-y-3">
          <p className="text-sm text-white font-semibold">{opMgmt?.clubNume}</p>
          {opMgmt?.tip === 'acorda' ? (
            <>
              <p className="text-xs text-slate-400">
                Contul de competiție al clubului {opMgmt.clubNume} va putea intra în managementul clubului, nu doar în competiții. Accesul se poate retrage oricând din acest ecran.
              </p>
              <Select label="Rol" id="rol-management-club" value={rolMgmt} disabled={busy} onChange={e => setRolMgmt(e.target.value as RolManagementAcordabil)}>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN_CLUB">Admin club</option>
              </Select>
            </>
          ) : (
            <p className="text-xs text-slate-400">
              Contul rămâne cu acces doar la competiții. Se șterge numai rolul acordat din acest ecran.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpMgmt(null)}>Anulează</Button>
            <Button type="button" variant={opMgmt?.tip === 'acorda' ? 'success' : 'danger'} isLoading={busy} disabled={busy} onClick={confirmaMgmt}>
              {opMgmt?.tip === 'acorda' ? 'Acordă' : 'Retrage'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
