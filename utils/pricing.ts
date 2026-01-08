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
        .filter(p => p.categorie === categorie && new Date(p.valabilDeLaData) <= data)
        .sort((a, b) => new Date(b.valabilDeLaData).getTime() - new Date(a.valabilDeLaData).getTime())[0];
};


/**
 * Găsește prețul corect pentru un produs/serviciu pe baza atributelor.
 * @param preturi - Lista tuturor configurațiilor de preț.
 * @param categorie - Categoria produsului.
 * @param denumireServiciu - Denumirea specifică a produsului.
 * @param atribute - Un obiect cu atributele relevante, ex: { inaltime: 155 } sau { marime: 'S' }.
 * @returns Configurația de preț potrivită sau undefined.
 */
export const getPretProdus = (
  preturi: PretConfig[],
  categorie: PretConfig['categorie'],
  denumireServiciu: string,
  atribute: { inaltime?: number, marime?: string, tipEveniment?: string } = {}
): PretConfig | undefined => {

  const preturiPotrivite = preturi.filter(p => 
    p.categorie === categorie &&
    p.denumireServiciu === denumireServiciu
  );

  if (preturiPotrivite.length === 0) return undefined;
  
  // Caută cea mai specifică potrivire
  const potrivireFinala = preturiPotrivite.find(p => {
    if (!p.specificatii) return false;

    if (atribute.inaltime && p.specificatii.inaltimeMin !== undefined) {
      const inaltimeSportiv = atribute.inaltime;
      const { inaltimeMin, inaltimeMax } = p.specificatii;
      
      if (inaltimeMax === undefined) { // Cazul pentru "peste X cm"
        return inaltimeSportiv >= inaltimeMin;
      }
      return inaltimeSportiv >= inaltimeMin && inaltimeSportiv <= inaltimeMax;
    }

    if (atribute.marime && p.specificatii.marime) {
      return atribute.marime === p.specificatii.marime;
    }
    
    // Alte logici pot fi adăugate aici (ex: tipEveniment)

    return false;
  });

  // Dacă nu se găsește o potrivire specifică, returnează un preț general (fără specificații) dacă există
  return potrivireFinala || preturiPotrivite.find(p => !p.specificatii);
};