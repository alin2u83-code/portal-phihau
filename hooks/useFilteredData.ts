import { useMemo } from 'react';
import { Sportiv, Rol, SesiuneExamen, InscriereExamen, Antrenament, Grupa, Plata, Tranzactie, Eveniment, Rezultat, TipAbonament, Familie, AnuntPrezenta, Reducere, DecontFederatie, IstoricGrade, VizualizarePlata, IstoricPlataDetaliat } from '../types';

interface UseFilteredDataProps {
    activeRole: Rol['nume'] | null;
    activeClubId: string | null;
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
    istoricPlatiDetaliat
}: UseFilteredDataProps) => {
    return useMemo(() => {
        // LISTA ROLURILOR ADMINISTRATIVE CARE VAD TOT (Nivel Federatie)
        const isGlobalAdmin = 
            activeRole === 'SUPER_ADMIN_FEDERATIE' || 
            activeRole === 'ADMIN';

        if (isGlobalAdmin) {
            return {
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
            };
        }

        // LOGICA PENTRU SPORTIVI / USERI NON-ADMIN (sau fallback daca nu e rol selectat)
        // Aici pastram filtrarea pe baza de club pentru a nu arata date irelevante in UI
        // desi RLS-ul ar trebui sa blocheze accesul oricum.
        
        if (!activeClubId) {
            return {
                sportivi: [], sesiuniExamene: [], inscrieriExamene: [], antrenamente: [], grupe: [], plati: [],
                tranzactii: [], evenimente: [], rezultate: [], tipuriAbonament: [], familii: [],
                anunturiPrezenta: [], reduceri: [], deconturiFederatie: [], istoricGrade: [], vizualizarePlati: [],
                istoricPlatiDetaliat: []
            };
        }

        const fSportivi = (sportivi || []).filter((s) => s.club_id === activeClubId);
        const fGrupe = (grupe || []).filter((g) => g.club_id === activeClubId);

        const fSesiuniExamene = (sesiuniExamene || []).filter(
            (s) => s.club_id === activeClubId || s.club_id === null
        );
        const fEvenimente = (evenimente || []).filter(
            (e) => e.club_id === activeClubId || e.club_id === null
        );
        const fTipuriAbonament = (tipuriAbonament || []).filter(
            (t) => t.club_id === activeClubId || t.club_id === null
        );
        const fDeconturiFederatie = (deconturiFederatie || []).filter(
            (d) => d.club_id === activeClubId
        );
        const fVizualizarePlati = (vizualizarePlati || []).filter(
            (vp) => vp.club_id === activeClubId
        );

        const sportivIdsInClub = new Set(fSportivi.map((s) => s.id));
        const grupaIdsInClub = new Set(fGrupe.map((g) => g.id));

        const fFamilii = (familii || []).filter((fam) =>
            (sportivi || []).some(
                (s) => s.familie_id === fam.id && s.club_id === activeClubId
            )
        );
        const familieIdsInClub = new Set(fFamilii.map((f) => f.id));

        const fPlati = (plati || []).filter(
            (p) =>
                (p.sportiv_id && sportivIdsInClub.has(p.sportiv_id)) ||
                (p.familie_id && familieIdsInClub.has(p.familie_id))
        );
        const fTranzactii = (tranzactii || []).filter(
            (t) =>
                (t.sportiv_id && sportivIdsInClub.has(t.sportiv_id)) ||
                (t.familie_id && familieIdsInClub.has(t.familie_id))
        );
        const fIstoricPlatiDetaliat = (istoricPlatiDetaliat || []).filter(
            (ip) => (ip.sportiv_id && sportivIdsInClub.has(ip.sportiv_id)) || (ip.familie_id && familieIdsInClub.has(ip.familie_id))
        );
        const fAntrenamente = (antrenamente || []).filter(
            (a) => a.grupa_id === null || (a.grupa_id && grupaIdsInClub.has(a.grupa_id))
        );
        const fInscrieriExamene = (inscrieriExamene || []).filter((i) =>
            sportivIdsInClub.has(i.sportiv_id)
        );
        const fRezultate = (rezultate || []).filter((r) =>
            sportivIdsInClub.has(r.sportiv_id)
        );
        const fAnunturiPrezenta = (anunturiPrezenta || []).filter((a) =>
            sportivIdsInClub.has(a.sportiv_id)
        );
        const fIstoricGrade = (istoricGrade || []).filter((ig) =>
            sportivIdsInClub.has(ig.sportiv_id)
        );

        return {
            sportivi: fSportivi,
            sesiuniExamene: fSesiuniExamene,
            inscrieriExamene: fInscrieriExamene,
            antrenamente: fAntrenamente,
            grupe: fGrupe,
            plati: fPlati,
            tranzactii: fTranzactii,
            evenimente: fEvenimente,
            rezultate: fRezultate,
            tipuriAbonament: fTipuriAbonament,
            familii: fFamilii,
            anunturiPrezenta: fAnunturiPrezenta,
            reduceri,
            deconturiFederatie: fDeconturiFederatie,
            istoricGrade: fIstoricGrade,
            vizualizarePlati: fVizualizarePlati,
            istoricPlatiDetaliat: fIstoricPlatiDetaliat,
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
        istoricPlatiDetaliat
    ]);
};
