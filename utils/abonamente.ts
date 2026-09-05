/**
 * Regula unica de rezolvare a tipului de abonament pe sezonul activ (Faza 27).
 *
 * De la introducerea sezoanelor, un club poate avea mai multe tipuri de abonament
 * "Individual" (unul per sezon). Orice fallback pe `numar_membri` care ignora
 * sezonul poate factura silentios pretul unui sezon arhivat — de aceea ORICE
 * fallback trebuie sa ruleze pe lista intoarsa de `filtreazaTipuriSezon`, niciodata
 * direct pe `tipuriAbonament`.
 *
 * Cautarea dupa `tip_abonament_id` (asignare explicita a sportivului) se face
 * intotdeauna pe lista COMPLETA prin `gasesteTipDupaId` — asignarea manuala e
 * respectata chiar daca tipul apartine unui sezon arhivat (Open Question 1,
 * optiunea (a): reasignare manuala, nu remapare automata). `esteTipDinSezonArhivat`
 * semnaleaza acest caz ca sa nu ramana silentios pentru admin.
 */
import { TipAbonament } from '../types';

export function filtreazaTipuriSezon(
    tipuri: TipAbonament[],
    sezonActivId: string | null | undefined
): TipAbonament[] {
    if (!sezonActivId) return [...tipuri];
    return tipuri.filter(t => !t.sezon_id || t.sezon_id === sezonActivId);
}

export function gasesteTipDupaId(
    tipuri: TipAbonament[],
    tipAbonamentId: string | null | undefined
): TipAbonament | undefined {
    if (!tipAbonamentId) return undefined;
    return tipuri.find(t => t.id === tipAbonamentId);
}

export function esteTipDinSezonArhivat(
    tip: TipAbonament | null | undefined,
    sezonActivId: string | null | undefined
): boolean {
    if (!tip || !tip.sezon_id || !sezonActivId) return false;
    return tip.sezon_id !== sezonActivId;
}
