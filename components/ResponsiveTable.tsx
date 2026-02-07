import React from 'react';
import { Input } from './ui';
import { Search } from 'lucide-react';

export interface Column<T> {
    key: keyof T | 'actions';
    label: string;
    render?: (item: T) => React.ReactNode;
    headerClassName?: string;
    cellClassName?: string;
    tooltip?: string;
}

interface ResponsiveTableProps<T extends { id: string }> {
    columns: Column<T>[];
    data: T[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onRowClick?: (item: T) => void;
    searchPlaceholder?: string;
    selectedRowId?: string | null;
    rowClassName?: (item: T) => string;
}

export function ResponsiveTable<T extends { id: string }>({
    columns,
    data,
    searchTerm,
    onSearchChange,
    onRowClick,
    searchPlaceholder = 'Caută...',
    selectedRowId,
    rowClassName,
}: ResponsiveTableProps<T>) {

    return (
        <div className="bg-brand-card rounded-2xl shadow-md overflow-hidden border border-slate-700">
            <div className="p-4 border-b border-slate-700">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <Input
                        label=""
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="!bg-slate-800/50 !border-slate-700 !pl-10 !h-11"
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                        <tr>
                            {columns.map(col => (
                                <th key={String(col.key)} scope="col" className={`px-6 py-4 font-semibold ${col.headerClassName || ''}`} title={col.tooltip}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {data.map(item => (
                            <tr key={item.id} className={`${onRowClick ? 'cursor-pointer hover:bg-slate-800/40' : ''} ${item.id === selectedRowId ? 'bg-brand-primary/10' : ''} ${rowClassName ? rowClassName(item) : ''}`} onClick={() => onRowClick?.(item)}>
                                {columns.map(col => (
                                    <td key={`${item.id}-${String(col.key)}`} className={`px-6 py-4 align-middle ${col.cellClassName || ''}`}>
                                        {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode) || '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile/Tablet Card List */}
            <div className="lg:hidden p-4 space-y-4">
                {data.map(item => (
                    <div key={item.id} onClick={() => onRowClick?.(item)} className={`bg-slate-800/50 p-4 rounded-xl border border-slate-700 ${onRowClick ? 'cursor-pointer' : ''} ${item.id === selectedRowId ? 'ring-2 ring-brand-primary' : ''} ${rowClassName ? rowClassName(item) : ''}`}>
                        {columns.map(col => (
                             <div key={String(col.key)} className="flex justify-between items-start gap-4 py-2 border-b border-slate-700/50 last:border-none">
                                <span className="text-xs font-bold text-slate-400 uppercase">{col.label}</span>
                                <div className="text-right text-sm">
                                    {col.render ? col.render(item) : <span className="text-white font-medium">{(item[col.key as keyof T] as React.ReactNode) || '-'}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {data.length === 0 && (
                <div className="p-12 text-center text-slate-500 italic">
                    Niciun rezultat găsit.
                </div>
            )}
        </div>
    );
}
