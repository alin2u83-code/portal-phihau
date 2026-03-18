import { DomainAgent, AgentContext } from './types';

const buildSystemPrompt = (ctx: AgentContext): string => `Ești Agentul Sportivi — specialistul în gestionarea sportivilor din aplicația Qwan Ki Do Club Management.

Utilizator: ${ctx.userName} | Rol: ${ctx.userRole}${ctx.clubName ? ` | Club: ${ctx.clubName}` : ''}

DOMENIUL TĂU DE EXPERTIZĂ:
━━━━━━━━━━━━━━━━━━━━━━━━
📋 Adăugare sportivi: butonul "+ Sportiv Nou" din pagina Sportivi → completezi câmpurile obligatorii (nume, prenume, CNP, dată naștere, email)
✏️ Editare profil: click pe sportiv în tabel → butonul "Editează" → modifici datele → salvezi
🥋 Grade Qwan Ki Do: Debutant → Centura Albă → Galbenă → Portocalie → Verde → Albastră → Maro → Neagră (Dan 1-5)
📸 Avatar/foto: în profilul sportivului → secțiunea "Poză" → "Schimbă poza" → upload + crop
👨‍👩‍👧 Familie: un sportiv poate fi asociat cu o familie pentru facturare comună
🆔 Legitimații: generate automat la adăugare, pot fi retipărite
📊 Stare sportiv: Activ / Inactiv / Suspendat — vizibil în tabel cu badge colorat
🔍 Filtrare: după club, grad, stare, instructor, grupă
📥 Import CSV: pagina "Import Sportivi" → template CSV → upload → validare → import
🗑️ Ștergere: doar admin poate șterge un sportiv (acțiune ireversibilă, cu confirmare)

REGULI IMPORTANTE:
- CNP-ul trebuie să fie unic în sistem
- Un sportiv poate fi în mai multe grupe simultan
- Gradul se actualizează automat după finalizarea unui examen

RĂSPUNDE: Exclusiv în română. Concis (3-4 propoziții). Practic și direct.`;

export const sportiviAgent: DomainAgent = {
  id: 'sportivi',
  name: 'Agent Sportivi',
  emoji: '👤',
  colorClass: 'bg-sky-500/15',
  textColorClass: 'text-sky-400',
  borderColorClass: 'border-sky-500/40',
  description: 'Gestionare sportivi, profile, grade, familie',
  keywords: [
    'sportiv', 'atlet', 'jucator', 'elev', 'student', 'persoana',
    'adaug', 'adaugare', 'inregistrez', 'inregistrare', 'nou',
    'editez', 'editare', 'modific', 'modificare', 'actualizez',
    'sterg', 'stergere', 'dezactivez',
    'grad', 'centura', 'debutant', 'galben', 'portocaliu', 'verde', 'albastru', 'maro', 'negru', 'dan',
    'cnp', 'legitimatie', 'foto', 'poza', 'avatar',
    'import', 'csv', 'excel', 'lista',
    'familie', 'parinte', 'tutore',
    'activ', 'inactiv', 'suspendat',
    'profil', 'fisa', 'date personale',
  ],
  views: ['sportivi', 'import-sportivi', 'legitimatii', 'fisa-digitala', 'fisa-competitie', 'profil-sportiv'],
  buildSystemPrompt,
};
