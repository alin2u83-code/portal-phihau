/**
 * Politică de reîncercare D-04: delay preventiv fix între requesturi secvențiale
 * + reîncercare automată cu backoff exponențial (1s/3s/9s, max 3 reîncercări)
 * EXCLUSIV pe răspunsuri HTTP 429.
 *
 * Notă (32-RESEARCH.md Pitfall 1): bucla bulk lovește `api/genereaza-magic-link.ts`
 * (Admin API cu service_role — `createUser`/`generateLink`), care NU apare în
 * tabelul oficial de rate limits Supabase pentru endpointurile publice
 * (`/auth/v1/signup|recover|otp`). Backoff-ul e reziliență generală, nu apărare
 * împotriva unui rate limit confirmat pe acest flux — 429-ul real după 32-05 vine
 * din limita per IP a endpointului propriu sau e propagat de Supabase, ambele
 * emise ÎNAINTE de orice modificare (sigur de reîncercat).
 *
 * De ce erorile de rețea NU se reîncearcă: la o eroare de rețea, serverul poate
 * fi creat deja contul înainte ca răspunsul să ajungă la client — o reîncercare
 * ar întoarce 400 "sportivul are deja cont" și ar pierde link-ul generat.
 */

/** Delay fix între doi sportivi consecutivi în buclă (D-04). */
export const DELAY_PREVENTIV_MS = 500;

/** 3 reîncercări, backoff exponențial 1s/3s/9s (D-04). */
export const DELAYURI_BACKOFF_MS: readonly number[] = [1000, 3000, 9000];

/** Plafon pentru Retry-After venit de la server. */
export const RETRY_AFTER_MAXIM_MS = 60_000;

export const asteapta = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export interface InfoReincercare {
    reincercare: number;
    totalReincercari: number;
    delayMs: number;
    status: number;
}

/**
 * Calculează delay-ul pentru reîncercarea `indexReincercare` (0-based).
 * Dacă serverul trimite Retry-After (secunde întregi > 0), folosește maximul
 * dintre backoff-ul standard și Retry-After (plafonat la RETRY_AFTER_MAXIM_MS).
 */
export function calculeazaDelayReincercare(
    indexReincercare: number,
    retryAfterHeader: string | null,
    delayuriMs: readonly number[] = DELAYURI_BACKOFF_MS
): number {
    const backoff = delayuriMs[Math.min(indexReincercare, delayuriMs.length - 1)];
    if (retryAfterHeader) {
        const secunde = parseInt(retryAfterHeader, 10);
        if (Number.isFinite(secunde) && secunde > 0) {
            return Math.max(backoff, Math.min(secunde * 1000, RETRY_AFTER_MAXIM_MS));
        }
    }
    return backoff;
}

/**
 * Execută `apel()` și reîncearcă DOAR pe `response.status === 429`, maxim
 * `delayuriMs.length` reîncercări. Excepțiile aruncate de `apel` (eroare de
 * rețea) se propagă imediat, fără reîncercare.
 */
export async function executaCuReincercare(
    apel: () => Promise<Response>,
    optiuni?: {
        laReincercare?: (info: InfoReincercare) => void;
        asteapta?: (ms: number) => Promise<void>;
        delayuriMs?: readonly number[];
    }
): Promise<{ response: Response; incercari: number }> {
    const asteaptaFn = optiuni?.asteapta ?? asteapta;
    const delayuriMs = optiuni?.delayuriMs ?? DELAYURI_BACKOFF_MS;

    let incercari = 0;
    let response: Response;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        response = await apel();
        incercari++;

        if (response.status !== 429) {
            return { response, incercari };
        }

        const indexReincercare = incercari - 1;
        if (indexReincercare >= delayuriMs.length) {
            return { response, incercari };
        }

        const retryAfterHeader = response.headers.get('Retry-After');
        const delayMs = calculeazaDelayReincercare(indexReincercare, retryAfterHeader, delayuriMs);

        optiuni?.laReincercare?.({
            reincercare: incercari,
            totalReincercari: delayuriMs.length,
            delayMs,
            status: response.status,
        });

        await asteaptaFn(delayMs);
    }
}
