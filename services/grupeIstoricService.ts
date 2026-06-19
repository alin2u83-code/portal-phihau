import { supabase } from '../supabaseClient';

const today = () => new Date().toISOString().slice(0, 10);

// Inchide intrarile deschise pentru sportivii dati (seteaza data_iesire = azi)
export const inchideIntrariDeschise = async (
    sportiviIds: string[],
    userId: string | null
): Promise<void> => {
    if (sportiviIds.length === 0) return;
    await supabase
        .from('sportiv_grupe_istoric')
        .update({ data_iesire: today(), schimbat_de_user_id: userId })
        .in('sportiv_id', sportiviIds)
        .is('data_iesire', null);
};

// Deschide intrari noi pentru sportivii dati intr-o grupa
export const deschideIntrareGrupa = async (
    sportiviIds: string[],
    grupaId: string,
    grupaDenumire: string,
    clubId: string,
    userId: string | null,
    motiv?: string
): Promise<void> => {
    if (sportiviIds.length === 0) return;
    const rows = sportiviIds.map(sportivId => ({
        sportiv_id: sportivId,
        grupa_id: grupaId,
        grupa_denumire: grupaDenumire,
        data_intrare: today(),
        club_id: clubId,
        schimbat_de_user_id: userId,
        motiv: motiv || null,
    }));
    await supabase.from('sportiv_grupe_istoric').insert(rows);
};

// Scoate sportivii din grupa curenta (doar inchide intrarea, fara a deschide alta)
export const scoateDinGrupa = async (
    sportiviIds: string[],
    userId: string | null
): Promise<void> => {
    await inchideIntrariDeschise(sportiviIds, userId);
};

// Muta sportivii dintr-o grupa in alta: inchide vechi + deschide nou
export const mutaInGrupa = async (
    sportiviIds: string[],
    grupaId: string,
    grupaDenumire: string,
    clubId: string,
    userId: string | null,
    motiv?: string
): Promise<void> => {
    await inchideIntrariDeschise(sportiviIds, userId);
    await deschideIntrareGrupa(sportiviIds, grupaId, grupaDenumire, clubId, userId, motiv);
};

// Fetch istoric pentru un sportiv (cel mai recent primul)
export const fetchIstoricGrupeSportiv = async (sportiviId: string) => {
    const { data, error } = await supabase
        .from('sportiv_grupe_istoric')
        .select('*')
        .eq('sportiv_id', sportiviId)
        .order('data_intrare', { ascending: false });
    return { data, error };
};

// Fetch toti membrii (curenti + fostii) ai unei grupe
export const fetchIstoricMembriGrupa = async (grupaId: string) => {
    const { data, error } = await supabase
        .from('sportiv_grupe_istoric')
        .select('*, sportivi(id, nume, prenume, foto_url, grad_actual_id)')
        .eq('grupa_id', grupaId)
        .order('data_intrare', { ascending: false });
    return { data, error };
};
