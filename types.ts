
export interface Sportiv {
  id: string;
  nume: string;
  prenume: string;
  email: string;
  parola: string;
  dataNasterii: string;
  cnp: string;
  inaltime?: number; // în cm, pentru calcul preț echipament
  dataInscrierii: string;
  status: 'Activ' | 'Inactiv';
  clubProvenienta: string;
  grupaId: string | null;
  familieId: string | null; // ID-ul familiei
  tipAbonamentId: string | null; // ID-ul tipului de abonament individual
  participaVacanta: boolean;
  [key: string]: any; // Permite adăugarea de câmpuri custom
}

export interface Grad {
  id:string;
  nume: string;
  ordine: number;
  varstaMinima: number;
  timpAsteptare: string; // ex: "6 luni"
  gradStartId: string | null; // ID-ul gradului necesar pentru a da acest examen
}

export interface Examen {
  id: string;
  data: string;
  locatia: string;
  comisia: string;
}

export interface Participare {
    id: string;
    sportivId: string;
    examenId: string;
    gradSustinutId: string;
    rezultat: 'Admis' | 'Respins' | 'Neprezentat';
    observatii?: string;
}

export interface ProgramItem {
    ziua: 'Luni' | 'Marți' | 'Miercuri' | 'Joi' | 'Vineri' | 'Sâmbătă' | 'Duminică';
    oraStart: string;
    oraSfarsit: string;
}

export interface Prezenta {
  id: string; // Format: YYYY-MM-DD-HH:mm-grupaId-tip
  data: string;
  ora: string;
  grupaId: string;
  sportiviPrezentiIds: string[];
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
}

export interface Rezultat {
    id: string;
    sportivId: string;
    evenimentId: string;
    rezultat: string; // e.g., "Locul 1 Kata", "Participare", "Medalia de aur"
    probe?: string; // e.g., "Quyen, Song Dau, Arme"
}

export interface PretConfig {
    id: string;
    categorie: 'Taxa Examen' | 'Taxa Stagiu' | 'Taxa Competitie' | 'Echipament';
    denumireServiciu: string; // Ex: "Vo Phuc", "Tricou", "Stagiu National", "Competitie Copii"
    suma: number;
    valabilDeLaData: string;
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
    numarMembri: number; // 1 pt individual, 2 pt familie de 2, etc. 
}

export interface Tranzactie {
  id: string;
  plataIds: string[]; // ID-urile datoriilor pe care le stinge
  sportivId: string | null; // Pentru referinta rapida
  familieId: string | null; // Pentru referinta rapida
  suma: number;
  dataPlatii: string;
  metodaPlata: 'Cash' | 'Transfer Bancar';
}

// Reprezintă o DATORIE (ceva ce trebuie plătit)
export interface Plata {
    id: string;
    sportivId: string | null; 
    familieId: string | null; 
    suma: number; // Suma totala datorata/platita
    data: string; // Data generarii datoriei
    status: 'Achitat' | 'Neachitat' | 'Achitat Parțial';
    descriere: string;
    tip: 'Abonament' | 'Taxa Examen' | 'Taxa Stagiu' | 'Taxa Competitie' | 'Echipament';
    observatii: string;
    metodaPlata?: 'Cash' | 'Transfer Bancar' | null;
    dataPlatii?: string | null;
}

export interface Familie {
    id: string;
    nume: string;
}

export type User = (Sportiv & { rol: 'Sportiv' }) | { id: 'admin'; rol: 'Admin'; email: string; parola: string; };

export type View = 'dashboard' | 'sportivi' | 'examene' | 'grade' | 'prezenta' | 'grupe' | 'raport-prezenta' | 'stagii' | 'competitii' | 'plati-scadente' | 'jurnal-incasari' | 'raport-financiar' | 'configurare-preturi' | 'tipuri-abonament' | 'familii';