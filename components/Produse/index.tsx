import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge, Input, Select } from '../ui';
import ProdusFormModal from './ProdusFormModal';
import {
  fetchProduse,
  fetchCategorii,
  deleteProdus,
} from '../../services/produseService';
import type { User, Permissions, Produs, ProdusCategorieDB } from '../../types';
import { ArrowLeftIcon, PlusIcon } from '../icons';

interface ProduseManagementProps {
  currentUser: User;
  permissions: Permissions;
  onBack: () => void;
}

type ActiveTab = 'catalog' | 'intrari' | 'vanzari' | 'raport';

function hasStocRedus(produs: Produs): boolean {
  return produs.variante.some(
    v => v.activa && v.stoc_minim > 0 && v.stoc_curent < v.stoc_minim
  );
}

function getStocTotal(produs: Produs): number {
  return produs.variante
    .filter(v => v.activa)
    .reduce((sum, v) => sum + v.stoc_curent, 0);
}

function getVarianteActive(produs: Produs) {
  return produs.variante.filter(v => v.activa);
}

function getPretRange(produs: Produs): string {
  const active = getVarianteActive(produs);
  if (active.length === 0) return '—';
  const preturi = active.map(v => v.pret_vanzare);
  const min = Math.min(...preturi);
  const max = Math.max(...preturi);
  if (min === max) return `${min.toFixed(2)} RON`;
  return `${min.toFixed(2)} – ${max.toFixed(2)} RON`;
}

const TAB_LABELS: { id: ActiveTab; label: string }[] = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'intrari', label: 'Intrări Marfă' },
  { id: 'vanzari', label: 'Vânzări' },
  { id: 'raport', label: 'Raport' },
];

export const ProduseManagement: React.FC<ProduseManagementProps> = ({
  currentUser,
  permissions,
  onBack,
}) => {
  const [produse, setProduse] = useState<Produs[]>([]);
  const [categorii, setCategorii] = useState<ProdusCategorieDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [showForm, setShowForm] = useState(false);
  const [editProdus, setEditProdus] = useState<Produs | null>(null);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterText, setFilterText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage = permissions.isAdminClub || permissions.isFederationAdmin;

  const clubId: string =
    (currentUser as any).activeRoleContext?.club_id ??
    currentUser.club_id ??
    '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchCategorii(), fetchProduse()])
      .then(([cats, prods]) => {
        if (!cancelled) {
          setCategorii(cats);
          setProduse(prods);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Eroare la încărcare date.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const produseFiltrate = useMemo(() => {
    return produse.filter(p => {
      const matchText = filterText === '' ||
        p.denumire.toLowerCase().includes(filterText.toLowerCase());
      const matchCat = filterCategorie === '' || p.categorie_id === filterCategorie;
      return matchText && matchCat;
    });
  }, [produse, filterText, filterCategorie]);

  const handleSave = (produsActualizat: Produs) => {
    setProduse(prev => {
      const idx = prev.findIndex(p => p.id === produsActualizat.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = produsActualizat;
        return updated;
      }
      return [...prev, produsActualizat];
    });
    setShowForm(false);
    setEditProdus(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Șterge produsul din catalog? Această acțiune nu poate fi anulată.')) return;
    setDeletingId(id);
    try {
      await deleteProdus(id);
      setProduse(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Eroare la ștergere.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (p: Produs) => {
    setEditProdus(p);
    setShowForm(true);
  };

  const openNew = () => {
    setEditProdus(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditProdus(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
            title="Înapoi"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Echipamente</h1>
            <p className="text-slate-400 text-sm">Catalog produse club</p>
          </div>
        </div>
        {canManage && activeTab === 'catalog' && (
          <Button onClick={openNew} leftIcon={<PlusIcon className="w-4 h-4" />}>
            Produs Nou
          </Button>
        )}
      </div>

      {/* Tab-uri */}
      <div className="flex gap-1 bg-[var(--t-surface-2)] p-1 rounded-xl border border-[var(--t-border)] overflow-x-auto">
        {TAB_LABELS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conținut tab */}
      {activeTab !== 'catalog' ? (
        <Card>
          <div className="py-12 text-center text-slate-400">
            Modul în curând disponibil
          </div>
        </Card>
      ) : (
        /* Tab Catalog */
        <div>
          {loading ? (
            <Card>
              <div className="py-12 text-center text-slate-400">Se încarcă...</div>
            </Card>
          ) : error ? (
            <Card>
              <div className="py-6 text-center">
                <p className="text-rose-400 text-sm">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.location.reload()}
                >
                  Reîncearcă
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Bara de filtrare */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  label=""
                  placeholder="Caută produs..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="flex-1"
                />
                <div className="sm:w-52">
                  <Select
                    value={filterCategorie}
                    onChange={e => setFilterCategorie(e.target.value)}
                  >
                    <option value="">Toate categoriile</option>
                    {categorii.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.denumire}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {produseFiltrate.length === 0 ? (
                <Card>
                  <div className="py-12 text-center">
                    <p className="text-slate-400 mb-4">Niciun produs în catalog</p>
                    {canManage && (
                      <Button onClick={openNew} leftIcon={<PlusIcon className="w-4 h-4" />}>
                        Adaugă primul produs
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <>
                  {/* Tabel desktop */}
                  <div className="hidden md:block">
                    <Card>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--t-border)] text-slate-400 text-xs uppercase tracking-wider">
                            <th className="pb-3 text-left font-semibold">Produs</th>
                            <th className="pb-3 text-left font-semibold">Categorie</th>
                            <th className="pb-3 text-center font-semibold">Variante</th>
                            <th className="pb-3 text-center font-semibold">Stoc total</th>
                            <th className="pb-3 text-left font-semibold">Preț vânzare</th>
                            {canManage && (
                              <th className="pb-3 text-right font-semibold">Acțiuni</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--t-border)]">
                          {produseFiltrate.map(p => (
                            <tr key={p.id} className="hover:bg-[var(--t-surface-2)]/50 transition-colors">
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[var(--t-text)]">{p.denumire}</span>
                                  {hasStocRedus(p) && (
                                    <Badge variant="red">Stoc redus</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-slate-400">
                                {p.categorie?.denumire ?? '—'}
                              </td>
                              <td className="py-3 pr-4 text-center text-slate-300">
                                {getVarianteActive(p).length}
                              </td>
                              <td className="py-3 pr-4 text-center text-slate-300">
                                {getStocTotal(p)}
                              </td>
                              <td className="py-3 pr-4 text-slate-300">
                                {getPretRange(p)}
                              </td>
                              {canManage && (
                                <td className="py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() => openEdit(p)}
                                    >
                                      Editează
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="xs"
                                      isLoading={deletingId === p.id}
                                      onClick={() => handleDelete(p.id)}
                                    >
                                      Șterge
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  </div>

                  {/* Carduri mobile */}
                  <div className="md:hidden space-y-2">
                    {produseFiltrate.map(p => (
                      <Card key={p.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[var(--t-text)] truncate">{p.denumire}</span>
                              {hasStocRedus(p) && (
                                <Badge variant="red">Stoc redus</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">
                              {p.categorie?.denumire ?? '—'}
                            </p>
                            <div className="flex gap-4 mt-1 text-xs text-slate-500">
                              <span>{getVarianteActive(p).length} variante</span>
                              <span>Stoc: {getStocTotal(p)}</span>
                              <span>{getPretRange(p)}</span>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex flex-col gap-1.5 shrink-0">
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => openEdit(p)}
                              >
                                Editează
                              </Button>
                              <Button
                                variant="danger"
                                size="xs"
                                isLoading={deletingId === p.id}
                                onClick={() => handleDelete(p.id)}
                              >
                                Șterge
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <ProdusFormModal
          produs={editProdus}
          categorii={categorii}
          clubId={clubId}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
};
