import React, { useMemo, useState, useEffect } from 'react';
import {
  CategorieCompetitie, EchipaCompetitie, Sportiv, Grad, ProbaCompetitie,
} from '../../../types';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { esteEchipaSauPereche, BadgeTipParticipare } from './shared';
import { ProbaHeader } from './constants';
import { supabase } from '../../../supabaseClient';
import { useError } from '../../ErrorProvider';

interface Pas3Props {
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  sportivi: Sportiv[];
  grade: Grad[];
  dataCompetitie: string;
  competitieId: string;
  clubSolicitantId: string;
  onOpenInscriereModal?: (cat: CategorieCompetitie) => void;
  onBack: () => void;
}

const Pas3FormareEchipe: React.FC<Pas3Props> = ({
  categorii, probe, echipe, clubId, sportivi, grade, dataCompetitie,
  competitieId, clubSolicitantId,
  onOpenInscriereModal, onBack,
}) => {
  const { showError } = useError();
  const [cereriInterclub, setCereriInterclub] = useState<Map<string, 'pending' | 'aprobat' | 'respins'>>(new Map());

  useEffect(() => {
    if (!competitieId || !clubSolicitantId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('cereri_coechipier')
          .select('categorie_id, status')
          .eq('competitie_id', competitieId)
          .eq('club_solicitant_id', clubSolicitantId)
          .in('status', ['pending', 'aprobat']);
        if (error || cancelled) return;
        const m = new Map<string, 'pending' | 'aprobat' | 'respins'>();
        for (const row of data ?? []) m.set(row.categorie_id, row.status as 'pending' | 'aprobat');
        setCereriInterclub(m);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [competitieId, clubSolicitantId]);

  const handleSolicitaInterclub = async (categorieId: string, nrLocuri: number) => {
    try {
      const { error } = await supabase.from('cereri_coechipier').insert({
        competitie_id: competitieId,
        categorie_id: categorieId,
        club_solicitant_id: clubSolicitantId,
        nr_locuri_solicitate: nrLocuri,
      });
      if (error) throw error;
      setCereriInterclub(prev => new Map(prev).set(categorieId, 'pending'));
    } catch (err) {
      showError('Trimitere cerere inter-club', err);
    }
  };

  const handleAnuleazaCerere = async (categorieId: string) => {
    try {
      const { error } = await supabase
        .from('cereri_coechipier')
        .update({ status: 'anulat' })
        .eq('competitie_id', competitieId)
        .eq('categorie_id', categorieId)
        .eq('club_solicitant_id', clubSolicitantId)
        .eq('status', 'pending');
      if (error) throw error;
      setCereriInterclub(prev => { const m = new Map(prev); m.delete(categorieId); return m; });
    } catch (err) {
      showError('Anulare cerere inter-club', err);
    }
  };
  const categoriiEchipa = useMemo(
    () => categorii
      .filter(esteEchipaSauPereche)
      .sort((a, b) => (a.ordine_afisare ?? 0) - (b.ordine_afisare ?? 0)),
    [categorii]
  );

  const firstProbaId = categoriiEchipa[0]?.proba_id;
  const tipProba = probe.find(p => p.id === firstProbaId)?.tip_proba ?? '';

  const categoriiStare = useMemo(() => categoriiEchipa.map(cat => {
    const echipaDB = echipe.find(e =>
      e.categorie_id === cat.id &&
      e.club_id === clubId &&
      e.status?.toLowerCase() !== 'retrasa'
    );
    const membri: Array<{ rol: string }> = (echipaDB as any)?.echipa_sportivi ?? [];
    const nrTitulari = membri.filter(m => m.rol === 'titular').length;
    const nrRezervă = membri.filter(m => m.rol === 'rezerva').length;
    const titMin = cat.tip_participare === 'pereche' ? 2 : (cat.sportivi_per_echipa_min ?? 1);
    const eCompleta = !!echipaDB && (nrTitulari >= titMin || echipaDB.echipa_incompleta);
    const eligibili = sportivi.filter(s => verificaEligibilitate(s, cat, grade, dataCompetitie).eligibil).length;
    return { cat, echipaDB, nrTitulari, nrRezervă, eCompleta, eligibili };
  }), [categoriiEchipa, echipe, clubId, sportivi, grade, dataCompetitie]);

  const nrConfigurate = categoriiStare.filter(c => c.eCompleta).length;
  const nrTotal = categoriiStare.filter(c => c.eligibili > 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5">
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">Echipe — configurare</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {nrConfigurate}/{nrTotal} categor{nrTotal === 1 ? 'ie configurată' : 'ii configurate'}
          </p>
        </div>
      </div>

      {tipProba && <ProbaHeader tipProba={tipProba} />}

      {/* Carduri categorii */}
      <div className="space-y-3">
        {categoriiStare.map(({ cat, echipaDB, nrTitulari, nrRezervă, eCompleta, eligibili }) => {
          const titMin = cat.tip_participare === 'pereche' ? 2 : (cat.sportivi_per_echipa_min ?? 1);
          const areEligibili = eligibili > 0;

          return (
            <div
              key={cat.id}
              className={`rounded-xl border bg-slate-800/40 transition-all ${
                eCompleta
                  ? 'border-emerald-600/50'
                  : !areEligibili
                    ? 'border-dashed border-slate-600 opacity-50'
                    : 'border-slate-600'
              }`}
            >
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <BadgeTipParticipare tip={cat.tip_participare} />
                      {cat.gen && cat.gen !== 'Mixt' && (
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {cat.gen}
                        </span>
                      )}
                      {cat.gen === 'Mixt' && (
                        <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">
                          Mixt
                        </span>
                      )}
                    </div>

                    {/* Denumire */}
                    <p className="text-sm font-semibold text-white leading-tight">
                      {cat.denumire ?? `Categoria ${cat.numar_categorie}`}
                    </p>

                    {/* Info */}
                    <p className="text-xs text-slate-400 mt-1">
                      {cat.varsta_min}–{cat.varsta_max != null ? cat.varsta_max : '∞'} ani
                      {(cat.sportivi_per_echipa_max ?? 0) > 0 && ` · ${cat.sportivi_per_echipa_max} titular${cat.sportivi_per_echipa_max !== 1 ? 'i' : ''}`}
                      {(cat.rezerve_max ?? 0) > 0 && ` + ${cat.rezerve_max} rezerv${cat.rezerve_max !== 1 ? 'e' : 'ă'}`}
                      {areEligibili && ` · ${eligibili} eligibil${eligibili !== 1 ? 'i' : ''}`}
                    </p>

                    {/* Status echipă */}
                    {echipaDB && (
                      <p className="text-xs mt-1.5">
                        <span className={eCompleta ? 'text-emerald-400 font-medium' : 'text-orange-400'}>
                          {nrTitulari}/{titMin} titular{titMin !== 1 ? 'i' : ''}
                          {nrRezervă > 0 && ` · ${nrRezervă} rezerv${nrRezervă !== 1 ? 'e' : 'ă'}`}
                          {echipaDB.echipa_incompleta && ' · incompletă acceptată'}
                        </span>
                        {eCompleta && <span className="ml-1 text-emerald-500">✓</span>}
                      </p>
                    )}

                    {!areEligibili && (
                      <p className="text-xs text-slate-500 italic mt-1">Niciun sportiv eligibil în club</p>
                    )}
                  </div>

                  {/* Buton acțiune */}
                  {areEligibili && (
                    <button
                      type="button"
                      onClick={() => onOpenInscriereModal?.(cat)}
                      style={{ touchAction: 'manipulation' }}
                      className={`shrink-0 text-xs px-3 py-2 rounded-lg border font-medium transition-colors min-h-[40px] ${
                        eCompleta
                          ? 'border-emerald-600/60 text-emerald-400 hover:bg-emerald-900/30'
                          : 'border-brand-primary/60 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20'
                      }`}
                    >
                      {eCompleta ? 'Modifică' : 'Configurează'}
                    </button>
                  )}
                </div>
              </div>

              {/* Buton cerere inter-club — vizibil doar pe categorii incomplete cu eligibili */}
              {areEligibili && !eCompleta && (() => {
                const statusCerere = cereriInterclub.get(cat.id);
                const nrLocuriLipsa = titMin - nrTitulari;

                if (statusCerere === 'pending') {
                  return (
                    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-blue-800/50 bg-blue-950/20 px-3 py-2.5">
                      <span className="text-sm">📨</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-300">Cerere trimisă</p>
                        <p className="text-[11px] text-blue-400/60">Super admin decide completarea</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAnuleazaCerere(cat.id)}
                        style={{ touchAction: 'manipulation' }}
                        className="text-[11px] text-slate-500 underline hover:text-slate-400"
                      >
                        Anulează
                      </button>
                    </div>
                  );
                }

                if (statusCerere === 'aprobat') {
                  return (
                    <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-3 py-2.5">
                      <span className="text-sm">✅</span>
                      <p className="text-xs font-semibold text-emerald-300">Completare aprobată de super admin</p>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => handleSolicitaInterclub(cat.id, nrLocuriLipsa)}
                    style={{ touchAction: 'manipulation' }}
                    className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center gap-2 rounded-xl border border-dashed border-amber-700/60 bg-amber-950/10 px-3 py-2.5 text-left hover:bg-amber-950/20 transition-colors"
                  >
                    <span className="text-sm">🤝</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-400">
                        Solicită completare din alt club
                        {nrLocuriLipsa > 1 ? ` (${nrLocuriLipsa} locuri)` : ''}
                      </p>
                      <p className="text-[11px] text-amber-600/70">Super admin asignează sportivi eligibili</p>
                    </div>
                    <span className="text-amber-600 text-xs">→</span>
                  </button>
                );
              })()}
            </div>
          );
        })}

        {categoriiEchipa.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/30 px-4 py-8 text-center">
            <p className="text-sm text-slate-500 italic">Nicio categorie echipă pentru această probă.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        <Button variant="secondary" onClick={onBack} className="w-full">
          Înapoi la probe
        </Button>
      </div>
    </div>
  );
};

export default Pas3FormareEchipe;
