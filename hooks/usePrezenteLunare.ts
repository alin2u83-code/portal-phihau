import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

/**
 * Cheie stabilă sportiv-lună-an, folosită identic la construcție (în hook) și la
 * lookup (în componente): `sportivId-an-luna` (lună 1-indexată, fără padding).
 */
export function cheiePrezenta(sportivId: string, luna: number, an: number): string {
    return `${sportivId}-${an}-${luna}`;
}

/** Limită de siguranță pentru interval — evită o interogare istorică nelimitată. */
const MAX_LUNI = 36;

const PAGE_SIZE = 1000;

/**
 * Hook React Query: pentru o listă de {luna, an}, returnează un `Set<string>` cu
 * cheile `cheiePrezenta(sportivId, luna, an)` ale sportivilor care au CEL PUȚIN o
 * prezență ('prezent') în luna respectivă.
 *
 * Absența unei chei din Set = 0 prezențe pentru acel sportiv, în acea lună.
 *
 * Diferă de `usePrezenteLuna` (per-sportiv-per-lună, folosit de rândurile expandabile
 * existente PLF-01) — acest hook face **o singură interogare** pe întregul interval
 * acoperit de `luni`, indiferent de câți sportivi există în club, ca să nu producă
 * N+1 cereri când se afișează o listă întreagă de facturi.
 *
 * Sursă: `vedere_prezenta_sportiv`, scopat prin RLS pe tabelele subiacente — NU
 * filtrează explicit după `sportiv_id` printr-un filtru de tip listă (evită gotcha-ul
 * cunoscut cu filtrarea pe o listă mare de ID-uri de sportiv, care produce URL
 * supradimensionat / query care atârnă prin PostgREST,
 * întâlnit pe `vedere_istoric_grade_sportiv`).
 *
 * Paginează cu `.range()` explicit (1000 rânduri/pagină) — altfel limita implicită
 * PostgREST ar trunchia tăcut prezențele, iar sportivi cu prezență reală ar apărea
 * fals ca „0 prezențe".
 *
 * @param luni - listă de {luna (1-indexed), an}; se dedublează intern
 * @param enabled - control extern lazy-load (default true)
 */
export function usePrezenteLunare(
    luni: { luna: number; an: number }[],
    enabled = true
) {
    const luniUnice = Array.from(
        new Map(
            (luni || [])
                .filter(l => l && Number.isInteger(l.luna) && Number.isInteger(l.an))
                .map(l => [`${l.an}-${l.luna}`, l])
        ).values()
    ).sort((a, b) => (a.an - b.an) || (a.luna - b.luna));

    let cele = luniUnice;
    if (cele.length > MAX_LUNI) {
        console.warn(
            `[usePrezenteLunare] interval de ${cele.length} luni depășește limita de ${MAX_LUNI} — restrâns la ultimele ${MAX_LUNI}.`
        );
        cele = cele.slice(cele.length - MAX_LUNI);
    }

    const primaZi = cele.length > 0
        ? new Date(cele[0].an, cele[0].luna - 1, 1).toISOString().split('T')[0]
        : '';
    const ultimaZi = cele.length > 0
        ? new Date(cele[cele.length - 1].an, cele[cele.length - 1].luna, 0).toISOString().split('T')[0]
        : '';

    return useQuery<Set<string>, Error>({
        queryKey: ['prezente-lunare', primaZi, ultimaZi],
        enabled: enabled && cele.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minute — consistent cu usePrezenteLuna
        queryFn: async () => {
            if (!primaZi || !ultimaZi) return new Set<string>();

            let allRows: { sportiv_id: string; data: string; status: string }[] = [];
            let from = 0;
            while (true) {
                const { data, error } = await supabase
                    .from('vedere_prezenta_sportiv')
                    .select('sportiv_id, data, status')
                    .gte('data', primaZi)
                    .lte('data', ultimaZi)
                    .order('id', { ascending: true })
                    .range(from, from + PAGE_SIZE - 1);
                if (error) throw error;
                allRows = allRows.concat(data || []);
                if (!data || data.length < PAGE_SIZE) break;
                from += PAGE_SIZE;
            }

            const rezultat = new Set<string>();
            allRows
                .filter(row => String(row.status ?? '').toLowerCase() === 'prezent')
                .forEach(row => {
                    const dataStr = (row.data || '').toString().slice(0, 10);
                    const [anStr, lunaStr] = dataStr.split('-');
                    const an = parseInt(anStr, 10);
                    const luna = parseInt(lunaStr, 10);
                    if (row.sportiv_id && !isNaN(an) && !isNaN(luna)) {
                        rezultat.add(cheiePrezenta(row.sportiv_id, luna, an));
                    }
                });
            return rezultat;
        },
    });
}
