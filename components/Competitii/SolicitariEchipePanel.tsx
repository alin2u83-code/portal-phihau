import React, { useState, useEffect, useCallback } from 'react';
import { SolicitareEchipaIncompleta, CategorieCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { useError } from '../ErrorProvider';

export const SolicitariEchipePanel: React.FC<{
  competitieId: string;
  categorii: CategorieCompetitie[];
}> = ({ competitieId, categorii }) => {
  const { showError } = useError();
  const [solicitari, setSolicitari] = useState<SolicitareEchipaIncompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSolicitari = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitari_echipe_incomplete')
      .select('*, club_solicitant:cluburi!club_solicitant_id(id, nume), club_acceptant:cluburi!club_acceptant_id(id, nume)')
      .eq('competitie_id', competitieId)
      .order('created_at', { ascending: false });
    if (error) { showError('Eroare', error.message); }
    else setSolicitari((data || []) as SolicitareEchipaIncompleta[]);
    setLoading(false);
  }, [competitieId]);

  useEffect(() => { fetchSolicitari(); }, [fetchSolicitari]);

  const handleStatus = async (id: string, status: 'acceptata' | 'anulata') => {
    setUpdating(id);
    const { error } = await supabase
      .from('solicitari_echipe_incomplete')
      .update({ status })
      .eq('id', id);
    if (error) showError('Eroare', error.message);
    else setSolicitari(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setUpdating(null);
  };

  const statusColor: Record<string, string> = {
    deschisa: 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300',
    acceptata: 'bg-green-900/30 border-green-700/50 text-green-300',
    anulata: 'bg-slate-800 border-slate-700 text-slate-500',
  };

  if (loading) return <div className="text-center text-slate-400 py-8">Se încarcă...</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Cluburi care solicită partener inter-club pentru completarea echipelor.
      </p>
      {solicitari.length === 0 ? (
        <div className="text-center text-slate-500 py-8 italic">Nicio solicitare înregistrată.</div>
      ) : (
        <div className="space-y-3">
          {solicitari.map(s => {
            const cat = categorii.find(c => c.id === s.categorie_id);
            return (
              <div key={s.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-medium text-sm text-white">
                      {(s.club_solicitant as any)?.nume ?? s.club_solicitant_id}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {cat?.denumire ?? s.categorie_id} · {s.sportivi_disponibili.length} sportivi disponibili
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColor[s.status]}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </div>
                {s.club_acceptant && (
                  <div className="text-xs text-green-400">
                    Partener: {(s.club_acceptant as any)?.nume}
                  </div>
                )}
                {s.status === 'deschisa' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" disabled={updating === s.id}
                      onClick={() => handleStatus(s.id, 'acceptata')}>
                      Marchează acceptată
                    </Button>
                    <Button size="sm" variant="danger" disabled={updating === s.id}
                      onClick={() => handleStatus(s.id, 'anulata')}>
                      Anulează
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
