import React, { useMemo } from 'react';
import {
  CategorieCompetitie, EchipaCompetitie, Sportiv, Grad, ProbaCompetitie,
} from '../../../types';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { verificaEligibilitate } from '../../../utils/eligibilitateCompetitie';
import { esteEchipaSauPereche, BadgeTipParticipare } from './shared';
import { ProbaHeader } from './constants';

interface Pas3Props {
  categorii: CategorieCompetitie[];
  probe: ProbaCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  sportivi: Sportiv[];
  grade: Grad[];
  dataCompetitie: string;
  onOpenInscriereModal?: (cat: CategorieCompetitie) => void;
  onBack: () => void;
}

const Pas3FormareEchipe: React.FC<Pas3Props> = ({
  categorii, probe, echipe, clubId, sportivi, grade, dataCompetitie,
  onOpenInscriereModal, onBack,
}) => {
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
