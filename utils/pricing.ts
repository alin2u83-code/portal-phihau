import { PretConfig } from '../types';

/**
 * Găsește prețul valabil la o anumită dată pentru un serviciu simplu.
 * @param preturi Lista tuturor configurațiilor de preț.
 * @param categorie Categoria taxei.
 * @param dataReferinta Data pentru care se caută prețul valabil.
 * @returns Configurația de preț potrivită sau undefined.
 */
export const getPretValabil = (
    preturi: PretConfig[],
    categorie: PretConfig['categorie'],
    dataReferinta: string
): PretConfig | undefined => {
    const data = new Date(dataReferinta);
    return preturi
        .filter(p => p.categorie === categorie && new Date(p.valabil_de_la_data) <= data)
        .sort((a, b) => new Date(b.valabil_de_la_data).getTime() - new Date(a.valabil_de_la_data).getTime())[0];
};


/**
 * Găsește prețul corect pentru un produs/serviciu pe baza atributelor.
 * @param preturi - Lista tuturor configurațiilor de preț.
 * @param categorie - Categoria produsului.
 * @param denumireServiciu - Denumirea specifică a produsului.
 * @param atribute - Un obiect cu atributele relevante, ex: { inaltime: 155, dataReferinta: '2023-10-26' }.
 * @returns Configurația de preț potrivită sau undefined.
 */
export const getPretProdus = (
  preturi: PretConfig[],
  categorie: PretConfig['categorie'],
  denumireServiciu: string,
  atribute: { inaltime?: number; marime?: string; tipEveniment?: string; dataReferinta?: string } = {}
): PretConfig | undefined => {
  const dataRef = atribute.dataReferinta ? new Date(atribute.dataReferinta) : new Date();

  const preturiRelevante = preturi
    .filter(
      (p) =>
        p.categorie === categorie &&
        p.denumire_serviciu === denumireServiciu &&
        new Date(p.valabil_de_la_data) <= dataRef
    )
    .sort((a, b) => new Date(b.valabil_de_la_data).getTime() - new Date(a.valabil_de_la_data).getTime());

  if (preturiRelevante.length === 0) return undefined;

  // Caută cea mai specifică potrivire dintre cele relevante
  const potrivireSpecifica = preturiRelevante.find((p) => {
    if (!p.specificatii || Object.keys(p.specificatii).length === 0) return false;

    if (atribute.inaltime && p.specificatii.inaltimeMin !== undefined) {
      const inaltimeSportiv = atribute.inaltime;
      const { inaltimeMin, inaltimeMax } = p.specificatii;
      if (inaltimeMax === undefined) return inaltimeSportiv >= inaltimeMin;
      return inaltimeSportiv >= inaltimeMin && inaltimeSportiv <= inaltimeMax;
    }
    if (atribute.marime && p.specificatii.marime) return atribute.marime === p.specificatii.marime;
    
    return false;
  });

  if (potrivireSpecifica) return potrivireSpecifica;

  // Dacă nu se găsește potrivire specifică, returnează cel mai recent preț general
  return preturiRelevante.find((p) => !p.specificatii || Object.keys(p.specificatii).length === 0);
};