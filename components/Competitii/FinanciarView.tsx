import React, { useState, useMemo } from 'react';
import { Competitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from '../../utils/taxeCompetitie';

interface RandFinanciar {
  tip: 'individual' | 'echipa';
  id: string;
  sportivNume?: string;
  echipaNume?: string;
  categorieDenumire: string;
  probaDenumire: string;
  taxa: number;
  taxaAchitata: boolean;
}

interface ClubSituatie {
  clubId: string;
  numeClub: string;
  randuri: RandFinanciar[];
  totalCalculat: number;
  totalAchitat: number;
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

    const getOrCreate = (clubId: string, numeClub: string) => {
      if (!map.has(clubId)) {
        map.set(clubId, { clubId, numeClub, randuri: [], totalCalculat: 0, totalAchitat: 0 });
      }
      return map.get(clubId)!;
    };

    for (const ins of inscrieri.filter(i => i.status?.toLowerCase() !== 'retras')) {
      const cat = categorii.find(c => c.id === ins.categorie_id);
      const sp = ins.sportiv as any;
      const taxa = calculeazaTaxaIndividuala(competitie, cat);
      const numeClub = sp?.cluburi?.nume ?? ins.club_id;
      const club = getOrCreate(ins.club_id, numeClub);
      club.randuri.push({
        tip: 'individual',
        id: ins.id,
        sportivNume: sp ? `${sp.nume} ${sp.prenume}` : ins.sportiv_id,
        categorieDenumire: cat?.denumire ?? 'Categorie',
        probaDenumire: cat?.denumire ?? '',
        taxa,
        taxaAchitata: ins.taxa_achitata ?? false,
      });
      club.totalCalculat += taxa;
      if (ins.taxa_achitata) club.totalAchitat += taxa;
    }

    for (const ec of echipe.filter(e => e.status?.toLowerCase() !== 'retrasa')) {
      const cat = categorii.find(c => c.id === ec.categorie_id);
      const taxa = cat ? calculeazaTaxaEchipa(cat, competitie) : (competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120);
      const numeClub = (ec as any).club?.nume ?? ec.club_id;
      const club = getOrCreate(ec.club_id, numeClub);
      club.randuri.push({
        tip: 'echipa',
        id: ec.id,
        echipaNume: ec.denumire_echipa ?? 'Echipă',
        categorieDenumire: cat?.denumire ?? 'Categorie',
        probaDenumire: cat?.denumire ?? '',
        taxa,
        taxaAchitata: ec.taxa_achitata ?? false,
      });
      club.totalCalculat += taxa;
      if (ec.taxa_achitata) club.totalAchitat += taxa;
    }

    return Array.from(map.values()).sort((a, b) => a.numeClub.localeCompare(b.numeClub));
  }, [inscrieri, echipe, categorii, competitie]);

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
      const { error } = await supabase.from(tabel).update({ taxa_achitata: !rand.taxaAchitata }).eq('id', rand.id);
      if (error) throw error;
      onRefresh();
    } catch (err: any) {
      showError('Eroare', err.message);
    } finally {
      setUpdatingIds(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const marcheazaTotAchitat = async (club: ClubSituatie) => {
    try {
      const ins = club.randuri.filter(r => r.tip === 'individual' && !r.taxaAchitata);
      const ec = club.randuri.filter(r => r.tip === 'echipa' && !r.taxaAchitata);
      if (ins.length > 0) {
        await supabase.from('inscrieri_competitie').update({ taxa_achitata: true }).in('id', ins.map(r => r.id));
      }
      if (ec.length > 0) {
        await supabase.from('echipe_competitie').update({ taxa_achitata: true }).in('id', ec.map(r => r.id));
      }
      onRefresh();
    } catch (err: any) {
      showError('Eroare', err.message);
    }
  };

  const exportCSV = () => {
    const linii = ['Club,Tip,Sportiv/Echipă,Categorie,Taxă (lei),Achitat'];
    for (const club of situatie) {
      for (const r of club.randuri) {
        linii.push([
          club.numeClub,
          r.tip === 'individual' ? 'Individual' : 'Echipă',
          r.sportivNume ?? r.echipaNume ?? '',
          r.categorieDenumire,
          String(r.taxa),
          r.taxaAchitata ? 'DA' : 'NU',
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

  const totalGeneral = situatie.reduce((s, c) => s + c.totalCalculat, 0);
  const totalAchitatGeneral = situatie.reduce((s, c) => s + c.totalAchitat, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">Situatie Financiara</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total: <span className="text-white font-semibold">{totalGeneral} lei</span>
            {' · '}Achitat: <span className="text-green-400 font-semibold">{totalAchitatGeneral} lei</span>
            {' · '}Restant: <span className="text-red-400 font-semibold">{totalGeneral - totalAchitatGeneral} lei</span>
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
          const nrSportivi = club.randuri.filter(r => r.tip === 'individual').length;
          const nrEchipe = club.randuri.filter(r => r.tip === 'echipa').length;

          return (
            <div key={club.clubId} className="border-b border-[var(--t-border)] last:border-0">
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
                        <span className="text-sm font-semibold text-slate-300 w-16 text-right">{rand.taxa} lei</span>
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
                          {updatingIds.has(rand.id) ? '...' : rand.taxaAchitata ? 'Achitat' : 'Neachitat'}
                        </button>
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
