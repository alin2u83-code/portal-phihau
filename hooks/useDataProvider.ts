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

        // 1. Așteaptă contextul utilizatorului
        const { user: profile, roles, error: profileFetchError } = await getAuthenticatedUser(supabase);
        
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

        const primaryContext = roles.find(r => r.is_primary);
        const savedRoleIdRaw = localStorage.getItem('phi-hau-active-role-context-id');
        // Curățăm ghilimelele extra dacă există
        const savedRoleId = savedRoleIdRaw ? savedRoleIdRaw.replace(/\"/g, '') : null;
        let initialActiveRoleContext = null;

        if (roles.length === 1) {
            // If only one role, select it automatically
            initialActiveRoleContext = roles[0];
            setNeedsRoleSelection(false);
        } else if (savedRoleId) {
            // Try to find the previously saved role
            initialActiveRoleContext = roles.find(r => r.id === savedRoleId);
            if (initialActiveRoleContext) {
                setNeedsRoleSelection(false);
            } else {
                // If saved role not found (e.g., deleted), force selection
                setNeedsRoleSelection(true);
            }
        } else if (primaryContext) {
            // If no saved role, but there's a primary role, use it
            initialActiveRoleContext = primaryContext;
            setNeedsRoleSelection(false);
        } else {
            // New logic: If no primary or saved context, and an instructor role exists, use it.
            const instructorRole = roles.find(r => r.roluri?.nume === 'INSTRUCTOR');
            if (instructorRole) {
                initialActiveRoleContext = instructorRole;
                setNeedsRoleSelection(false);
            } else {
                // Otherwise, force selection
                setNeedsRoleSelection(true);
            }
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
                } else {
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
            setError(`Eroare la procesarea datelor aplicației: ${err.message}`);
        } finally {
            setLoading(false);
        }
      } catch (err: any) {
        setError(`Eroare de conexiune sau de configurare: ${err.message}`);
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
