import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Card, Button, Badge } from '../../ui';
import PredareModal from './PredareModal';
import {
  marcheazaStareCerere,
  marcheazaPlatita,
  trimiteReminderPlata,
} from '../../../services/comenziService';
import { exportBonPredare, exportExcelFurnizor } from '../../../utils/exportBonPredare';
import type { ComandaProduseiFull, CerereProdusFull, StareCerereProdusTip } from '../../../types';

interface SumarVarianta {
  varianta_id: string;
  denumire: string;
  cantitate: number;
  cereri: CerereProdusFull[];
}

interface ComandaCardProps {
  comanda: ComandaProduseiFull;
  tipPlataEchipamenteId: string;
  clubId: string;
  clubNume: string;
  onRefetch: () => void;
}

function getStareBadgeVariant(stare: string): 'green' | 'blue' | 'amber' | 'red' | 'slate' {
  switch (stare) {
    case 'SOLICITATA': return 'slate';
    case 'CONFIRMATA': return 'blue';
    case 'PLASATA': return 'amber';
    case 'SOSITA': return 'green';
    case 'PREDATA': return 'amber';
    case 'PLATITA': return 'green';
    case 'ANULATA': return 'red';
    default: return 'slate';
  }
}

function getStareComandaBadge(stare: string): 'green' | 'blue' | 'amber' | 'red' | 'slate' {
  switch (stare) {
    case 'DESCHISA': return 'blue';
    case 'PLASATA': return 'amber';
    case 'SOSITA': return 'green';
    case 'FINALIZATA': return 'green';
    case 'ANULATA': return 'red';
    default: return 'slate';
  }
}

function getDenumireVarianta(cerere: CerereProdusFull): string {
  const produs = cerere.varianta?.produs?.denumire ?? '—';
  const parts = [
    cerere.varianta?.culoare ?? '',
    cerere.varianta?.marime ?? '',
  ].filter(Boolean);
  return parts.length > 0 ? `${produs} (${parts.join(' ')})` : produs;
}

const STARI_AVANSARE: { from: StareCerereProdusTip; to: StareCerereProdusTip; label: string }[] = [
  { from: 'SOLICITATA', to: 'CONFIRMATA', label: 'Confirmă' },
  { from: 'CONFIRMATA', to: 'PLASATA', label: 'Marchează Plasată' },
  { from: 'PLASATA', to: 'SOSITA', label: 'Marchează Sosită' },
];

const ComandaCard: React.FC<ComandaCardProps> = ({
  comanda,
  tipPlataEchipamenteId,
  clubId,
  clubNume,
  onRefetch,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loadingCerere, setLoadingCerere] = useState<string | null>(null);
  const [predareModal, setPredareModal] = useState<CerereProdusFull | null>(null);

  // Sumar agregat cantități per variantă (per CMD-03)
  const sumarVariante = useMemo<SumarVarianta[]>(() => {
    const acc: Record<string, SumarVarianta> = {};
    for (const cerere of comanda.cereri) {
      const key = cerere.varianta_id;
      if (!acc[key]) {
        acc[key] = {
          varianta_id: key,
          denumire: getDenumireVarianta(cerere),
          cantitate: 0,
          cereri: [],
        };
      }
      acc[key].cantitate += cerere.cantitate ?? 1;
      acc[key].cereri.push(cerere);
    }
    return Object.values(acc);
  }, [comanda.cereri]);

  const handleAvansareStare = async (
    cerere: CerereProdusFull,
    stareNoua: StareCerereProdusTip
  ) => {
    setLoadingCerere(cerere.id);
    try {
      await marcheazaStareCerere(cerere.id, stareNoua, {
        sportiv_user_id: cerere.sportiv?.user_id ?? null,
      });
      toast.success(`Stare actualizată: ${stareNoua}`);
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la actualizare stare.');
    } finally {
      setLoadingCerere(null);
    }
  };

  const handleAnulare = async (cerere: CerereProdusFull) => {
    if (!window.confirm('Anulezi această cerere?')) return;
    setLoadingCerere(cerere.id);
    try {
      await marcheazaStareCerere(cerere.id, 'ANULATA', {
        sportiv_user_id: cerere.sportiv?.user_id ?? null,
      });
      toast.success('Cerere anulată.');
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la anulare.');
    } finally {
      setLoadingCerere(null);
    }
  };

  const handlePlatita = async (cerere: CerereProdusFull) => {
    setLoadingCerere(cerere.id);
    try {
      await marcheazaPlatita(cerere.id);
      toast.success('Cerere marcată ca plătită.');
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la marcare plătit.');
    } finally {
      setLoadingCerere(null);
    }
  };

  const handleReminderPlata = async (cerere: CerereProdusFull) => {
    const userId = cerere.sportiv?.user_id;
    if (!userId) return;
    setLoadingCerere(cerere.id);
    try {
      await trimiteReminderPlata(cerere.id, userId);
      toast.success('Reminder trimis sportivului.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la trimitere reminder.');
    } finally {
      setLoadingCerere(null);
    }
  };

  return (
    <Card className="space-y-3">
      {/* Header comandă */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">
              Comandă {comanda.tip_comanda.replace('_', ' ')}
            </span>
            <Badge variant={getStareComandaBadge(comanda.stare)}>{comanda.stare}</Badge>
          </div>
          {comanda.furnizor && (
            <p className="text-slate-400 text-xs mt-0.5">Furnizor: {comanda.furnizor}</p>
          )}
          <p className="text-slate-500 text-xs mt-0.5">
            {new Date(comanda.created_at).toLocaleDateString('ro-RO')} · {comanda.cereri.length} cereri
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {comanda.stare === 'PLASATA' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await exportExcelFurnizor(comanda, clubNume);
                } catch {
                  toast.error('Eroare la generarea Excel furnizor.');
                }
              }}
              title="Export produse+cantități pentru furnizor"
            >
              Export furnizor (Excel)
            </Button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            {expanded ? 'Ascunde' : 'Detalii'}
          </button>
        </div>
      </div>

      {/* Sumar agregat per produs (CMD-03) */}
      <div className="space-y-1">
        {sumarVariante.map(sv => (
          <div key={sv.varianta_id} className="flex justify-between items-center text-sm">
            <span className="text-slate-300 truncate">{sv.denumire}</span>
            <span className="text-white font-bold ml-2 shrink-0">×{sv.cantitate}</span>
          </div>
        ))}
        {sumarVariante.length === 0 && (
          <p className="text-slate-500 text-xs">Nicio cerere în această comandă.</p>
        )}
      </div>

      {/* Detaliu expandabil — sportivi per produs cu stări (CMD-03, CMD-01) */}
      {expanded && (
        <div className="border-t border-[var(--t-border)] pt-3 space-y-4">
          {sumarVariante.map(sv => (
            <div key={sv.varianta_id}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                {sv.denumire} — {sv.cantitate} buc total
              </p>
              <div className="space-y-2">
                {sv.cereri.map(cerere => {
                  const isLoading = loadingCerere === cerere.id;
                  const avansare = STARI_AVANSARE.find(s => s.from === cerere.stare_cerere);
                  const canPreda = cerere.stare_cerere === 'SOSITA';
                  const canPlatita = cerere.stare_cerere === 'PREDATA';
                  const canReminder = cerere.stare_cerere === 'PREDATA' && !!cerere.sportiv?.user_id;
                  const canBonPredare = ['PREDATA', 'PLATITA'].includes(cerere.stare_cerere);
                  const canAnula = !['PREDATA', 'PLATITA', 'ANULATA'].includes(cerere.stare_cerere);

                  return (
                    <div
                      key={cerere.id}
                      className="bg-[var(--t-surface-2)] rounded-xl px-3 py-2 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{cerere.sportiv_nume ?? '—'}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={getStareBadgeVariant(cerere.stare_cerere)}>
                            {cerere.stare_cerere}
                          </Badge>
                          <span className="text-slate-400 text-xs">×{cerere.cantitate}</span>
                        </div>
                      </div>

                      {/* Butoane acțiuni per cerere */}
                      <div className="flex flex-wrap gap-1.5">
                        {avansare && (
                          <Button
                            size="sm"
                            isLoading={isLoading}
                            onClick={() => handleAvansareStare(cerere, avansare.to)}
                          >
                            {avansare.label}
                          </Button>
                        )}
                        {canPreda && (
                          <Button
                            size="sm"
                            onClick={() => setPredareModal(cerere)}
                            disabled={isLoading}
                          >
                            Predă
                          </Button>
                        )}
                        {canPlatita && (
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={isLoading}
                            onClick={() => handlePlatita(cerere)}
                          >
                            Marchează plătit
                          </Button>
                        )}
                        {/* Buton Reminder plată — vizibil DOAR pentru PREDATA neachitată (CMD-06) */}
                        {canReminder && (
                          <Button
                            size="sm"
                            variant="secondary"
                            isLoading={isLoading}
                            onClick={() => handleReminderPlata(cerere)}
                            title="Trimite notificare plată restantă sportivului"
                          >
                            Reminder plată
                          </Button>
                        )}
                        {/* Buton Bon predare PDF — vizibil pentru PREDATA/PLATITA (CMD-07) */}
                        {canBonPredare && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isLoading}
                            onClick={async () => {
                              try {
                                await exportBonPredare(cerere, clubNume);
                              } catch {
                                toast.error('Eroare la generarea bonului PDF.');
                              }
                            }}
                            title="Descarcă bon predare PDF"
                          >
                            Bon predare
                          </Button>
                        )}
                        {canAnula && (
                          <Button
                            size="sm"
                            variant="danger"
                            isLoading={isLoading}
                            onClick={() => handleAnulare(cerere)}
                          >
                            Anulează
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal predare */}
      {predareModal && (
        <PredareModal
          cerere={predareModal}
          clubId={clubId}
          clubNume={clubNume}
          tipPlataEchipamenteId={tipPlataEchipamenteId}
          onDone={() => {
            setPredareModal(null);
            onRefetch();
          }}
          onClose={() => setPredareModal(null)}
        />
      )}
    </Card>
  );
};

export default ComandaCard;
