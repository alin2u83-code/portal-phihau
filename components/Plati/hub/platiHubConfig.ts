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
