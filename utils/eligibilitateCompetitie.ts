/**
 * Verificare eligibilitate sportiv pentru o categorie de competiție
 */
import { Sportiv, CategorieCompetitie, Grad } from '../types';

/**
 * Calculează vârsta sportivului la data competiției
 */
export function calculeazaVarstaLaData(dataNasterii: string, dataCompetitie: string): number {
  const nastere = new Date(dataNasterii);
  const competitie = new Date(dataCompetitie);
  let varsta = competitie.getFullYear() - nastere.getFullYear();
  const m = competitie.getMonth() - nastere.getMonth();
  if (m < 0 || (m === 0 && competitie.getDate() < nastere.getDate())) {
    varsta--;
  }
  return varsta;
}

export interface EligibilitateResult {
  eligibil: boolean;
  motive: string[];
}

/**
 * Verifică dacă un sportiv este eligibil pentru o categorie
 */
export function verificaEligibilitate(
  sportiv: Sportiv,
  categorie: CategorieCompetitie,
  grade: Grad[],
  dataCompetitie: string
): EligibilitateResult {
  const motive: string[] = [];

  // Verificare vârstă
  if (sportiv.data_nasterii) {
    const varsta = calculeazaVarstaLaData(sportiv.data_nasterii, dataCompetitie);
    if (varsta < categorie.varsta_min) {
      motive.push(`Vârsta prea mică (${varsta} < ${categorie.varsta_min} ani)`);
    }
    if (categorie.varsta_max !== null && varsta > categorie.varsta_max) {
      motive.push(`Vârsta prea mare (${varsta} > ${categorie.varsta_max} ani)`);
    }
  } else {
    motive.push('Data nașterii lipsă');
  }

  // Verificare gen
  if (categorie.gen !== 'Mixt') {
    const genSportiv = detectGender(sportiv);
    if (genSportiv && genSportiv !== categorie.gen) {
      motive.push(`Gen incompatibil (${genSportiv} ≠ ${categorie.gen})`);
    }
  }

  // Verificare grad
  if (sportiv.grad_actual_id) {
    const gradSportiv = grade.find(g => g.id === sportiv.grad_actual_id);
    if (gradSportiv) {
      if (categorie.grad_min_ordine !== null && gradSportiv.ordine < categorie.grad_min_ordine) {
        motive.push(`Grad insuficient (${gradSportiv.nume})`);
      }
      if (categorie.grad_max_ordine !== null && gradSportiv.ordine > categorie.grad_max_ordine) {
        motive.push(`Grad prea mare (${gradSportiv.nume})`);
      }
    } else {
      motive.push('Gradul nu a fost găsit');
    }
  } else if (categorie.grad_min_ordine !== null) {
    motive.push('Sportivul nu are grad înregistrat');
  }

  return { eligibil: motive.length === 0, motive };
}

/**
 * Detectează genul din prenume (euristică simplă)
 * Returnează null dacă nu poate detecta
 */
function detectGender(sportiv: Sportiv): 'Feminin' | 'Masculin' | null {
  // Putem extinde această logică sau adăuga un câmp gen în profil
  // Deocamdată returnăm null (nu filtrăm după gen automat)
  return null;
}

/**
 * Filtrează lista de sportivi după eligibilitate pentru o categorie
 */
export function filtreazaSportiviEligibili(
  sportivi: Sportiv[],
  categorie: CategorieCompetitie,
  grade: Grad[],
  dataCompetitie: string
): Array<{ sportiv: Sportiv; eligibilitate: EligibilitateResult }> {
  return sportivi.map(sportiv => ({
    sportiv,
    eligibilitate: verificaEligibilitate(sportiv, categorie, grade, dataCompetitie),
  }));
}
