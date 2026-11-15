// Faza 38 D-01: harta view -> seturi de date grele cerute la deschiderea ecranului.
// View necunoscut (sau lasat pe dinafara: arbore prea larg pentru a fi trasat cu incredere) = TOATE cheile,
// plasa de siguranta: nu e niciodata mai rau decat vechiul "incarca tot" si nu lasa un ecran cu date lipsa.
// antrenamenteIstoricComplet nu e niciodata aici: il cer doar componentele care il folosesc (38-06).
// Modul pur: fara React/Supabase.

import type { CheieLaCerere, View } from '../types';

export const TOATE_CHEILE_LA_CERERE: CheieLaCerere[] = [
  'plati', 'tranzactii', 'istoricPlatiDetaliat', 'reduceri', 'rezultate', 'preturiConfig',
  'vizeSportivi', 'decontSportivi', 'deconturiFederatie', 'taxaAnualaFederatieConfig', 'istoricGrade', 'inscrieriExamene',
];

const FINANCIAR: CheieLaCerere[] = ['plati', 'tranzactii', 'istoricPlatiDetaliat', 'reduceri', 'preturiConfig'];
const TAXE: CheieLaCerere[] = ['vizeSportivi', 'decontSportivi', 'deconturiFederatie', 'taxaAnualaFederatieConfig'];
// Hub-ul Plati & Facturi e un singur element pentru toate aliasurile; tab-ul se alege din viewParams, deci toate cer tot.
// inscrieriExamene: PlatiScadente citeste filteredData.inscrieriExamene.
const HUB_PLATI: CheieLaCerere[] = [...FINANCIAR, ...TAXE, 'inscrieriExamene'];

// Dashboard: AppRouter alege AdminMasterMap (staff, rol != SPORTIV) sau SportivDashboard (restul).
const DASHBOARD_ADMIN: CheieLaCerere[] = ['plati', 'inscrieriExamene', 'deconturiFederatie'];
const DASHBOARD_SPORTIV: CheieLaCerere[] = ['plati', 'istoricGrade', 'inscrieriExamene', 'rezultate'];
const ROLURI_STAFF = new Set(['SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR']);

const FARA_DATE: CheieLaCerere[] = [];

// Cheile = ce citeste ecranul din useData()/filteredData sau primeste ca props de la AppRouter, urmarit prin componentele importate.
// Sursele per intrare sunt in .planning/phases/38-*/38-05-SUMMARY.md.
const HARTA: Partial<Record<View, CheieLaCerere[]>> = {
  'setup-mfa': FARA_DATE,
  // dashboard-urile de federatie fac interogari proprii (count-uri), nu citesc seturi din context
  'federation-dashboard': FARA_DATE,
  'admin-dashboard': FARA_DATE,
  // arrears column + FacturaDetaliu (reduceri) din lista de sportivi
  'sportivi': ['plati', 'tranzactii', 'istoricPlatiDetaliat', 'reduceri'],
  // prezenta/grupe/program: istoricul complet il cer componentele (38-06)
  'grupe': FARA_DATE,
  'prezenta': FARA_DATE,
  'prezenta-instructor': FARA_DATE,
  'program-antrenamente': FARA_DATE,
  'activitati': FARA_DATE,
  'raport-prezenta': FARA_DATE,
  'raport-lunar-prezenta': FARA_DATE,
  'istoric-prezenta': FARA_DATE,
  'rapoarte': FARA_DATE,
  'raport-interval-examen': ['istoricGrade'],
  'calendar': ['rezultate', 'preturiConfig'],
  'competitii': ['vizeSportivi'],
  'fisa-competitie': ['inscrieriExamene'],
  'istoric-plati': ['plati', 'istoricPlatiDetaliat'],
  'audit-grade': ['istoricGrade'],
  // ecrane administrative fara seturi grele
  'legitimatii': FARA_DATE,
  'jurnal-audit': FARA_DATE,
  'conturi-cluburi': FARA_DATE,
  'cereri-inscriere': FARA_DATE,
  'protectia-datelor': FARA_DATE,
  'cereri-gdpr': FARA_DATE,
  'structura-federatie': FARA_DATE,
  'template-probe': FARA_DATE,
  'activitati-nationale': FARA_DATE,
  'inlantuiri-admin': FARA_DATE,
  'user-management': FARA_DATE,
  'cluburi': FARA_DATE,
  'anunturi-federatie': FARA_DATE,
  'setari-club': FARA_DATE,
  'grade': FARA_DATE,
  'notificari': FARA_DATE,
  'sezoane': FARA_DATE,
  'account-settings': FARA_DATE,
  // hub Plati & Facturi (toate aliasurile randeaza acelasi PlatiHub)
  'plati-hub': HUB_PLATI,
  'plati-scadente': HUB_PLATI,
  'gestiune-facturi': HUB_PLATI,
  'facturi-fara-prezenta': HUB_PLATI,
  'jurnal-incasari': HUB_PLATI,
  'raport-financiar': HUB_PLATI,
  'financial-dashboard': HUB_PLATI,
  'tipuri-abonament': HUB_PLATI,
  'configurare-preturi': HUB_PLATI,
  'reduceri': HUB_PLATI,
  'taxe-anuale': HUB_PLATI,
  'nomenclatoare': HUB_PLATI,
  'deconturi-federatie': HUB_PLATI,
  'perioade-vacanta': HUB_PLATI,
  'produse': HUB_PLATI,
  'vanzari-produse': HUB_PLATI,
};

function dashboard(rol: string | null): CheieLaCerere[] {
  if (rol === 'SPORTIV') return DASHBOARD_SPORTIV;
  if (rol && ROLURI_STAFF.has(rol)) return DASHBOARD_ADMIN;
  // rol inca necunoscut / alt rol (ex. reprezentant): AppRouter poate alege oricare dintre cele doua dashboard-uri
  return [...new Set([...DASHBOARD_ADMIN, ...DASHBOARD_SPORTIV])];
}

export function cheiPentruView(view: View, rol: string | null): CheieLaCerere[] {
  if (view === 'dashboard' || view === 'my-portal') return [...dashboard(rol)];
  return [...(HARTA[view] ?? TOATE_CHEILE_LA_CERERE)];
}
