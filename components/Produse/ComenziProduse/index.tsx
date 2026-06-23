import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Card, Button, Badge } from '../../ui';
import ComandaCard from './ComandaCard';
import FederatieComandaView from './FederatieComandaView';
import {
  grupeazaInComanda,
  marcheazaBatchUrmatoarea,
  fetchComenziClub,
  fetchCereriClub,
  confirmaReceptieClub,
  distribuieLaSportivi,
} from '../../../services/comenziService';
import type {
  CerereProdusFull,
  ComandaProduseiFull,
  ComandaProduseClubBD,
  Permissions,
  Club,
  Produs,
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
  clubs?: Club[];
  produse?: Produs[];
}

const ComenziProduse: React.FC<ComenziProduseProps> = ({
  cereri,
  comenzi,
  loading,
  clubId,
  permissions,
  tipPlataEchipamenteId,
  onRefetch,
  clubs = [],
  produse = [],
}) => {
  const [selectedCerereIds, setSelectedCerereIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState(false);
  // Comenzi primite de la federație pentru clubul curent (ADMIN_CLUB)
  const [comenziFederatieClub, setComenziFederatieClub] = useState<(ComandaProduseClubBD & { comanda?: ComandaProduseiFull })[]>([]);
  const [confirmandId, setConfirmandId] = useState<string | null>(null);

  const canManage = permissions.isAdminClub || permissions.isFederationAdmin;

  // Cereri noi = fără comandă + stare SOLICITATA (per CMD-03)
  const cereriNoi = useMemo(
    () => cereri.filter(c => c.comanda_id === null && c.stare_cerere === 'SOLICITATA'),
    [cereri]
  );

  // Comenzi active = nu FINALIZATA și nu ANULATA, tip club_furnizor sau club_federatie
  const comenziActive = useMemo(
    () => comenzi.filter(c =>
      c.stare !== 'FINALIZATA' &&
      c.stare !== 'ANULATA' &&
      (c.tip_comanda === 'club_furnizor' || c.tip_comanda === 'club_federatie')
    ),
    [comenzi]
  );

  // Comenzi istorice (tip club)
  const comenziIstoric = useMemo(
    () => comenzi.filter(c =>
      (c.stare === 'FINALIZATA' || c.stare === 'ANULATA') &&
      (c.tip_comanda === 'club_furnizor' || c.tip_comanda === 'club_federatie')
    ),
    [comenzi]
  );

  // Comenzi primite de la federație (tip federatie_club care conțin club-ul curent ca destinatar)
  const comenziFederatiePrimite = useMemo(
    () => comenzi.filter(c => c.tip_comanda === 'federatie_club'),
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

  const handleConfirmaReceptieFederatie = async (comandaClubId: string) => {
    setConfirmandId(comandaClubId);
    try {
      await confirmaReceptieClub(comandaClubId);
      toast.success('Recepție confirmată.');
      onRefetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la confirmare recepție.');
    } finally {
      setConfirmandId(null);
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

      {/* ===== Secțiunea FEDERAȚIE — doar pentru SUPER_ADMIN_FEDERATIE ===== */}
      {permissions.isFederationAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
            <h2 className="text-base font-bold text-white">Vizualizare Federație</h2>
            <Badge variant="amber">SUPER_ADMIN</Badge>
          </div>
          <FederatieComandaView
            clubs={clubs}
            produse={produse}
            onRefetch={onRefetch}
          />
        </div>
      )}

      {/* ===== Secțiunea: Comenzi primite de la federație (pentru ADMIN_CLUB) ===== */}
      {permissions.isAdminClub && !permissions.isFederationAdmin && comenziFederatiePrimite.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-white mb-3">
            Comenzi primite de la federație
            <Badge variant="blue" className="ml-2">{comenziFederatiePrimite.length}</Badge>
          </h2>
          <div className="space-y-3">
            {comenziFederatiePrimite.map(comanda => {
              // Găsim lotul specific acestui club (din comenzi_produse_cluburi)
              const lotClub = (comanda.cluburi ?? []).find(c => c.club_id === clubId);
              return (
                <Card key={comanda.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-sm">
                          Comandă federație
                        </span>
                        <Badge variant={comanda.stare === 'FINALIZATA' ? 'green' : comanda.stare === 'ANULATA' ? 'red' : 'blue'}>
                          {comanda.stare}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {new Date(comanda.created_at).toLocaleDateString('ro-RO')}
                        {comanda.furnizor ? ` · Furnizor: ${comanda.furnizor}` : ''}
                        {lotClub ? ` · Cantitate alocată: ${lotClub.cantitate}` : ''}
                      </p>
                    </div>
                    {/* Buton Confirmă recepția (CMD-04) — dacă lotClub există și nu e confirmat */}
                    {lotClub && !lotClub.confirmat && (
                      <Button
                        size="sm"
                        isLoading={confirmandId === lotClub.id}
                        onClick={() => handleConfirmaReceptieFederatie(lotClub.id)}
                      >
                        Confirmă recepția
                      </Button>
                    )}
                    {lotClub?.confirmat && (
                      <Badge variant="green">Recepție confirmată</Badge>
                    )}
                  </div>

                  {/* Iteme comandă */}
                  {comanda.iteme.length > 0 && (
                    <div className="space-y-1 border-t border-[var(--t-border)] pt-2">
                      {comanda.iteme.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-300">
                            {item.varianta?.produs?.denumire ?? '—'}
                          </span>
                          <span className="text-white font-bold">×{item.cantitate}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buton Distribuie la sportivi — pentru produse per_sportiv (CMD-05) */}
                  {lotClub?.confirmat && comanda.iteme.some(item =>
                    (item.varianta?.produs as any)?.tip_produs === 'per_sportiv'
                  ) && (
                    <div className="border-t border-[var(--t-border)] pt-2">
                      <p className="text-slate-400 text-xs mb-1">
                        Produse per sportiv detectate — poți distribui la sportivi.
                      </p>
                      <Button size="sm" variant="secondary" disabled>
                        Distribuie la sportivi (disponibil în 13-05)
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Secțiunea: Cereri noi (fără comandă) — pentru ADMIN_CLUB ===== */}
      {!permissions.isFederationAdmin && (
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
      )}

      {/* ===== Secțiunea: Comenzi active — pentru ADMIN_CLUB ===== */}
      {!permissions.isFederationAdmin && (
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
      )}

      {/* ===== Secțiunea: Istoric comenzi — pentru ADMIN_CLUB ===== */}
      {!permissions.isFederationAdmin && comenziIstoric.length > 0 && (
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
