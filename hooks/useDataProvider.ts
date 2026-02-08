import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { getAuthenticatedUser } from '../utils/auth';
import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata, 
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, 
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade 
} from '../types';
import { Session } from '@supabase/supabase-js';
import { useError } from '../components/ErrorProvider';

// Define a type for the complete application data state
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
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    antrenamente: [], grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], anunturiPrezenta: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [],
};

const USER_CONTEXT_CACHE_KEY = 'phi-hau-user-context';

// The main data provider hook
export const useDataProvider = () => {
    const { showError } = useError();
    const [data, setData] = useState<AppData>(initialData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auth & context state
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userRoles, setUserRoles] = useState<any[]>([]);
    const [activeRoleContext, setActiveRoleContext] = useState<any | null>(null);
    const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

    const initializeAndFetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        setNeedsRoleSelection(false);

        try {
            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                setSession(null);
                setCurrentUser(null);
                sessionStorage.removeItem(USER_CONTEXT_CACHE_KEY);
                return;
            }
            setSession(currentSession);

            let profile, roles, primaryContext;

            // NOU: Pas 1 - Încearcă să încarci contextul utilizatorului din cache-ul sesiunii.
            const cachedUserContext = sessionStorage.getItem(USER_CONTEXT_CACHE_KEY);
            if (cachedUserContext) {
                const parsed = JSON.parse(cachedUserContext);
                profile = parsed.user;
                roles = parsed.roles;
                primaryContext = parsed.activeRole;
            } else {
                // NOU: Pas 2 - Dacă nu există cache, preia de la server.
                const { data: rolesValidationData, error: rpcError } = await supabase.rpc('get_user_login_data_v2');
                if (rpcError) throw new Error(`Eroare la verificarea rolurilor: ${rpcError.message}`);
                
                const { user: fetchedProfile, roles: fetchedRoles, error: profileFetchError } = await getAuthenticatedUser(supabase);
                if (profileFetchError) throw profileFetchError;

                if (!fetchedProfile || !fetchedRoles) {
                    const userRolesFromJwt = currentSession.user.app_metadata?.roles || [];
                    const hasAdminRole = userRolesFromJwt.some((r: string) => ['SUPER_ADMIN_FEDERATIE', 'Admin', 'Admin Club', 'Instructor'].includes(r));
                    
                    if (hasAdminRole) {
                        console.warn("[Fallback] Profilul de sportiv nu a putut fi încărcat, dar utilizatorul are rol de admin. Se creează un profil de avarie pentru a permite accesul.");
                        profile = {
                            id: 'FALLBACK_PROFILE_ID', user_id: currentSession.user.id, nume: 'Admin', prenume: 'Fallback', email: currentSession.user.email,
                            roluri: userRolesFromJwt.map((r: string) => ({ nume: r })), club_id: null, data_nasterii: '1900-01-01', data_inscrierii: '1900-01-01',
                            status: 'Activ', cnp: null, familie_id: null, tip_abonament_id: null, participa_vacanta: false, trebuie_schimbata_parola: false
                        };
                        roles = []; primaryContext = null;
                    } else {
                        // CAZ CRITIC: Dacă utilizatorul este autentificat, dar nu are roluri, este profil incomplet.
                        if (!rolesValidationData || (Array.isArray(rolesValidationData) && rolesValidationData.length === 0)) {
                             throw new Error("PROFIL_INCOMPLET: Contul este valid, dar nu are roluri sau profil asociat.");
                        }
                        throw new Error("Profilul utilizatorului nu a putut fi încărcat după validarea inițială.");
                    }
                } else {
                    profile = fetchedProfile;
                    roles = fetchedRoles;
                    primaryContext = roles.find(r => r.is_primary) || roles[0];
                    sessionStorage.setItem(USER_CONTEXT_CACHE_KEY, JSON.stringify({ user: profile, roles: roles, activeRole: primaryContext }));
                }
            }

            setCurrentUser(profile as User);
            setUserRoles(roles as any[]);
            setActiveRoleContext(primaryContext as any);
            
            if ((roles?.length || 0) > 1 && !primaryContext) {
                setNeedsRoleSelection(true);
                return; 
            }
            
            // Pas 3: Încarcă restul datelor aplicației.
            const queries = [
                supabase.from('cluburi').select('*'),
                supabase.from('roluri').select('*'),
                supabase.from('grade').select('*'),
                supabase.from('grupe').select('*, program:orar_saptamanal!grupa_id(*)'),
                supabase.from('tipuri_abonament').select('*'),
                supabase.from('nom_locatii').select('*'),
                supabase.from('tipuri_plati').select('*'),
                supabase.from('reduceri').select('*'),
                supabase.from('sportivi').select('*, roles:utilizator_roluri_multicont(rol_denumire, is_primary)'),
                supabase.from('sesiuni_examene').select('*'),
                supabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grades:grad_vizat_id(*)'),
                supabase.from('program_antrenamente').select('*, grupe(*), prezenta:prezenta_antrenament!antrenament_id(sportiv_id, status)'),
                supabase.from('plati').select('*'),
                supabase.from('tranzactii').select('*'),
                supabase.from('evenimente').select('*'),
                supabase.from('rezultate').select('*'),
                supabase.from('familii').select('*'),
                supabase.from('anunturi_prezenta').select('*'),
                supabase.from('preturi_config').select('*'),
                supabase.from('deconturi_federatie').select('*'),
                supabase.from('istoric_grade').select('*'),
            ];

            const settledResults = await Promise.allSettled(queries);
            
            const processedResults = settledResults.map((result) => {
                if (result.status === 'fulfilled') {
                    const { data, error } = result.value;
                    if (error && (error.code === '42501' || String(error.code) === '403' || error.message.includes('permission denied'))) {
                        console.warn(`RLS a blocat accesul la un tabel. Se returnează un array gol.`, error.message);
                        return { data: [], error: null };
                    }
                    if (error) throw error;
                    return { data, error };
                } else {
                    const error = result.reason;
                    if (error.code === '42501' || String(error.code) === '403' || error.message.includes('permission denied')) {
                        console.warn(`RLS a blocat accesul la un tabel. Se returnează un array gol.`, error.message);
                        return { data: [], error: null };
                    }
                    throw error;
                }
            });

            const [
                { data: clubsData }, { data: rolesData }, { data: gradesData }, { data: groupsData },
                { data: subscriptionTypesData }, { data: locatiiData }, { data: platiTypesData },
                { data: reduceriData }, { data: sportiviData }, { data: sessionsData },
                { data: registrationsData }, { data: trainingsData }, { data: platiData },
                { data: tranzactiiData }, { data: eventsData }, { data: resultsData },
                { data: familiesData }, { data: anunturiData }, { data: pricesData }, { data: deconturiData },
                { data: istoricGradeData }
            ] = processedResults;
            
            const clubsMap = new Map((clubsData || []).map(c => [c.id, c]));
            const allNomenclatorRoles = rolesData || [];
            const allSportivi = sportiviData?.map(s => {
                const joinedRoles = (s as any).roles || [];
                const userRolesFromJoin = joinedRoles.map((mcr: any) => allNomenclatorRoles.find(r => r.nume === mcr.rol_denumire)).filter(Boolean);
                return { ...s, roluri: userRolesFromJoin, cluburi: s.club_id ? (clubsMap.get(s.club_id) || { id: s.club_id, nume: 'Club Indisponibil' }) : null };
            }) || [];
            
            const allGrupe = groupsData?.map(g => ({ ...g, program: g.program || [] })) || [];
            
            setData({
                sportivi: allSportivi as Sportiv[],
                sesiuniExamene: sessionsData as SesiuneExamen[],
                inscrieriExamene: registrationsData as InscriereExamen[],
                istoricGrade: istoricGradeData as IstoricGrade[],
                antrenamente: (trainingsData?.map(t => ({...t, prezenta: (t as any).prezenta || []})) || []) as Antrenament[],
                plati: platiData as Plata[],
                tranzactii: tranzactiiData as Tranzactie[],
                evenimente: eventsData as Eveniment[],
                rezultate: resultsData as Rezultat[],
                familii: familiesData as Familie[],
                anunturiPrezenta: anunturiData as AnuntPrezenta[],
                preturiConfig: pricesData as PretConfig[],
                clubs: clubsData as Club[],
                allRoles: rolesData as Rol[],
                grade: gradesData as Grad[],
                grupe: allGrupe as Grupa[],
                tipuriAbonament: subscriptionTypesData as TipAbonament[],
                locatii: locatiiData as Locatie[],
                tipuriPlati: platiTypesData as TipPlata[],
                reduceri: reduceriData as Reducere[],
                deconturiFederatie: deconturiData as DecontFederatie[],
            });

        } catch (err: any) {
            setError(err.message);
            showError("Eroare la încărcarea datelor", `A apărut o problemă la preluarea datelor de pe server: ${err.message}`);
            if (!err.message.startsWith('PROFIL_INCOMPLET')) {
                console.error("Eroare critică în timpul încărcării datelor, se deconectează:", err);
                await supabase?.auth.signOut();
            }
        } finally {
            // Asigură că starea de loading este oprită indiferent de rezultat
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        if (!supabase) return;
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    initializeAndFetchData();
                }
            } else if (event === 'SIGNED_OUT') {
                sessionStorage.removeItem(USER_CONTEXT_CACHE_KEY);
                setSession(null);
                setCurrentUser(null);
                setUserRoles([]);
                setActiveRoleContext(null);
                setData(initialData);
                setLoading(false);
                setError(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [initializeAndFetchData]);
    
    // Create setters for individual data slices
    const createSetter = <K extends keyof AppData>(key: K) => 
        useCallback((value: React.SetStateAction<AppData[K]>) => {
            setData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as (prevState: AppData[K]) => AppData[K])(prev[key]) : value }));
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
    };
};
