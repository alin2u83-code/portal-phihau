import {
  Competitie, ProbaCompetitie, CategorieCompetitie,
  Sportiv, Grad, InscriereCompetitie, EchipaCompetitie, VizaSportiv, Inlantuire,
} from '../../../types';

// -----------------------------------------------
// TIPURI ELIGIBILITATE GENERALĂ
// -----------------------------------------------
export type EligibilitateGeneralaStatus = 'eligibil' | 'atentionare' | 'neeligibil' | 'date_incomplete';

export interface EligibilitateGenerala {
  status: EligibilitateGeneralaStatus;
  motiv: string | null;
  avertismente: string[];
}

// -----------------------------------------------
// TIPURI PICKS PASUL 2
// -----------------------------------------------

/** Datele suplimentare per (sportiv, categorie) alese în Pasul 2 */
export interface PickCategorie {
  inlantuire_id?: string;
  acord_parental?: boolean;
}

/**
 * indivPicks: Map<sportivId, Map<categorieId, PickCategorie>>
 */
export type IndivPicks = Map<string, Map<string, PickCategorie>>;

export interface QuyenPick { q1: string; q2: string; }
export type QuyenAlesMap = Map<string, QuyenPick>;

// -----------------------------------------------
// TIP: inlantuiri_grade row agregat (intern)
// -----------------------------------------------
export interface DreptGrad {
  grade_id: string;
  tip_proba: string;
  inlantuiri: Inlantuire[];
}

// -----------------------------------------------
// TIP ROL ECHIPĂ
// -----------------------------------------------
export type RolEchipa = 'titular' | 'rezerva' | 'nu_participa';

// -----------------------------------------------
// TIP ECHIPĂ FORMATĂ
// -----------------------------------------------

/** O echipă formată pentru o categorie de tip echipă/pereche. */
export interface EchipaFormata {
  categorieId: string;
  dbId?: string; // id din echipe_competitie — UPDATE dacă există
  numeEchipa: string;
  titulari: string[];  // sportivId[]
  rezerve: string[];   // sportivId[]
  program?: string;    // program ales (SL/Sincron)
  echipaIncompleta?: boolean; // solicitare partener inter-club
  echipaSkip?: boolean; // nu participam la aceasta proba
}

// -----------------------------------------------
// PROPS PRINCIPALE WIZARD
// -----------------------------------------------
export interface InscriereClubWizardProps {
  competitie: Competitie;
  probe: ProbaCompetitie[];
  categorii: CategorieCompetitie[];
  sportivi: Sportiv[];
  grade: Grad[];
  inscrieri: InscriereCompetitie[];
  echipe: EchipaCompetitie[];
  clubId: string;
  numeClub: string;
  vizeSportivi: VizaSportiv[];
  myClubId?: string;
  onBack: () => void;
  onSaved: () => void;
  onOpenEditEchipa?: (categorieId: string) => void;
  onOpenInscriereModal?: (cat: CategorieCompetitie, goToHub?: () => void) => void;
}
