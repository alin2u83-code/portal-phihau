import React, { useState, useMemo, startTransition } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Sportiv, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Card, ConfirmModal } from '../ui';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { areVizaFRAM, WarningVizaFRAM } from './constants';
import { InscriereModal } from './InscriereModal';
import { CompetitieFilterBar } from './CompetitieFilterBar';
import { aplicaFiltreCategorie } from '../../hooks/useCompetitieFilters';
import type { CompetitieFiltre } from '../../hooks/useCompetitieFilters';

export interface InscrieriViewProps {
  competitie: Competitie;
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  grade: Grad[];
  isAdmin: boolean;
  isClubAdmin: boolean;
  isSuperAdmin?: boolean;
  myClubId: string | null;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  sportivi: Sportiv[];
  onRefresh: () => void;
  filtre: CompetitieFiltre;
  toggleGen: (gen: string) => void;
  setFiltre: (partial: Partial<CompetitieFiltre>) => void;
  resetFiltre: () => void;
  nrFiltreActive: number;
}

export const InscrieriView: React.FC<InscrieriViewProps> = ({
  competitie, categorii, probe, inscrieri, echipe, grade, isAdmin, isClubAdmin, isSuperAdmin, myClubId, numeClub, vizeSportivi, sportivi, onRefresh,
  filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive
}) => {
  const { showError } = useError();
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();
  const [echipeRetraseLocal, setEchipeRetraseLocal] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string; title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} });
  const openConfirm = (message: string, onConfirm: () => void, opts?: { title?: string; confirmLabel?: string; variant?: 'danger' | 'warning' | 'info' }) => setConfirmDialog({ open: true, message, onConfirm, ...opts });
  // Expand/collapse secțiuni per probă în tab Înscrieri
  const [expandedProbe, setExpandedProbe] = useState<Set<string>>(new Set(['__individual__', '__echipe__', ...probe.map(p => p.id)]));
  const [editEchipaCategorie, setEditEchipaCategorie] = useState<CategorieCompetitie | null>(null);
  const [editEchipaClubId, setEditEchipaClubId] = useState<string>('');
  const categoriiVizibile = useMemo(() => {
    const areFiltre = filtre.gen.size > 0 || filtre.probaId || filtre.varstaMin ||
      filtre.varstaMax || filtre.gradMin || filtre.gradMax;
    if (!areFiltre) return null;
    return new Set(aplicaFiltreCategorie(categorii, filtre).map(c => c.id));
  }, [categorii, filtre]);

  const canSeeAll = isAdmin;
  const statusOrdine: Record<string, number> = { inscris: 0, confirmat: 1 };
  const filteredInscrieri = (canSeeAll ? inscrieri : inscrieri.filter(i => i.club_id === myClubId))
    .filter(i => i.status?.toLowerCase() !== 'retras')
    .filter(i => !categoriiVizibile || categoriiVizibile.has(i.categorie_id))
    .slice()
    .sort((a, b) => (statusOrdine[a.status] ?? 9) - (statusOrdine[b.status] ?? 9));
  const filteredEchipe = (canSeeAll ? echipe : echipe.filter(e => e.club_id === myClubId))
    .filter(e => e.status?.toLowerCase() !== 'retrasa')
    .filter(e => !echipeRetraseLocal.has((e as any).id))
    .filter(e => !categoriiVizibile || categoriiVizibile.has(e.categorie_id));

  const toggleProba = (key: string) => {
    setExpandedProbe(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleRetrage = (id: string, type: 'inscris' | 'echipa') => {
    openConfirm('Sigur vrei să retragi această înscriere? Acțiunea nu poate fi anulată.', async () => {
      if (type === 'inscris') {
        // DELETE definitiv din inscrieri_competitie (confirmat de utilizator)
        // NOTA RLS: dacă DELETE este blocat, adaugă în Supabase Dashboard:
        // CREATE POLICY "club_admin_delete_inscrieri" ON inscrieri_competitie
        //   FOR DELETE USING (
        //     club_id IN (
        //       SELECT club_id FROM roluri_utilizatori
        //       WHERE user_id = auth.uid() AND rol_denumire IN ('ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
        //     )
        //   );
        const { error } = await supabase.from('inscrieri_competitie').delete().eq('id', id);
        if (error) { showError("Eroare retragere", error.message); return; }
      } else {
        // Echipe rămân cu status update (nu DELETE — confirmat doar pentru inscrieri individuale)
        const { error } = await supabase.from('echipe_competitie').update({ status: 'retrasa' }).eq('id', id);
        if (error) { showError("Eroare retragere echipă", error.message); return; }
        setEchipeRetraseLocal(prev => new Set(prev).add(id));
      }
      startTransition(() => onRefresh());
    }, { title: 'Retrage înscriere', confirmLabel: 'Retrage', variant: 'warning' });
  };

  const individualExpanded = expandedProbe.has('__individual__');
  const echipeExpanded = expandedProbe.has('__echipe__');

  return (
    <div className="space-y-6">
      <CompetitieFilterBar
        filtre={filtre}
        toggleGen={toggleGen}
        setFiltre={setFiltre}
        resetFiltre={resetFiltre}
        nrFiltreActive={nrFiltreActive}
        probe={probe}
        grade={grade}
      />

      {/* Individual */}
      {filteredInscrieri.length > 0 && (
        <div>
          <button
            onClick={() => toggleProba('__individual__')}
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Înregistrări Individuale ({filteredInscrieri.length})
            </h3>
            <svg className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform ${individualExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {individualExpanded && (
          <div className="-mx-4 sm:mx-0 overflow-x-auto">
            <table className="w-full text-sm text-slate-300 min-w-[320px]">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="p-2 text-left">Sportiv</th>
                  <th className="p-2 text-left hidden md:table-cell">Categorie</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-center hidden md:table-cell">Taxă</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInscrieri.map(ins => {
                  const cat = categorii.find(c => c.id === ins.categorie_id);
                  const sportiv = ins.sportiv as any;
                  const faraViza = sportiv && !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
                  return (
                    <tr key={ins.id} className={faraViza ? 'bg-yellow-900/10' : ''}>
                      <td className="p-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-white uppercase">
                            {sportiv?.nume} {sportiv?.prenume}
                          </span>
                          {canSeeAll && (sportiv as any)?.cluburi?.nume && (
                            <span className="text-[10px] text-slate-400 normal-case">{(sportiv as any).cluburi.nume}</span>
                          )}
                          <WarningVizaFRAM show={faraViza} inline />
                        </div>
                      </td>
                      <td className="p-2 hidden md:table-cell text-xs text-slate-400">
                        {cat?.denumire || '-'}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ins.status === 'confirmat' ? 'bg-green-800 text-green-200' :
                          ins.status === 'retras' ? 'bg-red-800 text-red-200' :
                          'bg-slate-700 text-slate-300'
                        }`}>{ins.status}</span>
                      </td>
                      <td className="p-2 text-center hidden md:table-cell">
                        {ins.taxa_achitata
                          ? <span className="text-green-400 text-xs">Achitată</span>
                          : <span className="text-red-400 text-xs">Neachitată</span>}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col sm:flex-row gap-1 items-end sm:items-center justify-end">
                          {!isSuperAdmin && ins.status === 'inscris' && (isAdmin || ins.club_id === myClubId) && (
                            <Button size="sm" variant="danger" onClick={() => handleRetrage(ins.id, 'inscris')}
                              className="text-xs !py-1">Retrage</Button>
                          )}
                          {!isSuperAdmin && isAdmin && ins.status !== 'confirmat' && ins.status !== 'retras' && (
                            <Button size="sm" variant="success" className="text-xs !py-1"
                              onClick={async () => {
                                await supabase.from('inscrieri_competitie').update({ status: 'confirmat' }).eq('id', ins.id);
                                startTransition(() => onRefresh());
                              }}>
                              Confirmă
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Echipe */}
      {filteredEchipe.length > 0 && (
        <div>
          <button
            onClick={() => toggleProba('__echipe__')}
            style={{ touchAction: 'manipulation' }}
            className="w-full flex items-center justify-between mb-2 group"
          >
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Echipe ({filteredEchipe.length})
            </h3>
            <svg className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform ${echipeExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {echipeExpanded && (
          <div className="space-y-2">
            {filteredEchipe.map(ec => {
              const cat = categorii.find(c => c.id === ec.categorie_id);
              const sportivi = (ec as any).echipa_sportivi || [];
              return (
                <Card key={ec.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-white">
                        {ec.denumire_echipa || 'Echipă fără denumire'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{cat?.denumire}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sportivi.map((ms: any) => {
                          const faraViza = ms.sportiv && !areVizaFRAM(ms.sportiv.id, anCompetitie, vizeSportivi);
                          return (
                            <span key={ms.sportiv_id} className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${faraViza ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-700/50' : 'bg-slate-700 text-slate-300'}`}>
                              <span className="uppercase">{ms.sportiv?.nume} {ms.sportiv?.prenume}</span>
                              {ms.rol === 'rezerva' && <span className="text-slate-500 ml-1">(R)</span>}
                              {faraViza && <span title="Fără viză FRAM">⚠</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ec.status === 'confirmata' ? 'bg-green-800 text-green-200' :
                        ec.status === 'retrasa' ? 'bg-red-800 text-red-200' :
                        'bg-slate-700 text-slate-300'
                      }`}>{ec.status}</span>
                      {(isAdmin || (isClubAdmin && ec.club_id === myClubId)) && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const cat = categorii.find(c => c.id === ec.categorie_id);
                            if (cat) {
                              setEditEchipaCategorie(cat);
                              setEditEchipaClubId((ec as any).club_id || myClubId || '');
                            }
                          }}
                          style={{ touchAction: 'manipulation' }}
                        >
                          Editează componența
                        </Button>
                      )}
                      {!isSuperAdmin && ec.status === 'inscrisa' && (isAdmin || ec.club_id === myClubId) && (
                        <Button size="sm" variant="danger" className="text-xs !py-1"
                          onClick={() => handleRetrage(ec.id, 'echipa')}>Retrage</Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          )}
        </div>
      )}

      {filteredInscrieri.length === 0 && filteredEchipe.length === 0 && (
        <div className="text-center text-slate-500 py-12 italic">
          {nrFiltreActive > 0
            ? 'Nicio înscriere nu corespunde filtrelor aplicate.'
            : canSeeAll ? 'Nicio înscriere înregistrată.' : 'Clubul tău nu are sportivi înscriși la această competiție.'}
        </div>
      )}

      {editEchipaCategorie && (
        <InscriereModal
          competitie={competitie}
          categorie={editEchipaCategorie}
          sportivi={sportivi.filter((s: any) => s.club_id === editEchipaClubId)}
          grade={grade}
          inscrieri={inscrieri}
          echipe={echipe}
          clubId={editEchipaClubId}
          numeClub={numeClub}
          vizeSportivi={vizeSportivi}
          initialEditMode={true}
          onClose={() => { setEditEchipaCategorie(null); setEditEchipaClubId(''); }}
          onSaved={() => { setEditEchipaCategorie(null); setEditEchipaClubId(''); onRefresh(); }}
        />
      )}

      <ConfirmModal
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog(d => ({ ...d, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        message={confirmDialog.message}
        title={confirmDialog.title}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
      />
    </div>
  );
};
