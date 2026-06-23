import { supabase } from '../supabaseClient';
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
