import React from 'react';
import { ROLES } from '../../constants';

interface QuickAction {
  label: string;
  prompt: string;
  emoji: string;
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  [ROLES.ADMIN_CLUB]: [
    { label: 'Adaug sportiv', prompt: 'Cum adaug un sportiv nou în sistem?', emoji: '👤' },
    { label: 'Sesiune examen', prompt: 'Cum creez și gestionez o sesiune de examen?', emoji: '🥋' },
    { label: 'Înregistrez plată', prompt: 'Cum înregistrez o plată pentru un sportiv?', emoji: '💳' },
    { label: 'Pontaj prezență', prompt: 'Cum înregistrez prezența la antrenamente?', emoji: '📋' },
  ],
  [ROLES.SUPER_ADMIN_FEDERATIE]: [
    { label: 'Gestionez cluburi', prompt: 'Cum gestionez cluburile din federație?', emoji: '🏛️' },
    { label: 'Rapoarte federație', prompt: 'Ce rapoarte sunt disponibile la nivel de federație?', emoji: '📊' },
    { label: 'Procesez examene', prompt: 'Cum procesez și finalizez o sesiune de examene?', emoji: '🥋' },
    { label: 'Deconturi', prompt: 'Cum generez și gestionez deconturile federației?', emoji: '💰' },
  ],
  [ROLES.ADMIN]: [
    { label: 'Gestionez cluburi', prompt: 'Cum gestionez cluburile din federație?', emoji: '🏛️' },
    { label: 'Rapoarte', prompt: 'Ce rapoarte sunt disponibile?', emoji: '📊' },
    { label: 'Examene', prompt: 'Cum procesez o sesiune de examene?', emoji: '🥋' },
    { label: 'Finanțe', prompt: 'Cum gestionez finanțele federației?', emoji: '💰' },
  ],
  [ROLES.INSTRUCTOR]: [
    { label: 'Prezență', prompt: 'Cum înregistrez prezența la antrenament?', emoji: '📋' },
    { label: 'Grade sportivi', prompt: 'Cum văd gradele sportivilor din grupele mele?', emoji: '🥋' },
    { label: 'Grup nou', prompt: 'Cum creez o grupă nouă de antrenament?', emoji: '👥' },
    { label: 'Raport activitate', prompt: 'Cum generez un raport de activitate?', emoji: '📊' },
  ],
  [ROLES.SPORTIV]: [
    { label: 'Plățile mele', prompt: 'Cum văd situația plăților mele?', emoji: '💳' },
    { label: 'Înscriu la examen', prompt: 'Cum mă înscriu la o sesiune de examen?', emoji: '🥋' },
    { label: 'Prezența mea', prompt: 'Cum văd istoricul prezenței mele?', emoji: '📋' },
    { label: 'Fișa mea', prompt: 'Ce informații conține fișa mea digitală?', emoji: '📄' },
  ],
};

const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Cum navighez?', prompt: 'Cum navighez prin aplicație?', emoji: '🗺️' },
  { label: 'Cont și profil', prompt: 'Cum îmi schimb parola sau datele profilului?', emoji: '👤' },
  { label: 'Ajutor general', prompt: 'Ce funcționalități principale are această aplicație?', emoji: '❓' },
];

interface QuickActionsProps {
  activeRole: string;
  onSelect: (prompt: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ activeRole, onSelect }) => {
  const actions = QUICK_ACTIONS[activeRole] || DEFAULT_ACTIONS;

  return (
    <div className="px-4 pb-3">
      <p className="text-xs text-slate-500 mb-2 font-medium">Întrebări rapide:</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.prompt)}
            className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-left transition-all group"
          >
            <span className="text-lg leading-none">{action.emoji}</span>
            <span className="text-xs text-slate-300 group-hover:text-white font-medium leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
