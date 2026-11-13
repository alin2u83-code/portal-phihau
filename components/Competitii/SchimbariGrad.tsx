import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { useError } from '../ErrorProvider';
import { Button, Card, Badge, EmptyState, Select } from '../ui';

interface Props {
  competitieId: string;
  /** doar super admin federatie poate marca achitat (RPC reverifica) */
  poateMarca: boolean;
}

interface RandSchimbare {
  id: string;
  created_at: string;
  sportiv_id: string;
  club_id: string;
  competitie_id: string;
  grad_vechi_id: string | null;
  grad_nou_id: string;
  tip: 'echivalare' | 'promovare';
  taxa: number | null;
  achitat_la: string | null;
  anulat_la: string | null;
  motiv: string | null;
  actor_nume: string | null;
  sportiv: { nume: string; prenume: string } | null;
  competitie: { denumire: string } | null;
}

const fmtDataOra = (d: string) =>
  new Date(d).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Faza 40 (D-15): schimbarile de grad facute din conturile de competitie, pentru federatie. Taxa e un memento, nu factura (D-12).
export const SchimbariGrad: React.FC<Props> = ({ competitieId, poateMarca }) => {
  const { clubs, grade } = useData() as any;
  const { showError, showSuccess } = useError();
  const [doarCompetitia, setDoarCompetitia] = useState(true);
  const [clubFiltru, setClubFiltru] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // fara filtrare pe rol in client: RLS (sgc_select_federatie / sgc_select_club) decide ce se vede
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['schimbari-grad', competitieId, doarCompetitia],
    queryFn: async (): Promise<RandSchimbare[]> => {
      let q = supabase
        .from('schimbari_grad_competitie')
        .select('id, created_at, sportiv_id, club_id, competitie_id, grad_vechi_id, grad_nou_id, tip, taxa, achitat_la, anulat_la, motiv, actor_nume, sportiv:sportivi(nume, prenume), competitie:competitii(denumire)');
      if (doarCompetitia) q = q.eq('competitie_id', competitieId);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as RandSchimbare[];
    },
  });

  const numeClub = (id: string) => clubs?.find((c: any) => c.id === id)?.nume ?? '—';
  const numeGrad = (id: string | null) => (id ? grade?.find((g: any) => g.id === id)?.nume ?? '—' : 'fără grad');

  const cluburiInDate = useMemo(() => Array.from(new Set((data ?? []).map(r => r.club_id))), [data]);
  const randuri = useMemo(() => (data ?? []).filter(r => !clubFiltru || r.club_id === clubFiltru), [data, clubFiltru]);

  const deAchitat = (r: RandSchimbare) => r.tip === 'promovare' && !r.anulat_la && !r.achitat_la;
  const nepla = randuri.filter(deAchitat);
  const totalCunoscut = nepla.reduce((s, r) => s + (r.taxa ?? 0), 0);
  const faraTaxa = nepla.filter(r => r.taxa === null).length;

  const marcheaza = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      const { error } = await supabase.rpc('marcheaza_schimbare_grad_achitata', { p_schimbare: id });
      if (error) throw error;
      showSuccess('Schimbări grad', 'Marcat achitat.');
      await refetch();
    } catch (err) {
      showError('Schimbări grad', err);
    } finally {
      setBusyId(null);
    }
  };

  const numeSportiv = (r: RandSchimbare) => (r.sportiv ? `${r.sportiv.nume} ${r.sportiv.prenume}` : '—');

  const taxaText = (r: RandSchimbare) => (r.tip === 'echivalare' ? '—' : r.taxa === null ? 'necunoscută' : `${r.taxa} RON`);

  const badgeuri = (r: RandSchimbare) => (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={r.tip === 'echivalare' ? 'blue' : 'amber'}>{r.tip === 'echivalare' ? 'Echivalare' : 'Promovare'}</Badge>
      {r.anulat_la ? <Badge variant="red">Anulată</Badge>
        : r.achitat_la ? <Badge variant="green">Achitat</Badge>
        : r.tip === 'promovare' ? <Badge variant="amber">De achitat</Badge> : null}
    </div>
  );

  const buton = (r: RandSchimbare) => poateMarca && deAchitat(r) && (
    <Button size="sm" variant="success" onClick={() => marcheaza(r.id)} disabled={busyId === r.id} className="min-h-10">
      {busyId === r.id ? 'Se salvează…' : 'Marchează achitat'}
    </Button>
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-white">Schimbări grad</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Schimbările de grad făcute de cluburi din zona de competiție. Taxa este un memento; nu se emite factură.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
        <Select label="Competiție" value={doarCompetitia ? 'una' : 'toate'} onChange={e => setDoarCompetitia(e.target.value === 'una')}>
          <option value="una">Această competiție</option>
          <option value="toate">Toate competițiile</option>
        </Select>
        <Select label="Club" value={clubFiltru} onChange={e => setClubFiltru(e.target.value)}>
          <option value="">Toate cluburile</option>
          {cluburiInDate.map(id => <option key={id} value={id}>{numeClub(id)}</option>)}
        </Select>
        <div className="flex flex-wrap items-center gap-2 min-h-10">
          <Badge variant={nepla.length > 0 ? 'amber' : 'slate'}>De achitat: {nepla.length}</Badge>
          {nepla.length > 0 && (
            <span className="text-xs text-slate-300">
              Total cunoscut: {totalCunoscut} RON{faraTaxa > 0 ? ` (${faraTaxa} fără taxă)` : ''}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Se încarcă...</p>
      ) : error ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-red-400">Nu s-au putut încărca schimbările de grad.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Reîncearcă</Button>
          </div>
        </Card>
      ) : !randuri.length ? (
        <EmptyState title="Nicio schimbare de grad din conturile de competiție." />
      ) : (
        <>
          {/* mobil: carduri */}
          <div className="space-y-2 md:hidden">
            {randuri.map(r => (
              <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">{numeSportiv(r)}</p>
                  {badgeuri(r)}
                </div>
                <p className="text-xs text-slate-300">{numeClub(r.club_id)}{!doarCompetitia && r.competitie ? ` · ${r.competitie.denumire}` : ''}</p>
                <p className="text-sm text-slate-200">{numeGrad(r.grad_vechi_id)} → {numeGrad(r.grad_nou_id)}</p>
                <p className="text-xs text-slate-400">Taxă: {taxaText(r)} · Autor declarat: {r.actor_nume ?? '—'} · {fmtDataOra(r.created_at)}</p>
                {r.anulat_la && r.motiv && <p className="text-xs text-slate-400">Motiv anulare: {r.motiv}</p>}
                {buton(r) && <div className="flex justify-end">{buton(r)}</div>}
              </div>
            ))}
          </div>

          {/* de la md: tabel */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="p-2">Data și ora</th>
                  <th className="p-2">Sportiv</th>
                  <th className="p-2">Club{!doarCompetitia ? ' / competiție' : ''}</th>
                  <th className="p-2">Grad</th>
                  <th className="p-2">Tip / stare</th>
                  <th className="p-2">Taxă</th>
                  <th className="p-2">Autor declarat</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {randuri.map(r => (
                  <tr key={r.id} className="border-t border-slate-700/60 align-top">
                    <td className="p-2 whitespace-nowrap text-slate-300">{fmtDataOra(r.created_at)}</td>
                    <td className="p-2 text-white">{numeSportiv(r)}</td>
                    <td className="p-2 text-slate-300">
                      {numeClub(r.club_id)}
                      {!doarCompetitia && r.competitie && <div className="text-xs text-slate-400">{r.competitie.denumire}</div>}
                    </td>
                    <td className="p-2 text-slate-200">{numeGrad(r.grad_vechi_id)} → {numeGrad(r.grad_nou_id)}</td>
                    <td className="p-2">
                      {badgeuri(r)}
                      {r.anulat_la && r.motiv && <div className="text-xs text-slate-400 mt-1">Motiv: {r.motiv}</div>}
                    </td>
                    <td className="p-2 text-slate-300 whitespace-nowrap">{taxaText(r)}</td>
                    <td className="p-2 text-white">{r.actor_nume ?? '—'}</td>
                    <td className="p-2">{buton(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
