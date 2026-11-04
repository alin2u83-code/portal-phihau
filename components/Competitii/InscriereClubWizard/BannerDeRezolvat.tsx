import React from 'react';
import { Button } from '../../ui';

export interface ItemDeRezolvat { id: string; text: string; actiune: string; onClick: () => void }

// Atentionare galbena pentru lipsuri; fiecare rand are un buton care duce direct la zona de modificat
const BannerDeRezolvat: React.FC<{ items: ItemDeRezolvat[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-900/15 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-amber-400">De rezolvat ({items.length}):</p>
      {items.map(it => (
        <div key={it.id} className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-amber-300 min-w-0">{it.text}</p>
          <Button variant="secondary" size="sm" onClick={it.onClick}>{it.actiune}</Button>
        </div>
      ))}
    </div>
  );
};

export default BannerDeRezolvat;
