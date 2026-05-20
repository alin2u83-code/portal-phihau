import { Competitie, CategorieCompetitie } from '../types';

export function calculeazaTaxaIndividuala(competitie: Competitie, cat?: CategorieCompetitie): number {
  const ct = competitie.config_taxe;
  if (ct) {
    return cat?.arma ? (ct.individual_cvd ?? 80) : (ct.individual_tehnica ?? 80);
  }
  return competitie.taxa_individual ?? 80;
}

export function calculeazaTaxaEchipa(cat: CategorieCompetitie, competitie: Competitie): number {
  const ct = competitie.config_taxe;
  if (ct) {
    if (cat.arma) return ct.cvd_echipa ?? 80;
    const esteJuniori = cat.varsta_max !== null && cat.varsta_max <= 17;
    return esteJuniori ? (ct.echipa_juniori ?? 150) : (ct.echipa_seniori ?? 120);
  }
  const esteJuniori = cat.varsta_max !== null && cat.varsta_max <= 17;
  if (esteJuniori) {
    return competitie.taxa_echipa ?? 150;
  }
  return competitie.taxa_echipa ?? 120;
}
