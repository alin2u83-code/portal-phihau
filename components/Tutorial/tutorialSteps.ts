import { TutorialStep } from '../../src/store/useAIStore';

const ADMIN_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tutorial="header"]',
    title: 'Bun venit în Portal! 👋',
    content: 'Acesta este panoul de control al clubului tău. Hai să facem un tur rapid ca să cunoști toate funcționalitățile importante.',
    position: 'bottom',
  },
  {
    id: 'sidebar',
    targetSelector: '[data-tutorial="sidebar"]',
    title: 'Meniu Principal',
    content: 'Bara laterală conține toate secțiunile aplicației. Poți extinde sau minimiza meniul folosind butonul din stânga sus.',
    position: 'right',
  },
  {
    id: 'nav-sportivi',
    targetSelector: '[data-tutorial="nav-sportivi"]',
    title: 'Gestionare Sportivi',
    content: 'Aici adaugi, editezi și urmărești progresul sportivilor. Poți vedea grade, plăți și prezență pentru fiecare sportiv.',
    position: 'right',
  },
  {
    id: 'sportivi-assign-group',
    targetSelector: '[data-tutorial="sportivi-filter"]',
    title: 'Atribuire Grupă la Sportivi',
    content: 'Pentru a muta sportivi într-o grupă: (1) Filtrează după "Fără Grupă" ca să îi identifici pe cei nealocați. (2) Apasă butonul de editare ✏️ pe fiecare sportiv. (3) Schimbă câmpul "Grupă" și salvează. Poți de asemenea să editezi un sportiv din lista normală pentru a-i schimba grupa.',
    position: 'bottom',
  },
  {
    id: 'nav-examene',
    targetSelector: '[data-tutorial="nav-examene"]',
    title: 'Sesiuni de Examene',
    content: 'Organizează sesiuni de examen pentru trecerea gradelor, gestionează înscrierile și finalizează rezultatele cu procesare financiară automată.',
    position: 'right',
  },
  {
    id: 'nav-prezenta',
    targetSelector: '[data-tutorial="nav-prezenta"]',
    title: 'Pontaj Prezență',
    content: 'Înregistrează prezența la antrenamente și generează rapoarte de activitate pentru fiecare sportiv și grupă.',
    position: 'right',
  },
  {
    id: 'nav-plati',
    targetSelector: '[data-tutorial="nav-plati"]',
    title: 'Gestionare Financiară',
    content: 'Urmărește plățile scadente, înregistrează încasările și generează rapoarte financiare complete pentru club.',
    position: 'right',
  },
  {
    id: 'ai-assistant',
    targetSelector: '[data-tutorial="ai-widget"]',
    title: 'Asistentul tău AI 🤖',
    content: 'Ai întrebări în orice moment? Apasă acest buton pentru a deschide asistentul AI care te poate ghida prin orice funcționalitate a aplicației.',
    position: 'top',
  },
];

const INSTRUCTOR_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tutorial="header"]',
    title: 'Bun venit, Instructor! 👋',
    content: 'Acesta este panoul tău de instructor. Vei putea gestiona prezența, grupele și urmări progresul sportivilor.',
    position: 'bottom',
  },
  {
    id: 'sidebar',
    targetSelector: '[data-tutorial="sidebar"]',
    title: 'Meniu Principal',
    content: 'Bara laterală îți oferă acces rapid la toate secțiunile disponibile pentru rolul tău de instructor.',
    position: 'right',
  },
  {
    id: 'nav-prezenta',
    targetSelector: '[data-tutorial="nav-prezenta"]',
    title: 'Pontaj Prezență',
    content: 'Secțiunea principală - înregistrează prezența la antrenamente rapid și eficient pentru toți sportivii din grupele tale.',
    position: 'right',
  },
  {
    id: 'ai-assistant',
    targetSelector: '[data-tutorial="ai-widget"]',
    title: 'Asistentul AI',
    content: 'Ai nevoie de ajutor? Asistentul AI poate răspunde la orice întrebare despre utilizarea aplicației.',
    position: 'top',
  },
];

export function getTutorialStepsForRole(role: string): TutorialStep[] {
  switch (role) {
    case 'SUPER_ADMIN_FEDERATIE':
    case 'ADMIN':
    case 'ADMIN_CLUB':
      return ADMIN_STEPS;
    case 'INSTRUCTOR':
      return INSTRUCTOR_STEPS;
    default:
      return [];
  }
}
