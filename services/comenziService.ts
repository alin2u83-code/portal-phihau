import { supabase } from '../supabaseClient';
import type {
  CerereProdusBD,
  CerereProdusFull,
  ComandaProduseBD,
  ComandaProduseiFull,
  StareCerereProdusTip,
  TipComandaProdusTip,
} from '../types';
import { sendNotification, sendBulkNotifications } from '../utils/notifications';

// ===================================================
// Fluxuri Federație (Plan 13-04): Flux B (top-down) + Flux C (bottom-up)
// ===================================================

/**
 * Creează o comandă federație (Flux B: federatie_club) sau o cerere de la club (Flux C: club_federatie).
 * - INSERT comenzi_produse (cu club_id = primul destinatar pentru federatie_club sau clubul sursă pentru club_federatie)
 * - INSERT comenzi_produse_iteme pentru fiecare item
 * - INSERT comenzi_produse_cluburi pentru fiecare destinatar (per CMD-04)
 * - Notifică adminii fiecărui club destinatar (per CMD-04 — club primește notificare)
 * Guard Pitfall 2: adminClubUserIdsPerClub filtrat — null/undefined eliminați.
 */
export async function creareComandaFederatie(input: {
  tip_comanda: 'federatie_club' | 'club_federatie';
  furnizor?: string;
  observatii?: string;
  iteme: { varianta_id: string; cantitate: number }[];
  destinatari: { club_id: string; cantitate: number }[];
  adminClubUserIdsPerClub: Record<string, string[]>;
}): Promise<ComandaProduseBD> {
  // club_id pentru header comandă:
  // - federatie_club: folosim primul destinatar (federația trimite la cluburi)
  // - club_federatie: clubul sursă e în destinatari[0] (clubul cere federației)
  const headerClubId = input.destinatari[0]?.club_id ?? null;

  const { data: comanda, error: errComanda } = await supabase
    .from('comenzi_produse')
    .insert({
      club_id: headerClubId,
      tip_comanda: input.tip_comanda,
      stare: 'DESCHISA',
      furnizor: input.furnizor ?? null,
      observatii: input.observatii ?? null,
    })
    .select()
    .single();
  if (errComanda) throw new Error(`creareComandaFederatie: ${errComanda.message}`);

  // INSERT iteme comandă
  if (input.iteme.length > 0) {
    const itemeRows = input.iteme.map(item => ({
      comanda_id: comanda.id,
      varianta_id: item.varianta_id,
      cantitate: item.cantitate,
    }));
    const { error: errIteme } = await supabase
      .from('comenzi_produse_iteme')
      .insert(itemeRows);
    if (errIteme) throw new Error(`creareComandaFederatie iteme: ${errIteme.message}`);
  }

  // INSERT destinatari per club (CMD-04 — comenzi_produse_cluburi)
  if (input.destinatari.length > 0) {
    const destinatariRows = input.destinatari.map(d => ({
      comanda_id: comanda.id,
      club_id: d.club_id,
      cantitate: d.cantitate,
      confirmat: false,
    }));
    const { error: errDest } = await supabase
      .from('comenzi_produse_cluburi')
      .insert(destinatariRows);
    if (errDest) throw new Error(`creareComandaFederatie destinatari: ${errDest.message}`);
  }

  // Notifică adminii fiecărui club destinatar (CMD-04 — per Pitfall 2: guard null/undefined)
  for (const dest of input.destinatari) {
    const adminIds = (input.adminClubUserIdsPerClub[dest.club_id] ?? []).filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
    if (adminIds.length > 0) {
      const payloads = adminIds.map(userId => ({
        recipient_user_id: userId,
        title: 'Comandă nouă de la federație',
        body: `Federația a plasat o comandă pentru clubul tău. Verifică tab-ul Comenzi.`,
      }));
      await sendBulkNotifications(payloads).catch(err =>
        console.error('creareComandaFederatie: notificare admin eșuată:', err)
      );
    }
  }

  return comanda as ComandaProduseBD;
}

/**
 * Fetch toate comenzile de tip federatie_club și club_federatie.
 * Disponibil doar pentru SUPER_ADMIN_FEDERATIE (RLS via is_super_admin()).
 */
export async function fetchComenziFederatie(): Promise<ComandaProduseiFull[]> {
  const { data, error } = await supabase
    .from('comenzi_produse')
    .select(`
      *,
      cereri:cereri_produse(
        *,
        varianta:produse_variante(*, produs:produse(denumire, tip_produs)),
        sportiv:sportivi(nume, prenume, user_id)
      ),
      iteme:comenzi_produse_iteme(
        *,
        varianta:produse_variante(*, produs:produse(denumire))
      ),
      cluburi:comenzi_produse_cluburi(*)
    `)
    .in('tip_comanda', ['federatie_club', 'club_federatie'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchComenziFederatie: ${error.message}`);

  return ((data ?? []) as any[]).map(row => ({
    ...row,
    cereri: ((row.cereri ?? []) as any[]).map((c: any) => ({
      ...c,
      sportiv_nume: c.sportiv ? `${c.sportiv.nume} ${c.sportiv.prenume}`.trim() : null,
    })),
    iteme: row.iteme ?? [],
    cluburi: row.cluburi ?? [],
  })) as ComandaProduseiFull[];
}

/**
 * Confirmă recepția unui lot per club (CMD-04/CMD-05).
 * Setează confirmat=true, confirmat_at=now() pentru intrarea din comenzi_produse_cluburi.
 * RLS: club_id = get_active_club_id() — clubul confirmă doar propriile recepții (T-13-13).
 */
export async function confirmaReceptieClub(comandaClubId: string): Promise<void> {
  const { error } = await supabase
    .from('comenzi_produse_cluburi')
    .update({
      confirmat: true,
      confirmat_at: new Date().toISOString(),
    })
    .eq('id', comandaClubId);
  if (error) throw new Error(`confirmaReceptieClub: ${error.message}`);
}

/**
 * Distribuie un lot primit de la federație la sportivii clubului (CMD-05).
 * Pentru produse per_sportiv: INSERT cereri_produse per sportiv cu stare SOSITA.
 * Notifică fiecare sportiv (guard Pitfall 2: sportiv_user_id non-null).
 */
export async function distribuieLaSportivi(input: {
  comanda_id: string;
  club_id: string;
  alocari: {
    sportiv_id: string;
    varianta_id: string;
    cantitate: number;
    sportiv_user_id?: string | null;
  }[];
}): Promise<void> {
  if (input.alocari.length === 0) return;

  const cereriRows = input.alocari.map(a => ({
    club_id: input.club_id,
    sportiv_id: a.sportiv_id,
    comanda_id: input.comanda_id,
    varianta_id: a.varianta_id,
    cantitate: a.cantitate,
    stare_cerere: 'SOSITA' as const,
  }));

  const { error } = await supabase
    .from('cereri_produse')
    .insert(cereriRows);
  if (error) throw new Error(`distribuieLaSportivi: ${error.message}`);

  // Notifică sportivii (guard Pitfall 2: user_id non-null)
  for (const a of input.alocari) {
    if (a.sportiv_user_id) {
      await sendNotification({
        recipient_user_id: a.sportiv_user_id,
        title: 'Echipamentul a sosit!',
        body: 'Echipamentul tău a sosit la club. Poți veni să îl ridici.',
      }).catch(err =>
        console.error('distribuieLaSportivi: notificare sportiv eșuată:', err)
      );
    }
  }
}

/**
 * Fetch comenzile de tip club_federatie (cereri de la cluburi) pentru agreagare de SUPER_ADMIN.
 * Flux C: SUPER_ADMIN vede cererile cluburilor și le poate agrega într-o comandă centrală.
 */
export async function fetchCereriCluburiPtFederatie(): Promise<ComandaProduseiFull[]> {
  const { data, error } = await supabase
    .from('comenzi_produse')
    .select(`
      *,
      cereri:cereri_produse(
        *,
        varianta:produse_variante(*, produs:produse(denumire, tip_produs)),
        sportiv:sportivi(nume, prenume, user_id)
      ),
      iteme:comenzi_produse_iteme(
        *,
        varianta:produse_variante(*, produs:produse(denumire))
      ),
      cluburi:comenzi_produse_cluburi(*)
    `)
    .eq('tip_comanda', 'club_federatie')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchCereriCluburiPtFederatie: ${error.message}`);

  return ((data ?? []) as any[]).map(row => ({
    ...row,
    cereri: ((row.cereri ?? []) as any[]).map((c: any) => ({
      ...c,
      sportiv_nume: c.sportiv ? `${c.sportiv.nume} ${c.sportiv.prenume}`.trim() : null,
    })),
    iteme: row.iteme ?? [],
    cluburi: row.cluburi ?? [],
  })) as ComandaProduseiFull[];
}

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
      sportiv:sportivi(nume, prenume, user_id)
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchCereriClub: ${error.message}`);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    sportiv_nume: row.sportiv ? `${row.sportiv.nume} ${row.sportiv.prenume}`.trim() : null,
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

/**
 * Fetch toate comenzile unui club cu cereri nested + iteme aggregate.
 * Pitfall 6: un singur query nested, agregare cantități client-side.
 */
export async function fetchComenziClub(clubId: string): Promise<ComandaProduseiFull[]> {
  const { data, error } = await supabase
    .from('comenzi_produse')
    .select(`
      *,
      cereri:cereri_produse(
        *,
        varianta:produse_variante(*, produs:produse(denumire, tip_produs)),
        sportiv:sportivi(nume, prenume, user_id)
      ),
      iteme:comenzi_produse_iteme(
        *,
        varianta:produse_variante(*, produs:produse(denumire))
      )
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`fetchComenziClub: ${error.message}`);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    cereri: ((row.cereri ?? []) as any[]).map((c: any) => ({
      ...c,
      sportiv_nume: c.sportiv ? `${c.sportiv.nume} ${c.sportiv.prenume}`.trim() : null,
    })),
    iteme: row.iteme ?? [],
  })) as ComandaProduseiFull[];
}

/**
 * Helper intern: găsește comanda activă de tipul dat sau creează una nouă.
 * RESEARCH.md Open Question 2 REZOLVAT: nu se creează duplicate de același tip.
 */
async function gasesteSauCreeazaComandaActiva(
  clubId: string,
  tip_comanda: TipComandaProdusTip
): Promise<ComandaProduseBD> {
  // Caută comandă activă de același tip (DESCHISA sau PLASATA)
  const { data: existing, error: errFind } = await supabase
    .from('comenzi_produse')
    .select('*')
    .eq('club_id', clubId)
    .eq('tip_comanda', tip_comanda)
    .not('stare', 'in', '("FINALIZATA","ANULATA")')
    .order('created_at', { ascending: false })
    .limit(1);
  if (errFind) throw new Error(`gasesteSauCreeazaComandaActiva find: ${errFind.message}`);

  if (existing && existing.length > 0) {
    return existing[0] as ComandaProduseBD;
  }

  // Creează comandă nouă
  const { data: created, error: errCreate } = await supabase
    .from('comenzi_produse')
    .insert({
      club_id: clubId,
      tip_comanda,
      stare: 'DESCHISA',
    })
    .select()
    .single();
  if (errCreate) throw new Error(`gasesteSauCreeazaComandaActiva create: ${errCreate.message}`);
  return created as ComandaProduseBD;
}

/**
 * Grupează cererile date într-o comandă activă de tip club_furnizor.
 * Guard duplicat (RESEARCH.md Open Question 2): refolosește comanda activă existentă.
 * Validare: nu adaugă cereri dacă starea comenzii > PLASATA.
 */
export async function grupeazaInComanda(
  clubId: string,
  cerereIds: string[],
  tip_comanda: TipComandaProdusTip = 'club_furnizor'
): Promise<ComandaProduseBD> {
  const comanda = await gasesteSauCreeazaComandaActiva(clubId, tip_comanda);

  // Validare: nu adăuga cereri la o comandă mai avansată de PLASATA
  if (comanda.stare !== 'DESCHISA' && comanda.stare !== 'PLASATA') {
    throw new Error(`grupeazaInComanda: comanda este în starea ${comanda.stare}, nu se mai pot adăuga cereri.`);
  }

  // UPDATE cereri → atribuie comanda_id
  const { error: errUpdate } = await supabase
    .from('cereri_produse')
    .update({ comanda_id: comanda.id, updated_at: new Date().toISOString() })
    .in('id', cerereIds);
  if (errUpdate) throw new Error(`grupeazaInComanda update: ${errUpdate.message}`);

  return comanda;
}

/**
 * Marchează o cerere pentru batch-ul următor (amânare).
 */
export async function marcheazaBatchUrmatoarea(
  cerereId: string,
  valoare: boolean
): Promise<void> {
  const { error } = await supabase
    .from('cereri_produse')
    .update({ batch_urmatoarea: valoare, updated_at: new Date().toISOString() })
    .eq('id', cerereId);
  if (error) throw new Error(`marcheazaBatchUrmatoarea: ${error.message}`);
}

/**
 * Avansează starea unei cereri de produs.
 * - La CONFIRMATA: notifică sportivul "Comanda ta a fost confirmată"
 * - La SOSITA: notifică sportivul "Echipamentul a sosit!"
 * - Guard T-13-09: nu permite PREDATA dacă stare curentă != SOSITA
 * - Guard Pitfall 2: notifică doar dacă sportiv_user_id non-null
 */
export async function marcheazaStareCerere(
  cerereId: string,
  stareNoua: StareCerereProdusTip,
  opts?: { sportiv_user_id?: string | null }
): Promise<void> {
  // Validare ordine stări — T-13-09
  if (stareNoua === 'PREDATA') {
    const { data: cerere, error: errCheck } = await supabase
      .from('cereri_produse')
      .select('stare_cerere')
      .eq('id', cerereId)
      .single();
    if (errCheck) throw new Error(`marcheazaStareCerere verificare: ${errCheck.message}`);
    if (cerere?.stare_cerere !== 'SOSITA') {
      throw new Error(`marcheazaStareCerere: predarea necesită stare SOSITA, stare curentă: ${cerere?.stare_cerere}`);
    }
  }

  const { error } = await supabase
    .from('cereri_produse')
    .update({ stare_cerere: stareNoua, updated_at: new Date().toISOString() })
    .eq('id', cerereId);
  if (error) throw new Error(`marcheazaStareCerere: ${error.message}`);

  // Notificări per CMD-06 (guard Pitfall 2: user_id non-null)
  const userId = opts?.sportiv_user_id;
  if (userId) {
    if (stareNoua === 'CONFIRMATA') {
      await sendNotification({
        recipient_user_id: userId,
        title: 'Comanda confirmată',
        body: 'Comanda ta de echipament a fost confirmată de club.',
      }).catch((err) => console.error('marcheazaStareCerere: notificare CONFIRMATA eșuată:', err));
    } else if (stareNoua === 'SOSITA') {
      await sendNotification({
        recipient_user_id: userId,
        title: 'Echipamentul a sosit!',
        body: 'Echipamentul tău a sosit la club. Poți veni să îl ridici.',
      }).catch((err) => console.error('marcheazaStareCerere: notificare SOSITA eșuată:', err));
    }
  }
}

/**
 * Marchează predarea unui echipament:
 * 1. Validează stare = SOSITA (T-13-08)
 * 2. INSERT plati status Neachitat (factură automată)
 * 3. Dacă tip_produs === 'per_sportiv': scade stocul variantei (T-13-17)
 * 4. UPDATE cerere → PREDATA + plata_id
 * 5. Notifică sportivul (guard user_id)
 */
export async function marcheazaPredare(
  cerereId: string,
  input: {
    sportiv_id: string;
    club_id: string;
    varianta_id: string;
    tip_plata_id: string;
    suma: number;
    cantitate: number;
    tip_produs: string | null | undefined;
    denumire_varianta: string;
    sportiv_user_id: string | null | undefined;
  }
): Promise<void> {
  if (!input.tip_plata_id) {
    throw new Error('marcheazaPredare: Tip plată Echipamente lipsește. Configurează tipul de plată în Config → Tipuri Plăți.');
  }

  // 1. Validare stare SOSITA (T-13-08)
  const { data: cerere, error: errCheck } = await supabase
    .from('cereri_produse')
    .select('stare_cerere')
    .eq('id', cerereId)
    .single();
  if (errCheck) throw new Error(`marcheazaPredare verificare: ${errCheck.message}`);
  if (cerere?.stare_cerere !== 'SOSITA') {
    throw new Error(`marcheazaPredare: predarea necesită stare SOSITA, stare curentă: ${cerere?.stare_cerere}`);
  }

  // 2. INSERT în plati (identic cu createVanzare din produseService.ts)
  const { data: plata, error: errPlata } = await supabase
    .from('plati')
    .insert({
      sportiv_id: input.sportiv_id,
      club_id: input.club_id,
      tip_plata_id: input.tip_plata_id,
      suma: input.suma,
      status: 'Neachitat',
      data: new Date().toISOString().slice(0, 10),
      descriere: `Echipament: ${input.denumire_varianta}`,
    })
    .select('id')
    .single();
  if (errPlata) throw new Error(`marcheazaPredare plata: ${errPlata.message}`);

  // 3. Scade stoc DOAR pentru per_sportiv (T-13-17 — per_club gestionat prin IntrareMarfa)
  if (input.tip_produs === 'per_sportiv') {
    const { data: varianta } = await supabase
      .from('produse_variante')
      .select('stoc_curent')
      .eq('id', input.varianta_id)
      .single();
    await supabase
      .from('produse_variante')
      .update({
        stoc_curent: Math.max(0, (varianta?.stoc_curent ?? 0) - input.cantitate),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.varianta_id);
  }

  // 4. UPDATE cerere → PREDATA + plata_id
  const { error: errUpdate } = await supabase
    .from('cereri_produse')
    .update({
      stare_cerere: 'PREDATA',
      plata_id: plata.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cerereId);
  if (errUpdate) throw new Error(`marcheazaPredare update cerere: ${errUpdate.message}`);

  // 5. Notifică sportivul (guard Pitfall 2: user_id non-null)
  if (input.sportiv_user_id) {
    await sendNotification({
      recipient_user_id: input.sportiv_user_id,
      title: 'Echipament predat!',
      body: `${input.denumire_varianta} a fost predat. Plată de ${input.suma.toFixed(2)} RON înregistrată.`,
    }).catch((err) => console.error('marcheazaPredare: notificare eșuată:', err));
  }
}

/**
 * Marchează o cerere ca PLATITA (după confirmarea plății).
 */
export async function marcheazaPlatita(cerereId: string): Promise<void> {
  const { error } = await supabase
    .from('cereri_produse')
    .update({ stare_cerere: 'PLATITA', updated_at: new Date().toISOString() })
    .eq('id', cerereId);
  if (error) throw new Error(`marcheazaPlatita: ${error.message}`);
}

/**
 * Trimite notificare reminder de plată sportivului.
 * Guard Pitfall 2: sportiv_user_id trebuie să fie non-null.
 */
export async function trimiteReminderPlata(
  cerereId: string,
  sportiv_user_id: string | null | undefined
): Promise<void> {
  if (!sportiv_user_id) {
    throw new Error('trimiteReminderPlata: sportiv_user_id lipsește — sportivul nu are cont de utilizator.');
  }
  await sendNotification({
    recipient_user_id: sportiv_user_id,
    title: 'Plată restantă — echipament',
    body: 'Ai o plată restantă pentru echipament. Te rugăm să achitezi suma datorată.',
  });
}
