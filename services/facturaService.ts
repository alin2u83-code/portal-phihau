import { supabase } from '../supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plata, Sportiv } from '../types';
import { formatLuna } from '../utils/luniLipsa';

/**
 * Parametrii pentru generarea unei facturi de Abonament
 */
export interface GenereazaFacturaParams {
    sportiv: Sportiv;
    luna: number;   // 1-indexed (1=ianuarie)
    an: number;     // 2020–2100
    suma: number;
    descriere?: string;
    observatii?: string;
}

/**
 * Verifică dacă există deja o factură de Abonament pentru (sportivId, luna, an).
 *
 * Folosit intern de genereazaFacturaAbonament și public pentru validare prealabilă în UI.
 * Pattern confirmat din PlatiScadente.tsx lines 222-238 (handleGenerateSubscriptions).
 *
 * @param sportivId - UUID sportiv
 * @param luna - 1-indexed
 * @param an - 4 cifre
 * @returns true dacă factura există deja
 */
export async function facturaAbonamentExista(
    sportivId: string,
    luna: number,
    an: number
): Promise<boolean> {
    const { data, error } = await supabase
        .from('plati')
        .select('id')
        .eq('tip', 'Abonament')
        .eq('luna', luna)
        .eq('an', an)
        .eq('sportiv_id', sportivId);

    if (error) {
        console.error('[facturaAbonamentExista] eroare:', error);
        return false;
    }
    return (data?.length ?? 0) > 0;
}

/**
 * Generează o factură de Abonament pentru un sportiv individual (nu familie).
 *
 * Reguli:
 * - Blochează duplicate: dacă factura există deja → returnează error fără insert
 * - Validează luna (1–12) și an (2020–2100) — Threat T-14-01 (input validation V5)
 * - NU recalculează soldul — inserează direct cu status 'Neachitat' (anti-pattern interzis din RESEARCH.md)
 * - NU modifică generarea automată existentă
 * - NU modifică types.ts
 *
 * Pattern insert din PlatiScadente.tsx lines 205-211.
 *
 * @param params - { sportiv, luna, an, suma, descriere?, observatii? }
 * @returns { data: Plata | null, error: any }
 */
export async function genereazaFacturaAbonament(
    params: GenereazaFacturaParams
): Promise<{ data: Plata | null; error: any }> {
    const { sportiv, luna, an, suma, descriere, observatii } = params;

    // ── Validare input (V5 Input Validation — Threat T-14-01) ──
    if (!sportiv?.id) {
        return { data: null, error: { message: 'sportiv.id lipsă.' } };
    }
    if (!Number.isInteger(luna) || luna < 1 || luna > 12) {
        return { data: null, error: { message: `Luna invalidă: ${luna}. Acceptat: 1–12.` } };
    }
    if (!Number.isInteger(an) || an < 2020 || an > 2100) {
        return { data: null, error: { message: `Anul invalid: ${an}. Acceptat: 2020–2100.` } };
    }
    if (typeof suma !== 'number' || suma < 0 || !isFinite(suma)) {
        return { data: null, error: { message: `Suma invalidă: ${suma}. Trebuie să fie un număr pozitiv.` } };
    }

    // ── Verificare duplicat ──
    const exista = await facturaAbonamentExista(sportiv.id, luna, an);
    if (exista) {
        return {
            data: null,
            error: { message: `Factură existentă pentru ${formatLuna(luna, an)}. Nu se poate genera duplicat.` },
        };
    }

    // ── Construire obiect insert (pattern PlatiScadente.tsx lines 205-211) ──
    const lunaText = formatLuna(luna, an);
    const dataFactura = `${an}-${String(luna).padStart(2, '0')}-01`;

    const newPlata: Omit<Plata, 'id'> = {
        sportiv_id: sportiv.id,
        familie_id: null,                // generare manuală = per sportiv individual
        luna,
        an,
        suma,
        data: dataFactura,
        status: 'Neachitat',             // NU recalculează soldul — status inițial fix (RESEARCH anti-pattern)
        descriere: descriere ?? `Abonament ${lunaText}`,
        tip: 'Abonament',
        observatii: observatii ?? 'Generat manual de admin',
        club_id: sportiv.club_id ?? null,
    };

    // ── Insert în DB ──
    const { data, error } = await supabase
        .from('plati')
        .insert(newPlata)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[genereazaFacturaAbonament] eroare insert:', error);
        return { data: null, error };
    }

    return { data: data as Plata | null, error: null };
}

// ─── Anulare / Reactivare / Ștergere definitivă (quick 260829-erg) ─────────────
//
// Toate trei funcțiile primesc un al doilea parametru opțional `client`
// (implicit clientul aplicației `supabase`) — permite injectarea unui client
// alternativ (ex. service-role) în scripturi de test fără sesiune de autentificare.
// Nu schimbă comportamentul din UI: toate apelurile existente/noi din componente
// folosesc un singur argument (`plataId`), deci primesc implicit clientul aplicației.

/**
 * Anulează (soft) o factură de Abonament — statusul devine 'Anulat'.
 *
 * Reguli:
 * - Re-citește statusul real din DB înainte de UPDATE (același guard server-side ca la
 *   ștergere, PLF-04 / Threat T-14-04 din PlatiScadente.tsx:409-421) — statusul din
 *   state-ul clientului poate fi învechit dacă alt admin a încasat între timp.
 * - Refuză dacă factura este 'Achitat' sau 'Achitat Parțial'.
 * - Idempotent dacă factura este deja 'Anulat' — evită eroare la dublu-click.
 * - NU modifică `suma`, `suma_initiala` sau `observatii` — anularea trebuie să fie
 *   perfect reversibilă.
 *
 * @param plataId - UUID plată
 * @param client - client Supabase opțional (implicit clientul aplicației)
 * @returns { data: Plata | null, error: any }
 */
export async function anuleazaFacturaAbonament(
    plataId: string,
    client: SupabaseClient = supabase
): Promise<{ data: Plata | null; error: any }> {
    if (!plataId || typeof plataId !== 'string') {
        return { data: null, error: { message: 'plataId lipsă sau invalid.' } };
    }

    const { data: plataCurenta, error: fetchError } = await client
        .from('plati')
        .select('*')
        .eq('id', plataId)
        .maybeSingle();

    if (fetchError) {
        console.error('[anuleazaFacturaAbonament] eroare la citire:', fetchError);
        return { data: null, error: fetchError };
    }
    if (!plataCurenta) {
        return { data: null, error: { message: 'Factura nu a fost găsită.' } };
    }
    if (plataCurenta.status === 'Achitat') {
        return { data: null, error: { message: 'Factura este achitată. Storneaz-o sau mută încasarea înainte de anulare.' } };
    }
    if (plataCurenta.status === 'Achitat Parțial') {
        return { data: null, error: { message: 'Factura are încasări parțiale. Anulează întâi încasările.' } };
    }
    if (plataCurenta.status === 'Anulat') {
        // Idempotent — evită eroare la dublu-click pe buton.
        return { data: plataCurenta as Plata, error: null };
    }

    const { data, error } = await client
        .from('plati')
        .update({ status: 'Anulat' })
        .eq('id', plataId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[anuleazaFacturaAbonament] eroare update:', error);
        return { data: null, error };
    }
    return { data: data as Plata | null, error: null };
}

/**
 * Reactivează o factură anulată — statusul revine la 'Neachitat'.
 *
 * Simetric cu {@link anuleazaFacturaAbonament}: re-citește statusul real din DB
 * înainte de UPDATE. Revenim la 'Neachitat' (nu la statusul anterior anulării,
 * necunoscut) pentru că anularea e permisă doar pornind din 'Neachitat' — deci
 * nu se pierde informație.
 *
 * @param plataId - UUID plată
 * @param client - client Supabase opțional (implicit clientul aplicației)
 * @returns { data: Plata | null, error: any }
 */
export async function reactiveazaFacturaAbonament(
    plataId: string,
    client: SupabaseClient = supabase
): Promise<{ data: Plata | null; error: any }> {
    if (!plataId || typeof plataId !== 'string') {
        return { data: null, error: { message: 'plataId lipsă sau invalid.' } };
    }

    const { data: plataCurenta, error: fetchError } = await client
        .from('plati')
        .select('*')
        .eq('id', plataId)
        .maybeSingle();

    if (fetchError) {
        console.error('[reactiveazaFacturaAbonament] eroare la citire:', fetchError);
        return { data: null, error: fetchError };
    }
    if (!plataCurenta) {
        return { data: null, error: { message: 'Factura nu a fost găsită.' } };
    }
    if (plataCurenta.status !== 'Anulat') {
        return { data: null, error: { message: 'Doar facturile anulate pot fi reactivate.' } };
    }

    const { data, error } = await client
        .from('plati')
        .update({ status: 'Neachitat' })
        .eq('id', plataId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[reactiveazaFacturaAbonament] eroare update:', error);
        return { data: null, error };
    }
    return { data: data as Plata | null, error: null };
}

/**
 * Șterge definitiv (hard delete) o factură de Abonament.
 *
 * Replică lanțul de guard-uri din `components/Plati/GestiuneFacturi.tsx` (handleDelete)
 * și adaugă un guard nou, absent azi acolo: verificarea `tranzactii.plata_ids` (Threat
 * T-ERG-06) — o factură cu încasări înregistrate în tranzacții nu poate fi ștearsă
 * fără să lase bani „orfani" în tranzacție.
 *
 * Ordine guard-uri:
 * 1. re-citește statusul din DB — refuză dacă 'Achitat'
 * 2. verifică `inscrieri_examene.plata_id` — refuză dacă există înscrieri
 * 3. verifică `tranzactii.plata_ids` (contains) — refuză dacă există încasări
 * 4. abia apoi DELETE
 *
 * @param plataId - UUID plată
 * @param client - client Supabase opțional (implicit clientul aplicației)
 * @returns { data: null, error: any }
 */
export async function stergeFacturaAbonament(
    plataId: string,
    client: SupabaseClient = supabase
): Promise<{ data: null; error: any }> {
    if (!plataId || typeof plataId !== 'string') {
        return { data: null, error: { message: 'plataId lipsă sau invalid.' } };
    }

    const { data: plataCurenta, error: fetchError } = await client
        .from('plati')
        .select('status')
        .eq('id', plataId)
        .maybeSingle();
    if (fetchError) {
        console.error('[stergeFacturaAbonament] eroare la citire:', fetchError);
        return { data: null, error: fetchError };
    }
    if (plataCurenta?.status === 'Achitat') {
        return { data: null, error: { message: 'Facturile achitate nu pot fi șterse.' } };
    }

    const { data: inscrieri, error: inscrieriError } = await client
        .from('inscrieri_examene')
        .select('id')
        .eq('plata_id', plataId)
        .limit(1);
    if (inscrieriError) {
        console.error('[stergeFacturaAbonament] eroare verificare înscrieri:', inscrieriError);
        return { data: null, error: inscrieriError };
    }
    if (inscrieri && inscrieri.length > 0) {
        return {
            data: null,
            error: { message: 'Plata nu poate fi ștearsă — este asociată cu înscrieri la examene. Modificați sau retrageți înscrierea înainte de a șterge factura.' },
        };
    }

    const { data: tranzactiiAsociate, error: tranzactiiError } = await client
        .from('tranzactii')
        .select('id')
        .contains('plata_ids', [plataId])
        .limit(1);
    if (tranzactiiError) {
        console.error('[stergeFacturaAbonament] eroare verificare tranzacții:', tranzactiiError);
        return { data: null, error: tranzactiiError };
    }
    if (tranzactiiAsociate && tranzactiiAsociate.length > 0) {
        return {
            data: null,
            error: { message: 'Factura are încasări înregistrate în tranzacții. Nu poate fi ștearsă definitiv.' },
        };
    }

    const { error } = await client.from('plati').delete().eq('id', plataId);
    if (error) {
        console.error('[stergeFacturaAbonament] eroare delete:', error);
        return { data: null, error };
    }
    return { data: null, error: null };
}
