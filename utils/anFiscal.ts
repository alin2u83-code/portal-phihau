import type { TipTaxaFederala } from '../types';

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

/**
 * Perioada taxei federale (Faza 33): FRQKD = sezon fiscal (granita 1 septembrie),
 * FRAM = an calendaristic. Oglindeste public.perioada_taxa din
 * supabase/migrations/20261005b_taxe_anuale_frqkd_fram_schema_activare.sql —
 * cele doua implementari trebuie modificate impreuna.
 */
export function getPerioadaTaxa(tip: TipTaxaFederala, d: Date = new Date()): number {
    return tip === 'FRAM' ? d.getFullYear() : getAnFiscalFederatie(d);
}

/** FRQKD -> '2026-2027' (sezon), FRAM -> '2026' (an). */
export function formatPerioadaTaxa(tip: TipTaxaFederala, an: number): string {
    return tip === 'FRAM' ? String(an) : formatSezon(an);
}
