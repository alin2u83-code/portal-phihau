import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { 
    Sportiv, SesiuneExamen, Grad, InscriereExamen, Antrenament, Grupa, Plata,
    Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie,
    Rol, AnuntPrezenta, Reducere, TipPlata, Locatie, Club, DecontFederatie, IstoricGrade, IstoricPlataDetaliat, VederePrezentaSportiv, FilteredData,
    TaxaAnualeConfig, VizaSportiv, DecontSportiv, TaxaAnualaFederatieConfig, CheieLaCerere
} from '../types';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { withCleanUuidFilters } from '../utils/supabaseFilters';
import { processSettledQueries, SettledQuery } from '../utils/supabaseHelpers';
import { ruleazaCuLimita, fereastraPrezenta, incarcaToatePaginile } from '../utils/incarcareDate';
import { useUserRoles } from './useUserRoles';
import { aplicaRamaneInAsteptare } from '../services/emailMfaService';
import { notificaIncercareLogin } from '../services/alertaSecuritateService';
import { useFilteredData } from './useFilteredData';
import { useAttendanceData } from './useAttendanceData';
import { useSportivi } from './useSportivi';
import { usePlati } from './usePlati';
import { useGrupe } from './useGrupe';
import { usePermissions } from './usePermissions';
import { useFetchAllowedClubs } from './useClubAccess';
import { SELECT_VIZE_CU_PLATA } from '../services/taxeAnualeService';
import { SELECT_TRANZACTIE_CU_ALOCARI, normalizeazaTranzactii } from '../services/tranzactiiService';
import { getCachedData, setCachedData } from '../utils/cache';
import { useAppStore } from '../src/store/useAppStore';

export interface AppData {
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    preturiConfig: PretConfig[];
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    allRoles: Rol[];
    reduceri: Reducere[];
    tipuriPlati: TipPlata[];
    locatii: Locatie[];
    clubs: Club[];
    deconturiFederatie: DecontFederatie[];
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    istoricPrezenta: VederePrezentaSportiv[];
    taxeAnualeConfig: TaxaAnualeConfig[];
    taxaAnualaFederatieConfig: TaxaAnualaFederatieConfig[];
    vizeSportivi: VizaSportiv[];
    decontSportivi: DecontSportiv[];
    filteredData?: FilteredData;
    allowedClubs: string[];
}

const initialData: AppData = {
    sportivi: [], sesiuniExamene: [], inscrieriExamene: [], grade: [], istoricGrade: [], 
    grupe: [], plati: [], tranzactii: [], evenimente: [], 
    rezultate: [], preturiConfig: [], tipuriAbonament: [], familii: [], 
    allRoles: [], reduceri: [], tipuriPlati: [], 
    locatii: [], clubs: [], deconturiFederatie: [],
    istoricPlatiDetaliat: [], istoricPrezenta: [], taxeAnualeConfig: [], taxaAnualaFederatieConfig: [], vizeSportivi: [], decontSportivi: [], allowedClubs: []
};

// Max cereri simultane la pornire: o conexiune PostgREST ramane 'aborted' ~34 s dupa un 57014 (38-01-LIVE L10).
const LIMITA_PORNIRE = 4;
const LIMITA_LA_CERERE = 3;

// Sarcini ca thunk-uri: builder-ele supabase sunt lazy si pornesc la await, deci limitatorul decide cand pleaca fiecare.
type Cereri = Record<string, () => PromiseLike<any>>;

const infoContext = (ctx: any) => {
    const rol = ctx.roluri?.nume || ctx.rol_denumire;
    const nivelFederatie = rol === 'SUPER_ADMIN_FEDERATIE' || rol === 'ADMIN';
    return { esteSportiv: rol === 'SPORTIV', clubId: (!nivelFederatie && ctx.club_id) ? ctx.club_id : null };
};

const avertizeazaDatePartiale = (chei: string[]) => {
    console.warn(`Date neincarcate (server ocupat): ${chei.join(', ')}`);
    toast.error('Unele date nu s-au putut încărca (server ocupat). Se reîncearcă automat; dacă persistă, apasă Reîncearcă pe ecran.', { id: 'date-partiale' });
};

// Seturile mari, incarcate doar cand un ecran le cere (D-01). 'plati' si 'antrenamenteIstoricComplet' nu sunt aici: au hook propriu.
const construiesteCereriLaCerere = (ctx: any): Cereri => {
    const db = withCleanUuidFilters(supabase as SupabaseClient<any, any>);
    const { esteSportiv, clubId } = infoContext(ctx);
    const cereri: Cereri = {
        reduceri: () => db.from('reduceri').select('*'),
        rezultate: () => db.from('rezultate').select('*'),
        tranzactii: () => db.from('tranzactii').select(SELECT_TRANZACTIE_CU_ALOCARI).then((r: any) => ({ ...r, data: r.data ? normalizeazaTranzactii(r.data) : r.data })),
        istoricPlatiDetaliat: () => db.from('view_istoric_plati_detaliat').select('*'),
        deconturiFederatie: () => db.from('deconturi_federatie').select('*'),
        vizeSportivi: () => db.from('vize_sportivi').select(SELECT_VIZE_CU_PLATA),
        decontSportivi: () => db.from('decont_sportivi').select('*'),
        taxaAnualaFederatieConfig: () => db.from('taxa_anuala_config').select('*'),
        preturiConfig: () => db.from('preturi_config').select('*'),
    };

    if (esteSportiv && ctx.sportiv_id) {
        cereri.inscrieriExamene = () => db.from('vedere_detalii_examen').select('*, id:inscriere_id').eq('sportiv_id', ctx.sportiv_id);
        cereri.istoricGrade = () => db.from('vedere_istoric_grade_sportiv').select('*').eq('sportiv_id', ctx.sportiv_id);
    } else {
        cereri.inscrieriExamene = () => clubId
            ? db.from('vedere_detalii_examen').select('*, id:inscriere_id').eq('club_id', clubId)
            : db.from('vedere_detalii_examen').select('*, id:inscriere_id');

        // PostgREST limiteaza la 1000 de randuri/request (un club poate avea >1000 in istoric_grade): paginam cu .range().
        // Scop dupa club_id (derivat din sportivi.club_id in view), NU .in('sportiv_id', ids): URL de 14-17KB blocheaza gateway-ul
        // (vezi .planning/debug/resolved/loading-hang-istoric-grade.md).
        cereri.istoricGrade = () => incarcaToatePaginile<any>((from, to) => clubId
            ? db.from('vedere_istoric_grade_sportiv').select('*').eq('club_id', clubId).order('id', { ascending: true }).range(from, to)
            : db.from('vedere_istoric_grade_sportiv').select('*').order('id', { ascending: true }).range(from, to));
    }
    return cereri;
};

export const useDataProvider = () => {
    const [data, setData] = useState<AppData>(initialData);
    // Cererile la cerere: 'plati' porneste usePlati, prezentaCompleta scoate fereastra de prezenta (declarate sus, folosite de hook-uri)
    const [platiCerute, setPlatiCerute] = useState(false);
    const [prezentaCompleta, setPrezentaCompleta] = useState(false);
    const [cheiIncarcate, setCheiIncarcate] = useState<ReadonlySet<CheieLaCerere>>(() => new Set());
    // WR-03: cheile care au esuat si dupa reincercari (altfel seIncarca ar ramane true la nesfarsit)
    const [cheiEsuate, setCheiEsuate] = useState<ReadonlySet<CheieLaCerere>>(() => new Set());
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingIstoric, setLoadingIstoric] = useState(false);
    const lastFetchedSportivId = React.useRef<string | null>(null);
    const currentSessionUserIdRef = React.useRef<string | null>(null);
    const [isAuthInitialized, setIsAuthInitialized] = useState(false);
    const canFetch = !!session?.user && isAuthInitialized;

    // Use the new hook for user roles
    const { 
        userRoles, 
        activeRoleContext, 
        loading: rolesLoading, 
        error: rolesError, 
        needsRoleSelection, 
        refreshRoles,
        setActiveRoleContext
    } = useUserRoles(session?.user?.id);

    // Derive active role for filtering (fallback to rol_denumire if rol_id was not set)
    const activeRole = activeRoleContext?.roluri?.nume || activeRoleContext?.rol_denumire || null;
    const permissions = usePermissions(activeRoleContext);
    const { allowedClubs, loading: accessLoading } = useFetchAllowedClubs(session?.user?.id);

    // Faza 38 D-02: nicio cerere de date (sportivi, plati, grupe, prezenta, set critic, realtime) inainte ca MFA sa fi trecut
    // pentru contextul activ; inainte ruleaza doar rolurile, cluburile permise si verificarile MFA.
    const mfaContextId = useAppStore(s => s.mfaContextId);
    const poatePorniDate = !!activeRoleContext && mfaContextId === activeRoleContext.id && activeRole !== 'REPREZENTANT_COMPETITIE';

    // Pentru ADMIN_CLUB și INSTRUCTOR, pasăm club_id-ul activ ca filtru defensive în memorie.
    // View-ul vedere_cluburi_program_antrenamente filtrează deja prin get_active_club_id() la nivel DB,
    // dar adăugăm filtrul și la nivel de hook pentru robustețe (race condition la login).
    const attendanceClubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);
    const attendanceData = useAttendanceData(
        attendanceClubId ?? undefined,
        !poatePorniDate,
        // D-03: fereastra azi-90..azi+30 la pornire; istoricul complet doar cand un ecran il cere (sirurile sunt stabile in aceeasi zi)
        prezentaCompleta ? undefined : fereastraPrezenta(new Date())
    );

    // SUPER_ADMIN_FEDERATIE și ADMIN văd toate grupele; ceilalți văd doar grupele clubului lor
    const grupeClubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);

    // Use custom hooks for data fetching
    // Pentru non-federation admin, filtrăm sportivii la nivel de query după clubul activ
    const sportiviClubId = permissions.isFederationLevel ? undefined : (activeRoleContext?.club_id ?? undefined);
    const { data: sportiviData, isLoading: sportiviLoading, error: sportiviError } = useSportivi(
        { clubId: sportiviClubId },
        undefined,
        undefined,
        poatePorniDate ? activeRoleContext?.id : undefined
    );
    const { data: platiData, isLoading: platiLoading, error: platiError } = usePlati(poatePorniDate && platiCerute ? activeRoleContext?.id : undefined);
    const { data: grupeData, isLoading: grupeLoading, error: grupeError } = useGrupe(poatePorniDate ? activeRoleContext?.id : undefined, grupeClubId);

    // Update state when data changes de la hook-urile secundare
    useEffect(() => {
        setData(prev => ({
            ...prev,
            sportivi: sportiviData
                ? [...sportiviData].sort((a, b) => a.nume.localeCompare(b.nume, 'ro-RO'))
                : prev.sportivi,
            plati: platiData || prev.plati,
            grupe: grupeData || prev.grupe
        }));
    }, [sportiviData, platiData, grupeData]);

    // Use the filtering hook internally
    const filteredData = useFilteredData({
        activeRole,
        activeClubId: activeRoleContext?.club_id ?? null,
        sportivi: data.sportivi,
        sesiuniExamene: data.sesiuniExamene,
        inscrieriExamene: data.inscrieriExamene,
        antrenamente: attendanceData.antrenamente,
        grupe: data.grupe,
        plati: data.plati,
        tranzactii: data.tranzactii,
        evenimente: data.evenimente,
        rezultate: data.rezultate,
        tipuriAbonament: data.tipuriAbonament,
        familii: data.familii,
        anunturiPrezenta: attendanceData.anunturiPrezenta,
        reduceri: data.reduceri,
        deconturiFederatie: data.deconturiFederatie,
        istoricGrade: data.istoricGrade,
        istoricPlatiDetaliat: data.istoricPlatiDetaliat,
        locatii: data.locatii
    });

    const fetchIstoricVedere = useCallback(async (sportivId: string, silent = false) => {
        if (!sportivId) return;
        lastFetchedSportivId.current = sportivId;
        if (!silent) setLoadingIstoric(true);
        
        try {
            // Încercăm să citim din view-ul optimizat
            let { data: result, error: fetchErr } = await supabase
                .from('vedere_prezenta_detaliata')
                .select('*')
                .eq('sportiv_id', sportivId)
                .order('data', { ascending: false });

            // Dacă view-ul nu există (404) sau avem altă eroare, facem fallback pe tabelele de bază
            if (fetchErr) {
                console.warn("View 'vedere_prezenta_detaliata' not found or error, falling back to base tables:", fetchErr.message);
                
                const { data: fallbackData, error: fallbackErr } = await supabase
                    .from('prezenta_antrenament')
                    .select(`
                        status,
                        sportiv_id,
                        antrenament:antrenament_id (
                            id,
                            data,
                            ora_start,
                            club_id,
                            grupa:grupa_id (
                                id,
                                denumire
                            )
                        )
                    `)
                    .eq('sportiv_id', sportivId)
                    .order('antrenament_id', { ascending: false });

                if (!fallbackErr && fallbackData) {
                    // Mapăm datele pentru a respecta structura VederePrezentaSportiv
                    const mappedData: VederePrezentaSportiv[] = fallbackData.map((row: any) => ({
                        antrenament_id: row.antrenament?.id,
                        id: row.antrenament?.id,
                        sportiv_id: row.sportiv_id,
                        data: (row.antrenament?.data || '').toString().slice(0, 10),
                        status: row.status,
                        club_id: row.antrenament?.club_id,
                        grupa_id: row.antrenament?.grupa?.id,
                        ora_start: row.antrenament?.ora_start,
                        nume_grupa: row.antrenament?.grupa?.denumire
                    }));
                    setData(prev => ({ ...prev, istoricPrezenta: mappedData }));
                }
            } else if (result) {
                setData(prev => ({ ...prev, istoricPrezenta: result }));
            }
        } finally {
            if (!silent) setLoadingIstoric(false);
        }
    }, [activeRoleContext]);

    // currentUser din rolurile deja incarcate (fara date), ca pagina MFA sa poata fi randata inainte de orice cerere de date.
    useEffect(() => {
        if (!activeRoleContext || activeRole === 'REPREZENTANT_COMPETITIE') return;
        const profile = activeRoleContext.sportiv || (userRoles || []).find((r: any) => r.sportiv)?.sportiv;
        const currentRoles = (userRoles || []).map((r: any) => ({
            ...r.roluri,
            id: r.id, // Use assignment ID for uniqueness
            assignment_id: r.id
        })).filter((role: any) => role && role.nume);

        setCurrentUser({
            ...(profile || {
                id: session?.user.id,
                user_id: session?.user.id,
                email: session?.user.email,
                nume: 'Utilizator',
                prenume: 'Sistem',
            }),
            roluri: currentRoles,
            cluburi: activeRoleContext.cluburi
        } as any);
    }, [activeRoleContext, userRoles, session?.user.id]);

    useEffect(() => {
        // istoricPrezenta nu se mai incarca la pornire: MartialAttendance/SportivDashboard apeleaza fetchIstoricVedere singure (38-03)
        if (currentUser?.id && poatePorniDate) {
            const channelId = `${currentUser.id}_${Date.now()}`;
            const subscription = supabase
                .channel(`prezenta_antrenament_changes_${channelId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'prezenta_antrenament' },
                    () => {
                        if (lastFetchedSportivId.current) {
                            fetchIstoricVedere(lastFetchedSportivId.current, true);
                        }
                    }
                )
                .subscribe();
            
            const isStaff = activeRole === 'INSTRUCTOR' || activeRole === 'ADMIN_CLUB' || activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN_FEDERATIE';
            const clubId = currentUser?.club_id;
            const anunturiSubscription = isStaff && clubId
                ? supabase
                    .channel(`anunturi_prezenta_changes_${channelId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'anunturi_prezenta',
                            filter: `club_id=eq.${clubId}`
                        },
                        async (payload) => {
                            const record = payload.new as any;
                            if (!record?.sportiv_id || !record?.status) return;

                            const statusLabel: Record<string, { msg: string; icon: string }> = {
                                'Confirm':   { msg: 'confirmă prezența',  icon: '✅' },
                                'Intarziat': { msg: 'va întârzia',         icon: '⏰' },
                                'Absent':    { msg: 'va absenta',          icon: '❌' },
                            };
                            const { msg, icon } = statusLabel[record.status] ?? { msg: record.status, icon: '📋' };

                            const { data: sportivData } = await supabase
                                .from('sportivi')
                                .select('nume, prenume')
                                .eq('id', record.sportiv_id)
                                .maybeSingle();

                            const numeSportiv = sportivData
                                ? `${sportivData.prenume} ${sportivData.nume}`
                                : 'Un sportiv';

                            const toastFn = record.status === 'Absent' ? toast.error
                                : record.status === 'Intarziat' ? toast
                                : toast.success;

                            if (record.status === 'Intarziat') {
                                toast(`${icon} ${numeSportiv} ${msg}`, {
                                    icon: '⏰',
                                    style: { background: '#78350f', color: '#fef3c7', border: '1px solid #d97706' }
                                });
                            } else if (record.status === 'Absent') {
                                toast.error(`${icon} ${numeSportiv} ${msg}`);
                            } else {
                                toast.success(`${icon} ${numeSportiv} ${msg}`);
                            }
                        }
                    )
                    .subscribe()
                : null;

            return () => {
                supabase.removeChannel(subscription);
                if (anunturiSubscription) supabase.removeChannel(anunturiSubscription);
            };
        }
    }, [currentUser?.id, currentUser?.club_id, fetchIstoricVedere, activeRole, poatePorniDate]);

    const fetchAppData = useCallback(async (activeCtx: any) => {
        try {
            setLoadingData(true);
            setError(null);

            if (!supabase) throw new Error("Clientul Supabase nu este configurat.");

            const cleanedSupabase = withCleanUuidFilters(supabase as SupabaseClient<any, any>);
            const { esteSportiv: isSportiv, clubId } = infoContext(activeCtx);
            const withClub = (query: any) => clubId ? query.eq('club_id', clubId) : query;

            const cacheKeys: Record<string, string> = {
                clubs: 'cache_clubs',
                allRoles: 'cache_allRoles',
                grade: 'cache_grade',
                tipuriPlati: 'cache_tipuriPlati',
            };

            // Setul de pornire: doar tabele mici de referinta/config (sportivi si grupe vin din hook-urile lor).
            // Seturile mari (plati, istoric grade, examene etc.) se incarca la cerere — vezi construiesteCereriLaCerere.
            const criticalQueries: Cereri = {
                clubs: () => cleanedSupabase.from('cluburi').select('id, nume, cif, oras, theme_config, tema_config'),
                allRoles: () => cleanedSupabase.from('roluri').select('id, nume'),
                grade: () => cleanedSupabase.from('grade').select('*'),
                tipuriPlati: () => cleanedSupabase.from('tipuri_plati').select('id, nume'),
                tipuriAbonament: () => withClub(cleanedSupabase.from('tipuri_abonament').select('id, denumire, pret, club_id, numar_membri, sezon_id')),
                sesiuniExamene: () => withClub(cleanedSupabase.from('sesiuni_examene').select('*')),
                familii: () => withClub(cleanedSupabase.from('familii').select('*')),
                locatii: () => cleanedSupabase.from('nom_locatii').select('*'),
                evenimente: () => withClub(cleanedSupabase.from('evenimente').select('*')),
                taxeAnualeConfig: () => cleanedSupabase.from('taxe_anuale_config').select('*'),
            };

            // Check cache for static data
            const cachedResults: Record<string, any> = {};
            for (const [key, cacheKey] of Object.entries(cacheKeys)) {
                const cached = getCachedData(cacheKey);
                if (cached) {
                    cachedResults[key] = cached;
                    delete criticalQueries[key];
                }
            }

            const criticalKeys = Object.keys(criticalQueries);
            const criticalSettled = await ruleazaCuLimita(Object.values(criticalQueries), LIMITA_PORNIRE) as SettledQuery[];

            const { data: criticalData, rlsErrors, erori } = processSettledQueries(criticalSettled, criticalKeys);
            const finalData = { ...criticalData, ...cachedResults };

            // Update cache for newly fetched static data
            criticalSettled.forEach((result, index) => {
                const key = criticalKeys[index];
                if (result.status === 'fulfilled' && cacheKeys[key]) {
                    const rawData = result.value?.data;
                    if (rawData && rawData.length > 0) {
                        setCachedData(cacheKeys[key], rawData);
                    }
                }
            });

            const criticalRlsErrors = isSportiv
                ? rlsErrors.filter(err => !['locatii', 'reduceri', 'preturiConfig', 'istoricPlatiDetaliat', 'deconturiFederatie'].includes(err))
                : rlsErrors;

            if (criticalRlsErrors.length > 0) {
                setError(`Eroare Acces (RLS): ${criticalRlsErrors.join(', ')}`);
            }
            // Cheile esuate lipsesc din finalData, deci datele deja incarcate raman (`|| prev.x`); doar o avertizare discreta, fara ecran de eroare.
            if (erori.length > 0) avertizeazaDatePartiale(erori);

            setData(prev => ({
                ...prev,
                clubs: finalData.clubs?.length ? finalData.clubs : prev.clubs,
                allRoles: finalData.allRoles?.length ? finalData.allRoles.filter((r: any) => r.nume !== 'REPREZENTANT_COMPETITIE') : prev.allRoles,
                grade: finalData.grade?.length ? finalData.grade : prev.grade,
                tipuriAbonament: finalData.tipuriAbonament?.length ? finalData.tipuriAbonament : prev.tipuriAbonament,
                locatii: finalData.locatii || prev.locatii,
                tipuriPlati: finalData.tipuriPlati || prev.tipuriPlati,
                sesiuniExamene: finalData.sesiuniExamene || prev.sesiuniExamene,
                evenimente: finalData.evenimente || prev.evenimente,
                familii: finalData.familii || prev.familii,
                taxeAnualeConfig: finalData.taxeAnualeConfig || prev.taxeAnualeConfig,
            }));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingData(false);
        }
    }, []);

    // --- Incarcare la cerere (Faza 38 D-01) ---
    // Cererile pornesc doar dupa poarta MFA, cate o tura odata (coada seriala), max LIMITA_LA_CERERE in zbor.
    const cheiCerute = React.useRef(new Set<CheieLaCerere>());
    const cheiGata = React.useRef(new Set<CheieLaCerere>());
    const coadaLaCerere = React.useRef<Promise<void>>(Promise.resolve());
    const incercariCheie = React.useRef(new Map<CheieLaCerere, number>());
    const timereReincercare = React.useRef(new Map<CheieLaCerere, ReturnType<typeof setTimeout>>()); // WR-D: un singur timer pe cheie
    const MAX_INCERCARI_CHEIE = 3;
    const contextLaCerere = React.useRef<{ poate: boolean; ctx: any }>({ poate: false, ctx: null });
    contextLaCerere.current = { poate: poatePorniDate, ctx: activeRoleContext };

    const proceseazaCereri = useCallback(() => {
        const { poate, ctx } = contextLaCerere.current;
        if (!poate || !ctx) return;
        let curent: CheieLaCerere[] = [];
        coadaLaCerere.current = coadaLaCerere.current.then(async () => {
            const contextId = ctx.id;
            const deRulat = [...cheiCerute.current]
                .filter(k => k !== 'plati' && k !== 'antrenamenteIstoricComplet' && !cheiGata.current.has(k));
            if (deRulat.length === 0) return;
            curent = deRulat;

            const cereri = construiesteCereriLaCerere(ctx);
            const settled = await ruleazaCuLimita(deRulat.map(k => cereri[k]), LIMITA_LA_CERERE) as SettledQuery[];
            if (contextLaCerere.current.ctx?.id !== contextId) return; // contextul s-a schimbat intre timp

            const { data: rezultat, erori } = processSettledQueries(settled, deRulat);
            // Cheia esuata iese din setul cerut: o vizita ulterioara o reia; datele anterioare raman.
            erori.forEach(k => cheiCerute.current.delete(k as CheieLaCerere));
            // WR-03: reincercare automata (3 s, 6 s) cat ecranul ramane deschis; dupa MAX_INCERCARI_CHEIE cheia devine "esuata".
            const definitiv: CheieLaCerere[] = [];
            const dePlanificat: CheieLaCerere[] = [];
            erori.forEach(e => {
                const k = e as CheieLaCerere;
                const n = (incercariCheie.current.get(k) ?? 0) + 1;
                incercariCheie.current.set(k, n);
                (n < MAX_INCERCARI_CHEIE ? dePlanificat : definitiv).push(k);
            });
            if (definitiv.length > 0) setCheiEsuate(prev => new Set([...prev, ...definitiv]));
            dePlanificat.forEach(k => {
                const n = incercariCheie.current.get(k) ?? 1;
                const vechi = timereReincercare.current.get(k);
                if (vechi) clearTimeout(vechi);
                timereReincercare.current.set(k, setTimeout(() => {
                    timereReincercare.current.delete(k);
                    if (contextLaCerere.current.ctx?.id !== contextId) return;
                    cheiCerute.current.add(k);
                    proceseazaCereri();
                }, 3000 * n));
            });
            const reusite = deRulat.filter(k => !erori.includes(k));
            if (reusite.length > 0) {
                reusite.forEach(k => { cheiGata.current.add(k); incercariCheie.current.delete(k); });
                setCheiEsuate(prev => (reusite.some(k => prev.has(k)) ? new Set([...prev].filter(x => !reusite.includes(x))) : prev));
                setData(prev => {
                    const next: any = { ...prev };
                    reusite.forEach(k => { next[k] = rezultat[k] || (prev as any)[k]; });
                    return next;
                });
                setCheiIncarcate(new Set(cheiGata.current));
            }
            if (erori.length > 0) avertizeazaDatePartiale(erori);
        }).catch(err => {
            console.error('Incarcare la cerere esuata:', err?.message ?? err);
            // W4: exceptie neasteptata => cheile ruland devin "esuate" (cu Reincearca), nu raman in skeleton la nesfarsit
            if (curent.length > 0) {
                curent.forEach(k => cheiCerute.current.delete(k));
                setCheiEsuate(prev => new Set([...prev, ...curent]));
            }
        });
    }, []);

    // Idempotent; sigur de apelat inainte sa se deschida poarta MFA (cheile asteapta in coada).
    const incarcaLaCerere = useCallback((chei: CheieLaCerere[]) => {
        let nou = false;
        for (const k of chei) {
            if (k === 'plati') setPlatiCerute(true);
            else if (k === 'antrenamenteIstoricComplet') setPrezentaCompleta(true);
            else if (timereReincercare.current.has(k)) continue; // reincercare deja programata: nu resetam contorul si nu dublam cererea
            else if (!cheiCerute.current.has(k) && !cheiGata.current.has(k)) {
                // vizita noua dupa un esec definitiv reia cheia de la zero
                incercariCheie.current.delete(k);
                setCheiEsuate(prev => (prev.has(k) ? new Set([...prev].filter(x => x !== k)) : prev));
                cheiCerute.current.add(k); nou = true;
            }
        }
        if (nou) proceseazaCereri();
    }, [proceseazaCereri]);

    // Poarta s-a deschis: ruleaza ce s-a cerut intre timp.
    useEffect(() => {
        if (poatePorniDate) proceseazaCereri();
    }, [poatePorniDate, proceseazaCereri]);

    // Schimbarea contextului (in practica urmata de reload) goleste ce s-a cerut/incarcat; prima setare nu sterge cererile copiilor.
    const contextAnterior = React.useRef<string | null>(null);
    useEffect(() => {
        const id = activeRoleContext?.id ?? null;
        if (contextAnterior.current !== null && contextAnterior.current !== id) {
            cheiCerute.current.clear();
            cheiGata.current.clear();
            incercariCheie.current.clear();
            timereReincercare.current.forEach(clearTimeout);
            timereReincercare.current.clear();
            setCheiEsuate(new Set());
            setCheiIncarcate(new Set());
            setPlatiCerute(false);
            setPrezentaCompleta(false);
        }
        contextAnterior.current = id;
    }, [activeRoleContext?.id]);

    const platiIncarcate = platiCerute && platiData !== undefined;
    // CR-A: 'plati' vine din react-query, nu din coada la cerere; daca esueaza, trebuie sa iasa din "se incarca" (altfel skeleton infinit)
    const platiEsuate = platiCerute && !!platiError && platiData === undefined;
    const cheiEsuateExpuse = useMemo<ReadonlySet<CheieLaCerere>>(() => {
        if (!platiEsuate) return cheiEsuate;
        const s = new Set<CheieLaCerere>(cheiEsuate);
        s.add('plati');
        return s;
    }, [cheiEsuate, platiEsuate]);
    const prezentaCompletaIncarcata = prezentaCompleta && attendanceData.filtreIncarcate === 'null';
    const cheiIncarcateExpuse = useMemo<ReadonlySet<CheieLaCerere>>(() => {
        const s = new Set<CheieLaCerere>(cheiIncarcate);
        if (platiIncarcate) s.add('plati');
        if (prezentaCompletaIncarcata) s.add('antrenamenteIstoricComplet');
        return s;
    }, [cheiIncarcate, platiIncarcate, prezentaCompletaIncarcata]);

    useEffect(() => {
        if ((activeRoleContext?.roluri?.nume || activeRoleContext?.rol_denumire) === 'REPREZENTANT_COMPETITIE') {
            // Zona externa isi incarca singura datele; portalul principal nu trage setul clubului
            setLoadingData(false);
        } else if (activeRoleContext && poatePorniDate) {
            fetchAppData(activeRoleContext);
        } else if (activeRoleContext) {
            // Asteptam MFA: scheletul nu trebuie tinut pentru date care nu pornesc inca (D-02)
            setLoadingData(false);
        } else if (!rolesLoading && !needsRoleSelection) {
            setLoadingData(false);
        }
    }, [activeRoleContext, poatePorniDate, rolesLoading, needsRoleSelection, fetchAppData]);

    // Ref stabil pentru refreshRoles — previne re-rularea efectului de auth
    // când useUserRoles recreează funcția după ce rolurile sunt încărcate
    const refreshRolesRef = React.useRef(refreshRoles);
    useEffect(() => { refreshRolesRef.current = refreshRoles; }, [refreshRoles]);

    const initializeAndFetchData = useCallback(async () => {
        try {
            setLoadingData(true);
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            setSession(currentSession);
            if (currentSession) {
                currentSessionUserIdRef.current = currentSession.user.id;
                refreshRolesRef.current();
            }
            setLoadingData(false);
        } catch (err: any) {
            setError(err.message);
            setLoadingData(false);
        }
    }, []); // stabil — nu depinde de refreshRoles direct

    useEffect(() => {
        initializeAndFetchData();
        const verificatiGoogle = new Set<string>();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
            if (event === 'SIGNED_IN' && sess?.user?.app_metadata?.provider === 'google' && !verificatiGoogle.has(sess.user.id)) {
                // Google nu creează conturi în portal: fără roluri alocate => delogare. O singură dată per utilizator
                // (SIGNED_IN revine la refocus). La eroare de interogare nu delogăm; protecția reală e sign-up dezactivat în Supabase.
                // Setat async ca să nu blocheze callback-ul auth.
                const uid = sess.user.id;
                verificatiGoogle.add(uid);
                setTimeout(async () => {
                    const { count, error: rolErr } = await supabase
                        .from('utilizator_roluri_multicont').select('user_id', { count: 'exact', head: true }).eq('user_id', uid);
                    if (rolErr) { verificatiGoogle.delete(uid); return; }
                    if (!count) {
                        await supabase.auth.signOut();
                        toast.error('Acest cont Google nu are cont în portal. Cere administratorului clubului să te înregistreze cu această adresă de email.', { duration: 10000 });
                    } else {
                        // Login real = autentificare Google din ultimele 2 minute (last_sign_in_at al sesiunii); nu depinde de storage
                        // și nu se declanșează la reload/recuperare de sesiune. Dedup server-side: același IP+browser nu mai alertează.
                        const ultimaAutentificare = Date.parse(sess.user.last_sign_in_at ?? '');
                        const loginNou = Number.isFinite(ultimaAutentificare) && Date.now() - ultimaAutentificare < 2 * 60 * 1000;
                        aplicaRamaneInAsteptare(); // contul există: abia acum salvăm alegerea "dispozitiv personal"
                        if (loginNou) notificaIncercareLogin(sess.user.email ?? '', true, uid, sess.access_token); // alerta dispozitiv nou (Google)
                    }
                }, 0);
            }
            if (event === 'SIGNED_IN') {
                const incomingUserId = sess?.user?.id ?? null;
                setSession(sess);
                // Refresh roles only if this is a genuinely new user session.
                // If the user ID matches what we already have loaded, this is a
                // session recovery or token refresh event – skip re-fetching to
                // prevent unwanted page reloads when returning to the tab.
                if (incomingUserId && incomingUserId !== currentSessionUserIdRef.current) {
                    currentSessionUserIdRef.current = incomingUserId;
                    refreshRolesRef.current();
                }
            } else if (event === 'SIGNED_OUT') {
                currentSessionUserIdRef.current = null;
                setSession(null);
            }
        });
        return () => subscription.unsubscribe();
    }, []); // rulat o singură dată — ref-ul asigură că refreshRoles e mereu curent

    const createSetter = <K extends keyof AppData>(key: K) =>
        (value: React.SetStateAction<AppData[K]>) => {
            setData(prev => ({ ...prev, [key]: typeof value === 'function' ? (value as any)(prev[key]) : value }));
        };

    // Prezenta nu mai intra in loading/error global: un timeout acolo nu mai produce "Eroare de Sistem" (Faza 38).
    const loading = loadingData || rolesLoading || accessLoading;
    const combinedError = error || rolesError;

    return {
        ...data,
        filteredData,
        ...attendanceData,
        attendanceLoading: attendanceData.loading,
        attendanceError: attendanceData.error,
        incarcaLaCerere,
        cheiIncarcate: cheiIncarcateExpuse,
        cheiEsuate: cheiEsuateExpuse,
        allowedClubs,
        loading, 
        error: combinedError, 
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
        setTaxeAnualeConfig: createSetter('taxeAnualeConfig'),
        setVizeSportivi: createSetter('vizeSportivi'),
        setDecontSportivi: createSetter('decontSportivi'),
        setTaxaAnualaFederatieConfig: createSetter('taxaAnualaFederatieConfig'),
        loadingIstoric,
        fetchIstoricVedere,
        initializeAndFetchData 
    };
};