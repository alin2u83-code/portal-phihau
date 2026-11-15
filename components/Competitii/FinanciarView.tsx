import React, { useState, useMemo } from 'react';
import { Competitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { useQuery } from '@tanstack/react-query';
import { construiesteRanduriPlata } from '../../utils/taxeCompetitie';
import { taxeDeReglatDupaMutari, type MutareCategorieAudit } from '../../utils/editareCompetitie';
import BannerDeRezolvat from './InscriereClubWizard/BannerDeRezolvat';

interface RandFinanciar {
  tip: 'individual' | 'echipa';
  id: string;
  sportivNume?: string;
  echipaNume?: string;
  categorieDenumire: string;
  probaDenumire: string;
  taxa: number;
  taxaAchitata: boolean;
  taxaAnulata: boolean;
}

interface ClubSituatie {
  clubId: string;
  numeClub: string;
  randuri: RandFinanciar[];
  totalCalculat: number;
  totalAchitat: number;
  /** Achitat pe categorii anulate (de realocat / returnat). */
  totalAchitatAnulat: number;
}

export interface FinanciarViewProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  onRefresh: () => void;
}

export const FinanciarView: React.FC<FinanciarViewProps> = ({
  competitie, categorii, inscrieri, echipe, onRefresh,
}) => {
  const { showError } = useError();
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const situatie = useMemo<ClubSituatie[]>(() => {
    const map = new Map<string, ClubSituatie>();
    // O singură regulă de taxă (inclusiv taxa anulată, Faza 41 D-08) — aceeași ca în Raport și Taxe club
    for (const r of construiesteRanduriPlata(competitie, categorii, [], inscrieri, echipe).randuri) {
      if (!map.has(r.clubId)) {
        map.set(r.clubId, { clubId: r.clubId, numeClub: r.clubNume || r.clubId, randuri: [], totalCalculat: 0, totalAchitat: 0, totalAchitatAnulat: 0 });
      }
      const club = map.get(r.clubId)!;
      club.randuri.push({
        tip: r.tip,
        id: r.id,
        ...(r.tip === 'individual' ? { sportivNume: r.numeParticipant } : { echipaNume: r.numeParticipant }),
        categorieDenumire: r.categorieDenumire,
        probaDenumire: r.probaDenumire,
        taxa: r.taxa,
        taxaAchitata: r.taxaAchitata,
        taxaAnulata: r.taxaAnulata,
      });
      if (r.taxaAnulata) {
        if (r.taxaAchitata) club.totalAchitatAnulat += r.taxa;
        continue;
      }
      club.totalCalculat += r.taxa;
      if (r.taxaAchitata) club.totalAchitat += r.taxa;
    }

    return Array.from(map.values()).sort((a, b) => a.numeClub.localeCompare(b.numeClub));
  }, [inscrieri, echipe, categorii, competitie]);

  // D-09: mutarile de categorie se citesc din audit_log (UPDATE cu categorie_id diferit); nimic nu se scrie, nu se recalculeaza, nu se factureaza
  const { data: mutari, error: eroareMutari } = useQuery({
    queryKey: ['taxe-de-reglat', competitie.id],
    staleTime: 0,
    queryFn: async (): Promise<MutareCategorieAudit[]> => {
      const out: MutareCategorieAudit[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase.from('audit_log')
          .select('rand_id, tabel, created_at, cat_veche:date_vechi->>categorie_id, cat_noua:date_noi->>categorie_id')
          .eq('competitie_id', competitie.id)
          .in('tabel', ['inscrieri_competitie', 'echipe_competitie'])
          .eq('operatie', 'UPDATE')
          .order('created_at', { ascending: true })
          .range(de, de + 999);
        if (error) throw error;
        for (const r of (data ?? []) as any[]) {
          if (r.rand_id && r.cat_veche && r.cat_noua && r.cat_veche !== r.cat_noua) {
            out.push({ tip: r.tabel === 'echipe_competitie' ? 'echipa' : 'inscriere', id: r.rand_id, categorieVeche: r.cat_veche, categorieNoua: r.cat_noua, data: r.created_at });
          }
        }
        if ((data?.length ?? 0) < 1000) return out;
      }
    },
  });

  const toggleExpand = (clubId: string) => {
    setExpandedClubs(prev => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId); else next.add(clubId);
      return next;
    });
  };

  const toggleTaxaAchitata = async (rand: RandFinanciar) => {
    const key = rand.id;
    setUpdatingIds(prev => new Set(prev).add(key));
    try {
      const tabel = rand.tip === 'individual' ? 'inscrieri_competitie' : 'echipe_competitie';
      const { data, error } = await supabase.from(tabel).update({ taxa_achitata: !rand.taxaAchitata }).eq('id', rand.id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Modificarea nu a fost permisă (verifică drepturile).');
      onRefresh();
    } catch (err: any) {
      showError('Eroare', err.message);
    } finally {
      setUpdatingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const marcheazaTotAchitat = async (club: ClubSituatie) => {
    try {
      const ins = club.randuri.filter(r => r.tip === 'individual' && !r.taxaAchitata && !r.taxaAnulata);
      const ec = club.randuri.filter(r => r.tip === 'echipa' && !r.taxaAchitata && !r.taxaAnulata);
      if (ins.length > 0) {
        const { data, error } = await supabase.from('inscrieri_competitie').update({ taxa_achitata: true }).in('id', ins.map(r => r.id)).select('id');
        if (error) throw error;
        if ((data?.length ?? 0) < ins.length) throw new Error(`Doar ${data?.length ?? 0} din ${ins.length} înscrieri au fost marcate achitate (verifică drepturile).`);
      }
      if (ec.length > 0) {
        const { data, error } = await supabase.from('echipe_competitie').update({ taxa_achitata: true }).in('id', ec.map(r => r.id)).select('id');
        if (error) throw error;
        if ((data?.length ?? 0) < ec.length) throw new Error(`Doar ${data?.length ?? 0} din ${ec.length} echipe au fost marcate achitate (verifică drepturile).`);
      }
      onRefresh();
    } catch (err: any) {
      showError('Eroare', err.message);
    }
  };

  const exportCSV = () => {
    const linii = ['Club,Tip,Sportiv/Echipă,Categorie,Taxă (lei),Achitat,Taxă anulată'];
    for (const club of situatie) {
      for (const r of club.randuri) {
        linii.push([
          club.numeClub,
          r.tip === 'individual' ? 'Individual' : 'Echipă',
          r.sportivNume ?? r.echipaNume ?? '',
          r.categorieDenumire,
          String(r.taxa),
          r.taxaAchitata ? 'DA' : 'NU',
          r.taxaAnulata ? 'DA' : 'NU',
        ].map(v => `"${v.replace(/"/g, '""')}"`).join(','));
      }
    }
    const blob = new Blob([linii.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financiar_${competitie.denumire ?? 'competitie'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deRezolvat = useMemo(() => taxeDeReglatDupaMutari(mutari ?? [], { competitie, categorii, inscrieri, echipe }).map(t => ({
    id: `${t.tip}:${t.id}`,
    text: `${t.nume} (${situatie.find(c => c.clubId === t.clubId)?.numeClub ?? '—'}): mutat din «${t.categorieInitiala}» în «${t.categorieCurenta}» — taxa calculată ${t.taxaVeche} → ${t.taxaNoua} lei${t.achitata ? '; era achitată: diferența se reglează cu clubul' : ''}`,
    actiune: 'Vezi clubul',
    onClick: () => {
      setExpandedClubs(prev => new Set(prev).add(t.clubId));
      setTimeout(() => document.getElementById(`fin-club-${t.clubId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    },
  })), [mutari, competitie, categorii, inscrieri, echipe, situatie]);

  const totalGeneral = situatie.reduce((s, c) => s + c.totalCalculat, 0);
  const totalAchitatGeneral = situatie.reduce((s, c) => s + c.totalAchitat, 0);
  const totalAnulatAchitatGeneral = situatie.reduce((s, c) => s + c.totalAchitatAnulat, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">Situatie Financiara</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total: <span className="text-white font-semibold">{totalGeneral} lei</span>
            {' · '}Achitat: <span className="text-green-400 font-semibold">{totalAchitatGeneral} lei</span>
            {' · '}Restant: <span className="text-red-400 font-semibold">{totalGeneral - totalAchitatGeneral} lei</span>
            {totalAnulatAchitatGeneral > 0 && (
              <>{' · '}Achitat pe categorii anulate: <span className="text-blue-300 font-semibold">{totalAnulatAchitatGeneral} lei</span> (de realocat / returnat)</>
            )}
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{ touchAction: 'manipulation' }}
          className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors min-h-[36px]"
        >
          Export CSV
        </button>
      </div>

      {eroareMutari && (
        <p className="text-xs text-red-400">Mutările de categorie nu au putut fi verificate: {(eroareMutari as Error).message}</p>
      )}
      <BannerDeRezolvat items={deRezolvat} />

      <div className="border border-[var(--t-border)] rounded-xl overflow-hidden">
        {/* Header tabel */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-2 text-xs font-semibold border-b border-[var(--t-border)]" style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
          <span>Club</span>
          <span className="text-right">Sportivi</span>
          <span className="text-right">Echipe</span>
          <span className="text-right">Total</span>
          <span className="text-right">Status</span>
        </div>

        {situatie.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Nicio inscriere.</div>
        )}

        {situatie.map(club => {
          const isExpanded = expandedClubs.has(club.clubId);
          const neachitat = club.totalCalculat - club.totalAchitat;
          const status = neachitat === 0 ? 'achitat' : club.totalAchitat === 0 ? 'neachitat' : 'partial';
          const nrSportivi = club.randuri.filter(r => r.tip === 'individual' && !r.taxaAnulata).length;
          const nrEchipe = club.randuri.filter(r => r.tip === 'echipa' && !r.taxaAnulata).length;

          return (
            <div key={club.clubId} id={`fin-club-${club.clubId}`} className="border-b border-[var(--t-border)] last:border-0">
              {/* Rand club */}
              <div
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-4 py-3 cursor-pointer hover:bg-[var(--t-table-row-hover)] transition-colors items-center"
                onClick={() => toggleExpand(club.clubId)}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-center gap-2">
                  <svg className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-medium text-white">{club.numeClub}</span>
                </div>
                <span className="text-sm text-slate-300 text-right">{nrSportivi}</span>
                <span className="text-sm text-slate-300 text-right">{nrEchipe}</span>
                <span className="text-sm font-semibold text-white text-right">{club.totalCalculat} lei</span>
                <span className={`text-xs font-bold text-right ${
                  status === 'achitat' ? 'text-green-400' : status === 'partial' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {status === 'achitat' ? 'Achitat' : status === 'partial' ? `${club.totalAchitat}/${club.totalCalculat}` : 'Neachitat'}
                </span>
              </div>

              {/* Detalii expandabile */}
              {isExpanded && (
                <div className="border-t border-[var(--t-border)] bg-[var(--t-surface-2)]">
                  {/* Buton Marcheaza tot achitat */}
                  {neachitat > 0 && (
                    <div className="px-6 py-2 border-b border-[var(--t-border)]">
                      <button
                        onClick={() => marcheazaTotAchitat(club)}
                        style={{ touchAction: 'manipulation' }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/20 transition-colors min-h-[32px]"
                      >
                        Marcheaza tot achitat ({neachitat} lei restant)
                      </button>
                    </div>
                  )}

                  {/* Lista randuri */}
                  <div className="divide-y divide-slate-700/30">
                    {club.randuri.map(rand => (
                      <div key={rand.id} className="flex items-center gap-3 px-6 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          rand.tip === 'individual'
                            ? 'bg-brand-primary/20 text-brand-primary'
                            : 'bg-green-900/30 text-green-300'
                        }`}>
                          {rand.tip === 'individual' ? 'IND' : 'ECH'}
                        </span>
                        <span className="text-sm text-slate-200 flex-1">
                          {rand.sportivNume ?? rand.echipaNume}
                        </span>
                        <span className="text-xs text-slate-500 hidden md:block">{rand.categorieDenumire}</span>
                        <span className={`text-sm font-semibold text-slate-300 w-16 text-right ${rand.taxaAnulata ? 'line-through' : ''}`}>{rand.taxa} lei</span>
                        {rand.taxaAnulata && !rand.taxaAchitata ? (
                          <span className="text-[11px] px-2 py-1 rounded border border-slate-600 bg-slate-700/40 text-slate-400 min-w-[60px] text-center">Taxă anulată</span>
                        ) : (
                        <button
                          onClick={() => toggleTaxaAchitata(rand)}
                          disabled={updatingIds.has(rand.id)}
                          style={{ touchAction: 'manipulation' }}
                          className={`text-[11px] px-2 py-1 rounded border transition-colors min-h-[28px] min-w-[60px] ${
                            rand.taxaAchitata
                              ? 'border-green-700/50 bg-green-900/20 text-green-400'
                              : 'border-slate-600 text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          {updatingIds.has(rand.id) ? '...' : rand.taxaAchitata ? (rand.taxaAnulata ? 'Achitat — de realocat / returnat' : 'Achitat') : 'Neachitat'}
                        </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
