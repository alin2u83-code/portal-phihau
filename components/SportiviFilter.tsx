import React from 'react';
import { Input, Select } from './ui';
import { SearchIcon } from './icons';
import { Grupa, Rol, Grad, Club, Permissions } from '../types';

interface SportiviFilterProps {
  filters: {
    searchTerm: string;
    statusFilter: string;
    grupaFilter: string;
    rolFilter: string;
    gradFilter: string;
    clubFilter?: string;
  };
  onFilterChange: (name: string, value: string) => void;
  grupe: Grupa[];
  allRoles: Rol[];
  grade: Grad[];
  clubs?: Club[];
  permissions?: Permissions;
}

export const SportiviFilter: React.FC<SportiviFilterProps> = ({ filters, onFilterChange, grupe, allRoles, grade, clubs, permissions }) => {
  const showClubFilter = permissions?.isFederationAdmin && clubs && clubs.length > 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${showClubFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 mb-4 p-4 rounded-lg bg-slate-800/50`}>
      <Input
        label="Caută sportiv"
        placeholder="Nume, prenume..."
        value={filters.searchTerm}
        onChange={(e) => onFilterChange('searchTerm', e.target.value)}
      />
      <Select
        label="Status"
        value={filters.statusFilter}
        onChange={(e) => onFilterChange('statusFilter', e.target.value)}
      >
        <option value="">Toate Statusurile</option>
        <option value="Activ">Activ</option>
        <option value="Inactiv">Inactiv</option>
      </Select>
      {showClubFilter && (
        <Select
            label="Club"
            value={filters.clubFilter || ''}
            onChange={(e) => onFilterChange('clubFilter', e.target.value)}
        >
            <option value="">Toate Cluburile</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
        </Select>
      )}
      <Select
        label="Grupă"
        value={filters.grupaFilter}
        onChange={(e) => onFilterChange('grupaFilter', e.target.value)}
      >
        <option value="">Toate Grupele</option>
        {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
      </Select>
      <Select
        label="Rol"
        value={filters.rolFilter}
        onChange={(e) => onFilterChange('rolFilter', e.target.value)}
      >
        <option value="">Toate Rolurile</option>
        {(allRoles || []).map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}
      </Select>
      <Select
        label="Grad"
        value={filters.gradFilter}
        onChange={(e) => onFilterChange('gradFilter', e.target.value)}
      >
        <option value="">Toate Gradele</option>
        <option value="null">Fără Grad</option>
        {(grade || []).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
      </Select>
    </div>
  );
};
