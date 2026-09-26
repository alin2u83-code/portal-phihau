/**
 * Harta props verificata (Faza 31, plan 01)
 *
 * Sursa de adevar pentru contractul hub-ului "Plăți & Facturi" (14 view-uri → 4 tab-uri).
 * Extrasa la planificare din `components/AppRouter.tsx` (commit 6edee5a) si RE-VERIFICATA
 * linie cu linie pe codul real in Task 1 al acestui plan (2026-09-26) — nicio divergenta
 * gasita. Planurile 31-04, 31-05, 31-06, 31-08 TREBUIE sa transmita EXACT aceste props
 * catre componentele existente atunci cand le monteaza in tab-urile noi. "nefiltrat" =
 * variabila luata direct din `useData()`, NU din `filteredData` — trebuie pastrat asa.
 *
 * | Vedere               | AppRouter | Componenta Lazy         | Props exacte | Guard actual |
 * |----------------------|-----------|--------------------------|--------------|--------------|
 * | financial-dashboard  | 228-229   | FinancialDashboard       | onBack=handleBackToDashboard, plati=filteredData.plati, tranzactii=filteredData.tranzactii, sportivi=filteredData.sportivi, familii=filteredData.familii | isAtLeastClubAdmin |
 * | gestiune-facturi     | 230-231   | GestiuneFacturi          | onBack=(canGoBack ? goBack : handleBackToDashboard), currentUser=currentUser!, sportivi=filteredData.sportivi, plati=filteredData.plati, setPlati, setTranzactii, tipuriPlati (nefiltrat), familii=filteredData.familii, onViewSportiv, initialSportivId=viewParams?.sportivId | canManageFinances |
 * | facturi-fara-prezenta| 232-233   | FacturiFaraPrezenta      | onBack=handleBackToDashboard, onViewSportiv | canManageFinances |
 * | deconturi-federatie  | 234-235   | FederationInvoices       | NESCHIMBAT — ramane in afara hub-ului (D-05) | isAtLeastClubAdmin |
 * | plati-scadente       | 236-237   | PlatiScadente            | onIncaseazaMultiple=handleIncaseazaMultiple, onViewSportiv, permissions, onBack=handleBackToDashboard | canManageFinances |
 * | jurnal-incasari      | 238-239   | JurnalIncasari           | currentUser!, permissions, plati=filteredData.plati, setPlati, sportivi=filteredData.sportivi, familii=filteredData.familii, preturiConfig (nefiltrat), tipuriAbonament=filteredData.tipuriAbonament, tipuriPlati (nefiltrat), setTipuriPlati, tranzactii=filteredData.tranzactii, setTranzactii, platiInitiale=platiPentruIncasare, onIncasareProcesata=handleIncasareProcesata, onBack=handleJurnalBack, reduceri (nefiltrat), onViewSportiv | canManageFinances |
 * | raport-financiar     | 240-241   | RaportFinanciar          | onBack=handleBackToDashboard, istoricPlatiDetaliat=filteredData.istoricPlatiDetaliat, sportivi=filteredData.sportivi, familii=filteredData.familii, plati=filteredData.plati, setPlati, setTranzactii, onViewSportiv | isAtLeastClubAdmin |
 * | tipuri-abonament     | 254-255   | TipuriAbonamentManagement| onBack, tipuriAbonament=filteredData.tipuriAbonament, setTipuriAbonament, currentUser!, clubs, activeRoleContext, permissions | isAtLeastClubAdmin |
 * | configurare-preturi  | 256-257   | ConfigurarePreturi       | grade (nefiltrat), onBack | isAtLeastClubAdmin |
 * | reduceri             | 262-263   | ReduceriManagement       | onBack, reduceri (nefiltrat), setReduceri | isAtLeastClubAdmin |
 * | nomenclatoare        | 264-265   | GestionareNomenclatoare  | onBack, tipuriPlati (nefiltrat), setTipuriPlati, plati (NEFILTRAT — `plati`, nu `filteredData.plati`) | isAtLeastClubAdmin |
 * | familii              | 266-267   | FamiliiManagement        | NESCHIMBAT — ramane in afara hub-ului (D-05) | isAtLeastInstructor |
 * | taxe-anuale          | 270-271   | TaxeAnuale               | onBack, currentUser!, sportivi=filteredData.sportivi, plati=filteredData.plati, setPlati | permissions.isSuperAdmin OR permissions.isAdminClub |
 * | istoric-plati        | 284-285   | IstoricPlati             | onBack, viewedUser=currentUser!, plati=filteredData.plati, tranzactii=filteredData.tranzactii | FARA guard — rolul SPORTIV il foloseste |
 *
 * Echivalenta guard-urilor: `isAtLeastClubAdmin` (AppRouter.tsx:111 = isAdminClub OR
 * isFederationAdmin) este identic cu `canManageFinances` (hooks/usePermissions.ts:39 =
 * isFederationAdmin OR isAdminClub). Singurele exceptii: `taxe-anuale` (exclude rolul
 * `ADMIN` non-super) si `istoric-plati` (fara guard).
 *
 * FLUXURI INTER-COMPONENTE verificate in Task 1:
 * - F1 Incasare multipla: `PlatiScadente.handleIncasareClick` (PlatiScadente.tsx:783-786)
 *   → `onIncaseazaMultiple(selected)` → `AppRouter.handleIncaseazaMultiple` (72-75) =
 *   `setPlatiPentruIncasare(selected)` (state in App.tsx:50, trecut prin
 *   AppLayout.tsx:32-33,95-96) + `setActiveView('jurnal-incasari')` (push in history).
 * - F2 JurnalIncasari consuma `platiInitiale` (JurnalIncasari.tsx:196-213 precompletare,
 *   procesare prin RPC `proceseaza_incasare_normalizata`); dupa succes apeleaza
 *   `onIncasareProcesata()` si apoi `setTimeout(() => onBack(), 1500)` (liniile 493-494)
 *   — onBack e invocat AUTOMAT, nu doar din buton. CONFIRMAT pe cod real.
 * - F3 `handleJurnalBack` (AppRouter.tsx:78-85): `setPlatiPentruIncasare([])`;
 *   `canGoBack ? goBack() : setActiveView('plati-scadente')`.
 * - F4 `handleIncasareProcesata` (AppRouter.tsx:87-89): `setPlatiPentruIncasare([])`.
 * - F5 `components/Grupe/GrupaDetailView.tsx:657` `navigateTo('gestiune-facturi',
 *   { sportivId })` → `viewParams.sportivId` → `GestiuneFacturi.initialSportivId`.
 * - F6 Link-uri adanci pe literale vechi care TREBUIE sa ramana functionale prin alias:
 *   `components/GestiuneExamene/index.tsx:273` onNavigate('gestiune-facturi');
 *   `components/UserProfile.tsx:804` onNavigate('plati-scadente');
 *   `components/SportivDashboard/index.tsx:588,700` onNavigate('istoric-plati')
 *   (rol SPORTIV); `components/menuConfig.ts:220` sportivMenu 'istoric-plati';
 *   favorite/topViews AdminMasterMap (useQuickAccess, localStorage); `NavigationContext`
 *   persista activeView in localStorage cheia `phi-hau-active-view` (reload direct pe
 *   orice literal vechi trebuie sa functioneze neschimbat).
 *
 * Trei fapte critice confirmate pentru planurile urmatoare (vezi si SUMMARY 31-01):
 * 1. `JurnalIncasari.tsx:494` invoca automat `onBack` la 1500 ms dupa orice incasare
 *    reusita — orice tab/shell care monteaza JurnalIncasari trebuie sa trateze `onBack`
 *    ca pe un eveniment care poate veni si fara interactiune manuala a userului.
 * 2. `GestionareNomenclatoare` primeste `plati` NEFILTRAT (nu `filteredData.plati`);
 *    `ReduceriManagement` si `JurnalIncasari` primesc `reduceri` NEFILTRAT.
 * 3. `istoric-plati` nu are guard/renderProtected si e folosit de rolul SPORTIV
 *    (SportivDashboard onNavigate('istoric-plati')) — orice guard nou adaugat in hub
 *    NU trebuie sa blocheze accesul SPORTIV la propriul istoric.
 */

import type { View, User, Permissions, Plata, Sportiv } from '../../../types';

/** Cele 4 tab-uri interne ale hub-ului "Plăți & Facturi" (D-01..D-04). */
export type TabHub = 'facturi' | 'incasari' | 'rapoarte' | 'configurare';

/** Cele 12 vederi (literale View vechi) care intra in hub — familii si deconturi-federatie
 * raman in afara hub-ului (D-05), NU apar aici. */
export type SectiuneHub =
  | 'plati-scadente' | 'gestiune-facturi' | 'facturi-fara-prezenta'
  | 'jurnal-incasari' | 'istoric-plati'
  | 'raport-financiar' | 'financial-dashboard'
  | 'tipuri-abonament' | 'configurare-preturi' | 'reduceri' | 'taxe-anuale' | 'nomenclatoare';

/** Pozitia curenta in hub: tab activ + sectiunea (view-ul vechi) afisata in el. */
export interface PozitieHub {
  tab: TabHub;
  sectiune: SectiuneHub;
}

/** Tab-urile interne ale profilului de sportiv, folosite de `onViewSportiv` — copiate
 * identic din semnatura reala `onViewSportiv` din `components/AppRouter.tsx:114`. */
export type TabProfilSportiv = 'profil' | 'contact' | 'grade' | 'financiar' | 'familie' | 'grupe-istoric';

/** Props comune pe care le primeste orice componenta de tab din hub (TabFacturi,
 * TabIncasari, TabRapoarte, TabConfigurare — planurile 31-04/05/06). `Plata` e importat
 * pentru documentarea contractului si pentru uz in extensiile de props ale planurilor
 * de tab (ex. TabFacturiProps / TabIncasariProps), chiar daca nu e folosit direct aici. */
export interface PlatiHubTabProps {
  sectiune: SectiuneHub;
  currentUser: User;
  permissions: Permissions;
  activeRoleContext: any;
  onViewSportiv: (sportiv: Sportiv, tab?: TabProfilSportiv) => void;
  onBack: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Gruparea D-01..D-05 (LOCKED — confirmata de utilizator in 31-CONTEXT.md)
// ─────────────────────────────────────────────────────────────────────────

/** Ordinea tab-urilor in UI (pastilele hub-ului). */
export const TABURI_HUB: readonly TabHub[] = ['facturi', 'incasari', 'rapoarte', 'configurare'];

export const ETICHETE_TABURI: Record<TabHub, string> = {
  facturi: 'Facturi',
  incasari: 'Încasări',
  rapoarte: 'Rapoarte',
  configurare: 'Configurare',
};

/** Gruparea LOCKED D-01..D-04. Ordinea din fiecare lista e ordinea pastilelor in UI. */
export const SECTIUNI_PE_TAB: Record<TabHub, readonly SectiuneHub[]> = {
  facturi: ['plati-scadente', 'gestiune-facturi', 'facturi-fara-prezenta'], // D-01
  incasari: ['jurnal-incasari', 'istoric-plati'], // D-02
  rapoarte: ['raport-financiar', 'financial-dashboard'], // D-03
  configurare: ['tipuri-abonament', 'configurare-preturi', 'reduceri', 'taxe-anuale', 'nomenclatoare'], // D-04
};

export const ETICHETE_SECTIUNI: Record<SectiuneHub, string> = {
  'plati-scadente': 'Facturi & Plăți',
  'gestiune-facturi': 'Gestiune Facturi',
  'facturi-fara-prezenta': 'Facturi fără Prezență',
  'jurnal-incasari': 'Jurnal Încasări',
  // IstoricPlati afiseaza platile utilizatorului logat — comportament neschimbat
  // fata de vederea veche, eticheta reflecta asta ("Personale").
  'istoric-plati': 'Istoric Plăți Personale',
  'raport-financiar': 'Raport Financiar',
  'financial-dashboard': 'Dashboard Financiar',
  'tipuri-abonament': 'Config. Abonamente',
  'configurare-preturi': 'Configurare Prețuri',
  'reduceri': 'Reduceri',
  'taxe-anuale': 'Taxe Anuale',
  'nomenclatoare': 'Nomenclatoare (Tipuri Plăți)',
};

/** Prima sectiune din lista fiecarui tab — folosita ca implicita cand doar tab-ul e cunoscut. */
export const SECTIUNE_IMPLICITA: Record<TabHub, SectiuneHub> = TABURI_HUB.reduce((acc, tab) => {
  acc[tab] = SECTIUNI_PE_TAB[tab][0];
  return acc;
}, {} as Record<TabHub, SectiuneHub>);

/** Derivat programatic din SECTIUNI_PE_TAB — nu scris de mana, ca sa nu poata diverge. */
export const TAB_PENTRU_SECTIUNE: Record<SectiuneHub, TabHub> = TABURI_HUB.reduce((acc, tab) => {
  for (const sectiune of SECTIUNI_PE_TAB[tab]) {
    acc[sectiune] = tab;
  }
  return acc;
}, {} as Record<SectiuneHub, TabHub>);

const TOATE_SECTIUNILE_HUB: readonly SectiuneHub[] = TABURI_HUB.flatMap(tab => SECTIUNI_PE_TAB[tab]);

/** Vederile (literale View) care intra in hub: 'plati-hub' + cele 12 sectiuni (13 total).
 * NU include 'familii' si 'deconturi-federatie' (D-05 — raman ecrane separate). */
export const VEDERI_HUB: readonly View[] = ['plati-hub' as View, ...TOATE_SECTIUNILE_HUB];

export function esteTabHub(x: unknown): x is TabHub {
  return typeof x === 'string' && (TABURI_HUB as readonly string[]).includes(x);
}

export function esteSectiuneHub(x: unknown): x is SectiuneHub {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(TAB_PENTRU_SECTIUNE, x);
}

/** True daca `view` e una dintre cele 13 vederi ale hub-ului (D-05: familii si
 * deconturi-federatie raman in afara hub-ului, deci returneaza false pentru ele). */
export function esteVedereHub(view: string): boolean {
  return (VEDERI_HUB as readonly string[]).includes(view);
}

/**
 * Rezolvitor pur de pozitie in hub — fara React, fara Supabase, fara acces la
 * window/localStorage. Citeste defensiv `viewParams` (poate fi null, non-obiect
 * sau poate avea alte chei ca `sportivId`).
 *
 * Precedenta:
 * 1. `viewParams.sectiune` e o SectiuneHub valida → tab derivat din sectiune (sectiunea
 *    castiga peste orice `viewParams.tab` sau peste literalul vechi din activeView).
 * 2. altfel `viewParams.tab` e un TabHub valid → sectiunea implicita a acelui tab.
 * 3. altfel `activeView` e o SectiuneHub (literal vechi, ex. deep-link/reload direct)
 *    → tab derivat din acel literal.
 * 4. altfel → pozitia implicita (facturi / plati-scadente).
 *
 * La final: daca sectiunea rezultata e 'taxe-anuale' si `poateVedeaTaxeAnuale` e false,
 * cade pe 'tipuri-abonament' — pastreaza guard-ul vechi al vederii taxe-anuale
 * (`permissions.isSuperAdmin || permissions.isAdminClub`, AppRouter.tsx:271).
 */
export function rezolvaPozitieHub(activeView: View, viewParams: unknown, poateVedeaTaxeAnuale: boolean): PozitieHub {
  const vp = (viewParams && typeof viewParams === 'object') ? (viewParams as Record<string, unknown>) : null;
  const sectiuneDinParams = vp ? vp.sectiune : undefined;
  const tabDinParams = vp ? vp.tab : undefined;

  let rezultat: PozitieHub;
  if (esteSectiuneHub(sectiuneDinParams)) {
    rezultat = { tab: TAB_PENTRU_SECTIUNE[sectiuneDinParams], sectiune: sectiuneDinParams };
  } else if (esteTabHub(tabDinParams)) {
    rezultat = { tab: tabDinParams, sectiune: SECTIUNE_IMPLICITA[tabDinParams] };
  } else if (esteSectiuneHub(activeView)) {
    rezultat = { tab: TAB_PENTRU_SECTIUNE[activeView], sectiune: activeView };
  } else {
    rezultat = { tab: 'facturi', sectiune: 'plati-scadente' };
  }

  if (rezultat.sectiune === 'taxe-anuale' && !poateVedeaTaxeAnuale) {
    return { tab: 'configurare', sectiune: 'tipuri-abonament' };
  }

  return rezultat;
}
