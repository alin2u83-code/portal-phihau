import { executaCuReincercare, InfoReincercare } from '../utils/retryBackoff';
import { obtineHeadereAutentificare } from './apiAutentificat';

export interface RezultatMagicLink {
    link: string;
    username: string;
    tempEmail: string;
}

/**
 * Generează un magic link pentru un sportiv fără cont, autentificat (Bearer)
 * și rezilient la 429 (D-04/D-05). Nu aruncă niciodată.
 */
export async function genereazaMagicLinkSportiv(
    sportivId: string,
    optiuni?: { roles?: string[]; laReincercare?: (info: InfoReincercare) => void }
): Promise<{ data: RezultatMagicLink | null; error: string | null; incercari: number }> {
    const { data: headers, error: erorAuth } = await obtineHeadereAutentificare();
    if (!headers) {
        return { data: null, error: erorAuth, incercari: 0 };
    }

    let response: Response;
    let incercari: number;
    try {
        const rezultat = await executaCuReincercare(
            () => fetch('/api/genereaza-magic-link', {
                method: 'POST',
                headers,
                body: JSON.stringify({ sportiv_id: sportivId, roles: optiuni?.roles ?? ['SPORTIV'] }),
            }),
            { laReincercare: optiuni?.laReincercare }
        );
        response = rezultat.response;
        incercari = rezultat.incercari;
    } catch {
        return { data: null, error: 'Eroare de rețea', incercari: 1 };
    }

    let result: any = {};
    try {
        result = await response.json();
    } catch {
        result = {};
    }

    if (response.ok && result.success) {
        return {
            data: { link: result.link, username: result.username, tempEmail: result.tempEmail },
            error: null,
            incercari,
        };
    }

    const mesajBaza = result.error || 'Eroare necunoscută';
    return {
        data: null,
        error: mesajBaza + (incercari > 1 ? ` (după ${incercari} încercări)` : ''),
        incercari,
    };
}
