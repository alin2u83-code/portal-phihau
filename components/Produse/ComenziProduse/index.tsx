import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Card, Button, Badge } from '../../ui';
import ComandaCard from './ComandaCard';
import {
  grupeazaInComanda,
  marcheazaBatchUrmatoarea,
  fetchComenziClub,
  fetchCereriClub,
} from '../../../services/comenziService';
import type {
  CerereProdusFull,
  ComandaProduseiFull,
  Permissions,
} from '../../../types';

interface ComenziProduseProps {
  cereri: CerereProdusFull[];
  comenzi: ComandaProduseiFull[];
  loading: boolean;
  clubId: string;
  permissions: Permissions;
  tipPlataEchipamenteId: string;
  onRefetch: () => void;
  clubNume?: string;
}

const ComenziProduse: React.FC<ComenziProduseProps> = ({
  cereri,
  comenzi,
  loading,
  clubId,
  permissions,
  tipPlataEchipamenteId,
  onRefetch,
}) => {
  const [selectedCerereIds, setSelectedCerereIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState(false);

  const canManage = permissions.isAdminClub || permissions.isFederationAdmin;

  // Cereri noi = fără comandă + stare SOLICITATA (per CMD-03)
  const cereriNoi = useMemo(
    () => cereri.filter(c => c.comanda_id === null && c.stare_cerere === 'SOLICITATA'),
    [cereri]
  );

  // Comenzi active = nu FINALIZATA și nu ANULATA
  const comenziActive = useMemo(
    () => comenzi.filter(c => c.stare !== 'FINALIZATA' && c.stare !== 'ANULATA'),
    [comenzi]
  );

  // Comenzi istorice
  const comenziIstoric = useMemo(
    () => comenzi.filter(c => c.stare === 'FINALIZATA' || c.stare === 'ANULATA'),
    [comenzi]
  );

  const toggleSelectCerere = (id: string) => {
    setSelectedCerereIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdaugaLaComanda = async () => {
    if (selectedCerereIds.size === 0) {
      toast.error('Selectează cel puțin o cerere.');
      return;
    }
    setLoadingAction(true);
    try {
      await grupeazaInComanda(clubId, Array.from(selectedCerereIds), 'club_furnizor');
      toast.success('Cererile au fost adăugate la comanda curentă.');
      setSelectedCerereIds(new Set());
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la grupare cereri.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAmana = async (cerereId: string) => {
    setLoadingAction(true);
    try {
      await marcheazaBatchUrmatoarea(cerereId, true);
      toast.success('Cerere amânată pentru batch următor.');
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la amânare.');
    } finally {
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="py-12 text-center text-slate-400">Se încarcă comenzile...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Secțiunea: Cereri noi (fără comandă) */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-white">
            Cereri noi
            {cereriNoi.length > 0 && (
              <Badge variant="amber" className="ml-2">{cereriNoi.length}</Badge>
            )}
          </h2>
          {canManage && selectedCerereIds.size > 0 && (
            <Button
              size="sm"
              isLoading={loadingAction}
              onClick={handleAdaugaLaComanda}
            >
              Adaugă la comanda curentă ({selectedCerereIds.size})
            </Button>
          )}
        </div>

        {cereriNoi.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-slate-400 text-sm">
              Nicio cerere nouă de la sportivi.
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {cereriNoi.map(cerere => (
              <div
                key={cerere.id}
                className="bg-[var(--t-bg)] border border-[var(--t-border)] rounded-xl px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  {canManage && (
                    <input
                      type="checkbox"
                      checked={selectedCerereIds.has(cerere.id)}
                      onChange={() => toggleSelectCerere(cerere.id)}
                      className="mt-0.5 accent-[var(--accent)] cursor-pointer"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">
                        {cerere.sportiv_nume ?? '—'}
                      </span>
                      <Badge variant="slate">{cerere.stare_cerere}</Badge>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {cerere.varianta?.produs?.denumire ?? '—'}
                      {cerere.varianta?.marime ? ` · ${cerere.varianta.marime}` : ''}
                      {cerere.varianta?.culoare ? ` · ${cerere.varianta.culoare}` : ''}
                      {' · '}×{cerere.cantitate}
                    </p>
                    {cerere.observatii && (
                      <p className="text-slate-500 text-xs mt-0.5 italic">{cerere.observatii}</p>
                    )}
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAmana(cerere.id)}
                      disabled={loadingAction}
                      title="Amână pentru batch următor"
                    >
                      Amână
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secțiunea: Comenzi active */}
      <div>
        <h2 className="text-base font-bold text-white mb-3">
          Comenzi active
          {comenziActive.length > 0 && (
            <Badge variant="blue" className="ml-2">{comenziActive.length}</Badge>
          )}
        </h2>

        {comenziActive.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-slate-400 text-sm">
              Nicio comandă activă. Grupează cererile de mai sus pentru a crea una.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {comenziActive.map(comanda => (
              <ComandaCard
                key={comanda.id}
                comanda={comanda}
                tipPlataEchipamenteId={tipPlataEchipamenteId}
                clubId={clubId}
                onRefetch={onRefetch}
              />
            ))}
          </div>
        )}
      </div>

      {/* Secțiunea: Istoric comenzi (opțional) */}
      {comenziIstoric.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-400 mb-3">
            Istoric comenzi finalizate/anulate ({comenziIstoric.length})
          </h2>
          <div className="space-y-3">
            {comenziIstoric.map(comanda => (
              <ComandaCard
                key={comanda.id}
                comanda={comanda}
                tipPlataEchipamenteId={tipPlataEchipamenteId}
                clubId={clubId}
                onRefetch={onRefetch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComenziProduse;
