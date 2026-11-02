import React from 'react';
import { View } from '../types';
import { Card, Button, Skeleton } from './ui';
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

const MAX_VIZIBILE = 3;

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
  const [arataTot, setArataTot] = React.useState(false);
  const items = data?.items ?? [];
  const anunturi = data?.anunturi ?? [];

  if (isLoading) {
    return (
      <Card className="md:p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    );
  }

  // Anunturile primele, apoi evenimentele; lista combinata e limitata la 3 pana la "Vezi toate".
  const lista = [
    ...anunturi.map(a => ({ kind: 'anunt' as const, key: `a-${a.id}`, anunt: a })),
    ...items.map(i => ({ kind: 'eveniment' as const, key: `${i.tip}-${i.id}`, item: i })),
  ];
  const vizibile = arataTot ? lista : lista.slice(0, MAX_VIZIBILE);

  return (
    <Card className="md:p-6 space-y-3">
      <h2 className="text-base font-semibold text-[var(--t-text)]">Anunțuri</h2>

      {lista.length === 0 ? (
        <div className="py-2">
          <p className="text-base font-semibold text-[var(--t-text)]">Niciun anunț</p>
          <p className="text-sm text-[var(--t-text-muted)] mt-1">Anunțurile clubului vor apărea aici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vizibile.map(el => {
            if (el.kind === 'anunt') {
              return (
                <div key={el.key} className="flex items-start gap-2 border border-[var(--t-border)] rounded-lg p-3">
                  <BellIcon className="w-4 h-4 text-[var(--t-text-muted)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--t-text)]">{el.anunt.titlu}</p>
                    <p className="text-xs text-[var(--t-text-muted)] mt-0.5">{el.anunt.continut}</p>
                  </div>
                </div>
              );
            }
            const Icon = TIP_ICON[el.item.tip] || CalendarDaysIcon;
            return (
              <button
                key={el.key}
                type="button"
                onClick={() => onNavigate(el.item.view)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border border-[var(--t-border)] p-3 hover:border-[var(--t-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-input-focus-ring)] transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-[var(--t-text-muted)] shrink-0" />
                  <span className="text-sm text-[var(--t-text)] truncate">{el.item.titlu}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-semibold text-[var(--t-text-muted)]">{countdownLabel(el.item.data)}</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--t-text-muted)]" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {lista.length > MAX_VIZIBILE && (
        <Button type="button" variant="secondary" ghost size="sm" onClick={() => setArataTot(v => !v)}>
          {arataTot ? 'Arată mai puține' : 'Vezi toate'}
        </Button>
      )}
    </Card>
  );
};
