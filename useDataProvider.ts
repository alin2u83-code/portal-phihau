import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { getAuthenticatedUser } from '../utils/auth';
import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata, 
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, 
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, VizualizarePlata
} from '../types';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { withCleanUuidFilters } from '../utils/supabaseFilters';

export interface AppData {
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    antrenamente: Antrenament[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: Tranzactie[];
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
    vizualizarePlati: VizualizarePlata[];
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    antrenamente: [], grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], anunturiPrezenta: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [], vizualizarePlati: []
};

export const useDataProvider = () => {
    const [data, setData] = useState<AppData>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [activeRoleContext, setActiveRoleContext] = useState<any | null>(null);
    const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

    const initializeAndFetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                setSession(null);
                setCurrentUser(null);
                setLoading(false);
                return;
            }
            setSession(currentSession);

            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);

            // 1. Gatekeeper: Profil și Roluri
            const { user: profile, roles, error: profileError } = await getAuthenticatedUser(supabase);
            
            if (profileError || !profile || !roles || roles.length === 0) {
                setError(profileError?.message || "Acces refuzat: Lipsă roluri.");
                setLoading(false);
                return;
            }

            setCurrentUser(profile);
            setUserRoles(roles);

            const primaryContext = roles.find(r => r.is_primary);
            setActiveRoleContext(primaryContext || null);
            
            if (roles.length > 1 && !primaryContext) {
                setNeedsRoleSelection(true);
                setLoading(false);
                return; 
            }

            // 2. Fetch Bulk Data cu protecție RLS
            const queries = [
                cleanedSupabase.from('cluburi').select('*'),
                cleanedSupabase.from('roluri').select('*'),
                cleanedSupabase.from('grade').select('*'),
                cleanedSupabase.from('grupe').select('*, program:orar_saptamanal!grupa_id(*)'),
                cleanedSupabase.from('tipuri_abonament').select('*'),
                cleanedSupabase.from('nom_locatii').select('*'),
                cleanedSupabase.from('tipuri_plati').select('*'),
                cleanedSupabase.from('reduceri').select('*'),
                cleanedSupabase.from('sportivi').select('*, cluburi(*), utilizator_roluri_multicont(rol_denumire)'),
                cleanedSupabase.from('sesiuni_examene').select('*'),
                cleanedSupabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)'),
                cleanedSupabase.from('program_antrenamente').select('*, grupe(*), prezenta:prezenta_antrenament!antrenament_id(sportiv_id, status)'),
                cleanedSupabase.from('plati').select('*'),
                cleanedSupabase.from('tranzactii').select('*'),
                cleanedSupabase.from('evenimente').select('*'),
                cleanedSupabase.from('rezultate').select('*'),
                cleanedSupabase.from('familii').select('*'),
                cleanedSupabase.from('anunturi_prezenta').select('*'),
                cleanedSupabase.from('preturi_config').select('*'),
                cleanedSupabase.from('view_plata_sportiv').select('*'),
                cleanedSupabase.from('deconturi_federatie').select('*'),
                cleanedSupabase.from('istoric_grade').select('*'),
            ];
            
            const results = await Promise.allSettled(queries);
            
            const processed = results.map((res, i) => {
                if (res.status === 'fulfilled') return res.value.data || [];
                return [];
            });

            // Destructurare cu fallback la array gol
            const [
                cData, rData, gData, grpData, subData, locData, pTypeData, 
                redData, sRaw, sessData, regData, trainData, payData, 
                trData, evData, resData, famData, annData, prcData, 
                vPayData, decData, istGData
            ] = processed;

            // Mapare sigură pentru Sportivi (Evităm eroarea .map pe undefined)
            const allSportivi = (sRaw || []).map(s => {
                if (!s) return null;
                const sWithRoles = s as any;
                const joinedRoles = (sWithRoles.utilizator_roluri_multicont || [])
                    .map((jr: any) => (rData || []).find((r: any) => r.nume === jr.rol_denumire))
                    .filter(Boolean);
                
                return { ...sWithRoles, roluri: joinedRoles };
            }).filter(Boolean) as Sportiv[];

            setData({
                clubs: cData,
                allRoles: rData,
                grade: gData,
                grupe: (grpData || []).map((g: any) => ({ ...g, program: g.program || [] })),
                tipuriAbonament: subData,
                locatii: locData,
                tipuriPlati: pTypeData,
                reduceri: redData,
                sportivi: allSportivi,
                sesiuniExamene: sessData,
                inscrieriExamene: regData,
                antrenamente: (trainData || []).map((t: any) => ({ ...t, prezenta: t.prezenta || [] })),
                plati: payData,
                tranzactii: trData,
                evenimente: evData,
                rezultate: resData,
                familii: famData,
                anunturiPrezenta: annData,
                preturiConfig: prcData,
                vizualizarePlati: vPayData,
                deconturiFederatie: decData,
                istoricGrade: istGData
            });

        } catch (err: any) {
            setError(`Eroare critică: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initializeAndFetchData();
    }, [initializeAndFetchData]);

    const createSetter = <K extends keyof AppData>(key: K) => 
        useCallback((value: React.SetStateAction<AppData[K]>) => {
            setData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as any)(prev[key]) : value }));
        }, []);

    return {
        ...data,
        loading,
        error,
        needsRoleSelection,
        session,
        currentUser,
        userRoles,
        activeRoleContext,
        setSportivi: createSetter('sportivi'),
        setSesiuniExamene: createSetter('sesiuniExamene'),
        setInscrieriExamene: createSetter('inscrieriExamene'),
        setIstoricGrade: createSetter('istoricGrade'),
        setAntrenamente: createSetter('antrenamente'),
        setPlati: createSetter('plati'),
        setTranzactii: createSetter('tranzactii'),
        setEvenimente: createSetter('evenimente'),
        setRezultate: createSetter('rezultate'),
        setFamilii: createSetter('familii'),
        setPreturiConfig: createSetter('preturiConfig'),
        setClubs: createSetter('clubs'),
        setAllRoles: createSetter('allRoles'),
        setGrade: createSetter('grade'),
        setGrupe: createSetter('grupe'),
        setTipuriAbonament: createSetter('tipuriAbonament'),
        setLocatii: createSetter('locatii'),
        setTipuriPlati: createSetter('tipuriPlati'),
        setReduceri: createSetter('reduceri'),
        setDeconturiFederatie: createSetter('deconturiFederatie'),
        setAnunturiPrezenta: createSetter('anunturiPrezenta'),
        setVizualizarePlati: createSetter('vizualizarePlati'),
    };
};