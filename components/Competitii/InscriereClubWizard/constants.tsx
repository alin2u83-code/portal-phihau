import React from 'react';

// -----------------------------------------------
// PROBA HEADER — constante și componentă
// -----------------------------------------------

export const PROBA_INFO: Record<string, { title: string; color: string; instructions: string[] }> = {
  thao_quyen_individual: {
    title: 'THAO QUYEN INDIVIDUAL',
    color: 'amber',
    instructions: [
      'Fiecare sportiv concurează individual cu programul propriu.',
      'Selectează câte un sportiv per categorie de vârstă/gen/grad.',
      'Verifică că gradul sportivului corespunde categoriei selectate.',
    ],
  },
  song_luyen: {
    title: 'SONG LUYEN',
    color: 'indigo',
    instructions: [
      'Probă în perechi — obligatoriu 2 titulari, maxim 1 rezervă.',
      'Perechea se formează din sportivi cu grade compatibile.',
      'Programul se alege automat după gradul minim din pereche.',
    ],
  },
  sincron: {
    title: 'SINCRON',
    color: 'emerald',
    instructions: [
      'Probă în grup — minim 3 titulari, maxim 5.',
      'Toți membrii echipei trebuie să aibă același program.',
      'Gradul minim din echipă determină categoria.',
    ],
  },
  giao_dau: {
    title: 'GIAO DAU',
    color: 'rose',
    instructions: [
      'Probă de contact — fiecare sportiv concurează individual.',
      'Greutatea și vârsta determină categoria exactă.',
      'Echipamentul de protecție obligatoriu la competiție.',
    ],
  },
  thao_lo_individual: {
    title: 'THAO LO / CVD',
    color: 'cyan',
    instructions: [
      'Probă cu armă — tipul armei determină categoria.',
      'Selectează arma corectă în câmpul "Armă" al categoriei.',
      'Fiecare sportiv concurează individual.',
    ],
  },
};

export const PROBA_COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  amber:   { bg: 'bg-amber-950/40',   border: 'border-amber-700/60',   text: 'text-amber-300',   badge: 'bg-amber-900/60 text-amber-200' },
  indigo:  { bg: 'bg-indigo-950/40',  border: 'border-indigo-700/60',  text: 'text-indigo-300',  badge: 'bg-indigo-900/60 text-indigo-200' },
  emerald: { bg: 'bg-emerald-950/40', border: 'border-emerald-700/60', text: 'text-emerald-300', badge: 'bg-emerald-900/60 text-emerald-200' },
  rose:    { bg: 'bg-rose-950/40',    border: 'border-rose-700/60',    text: 'text-rose-300',    badge: 'bg-rose-900/60 text-rose-200' },
  cyan:    { bg: 'bg-cyan-950/40',    border: 'border-cyan-700/60',    text: 'text-cyan-300',    badge: 'bg-cyan-900/60 text-cyan-200' },
};

export const ProbaHeader: React.FC<{ tipProba: string }> = ({ tipProba }) => {
  const info = PROBA_INFO[tipProba];
  if (!info) return null;
  const colors = PROBA_COLOR_CLASSES[info.color] ?? PROBA_COLOR_CLASSES.amber;
  return (
    <div className={`rounded-xl border ${colors.bg} ${colors.border} p-3 sm:p-4 mb-4`}>
      <h2 className={`text-xl sm:text-2xl font-bold tracking-wide ${colors.text} mb-2`}>
        {info.title}
      </h2>
      <ul className="space-y-1">
        {info.instructions.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>{i + 1}</span>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
};

// -----------------------------------------------
// STEP LABELS
// -----------------------------------------------

export const STEP_LABELS = [
  'Selectare sportivi',
  'Categorii per sportiv',
  'Formare echipe',
  'Sumar + taxe',
];

export const STEP_LABELS_SCURT = [
  'Sportivi',
  'Categorii',
  'Echipe',
  'Sumar',
];
