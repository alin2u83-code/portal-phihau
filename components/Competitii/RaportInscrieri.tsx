import React, { useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';
import { construiesteRanduriPlata } from '../../utils/taxeCompetitie';
import type { SituatiePlataCompetitie } from '../../utils/taxeCompetitie';

export interface RaportInscrieriProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  isAdmin: boolean;
  myClubId: string | null;
  filtre: CompetitieFiltre;
  toggleGen: (gen: string) => void;
  setFiltre: (partial: Partial<CompetitieFiltre>) => void;
  resetFiltre: () => void;
  nrFiltreActive: number;
  grade: Grad[];
}

export const RaportInscrieri: React.FC<RaportInscrieriProps> = ({
  competitie, categorii, probe, inscrieri, echipe, isAdmin, myClubId,
  filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive, grade,
}) => {
  interface ParticipareRaport {
    tip: 'individual' | 'echipa';
    probaDenumire: string;
    categorieDenumire: string;
    rol?: string;
    numeEchipa?: string;
  }
  interface SportivRaport {
    id: string;
    nume: string;
    prenume: string;
    clubNume: string;
    participari: ParticipareRaport[];
  }

  const categoriiVizibile = useMemo(
    () => new Set(aplicaFiltreCategorie(categorii, filtre).map(c => c.id)),
    [categorii, filtre]
  );

  // Rânduri respectând bara de filtre (afișate în tabelul de sportivi și în tabelul de plată filtrat)
  const filteredIns = useMemo(() => inscrieri.filter(i =>
    i.status?.toLowerCase() !== 'retras' &&
    (isAdmin || i.club_id === myClubId) &&
    categoriiVizibile.has(i.categorie_id)
  ), [inscrieri, isAdmin, myClubId, categoriiVizibile]);

  const filteredEc = useMemo(() => echipe.filter(e =>
    e.status?.toLowerCase() !== 'retrasa' &&
    (isAdmin || e.club_id === myClubId) &&
    categoriiVizibile.has(e.categorie_id)
  ), [echipe, isAdmin, myClubId, categoriiVizibile]);

  // Rânduri scopate DOAR pe club (fără filtrul de categorie) — pentru totalul cumulativ real
  const insClub = useMemo(() => inscrieri.filter(i =>
    isAdmin || i.club_id === myClubId
  ), [inscrieri, isAdmin, myClubId]);

  const ecClub = useMemo(() => echipe.filter(e =>
    isAdmin || e.club_id === myClubId
  ), [echipe, isAdmin, myClubId]);

  const plataFiltrata = useMemo<SituatiePlataCompetitie>(
    () => construiesteRanduriPlata(competitie, categorii, probe, filteredIns, filteredEc),
    [competitie, categorii, probe, filteredIns, filteredEc]
  );

  const plataTotala = useMemo<SituatiePlataCompetitie>(
    () => construiesteRanduriPlata(competitie, categorii, probe, insClub, ecClub),
    [competitie, categorii, probe, insClub, ecClub]
  );

  const raport = useMemo<SportivRaport[]>(() => {
    const map = new Map<string, SportivRaport>();

    for (const ins of filteredIns) {
      const sp = ins.sportiv as any;
      if (!sp) continue;
      const cat = categorii.find(c => c.id === ins.categorie_id);
      const proba = probe.find(p => p.id === cat?.proba_id);
      if (!map.has(sp.id)) {
        map.set(sp.id, { id: sp.id, nume: sp.nume, prenume: sp.prenume, clubNume: sp.cluburi?.nume ?? '', participari: [] });
      }
      map.get(sp.id)!.participari.push({
        tip: 'individual',
        probaDenumire: proba?.denumire ?? cat?.denumire ?? 'Probă',
        categorieDenumire: cat?.denumire ?? 'Categorie',
      });
    }

    for (const ec of filteredEc) {
      const cat = categorii.find(c => c.id === ec.categorie_id);
      const proba = probe.find(p => p.id === cat?.proba_id);
      const membri = (ec as any).echipa_sportivi || [];
      for (const m of membri) {
        const sp = m.sportiv as any;
        if (!sp) continue;
        if (!map.has(sp.id)) {
          map.set(sp.id, { id: sp.id, nume: sp.nume, prenume: sp.prenume, clubNume: (ec as any).club?.nume ?? '', participari: [] });
        }
        map.get(sp.id)!.participari.push({
          tip: 'echipa',
          probaDenumire: proba?.denumire ?? cat?.denumire ?? 'Probă',
          categorieDenumire: cat?.denumire ?? 'Categorie',
          rol: m.rol,
          numeEchipa: (ec as any).denumire_echipa ?? '',
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.nume.localeCompare(b.nume, 'ro-RO') || a.prenume.localeCompare(b.prenume, 'ro-RO'));
  }, [filteredIns, filteredEc, categorii, probe]);

  const handlePrint = () => window.print();

  if (raport.length === 0 && plataFiltrata.randuri.length === 0) {
    return (
      <div className="space-y-4">
        <CompetitieFilterBar
          filtre={filtre}
          toggleGen={toggleGen}
          setFiltre={setFiltre}
          resetFiltre={resetFiltre}
          nrFiltreActive={nrFiltreActive}
          probe={probe}
          grade={grade}
        />
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <p className="text-sm">
            {nrFiltreActive > 0
              ? 'Niciun sportiv corespunde filtrelor aplicate.'
              : 'Niciun sportiv înscris momentan.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">Raport Înscrieri</h3>
          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{raport.length} sportivi</span>
        </div>
        <button
          onClick={handlePrint}
          style={{ touchAction: 'manipulation' }}
          className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors min-h-[36px]"
        >
          Imprimă
        </button>
      </div>

      <CompetitieFilterBar
        filtre={filtre}
        toggleGen={toggleGen}
        setFiltre={setFiltre}
        resetFiltre={resetFiltre}
        nrFiltreActive={nrFiltreActive}
        probe={probe}
        grade={grade}
      />

      {/* Situație plată — total cumulativ pe rândurile salvate în DB (nu state-ul de wizard) */}
      <div className="border border-[var(--t-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 space-y-1.5 border-b border-[var(--t-border)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-semibold text-white">Situație plată</h4>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-white font-bold">Total: {plataFiltrata.totalCalculat} lei</span>
              <span className="text-green-400 font-semibold">Achitat: {plataFiltrata.totalAchitat} lei</span>
              <span className="text-red-400 font-semibold">Restant: {plataFiltrata.totalRestant} lei</span>
            </div>
          </div>
          {nrFiltreActive > 0 && (
            <p className="text-[11px] text-slate-500">
              Total competiție (fără filtre): {plataTotala.totalCalculat} lei
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            {plataFiltrata.nrIndividuale} individuale · {plataFiltrata.nrEchipe} echipe
          </p>
        </div>

        {plataFiltrata.randuri.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">Nicio înscriere cu taxă de plată.</div>
        ) : (
          <div className="-mx-4 sm:mx-0 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr
                  className="text-xs font-semibold"
                  style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}
                >
                  <th className="text-left px-4 py-2">Participant</th>
                  {isAdmin && <th className="text-left px-4 py-2">Club</th>}
                  <th className="text-left px-4 py-2">Categorie</th>
                  <th className="text-left px-4 py-2">Probă</th>
                  <th className="text-left px-4 py-2">Status plată</th>
                  <th className="text-right px-4 py-2">Sumă</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--t-border)]">
                {plataFiltrata.randuri.map(r => (
                  <tr key={r.id} className="hover:bg-[var(--t-table-row-hover)] transition-colors">
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold mr-1.5 ${
                          r.tip === 'individual'
                            ? 'bg-brand-primary/20 text-brand-primary'
                            : 'bg-green-900/30 text-green-300'
                        }`}
                      >
                        {r.tip === 'individual' ? 'IND' : 'ECH'}
                      </span>
                      <span className="text-slate-200">{r.numeParticipant}</span>
                    </td>
                    {isAdmin && <td className="px-4 py-2 text-xs text-slate-400">{r.clubNume}</td>}
                    <td className="px-4 py-2 text-slate-300">{r.categorieDenumire}</td>
                    <td className="px-4 py-2 text-slate-300">
                      {r.probaDenumire}
                      {r.tipProba && <span className="ml-1 text-xs text-slate-500">({r.tipProba})</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          r.taxaAchitata
                            ? 'border-green-700/40 bg-green-900/20 text-green-300'
                            : 'border-red-700/40 bg-red-900/20 text-red-300'
                        }`}
                      >
                        {r.taxaAchitata ? 'Achitat' : 'Neachitat'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-200">{r.taxa} lei</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--t-border)]">
                  <td colSpan={isAdmin ? 5 : 4} className="px-4 py-2 text-right text-xs font-semibold text-slate-400">
                    TOTAL
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-white">{plataFiltrata.totalCalculat} lei</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {raport.length > 0 && (
        <div className="border border-[var(--t-border)] rounded-xl overflow-hidden">
          <div className="divide-y divide-[var(--t-border)]">
            {raport.map((sp) => (
              <div key={sp.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-sm font-semibold text-white">{sp.nume} {sp.prenume}</span>
                    {isAdmin && sp.clubNume && (
                      <span className="ml-2 text-xs text-slate-400">{sp.clubNume}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {sp.participari.length} prob{sp.participari.length === 1 ? 'ă' : 'e'}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sp.participari.map((p, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                        p.tip === 'individual'
                          ? 'border-brand-primary/40 bg-brand-primary/10 text-brand-primary'
                          : p.rol === 'titular'
                            ? 'border-green-700/40 bg-green-900/20 text-green-300'
                            : 'border-yellow-700/40 bg-yellow-900/20 text-yellow-300'
                      }`}
                    >
                      {p.probaDenumire}
                      {p.tip === 'echipa' && p.numeEchipa && (
                        <span className="text-slate-500 ml-0.5">· {p.numeEchipa}</span>
                      )}
                      {p.tip === 'echipa' && (
                        <span className="text-[10px] opacity-60">({p.rol})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
