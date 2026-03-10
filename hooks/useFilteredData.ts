import { useMemo } from 'react';
import { Sportiv, Rol, SesiuneExamen, InscriereExamen, Antrenament, Grupa, Plata, Tranzactie, Eveniment, Rezultat, TipAbonament, Familie, AnuntPrezenta, Reducere, DecontFederatie, IstoricGrade, VizualizarePlata, IstoricPlataDetaliat, Locatie } from '../types';

interface UseFilteredDataProps {
    activeRole: Rol['nume'] | null;
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    antrenamente: Antrenament[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    anunturiPrezenta: AnuntPrezenta[];
    reduceri: Reducere[];
    deconturiFederatie: DecontFederatie[];
    istoricGrade: IstoricGrade[];
    vizualizarePlati: VizualizarePlata[];
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    locatii: Locatie[];
}

export const useFilteredData = ({
    activeRole,
    sportivi,
    sesiuniExamene,
    inscrieriExamene,
    antrenamente,
    grupe,
    plati,
    tranzactii,
    evenimente,
    rezultate,
    tipuriAbonament,
    familii,
    anunturiPrezenta,
    reduceri,
    deconturiFederatie,
    istoricGrade,
    vizualizarePlati,
    istoricPlatiDetaliat,
    locatii
}: UseFilteredDataProps) => {
    return useMemo(() => {
        return {
            sportivi: sportivi || [],
            sesiuniExamene: sesiuniExamene || [],
            inscrieriExamene: inscrieriExamene || [],
            antrenamente: antrenamente || [],
            grupe: grupe || [],
            plati: plati || [],
            tranzactii: tranzactii || [],
            evenimente: evenimente || [],
            rezultate: rezultate || [],
            tipuriAbonament: tipuriAbonament || [],
            familii: familii || [],
            anunturiPrezenta: anunturiPrezenta || [],
            reduceri: reduceri || [],
            deconturiFederatie: deconturiFederatie || [],
            istoricGrade: istoricGrade || [],
            vizualizarePlati: vizualizarePlati || [],
            istoricPlatiDetaliat: istoricPlatiDetaliat || [],
            locatii: locatii || [],
        };
    }, [
        sportivi,
        sesiuniExamene,
        inscrieriExamene,
        antrenamente,
        grupe,
        plati,
        tranzactii,
        evenimente,
        rezultate,
        tipuriAbonament,
        familii,
        anunturiPrezenta,
        reduceri,
        deconturiFederatie,
        istoricGrade,
        vizualizarePlati,
        istoricPlatiDetaliat,
        locatii
    ]);
};
