import { supabase } from '../supabaseClient';
import type {
  ProdusCategorieDB,
  ProdusDB,
  ProdusVariantaDB,
  Produs,
  ProdusIntrareDB,
  ProdusIntrare,
} from '../types';

export async function fetchCategorii(): Promise<ProdusCategorieDB[]> {
  const { data, error } = await supabase
    .from('produse_categorii')
    .select('*')
    .eq('activa', true)
    .order('ordine');
  if (error) throw new Error(`fetchCategorii: ${error.message}`);
  return data ?? [];
}

export async function fetchProduse(): Promise<Produs[]> {
  const { data, error } = await supabase
    .from('produse')
    .select(`
      *,
      variante:produse_variante(*),
      categorie:produse_categorii(*)
    `)
    .eq('activ', true)
    .order('denumire');
  if (error) throw new Error(`fetchProduse: ${error.message}`);
  return (data ?? []) as Produs[];
}

export async function createProdus(
  input: Pick<ProdusDB, 'club_id' | 'categorie_id' | 'denumire' | 'descriere'>
): Promise<ProdusDB> {
  const { data, error } = await supabase
    .from('produse')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`createProdus: ${error.message}`);
  return data;
}

export async function updateProdus(
  id: string,
  input: Partial<Pick<ProdusDB, 'categorie_id' | 'denumire' | 'descriere' | 'activ'>>
): Promise<ProdusDB> {
  const { data, error } = await supabase
    .from('produse')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`updateProdus: ${error.message}`);
  return data;
}

export async function deleteProdus(id: string): Promise<void> {
  const { error } = await supabase
    .from('produse')
    .update({ activ: false })
    .eq('id', id);
  if (error) throw new Error(`deleteProdus: ${error.message}`);
}

export async function createVarianta(
  input: Pick<
    ProdusVariantaDB,
    'produs_id' | 'culoare' | 'marime' | 'pret_intrare' | 'pret_vanzare' | 'stoc_curent' | 'stoc_minim'
  >
): Promise<ProdusVariantaDB> {
  const { data, error } = await supabase
    .from('produse_variante')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`createVarianta: ${error.message}`);
  return data;
}

export async function updateVarianta(
  id: string,
  input: Partial<
    Pick<ProdusVariantaDB, 'culoare' | 'marime' | 'pret_intrare' | 'pret_vanzare' | 'stoc_minim' | 'activa'>
  >
): Promise<ProdusVariantaDB> {
  const { data, error } = await supabase
    .from('produse_variante')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`updateVarianta: ${error.message}`);
  return data;
}

export async function deleteVarianta(id: string): Promise<void> {
  const { error } = await supabase
    .from('produse_variante')
    .update({ activa: false })
    .eq('id', id);
  if (error) throw new Error(`deleteVarianta: ${error.message}`);
}

export async function fetchIntrari(): Promise<ProdusIntrare[]> {
  const { data, error } = await supabase
    .from('produse_intrari')
    .select(`
      *,
      detalii:produse_intrari_detalii(
        *,
        varianta:produse_variante(*, produs:produse(denumire))
      )
    `)
    .order('data_factura', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchIntrari: ${error.message}`);
  return (data ?? []) as ProdusIntrare[];
}

export async function createIntrareMarfa(input: {
  club_id: string;
  furnizor?: string;
  nr_factura?: string;
  data_factura: string;
  observatii?: string;
  linii: { varianta_id: string; cantitate: number; pret_intrare_snapshot: number }[];
}): Promise<ProdusIntrareDB> {
  // 1. Creează header intrare
  const { data: intrare, error: errIntrare } = await supabase
    .from('produse_intrari')
    .insert({
      club_id: input.club_id,
      furnizor: input.furnizor ?? null,
      nr_factura: input.nr_factura ?? null,
      data_factura: input.data_factura,
      observatii: input.observatii ?? null,
    })
    .select()
    .single();
  if (errIntrare) throw new Error(`createIntrareMarfa header: ${errIntrare.message}`);

  // 2. Inserează linii detalii
  const detalii = input.linii.map(l => ({
    intrare_id: intrare.id,
    varianta_id: l.varianta_id,
    cantitate: l.cantitate,
    pret_intrare_snapshot: l.pret_intrare_snapshot,
  }));
  const { error: errDetalii } = await supabase
    .from('produse_intrari_detalii')
    .insert(detalii);
  if (errDetalii) throw new Error(`createIntrareMarfa detalii: ${errDetalii.message}`);

  // 3. Actualizează stoc per variantă (read-then-write per variantă)
  await Promise.all(input.linii.map(async (l) => {
    const { data: v } = await supabase
      .from('produse_variante')
      .select('stoc_curent')
      .eq('id', l.varianta_id)
      .single();
    await supabase
      .from('produse_variante')
      .update({ stoc_curent: (v?.stoc_curent ?? 0) + l.cantitate, updated_at: new Date().toISOString() })
      .eq('id', l.varianta_id);
  }));

  return intrare;
}
