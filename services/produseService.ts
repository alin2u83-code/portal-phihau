import { supabase } from '../supabaseClient';
import type {
  ProdusCategorieDB,
  ProdusDB,
  ProdusVariantaDB,
  Produs,
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
