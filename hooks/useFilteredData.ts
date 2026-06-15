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
        // Filtrare defensivă în memorie: non-federație vede doar datele clubului activ.
        // RLS permite acces la toate cluburile unde userul are rol — filtrul activ restricționează la contextul curent.
        const isFederationRole = activeRole === 'SUPER_ADMIN_FEDERATIE' || activeRole === 'ADMIN';
        const shouldFilter = !isFederationRole && !!activeClubId;

        const filteredAntrenamente = shouldFilter
            ? (antrenamente || []).filter(a => a.club_id === activeClubId)
            : (antrenamente || []);
        const filteredPlati = shouldFilter
            ? (plati || []).filter(p => p.club_id === activeClubId)
            : (plati || []);
        const filteredTranzactii = shouldFilter
            ? (tranzactii || []).filter(t => t.club_id === activeClubId)
            : (tranzactii || []);
        const filteredFamilii = shouldFilter
            ? (familii || []).filter(f => !f.club_id || f.club_id === activeClubId)
            : (familii || []);

        return {
            sportivi: sportivi || [],
            sesiuniExamene: sesiuniExamene || [],
            inscrieriExamene: inscrieriExamene || [],
            antrenamente: filteredAntrenamente,
            grupe: grupe || [],
            plati: filteredPlati,
            tranzactii: filteredTranzactii,
            evenimente: evenimente || [],
            rezultate: rezultate || [],
            tipuriAbonament: tipuriAbonament || [],
            familii: filteredFamilii,
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
