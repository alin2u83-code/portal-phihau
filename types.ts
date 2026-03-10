// --- Domain: User & Auth ---
export interface Rol {
  id: string;
  nume: 'SPORTIV' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN_FEDERATIE' | 'ADMIN_CLUB';
}

export interface User {
  id: string;
  user_id?: string;
  nume: string;
  prenume: string;
  email: string | null;
  username?: string;
  roluri: Rol[];
  club_id?: string | null;
  // Make User compatible with Sportiv by adding missing properties or making it a union
  grupa_id?: string | null;
  participa_vacanta?: boolean;
  familie_id?: string | null;
  grad_actual_id?: string | null;
  grad_actual?: string | null;
  data_nasterii?: string;
  data_inscrierii?: string;
  status?: 'Activ' | 'Inactiv';
  cluburi?: Club | null;
  foto_url?: string | null;
  rol?: string;
  cnp?: string | null;
  tip_abonament_id?: string | null;
  trebuie_schimbata_parola?: boolean; // Added
}

export type Examen = SesiuneExamen;

export interface SportivProgramPersonalizat {
    sportiv_id: string;
    orar_id: string;
    este_activ: boolean;
}

// --- Domain: Club & Organization ---
export interface Club {
  id: string;
  nume: string;
  cif?: string | null;
  oras?: string | null;
  federatie_id?: string | null;
  theme_config?: Record<string, string> | null;
}

export interface ClubStats {
  id: string;
  nume: string;
  totalSportivi: number;
  totalGrupe: number;
  soldFinanciar: number;
}

export interface Locatie {
  id: string;
  nume: string;
  adresa?: string | null;
  club_id?: string | null;
}

// --- Domain: Sportivi ---
export interface Sportiv {
  id: string;
  user_id?: string;
  nume: string;
  prenume: string;
  email: string | null;
  username?: string;
  parola?: string;
  roluri: Rol[];
  data_nasterii: string;
  cnp: string | null;
  inaltime?: number;
  data_inscrierii: string;
  status: 'Activ' | 'Inactiv';
  grupa_id?: string | null;
  club_id?: string | null;
  cluburi?: Club | null;
  grad_actual_id?: string | null;
  grad_actual?: string | null;
  familie_id: string | null;
  tip_abonament_id: string | null;
  participa_vacanta: boolean;
  puncte_forte?: string | null;
  puncte_slabe?: string | null;
  obiective?: string | null;
  trebuie_schimbata_parola?: boolean;
  telefon?: string | null;
  adresa?: string | null;
  gen?: 'Masculin' | 'Feminin' | null;
  foto_url?: string | null;
  cod_sportiv?: string | null;
  club_provenienta?: string | null;
  status_aprobare?: 'asteptare' | 'aprobat' | 'respins' | null;
  propunere_modificare?: {
    nume?: string;
    prenume?: string;
    [key: string]: any;
  } | null;
}

export interface SportivDetaliu {
  id: string;
  nume_complet: string;
  telefon: string | null;
  status: 'Activ' | 'Inactiv';
  club_id: string;
  club_nume: string;
  grupa_id: string | null;
  grupa_denumire: string | null;
  grad_actual: string | null;
  ultima_prezenta: string | null;
  total_prezente: number;
}

export interface Familie {
  id: string;
  nume: string;
  tip_abonament_id?: string | null;
  club_id?: string | null;
  reprezentant_id?: string | null;
}

// --- Domain: Financiar ---
export interface Tranzactie {
  id: string;
  plata_ids: string[];
  sportiv_id: string | null;
  familie_id: string | null;
  suma: number;
  data_platii: string;
  metoda_plata: 'Cash' | 'Transfer Bancar';
}

export interface Plata {
  id: string;
  sportiv_id: string | null;
  familie_id: string | null;
  suma_initiala?: number | null;
  reducere_id?: string | null;
  reducere_detalii?: string | null;
  suma: number;
  data: string;
  status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
  descriere: string;
  tip: string;
  observatii: string;
}

export interface VizualizarePlata {
  plata_id: string;
  sportiv_id: string;
  nume_complet: string;
  club_id: string;
  familie_id?: string | null;
  data_emitere: string;
  descriere: string;
  suma_datorata: number;
  status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
  tranzactie_id?: string | null;
  data_plata: string | null;
  suma_incasata: number | null;
}

export interface IstoricPlataDetaliat {
  plata_id: string;
  sportiv_id: string | null;
  familie_id: string | null;
  nume_complet: string;
  descriere: string;
  suma_datorata: number;
  status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
  data_emitere: string;
  total_incasat: number;
  rest_de_plata: number;
  tranzactie_id: string | null;
  data_plata: string | null;
  suma_incasata: number | null;
  metoda_plata: 'Cash' | 'Transfer Bancar' | null;
}

export interface PretConfig {
  id: string;
  categorie: 'Taxa Examen' | 'Taxa Stagiu' | 'Taxa Competitie' | 'Echipament';
  denumire_serviciu: string;
  suma: number;
  valabil_de_la_data: string;
  specificatii?: {
    inaltimeMin?: number;
    inaltimeMax?: number;
    marime?: 'S' | 'M' | 'L' | 'XL';
    tipEventiment?: 'Local' | 'National';
  };
}

export interface Reducere {
  id: string;
  nume: string;
  tip: 'procent' | 'suma_fixa';
  valoare: number;
  este_activa: boolean;
  categorie_aplicabila: 'Abonament' | 'Echipament' | 'Toate';
}

export interface TipPlata {
  id: string;
  nume: string;
  is_system_type: boolean;
}

// --- Domain: Examene & Grade ---
export interface Grad {
  id: string;
  nume: string;
  ordine: number;
  varsta_minima: number;
  timp_asteptare: string;
  grad_start_id: string | null;
}

export interface SesiuneExamen {
  id: string;
  data: string;
  locatie_id: string;
  localitate?: string;
  comisia: string[];
  club_id?: string | null;
  status?: 'Programat' | 'Finalizat';
}

export interface InscriereExamen {
  id: string;
  sportiv_id: string;
  sesiune_id: string;
  plata_id: string | null;
  grad_vizat_id: string;
  grad_actual_id: string | null;
  varsta_la_examen: number;
  observatii?: string;
  nota_tehnica: number | null;
  nota_forta: number | null;
  nota_viteza: number | null;
  nota_atitudine: number | null;
  rezultat?: 'Admis' | 'Respins' | 'Neprezentat' | null;
  sportivi: Sportiv;
  grades: Grad;
}

export interface IstoricGrade {
  id: string;
  sportiv_id: string;
  grad_id: string;
  data_obtinere: string;
  sesiune_examen_id?: string;
  observatii?: string;
}

// --- Domain: Antrenamente ---
export interface ProgramItem {
  id: string;
  ziua: 'Luni' | 'Marți' | 'Miercuri' | 'Joi' | 'Vineri' | 'Sâmbătă' | 'Duminică';
  ora_start: string;
  ora_sfarsit: string;
  is_activ?: boolean;
}

export interface Grupa {
  id: string;
  denumire: string;
  program: ProgramItem[];
  sala: string | null;
  club_id?: string | null;
}

export interface Antrenament {
  id: string;
  data: string;
  ora_start: string;
  ora_sfarsit: string | null;
  grupa_id: string | null;
  grupe?: Grupa | null;
  ziua: ProgramItem['ziua'] | null;
  is_recurent: boolean;
  is_activ?: boolean;
  prezenta: { sportiv_id: string; status: string | null }[];
  orar_id?: string | null;
  // New fields from view
  nume_grupa?: string;
  sala?: string;
  durata_minute?: number;
  tip_antrenament?: 'regular' | 'stagiu' | 'examen';
  ziua_saptamanii?: string;
  sportivi_count?: number;
}

export interface AnuntPrezenta {
  id?: string;
  antrenament_id: string;
  sportiv_id: string;
  club_id?: string;
  status: 'Confirm' | 'Intarziat' | 'Absent';
  detalii: string | null;
}

// --- Domain: Evenimente ---
export interface Eveniment {
  id: string;
  denumire: string;
  data: string; // data_inceput
  data_sfarsit: string;
  locatie: string;
  organizator: string;
  tip: 'Stagiu' | 'Competitie';
  probe_disponibile?: string[];
  club_id?: string | null;
  tip_eveniment?: 'CLUB' | 'FEDERATIE' | null;
  vizibilitate_globala?: boolean | null;
}

export interface Rezultat {
  id: string;
  sportiv_id: string;
  eveniment_id: string;
  rezultat: string;
  probe?: string;
}

// --- Domain: Suport & Utilități ---
export interface AnuntGeneral {
  id: string;
  created_at: string;
  title: string;
  titlu?: string;
  body: string;
  sent_by: string;
}

export interface DecontFederatie {
  id: string;
  club_id: string;
  activitate: string;
  data_activitate: string;
  numar_sportivi: number;
  suma_totala: number;
  status: 'In asteptare' | 'Platit';
  chitanta_url: string | null;
  created_at: string;
}

export interface TipAbonament {
  id: string;
  denumire: string;
  pret: number;
  numar_membri: number;
  club_id?: string | null;
}

// --- Domain: Suport & Utilități ---
export interface AnuntGeneral {
  id: string;
  created_at: string;
  title: string;
  titlu?: string;
  body: string;
  sent_by: string;
}

export interface Permissions {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isFederationAdmin: boolean;
  isAdminClub: boolean;
  isInstructor: boolean;
  isSportiv: boolean;
  hasAdminAccess: boolean;
  isFederationLevel: boolean;
  canManageFinances: boolean;
  canGradeStudents: boolean;
  visibleClubIds: 'all' | string[];
  canBeClubAdmin: boolean;
  canBeFederationAdmin: boolean;
  isMultiContextAdmin: boolean;
  hasClubFilter: boolean;
}

export type View = 'dashboard' | 'sportivi' | 'examene' | 'grade' | 'prezenta' | 'grupe' | 'raport-prezenta' | 'stagii' | 'competitii' | 'plati-scadente' | 'jurnal-incasari' | 'raport-financiar' | 'configurare-preturi' | 'tipuri-abonament' | 'familii' | 'user-management' | 'editare-profil-personal' | 'evenimentele-mele' | 'data-maintenance' | 'activitati' | 'my-portal' | 'setari-club' | 'data-inspector' | 'profil-sportiv' | 'reduceri' | 'notificari' | 'taxe-anuale' | 'nomenclatoare' | 'financial-dashboard' | 'istoric-examene' | 'istoric-plati' | 'finalizare-examen' | 'calendar' | 'rapoarte-examen' | 'cluburi' | 'structura-federatie' | 'deconturi-federatie' | 'istoric-prezenta' | 'account-settings' | 'federation-dashboard' | 'gestiune-facturi' | 'fisa-digitala' | 'fisa-competitie' | 'prezenta-instructor' | 'arhiva-prezente' | 'raport-activitate' | 'backdoor-check' | 'backdoor-test' | 'admin-console' | 'raport-lunar-prezenta' | 'portal-sportiv-admin' | 'debug' | 'admin-dashboard' | 'rapoarte' | 'program-antrenamente';

export interface VederePrezentaSportiv {
  id: string;
  sportiv_id: string;
  antrenament_id: string;
  data: string;
  status: string;
  club_id: string;
  grupa_id: string;
  ora_start: string;
  nume_grupa: string;
}

export interface FilteredData {
    sportivi: Sportiv[];
    sesiuniExamene: SesiuneExamen[];
    inscrieriExamene: InscriereExamen[];
    antrenamente: Antrenament[];
    grupe: Grupa[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    tipuriAbonament: TipAbonament[];
    familii: Familie[];
    anunturiPrezenta: AnuntPrezenta[];
    reduceri: Reducere[];
    deconturiFederatie: DecontFederatie[];
    istoricGrade: IstoricGrade[];
    vizualizarePlati: VizualizarePlata[];
    istoricPlatiDetaliat: IstoricPlataDetaliat[];
    locatii: Locatie[];
}

export interface RaportActivitateRecord {
  sportiv_id: string;
  nume_complet: string;
  grad_actual: string | null;
  antrenamente_tinute: number;
  prezente_efective: number;
  procentaj_prezenta: number;
  ultima_prezenta: string | null;
}

export interface ClubDashboardStats {
  sportivi_activi: number;
  grupe_active: number;
  total_datorii: number;
}

export interface GradeHistoryEntry {
  date: number;
  rank: number;
  rankName: string;
}
