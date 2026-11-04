import type { useArmeCvd } from '../../../hooks/useArmeCvd';
import {
  Competitie, ProbaCompetitie, CategorieCompetitie,
  Sportiv, Grad, InscriereCompetitie, EchipaCompetitie, VizaSportiv, Inlantuire, Arma,
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
  /** Refresh silențios al prop-ului `echipe` (fetchDataSilent) — NU remontează wizard-ul */
  onEchipeRefresh?: () => void | Promise<void>;
  /** CVD: datele armelor (useArmeCvd apelat in CompetitieDetail) */
  arme?: ReturnType<typeof useArmeCvd>;
  /** CVD: armele se pot edita (inscrieri deschise + admin) */
  canEdit?: boolean;
}

/** sportivId -> set de armaId alese pe competitie */
export type ArmeAlese = Map<string, Set<string>>;

/** CVD: sportivId -> armaId -> inlantuireId (forma aleasa; o singura forma per arma) */
export type FormaPerArma = Map<string, Map<string, string>>;
/** CVD: sportivId -> armaId -> categoria potrivita */
export type CategoriePerArma = Map<string, Map<string, CategorieCompetitie>>;

export interface Pas2ArmeProps {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  arme: Arma[];
  armeAlese: ArmeAlese;
  categoriePerArma: CategoriePerArma;
  formaPerArma: FormaPerArma;
  /** inscrierile existente: forma unei inscrieri cu taxa achitata nu se mai schimba */
  inscrieri?: InscriereCompetitie[];
  onChange: (next: FormaPerArma) => void;
  onContinua: () => void;
  onBack: () => void;
}

export interface PasArmeProps {
  competitie: Competitie;
  sportivi: Sportiv[];
  grade: Grad[];
  categorii: CategorieCompetitie[];
  inscrieri: InscriereCompetitie[];
  armeAlese: ArmeAlese;
  onChange: (next: ArmeAlese) => void;
  canEdit: boolean;
  /** reincarca inscrierile dupa o retragere (fetchDataSilent) */
  onInscrieriRefresh?: () => void | Promise<void>;
  onContinua: () => void;
  onBack: () => void;
}
