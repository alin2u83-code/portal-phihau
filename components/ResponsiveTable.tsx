import React from 'react';
import { Input } from './ui';
import { Search } from 'lucide-react';

// --- TYPE DEFINITIONS ---

export interface Column<T> {
    key: keyof T | 'actions';
    label: string;
    isEssential?: boolean; // If true, visible on mobile
    render?: (item: T) => React.ReactNode;
    headerClassName?: string;
    cellClassName?: string;
}

interface ResponsiveTableProps<T> {
    columns: Column<T>[];
    data: T[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onRowClick?: (item: T) => void;
    searchPlaceholder?: string;
}

// --- MAIN COMPONENT ---

export function ResponsiveTable<T extends { id: string }>({
    columns,
    data,
    searchTerm,
    onSearchChange,
    onRowClick,
    searchPlaceholder = 'Caută...',
}: ResponsiveTableProps<T>) {

    const essentialColumns = columns.filter(c => c.isEssential);
    const mainColumn = essentialColumns.find(c => c.key !== 'actions') || essentialColumns[0];
    const actionColumn = essentialColumns.find(c => c.key === 'actions');
    const otherColumns = essentialColumns.filter(c => c.key !== mainColumn?.key && c.key !== 'actions');

    return (
        <div className="bg-[var(--card-bg)] rounded-lg shadow-md overflow-hidden border border-[var(--border-color)]">
            {/* Search Bar */}
            <div className="p-4 border-b border-[var(--border-color)]">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
                    <Input
                        label=""
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="!pl-10"
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm text-left text-[var(--text-secondary)]">
                    <thead className="bg-[var(--table-header-bg)] text-xs text-blue-400 uppercase">
                        <tr>
                            {columns.map(col => (
                                <th 
                                    key={String(col.key)} 
                                    scope="col" 
                                    className={`p-3 font-semibold ${col.headerClassName || ''}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {data.map(item => (
                            <tr 
                                key={item.id} 
                                className={`${onRowClick ? 'cursor-pointer hover:bg-[var(--table-row-hover-bg)]' : ''}`}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map(col => (
                                    <td 
                                        key={`${item.id}-${String(col.key)}`} 
                                        className={`p-3 align-top text-white ${col.cellClassName || ''}`}
                                    >
                                        {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode) || '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-4">
                {data.map(item => (
                    <div 
                        key={item.id} 
                        className="bg-[var(--card-mobile-bg)] p-4 rounded-lg border border-[var(--border-color)]" 
                        onClick={() => onRowClick?.(item)}
                    >
                        {mainColumn && (
                            <div className="mb-3 pb-3 border-b border-[var(--border-color)] text-lg">
                                {mainColumn.render ? mainColumn.render(item) : (item[mainColumn.key as keyof T] as React.ReactNode) || '-'}
                            </div>
                        )}
                        <div className="space-y-2">
                            {otherColumns.map(col => (
                                <div key={String(col.key)} className="flex justify-between items-start text-sm">
                                    <span className="font-semibold text-[var(--text-secondary)]">{col.label}</span>
                                    <div className="text-right text-white">
                                        {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode) || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {actionColumn && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                                {actionColumn.render ? actionColumn.render(item) : null}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {data.length === 0 && (
                <div className="p-12 text-center text-[var(--text-tertiary)] italic">
                    Niciun rezultat găsit.
                </div>
            )}
        </div>
    );
}