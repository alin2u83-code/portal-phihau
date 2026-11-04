import { supabase } from '../supabaseClient';
import type { Arma, Inlantuire } from '../types';

type Rez<T> = Promise<{ data: T | null; error: string | null }>;

const CHUNK = 100; // evita URL-uri uriase la .in() (bug anterior cu sute de id-uri)
const PAGINA = 1000; // limita implicita PostgREST

const msg = (e: unknown) => (e as { message?: string })?.message ?? String(e);

function chunks<T>(arr: T[], n = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Aduce toate paginile unei interogari (fabrica returneaza query nou la fiecare apel). */
async function toateRandurile<R>(
  fabrica: () => { range: (a: number, b: number) => PromiseLike<{ data: any; error: any }> },
): Promise<R[]> {
  const out: R[] = [];
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await fabrica().range(from, from + PAGINA - 1);
    if (error) throw error;
    out.push(...((data ?? []) as R[]));
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

function adauga(m: Map<string, Set<string>>, k: string, v: string) {
  if (!m.has(k)) m.set(k, new Set());
  m.get(k)!.add(v);
}

export async function incarcaArme(): Rez<Arma[]> {
  const { data, error } = await supabase.from('arme').select('*').eq('activ', true).order('ordine');
  return error ? { data: null, error: msg(error) } : { data: (data ?? []) as Arma[], error: null };
}

export async function incarcaDrepturiArme(): Rez<Map<string, Set<string>>> {
  try {
    const rows = await toateRandurile<{ grade_id: string; inlantuiri: { arma_id: string | null } | null }>(() =>
      supabase.from('inlantuiri_grade')
        .select('grade_id, inlantuiri!inlantuire_id(arma_id)')
        .eq('tip_proba', 'thao_lo_individual')
        .order('grade_id'));
    const m = new Map<string, Set<string>>();
    for (const r of rows) if (r.inlantuiri?.arma_id) adauga(m, r.grade_id, r.inlantuiri.arma_id);
    return { data: m, error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}

/** Formele CVD (thao_lo_individual) permise per grad: gradId -> forme cu arma_id, sortate dupa ordine. */
export async function incarcaFormeCvd(): Rez<Map<string, Inlantuire[]>> {
  try {
    const rows = await toateRandurile<{ grade_id: string; inlantuiri: Inlantuire | null }>(() =>
      supabase.from('inlantuiri_grade')
        .select('grade_id, inlantuiri!inlantuire_id(id, denumire, ordine, activ, arma_id)')
        .eq('tip_proba', 'thao_lo_individual')
        .order('grade_id').order('inlantuire_id'));
    const m = new Map<string, Inlantuire[]>();
    for (const r of rows) {
      if (!r.inlantuiri?.arma_id || r.inlantuiri.activ === false) continue;
      if (!m.has(r.grade_id)) m.set(r.grade_id, []);
      m.get(r.grade_id)!.push(r.inlantuiri);
    }
    for (const l of m.values()) l.sort((a, b) => a.ordine - b.ordine);
    return { data: m, error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}

export async function incarcaArmeSportivi(
  competitieId: string, sportivIds: string[],
): Rez<{ implicit: Map<string, Set<string>>; competitie: Map<string, Set<string>> }> {
  try {
    const implicit = new Map<string, Set<string>>();
    const competitie = new Map<string, Set<string>>();
    for (const ids of chunks(sportivIds)) {
      const [imp, comp] = await Promise.all([
        toateRandurile<{ sportiv_id: string; arma_id: string }>(() =>
          supabase.from('sportiv_arme').select('sportiv_id, arma_id').in('sportiv_id', ids).order('sportiv_id').order('arma_id')),
        toateRandurile<{ sportiv_id: string; arma_id: string }>(() =>
          supabase.from('competitie_sportiv_arme').select('sportiv_id, arma_id')
            .eq('competitie_id', competitieId).in('sportiv_id', ids).order('sportiv_id').order('arma_id')),
      ]);
      imp.forEach(r => adauga(implicit, r.sportiv_id, r.arma_id));
      comp.forEach(r => adauga(competitie, r.sportiv_id, r.arma_id));
    }
    return { data: { implicit, competitie }, error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}

/** Inlocuieste setul fara a sterge inainte: adauga noile randuri, apoi sterge doar ce a fost scos. */
async function inlocuiesteSet(
  tabel: 'competitie_sportiv_arme' | 'sportiv_arme',
  scope: Record<string, string>, armaIds: string[], onConflict: string,
): Promise<string | null> {
  if (armaIds.length) {
    const { error } = await supabase.from(tabel)
      .upsert(armaIds.map(arma_id => ({ ...scope, arma_id })), { onConflict, ignoreDuplicates: true });
    if (error) return msg(error);
  }
  let q = supabase.from(tabel).delete();
  for (const [k, v] of Object.entries(scope)) q = q.eq(k, v);
  if (armaIds.length) q = q.not('arma_id', 'in', `(${armaIds.join(',')})`);
  const { error } = await q;
  return error ? msg(error) : null;
}

export async function salveazaArmeCompetitie(
  competitieId: string, sportivId: string, armaIds: string[], salveazaImplicit: boolean,
): Rez<null> {
  try {
    const unice = [...new Set(armaIds)];
    const e1 = await inlocuiesteSet('competitie_sportiv_arme',
      { competitie_id: competitieId, sportiv_id: sportivId }, unice, 'competitie_id,sportiv_id,arma_id');
    if (e1) return { data: null, error: `Armele pe competitie nu au fost salvate complet: ${e1}` };
    if (salveazaImplicit) {
      const e2 = await inlocuiesteSet('sportiv_arme', { sportiv_id: sportivId }, unice, 'sportiv_id,arma_id');
      if (e2) return { data: null, error: `Armele pe competitie AU FOST salvate, dar setul implicit al sportivului nu: ${e2}` };
    }
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}

export async function incarcaStagiiLaArma(sportivIds: string[]): Rez<Map<string, Map<string, number>>> {
  try {
    const m = new Map<string, Map<string, number>>();
    for (const ids of chunks(sportivIds)) {
      const rows = await toateRandurile<{ sportiv_id: string; arma: string | null }>(() =>
        supabase.from('stagii_cvd_participare').select('sportiv_id, arma').in('sportiv_id', ids).order('sportiv_id').order('data'));
      for (const r of rows) {
        if (!r.arma) continue;
        const k = r.arma.trim().toLowerCase();
        if (!m.has(r.sportiv_id)) m.set(r.sportiv_id, new Map());
        const im = m.get(r.sportiv_id)!;
        im.set(k, (im.get(k) ?? 0) + 1);
      }
    }
    return { data: m, error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}

export interface CerintaStagii { grad_min_ordine: number; grad_max_ordine: number; stagii_nationale: number }

export async function incarcaCerinteStagii(): Rez<CerintaStagii[]> {
  try {
    const { data, error } = await supabase.from('cerinte_stagii_cvd').select('grad_min_ordine, grad_max_ordine, stagii_nationale');
    if (error) return { data: null, error: msg(error) };
    return { data: (data ?? []) as CerintaStagii[], error: null };
  } catch (e) {
    return { data: null, error: msg(e) };
  }
}
