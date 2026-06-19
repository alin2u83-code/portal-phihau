import { supabase } from '../supabaseClient';

const today = () => new Date().toISOString().slice(0, 10);

// Inchide intrarile deschise pentru sportivii dati
export const inchideIntrariDeschise = async (
    sportiviIds: string[],
    userId: string | null
): Promise<void> => {
    if (sportiviIds.length === 0) return;
    await supabase
        .from('sportiv_grupa_istoric')
        .update({ data_iesire: today(), created_by: userId })
        .in('sportiv_id', sportiviIds)
        .is('data_iesire', null)
        .eq('tip', 'principala');
};

// Deschide intrari noi pentru sportivii dati intr-o grupa
export const deschideIntrareGrupa = async (
    sportiviIds: string[],
    grupaId: string,
    clubId: string,
    userId: string | null,
    motiv?: string
): Promise<void> => {
    if (sportiviIds.length === 0) return;
    const rows = sportiviIds.map(sportivId => ({
        sportiv_id: sportivId,
        grupa_id: grupaId,
        club_id: clubId,
        tip: 'principala',
        data_intrare: today(),
        created_by: userId,
        motiv_iesire: motiv || null,
    }));
    await supabase.from('sportiv_grupa_istoric').insert(rows);
};

// Scoate sportivii din grupa curenta
export const scoateDinGrupa = async (
    sportiviIds: string[],
    userId: string | null
): Promise<void> => {
    await inchideIntrariDeschise(sportiviIds, userId);
};

// Muta sportivii dintr-o grupa in alta
export const mutaInGrupa = async (
    sportiviIds: string[],
    grupaId: string,
    _grupaDenumire: string,
    clubId: string,
    userId: string | null,
    motiv?: string
): Promise<void> => {
    await inchideIntrariDeschise(sportiviIds, userId);
    await deschideIntrareGrupa(sportiviIds, grupaId, clubId, userId, motiv);
};

export const fetchIstoricGrupeSportiv = async (sportiviId: string) => {
    return supabase
        .from('sportiv_grupa_istoric')
        .select('*, grupe(denumire)')
        .eq('sportiv_id', sportiviId)
        .eq('tip', 'principala')
        .order('data_intrare', { ascending: false });
};

export const fetchIstoricMembriGrupa = async (grupaId: string) => {
    return supabase
        .from('sportiv_grupa_istoric')
        .select('*, sportivi(id, nume, prenume)')
        .eq('grupa_id', grupaId)
        .eq('tip', 'principala')
        .order('data_intrare', { ascending: false });
};
