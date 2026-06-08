import React, { useState, useMemo } from 'react';
import { CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { buildCategorieDenumire } from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';

interface MergeSugestie {
  catA: CategorieCompetitie;
  catB: CategorieCompetitie;
  countA: number;
  countB: number;
  tip: 'varste_adiacente' | 'grade_adiacente' | 'varste_si_grade';
  newVarstaMin: number;
  newVarstaMax: number | null;
  newGradMin: number | null;
  newGradMax: number | null;
}

export const FuzionariPanel: React.FC<{
  categorii: CategorieCompetitie[];
  setCategorii: React.Dispatch<React.SetStateAction<CategorieCompetitie[]>>;
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  probe: ProbaCompetitie[];
  onRefresh: () => void;
}> = ({ categorii, setCategorii, inscrieri, echipe, probe, onRefresh }) => {
  const { showError } = useError();
  const [loading, setLoading] = useState<string | null>(null);

  const count = (catId: string) =>
    inscrieri.filter(i => i.categorie_id === catId && i.status?.toLowerCase() !== 'retras').length +
    echipe.filter(e => e.categorie_id === catId && e.status?.toLowerCase() !== 'retrasa').length;

  // Generează sugestii de fuzionare pentru categorii sub minim
  const sugestii = useMemo((): MergeSugestie[] => {
    const result: MergeSugestie[] = [];
    const seen = new Set<string>();

    for (const catA of categorii) {
      const cntA = count(catA.id);
      if (cntA >= catA.min_participanti_start) continue; // ok, skip

      for (const catB of categorii) {
        if (catA.id === catB.id) continue;
        const pairKey = [catA.id, catB.id].sort().join('::');
        if (seen.has(pairKey)) continue;

        // Trebuie să aibă același gen, aceeași probă, același tip participare
        if (catA.gen !== catB.gen) continue;
        if (catA.proba_id !== catB.proba_id) continue;
        if (catA.tip_participare !== catB.tip_participare) continue;

        const cntB = count(catB.id);

        // Calculează adiacența vârstelor
        const aVMin = catA.varsta_min, aVMax = catA.varsta_max ?? catA.varsta_min;
        const bVMin = catB.varsta_min, bVMax = catB.varsta_max ?? catB.varsta_min;
        const varsteAdiacente = Math.abs(aVMax - bVMin) <= 2 || Math.abs(bVMax - aVMin) <= 2;
        const aceaVarsta = aVMin === bVMin && catA.varsta_max === catB.varsta_max;

        // Calculează adiacența gradelor
        const aGMin = catA.grad_min_ordine, aGMax = catA.grad_max_ordine;
        const bGMin = catB.grad_min_ordine, bGMax = catB.grad_max_ordine;
        const gradeAdiacente = aGMin !== null && bGMin !== null &&
          (Math.abs((aGMax ?? aGMin) - bGMin) <= 2 || Math.abs((bGMax ?? bGMin) - aGMin) <= 2);
        const acelasGrad = aGMin === bGMin && aGMax === bGMax;

        let tip: MergeSugestie['tip'] | null = null;
        if (varsteAdiacente && acelasGrad) tip = 'varste_adiacente';
        else if (aceaVarsta && gradeAdiacente) tip = 'grade_adiacente';
        else if (varsteAdiacente && gradeAdiacente) tip = 'varste_si_grade';

        if (!tip) continue;

        // Nu sugera dacă intervalul rezultat e prea larg (>3 ani sau >4 grade)
        const newVMin = Math.min(aVMin, bVMin);
        const newVMax = Math.max(aVMax, bVMax);
        if (newVMax - newVMin > 3) continue;
        const newGMin = aGMin !== null && bGMin !== null ? Math.min(aGMin, bGMin) : (aGMin ?? bGMin);
        const newGMax = aGMax !== null && bGMax !== null ? Math.max(aGMax, bGMax) : (aGMax ?? bGMax);
        if (newGMin !== null && newGMax !== null && newGMax - newGMin > 4) continue;

        seen.add(pairKey);
        result.push({
          catA, catB, countA: cntA, countB: cntB, tip,
          newVarstaMin: newVMin,
          newVarstaMax: catA.varsta_max === null && catB.varsta_max === null ? null : newVMax,
          newGradMin: newGMin, newGradMax: newGMax,
        });
      }
    }

    // Sortează: cele cu total mai aproape de minim primele
    return result.sort((a, b) => {
      const totA = a.countA + a.countB;
      const totB = b.countA + b.countB;
      return totB - totA;
    });
  }, [categorii, inscrieri, echipe]);

  const subMinim = categorii.filter(c => {
    const cnt = count(c.id);
    return cnt > 0 && cnt < c.min_participanti_start;
  });
  const goale = categorii.filter(c => count(c.id) === 0);

  const handleFuzioneaza = async (s: MergeSugestie) => {
    const key = `${s.catA.id}::${s.catB.id}`;
    setLoading(key);
    try {
      // 1. Mută înscrierile din B în A
      const { error: e1 } = await supabase.from('inscrieri_competitie')
        .update({ categorie_id: s.catA.id }).eq('categorie_id', s.catB.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('echipe_competitie')
        .update({ categorie_id: s.catA.id }).eq('categorie_id', s.catB.id);
      if (e2) throw e2;

      // 2. Actualizează categoria A cu noul interval
      const newDenumire = buildCategorieDenumire({
        varsta_min: s.newVarstaMin, varsta_max: s.newVarstaMax,
        gen: s.catA.gen, grad_min_ordine: s.newGradMin, grad_max_ordine: s.newGradMax,
        arma: s.catA.arma, tip_participare: s.catA.tip_participare,
        sportivi_per_echipa_min: s.catA.sportivi_per_echipa_min,
        sportivi_per_echipa_max: s.catA.sportivi_per_echipa_max,
        rezerve_max: s.catA.rezerve_max, max_echipe_per_club: s.catA.max_echipe_per_club,
        min_participanti_start: s.catA.min_participanti_start, numar_categorie: s.catA.numar_categorie,
      });
      const { error: e3 } = await supabase.from('categorii_competitie').update({
        varsta_min: s.newVarstaMin, varsta_max: s.newVarstaMax,
        grad_min_ordine: s.newGradMin, grad_max_ordine: s.newGradMax,
        denumire: newDenumire,
      }).eq('id', s.catA.id);
      if (e3) throw e3;

      // 3. Șterge categoria B
      const { error: e4 } = await supabase.from('categorii_competitie').delete().eq('id', s.catB.id);
      if (e4) throw e4;

      onRefresh();
    } catch (err: any) {
      showError('Eroare fuzionare', err.message);
    } finally {
      setLoading(null);
    }
  };

  const tipLabel: Record<MergeSugestie['tip'], string> = {
    varste_adiacente: 'Vârste adiacente, același grad',
    grade_adiacente: 'Aceeași vârstă, grade adiacente',
    varste_si_grade: 'Vârste + grade adiacente',
  };
  const tipColor: Record<MergeSugestie['tip'], string> = {
    varste_adiacente: 'bg-blue-900/30 border-blue-700/50 text-blue-300',
    grade_adiacente: 'bg-purple-900/30 border-purple-700/50 text-purple-300',
    varste_si_grade: 'bg-orange-900/30 border-orange-700/50 text-orange-300',
  };

  return (
    <div className="space-y-4">
      {/* Sumar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 border ${subMinim.length > 0 ? 'bg-red-900/20 border-red-700/50' : 'bg-slate-800 border-slate-700'}`}>
          <div className={`text-2xl font-bold ${subMinim.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{subMinim.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Sub minim (au inscrisi)</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div className="text-2xl font-bold text-slate-500">{goale.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Goale (0 înscriși)</div>
        </div>
        <div className={`rounded-lg p-3 border ${sugestii.length > 0 ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-slate-800 border-slate-700'}`}>
          <div className={`text-2xl font-bold ${sugestii.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{sugestii.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Sugestii fuzionare</div>
        </div>
      </div>

      {subMinim.length === 0 && goale.length === 0 ? (
        <div className="text-center text-green-400 py-8">✓ Toate categoriile cu înscriși ating minimul necesar.</div>
      ) : (
        <>
          {/* Categorii sub minim */}
          {subMinim.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-2">Categorii sub minim ({subMinim.length})</h4>
              <div className="space-y-1">
                {subMinim.map(cat => {
                  const proba = probe.find(p => p.id === cat.proba_id);
                  const cnt = count(cat.id);
                  return (
                    <div key={cat.id} className="flex items-center gap-3 p-2 bg-red-900/10 border border-red-800/30 rounded text-sm">
                      <span className="font-bold text-red-400">{cnt}/{cat.min_participanti_start}</span>
                      <span className="text-white flex-1">{cat.denumire}</span>
                      {proba && <span className="text-xs text-slate-500">{proba.denumire}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorii goale */}
          {goale.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-2">Categorii fără înscriși ({goale.length})</h4>
              <div className="flex flex-wrap gap-1">
                {goale.map(cat => (
                  <span key={cat.id} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">
                    {cat.denumire}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sugestii fuzionare */}
      {sugestii.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-yellow-400 mb-2">Sugestii de fuzionare ({sugestii.length})</h4>
          <div className="space-y-2">
            {sugestii.map(s => {
              const key = `${s.catA.id}::${s.catB.id}`;
              const total = s.countA + s.countB;
              const atingeMinim = total >= s.catA.min_participanti_start;
              const newDen = buildCategorieDenumire({
                varsta_min: s.newVarstaMin, varsta_max: s.newVarstaMax,
                gen: s.catA.gen, grad_min_ordine: s.newGradMin, grad_max_ordine: s.newGradMax,
                arma: s.catA.arma, tip_participare: s.catA.tip_participare,
                sportivi_per_echipa_min: s.catA.sportivi_per_echipa_min,
                sportivi_per_echipa_max: s.catA.sportivi_per_echipa_max,
                rezerve_max: s.catA.rezerve_max, max_echipe_per_club: s.catA.max_echipe_per_club,
                min_participanti_start: s.catA.min_participanti_start, numar_categorie: s.catA.numar_categorie,
              });
              const proba = probe.find(p => p.id === s.catA.proba_id);
              return (
                <div key={key} className="p-3 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tipColor[s.tip]}`}>{tipLabel[s.tip]}</span>
                    {proba && <span className="text-xs text-slate-500">{proba.denumire}</span>}
                    {atingeMinim
                      ? <span className="text-xs text-green-400 ml-auto">✓ Atinge minimul ({total}/{s.catA.min_participanti_start})</span>
                      : <span className="text-xs text-yellow-400 ml-auto">Parțial ({total}/{s.catA.min_participanti_start})</span>}
                  </div>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <div className="flex flex-col">
                      <span className="text-slate-300">{s.catA.denumire}</span>
                      <span className="text-xs text-slate-500">{s.countA} înscriși</span>
                    </div>
                    <span className="text-slate-500">+</span>
                    <div className="flex flex-col">
                      <span className="text-slate-300">{s.catB.denumire}</span>
                      <span className="text-xs text-slate-500">{s.countB} înscriși</span>
                    </div>
                    <span className="text-slate-500">→</span>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{newDen}</span>
                      <span className="text-xs text-green-400">{total} înscriși total</span>
                    </div>
                  </div>
                  <Button size="sm" variant="warning" disabled={loading === key}
                    onClick={() => handleFuzioneaza(s)}>
                    {loading === key ? 'Se fuzionează...' : 'Fuzionează'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
