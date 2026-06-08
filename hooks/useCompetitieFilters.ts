import { useState, useMemo } from 'react';
import type { CategorieCompetitie } from '../types';

// Tip UI state — nu merge în types.ts (tip local, nu domeniu)
export interface CompetitieFiltre {
  gen: Set<string>;
  probaId: string;
  varstaMin: string;
  varstaMax: string;
  gradMin: string;
  gradMax: string;
}

// Constantă la nivel de modul — OBLIGATORIU în afara hook-ului
// pentru a evita new Set() referință nouă la fiecare resetFiltre()
const FILTRE_INITIALE: CompetitieFiltre = {
  gen: new Set(),
  probaId: '',
  varstaMin: '',
  varstaMax: '',
  gradMin: '',
  gradMax: '',
};

// Funcție pură co-locată — returnează CategorieCompetitie[] (nu Set<string>)
// Diferență intenționată față de InscrieriView.tsx:44-58 (D-07)
export function aplicaFiltreCategorie(
  categorii: CategorieCompetitie[],
  filtre: CompetitieFiltre
): CategorieCompetitie[] {
  const areFiltre =
    filtre.gen.size > 0 ||
    filtre.probaId ||
    filtre.varstaMin ||
    filtre.varstaMax ||
    filtre.gradMin ||
    filtre.gradMax;
  if (!areFiltre) return categorii;

  return categorii.filter(cat => {
    if (filtre.gen.size > 0 && !filtre.gen.has(cat.gen)) return false;
    if (filtre.probaId && cat.proba_id !== filtre.probaId) return false;
    // Garduri isNaN pe toate comparațiile numerice — ASVS L1 V5
    if (filtre.varstaMin !== '' && !isNaN(Number(filtre.varstaMin)) && cat.varsta_min < Number(filtre.varstaMin)) return false;
    if (filtre.varstaMax !== '' && !isNaN(Number(filtre.varstaMax)) && (cat.varsta_max === null || cat.varsta_max > Number(filtre.varstaMax))) return false;
    if (filtre.gradMin !== '' && !isNaN(Number(filtre.gradMin)) && (cat.grad_min_ordine === null || cat.grad_min_ordine < Number(filtre.gradMin))) return false;
    if (filtre.gradMax !== '' && !isNaN(Number(filtre.gradMax)) && (cat.grad_max_ordine === null || cat.grad_max_ordine > Number(filtre.gradMax))) return false;
    return true;
  });
}

export function useCompetitieFilters() {
  const [filtre, setFiltreState] = useState<CompetitieFiltre>(FILTRE_INITIALE);

  const toggleGen = (gen: string) => {
    setFiltreState(prev => {
      const next = new Set(prev.gen);
      if (next.has(gen)) next.delete(gen); else next.add(gen);
      return { ...prev, gen: next };
    });
  };

  const setFiltre = (partial: Partial<CompetitieFiltre>) => {
    setFiltreState(prev => ({ ...prev, ...partial }));
  };

  // La reset: spread FILTRE_INITIALE + new Set() explicit —
  // evităm refolosirea referinței Set din constantă (RESEARCH Pitfall 1)
  const resetFiltre = () => setFiltreState({ ...FILTRE_INITIALE, gen: new Set() });

  const nrFiltreActive = useMemo(() => {
    let n = 0;
    if (filtre.gen.size > 0) n++;
    if (filtre.probaId) n++;
    if (filtre.varstaMin !== '' || filtre.varstaMax !== '') n++;
    if (filtre.gradMin !== '' || filtre.gradMax !== '') n++;
    return n;
  }, [filtre]);

  return { filtre, toggleGen, setFiltre, resetFiltre, nrFiltreActive };
}
