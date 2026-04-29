/**
 * ActivitatiNationale — pagina hub pentru Competiții și Stagii
 * Permite navigarea spre oricare din cele două module.
 */
import React from 'react';
import { View } from '../types';
import { TrophyIcon, CalendarDaysIcon } from './icons';

interface ActivitatiNationaleProps {
  onNavigate: (view: View) => void;
  onBack: () => void;
}

interface HubCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: string;
}

const HubCard: React.FC<HubCardProps> = ({ title, description, icon: Icon, onClick, color = 'text-amber-400' }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full text-left bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-400/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
  >
    <div className="p-6 sm:p-8 flex flex-col gap-4">
      <div className={`inline-flex items-center justify-center h-14 w-14 rounded-xl bg-slate-900/80 border border-slate-600 ${color} shadow-lg`}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
      <span className="text-xs font-bold text-amber-400 group-hover:underline flex items-center mt-auto">
        Accesează <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
      </span>
    </div>
  </button>
);

export const ActivitatiNationale: React.FC<ActivitatiNationaleProps> = ({ onNavigate, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Înapoi"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Activități Naționale</h1>
          <p className="text-sm text-slate-400 mt-0.5">Competiții și stagii organizate la nivel național</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <HubCard
          title="Competiții"
          description="Organizează competiții naționale, gestionează categoriile, probele și înscrierile cluburilor participante."
          icon={TrophyIcon}
          onClick={() => onNavigate('competitii')}
          color="text-amber-400"
        />
        <HubCard
          title="Stagii"
          description="Planifică și administrează stagiile de antrenament, seminarii și tabere de pregătire."
          icon={CalendarDaysIcon}
          onClick={() => onNavigate('stagii')}
          color="text-sky-400"
        />
      </div>
    </div>
  );
};
