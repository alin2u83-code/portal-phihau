import type { Plata, Sportiv, IstoricPlataDetaliat } from '../types';
import { esteAnulata } from './paymentStatus';

/**
 * Sursa unică pentru "facturile unui sportiv/familii cu încasările lor".
 * Înlocuiește logica duplicată din UserProfile / FacturiPersonale / fostul Portofel.
 *
 * Date: `plati` (starea curentă a facturii, actualizată optimist) + `istoricPlatiDetaliat`
 * (încasat per factură din `tranzactie_plata`). NU folosi `view_plata_sportiv`.
 */

export interface Incasare {
    data_plata: string;
    suma_incasata: number;
    tranzactie_id: string | null;
}

export interface DetaliiFactura {
    plata_id: string;
    sportiv_id: string | null;
    nume_complet: string;
    club_id?: string | null;
    familie_id: string | null;
    data_emitere: string;
    descriere: string;
    /** Suma facturii așa cum e în `plati.suma` (cea folosită și la calculul soldului). */
    suma_datorata: number;
    /** Prețul inițial al facturii (`suma_initiala`, altfel `suma`) — pentru afișare; `suma` poate fi scăzută de plăți vechi. */
    suma_initiala: number;
    status: Plata['status'];
    tranzactie_id: string | null;
    data_plata: string | null;
    metoda_plata: string | null;
    suma_incasata: number | null;
}

export interface FacturaEntry {
    detalii: DetaliiFactura;
    incasari: Incasare[];
    totalIncasat: number;
    /** Rest de plată: 0 pentru facturi achitate/anulate. */
    rest: number;
}

/** Facturile care aparțin sportivului sau familiei lui (inclusiv facturile membrilor familiei). */
export function facturiAleSportivului(plati: Plata[] | null | undefined, sportiv: Pick<Sportiv, 'id' | 'familie_id'>, sportivi: Pick<Sportiv, 'id' | 'familie_id'>[] = []): Plata[] {
    const membri = sportiv.familie_id
        ? new Set(sportivi.filter(s => s.familie_id === sportiv.familie_id).map(s => s.id))
        : new Set([sportiv.id]);
    membri.add(sportiv.id);
    return (plati || []).filter(p =>
        (!!p.familie_id && p.familie_id === sportiv.familie_id) || (!!p.sportiv_id && membri.has(p.sportiv_id))
    );
}

export function construiesteFacturi(
    plati: Plata[] | null | undefined,
    istoric: IstoricPlataDetaliat[] | null | undefined,
    numeSportiv: (id: string) => string = () => ''
): FacturaEntry[] {
    const incasatPerFactura = new Map((istoric || []).map(i => [i.plata_id, i]));

    return (plati || [])
        .map(p => {
            const i = incasatPerFactura.get(p.id);
            const totalIncasat = i?.total_incasat ?? 0;
            const detalii: DetaliiFactura = {
                plata_id: p.id,
                sportiv_id: p.sportiv_id,
                nume_complet: p.sportiv_id ? numeSportiv(p.sportiv_id) : '',
                club_id: p.club_id,
                familie_id: p.familie_id,
                data_emitere: p.data,
                descriere: p.descriere,
                suma_datorata: p.suma,
                suma_initiala: p.suma_initiala ?? p.suma,
                status: p.status,
                tranzactie_id: i?.tranzactie_id ?? null,
                data_plata: i?.data_plata_string ?? null,
                metoda_plata: i?.metoda_plata ?? null,
                suma_incasata: totalIncasat || null,
            };
            const inchisa = esteAnulata(p) || p.status === 'Achitat';
            return {
                detalii,
                incasari: totalIncasat > 0
                    ? [{ data_plata: i?.data_plata_string ?? '', suma_incasata: totalIncasat, tranzactie_id: i?.tranzactie_id ?? null }]
                    : [],
                totalIncasat,
                rest: inchisa ? 0 : Math.max(0, (p.suma || 0) - totalIncasat),
            };
        })
        .sort((a, b) =>
            new Date((b.detalii.data_emitere || '').toString().slice(0, 10)).getTime() -
            new Date((a.detalii.data_emitere || '').toString().slice(0, 10)).getTime());
}

/** Total de achitat = suma resturilor (facturile anulate și achitate au rest 0). */
export function totalDeAchitat(facturi: FacturaEntry[]): number {
    return facturi.reduce((s, f) => s + f.rest, 0);
}
