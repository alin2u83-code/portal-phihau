import React, { useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';
import { CompetitieFilterBar } from './CompetitieFilterBar';

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

  const filteredIns = inscrieri.filter(i =>
    i.status?.toLowerCase() !== 'retras' &&
    (isAdmin || i.club_id === myClubId) &&
    categoriiVizibile.has(i.categorie_id)
  );
  const filteredEc = echipe.filter(e =>
    e.status?.toLowerCase() !== 'retrasa' &&
    (isAdmin || e.club_id === myClubId) &&
    categoriiVizibile.has(e.categorie_id)
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

    return Array.from(map.values()).sort((a, b) => a.nume.localeCompare(b.nume) || a.prenume.localeCompare(b.prenume));
  }, [filteredIns, filteredEc, categorii, probe]);

  const handlePrint = () => window.print();

  if (raport.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <p className="text-sm">Niciun sportiv înscris momentan.</p>
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
    </div>
  );
};
