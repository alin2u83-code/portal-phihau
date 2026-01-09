
export interface Sportiv {
  id: string;
  user_id?: string; // FK to auth.users
  nume: string;
  prenume: string;
  email: string;
  username?: string; // Nume de utilizator unic pentru login
  parola?: string; // Only for creating new users
  rol: 'Sportiv' | 'Instructor' | 'Admin';
  data_nasterii: string;
  cnp: string;
  inaltime?: number; // în cm, pentru calcul preț echipament
  data_inscrierii: string;
  status: 'Activ' | 'Inactiv';
  club_provenienta: string;
  grupa_id: string | null;
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

export interface Examen {
  id: string;
  data: string;
  locatia: string;
  comisia: string;
}

export interface Participare {
    id: string;
    sportiv_id: string;
    examen_id: string;
    grad_sustinut_id: string;
    rezultat: 'Admis' | 'Respins' | 'Neprezentat';
    observatii?: string;
}

export interface ProgramItem {
    ziua: 'Luni' | 'Marți' | 'Miercuri' | 'Joi' | 'Vineri' | 'Sâmbătă' | 'Duminică';
    ora_start: string;
    ora_sfarsit: string;
}

export interface Prezenta {
  id: string;
  data: string;
  ora: string;
  grupa_id: string;
  sportivi_prezenti_ids: string[];
  tip: 'Normal' | 'Vacanta';
}

export interface Grupa {
    id: string;
    denumire: string;
    program: ProgramItem[];
    sala: string;
}

export interface Eveniment {
    id: string;
    denumire: string;
    data: string;
    locatie: string;
    organizator: string;
    tip: 'Stagiu' | 'Competitie';
    probe_disponibile?: string[];
}

export interface Rezultat {
    id: string;
    sportiv_id: string;
    eveniment_id: string;
    rezultat: string; // e.g., "Locul 1 Kata", "Participare", "Medalia de aur"
    probe?: string; // e.g., "Quyen, Song Dau, Arme"
}

export interface PretConfig {
    id: string;
    categorie: 'Taxa Examen' | 'Taxa Stagiu' | 'Taxa Competitie' | 'Echipament';
    denumire_serviciu: string; // Ex: "Vo Phuc", "Tricou", "Stagiu National", "Competitie Copii"
    suma: number;
    valabil_de_la_data: string;
    specificatii?: { // Câmp flexibil pentru atribute
        inaltimeMin?: number;
        inaltimeMax?: number;
        marime?: 'S' | 'M' | 'L' | 'XL';
        tipEveniment?: 'Local' | 'National';
    };
}


export interface TipAbonament {
    id: string;
    denumire: string;
    pret: number;
    numar_membri: number; // 1 pt individual, 2 pt familie de 2, etc. 
}

export interface Tranzactie {
  id: string;
  plata_ids: string[]; // ID-urile datoriilor pe care le stinge
  sportiv_id: string | null; // Pentru referinta rapida
  familie_id: string | null; // Pentru referinta rapida
  suma: number;
  data_platii: string;
  metoda_plata: 'Cash' | 'Transfer Bancar';
}

// Reprezintă o DATORIE (ceva ce trebuie plătit)
export interface Plata {
    id: string;
    sportiv_id: string | null; 
    familie_id: string | null; 
    suma: number; // Suma totala datorata/platita
    data: string; // Data generarii datoriei
    status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
    descriere: string;
    tip: 'Abonament' | 'Taxa Examen' | 'Taxa Stagiu' | 'Taxa Competitie' | 'Echipament';
    observatii: string;
    metoda_plata?: 'Cash' | 'Transfer Bancar' | null;
    data_platii?: string | null;
}

export interface Familie {
    id: string;
    nume: string;
}

export type User = Sportiv;

export type View = 'dashboard' | 'sportivi' | 'examene' | 'grade' | 'prezenta' | 'grupe' | 'raport-prezenta' | 'stagii' | 'competitii' | 'plati-scadente' | 'jurnal-incasari' | 'raport-financiar' | 'configurare-preturi' | 'tipuri-abonament' | 'familii' | 'user-management' | 'familie-detail';