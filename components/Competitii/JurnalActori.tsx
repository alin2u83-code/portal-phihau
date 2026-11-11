import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { useData } from '../../contexts/DataContext';
import { Button, Card, Badge, EmptyState } from '../ui';

interface Props {
  competitieId: string;
}

// date_vechi/date_noi nu se selecteaza (T-39-51): jurnalul arata doar cine, ce tip, cand, ce club
interface RandJurnalActor {
  id: string;
  created_at: string;
  tabel: string;
  operatie: string;
  rand_id: string | null;
  club_id: string | null;
  actor_nume: string;
  actor_din_lista: boolean | null;
}

const TABELE_JURNAL = [
  'inscrieri_competitie', 'echipe_competitie', 'echipa_sportivi', 'solicitari_echipe_incomplete',
  'cereri_coechipier', 'istoric_grade', 'competitie_sportiv_arme', 'sportiv_arme',
];

const ETICHETA_TABEL: Record<string, string> = {
  inscrieri_competitie: 'Înscriere',
  echipe_competitie: 'Echipă',
  echipa_sportivi: 'Membru echipă',
  solicitari_echipe_incomplete: 'Solicitare echipă incompletă',
  cereri_coechipier: 'Cerere coechipier',
  istoric_grade: 'Schimbare grad',
  competitie_sportiv_arme: 'Arme competiție',
  sportiv_arme: 'Arme sportiv',
};

const ETICHETA_OPERATIE: Record<string, string> = {
  INSERT: 'Adăugare',
  UPDATE: 'Modificare',
  DELETE: 'Ștergere',
};

const fmtDataOra = (d: string) =>
  new Date(d).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const JurnalActori: React.FC<Props> = ({ competitieId }) => {
  const { clubs } = useData() as any;

  // fara filtrare pe rol in client: RLS (audit_log_select_jurnal_club) decide ce vede fiecare (D-20)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['jurnal-cont-club', competitieId],
    queryFn: async (): Promise<RandJurnalActor[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, created_at, tabel, operatie, rand_id, club_id, actor_nume, actor_din_lista')
        .eq('competitie_id', competitieId)
        .in('tabel', TABELE_JURNAL)
        .not('actor_nume', 'is', null)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as RandJurnalActor[];
    },
  });

  const numeClub = (id: string | null) => (id ? clubs?.find((c: any) => c.id === id)?.nume ?? '—' : '—');

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-white">Jurnal cont club</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Autorul este declarat la intrarea în competiție din contul de competiție al clubului. Nu este verificat:
          jurnalul ajută la corectitudinea internă, nu este probă.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Se încarcă...</p>
      ) : error ? (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-red-400">Nu s-a putut încărca jurnalul.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Reîncearcă</Button>
          </div>
        </Card>
      ) : !data?.length ? (
        <EmptyState title="Nicio modificare din contul de club pentru această competiție." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
              <tr>
                <th className="p-2">Data și ora</th>
                <th className="p-2">Club</th>
                <th className="p-2">Acțiune</th>
                <th className="p-2">Autor declarat</th>
              </tr>
            </thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id} className="border-t border-slate-700/60">
                  <td className="p-2 whitespace-nowrap text-slate-300">{fmtDataOra(r.created_at)}</td>
                  <td className="p-2 text-slate-300">{numeClub(r.club_id)}</td>
                  <td className="p-2 text-slate-300">
                    {ETICHETA_OPERATIE[r.operatie?.toUpperCase()] ?? r.operatie} — {ETICHETA_TABEL[r.tabel] ?? r.tabel}
                  </td>
                  <td className="p-2 text-white">
                    {r.actor_nume}
                    {r.actor_din_lista === false && <Badge variant="amber" className="ml-2">nume liber</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
