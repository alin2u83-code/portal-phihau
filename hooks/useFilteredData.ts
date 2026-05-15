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
    return useMemo(() => {
        // Filtrare defensivă în memorie: ADMIN_CLUB/INSTRUCTOR văd doar antrenamentele clubului lor.
        // DB-ul filtrează deja prin get_active_club_id() pe view, dar dublăm protecția.
        const isFederationRole = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'ADMIN';
        const filteredAntrenamente = (!isFederationRole && activeClubId)
            ? (antrenamente || []).filter(a => a.club_id === activeClubId)
            : (antrenamente || []);

        return {
            sportivi: sportivi || [],
            sesiuniExamene: sesiuniExamene || [],
            inscrieriExamene: inscrieriExamene || [],
            antrenamente: filteredAntrenamente,
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
    ]);
};
