/**
 * Anul fiscal al federatiei (D-01): granita fixa 1 septembrie, independent de tabela "sezoane".
 * Oglindeste public.an_fiscal_federatie(date) din sql/migrations/taxa_anuala_federatie_trigger_260912.sql —
 * cele doua implementari trebuie modificate impreuna.
 */
export function getAnFiscalFederatie(d: Date = new Date()): number {
    return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

export function formatSezon(anFiscal: number): string {
    return `${anFiscal}-${anFiscal + 1}`;
}
