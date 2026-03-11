import React from 'react';
import { Sportiv, Familie, Grupa, Grad } from '../../types';
import { Card, Button, RoleBadge } from '../ui';
import { WalletIcon } from '../icons';
import { GradBadge } from '../../utils/grades';

interface SportiviMobileListProps {
  sportivi: Sportiv[];
  onRowClick: (sportiv: Sportiv) => void;
  onOpenWallet: (sportiv: Sportiv) => void;
  families: Familie[];
  familyBalances: Map<string, number>;
  individualBalances: Map<string, number>;
  grupe: Grupa[];
  grade: Grad[];
  requestSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' }[];
}

const getAge = (dateString: string | null | undefined): number => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(birthDate.getTime())) { return 0; }
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
};

export const SportiviMobileList: React.FC<SportiviMobileListProps> = (props) => {
  const { sportivi, onRowClick, onOpenWallet, families, familyBalances, individualBalances, grupe, grade, requestSort, sortConfig } = props;

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['nume', 'grad_actual_id', 'status'].map(key => (
          <Button key={key} size="sm" variant={sortConfig.some(s => s.key === key) ? 'primary' : 'secondary'} onClick={() => requestSort(key)}>
            {key === 'nume' ? 'Nume' : key === 'grad_actual_id' ? 'Grad' : 'Status'}
            {sortConfig.find(s => s.key === key)?.direction === 'asc' ? ' ▲' : sortConfig.find(s => s.key === key)?.direction === 'desc' ? ' ▼' : ''}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sportivi.map(sportiv => {
          const familie = families.find(f => f.id === sportiv.familie_id);
          const familyBalance = familie ? familyBalances.get(familie.id) : undefined;
          const individualBalance = individualBalances.get(sportiv.id);
          const grupa = grupe.find(g => g.id === sportiv.grupa_id);
          const grad = grade.find(g => g.id === sportiv.grad_actual_id);

          return (
            <Card key={sportiv.id} onClick={() => onRowClick(sportiv)} className={`border-l-4 ${sportiv.status === 'Activ' ? 'border-green-500' : 'border-slate-600'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white text-lg mb-1">{sportiv.nume} {sportiv.prenume}</p>
                  <GradBadge grad={grad} />
                  <p className="text-sm text-slate-400 mt-2">{getAge(sportiv.data_nasterii)} ani - {grupa?.denumire || 'Fără grupă'}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {(sportiv.roluri || []).map(r => <RoleBadge key={r.id} role={r} />)}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                {familie && familyBalance !== undefined ? (
                  <div className="text-xs">
                    <p className="text-slate-300">Familia {familie.nume}</p>
                    <p className={`font-bold ${familyBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>Sold: {familyBalance.toFixed(2)} lei</p>
                  </div>
                ) : individualBalance !== undefined ? (
                  <div className="text-xs">
                    <p className="text-slate-300">Sold Individual</p>
                    <p className={`font-bold ${individualBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{individualBalance.toFixed(2)} lei</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); onOpenWallet(sportiv); }} className="w-full">
                  <WalletIcon className="w-4 h-4 mr-2" /> Portofel
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
