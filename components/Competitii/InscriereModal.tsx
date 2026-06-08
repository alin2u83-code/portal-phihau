import React, { useState, useEffect, useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Sportiv, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { filtreazaSportiviEligibili, calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { areVizaFRAM, WarningVizaFRAM } from './constants';

export interface InscriereModalProps {
  competitie: Competitie;
  categorie: CategorieCompetitie;
  sportivi: Sportiv[];
  grade: Grad[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  initialEditMode?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const InscriereModal: React.FC<InscriereModalProps> = ({
  competitie, categorie, sportivi, grade, inscrieri, echipe, clubId, numeClub, vizeSportivi, initialEditMode, onClose, onSaved
}) => {
  const anCompetitie = new Date(competitie.data_inceput).getFullYear();
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [retragereLoading, setRetragereLoading] = useState<string | null>(null);
  const isTeam = categorie.tip_participare !== 'individual';

  // IDs sportivi retrași local în această sesiune a modalului (pentru a actualiza lista fără a închide modalul)
  const [retrasiLocal, setRetrasiLocal] = useState<Set<string>>(new Set());

  // Retragere sportiv individual deja înscris (din modal) — rămâne deschis, actualizează local
  const handleRetrageIndividual = async (sportivId: string) => {
    const ins = inscrieri.find(i => i.categorie_id === categorie.id && i.sportiv_id === sportivId && i.status?.toLowerCase() !== 'retras');
    if (!ins) return;
    setRetragereLoading(sportivId);
    // DELETE definitiv din inscrieri_competitie (confirmat de utilizator)
    // NOTA: necesită politică RLS pentru DELETE pe inscrieri_competitie:
    // CREATE POLICY "club_admin_delete_inscrieri" ON inscrieri_competitie
    //   FOR DELETE USING (
    //     club_id IN (
    //       SELECT club_id FROM roluri_utilizatori
    //       WHERE user_id = auth.uid() AND rol_denumire IN ('ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE')
    //     )
    //   );
    const { error } = await supabase.from('inscrieri_competitie').delete().eq('id', ins.id);
    if (error) {
      showError('Eroare retragere', error.message);
    } else {
      setRetrasiLocal(prev => new Set(prev).add(sportivId));
    }
    setRetragereLoading(null);
  };


  // For echipa/pereche
  const [selectedTitulari, setSelectedTitulari] = useState<string[]>([]);
  const [selectedRezerve, setSelectedRezerve] = useState<string[]>([]);

  // Eligibility check
  const eligibilitati = filtreazaSportiviEligibili(
    sportivi, categorie, grade, competitie.data_inceput
  );

  const eligibili = eligibilitati.filter(e => e.eligibilitate.eligibil);

  // Task 4: editMode și echipaDejaInscrisa — declarate ÎNAINTE de inscrisInEchipa
  // (inscrisInEchipa depinde de editMode și echipaDejaInscrisa)
  const [editMode, setEditMode] = useState(initialEditMode ?? false);

  // Task 4: echipă deja înscrisă din clubul curent
  const echipaDejaInscrisa = useMemo(() => {
    if (!isTeam) return null;
    return (echipe as any[]).find(
      e => e.categorie_id === categorie.id && e.club_id === clubId && e.status?.toLowerCase() !== 'retrasa'
    ) ?? null;
  }, [echipe, categorie.id, clubId, isTeam]);

  // Check already inscribed (pentru această categorie) — exclude sportivii retrași local în această sesiune
  const inscrisPrev = new Set(
    inscrieri
      .filter(i => i.categorie_id === categorie.id && i.status?.toLowerCase() !== 'retras' && !retrasiLocal.has(i.sportiv_id))
      .map(i => i.sportiv_id)
  );
  // inscrisInEchipa: sportivi din echipe ALTELE DECÂT echipa proprie (în editMode), sau toate
  const inscrisInEchipa = new Set(
    (echipe.filter(e =>
      e.categorie_id === categorie.id &&
      e.status?.toLowerCase() !== 'retrasa' &&
      // la editMode, excludem echipa proprie din "deja înscriși" ca să devină editabili
      !(editMode && echipaDejaInscrisa && (e as any).id === (echipaDejaInscrisa as any).id)
    ) as any[])
      .flatMap(e => (e.echipa_sportivi || []).map((ms: any) => ms.sportiv_id))
  );

  // Task 2: sortare — eligibili neinscrisi → eligibili deja inscriși
  const eligibiliSortati = useMemo(() => {
    const neinscrisi = eligibili.filter(e => !inscrisPrev.has(e.sportiv.id) && !inscrisInEchipa.has(e.sportiv.id));
    const dejaInscrisiLst = eligibili.filter(e => inscrisPrev.has(e.sportiv.id) || inscrisInEchipa.has(e.sportiv.id));
    return { neinscrisi, dejaInscrisiLst };
  }, [eligibili, editMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Task 3: verificare categorie thao_quyen individual (nelimitat = sportivi_per_echipa_max === 0 sau tip_participare individual + proba thao_quyen)
  const esteThaoQuyenIndividualModal = !isTeam && (
    categorie.proba?.tip_proba === 'thao_quyen_individual' ||
    categorie.proba?.tip_proba === 'thao_lo_individual'
  );

  // Problemă 5: multi-select pentru categorii individuale standard
  const [selectedIndividuali, setSelectedIndividuali] = useState<string[]>([]);
  const toggleIndividual = (id: string) => {
    setSelectedIndividuali(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Task 3: selectare în masă
  const allEligibiliNeinscrisi = eligibiliSortati.neinscrisi.map(e => e.sportiv.id);
  const allSelected = allEligibiliNeinscrisi.length > 0 &&
    allEligibiliNeinscrisi.every(id => selectedTitulari.includes(id));
  // Selectare toți individuali
  const allIndividualiSelected = allEligibiliNeinscrisi.length > 0 &&
    allEligibiliNeinscrisi.every(id => selectedIndividuali.includes(id));

  useEffect(() => {
    if (echipaDejaInscrisa && !editMode) return;
    if (editMode && echipaDejaInscrisa) {
      // Precompletăm cu membrii echipei existente
      const membri = (echipaDejaInscrisa as any).echipa_sportivi || [];
      const titulari = membri.filter((m: any) => m.rol === 'titular').map((m: any) => m.sportiv_id);
      const rezerve = membri.filter((m: any) => m.rol === 'rezerva').map((m: any) => m.sportiv_id);
      setSelectedTitulari(titulari);
      setSelectedRezerve(rezerve);
    }
  }, [editMode, echipaDejaInscrisa]);

  const toggleTitular = (id: string) => {
    setSelectedTitulari(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (!esteThaoQuyenIndividualModal && categorie.sportivi_per_echipa_max > 0 && prev.length >= categorie.sportivi_per_echipa_max) return prev;
      // Mixt: dacă adăugând sportivul nu mai rămân locuri pentru genul lipsă, blochează
      if (categorie.gen === 'Mixt' && categorie.sportivi_per_echipa_max > 0) {
        const newList = [...prev, id];
        const nM = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Masculin').length;
        const nF = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Feminin').length;
        const libre = categorie.sportivi_per_echipa_max - newList.length;
        if ((nM === 0 ? 1 : 0) + (nF === 0 ? 1 : 0) > libre) return prev;
      }
      return [...prev, id];
    });
  };

  const toggleRezerva = (id: string) => {
    setSelectedRezerve(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= categorie.rezerve_max) return prev;
      return [...prev, id];
    });
  };

  // Task 3: selectare/deselectare toți
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTitulari([]);
    } else {
      setSelectedTitulari(allEligibiliNeinscrisi);
    }
  };

  const validateMixtGender = (ids: string[]) => {
    if (categorie.gen !== 'Mixt' || !isTeam) return;
    const selected = sportivi.filter(s => ids.includes(s.id));
    const hasMale = selected.some(s => s.gen === 'Masculin');
    const hasFemale = selected.some(s => s.gen === 'Feminin');
    if (!hasMale || !hasFemale) {
      throw new Error('Echipa Mixt trebuie să conțină cel puțin un băiat și o fată');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!isTeam) {
        // Problemă 5: multi-select individual — inserăm toți sportivii selectați
        if (selectedIndividuali.length === 0) throw new Error('Selectează cel puțin un sportiv');
        const inserts = selectedIndividuali.map(sportivId => ({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          sportiv_id: sportivId,
        }));
        const { error } = await supabase.from('inscrieri_competitie').insert(inserts);
        if (error) throw error;
      } else if (editMode && echipaDejaInscrisa) {
        // Task 4: actualizare componență echipă existentă
        if (selectedTitulari.length === 0) {
          throw new Error('Selectează cel puțin un titular');
        }
        const eIncompleta = selectedTitulari.length < categorie.sportivi_per_echipa_min;
        if (!eIncompleta) validateMixtGender(selectedTitulari);
        // Ștergem membrii vechi și inserăm cei noi
        const { error: delErr } = await supabase
          .from('echipa_sportivi')
          .delete()
          .eq('echipa_id', (echipaDejaInscrisa as any).id);
        if (delErr) throw delErr;
        const members = [
          ...selectedTitulari.map(id => ({ echipa_id: (echipaDejaInscrisa as any).id, sportiv_id: id, rol: 'titular' })),
          ...selectedRezerve.map(id => ({ echipa_id: (echipaDejaInscrisa as any).id, sportiv_id: id, rol: 'rezerva' })),
        ];
        if (members.length > 0) {
          const { error: mErr } = await supabase.from('echipa_sportivi').insert(members);
          if (mErr) throw mErr;
        }
        await supabase.from('echipe_competitie')
          .update({ denumire_echipa: numeClub.trim().toUpperCase(), echipa_incompleta: eIncompleta })
          .eq('id', (echipaDejaInscrisa as any).id);
      } else {
        if (selectedTitulari.length === 0) {
          throw new Error('Selectează cel puțin un titular');
        }
        const eIncompleta = selectedTitulari.length < categorie.sportivi_per_echipa_min;
        if (!eIncompleta) validateMixtGender(selectedTitulari);
        const { data: ec, error: ecErr } = await supabase.from('echipe_competitie').insert({
          competitie_id: competitie.id,
          categorie_id: categorie.id,
          club_id: clubId,
          denumire_echipa: numeClub.trim().toUpperCase() || null,
          echipa_incompleta: eIncompleta,
        }).select().single();
        if (ecErr) throw ecErr;

        const members = [
          ...selectedTitulari.map(id => ({ echipa_id: ec.id, sportiv_id: id, rol: 'titular' })),
          ...selectedRezerve.map(id => ({ echipa_id: ec.id, sportiv_id: id, rol: 'rezerva' })),
        ];
        const { error: mErr } = await supabase.from('echipa_sportivi').insert(members);
        if (mErr) throw mErr;
      }
      onSaved();
    } catch (err: any) {
      showError("Eroare", err.message || "Eroare la înscriere");
    } finally {
      setLoading(false);
    }
  };

  // Helper randare rând sportiv individual — Problemă 5: checkbox multi-select
  const renderSportivIndividual = (sportiv: Sportiv, deja: boolean) => {
    const varsta = sportiv.data_nasterii
      ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput)
      : null;
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    const faraViza = !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
    const isChecked = selectedIndividuali.includes(sportiv.id);
    const isRetragandLoading = retragereLoading === sportiv.id;
    return (
      <div
        key={sportiv.id}
        className={`flex items-center gap-3 p-2 rounded border transition-colors ${
          deja ? 'border-blue-700/40 bg-blue-900/10' :
          isChecked ? 'border-brand-primary bg-brand-primary/10' :
          'border-slate-700 hover:border-slate-500'
        }`}
      >
        <input
          type="checkbox"
          value={sportiv.id}
          disabled={deja}
          checked={isChecked || deja}
          onChange={() => !deja && toggleIndividual(sportiv.id)}
          className="w-4 h-4 cursor-pointer"
          style={{ cursor: deja ? 'default' : 'pointer' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-white font-medium uppercase">{sportiv.nume} {sportiv.prenume}</span>
            {deja && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-2 py-0.5">
                Inscris
              </span>
            )}
            <WarningVizaFRAM show={faraViza} inline />
          </div>
          <div className="text-xs text-slate-400">
            {varsta !== null ? `${varsta} ani` : ''}{grad?.nume ? ` · ${grad.nume}` : ''}
          </div>
        </div>
        {deja && (
          <button
            onClick={() => handleRetrageIndividual(sportiv.id)}
            disabled={isRetragandLoading}
            style={{ touchAction: 'manipulation' }}
            className="shrink-0 text-[10px] font-medium px-2 py-1 rounded border border-red-700/60 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40"
            title="Retrage sportivul din această categorie"
          >
            {isRetragandLoading ? '...' : 'Retrage'}
          </button>
        )}
      </div>
    );
  };

  // Helper randare rând sportiv echipă
  const renderSportivEchipa = (sportiv: Sportiv, deja: boolean) => {
    const varsta = sportiv.data_nasterii
      ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput) : null;
    const grad = grade.find(g => g.id === sportiv.grad_actual_id);
    const isRezerva = selectedRezerve.includes(sportiv.id);
    const faraViza = !areVizaFRAM(sportiv.id, anCompetitie, vizeSportivi);
    const isMixtBlocked = !deja && !selectedTitulari.includes(sportiv.id) && categorie.gen === 'Mixt' && (() => {
      const newList = [...selectedTitulari, sportiv.id];
      const nM = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Masculin').length;
      const nF = newList.filter(sid => sportivi.find(s => s.id === sid)?.gen === 'Feminin').length;
      const libre = (categorie.sportivi_per_echipa_max || 0) - newList.length;
      return (nM === 0 ? 1 : 0) + (nF === 0 ? 1 : 0) > libre;
    })();
    const isDisabled = deja || isRezerva || isMixtBlocked;
    return (
      <label key={sportiv.id} style={{ touchAction: 'manipulation' }} className={`flex items-center gap-3 p-2 rounded cursor-pointer border transition-colors ${
        isDisabled ? 'opacity-40 cursor-not-allowed border-transparent' :
        selectedTitulari.includes(sportiv.id) ? 'border-brand-primary bg-brand-primary/10' :
        'border-slate-700 hover:border-slate-500'
      }`}
        title={isMixtBlocked ? 'Trebuie adăugat cel puțin un sportiv din genul lipsă' : undefined}
      >
        <input type="checkbox" checked={selectedTitulari.includes(sportiv.id) || deja}
          disabled={isDisabled}
          onChange={() => !isDisabled && toggleTitular(sportiv.id)}
          className="w-4 h-4" />
        <div className="flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-sm text-white uppercase">{sportiv.nume} {sportiv.prenume}</span>
            {deja && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-700/50 rounded-full px-1.5 py-0.5">
                In echipă
              </span>
            )}
            <WarningVizaFRAM show={faraViza} inline />
          </div>
          <div className="text-xs text-slate-400">{varsta !== null ? `${varsta} ani` : ''}{grad?.nume ? ` · ${grad.nume}` : ''}</div>
        </div>
      </label>
    );
  };

  const handleClose = () => {
    if (retrasiLocal.size > 0) {
      onSaved();
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title={`Înscrie la: ${categorie.denumire}`}>
      <div className="-m-4 sm:-m-6">
      <div className="p-4 sm:p-6 space-y-4">
        <div className="bg-slate-800 rounded-lg p-3 text-sm">
          <div className="text-slate-300">{categorie.denumire}</div>
          {categorie.arma && <div className="text-orange-400 text-xs mt-0.5">Armă: {categorie.arma}</div>}
          <div className="text-xs text-slate-500 mt-1">
            Participare: <strong className="text-slate-300">{categorie.tip_participare}</strong>
            {isTeam && categorie.sportivi_per_echipa_max > 0 && ` · ${categorie.sportivi_per_echipa_max} sportivi/echipă`}
            {categorie.rezerve_max > 0 && ` · max ${categorie.rezerve_max} rezerve`}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Taxă: <strong className="text-green-400">{isTeam ? competitie.taxa_echipa : competitie.taxa_individual} lei</strong>
          </div>
        </div>

        {/* Task 4: blocare înscriere echipă dublă */}
        {isTeam && echipaDejaInscrisa && !editMode ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-300">Clubul tău are deja o echipă înscrisă</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  {(echipaDejaInscrisa as any).denumire_echipa || 'Echipă fără denumire'} — {
                    ((echipaDejaInscrisa as any).echipa_sportivi || []).length
                  } membri
                </p>
              </div>
            </div>
            <Button
              variant="warning"
              onClick={() => setEditMode(true)}
              className="w-full"
            >
              Modifică componența echipei
            </Button>
          </div>
        ) : !isTeam ? (
          /* Individual — Problemă 5: multi-select checkbox */
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-sm text-slate-300 font-medium">
                Sportivi eligibili ({eligibili.length})
                {selectedIndividuali.length > 0 && (
                  <span className="ml-2 text-brand-primary font-bold">— {selectedIndividuali.length} selectați</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {allEligibiliNeinscrisi.length > 1 && (
                  <button
                    onClick={() => {
                      if (allIndividualiSelected) {
                        setSelectedIndividuali([]);
                      } else {
                        setSelectedIndividuali(allEligibiliNeinscrisi);
                      }
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className="text-xs font-medium text-brand-primary hover:underline transition-colors min-h-[32px] px-2"
                  >
                    {allIndividualiSelected ? 'Deselectează toți' : `Selectează toți (${allEligibiliNeinscrisi.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto overscroll-contain space-y-1">
              {/* Primii — eligibili neinscrisi */}
              {eligibiliSortati.neinscrisi.map(({ sportiv }) => renderSportivIndividual(sportiv, false))}
              {/* Dedesubt — eligibili deja inscriși */}
              {eligibiliSortati.dejaInscrisiLst.length > 0 && (
                <>
                  {eligibiliSortati.neinscrisi.length > 0 && (
                    <div className="py-1 px-2">
                      <div className="border-t border-slate-700/60 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide whitespace-nowrap bg-slate-900 pr-2">
                          Deja înscriși în această categorie
                        </span>
                      </div>
                    </div>
                  )}
                  {eligibiliSortati.dejaInscrisiLst.map(({ sportiv }) => renderSportivIndividual(sportiv, true))}
                </>
              )}
              {eligibili.length === 0 && (
                <div className="text-center text-slate-500 py-4 italic text-sm">
                  Niciun sportiv eligibil din club pentru această categorie.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Echipă / Pereche */
          <div className="space-y-3">
            {editMode && echipaDejaInscrisa && (
              <div className="flex items-center gap-2 p-2 bg-blue-900/20 border border-blue-700/40 rounded-lg text-xs text-blue-300">
                <span>Editezi componența echipei existente.</span>
                <button onClick={() => setEditMode(false)} className="text-blue-400 hover:underline ml-auto">Anulează</button>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <span className="text-sm text-slate-300 font-medium flex items-center gap-2 flex-wrap">
                  Titulari ({selectedTitulari.length}{categorie.sportivi_per_echipa_max > 0 ? `/${categorie.sportivi_per_echipa_max}` : ''})
                  {categorie.gen === 'Mixt' && (() => {
                    const sel = sportivi.filter(s => selectedTitulari.includes(s.id));
                    const m = sel.filter(s => s.gen === 'Masculin').length;
                    const f = sel.filter(s => s.gen === 'Feminin').length;
                    const ok = m >= 1 && f >= 1;
                    return (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ok ? 'bg-green-800 text-green-200' : 'bg-red-900/60 text-red-300'}`}>
                        {m}M / {f}F {ok ? '✓' : '— minim 1M+1F'}
                      </span>
                    );
                  })()}
                </span>
              </div>

              {/* Categorii MIXT: afișare separată pe gen Masculin / Feminin */}
              {categorie.gen === 'Mixt' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Coloana Masculin */}
                  <div>
                    <div className="text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> Masculin
                    </div>
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                      {(() => {
                        const masculini = [
                          ...eligibiliSortati.neinscrisi.filter(e => e.sportiv.gen === 'Masculin'),
                          ...eligibiliSortati.dejaInscrisiLst.filter(e => e.sportiv.gen === 'Masculin'),
                        ];
                        const faraGen = [
                          ...eligibiliSortati.neinscrisi.filter(e => !e.sportiv.gen),
                          ...eligibiliSortati.dejaInscrisiLst.filter(e => !e.sportiv.gen),
                        ];
                        return (
                          <>
                            {masculini.map(({ sportiv }) => renderSportivEchipa(sportiv,
                              eligibiliSortati.dejaInscrisiLst.some(e => e.sportiv.id === sportiv.id) && !editMode
                            ))}
                            {faraGen.length > 0 && (
                              <div className="pt-1 border-t border-slate-700/40">
                                <div className="text-[10px] text-amber-400/80 mb-0.5 px-1">Gen neconfigurat — selecteaza gen in profilul sportivului</div>
                                {faraGen.map(({ sportiv }) => (
                                  <div key={sportiv.id} className="flex items-center gap-2 p-2 rounded border border-amber-800/40 bg-amber-900/10 opacity-70">
                                    <input type="checkbox" disabled className="w-4 h-4 opacity-40" />
                                    <span className="text-xs text-amber-300 uppercase">{sportiv.nume} {sportiv.prenume}</span>
                                    <span className="text-[9px] text-amber-500 ml-auto">fara gen</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {masculini.length === 0 && faraGen.length === 0 && (
                              <div className="text-xs text-slate-500 italic py-2 text-center">Niciun sportiv M</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Coloana Feminin */}
                  <div>
                    <div className="text-xs font-semibold text-pink-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-pink-400 inline-block"></span> Feminin
                    </div>
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1 pr-0.5">
                      {(() => {
                        const feminine = [
                          ...eligibiliSortati.neinscrisi.filter(e => e.sportiv.gen === 'Feminin'),
                          ...eligibiliSortati.dejaInscrisiLst.filter(e => e.sportiv.gen === 'Feminin'),
                        ];
                        return (
                          <>
                            {feminine.map(({ sportiv }) => renderSportivEchipa(sportiv,
                              eligibiliSortati.dejaInscrisiLst.some(e => e.sportiv.id === sportiv.id) && !editMode
                            ))}
                            {feminine.length === 0 && (
                              <div className="text-xs text-slate-500 italic py-2 text-center">Niciun sportiv F</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                /* Categorii non-MIXT: lista unificata, filtrata dupa gen daca categoria nu e Mixt */
                (() => {
                  const genFiltru = categorie.gen === 'Masculin' ? 'Masculin' : categorie.gen === 'Feminin' ? 'Feminin' : null;
                  const neinscrisiFiltered = genFiltru
                    ? eligibiliSortati.neinscrisi.filter(e => e.sportiv.gen === genFiltru)
                    : eligibiliSortati.neinscrisi;
                  const dejaFiltered = genFiltru
                    ? eligibiliSortati.dejaInscrisiLst.filter(e => e.sportiv.gen === genFiltru)
                    : eligibiliSortati.dejaInscrisiLst;
                  return (
                    <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1">
                      {neinscrisiFiltered.map(({ sportiv }) => renderSportivEchipa(sportiv, false))}
                      {dejaFiltered.length > 0 && (
                        <>
                          {neinscrisiFiltered.length > 0 && (
                            <div className="py-1 px-2">
                              <div className="border-t border-slate-700/60">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wide bg-slate-900 pr-2">
                                  {editMode ? 'Membri actuali (editabili)' : 'Deja in echipa'}
                                </span>
                              </div>
                            </div>
                          )}
                          {dejaFiltered.map(({ sportiv }) => renderSportivEchipa(sportiv, !editMode))}
                        </>
                      )}
                      {neinscrisiFiltered.length === 0 && dejaFiltered.length === 0 && (
                        <div className="text-center text-slate-500 py-3 italic text-sm">
                          Niciun sportiv eligibil din club pentru aceasta categorie.
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

            </div>
            {categorie.rezerve_max > 0 && (
              <div>
                <div className="text-sm text-slate-300 font-medium mb-1">
                  Rezerve ({selectedRezerve.length}/{categorie.rezerve_max})
                </div>
                <div className="max-h-32 overflow-y-auto overscroll-contain space-y-1">
                  {eligibili.map(({ sportiv }) => {
                    const isTitular = selectedTitulari.includes(sportiv.id);
                    return (
                      <label key={sportiv.id} style={{ touchAction: 'manipulation' }} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border text-xs ${
                        isTitular ? 'opacity-40 cursor-not-allowed border-transparent' :
                        selectedRezerve.includes(sportiv.id) ? 'border-purple-500 bg-purple-900/20' :
                        'border-slate-700 hover:border-slate-500'
                      }`}>
                        <input type="checkbox" checked={selectedRezerve.includes(sportiv.id)}
                          disabled={isTitular}
                          onChange={() => toggleRezerva(sportiv.id)}
                          className="w-3 h-3" />
                        <span className="text-slate-300 uppercase">{sportiv.nume} {sportiv.prenume}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning FRAM pentru selecția curentă */}
        {(() => {
          const selectedIds = isTeam
            ? [...selectedTitulari, ...selectedRezerve]
            : selectedIndividuali;
          const faraVizaCount = selectedIds.filter(id => !areVizaFRAM(id, anCompetitie, vizeSportivi)).length;
          return faraVizaCount > 0 ? (
            <WarningVizaFRAM show={true} />
          ) : null;
        })()}
      </div>

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm px-4 py-3 sm:px-6 rounded-b-2xl">
        {isTeam && selectedTitulari.length > 0 && selectedTitulari.length < categorie.sportivi_per_echipa_min && (
          <p className="text-xs text-amber-400 mb-2">
            Echipă incompletă ({selectedTitulari.length}/{categorie.sportivi_per_echipa_min} titulari) — se va salva cu flag "incompletă". Poți solicita completare din alt club ulterior.
          </p>
        )}
        {!(isTeam && echipaDejaInscrisa && !editMode) ? (
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading} className="w-full sm:w-auto h-11">Anulează</Button>
            <Button variant="success" onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto h-11">
              {loading ? 'Se salvează...' : editMode ? 'Salvează Modificările' : 'Confirmă Înscrierea'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto h-11">Închide</Button>
          </div>
        )}
      </div>
      </div>
    </Modal>
  );
};
