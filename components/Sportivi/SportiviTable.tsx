import React from 'react';
import { Sportiv, Grupa, Grad } from '../../types';
import { ResponsiveTable, Column } from '../ResponsiveTable';
import { GradBadge } from '../../utils/grades';
import { Button, Card, RoleBadge } from '../ui';
import { EditIcon, WalletIcon, ShieldCheckIcon, TrashIcon } from '../icons';
import { getAge } from '../../utils/date';

interface SportiviTableProps {
  sportivi: Sportiv[];
  grupe: Grupa[];
  grade: Grad[];
  onRowClick: (sportiv: Sportiv) => void;
  onEdit: (sportiv: Sportiv) => void;
  onOpenWallet: (sportiv: Sportiv) => void;
  onOpenAccountSettings: (sportiv: Sportiv) => void;
  onDelete: (sportiv: Sportiv) => void;
  requestSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' }[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export const SportiviTable: React.FC<SportiviTableProps> = (props) => {
  const { sportivi, grupe, grade, onRowClick, onEdit, onOpenWallet, onOpenAccountSettings, onDelete, requestSort, sortConfig, searchTerm, onSearchChange, selectedIds, onSelectionChange } = props;

  const allSelected = sportivi.length > 0 && sportivi.every(s => selectedIds?.has(s.id));

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(new Set(sportivi.map(s => s.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectionChange(next);
  };

  const columns: Column<Sportiv>[] = [
    ...(onSelectionChange ? [{
        key: 'select',
        label: '',
        headerClassName: 'w-10',
        cellClassName: 'w-10',
        renderHeader: () => (
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand-primary cursor-pointer" />
        ),
        render: (s: Sportiv) => (
            <div onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selectedIds?.has(s.id) ?? false}
                    onChange={e => toggleOne(s.id, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-brand-primary cursor-pointer" />
            </div>
        ),
    } as Column<Sportiv>] : []),
    {
        key: 'nume',
        label: 'Nume Complet',
        tooltip: "Numele complet al sportivului.",
        render: (s) => (
            <div className="flex flex-col">
                <div className="font-bold text-white hover:text-brand-primary">
                    {s.nume} {s.prenume} 
                    <span className="ml-2 text-slate-400 font-normal">({getAge(s.data_nasterii)} ani)</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    {s.username || s.email || 'Fără cont'}
                </div>
            </div>
        ),
    },
    { 
        key: 'grad_actual_id', 
        label: 'Grad',
        tooltip: "Gradul actual al sportivului.",
        render: (s) => {
            const gradObj = grade.find(g => g.id === s.grad_actual_id);
            return <GradBadge grad={gradObj} />;
        }
    },
    {
        key: 'roluri',
        label: 'Roluri',
        tooltip: "Rolurile de acces în platformă.",
        className: 'hidden lg:table-cell',
        render: (s) => (
            <div className="flex flex-wrap gap-1">
                {(s.roluri || []).map(r => <RoleBadge key={r.id} role={r} />)}
            </div>
        )
    },
    { 
        key: 'status', 
        label: 'Status',
        tooltip: "Indică dacă sportivul este activ sau inactiv.",
        className: 'hidden md:table-cell',
        render: (s) => (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {s.status}
            </span>
        )
    },
    { key: 'grupa_id', label: 'Grupă', tooltip: "Grupa de antrenament.", render: (s) => {
        const denumire = grupe.find(g => g.id === s.grupa_id)?.denumire;
        return <span className="truncate max-w-[120px] block" title={denumire || '-'}>{denumire || '-'}</span>;
    }, className: 'hidden md:table-cell' },
    {
        key: 'actions',
        label: 'Acțiuni',
        tooltip: "Acțiuni rapide: gestionează portofelul, setările contului sau șterge.",
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (s) => (
            <div className="flex justify-end items-center gap-1 md:gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="secondary" onClick={() => onEdit(s)} title="Editează Profil" className="!p-1.5 md:!p-2">
                    <EditIcon className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="info" onClick={() => onOpenWallet(s)} title="Portofel Sportiv" className="!p-1.5 md:!p-2 flex items-center gap-1">
                    <WalletIcon className="w-4 h-4" />
                    <span className="hidden lg:inline text-xs font-bold">Portofel</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onOpenAccountSettings(s)} title="Setări Cont de Acces" className="!p-1.5 md:!p-2">
                    <ShieldCheckIcon className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(s)} title="Șterge Sportiv" className="!p-1.5 md:!p-2">
                    <TrashIcon className="w-4 h-4" />
                </Button>
            </div>
        )
    }
];

  const renderMobileItem = (sportiv: Sportiv) => {
      const grad = grade.find(g => g.id === sportiv.grad_actual_id);
      const grupa = grupe.find(g => g.id === sportiv.grupa_id);

      return (
          <Card className={`border-l-4 ${sportiv.status === 'Activ' ? 'border-green-500' : 'border-slate-600'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white text-lg mb-1">{sportiv.nume} {sportiv.prenume}</p>
                <div className="flex items-center gap-2 mb-2">
                    <GradBadge grad={grad} />
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sportiv.status === 'Activ' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {sportiv.status}
                    </span>
                </div>
                <p className="text-sm text-slate-400">{getAge(sportiv.data_nasterii)} ani - {grupa?.denumire || 'Fără grupă'}</p>
              </div>
              <div className="flex flex-wrap gap-1 justify-end max-w-[100px]">
                {(sportiv.roluri || []).map(r => <RoleBadge key={r.id} role={r} />)}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                <div className="flex gap-2">
                     <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onEdit(sportiv); }} className="!p-2">
                        <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onOpenAccountSettings(sportiv); }} className="!p-2">
                        <ShieldCheckIcon className="w-4 h-4" />
                    </Button>
                     <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(sportiv); }} className="!p-2">
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
                <Button size="sm" variant="info" onClick={(e) => { e.stopPropagation(); onOpenWallet(sportiv); }}>
                    <WalletIcon className="w-4 h-4 mr-2" /> Portofel
                </Button>
            </div>
          </Card>
      );
  };

  return (
    <ResponsiveTable
      columns={columns}
      data={sportivi}
      onRowClick={onRowClick}
      onSort={requestSort}
      sortConfig={sortConfig}
      renderMobileItem={renderMobileItem}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      pageSize={10}
      disablePagination
      cardBreakpoint={1024}
      cardContainerClassName="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 sm:p-4"
    />
  );
};
