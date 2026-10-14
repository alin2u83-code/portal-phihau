import React from 'react';
import { Sportiv, Familie, Grupa, Grad } from '../../types';
import { Card, Button, RoleBadge } from '../ui';
import { GradBadge } from '../../utils/grades';
import { formatNume } from '../../utils/formatareSportiv';
import { RestanteButton } from './RestanteSportiv';
import type { FacturaEntry } from '../../utils/facturiSportiv';

interface SportiviMobileListProps {
  sportivi: Sportiv[];
  onRowClick: (sportiv: Sportiv) => void;
  families: Familie[];
  restanteDe: (sportiv: Sportiv) => FacturaEntry[];
  onDeschideFactura: (plataId: string) => void;
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
  const { sportivi, onRowClick, families, restanteDe, onDeschideFactura, grupe, grade, requestSort, sortConfig } = props;

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
          const restante = restanteDe(sportiv);
          const grupa = grupe.find(g => g.id === sportiv.grupa_id);
          const grad = grade.find(g => g.id === sportiv.grad_actual_id);

          return (
            <Card key={sportiv.id} id={`row-${sportiv.id}`} onClick={() => onRowClick(sportiv)} className={`border-l-4 ${sportiv.status === 'Activ' ? 'border-green-500' : 'border-slate-600'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-white text-lg mb-1">{formatNume(sportiv)}</p>
                  <GradBadge grad={grad} />
                  <p className="text-sm text-slate-400 mt-2">{getAge(sportiv.data_nasterii)} ani - {grupa?.denumire || 'Fără grupă'}</p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {(sportiv.roluri || []).map(r => <RoleBadge key={r.id} role={r} />)}
                </div>
              </div>
              {(familie || restante.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  {familie && <p className="text-xs text-slate-300">Familia {familie.nume}</p>}
                  <RestanteButton facturi={restante} onDeschideFactura={onDeschideFactura} className="ml-auto" />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
