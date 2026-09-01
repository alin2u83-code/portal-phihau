import React from 'react';
import { View } from '../types';
import { Card } from './ui';
import { CalendarDaysIcon, TrophyIcon, BookMarkedIcon, BellIcon, ChevronRightIcon } from './icons';
import { useNewsfeed } from '../hooks/useNewsfeed';

interface NewsfeedWidgetProps {
  clubId: string | null | undefined;
  onNavigate: (view: View) => void;
}

const TIP_ICON: Record<string, React.ElementType> = {
  examen: TrophyIcon,
  stagiu: BookMarkedIcon,
  competitie: TrophyIcon,
};

function countdownLabel(dataISO: string): string {
  const azi = new Date(); azi.setHours(0, 0, 0, 0);
  const target = new Date(dataISO); target.setHours(0, 0, 0, 0);
  const zile = Math.round((target.getTime() - azi.getTime()) / 86400000);
  if (zile <= 0) return 'astăzi';
  if (zile === 1) return 'mâine';
  return `peste ${zile} zile`;
}

export const NewsfeedWidget: React.FC<NewsfeedWidgetProps> = ({ clubId, onNavigate }) => {
  const { data, isLoading } = useNewsfeed(clubId);
  const items = data?.items ?? [];
  const anunturi = data?.anunturi ?? [];

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-slate-500 text-sm italic">Se încarcă noutățile...</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <CalendarDaysIcon className="w-5 h-5 text-amber-400" /> Ce urmează
      </h3>

      {anunturi.length > 0 && (
        <div className="space-y-2">
          {anunturi.map(a => (
            <div key={a.id} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <BellIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-200">{a.titlu}</p>
                <p className="text-xs text-slate-300 mt-0.5">{a.continut}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-slate-500 text-sm italic py-2 text-center">Niciun eveniment programat.</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const Icon = TIP_ICON[item.tip] || CalendarDaysIcon;
            return (
              <button
                key={`${item.tip}-${item.id}`}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="w-full flex items-center justify-between gap-3 bg-slate-800/50 hover:bg-slate-700/60 rounded-lg p-3 border border-slate-700/30 hover:border-amber-400/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{item.titlu}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-semibold text-amber-400">{countdownLabel(item.data)}</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};
