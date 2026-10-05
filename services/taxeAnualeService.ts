import { supabase } from '../supabaseClient';
import type {
    TipTaxaFederala,
    RezultatGenerareTaxe,
    RandRaportTaxeClub,
    SportivAcoperitPlata,
    VizaSportiv,
    DecontSportiv,
    DecontFederatie,
    TaxaAnualaFederatieConfig,
    MetodaPlataDecont,
} from '../types';

/**
 * Faza 33 — singurul punct de acces al UI catre RPC-urile / storage-ul taxelor anuale FRQKD + FRAM.
 * Toate functiile intorc `{ data, error }` (error = mesaj romanesc deja tradus sau null) si nu arunca.
 * Securitatea reala ramane in RLS / RPC (poate_gestiona_taxe_club); aici doar se transmit cererile.
 */

/** Vizele vin cu statusul facturii atasat (FK vize_sportivi_plata_id_fkey) ca bannerul/avertismentul FRAM sa poata verifica plata. */
export const SELECT_VIZE_CU_PLATA = '*, plata:plati!vize_sportivi_plata_id_fkey(status, suma)';

const BUCKET_DOVEZI = 'chitante_deconturi';
const TIPURI_DOVADA = ['image/png', 'image/jpeg', 'application/pdf'];
const MARIME_MAXIMA_DOVADA = 5 * 1024 * 1024;

type Rezultat<T> = { data: T | null; error: string | null };

/** Traduce o eroare Supabase/Postgres intr-un mesaj romanesc pentru utilizator. */
export function mesajEroareTaxe(error: unknown): string {
    const e = error as { code?: string; message?: string } | string | null | undefined;
    if (typeof e === 'string') return e;
    const cod = e?.code;
    const mesaj = e?.message ?? '';
    if (cod === '42501') {
        return mesaj && /[ăâîșțĂÂÎȘȚ]/.test(mesaj) ? mesaj : 'Acces refuzat pentru această operațiune.';
    }
    if (cod === '23505') {
        return 'Unul dintre sportivi a fost deja inclus într-o plată către federație (sau perioada are deja preț configurat).';
    }
    if (cod === '22023' || cod === 'P0001' || cod === 'P0002') {
        return mesaj || 'Operațiunea nu a putut fi efectuată.';
    }
    return 'Eroare neașteptată: ' + (mesaj || 'necunoscută');
}

const fara = <T>(): Rezultat<T> => ({ data: null, error: 'Conexiunea la baza de date nu este inițializată.' });

export async function genereazaTaxe(p: {
    clubId: string;
    tip: TipTaxaFederala;
    an: number;
    sportivIds?: string[] | null;
}): Promise<Rezultat<RezultatGenerareTaxe>> {
    if (!supabase) return fara();
    const { data, error } = await supabase.rpc('genereaza_taxe_anuale', {
        p_club_id: p.clubId,
        p_tip: p.tip,
        p_an: p.an,
        p_sportiv_ids: p.sportivIds ?? null,
    });
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    return { data: data as RezultatGenerareTaxe, error: null };
}

export async function seteazaScutire(p: {
    sportivId: string;
    tip: TipTaxaFederala;
    an: number;
    scutit: boolean;
    motiv?: string | null;
}): Promise<Rezultat<{ stare: string; plata_id: string | null; plata_anulata_id: string | null }>> {
    if (!supabase) return fara();
    const { data, error } = await supabase.rpc('seteaza_scutire_taxa', {
        p_sportiv_id: p.sportivId,
        p_tip: p.tip,
        p_an: p.an,
        p_scutit: p.scutit,
        p_motiv: p.motiv ?? null,
    });
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    return { data: data as { stare: string; plata_id: string | null; plata_anulata_id: string | null }, error: null };
}

/** Incarca dovada platii in bucket-ul chitante_deconturi; data = calea fisierului (se transmite apoi la inregistreazaPlataFederatie). */
export async function incarcaDovadaPlataFederatie(clubId: string, file: File): Promise<Rezultat<string>> {
    if (!supabase) return fara();
    if (!TIPURI_DOVADA.includes(file.type)) {
        return { data: null, error: 'Dovada trebuie să fie imagine PNG/JPEG sau PDF.' };
    }
    if (file.size > MARIME_MAXIMA_DOVADA) {
        return { data: null, error: 'Dovada depășește dimensiunea maximă de 5 MB.' };
    }
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    const cale = `public/${clubId}/${crypto.randomUUID()}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET_DOVEZI).upload(cale, file);
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    return { data: cale, error: null };
}

export async function inregistreazaPlataFederatie(p: {
    clubId: string;
    tip: TipTaxaFederala;
    an: number;
    sportivIds: string[];
    metoda: MetodaPlataDecont;
    dataPlata: string;
    dovadaPath?: string | null;
    observatii?: string | null;
}): Promise<Rezultat<{ decont_id: string; suma_totala: number; nr_participanti: number }>> {
    if (!supabase) return fara();
    const { data, error } = await supabase.rpc('inregistreaza_plata_federatie', {
        p_club_id: p.clubId,
        p_tip: p.tip,
        p_an: p.an,
        p_sportiv_ids: p.sportivIds,
        p_metoda_plata: p.metoda,
        p_data_plata: p.dataPlata,
        p_dovada_url: p.dovadaPath ?? null,
        p_observatii: p.observatii ?? null,
    });
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    return { data: data as { decont_id: string; suma_totala: number; nr_participanti: number }, error: null };
}

export async function incarcaRaportCluburi(tip: TipTaxaFederala, an: number): Promise<Rezultat<RandRaportTaxeClub[]>> {
    if (!supabase) return fara();
    const { data, error } = await supabase.rpc('raport_taxe_anuale_cluburi', { p_tip: tip, p_an: an });
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    const randuri: RandRaportTaxeClub[] = ((data as any[]) || []).map(r => ({
        club_id: r.club_id,
        club_nume: r.club_nume,
        nr_sportivi: Number(r.nr_sportivi ?? 0),
        nr_scutiti: Number(r.nr_scutiti ?? 0),
        nr_in_asteptare: Number(r.nr_in_asteptare ?? 0),
        nr_facturati: Number(r.nr_facturati ?? 0),
        suma_facturata: Number(r.suma_facturata ?? 0),
        suma_achitata_club: Number(r.suma_achitata_club ?? 0),
        suma_restanta_club: Number(r.suma_restanta_club ?? 0),
        nr_virati: Number(r.nr_virati ?? 0),
        suma_virata: Number(r.suma_virata ?? 0),
        suma_de_virat: Number(r.suma_de_virat ?? 0),
    }));
    return { data: randuri, error: null };
}

/** Seteaza pretul unei taxe pe perioada (doar SUPER_ADMIN — impus de RLS). UPDATE daca exista id, altfel INSERT. */
export async function salveazaPretTaxa(p: {
    id?: string | null;
    tip: TipTaxaFederala;
    an: number;
    suma: number;
}): Promise<Rezultat<TaxaAnualaFederatieConfig>> {
    if (!supabase) return fara();
    const query = p.id
        ? supabase.from('taxa_anuala_config').update({ suma: p.suma }).eq('id', p.id)
        : supabase.from('taxa_anuala_config').insert({ tip: p.tip, an_fiscal: p.an, suma: p.suma });
    const { data, error } = await query.select().single();
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    return { data: data as TaxaAnualaFederatieConfig, error: null };
}

/**
 * Sportivii acoperiti de plata(i) catre federatie pe (tip, an), optional pentru un singur decont.
 * Filtrare pe tip/an/decont_id, fara filtru IN pe liste mari (URL supradimensionat bloca incarcarea).
 */
export async function incarcaSportiviAcoperiti(p: {
    tip: TipTaxaFederala;
    an: number;
    decontId?: string | null;
}): Promise<Rezultat<SportivAcoperitPlata[]>> {
    if (!supabase) return fara();
    let query = supabase
        .from('decont_sportivi')
        .select('decont_id, sportiv_id, an, tip, suma, plata_id, sportivi(nume, prenume, data_nasterii)')
        .eq('tip', p.tip)
        .eq('an', p.an);
    if (p.decontId) query = query.eq('decont_id', p.decontId);
    const { data, error } = await query;
    if (error) return { data: null, error: mesajEroareTaxe(error) };
    const randuri: SportivAcoperitPlata[] = ((data as any[]) || []).map(r => {
        const s = Array.isArray(r.sportivi) ? r.sportivi[0] : r.sportivi;
        return {
            decont_id: r.decont_id,
            sportiv_id: r.sportiv_id,
            an: r.an,
            tip: r.tip,
            suma: r.suma != null ? Number(r.suma) : null,
            plata_id: r.plata_id ?? null,
            nume: s?.nume ?? null,
            prenume: s?.prenume ?? null,
            data_nasterii: s?.data_nasterii ?? null,
        };
    });
    return { data: randuri, error: null };
}

/** URL semnat (120 s) pentru dovada platii — nu se foloseste getPublicUrl. */
export async function urlSemnatDovada(path: string): Promise<Rezultat<string>> {
    if (!supabase) return fara();
    const { data, error } = await supabase.storage.from(BUCKET_DOVEZI).createSignedUrl(path, 120);
    if (error || !data?.signedUrl) return { data: null, error: error ? mesajEroareTaxe(error) : 'Nu s-a putut genera linkul dovezii.' };
    return { data: data.signedUrl, error: null };
}

export interface DateTaxeReincarcate {
    vize: VizaSportiv[];
    decontSportivi: DecontSportiv[];
    deconturi: DecontFederatie[];
    config: TaxaAnualaFederatieConfig[];
}

/** Reincarca din DB cele 4 seturi de date ale taxelor (dupa generare / scutire / plata / schimbare pret). */
export async function reincarcaDateTaxe(): Promise<Rezultat<DateTaxeReincarcate>> {
    if (!supabase) return fara();
    const [vize, decont, deconturi, config] = await Promise.all([
        supabase.from('vize_sportivi').select(SELECT_VIZE_CU_PLATA),
        supabase.from('decont_sportivi').select('*'),
        supabase.from('deconturi_federatie').select('*'),
        supabase.from('taxa_anuala_config').select('*'),
    ]);
    const eroare = vize.error || decont.error || deconturi.error || config.error;
    if (eroare) return { data: null, error: mesajEroareTaxe(eroare) };
    return {
        data: {
            vize: (vize.data as VizaSportiv[]) || [],
            decontSportivi: (decont.data as DecontSportiv[]) || [],
            deconturi: (deconturi.data as DecontFederatie[]) || [],
            config: (config.data as TaxaAnualaFederatieConfig[]) || [],
        },
        error: null,
    };
}
