import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { CerereCoechipier } from '../../types';
import { useError } from '../ErrorProvider';

interface Props {
  competitieId: string;
}

export const CereriInterclubAdmin: React.FC<Props> = ({ competitieId }) => {
  const { showError } = useError();
  const [cereri, setCereri] = useState<CerereCoechipier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCereri = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cereri_coechipier')
        .select(`
          *,
          categorie:categorii_competitie(id, denumire, gen, varsta_min, varsta_max, grad_min_ordine),
          club_solicitant:cluburi(id, nume)
        `)
        .eq('competitie_id', competitieId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCereri((data ?? []) as CerereCoechipier[]);
    } catch (err) {
      showError('Încărcare cereri inter-club', err);
    } finally {
      setLoading(false);
    }
  }, [competitieId, showError]);

  useEffect(() => { fetchCereri(); }, [fetchCereri]);

  const handleUpdateStatus = async (id: string, status: 'aprobat' | 'respins') => {
    try {
      const { error } = await supabase
        .from('cereri_coechipier')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchCereri();
    } catch (err) {
      showError('Actualizare cerere', err);
    }
  };

  const pending = cereri.filter(c => c.status === 'pending');
  const rezolvate = cereri.filter(c => c.status !== 'pending');
  const genLabel: Record<string, string> = { M: 'Masculin', F: 'Feminin', Mixt: 'Mixt' };

  const renderCard = (cerere: CerereCoechipier, showActions: boolean) => (
    <div key={cerere.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold bg-indigo-900/40 text-indigo-300 rounded-md px-2 py-0.5">
              {cerere.club_solicitant?.nume ?? '—'}
            </span>
            <span className="text-sm font-semibold text-white">
              {cerere.categorie?.denumire ?? '—'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {cerere.categorie?.gen && (
              <span className="text-[11px] bg-slate-700 text-slate-300 rounded px-2 py-0.5">
                {genLabel[cerere.categorie.gen] ?? cerere.categorie.gen}
              </span>
            )}
            {cerere.categorie?.varsta_min != null && (
              <span className="text-[11px] bg-slate-700 text-slate-300 rounded px-2 py-0.5">
                {cerere.categorie.varsta_min}–{cerere.categorie.varsta_max ?? '?'} ani
              </span>
            )}
            {cerere.nr_locuri_solicitate > 1 && (
              <span className="text-[11px] bg-amber-900/40 text-amber-300 rounded px-2 py-0.5">
                {cerere.nr_locuri_solicitate} locuri necesare
              </span>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 shrink-0 ${
          cerere.status === 'pending' ? 'bg-amber-900/40 text-amber-300' :
          cerere.status === 'aprobat' ? 'bg-emerald-900/40 text-emerald-300' :
          'bg-red-900/40 text-red-300'
        }`}>
          {cerere.status === 'pending' ? 'Pending' :
           cerere.status === 'aprobat' ? 'Aprobat' : 'Respins'}
        </span>
      </div>
      {showActions && (
        <div className="flex gap-2">
          <button type="button" onClick={() => handleUpdateStatus(cerere.id, 'aprobat')}
            className="flex-1 bg-emerald-900/30 border border-emerald-700/50 rounded-lg py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-colors">
            Aproba
          </button>
          <button type="button" onClick={() => handleUpdateStatus(cerere.id, 'respins')}
            className="bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/50 transition-colors">
            Respinge
          </button>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="text-center text-slate-500 py-8 text-sm animate-pulse">Se incarca...</div>;

  return (
    <div className="flex flex-col gap-4">
      {pending.length === 0 && rezolvate.length === 0 && (
        <div className="text-center text-slate-500 py-12 text-sm italic">
          Nicio cerere inter-club pentru aceasta competitie.
        </div>
      )}
      {pending.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
            Cereri pending ({pending.length})
          </h3>
          <div className="flex flex-col gap-3">{pending.map(c => renderCard(c, true))}</div>
        </section>
      )}
      {rezolvate.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Rezolvate</h3>
          <div className="flex flex-col gap-3 opacity-70">{rezolvate.map(c => renderCard(c, false))}</div>
        </section>
      )}
    </div>
  );
};
