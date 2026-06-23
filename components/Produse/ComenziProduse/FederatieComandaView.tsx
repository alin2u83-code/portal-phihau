import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Card, Button, Badge, Input, Select } from '../../ui';
import {
  creareComandaFederatie,
  fetchComenziFederatie,
  fetchCereriCluburiPtFederatie,
  confirmaReceptieClub,
  fetchAdminClubUserIds,
} from '../../../services/comenziService';
import type {
  Club,
  ComandaProduseiFull,
  Produs,
  ProdusVariantaDB,
} from '../../../types';

interface FederatieComandaViewProps {
  clubs: Club[];
  produse: Produs[];
  onRefetch?: () => void;
}

interface DestinatatarForm {
  club_id: string;
  cantitate: number;
}

interface ItemForm {
  varianta_id: string;
  cantitate: number;
}

function getStareBadge(stare: string): 'green' | 'blue' | 'amber' | 'red' | 'slate' {
  switch (stare) {
    case 'DESCHISA': return 'blue';
    case 'PLASATA': return 'amber';
    case 'SOSITA': return 'green';
    case 'FINALIZATA': return 'green';
    case 'ANULATA': return 'red';
    default: return 'slate';
  }
}

/**
 * Vizualizare dedicată SUPER_ADMIN_FEDERATIE — afișată în tab Comenzi.
 * Flux B (top-down): creează comandă federație cu cantități per club.
 * Flux C (bottom-up): vede cererile cluburilor și le poate agrega.
 * Comenzi federație existente: status recepție per club.
 */
const FederatieComandaView: React.FC<FederatieComandaViewProps> = ({
  clubs,
  produse,
  onRefetch,
}) => {
  const [comenziFederatie, setComenziFederatie] = useState<ComandaProduseiFull[]>([]);
  const [cereriCluburi, setCereriCluburi] = useState<ComandaProduseiFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Form Flux B — creare comandă top-down
  const [showFormFluxB, setShowFormFluxB] = useState(false);
  const [furnizor, setFurnizor] = useState('');
  const [observatii, setObservatii] = useState('');
  const [iteme, setIteme] = useState<ItemForm[]>([{ varianta_id: '', cantitate: 1 }]);
  const [destinatari, setDestinatari] = useState<DestinatatarForm[]>([{ club_id: '', cantitate: 1 }]);

  // Confirmare recepție in progress
  const [confirmandId, setConfirmandId] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const [comenzi, cereri] = await Promise.all([
        fetchComenziFederatie(),
        fetchCereriCluburiPtFederatie(),
      ]);
      setComenziFederatie(comenzi);
      setCereriCluburi(cereri);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la încărcare date federație.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toate variantele active din toate produsele pentru selecție
  const toateVariantele: (ProdusVariantaDB & { produs_denumire: string })[] = produse.flatMap(p =>
    p.variante
      .filter(v => v.activa)
      .map(v => ({ ...v, produs_denumire: p.denumire }))
  );

  const addItem = () => setIteme(prev => [...prev, { varianta_id: '', cantitate: 1 }]);
  const removeItem = (idx: number) => setIteme(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ItemForm, value: string | number) => {
    setIteme(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addDestinatar = () => setDestinatari(prev => [...prev, { club_id: '', cantitate: 1 }]);
  const removeDestinatar = (idx: number) => setDestinatari(prev => prev.filter((_, i) => i !== idx));
  const updateDestinatar = (idx: number, field: keyof DestinatatarForm, value: string | number) => {
    setDestinatari(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const resetForm = () => {
    setFurnizor('');
    setObservatii('');
    setIteme([{ varianta_id: '', cantitate: 1 }]);
    setDestinatari([{ club_id: '', cantitate: 1 }]);
    setShowFormFluxB(false);
  };

  const handleCreareComandaFluxB = async () => {
    // Validare
    const itemeValide = iteme.filter(i => i.varianta_id && i.cantitate > 0);
    const destinatariValizi = destinatari.filter(d => d.club_id && d.cantitate > 0);

    if (itemeValide.length === 0) {
      toast.error('Adaugă cel puțin un produs.');
      return;
    }
    if (destinatariValizi.length === 0) {
      toast.error('Adaugă cel puțin un club destinatar.');
      return;
    }

    setLoadingAction(true);
    try {
      // Obține adminii fiecărui club destinatar pentru notificări
      const adminClubUserIdsPerClub: Record<string, string[]> = {};
      for (const dest of destinatariValizi) {
        adminClubUserIdsPerClub[dest.club_id] = await fetchAdminClubUserIds(dest.club_id);
      }

      await creareComandaFederatie({
        tip_comanda: 'federatie_club',
        furnizor: furnizor || undefined,
        observatii: observatii || undefined,
        iteme: itemeValide,
        destinatari: destinatariValizi,
        adminClubUserIdsPerClub,
      });

      toast.success('Comandă federație creată. Cluburile destinatare au fost notificate.');
      resetForm();
      refetch();
      onRefetch?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la creare comandă federație.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmaReceptie = async (comandaClubId: string) => {
    setConfirmandId(comandaClubId);
    try {
      await confirmaReceptieClub(comandaClubId);
      toast.success('Recepție confirmată.');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Eroare la confirmare recepție.');
    } finally {
      setConfirmandId(null);
    }
  };

  // Comenzile tip federatie_club (trimise de federație la cluburi)
  const comenziTopDown = comenziFederatie.filter(c => c.tip_comanda === 'federatie_club');

  return (
    <div className="space-y-6">

      {/* ===== Secțiunea: Comandă nouă către cluburi (Flux B) ===== */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-white">
            Comandă nouă către cluburi
            <span className="ml-2 text-slate-400 text-xs font-normal">(Flux B — top-down)</span>
          </h2>
          {!showFormFluxB && (
            <Button size="sm" onClick={() => setShowFormFluxB(true)}>
              + Comandă nouă
            </Button>
          )}
        </div>

        {showFormFluxB && (
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-white">Creare comandă federație → cluburi</h3>

            {/* Furnizor + observații */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Furnizor (opțional)"
                value={furnizor}
                onChange={e => setFurnizor(e.target.value)}
                placeholder="Ex: Daedo Sport"
              />
              <Input
                label="Observații (opțional)"
                value={observatii}
                onChange={e => setObservatii(e.target.value)}
                placeholder="Note suplimentare..."
              />
            </div>

            {/* Produse / iteme */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Produse comandate
              </p>
              <div className="space-y-2">
                {iteme.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select
                        value={item.varianta_id}
                        onChange={e => updateItem(idx, 'varianta_id', e.target.value)}
                      >
                        <option value="">— Selectează produs —</option>
                        {toateVariantele.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.produs_denumire}
                            {v.culoare ? ` · ${v.culoare}` : ''}
                            {v.marime ? ` · ${v.marime}` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        label=""
                        type="number"
                        min={1}
                        value={item.cantitate}
                        onChange={e => updateItem(idx, 'cantitate', parseInt(e.target.value, 10) || 1)}
                        placeholder="Cant."
                      />
                    </div>
                    {iteme.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-rose-400 hover:text-rose-300 text-sm shrink-0"
                        title="Elimină"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button size="sm" variant="secondary" className="mt-2" onClick={addItem}>
                + Adaugă produs
              </Button>
            </div>

            {/* Cluburi destinatare */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                Cluburi destinatare (cantitate per club)
              </p>
              <div className="space-y-2">
                {destinatari.map((dest, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select
                        value={dest.club_id}
                        onChange={e => updateDestinatar(idx, 'club_id', e.target.value)}
                      >
                        <option value="">— Selectează club —</option>
                        {clubs.map(c => (
                          <option key={c.id} value={c.id}>{c.nume}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        label=""
                        type="number"
                        min={1}
                        value={dest.cantitate}
                        onChange={e => updateDestinatar(idx, 'cantitate', parseInt(e.target.value, 10) || 1)}
                        placeholder="Cant."
                      />
                    </div>
                    {destinatari.length > 1 && (
                      <button
                        onClick={() => removeDestinatar(idx)}
                        className="text-rose-400 hover:text-rose-300 text-sm shrink-0"
                        title="Elimină"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button size="sm" variant="secondary" className="mt-2" onClick={addDestinatar}>
                + Adaugă club
              </Button>
            </div>

            {/* Butoane acțiune */}
            <div className="flex gap-2 pt-2 border-t border-[var(--t-border)]">
              <Button
                isLoading={loadingAction}
                onClick={handleCreareComandaFluxB}
              >
                Creează comandă
              </Button>
              <Button variant="secondary" onClick={resetForm} disabled={loadingAction}>
                Anulează
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* ===== Secțiunea: Cereri de la cluburi (Flux C) ===== */}
      <div>
        <h2 className="text-base font-bold text-white mb-3">
          Cereri de la cluburi
          <span className="ml-2 text-slate-400 text-xs font-normal">(Flux C — bottom-up)</span>
          {cereriCluburi.length > 0 && (
            <Badge variant="amber" className="ml-2">{cereriCluburi.length}</Badge>
          )}
        </h2>

        {loading ? (
          <Card>
            <div className="py-8 text-center text-slate-400 text-sm">Se încarcă...</div>
          </Card>
        ) : cereriCluburi.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-slate-400 text-sm">
              Nicio cerere de la cluburi momentan.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {cereriCluburi.map(cerere => (
              <Card key={cerere.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">
                        Cerere club — {cerere.tip_comanda.replace('_', ' ')}
                      </span>
                      <Badge variant={getStareBadge(cerere.stare)}>{cerere.stare}</Badge>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {new Date(cerere.created_at).toLocaleDateString('ro-RO')}
                      {cerere.furnizor ? ` · Furnizor: ${cerere.furnizor}` : ''}
                    </p>
                  </div>
                </div>

                {/* Iteme cerere */}
                {cerere.iteme.length > 0 && (
                  <div className="space-y-1">
                    {cerere.iteme.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.varianta?.produs?.denumire ?? '—'}</span>
                        <span className="text-white font-bold">×{item.cantitate}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buton "Comandă central la furnizor" */}
                {cerere.stare === 'DESCHISA' && (
                  <div className="pt-2 border-t border-[var(--t-border)]">
                    <p className="text-slate-400 text-xs mb-2">
                      Agregează această cerere și plasează central la furnizor.
                    </p>
                    <Button size="sm" variant="secondary" disabled>
                      Comandă central (disponibil în 13-05)
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ===== Secțiunea: Comenzi federație existente (Flux B — status recepție per club) ===== */}
      <div>
        <h2 className="text-base font-bold text-white mb-3">
          Comenzi federație emise
          {comenziTopDown.length > 0 && (
            <Badge variant="blue" className="ml-2">{comenziTopDown.length}</Badge>
          )}
        </h2>

        {loading ? (
          <Card>
            <div className="py-8 text-center text-slate-400 text-sm">Se încarcă...</div>
          </Card>
        ) : comenziTopDown.length === 0 ? (
          <Card>
            <div className="py-8 text-center text-slate-400 text-sm">
              Nicio comandă federație emisă încă.
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {comenziTopDown.map(comanda => (
              <Card key={comanda.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">
                        Comandă federație → cluburi
                      </span>
                      <Badge variant={getStareBadge(comanda.stare)}>{comanda.stare}</Badge>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {new Date(comanda.created_at).toLocaleDateString('ro-RO')}
                      {comanda.furnizor ? ` · ${comanda.furnizor}` : ''}
                    </p>
                  </div>
                </div>

                {/* Iteme comandă */}
                {comanda.iteme.length > 0 && (
                  <div className="space-y-1">
                    {comanda.iteme.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.varianta?.produs?.denumire ?? '—'}</span>
                        <span className="text-white font-bold">×{item.cantitate}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status recepție per club (comenzi_produse_cluburi) */}
                {(comanda.cluburi ?? []).length > 0 && (
                  <div className="border-t border-[var(--t-border)] pt-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                      Status recepție per club
                    </p>
                    <div className="space-y-1.5">
                      {(comanda.cluburi ?? []).map(clubLot => {
                        const clubInfo = clubs.find(c => c.id === clubLot.club_id);
                        return (
                          <div key={clubLot.id} className="flex items-center justify-between gap-2">
                            <span className="text-slate-300 text-sm">
                              {clubInfo?.nume ?? clubLot.club_id.slice(0, 8)}
                              <span className="text-slate-500 ml-1">×{clubLot.cantitate}</span>
                            </span>
                            {clubLot.confirmat ? (
                              <Badge variant="green">Confirmat</Badge>
                            ) : (
                              <Badge variant="slate">În așteptare</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FederatieComandaView;
