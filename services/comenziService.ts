import { supabase } from '../supabaseClient';
import type { CerereProdusBD, CerereProdusFull } from '../types';
import { sendBulkNotifications } from '../utils/notifications';

/**
 * Fetch toate cererile de produse ale unui club (pentru admin/instructor).
 * Include join la varianta → produs și sportiv (pentru afișare în managementul comenzilor).
 */
export async function fetchCereriClub(clubId: string): Promise<CerereProdusFull[]> {
  const { data, error } = await supabase
    .from('cereri_produse')
    .select(`
      *,
      varianta:produse_variante(*, produs:produse(denumire, tip_produs)),
      sportiv:sportivi(nume_complet, user_id)
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchCereriClub: ${error.message}`);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    sportiv_nume: row.sportiv?.nume_complet ?? null,
  })) as CerereProdusFull[];
}

/**
 * Fetch cererile de produse ale unui sportiv specific (pentru dashboard sportiv).
 * Include join la varianta → produs pentru afișarea denumirii și tipului.
 */
export async function fetchCereriSportiv(sportivId: string): Promise<CerereProdusFull[]> {
  const { data, error } = await supabase
    .from('cereri_produse')
    .select(`
      *,
      varianta:produse_variante(*, produs:produse(denumire, tip_produs))
    `)
    .eq('sportiv_id', sportivId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchCereriSportiv: ${error.message}`);
  return (data ?? []) as CerereProdusFull[];
}

/**
 * Plasează o cerere de produs și notifică adminii clubului.
 * Pitfall T-13-06: adminClubUserIds este filtrat pe club_id exact al cererii.
 * Pitfall T-13-07: null/undefined filtrați din adminClubUserIds înainte de notificare.
 */
export async function createCerere(input: {
  club_id: string;
  sportiv_id: string;
  varianta_id: string;
  cantitate: number;
  observatii?: string;
  adminClubUserIds: string[];
}): Promise<CerereProdusBD> {
  const { data, error } = await supabase
    .from('cereri_produse')
    .insert({
      club_id: input.club_id,
      sportiv_id: input.sportiv_id,
      varianta_id: input.varianta_id,
      cantitate: input.cantitate,
      stare_cerere: 'SOLICITATA',
      observatii: input.observatii ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`createCerere: ${error.message}`);

  // Notifică adminii clubului (T-13-06: filtrăm pe adminii clubului corect)
  // T-13-07: eliminăm null/undefined din lista de admini
  const validAdminIds = (input.adminClubUserIds ?? []).filter(
    (id): id is string => typeof id === 'string' && id.length > 0
  );

  if (validAdminIds.length > 0) {
    const payloads = validAdminIds.map((userId) => ({
      recipient_user_id: userId,
      title: 'Cerere echipament nouă',
      body: `Un sportiv a solicitat un produs din catalogul clubului.`,
      sender_sportiv_id: input.sportiv_id,
    }));
    // Silent — nu blocăm fluxul dacă notificarea eșuează
    await sendBulkNotifications(payloads).catch((err) =>
      console.error('createCerere: notificare admin eșuată:', err)
    );
  }

  return data as CerereProdusBD;
}

/**
 * Returnează user_id-urile adminilor unui club.
 * Folosit pentru a determina destinatarii notificărilor la plasarea unei cereri (T-13-06).
 */
export async function fetchAdminClubUserIds(clubId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('utilizator_roluri_multicont')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('rol_denumire', 'ADMIN_CLUB');
  if (error) throw new Error(`fetchAdminClubUserIds: ${error.message}`);
  return ((data ?? []) as { user_id: string }[])
    .map((r) => r.user_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}
