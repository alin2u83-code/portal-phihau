export interface Rol {
  id: string;
  nume: 'Sportiv' | 'Instructor' | 'Admin' | 'Super Admin' | 'Admin Club';
}

export interface Club {
  id: string;
  nume: string;
  cif?: string | null;
  oras?: string | null;
  federatie_id?: string | null;
}

export interface Sportiv {
  id: string;
  user_id?: string; // FK to auth.users
  nume: string;
  prenume: string;
  email: string | null;
  username?: string; // Nume de utilizator unic pentru login
  parola?: string; // Only for creating new users
  roluri: Rol[];
  data_nasterii: string;
  cnp: string | null;
  inaltime?: number; // în cm, pentru calcul preț echipament
  data_inscrierii: string;
  status: 'Activ' | 'Inactiv';
  grupa_id: string | null;
  club_id?: string | null; // FK to cluburi
  grad_actual_id?: string | null; // FK to grade
  familie_id: string | null; // ID-ul familiei
  tip_abonament_id: string | null; // ID-ul tipului de abonament individual
  participa_vacanta: boolean;
  [key: string]: any; // Permite adăugarea de câmpuri custom
}

export interface Grad {
  id:string;
  nume: string;
  ordine: number;
  varsta_minima: number;
  timp_asteptare: string; // ex: "6 luni"
  grad_start_id: string | null; // ID-ul gradului necesar pentru a da acest examen
}

export interface SesiuneExamen {
  id: string;
  data: string;
  locatie_id: string;
  localitate?: string;
  comisia: string[];
  club_id?: string | null;
}

export interface Locatie {
  id: string;
  nume: string;
  adresa?: string | null;
}

export interface InscriereExamen {
    id: string;
    sportiv_id: string;
    sesiune_id: string;
    plata_id: string | null;
    grad_vizat_id: string; // Renamed from grad_sustinut_id
    grad_actual_id: string | null;
    varsta_la_examen: number;
    observatii?: string;
    nota_tehnica: number | null;
    nota_forta: number | null;
    nota_viteza: number | null;
    nota_atitudine: number | null;
    rezultat?: 'Admis' | 'Respins' | 'Neprezentat' | null;
    sportivi: Sportiv; 
    grade: Grad;
}

export interface IstoricGrade {
    id: string;
    sportiv_id: string;
    grad_id: string;
    data_obtinere: string;
    sesiune_examen_id?: string;
}

export interface IstoricTransfer {
    id: string;
    created_at: string;
    sportiv_id: string;
    club_vechi_id: string | null;
    club_nou_id: string;
    data_transfer: string;
    aprobat_de_user_id: string;
}

export interface ProgramItem {
    id: string;
    ziua: 'Luni' | 'Marți' | 'Miercuri' | 'Joi' | 'Vineri' | 'Sâmbătă' | 'Duminică';
    ora_start: string;
    ora_sfarsit: string;
    is_activ?: boolean;
}

export interface Antrenament {
  id: string;
  data: string;
  ora_start: string;
  ora_sfarsit: string | null;
  grupa_id: string | null;
  ziua: ProgramItem['ziua'] | null;
  is_recurent: boolean;
  sportivi_prezenti_ids: string[];
}

export interface AnuntPrezenta {
  id?: string;
  antrenament_id: string;
  sportiv_id: string;
  status: 'Confirm' | 'Intarziat' | 'Absent';
  detalii: string | null;
}


export interface Grupa {
    id: string;
    denumire: string;
    program: ProgramItem[];
    sala: string;
    club_id?: string | null;
}

export interface Eveniment {
    id: string;
    denumire: string;
    data: string;
    locatie: string;
    organizator: string;
    tip: 'Stagiu' | 'Competitie';
    probe_disponibile?: string[];
    club_id?: string | null;
}

export interface Rezultat {
    id: string;
    sportiv_id: string;
    eveniment_id: string;
    rezultat: string; 
    probe?: string;
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


export interface TipAbonament {
    id: string;
    denumire: string;
    pret: number;
    numar_membri: number;
    club_id?: string | null;
}

export interface Tranzactie {
  id: string;
  plata_ids: string[];
  sportiv_id: string | null;
  familie_id: string | null;
  suma: number;
  data_platii: string;
  metoda_plata: 'Cash' | 'Transfer Bancar';
  descriere?: string;
}

export interface Plata {
    id: string;
    sportiv_id: string | null; 
    familie_id: string | null; 
    suma_initiala?: number | null;
    reducere_id?: string | null;
    suma: number;
    data: string;
    status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
    descriere: string;
    tip: string;
    observatii: string;
}

export interface TipPlata {
  id: string;
  nume: string;
  is_system_type: boolean;
}

export interface Familie {
    id: string;
    nume: string;
    tip_abonament_id?: string | null;
}

export interface Reducere {
    id: string;
    nume: string;
    tip: 'procent' | 'suma_fixa';
    valoare: number;
    este_activa: boolean;
    categorie_aplicabila: 'Abonament' | 'Echipament' | 'Toate';
}

export interface AnuntGeneral {
  id: string;
  created_at: string;
  title: string;
  body: string;
  sent_by: string;
}

export type User = Sportiv;

export type View = 'dashboard' | 'sportivi' | 'examene' | 'grade' | 'prezenta' | 'grupe' | 'raport-prezenta' | 'stagii' | 'competitii' | 'plati-scadente' | 'jurnal-incasari' | 'raport-financiar' | 'configurare-preturi' | 'tipuri-abonament' | 'familii' | 'user-management' | 'editare-profil-personal' | 'evenimentele-mele' | 'data-maintenance' | 'activitati' | 'my-portal' | 'setari-club' | 'data-inspector' | 'profil-sportiv' | 'reduceri' | 'notificari' | 'taxe-anuale' | 'nomenclatoare' | 'financial-dashboard' | 'istoric-examene' | 'facturi-personale' | 'finalizare-examen' | 'calendar' | 'rapoarte-examen' | 'cluburi';

export type Participare = InscriereExamen;
export type Examen = SesiuneExamen;