import { supabase } from '../supabaseClient';
import type { NewsfeedItem, AnuntFederatie } from '../types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export async function fetchUpcomingExamene(clubId: string): Promise<{ data: NewsfeedItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('sesiuni_examene')
    .select('id, data, nume, status, club_id')
    .eq('club_id', clubId)
    .gte('data', todayISO())
    .neq('status', 'Finalizat')
    .order('data', { ascending: true });

  if (error) return { data: [], error };
  const items: NewsfeedItem[] = (data || []).map(row => ({
    id: row.id,
    tip: 'examen',
    titlu: `Sesiune examen ${row.nume}`,
    data: row.data,
    view: 'examene',
  }));
  return { data: items, error: null };
}

// Interogare directă (nu useData().filteredData.evenimente) — fetch-ul central e strict club-scoped și ar pierde stagiile cu vizibilitate_globala=true.
export async function fetchUpcomingStagii(clubId: string): Promise<{ data: NewsfeedItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('evenimente')
    .select('id, denumire, data, club_id, vizibilitate_globala, tip')
    .eq('tip', 'Stagiu')
    .gte('data', todayISO())
    .or(`club_id.eq.${clubId},vizibilitate_globala.eq.true`)
    .order('data', { ascending: true });

  if (error) return { data: [], error };
  const items: NewsfeedItem[] = (data || []).map(row => ({
    id: row.id,
    tip: 'stagiu',
    titlu: row.denumire,
    data: row.data,
    view: 'activitati-nationale',
  }));
  return { data: items, error: null };
}

export async function fetchUpcomingCompetitii(): Promise<{ data: NewsfeedItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('competitii')
    .select('id, denumire, data_inceput, status')
    .gte('data_inceput', todayISO())
    .in('status', ['draft', 'inscrieri_deschise', 'inscrieri_inchise'])
    .order('data_inceput', { ascending: true });

  if (error) return { data: [], error };
  const items: NewsfeedItem[] = (data || []).map(row => ({
    id: row.id,
    tip: 'competitie',
    titlu: row.denumire,
    data: row.data_inceput,
    view: 'competitii',
  }));
  return { data: items, error: null };
}

export async function fetchAnunturiActive(): Promise<{ data: AnuntFederatie[]; error: Error | null }> {
  const nowISO = new Date().toISOString();
  const { data, error } = await supabase
    .from('anunturi_federatie')
    .select('*')
    .or(`expira_la.is.null,expira_la.gte.${nowISO}`)
    .order('created_at', { ascending: false });

  if (error) return { data: [], error };
  return { data: (data || []) as AnuntFederatie[], error: null };
}
