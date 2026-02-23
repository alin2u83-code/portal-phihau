import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata, 
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, 
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, VizualizarePlata
} from '../types';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { withCleanUuidFilters } from '../utils/supabaseFilters';

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
    vizualizarePlati: VizualizarePlata[];
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    antrenamente: [], grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], anunturiPrezenta: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [], vizualizarePlati: []
};

// The main data provider hook
export const useDataProvider = () => {
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
      try {
        if (!supabase) {
            setError("Clientul Supabase nu este configurat.");
            setLoading(false);
            return;
        }

        const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);

        // Utility for retrying async functions
        const retry = async <T>(fn: () => Promise<T>, { retries = 3, delay = 1000 }: { retries?: number; delay?: number }): Promise<T> => {
            for (let i = 0; i < retries; i++) {
                try {
                    return await fn();
                } catch (err: any) {
                    if (i < retries - 1) {
                        console.warn(`[Retry] Attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`, err.message);
                        await new Promise(res => setTimeout(res, delay));
                    } else {
                        throw err; // Last attempt, rethrow error
                    }
                }
            }
            throw new Error('Retry mechanism failed unexpectedly.'); // Should not be reached
        };

        // Fetch user roles with detailed select and retry mechanism
        const fetchUserRoles = async (userId: string) => {
            try {
                const { data, error } = await supabase
                    .from('utilizator_roluri_multicont')
                    .select(`
                        id, rol_id, sportiv_id, club_id, is_primary, rol_denumire,
                        roluri:rol_id ( nume ),
                        club:club_id ( nume ),
                        sportiv:sportiv_id ( id, nume, prenume, email, data_nasterii, data_inscrierii, status, cnp, familie_id, tip_abonament_id, participa_vacanta, trebuie_schimbata_parola, grupa_id, club_id )
                    `)
                    .eq('user_id', userId);

                if (error) throw error;
                return data || [];
            } catch (err: any) {
                console.error("Eroare critică la încărcarea rolurilor:", err.message);
                throw err; // Re-throw to be caught by retry
            }
        };

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
            setSession(null);
            setCurrentUser(null);
            setLoading(false);
            return;
        }
        
        setSession(currentSession);
        setError(null);
        setNeedsRoleSelection(false);
        setLoading(true);

        // 1. Așteaptă contextul utilizatorului cu retry
        const { data: roles, error: profileFetchError } = await retry(
            () => fetchUserRoles(currentSession.user.id),
            { retries: 3, delay: 1000 } // Retry 3 times with 1-second delay
        );
        // Extract profile from roles if available, assuming the first role's sportiv is the primary user profile
        const profile = roles.find(r => r.sportiv_id)?.sportiv || null;
        
        if (profileFetchError) {
            if (profileFetchError.message.includes('Contul de utilizator nu este legat')) {
                const hasRefreshed = sessionStorage.getItem('sessionRefreshed');
                if (!hasRefreshed) {
                    sessionStorage.setItem('sessionRefreshed', 'true');
                    console.warn('[DataProvider] Incomplete profile detected. Attempting to refresh session to get updated claims.');
                    const { error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshError) {
                        setError('Eroare la reîmprospătarea sesiunii. Vă rugăm să vă autentificați din nou.');
                        await supabase.auth.signOut();
                    } else {
                        window.location.reload();
                        return;
                    }
                } else {
                    sessionStorage.removeItem('sessionRefreshed');
                    setError(profileFetchError.message);
                }
            } else {
                setError(profileFetchError.message);
            }
            
            setSession(null);
            setCurrentUser(null);
            setLoading(false);
            return;
        } else {
            sessionStorage.removeItem('sessionRefreshed');
        }

        if (!roles || roles.length === 0) {
            setError(profileFetchError?.message || "Profilul utilizatorului nu a putut fi încărcat (lipsă roluri).");
            setLoading(false);
            return;
        }

        // Verificăm dacă avem un rol salvat în memorie (după ce ai dat click pe buton)
        const savedRoleId = localStorage.getItem('phi-hau-active-role-context-id')?.replace(/"/g, '');

        let initialActiveRoleContext = null;
        if (savedRoleId) {
            initialActiveRoleContext = roles.find(r => r.id === savedRoleId);
        }

        // DACĂ nu avem rol salvat SAU rolul salvat nu mai e valid, luăm primul rol disponibil (Super Admin-ul lui Alin)
        if (!initialActiveRoleContext && roles.length > 0) {
            initialActiveRoleContext = roles.find(r => r.is_primary) || roles[0];
        }

        if (initialActiveRoleContext) {
            setActiveRoleContext(initialActiveRoleContext);
            setNeedsRoleSelection(false); // OPRIM LOOP-UL dacă am găsit MĂCAR un rol
        } else if (roles.length > 1) {
            setNeedsRoleSelection(true);
        } else if (roles.length === 1) {
            // If only one role and no context, set it automatically
            initialActiveRoleContext = roles[0];
            setActiveRoleContext(initialActiveRoleContext);
            setNeedsRoleSelection(false);
        } else {
            // No roles at all
            setNeedsRoleSelection(true);
        }

        // Ensure currentUser is populated even if sportivi table doesn't return data (for admins who are not active sportivi)
        const finalCurrentUser: User = profile || {
            id: currentSession.user.id,
            user_id: currentSession.user.id,
            email: currentSession.user.email || 'N/A',
            nume: 'Utilizator',
            prenume: 'Sistem',
            data_nasterii: null,
            data_inscrierii: new Date().toISOString().split('T')[0],
            status: 'Activ',
            cnp: null,
            familie_id: null,
            tip_abonament_id: null,
            participa_vacanta: false,
            trebuie_schimbata_parola: false,
            grupa_id: null,
            club_id: initialActiveRoleContext?.club_id || null,
            roluri: roles.map((r: any) => r.roluri) as Rol[] || [],
        };

        setCurrentUser(finalCurrentUser);
        setUserRoles(roles);
        setActiveRoleContext(initialActiveRoleContext);

        // Set needsRoleSelection to false if there's at least one role and a valid activeRoleContext
        if (roles.length > 0 && initialActiveRoleContext) {
            setNeedsRoleSelection(false);
        } else if (roles.length === 0) {
            setError(profileFetchError?.message || "Profilul utilizatorului nu a putut fi încărcat (lipsă roluri).");
            setNeedsRoleSelection(true);
        } else {
            setNeedsRoleSelection(true);
        }

        // Adăugăm logica pentru a curăța club_id și a apela fetchAppData condiționat
        const activeClubId = initialActiveRoleContext?.club_id;
        // DACĂ activeClubId este 'null' (string) sau undefined, îl transformăm în null real
        const cleanClubId = (activeClubId && activeClubId !== 'null') ? activeClubId : null;

        // Doar dacă avem un club_id valid SAU suntem Super Admin, încărcăm restul datelor
        if (cleanClubId || initialActiveRoleContext?.roluri?.nume === 'SUPER_ADMIN_FEDERATIE') {
            try {
                // Interogarea pentru view se bazează pe RLS-ul tabelelor subiacente.
                const platiViewQuery = cleanedSupabase.from('view_plata_sportiv').select('plata_id, sportiv_id, club_id, familie_id, data_emitere, descriere, suma_datorata, status, data_plata, suma_incasata, tranzactie_id, nume_complet');

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
                    platiViewQuery,
                    cleanedSupabase.from('deconturi_federatie').select('*'),
                    cleanedSupabase.from('istoric_grade').select('*'),
                ];
                
                const settledResults = await Promise.allSettled(queries);
                
                const processedResults = settledResults.map((result, index) => {
                    if (result.status === 'fulfilled') {
                        const { data, error: queryError } = result.value;
                        if (queryError) {
                            console.warn(`[DataProvider] A eșuat interogarea #${index}. Se returnează un array gol. Motiv:`, queryError);
                            if (String(queryError.code).includes('42P01')) {
                               console.error(`[DataProvider] Eroare de schemă (42P01): Tabela/coloana nu a fost găsită. Asigurați-vă că view-urile/tabelele și coloanele există. Este posibil să fie necesară o reîncărcare a schemei PostgREST. Rulați în SQL: NOTIFY pgrst, 'reload schema';`);
                            }
                            return { data: [], error: null };
                        }
                        return { data, error: null };
                    }
                      else {
                        const error = result.reason;
                        console.warn(`[DataProvider] O promisiune de interogare (index ${index}) a fost respinsă. Motiv:`, error);
                        return { data: [], error: null };
                    }
                });

                const [
                    { data: clubsData }, { data: rolesData }, { data: gradesData }, { data: groupsData },
                    { data: subscriptionTypesData }, { data: locatiiData }, { data: platiTypesData },
                    { data: reduceriData }, { data: sportiviData }, { data: sessionsData },
                    { data: registrationsData }, { data: trainingsData }, { data: platiData },
                    { data: tranzactiiData }, { data: evenimenteData }, { data: resultsData },
                    { data: familiesData }, { data: anunturiData }, { data: pricesData },
                    { data: vizualizarePlatiData }, { data: deconturiData }, { data: istoricGradeData }
                ] = processedResults;
                
                const allNomenclatorRoles = (rolesData || []) as Rol[];

                let allSportivi = (sportiviData || []).map(s => {
                    if (!s) return null;
                    const sportivWithRoles = s as any;
                    const userRolesFromJoin = (sportivWithRoles.utilizator_roluri_multicont || [])
                        .map((joinedRole: any) => allNomenclatorRoles.find(r => r.id === joinedRole.rol_id))
                        .filter((r): r is Rol => !!r);
                    
                    delete sportivWithRoles.utilizator_roluri_multicont;

                    return { 
                        ...sportivWithRoles, 
                        roluri: userRolesFromJoin,
                    };
                }).filter(Boolean) as Sportiv[] || [];
                
                const allGrupe = groupsData?.map(g => ({ ...g, program: g.program || [] })) || [];
                
                setData({
                    sportivi: allSportivi,
                    sesiuniExamene: (sessionsData || []) as SesiuneExamen[],
                    inscrieriExamene: (registrationsData || []) as InscriereExamen[],
                    istoricGrade: (istoricGradeData || []) as IstoricGrade[],
                    antrenamente: (trainingsData?.map(t => ({...t, prezenta: (t as any).prezenta || []})) || []) as Antrenament[],
                    plati: (platiData || []) as Plata[],
                    tranzactii: (tranzactiiData || []) as Tranzactie[],
                    evenimente: (evenimenteData || []) as Eveniment[],
                    rezultate: (resultsData || []) as Rezultat[],
                    familii: (familiesData || []) as Familie[],
                    anunturiPrezenta: (anunturiData || []) as AnuntPrezenta[],
                    preturiConfig: (pricesData || []) as PretConfig[],
                    clubs: (clubsData || []) as Club[],
                    allRoles: allNomenclatorRoles,
                    grade: (gradesData || []) as Grad[],
                    grupe: allGrupe as Grupa[],
                    tipuriAbonament: (subscriptionTypesData || []) as TipAbonament[],
                    locatii: (locatiiData || []) as Locatie[],
                    tipuriPlati: (platiTypesData || []) as TipPlata[],
                    reduceri: (reduceriData || []) as Reducere[],
                    deconturiFederatie: (deconturiData || []) as DecontFederatie[],
                    vizualizarePlati: (vizualizarePlatiData || []) as VizualizarePlata[],
                });


      } catch (err: any) {
        setError(`Eroare de conexiune sau de configurare: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
        if (!supabase) return;
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            // FIX: Adăugat TOKEN_REFRESHED. Acesta este declanșat de supabase.auth.refreshSession()
            // și este esențial pentru actualizarea stării după o comutare de rol fără reîncărcare.
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                initializeAndFetchData();
            } else if (event === 'SIGNED_OUT') {
                setSession(null);
                setCurrentUser(null);
                setUserRoles([]);
                setActiveRoleContext(null);
                setData(initialData);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [initializeAndFetchData]);
    
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
        setVizualizarePlati: createSetter('vizualizarePlati'),
    };
};
