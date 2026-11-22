/**
 * Calcul reducere pe sportiv (functii pure).
 * Convenție: suma_initiala = preț listă, suma = de plată după reducere (0 la 100%).
 */
export interface ReducereCalcul {
    tip: 'procent' | 'suma_fixa';
    valoare: number;
}

/** Valoarea scăzută din preț (în RON), niciodată peste preț și niciodată negativă. */
export function valoareReducere(pret: number, reducere: ReducereCalcul | null | undefined): number {
    if (!reducere || !(pret > 0) || !(reducere.valoare > 0)) return 0;
    const brut = reducere.tip === 'procent' ? pret * Math.min(reducere.valoare, 100) / 100 : reducere.valoare;
    return Math.round(Math.min(brut, pret) * 100) / 100;
}

/**
 * Reducerile membrilor (unul sau mai mulți, la abonament de familie) aplicate pe aceeași factură.
 * Valoarea totală e plafonată la ce a rămas de plătit după `dejaScazut` (ex. bonus de loialitate).
 * `reducereId` se setează doar când e exact o reducere (plati.reducere_id e un singur FK).
 */
export function reduceriFactura<R extends ReducereCalcul & { id: string; nume: string; este_activa: boolean; categorie_aplicabila: string }>(
    pretLista: number,
    dejaScazut: number,
    reduceri: Array<R | null | undefined>,
    tipFactura: string
): { valoare: number; reducereId: string | null; detalii: string } {
    const aplicate = reduceri.filter((r): r is R => reducereAplicabila(r, tipFactura));
    const valoare = Math.min(
        Math.max(pretLista - dejaScazut, 0),
        aplicate.reduce((s, r) => s + valoareReducere(pretLista, r), 0)
    );
    return {
        valoare,
        reducereId: aplicate.length === 1 ? aplicate[0].id : null,
        detalii: aplicate.map(r => r.nume).join(', '),
    };
}

/** Reducerea se aplică doar dacă e activă și categoria ei acoperă tipul facturii. */
export function reducereAplicabila(
    reducere: { este_activa: boolean; categorie_aplicabila: string } | null | undefined,
    tipFactura: string
): boolean {
    return !!reducere && reducere.este_activa
        && (reducere.categorie_aplicabila === tipFactura || reducere.categorie_aplicabila === 'Toate');
}
