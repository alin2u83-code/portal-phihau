import React, { useState, useEffect, useMemo } from 'react';
import { Competitie, ProbaCompetitie, CategorieCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal } from '../ui';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, TemplateCategorieInput, TIP_PROBA_LABELS
} from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';

export interface GenerareSabloaneModalProps {
  competitie: Competitie;
  probe: ProbaCompetitie[];
  categoriiExistente: CategorieCompetitie[];
  onClose: () => void;
  onGenerated: (cats: CategorieCompetitie[]) => void;
}

export const GenerareSabloaneModal: React.FC<GenerareSabloaneModalProps> = ({
  competitie, probe, categoriiExistente, onClose, onGenerated,
}) => {
  const { showError } = useError();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // --- Filtre state ---
  const [filtreVisible, setFiltreVisible] = useState(false);
  const [filterTipProba, setFilterTipProba] = useState<Set<string>>(new Set());
  const [filterGen, setFilterGen] = useState<Set<string>>(new Set());
  const [filterVarstaMin, setFilterVarstaMin] = useState('');
  const [filterVarstaMax, setFilterVarstaMax] = useState('');
  const [filterGradMin, setFilterGradMin] = useState('');
  const [filterGradMax, setFilterGradMax] = useState('');

  const templates = useMemo<TemplateCategorieInput[]>(() => {
    if (competitie.tip === 'tehnica') return generateTemplateTehnnica();
    if (competitie.tip === 'giao_dau') return generateTemplateGiaoDau();
    if (competitie.tip === 'cvd') return generateTemplateCVD();
    return [];
  }, [competitie.tip]);

  // Tipuri de probă unice din template-uri (pentru checkbox-urile de filtru)
  const tipProbaDisponibile = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => set.add(t.tip_proba));
    return Array.from(set);
  }, [templates]);

  // Număr filtre active (pentru indicator buton)
  const nrFiltreActive = useMemo(() => {
    let n = 0;
    if (filterTipProba.size > 0) n++;
    if (filterGen.size > 0) n++;
    if (filterVarstaMin !== '' || filterVarstaMax !== '') n++;
    if (filterGradMin !== '' || filterGradMax !== '') n++;
    return n;
  }, [filterTipProba, filterGen, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  const areFiltre = nrFiltreActive > 0;

  // Template-uri filtrate (cu indicii originali)
  const templatesFiltrate = useMemo<{ idx: number; cat: TemplateCategorieInput }[]>(() => {
    return templates.map((cat, idx) => ({ idx, cat })).filter(({ cat }) => {
      if (filterTipProba.size > 0 && !filterTipProba.has(cat.tip_proba)) return false;
      if (filterGen.size > 0 && !filterGen.has(cat.gen)) return false;
      if (filterVarstaMin !== '' && cat.varsta_min < Number(filterVarstaMin)) return false;
      if (filterVarstaMax !== '' && (cat.varsta_max === null || cat.varsta_max > Number(filterVarstaMax))) return false;
      if (filterGradMin !== '' && (cat.grad_min_ordine === null || cat.grad_min_ordine < Number(filterGradMin))) return false;
      if (filterGradMax !== '' && (cat.grad_max_ordine === null || cat.grad_max_ordine > Number(filterGradMax))) return false;
      return true;
    });
  }, [templates, filterTipProba, filterGen, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  // La schimbarea filtrelor: auto-selectează toate categoriile filtrate
  useEffect(() => {
    if (areFiltre) {
      setSelected(new Set(templatesFiltrate.map(({ idx }) => idx)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTipProba, filterGen, filterVarstaMin, filterVarstaMax, filterGradMin, filterGradMax]);

  const resetFiltre = () => {
    setFilterTipProba(new Set());
    setFilterGen(new Set());
    setFilterVarstaMin('');
    setFilterVarstaMax('');
    setFilterGradMin('');
    setFilterGradMax('');
    // La reset: selecția rămâne neschimbată (conform spec)
  };

  const probeMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of probe) m[p.tip_proba] = p.id;
    return m;
  }, [probe]);

  const handleToggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelected(new Set(templatesFiltrate.map(({ idx }) => idx)));
  };

  const handleGenerate = async () => {
    const toInsert = templates.filter((_, i) => selected.has(i));
    if (toInsert.length === 0) return;
    setLoading(true);
    try {
      const nextNr = Math.max(0, ...categoriiExistente.map(c => c.numar_categorie ?? 0));
      const payload = toInsert.map((cat, i) => ({
        competitie_id: competitie.id,
        proba_id: probeMap[cat.tip_proba] || null,
        numar_categorie: nextNr + i + 1,
        denumire: buildCategorieDenumire(cat),
        varsta_min: cat.varsta_min,
        varsta_max: cat.varsta_max ?? null,
        gen: cat.gen,
        grad_min_ordine: cat.grad_min_ordine ?? null,
        grad_max_ordine: cat.grad_max_ordine ?? null,
        tip_participare: cat.tip_participare ?? 'individual',
        sportivi_per_echipa_min: cat.sportivi_per_echipa_min ?? 1,
        sportivi_per_echipa_max: cat.sportivi_per_echipa_max ?? 1,
        rezerve_max: cat.rezerve_max ?? 0,
        max_echipe_per_club: cat.max_echipe_per_club ?? 1,
        min_participanti_start: cat.min_participanti_start ?? 3,
        ordine_afisare: cat.numar_categorie ?? (nextNr + i + 1),
      }));
      const { data, error } = await supabase.from('categorii_competitie').insert(payload).select();
      if (error) throw error;
      onGenerated((data || []) as CategorieCompetitie[]);
    } catch (err: any) {
      showError('Eroare generare', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grupare template-uri filtrate pe tip probă
  const grupeTemplate = useMemo(() => {
    const map = new Map<string, { idx: number; cat: TemplateCategorieInput }[]>();
    templatesFiltrate.forEach(({ idx, cat }) => {
      const key = cat.tip_proba ?? 'necunoscut';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ idx, cat });
    });
    return Array.from(map.entries());
  }, [templatesFiltrate]);

  const toggleTipProba = (tip: string) => {
    setFilterTipProba(prev => {
      const next = new Set(prev);
      if (next.has(tip)) next.delete(tip); else next.add(tip);
      return next;
    });
  };

  const toggleGen = (gen: string) => {
    setFilterGen(prev => {
      const next = new Set(prev);
      if (next.has(gen)) next.delete(gen); else next.add(gen);
      return next;
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Generează categorii din șabloane">
      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        {templates.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-6 italic">
            Niciun șablon disponibil pentru tipul de competiție "{competitie.tip}".
          </div>
        ) : (
          <>
            {/* Bara filtre */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => setFiltreVisible(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${areFiltre ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filtrează{nrFiltreActive > 0 ? ` (${nrFiltreActive})` : ''}
                <svg className={`w-3 h-3 transition-transform ${filtreVisible ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <span className="text-xs text-slate-400">
                {selected.size}/{templatesFiltrate.length}{areFiltre ? ` (din ${templates.length})` : ''} selectate
              </span>
              <button onClick={handleSelectAll} className="text-xs text-brand-primary hover:underline">Selectează toate</button>
            </div>

            {/* Panou filtre */}
            {filtreVisible && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-3">
                {/* Grid filtre: 2 coloane pe desktop, stacked pe mobil */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Filtru Tip Probă */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tip probă</div>
                    <div className="flex flex-wrap gap-1.5">
                      {tipProbaDisponibile.map(tip => (
                        <label key={tip} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${filterTipProba.has(tip) ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                          <input type="checkbox" checked={filterTipProba.has(tip)} onChange={() => toggleTipProba(tip)} className="w-3 h-3 accent-brand-primary" />
                          {TIP_PROBA_LABELS[tip as keyof typeof TIP_PROBA_LABELS] ?? tip}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Filtru Gen */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Gen</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Feminin', 'Masculin', 'Mixt'].map(gen => (
                        <label key={gen} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg cursor-pointer border transition-colors ${filterGen.has(gen) ? 'bg-brand-primary/20 border-brand-primary/50 text-brand-primary' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                          <input type="checkbox" checked={filterGen.has(gen)} onChange={() => toggleGen(gen)} className="w-3 h-3 accent-brand-primary" />
                          {gen}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Filtru Vârstă */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Vârstă (ani)</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={filterVarstaMin}
                        onChange={e => setFilterVarstaMin(e.target.value)}
                        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                      />
                      <span className="text-slate-500 text-xs">–</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={filterVarstaMax}
                        onChange={e => setFilterVarstaMax(e.target.value)}
                        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                      />
                    </div>
                  </div>

                  {/* Filtru Grad */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Grad (ordine)</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="Min"
                        value={filterGradMin}
                        onChange={e => setFilterGradMin(e.target.value)}
                        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                      />
                      <span className="text-slate-500 text-xs">–</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Max"
                        value={filterGradMax}
                        onChange={e => setFilterGradMax(e.target.value)}
                        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary/60"
                      />
                    </div>
                  </div>
                </div>

                {/* Buton reset filtre */}
                {areFiltre && (
                  <div className="pt-1 border-t border-slate-700">
                    <button
                      onClick={resetFiltre}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                    >
                      Resetează filtrele
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Lista categorii (filtrate) */}
            {templatesFiltrate.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-4 italic">
                Nicio categorie nu corespunde filtrelor aplicate.
              </div>
            ) : (
              <>
                {grupeTemplate.map(([tipProba, items]) => (
                  <div key={tipProba} className="space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-1">
                      {TIP_PROBA_LABELS[tipProba as keyof typeof TIP_PROBA_LABELS] ?? tipProba}
                    </div>
                    {items.map(({ idx, cat }) => (
                      <label key={idx} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selected.has(idx) ? 'bg-brand-primary/10 border border-brand-primary/30' : 'hover:bg-slate-700/40 border border-transparent'}`}>
                        <input
                          type="checkbox"
                          checked={selected.has(idx)}
                          onChange={() => handleToggle(idx)}
                          className="w-4 h-4 rounded accent-brand-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium">{buildCategorieDenumire(cat)}</div>
                          <div className="text-[11px] text-slate-500">
                            {cat.varsta_min}–{cat.varsta_max ?? '∞'} ani · {cat.gen}
                            {cat.grad_min_ordine ? ` · Grad ${cat.grad_min_ordine}+` : ''}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-700 mt-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
        <Button variant="success" onClick={handleGenerate} disabled={loading || selected.size === 0}>
          {loading ? 'Se generează...' : `Generează ${selected.size} categorii`}
        </Button>
      </div>
    </Modal>
  );
};
