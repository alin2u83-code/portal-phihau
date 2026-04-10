import { useMemo } from 'react';
import { Sportiv, Rol, SesiuneExamen, InscriereExamen, Antrenament, Grupa, Plata, Tranzactie, Eveniment, Rezultat, TipAbonament, Familie, AnuntPrezenta, Reducere, DecontFederatie, IstoricGrade, VizualizarePlata, IstoricPlataDetaliat, Locatie } from '../types';

interface UseFilteredDataProps {
    activeRole: Rol['nume'] | null;
    activeClubId?: string | null;
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
    activeClubId,
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
    const isFederationLevel = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'ADMIN';
    const filteredSesiuniExamene = useMemo(() => {
        const all = sesiuniExamene || [];
        if (isFederationLevel || !activeClubId) return all;
        return all.filter(s => s.club_id === activeClubId);
    }, [sesiuniExamene, isFederationLevel, activeClubId]);

    return useMemo(() => {
        return {
            sportivi: sportivi || [],
            sesiuniExamene: filteredSesiuniExamene,
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
        filteredSesiuniExamene,
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
