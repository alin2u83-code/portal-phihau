import React, { useState } from 'react';
import { Input, Select, ClubSelect } from '../ui';
import { Grupa, Rol, Grad, Club, Permissions } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';

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
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = [
    filters.searchTerm,
    filters.statusFilter,
    filters.grupaFilter,
    filters.rolFilter,
    filters.gradFilter,
    filters.clubFilter,
  ].filter(Boolean).length;

  const filterContent = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
      <Select
        label="Grupă"
        value={filters.grupaFilter}
        onChange={(e) => onFilterChange('grupaFilter', e.target.value)}
      >
        <option value="">Toate Grupele</option>
        <option value="fara-grupa">Fără Grupă</option>
        {grupe.map(g => (
          <option key={g.id} value={g.id}>
            {g.denumire || 'Fără denumire'}
          </option>
        ))}
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
        {[...(grade || [])].sort((a,b) => a.ordine - b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
      </Select>
      {permissions?.isFederationAdmin && clubs && (
        <ClubSelect
          clubs={clubs}
          value={filters.clubFilter || ''}
          onChange={(e) => onFilterChange('clubFilter', e.target.value)}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div data-tutorial="sportivi-filter" className="rounded-lg bg-slate-800/50 overflow-hidden">
        {/* Toggle bar */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filtre
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-amber-500 text-black">
                {activeCount}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expandable content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-slate-700">
            <div className="pt-3">
              {filterContent}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="mt-3 w-full py-2 rounded-lg bg-amber-500 text-black text-sm font-bold"
            >
              Aplică filtre →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-tutorial="sportivi-filter" className="rounded-lg bg-slate-800/50 p-4">
      {filterContent}
    </div>
  );
};
