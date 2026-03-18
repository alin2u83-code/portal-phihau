export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequestContext {
  activeView: string;
  userRole: string;
  userName: string;
  clubName?: string;
}

const VIEW_DESCRIPTIONS: Record<string, string> = {
  dashboard: 'Panou de control principal',
  'my-portal': 'Portalul personal al sportivului',
  sportivi: 'Gestionare sportivi',
  'import-sportivi': 'Import sportivi din CSV',
  legitimatii: 'Gestionare legitimații',
  examene: 'Sesiuni de examene și grad',
  'inscrierii-examene': 'Înscrieri la examene',
  grupe: 'Gestionare grupe de antrenament',
  'plati-scadente': 'Gestionare plăți scadente',
  'taxe-anuale': 'Taxe anuale',
  rapoarte: 'Rapoarte și statistici',
  'raport-financiar': 'Raport financiar detaliat',
  prezenta: 'Pontaj prezență antrenamente',
  'prezenta-instructor': 'Prezență - vizualizare instructor',
  'user-management': 'Administrare utilizatori și roluri',
  notificari: 'Centru de notificări',
  'data-maintenance': 'Mentenanță și curățare date',
  'setari-club': 'Setări globale club',
  'structura-federatie': 'Structură federație și cluburi',
  'account-settings': 'Setări cont personal',
  'admin-dashboard': 'Dashboard administrator federație',
  'federation-dashboard': 'Dashboard federație',
  stagii: 'Stagii de antrenament',
  competitii: 'Competiții și turnee',
  'fisa-digitala': 'Fișa digitală sportiv',
  'fisa-competitie': 'Fișa de competiție',
  'istoric-prezenta': 'Istoric prezență personal',
  'istoric-plati': 'Istoric plăți personal',
};

function buildSystemPrompt(ctx: ClaudeRequestContext): string {
  const viewDesc = VIEW_DESCRIPTIONS[ctx.activeView] || ctx.activeView;
  const roleLabel = {
    SUPER_ADMIN_FEDERATIE: 'Super Administrator Federație',
    ADMIN: 'Administrator Federație',
    ADMIN_CLUB: 'Administrator Club',
    INSTRUCTOR: 'Instructor',
    SPORTIV: 'Sportiv',
  }[ctx.userRole] || ctx.userRole;

  return `Ești un asistent virtual inteligent pentru aplicația de management club Qwan Ki Do (arte marțiale).

Utilizator: ${ctx.userName}
Rol: ${roleLabel}
Pagina curentă: ${viewDesc}
${ctx.clubName ? `Club: ${ctx.clubName}` : ''}

REGULĂ IMPORTANTĂ: Răspunde EXCLUSIV în limba română. Fii concis, prietenos și util.

Cunoști în detaliu funcționalitățile aplicației:
- Gestionare sportivi (adăugare, editare, profil, grade, legitimații)
- Sesiuni de examene (creare, înscrieri, procesare rezultate, finanțe examen)
- Grupe de antrenament (creare grupe, asignare sportivi, program antrenamente)
- Prezență (pontaj, rapoarte prezență, statistici)
- Finanțe (plăți, taxe, rapoarte financiare, jurnal încasări)
- Administrare (utilizatori, roluri, permisiuni, setări club)
- Notificări (sistem de notificări push)

Oferă ajutor specific pentru pagina curentă ("${viewDesc}") și rolul utilizatorului ("${roleLabel}").
Dacă nu știi ceva specific, îndrumă utilizatorul să contacteze administratorul.
Răspunsurile să fie scurte (max 3-4 propoziții) și practice.`;
}

export async function askClaude(
  messages: ClaudeMessage[],
  context: ClaudeRequestContext
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);

  const response = await fetch('/api/claude-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: systemPrompt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Eroare server: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Răspuns invalid de la server');
  return text;
}
