import React, { useState, useMemo, useEffect } from 'react';
import {
  Competitie, CategorieCompetitie, Sportiv, Grad, Inlantuire,
} from '../../../types';
import { supabase } from '../../../supabaseClient';
import { Button } from '../../ui';
import { ArrowLeftIcon } from '../../icons';
import { useError } from '../../ErrorProvider';
import { calculeazaVarstaLaData } from '../../../utils/eligibilitateCompetitie';
import { exportFisaParticipare, exportBorderoClub, RandIndividualPDF, RandEchipaPDF } from '../../../utils/exportPDFCompetitie';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from '../../../utils/taxeCompetitie';
import { formatNume } from '../../../utils/formatareSportiv';
import { EchipaFormata, QuyenAlesMap } from './types';

// -----------------------------------------------
// PASUL 4 — Sumar + taxe + save DB
// -----------------------------------------------

export interface Pas4Props {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  selectedSportivi: Set<string>;
  autoCategorie: Map<string, CategorieCompetitie>;
  quyenAles: QuyenAlesMap;
  echipeFormate: EchipaFormata[];
  probeSkipped: Set<string>;
  excludedFromIndividual: Set<string>;
  clubId: string;
  numeClub: string;
  onBack: () => void;
  onSaved: () => void;
}

interface RandIndividual {
  sportiv: Sportiv;
  varsta: number;
  categorie: CategorieCompetitie;
  inlantuire_id?: string;
  inlantuire_id_2?: string;
  taxa: number;
}

interface RandEchipa {
  echipa: EchipaFormata;
  categorie: CategorieCompetitie;
  taxa: number;
  incompleta: boolean;
  titulariNume: string[];
  rezerveNume: string[];
}

const Pas4SumarTaxe: React.FC<Pas4Props> = ({
  competitie, sportivi, grade, categorii,
  selectedSportivi, autoCategorie, quyenAles, echipeFormate,
  probeSkipped, excludedFromIndividual, clubId, numeClub, onBack, onSaved,
}) => {
  const { showError, showSuccess } = useError();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inlantuiriById, setInlantuiriById] = useState<Map<string, Inlantuire>>(new Map());

  useEffect(() => {
    supabase.from('inlantuiri').select('id, denumire, ordine, activ').then(({ data }) => {
      if (!data) return;
      const m = new Map<string, Inlantuire>();
      for (const il of data as Inlantuire[]) m.set(il.id, il);
      setInlantuiriById(m);
    });
  }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const randuriIndividuale = useMemo<RandIndividual[]>(() => {
    const rezultat: RandIndividual[] = [];
    for (const sportivId of Array.from(selectedSportivi)) {
      if (excludedFromIndividual.has(sportivId)) continue;
      const cat = autoCategorie.get(sportivId);
      if (!cat) continue;
      if (cat.proba_id && probeSkipped.has(cat.proba_id)) continue;
      const sportiv = sportivi.find(s => s.id === sportivId);
      if (!sportiv) continue;
      const varsta = sportiv.data_nasterii
        ? calculeazaVarstaLaData(sportiv.data_nasterii, competitie.data_inceput)
        : 0;
      const pick = quyenAles.get(sportivId);
      rezultat.push({
        sportiv,
        varsta,
        categorie: cat,
        inlantuire_id: pick?.q1 || undefined,
        inlantuire_id_2: pick?.q2 || undefined,
        taxa: calculeazaTaxaIndividuala(competitie, cat),
      });
    }
    return rezultat;
  }, [selectedSportivi, autoCategorie, sportivi, quyenAles, competitie, probeSkipped, excludedFromIndividual]);

  const randuriEchipe = useMemo<RandEchipa[]>(() => {
    return echipeFormate.map(echipa => {
      const cat = categorii.find(c => c.id === echipa.categorieId);
      const taxa = cat ? calculeazaTaxaEchipa(cat, competitie) : (competitie.config_taxe?.echipa_seniori ?? competitie.taxa_echipa ?? 120);
      const getNumeSportiv = (id: string) => {
        const s = sportivi.find(sp => sp.id === id);
        return s ? formatNume(s) : id;
      };
      return {
        echipa,
        categorie: cat!,
        taxa,
        incompleta: echipa.echipaIncompleta ?? false,
        titulariNume: echipa.titulari.map(getNumeSportiv),
        rezerveNume: echipa.rezerve.map(getNumeSportiv),
      };
    }).filter(r => {
      if (!r.categorie) return false;
      if (r.categorie.proba_id && probeSkipped.has(r.categorie.proba_id)) return false;
      if (r.echipa?.echipaSkip) return false;
      return true;
    });
  }, [echipeFormate, categorii, competitie, sportivi, probeSkipped]);

  const totalIndividual = useMemo(
    () => randuriIndividuale.reduce((acc, r) => acc + r.taxa, 0),
    [randuriIndividuale]
  );

  const totalEchipe = useMemo(
    () => randuriEchipe.reduce((acc, r) => acc + r.taxa, 0),
    [randuriEchipe]
  );

  const totalGeneral = totalIndividual + totalEchipe;

  const randuriFisaPDF = useMemo<RandIndividualPDF[]>(() =>
    randuriIndividuale.map(r => {
      const gradEntry = grade.find(g => g.id === r.sportiv.grad_actual_id);
      return {
        numeComplet: formatNume(r.sportiv),
        categorie: r.categorie.denumire ?? `Categoria ${r.categorie.numar_categorie}`,
        proba: r.categorie.proba?.denumire ?? '—',
        inlantuireArma: (r.inlantuire_id ? inlantuiriById.get(r.inlantuire_id)?.denumire : null) ?? '—',
        grad: gradEntry?.nume ?? '—',
        taxa: r.taxa,
      };
    }),
    [randuriIndividuale, grade, inlantuiriById]
  );

  const randuriEchipePDF = useMemo<RandEchipaPDF[]>(() =>
    randuriEchipe.map(r => ({
      numeEchipa: numeClub + (r.echipa.numeEchipa ? ' — ' + r.echipa.numeEchipa : ''),
      categorie: r.categorie.denumire ?? `Categoria ${r.categorie.numar_categorie}`,
      titulari: r.titulariNume.join(', '),
      rezerve: r.rezerveNume.join(', '),
      taxa: r.taxa,
      incompleta: r.incompleta,
    })),
    [randuriEchipe, numeClub]
  );

  const handleExportFisa = () => {
    exportFisaParticipare(competitie, numeClub, randuriFisaPDF, randuriEchipePDF);
  };

  const handleExportBorderou = () => {
    exportBorderoClub(competitie, numeClub, randuriFisaPDF, randuriEchipePDF, totalIndividual, totalEchipe, totalGeneral);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Insert/reactivare înscrieri individuale
      let skippedCount = 0;
      for (const rand of randuriIndividuale) {
        const { data: existent } = await supabase
          .from('inscrieri_competitie')
          .select('id, status')
          .eq('competitie_id', competitie.id)
          .eq('sportiv_id', rand.sportiv.id)
          .eq('categorie_id', rand.categorie.id)
          .maybeSingle();

        if (existent) {
          if (existent.status?.toLowerCase() !== 'retras') {
            skippedCount++;
            continue;
          }
          // Re-activare sportiv retras
          const { error: updErr } = await supabase
            .from('inscrieri_competitie')
            .update({
              status: 'inscris',
              inlantuire_id: rand.inlantuire_id ?? null,
              inlantuire_id_2: rand.inlantuire_id_2 ?? null,
            })
            .eq('id', existent.id);
          if (updErr) throw updErr;
          continue;
        }

        const payload = {
          inlantuire_id: rand.inlantuire_id ?? null,
          inlantuire_id_2: rand.inlantuire_id_2 ?? null,
          status: 'inscris',
          taxa_achitata: false,
        };

        const { error } = await supabase.from('inscrieri_competitie').insert({
          competitie_id: competitie.id,
          sportiv_id: rand.sportiv.id,
          categorie_id: rand.categorie.id,
          club_id: clubId,
          borderou_club_id: clubId,
          ...payload,
        });
        if (error) throw new Error(error.message);
      }

      // 2. Insert/update echipe și sportivii lor
      for (const rand of randuriEchipe) {
        const denEchipa = numeClub + (rand.echipa.numeEchipa ? ' — ' + rand.echipa.numeEchipa : '');
        if (rand.echipa.dbId) {
          // UPDATE echipă existentă
          const { error: updErr } = await supabase
            .from('echipe_competitie')
            .update({
              denumire_echipa: denEchipa,
              echipa_incompleta: rand.echipa.echipaIncompleta ?? false,
              inlantuire_id: rand.echipa.program ?? null,
            })
            .eq('id', rand.echipa.dbId);
          if (updErr) throw new Error(updErr.message);
          // Re-sync membri
          await supabase.from('echipa_sportivi').delete().eq('echipa_id', rand.echipa.dbId);
          const sportiviEchipa = [
            ...rand.echipa.titulari.map(id => ({ echipa_id: rand.echipa.dbId!, sportiv_id: id, rol: 'titular' as const })),
            ...rand.echipa.rezerve.map(id => ({ echipa_id: rand.echipa.dbId!, sportiv_id: id, rol: 'rezerva' as const })),
          ];
          if (sportiviEchipa.length > 0) {
            const { error: errSp } = await supabase.from('echipa_sportivi').insert(sportiviEchipa);
            if (errSp) throw new Error(errSp.message);
          }
          if (rand.echipa.echipaIncompleta) {
            await supabase.from('solicitari_echipe_incomplete').upsert({
              competitie_id: competitie.id,
              categorie_id: rand.echipa.categorieId,
              club_solicitant_id: clubId,
              sportivi_disponibili: rand.echipa.titulari,
              status: 'deschisa',
            }, { onConflict: 'competitie_id,categorie_id,club_solicitant_id' });
          }
        } else {
          // INSERT echipă nouă
          const { data: echipaDB, error: errEchipa } = await supabase
            .from('echipe_competitie')
            .insert({
              competitie_id: competitie.id,
              categorie_id: rand.echipa.categorieId,
              club_id: clubId,
              denumire_echipa: denEchipa,
              status: 'inscrisa',
              taxa_achitata: false,
              echipa_incompleta: rand.echipa.echipaIncompleta ?? false,
              inlantuire_id: rand.echipa.program ?? null,
            })
            .select()
            .single();
          if (errEchipa) throw new Error(errEchipa.message);
          if (echipaDB) {
            const sportiviEchipa = [
              ...rand.echipa.titulari.map(id => ({
                echipa_id: echipaDB.id,
                sportiv_id: id,
                rol: 'titular' as const,
              })),
              ...rand.echipa.rezerve.map(id => ({
                echipa_id: echipaDB.id,
                sportiv_id: id,
                rol: 'rezerva' as const,
              })),
            ];
            if (sportiviEchipa.length > 0) {
              const { error: errSportivi } = await supabase.from('echipa_sportivi').insert(sportiviEchipa);
              if (errSportivi) throw new Error(errSportivi.message);
            }
            if (rand.echipa.echipaIncompleta) {
              await supabase.from('solicitari_echipe_incomplete').insert({
                competitie_id: competitie.id,
                categorie_id: rand.echipa.categorieId,
                club_solicitant_id: clubId,
                sportivi_disponibili: rand.echipa.titulari,
                status: 'deschisa',
              });
            }
          }
        }
      }

      // Retrage echipe existente pentru probe marcate "Nu participăm"
      if (probeSkipped.size > 0) {
        const catIdsSkipped = categorii
          .filter(c => c.proba_id && probeSkipped.has(c.proba_id))
          .map(c => c.id);
        if (catIdsSkipped.length > 0) {
          await supabase
            .from('echipe_competitie')
            .update({ status: 'retrasa' })
            .eq('competitie_id', competitie.id)
            .eq('club_id', clubId)
            .in('categorie_id', catIdsSkipped)
            .neq('status', 'retrasa');
        }
      }

      setSuccessMsg('Inscrierea a fost finalizata cu succes!');
      setConfirmOpen(false);
      if (skippedCount > 0) showSuccess('Info', `${skippedCount} sportivi ignorați (deja înscriși activ).`);
      showSuccess('Inscriere finalizata', `Inscrierea la ${competitie.denumire} a fost trimisa.`);
      setTimeout(() => onSaved(), 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setConfirmOpen(false);
      setErrorMsg(msg);
      showError('Salvare inscriere', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="secondary" size="sm" onClick={onBack} className="!p-2 shrink-0 mt-0.5" disabled={saving}>
          <ArrowLeftIcon className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white leading-tight">
            Inscriere sportivi
          </h2>
        </div>
      </div>


      {/* Sectiunea 1 — Inscrieri individuale */}
      {randuriIndividuale.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">
              Inscrieri individuale
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({randuriIndividuale.length} {randuriIndividuale.length === 1 ? 'inscriere' : 'inscrieri'})
              </span>
            </h3>
          </div>

          {/* DESKTOP: tabel */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/40">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Sportiv</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Categorie</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Q1</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Q2</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Taxa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {randuriIndividuale.map(rand => (
                  <tr key={rand.sportiv.id} className="bg-slate-800/10 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-white whitespace-nowrap">
                      {formatNume(rand.sportiv)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">
                      {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">
                      {(rand.inlantuire_id ? inlantuiriById.get(rand.inlantuire_id)?.denumire : null) ?? <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">
                      {rand.categorie.doua_quyenuri
                        ? (rand.inlantuire_id_2
                            ? (inlantuiriById.get(rand.inlantuire_id_2)?.denumire ?? rand.inlantuire_id_2)
                            : <span className="text-yellow-500 italic text-xs">⚠ lipsă Q2</span>)
                        : <span className="text-slate-700">—</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-sm font-semibold text-green-400">{rand.taxa} lei</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBIL: carduri */}
          <div className="md:hidden divide-y divide-slate-700/50">
            {randuriIndividuale.map(rand => (
              <div key={rand.sportiv.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white">
                    {formatNume(rand.sportiv)}
                  </span>
                  <span className="text-sm font-semibold text-green-400">{rand.taxa} lei</span>
                </div>
                <div className="bg-slate-800/50 rounded-lg px-3 py-2 space-y-1">
                  <div className="text-xs font-medium text-slate-300">
                    {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                  </div>
                  {rand.inlantuire_id && <div className="text-[11px] text-slate-400">Q1: {inlantuiriById.get(rand.inlantuire_id)?.denumire ?? rand.inlantuire_id}</div>}
                  {rand.categorie.doua_quyenuri && (
                    rand.inlantuire_id_2
                      ? <div className="text-[11px] text-slate-400">Q2: {inlantuiriById.get(rand.inlantuire_id_2)?.denumire ?? rand.inlantuire_id_2}</div>
                      : <div className="text-[11px] text-yellow-500">Q2: ⚠ lipsă</div>
                  )}
                  {rand.categorie.proba && (
                    <div className="text-[11px] text-slate-500">{rand.categorie.proba.denumire}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sectiunea 2 — Echipe */}
      {randuriEchipe.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
          <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">
              Echipe formate
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({randuriEchipe.length} {randuriEchipe.length === 1 ? 'echipa' : 'echipe'})
              </span>
            </h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {randuriEchipe.map(rand => (
              <div key={rand.echipa.categorieId} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">
                        {numeClub + (rand.echipa.numeEchipa ? ' — ' + rand.echipa.numeEchipa : '')}
                      </span>
                      {rand.incompleta && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                          Partener solicitat
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {rand.categorie.denumire ?? `Categoria ${rand.categorie.numar_categorie}`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-semibold ${rand.incompleta ? 'text-amber-400' : 'text-green-400'}`}>
                      {rand.taxa} lei
                    </span>
                  </div>
                </div>

                {rand.titulariNume.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rand.titulariNume.map((nume, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-green-900/30 border border-green-700/40 text-green-300 rounded-full px-2 py-0.5"
                      >
                        T: {nume}
                      </span>
                    ))}
                    {rand.rezerveNume.map((nume, i) => (
                      <span
                        key={`r-${i}`}
                        className="text-[11px] bg-sky-900/30 border border-sky-700/40 text-sky-300 rounded-full px-2 py-0.5"
                      >
                        R: {nume}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sectiunea 3 — Total */}
      <div className="rounded-xl border border-slate-600 bg-slate-800/60 overflow-hidden">
        <div className="px-4 py-3 space-y-2">
          {randuriIndividuale.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total inscrieri individuale:</span>
              <span className="text-white font-medium">{totalIndividual} lei</span>
            </div>
          )}
          {randuriEchipe.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total echipe:</span>
              <span className="text-white font-medium">{totalEchipe} lei</span>
            </div>
          )}
          <div className="border-t border-slate-600 pt-2 flex items-center justify-between">
            <span className="font-bold text-white">TOTAL DE ACHITAT:</span>
            <span className="font-bold text-xl text-green-400">{totalGeneral} lei</span>
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-500 italic">
            Plata se efectueaza la secretariatul competitiei / prin virament bancar.
          </p>
        </div>
      </div>

      {/* Mesaje feedback */}
      {successMsg && (
        <div className="rounded-lg border border-green-600/50 bg-green-900/20 px-4 py-3">
          <p className="text-sm text-green-400 font-medium">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3">
          <p className="text-xs text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Footer sticky */}
      <div className="sticky bottom-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 pt-3 pb-2 md:pb-16 -mx-4 px-4">
        {/* Butoane export PDF */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportFisa}
            className="text-xs"
          >
            Export fisa participare
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportBorderou}
            className="text-xs"
          >
            Export borderou club
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-green-400 md:hidden">
            Total: {totalGeneral} lei
          </div>
          <Button
            variant="success"
            onClick={() => setConfirmOpen(true)}
            disabled={saving || !!successMsg}
            className="w-full sm:w-auto sm:min-w-[180px] ml-auto"
          >
            Finalizeaza inscrierea
          </Button>
        </div>
      </div>

      {/* Dialog confirmare finalizare inscriere */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setConfirmOpen(false)}
          />
          <div className="relative w-full md:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl md:rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-green-900/50 border border-green-700/60 flex items-center justify-center text-lg">
                ✓
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Finalizeaza inscrierea</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verificati sumarul inainte de trimitere
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/50 divide-y divide-slate-700/60 text-sm">
              {randuriIndividuale.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-300">
                    Inscrieri individuale
                    <span className="ml-1.5 text-xs text-slate-500">({randuriIndividuale.length})</span>
                  </span>
                  <span className="font-semibold text-white">{totalIndividual} lei</span>
                </div>
              )}
              {randuriEchipe.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-slate-300">
                    Echipe
                    <span className="ml-1.5 text-xs text-slate-500">({randuriEchipe.length})</span>
                  </span>
                  <span className="font-semibold text-white">{totalEchipe} lei</span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60">
                <span className="font-bold text-white">Total de achitat</span>
                <span className="font-bold text-lg text-green-400">{totalGeneral} lei</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic">
              Dupa finalizare, inscrierea va fi trimisa organizatorilor. Poti retrage individual sportivii ulterior.
            </p>

            {randuriIndividuale.length === 0 && randuriEchipe.length === 0 && (
              <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
                ⚠ Nu ai adăugat nicio înscriere. Dorești să continui fără a înscrie sportivi?
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="flex-1"
              >
                Anuleaza
              </Button>
              <Button
                variant="success"
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Se trimite...
                  </span>
                ) : (
                  'Confirma si trimite'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pas4SumarTaxe;
