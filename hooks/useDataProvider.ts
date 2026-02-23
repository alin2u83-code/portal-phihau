import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
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
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                setSession(null);
                setLoading(false);
                return;
            }

            setSession(currentSession);
            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);

            // 1. Fetch Roluri Utilizator
            const { data: roles, error: rolesError } = await supabase
                .from('utilizator_roluri_multicont')
                .select(`id, rol_id, sportiv_id, club_id, is_primary, rol_denumire, roluri:rol_id(nume), club:club_id(nume), sportiv:sportiv_id(*)`)
                .eq('user_id', currentSession.user.id);

            if (rolesError) throw rolesError;
            if (!roles || roles.length === 0) {
                setNeedsRoleSelection(true);
                setLoading(false);
                return;
            }

            // 2. Determinare Context Activ (Admin/Instructor/Sportiv)
            const savedRoleId = localStorage.getItem('phi-hau-active-role-context-id')?.replace(/"/g, '');
            let activeCtx = (roles.find(r => r.id === savedRoleId) || roles.find(r => r.is_primary) || roles[0]) as any;
            
            setActiveRoleContext(activeCtx);
            setUserRoles(roles);

            // 3. Configurare User Profile
            const profile = activeCtx.sportiv;
            setCurrentUser((profile || {
                id: currentSession.user.id,
                email: currentSession.user.email,
                nume: 'Utilizator',
                prenume: 'Sistem',
                roluri: roles.map((r: any) => r.roluri)
            }) as any);

            // 4. Fetch Bulk Data (Modul Sportivi, Evenimente, Administrativ)
            const cleanClubId = (activeCtx.club_id && activeCtx.club_id !== 'null') ? activeCtx.club_id : null;
            const activeRoleName = Array.isArray(activeCtx.roluri) ? activeCtx.roluri[0]?.nume : activeCtx.roluri?.nume;

            if (cleanClubId || activeRoleName === 'SUPER_ADMIN_FEDERATIE') {
                const queries = [
                    cleanedSupabase.from('cluburi').select('*'),
                    cleanedSupabase.from('roluri').select('*'),
                    cleanedSupabase.from('grade').select('*'),
                    cleanedSupabase.from('grupe').select('*, program:orar_saptamanal!grupa_id(*)'),
                    cleanedSupabase.from('tipuri_abonament').select('*'),
                    cleanedSupabase.from('nom_locatii').select('*'),
                    cleanedSupabase.from('tipuri_plati').select('*'),
                    cleanedSupabase.from('reduceri').select('*'),
                    cleanedSupabase.from('sportivi').select('*, cluburi(*), utilizator_roluri_multicont(rol_id)'),
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
                    cleanedSupabase.from('istoric_grade').select('*')
                ];

                const settledResults = await Promise.allSettled(queries);
                const results = settledResults.map(r => r.status === 'fulfilled' ? r.value.data : []);

                // Mapare Date
                const allRoles = (results[1] || []) as Rol[];
                const allSportivi = (results[8] || []).map((s: any) => ({
                    ...s,
                    roluri: (s.utilizator_roluri_multicont || [])
                        .map((urm: any) => allRoles.find(r => r.id === urm.rol_id))
                        .filter(Boolean)
                })) as Sportiv[];

                setData({
                    clubs: results[0], allRoles: results[1], grade: results[2],
                    grupe: results[3].map((g:any) => ({...g, program: g.program || []})),
                    tipuriAbonament: results[4], locatii: results[5], tipuriPlati: results[6],
                    reduceri: results[7], sportivi: allSportivi, sesiuniExamene: results[9],
                    inscrieriExamene: results[10], antrenamente: results[11], plati: results[12],
                    tranzactii: results[13], evenimente: results[14], rezultate: results[15],
                    familii: results[16], anunturiPrezenta: results[17], preturiConfig: results[18],
                    vizualizarePlati: results[19], deconturiFederatie: results[20], istoricGrade: results[21]
                });
            }
        } catch (err: any) {
            console.error("Critical Fetch Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [withCleanUuidFilters]);

    useEffect(() => {
        initializeAndFetchData();
        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) initializeAndFetchData();
        });
        return () => subscription.unsubscribe();
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
        setCurrentUser,
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