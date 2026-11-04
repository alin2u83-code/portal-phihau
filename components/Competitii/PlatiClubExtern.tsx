import React, { useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie } from '../../types';
import { Card, Badge, EmptyState } from '../ui';
import { construiesteRanduriPlata } from '../../utils/taxeCompetitie';

interface PlatiClubExternProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
}

const fmtRon = (n: number) => `${n.toLocaleString('ro-RO')} RON`;

/** Vedere read-only a taxelor de competitie ale clubului (zona externa, D-08). Fara scrieri in DB. */
export const PlatiClubExtern: React.FC<PlatiClubExternProps> = ({ competitie, categorii, probe, inscrieri, echipe, clubId }) => {
  const situatie = useMemo(() => construiesteRanduriPlata(
    competitie, categorii, probe,
    inscrieri.filter(i => i.club_id === clubId),
    echipe.filter(e => e.club_id === clubId),
  ), [competitie, categorii, probe, inscrieri, echipe, clubId]);

  if (situatie.randuri.length === 0) {
    return <EmptyState title="Nu ai înscrieri active" description="Taxele apar după înscriere." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-[var(--t-text-muted)]">Total de plată</p>
          <p className="text-lg font-semibold text-[var(--t-text)]">{fmtRon(situatie.totalCalculat)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--t-text-muted)]">Achitat</p>
          <p className="text-lg font-semibold text-[var(--t-status-success)]">{fmtRon(situatie.totalAchitat)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--t-text-muted)]">Rest de plată</p>
          <p className="text-lg font-semibold text-[var(--t-text)]">{fmtRon(situatie.totalRestant)}</p>
        </Card>
      </div>

      <p className="text-xs text-[var(--t-text-muted)]">Plata taxelor se confirmă de către federație.</p>

      <div className="-mx-4 sm:mx-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[320px]">
          <thead>
            <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
              <th className="p-2 text-left">Participant</th>
              <th className="p-2 text-left">Categorie / Probă</th>
              <th className="p-2 text-right">Taxă</th>
              <th className="p-2 text-center">Stare</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--t-border)]">
            {situatie.randuri.map(r => (
              <tr key={r.id}>
                <td className="p-2 text-[var(--t-text)]">{r.numeParticipant}</td>
                <td className="p-2 text-[var(--t-text-muted)]">{r.categorieDenumire} · {r.probaDenumire}</td>
                <td className="p-2 text-right text-[var(--t-text)]">{fmtRon(r.taxa)}</td>
                <td className="p-2 text-center">
                  <Badge variant={r.taxaAchitata ? 'green' : 'amber'}>{r.taxaAchitata ? 'Achitat' : 'Neachitat'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
