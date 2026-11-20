import { supabase } from '../supabaseClient';
import type { MemorieIban, RandExtrasBt, TranzactieBancara } from '../types';
import { salveazaDetaliiClub } from './cluburiDetaliiService';

// Extras bancar (tabel `tranzactii_bancare`): date bancare personale — nu se loghează rânduri
// și nu se trimit la AI/RAG (GDPR). Toate funcțiile întorc { data, error } și nu aruncă.

type Rez<T> = { data: T; error: string | null };

export async function importaRanduri(clubId: string, randuri: RandExtrasBt[]): Promise<Rez<{ inserate: number; duplicate: number } | null>> {
    if (randuri.length === 0) return { data: { inserate: 0, duplicate: 0 }, error: null };
    const payload = randuri.map(r => ({
        club_id: clubId,
        sursa: 'extras' as const,
        ref_banca: r.ref_banca,
        data_tranzactie: r.data_tranzactie,
        suma: r.suma,
        platitor_nume: r.platitor_nume,
        platitor_iban: r.platitor_iban,
        detalii: r.detalii,
    }));
    // ON CONFLICT DO NOTHING pe (club_id, sursa, ref_banca): reimportul nu dublează
    const { data, error } = await supabase
        .from('tranzactii_bancare')
        .upsert(payload, { onConflict: 'club_id,sursa,ref_banca', ignoreDuplicates: true })
        .select('id');
    if (error) return { data: null, error: error.message };
    const inserate = data?.length ?? 0;
    return { data: { inserate, duplicate: randuri.length - inserate }, error: null };
}

export async function listaTranzactiiBancare(clubId: string): Promise<Rez<TranzactieBancara[]>> {
    const { data, error } = await supabase
        .from('tranzactii_bancare')
        .select('*')
        .eq('club_id', clubId)
        .order('data_tranzactie', { ascending: false });
    return { data: (data as TranzactieBancara[] | null) ?? [], error: error?.message ?? null };
}

export async function ignoraTranzactieBancara(id: string, motiv: string | null): Promise<Rez<null>> {
    const { error } = await supabase
        .from('tranzactii_bancare')
        .update({ stare: 'ignorata', motiv_ignorare: motiv })
        .eq('id', id)
        .neq('stare', 'confirmata');
    return { data: null, error: error?.message ?? null };
}

export async function reactiveazaTranzactieBancara(id: string): Promise<Rez<null>> {
    const { error } = await supabase
        .from('tranzactii_bancare')
        .update({ stare: 'noua', motiv_ignorare: null })
        .eq('id', id)
        .neq('stare', 'confirmata');
    return { data: null, error: error?.message ?? null };
}

/** Un singur apel atomic: tranzacție + alocări. Eroarea păstrează mesajul RPC (UI-ul îl traduce). */
export async function confirmaTranzactieBancara(
    id: string,
    tinta: { sportiv_id?: string; familie_id?: string },
    alocari: { plata_id: string; suma_alocata: number }[]
): Promise<Rez<string | null>> {
    const { data, error } = await supabase.rpc('confirma_tranzactie_bancara', {
        p_id: id,
        p_tranzactie: tinta,
        p_plati: alocari,
    });
    return { data: (data as string | null) ?? null, error: error ? `${error.code ? error.code + ': ' : ''}${error.message}` : null };
}

export async function listaMemorieIban(clubId: string): Promise<Rez<MemorieIban[]>> {
    const { data, error } = await supabase
        .from('tranzactii_bancare_memorie_iban')
        .select('club_id, platitor_iban, sportiv_id, familie_id')
        .eq('club_id', clubId);
    return { data: (data as MemorieIban[] | null) ?? [], error: error?.message ?? null };
}

/** Citit separat de COLOANE (partajat): până la aplicarea migrării un SELECT pe `iban` ar strica alte ecrane. */
export async function getIbanClub(clubId: string): Promise<Rez<string | null>> {
    const { data, error } = await supabase.from('cluburi_detalii').select('iban').eq('club_id', clubId).maybeSingle();
    return { data: (data as { iban: string | null } | null)?.iban ?? null, error: error?.message ?? null };
}

export async function setIbanClub(clubId: string, iban: string): Promise<Rez<null>> {
    const { error } = await salveazaDetaliiClub(clubId, { iban });
    return { data: null, error };
}
