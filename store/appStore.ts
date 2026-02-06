import { create } from 'zustand';
import {
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata,
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, Rol, AnuntPrezenta,
    Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade
} from '../types';

interface AppState {
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    antrenamente: Antrenament[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: any[]; // Replace with specific type if available
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    allRoles: Rol[];
    anunturiPrezenta: AnuntPrezenta[];
    reduceri: Reducere[];
    tipuriPlati: TipPlata[];
    locatii: Locatie[];
    clubs: Club[];
    deconturiFederatie: DecontFederatie[];
    setData: (data: any) => void;
    resetData: () => void;
}

const initialState = {
    sportivi: [],
    sesiuniExamene: [],
    inscrieriExamene: [],
    grade: [],
    istoricGrade: [],
    antrenamente: [],
    grupe: [],
    plati: [],
    tranzactii: [],
    evenimente: [],
    rezultate: [],
    preturiConfig: [],
    tipuriAbonament: [],
    familii: [],
    allRoles: [],
    anunturiPrezenta: [],
    reduceri: [],
    tipuriPlati: [],
    locatii: [],
    clubs: [],
    deconturiFederatie: [],
};

export const useAppStore = create<AppState>((set) => ({
    ...initialState,
    setData: (data) => set({
        sportivi: data.sportivi || [],
        sesiuniExamene: data.sesiuni_examene || [],
        inscrieriExamene: data.inscrieri_examene || [],
        grade: data.grade || [],
        istoricGrade: data.istoric_grade || [],
        antrenamente: data.antrenamente || [],
        grupe: data.grupe || [],
        plati: data.plati || [],
        tranzactii: data.tranzactii || [],
        evenimente: data.evenimente || [],
        rezultate: data.rezultate || [],
        preturiConfig: data.preturi_config || [],
        tipuriAbonament: data.tipuri_abonament || [],
        familii: data.familii || [],
        allRoles: data.all_roles || [],
        anunturiPrezenta: data.anunturi_prezenta || [],
        reduceri: data.reduceri || [],
        tipuriPlati: data.tipuri_plati || [],
        locatii: data.locatii || [],
        clubs: data.clubs || [],
        deconturiFederatie: data.deconturi_federatie || [],
    }),
    resetData: () => set(initialState),
}));
