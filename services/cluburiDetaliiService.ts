import { supabase } from '../supabaseClient';
import type { ClubDetalii } from '../types';

// Detalii club (CIF, perioada de grație, factură automată): tabel `cluburi_detalii`,
// vizibil doar pentru super admin și admin club (RLS). Ceilalți văd doar nume + oraș din `cluburi`.

export const PERIOADA_GRATIE_IMPLICITA = 30;

const COLOANE = 'club_id, cif, perioada_gratie_zile, factura_automata_inscriere';

export async function getDetaliiClub(clubId: string): Promise<{ data: ClubDetalii | null; error: string | null }> {
    const { data, error } = await supabase.from('cluburi_detalii').select(COLOANE).eq('club_id', clubId).maybeSingle();
    return { data: (data as ClubDetalii | null) ?? null, error: error?.message ?? null };
}

/** Toate rândurile vizibile rolului curent (super admin: toate; admin club: clubul lui). */
export async function listaDetalii(): Promise<{ data: ClubDetalii[]; error: string | null }> {
    const { data, error } = await supabase.from('cluburi_detalii').select(COLOANE);
    return { data: (data as ClubDetalii[] | null) ?? [], error: error?.message ?? null };
}

/** Upsert pe club_id: rândul există de obicei (backfill/trigger), dar nu depindem de asta. */
export async function salveazaDetaliiClub(
    clubId: string,
    campuri: Partial<Omit<ClubDetalii, 'club_id'>>
): Promise<{ error: string | null; cod?: string }> {
    const { error } = await supabase.from('cluburi_detalii').upsert({ club_id: clubId, ...campuri }, { onConflict: 'club_id' });
    return { error: error?.message ?? null, cod: error?.code };
}

/** True dacă alt club are același CIF (verificare vizibilă doar pentru super admin). */
export async function cifFolositDeAltClub(cif: string, clubIdExclus?: string): Promise<boolean> {
    let q = supabase.from('cluburi_detalii').select('club_id').eq('cif', cif);
    if (clubIdExclus) q = q.neq('club_id', clubIdExclus);
    const { data } = await q.limit(1).maybeSingle();
    return !!data;
}

/** Instructorul care înscrie un sportiv nu vede detaliile; funcția garduită întoarce doar da/nu. */
export async function facturaAutomataActiva(clubId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('factura_automata_activa', { p_club_id: clubId });
    return !error && data === true;
}
