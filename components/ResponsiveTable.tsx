import React from 'react';
import { Input } from './ui';
import { Search } from 'lucide-react';

// --- TYPE DEFINITIONS ---

export interface Column<T> {
    key: keyof T | 'actions';
    label: string;
    render?: (item: T) => React.ReactNode;
    headerClassName?: string;
    cellClassName?: string;
    className?: string; // For responsive utilities
    tooltip?: string;
}

interface ResponsiveTableProps<T> {
    columns: Column<T>[];
    data: T[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onRowClick?: (item: T) => void;
    searchPlaceholder?: string;
    selectedRowId?: string | null;
    rowClassName?: (item: T) => string;
    onSort?: (key: string) => void;
    sortConfig?: { key: string; direction: 'asc' | 'desc' };
}

// --- MAIN COMPONENT ---

export function ResponsiveTable<T extends { id: string }>({
    columns,
    data,
    searchTerm,
    onSearchChange,
    onRowClick,
    searchPlaceholder = 'Caută...',
    selectedRowId,
    rowClassName,
    onSort,
    sortConfig,
}: ResponsiveTableProps<T>) {

    return (
        <div className="bg-[var(--bg-card)] rounded-lg shadow-md overflow-hidden border border-[var(--border-color)]">
            {/* Search Bar */}
            <div className="p-4 border-b border-[var(--border-color)]">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        label=""
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="!bg-[var(--bg-input)] !border-[var(--border-color)] !text-white !pl-10"
                    />
                </div>
            </div>

            {/* Unified Responsive Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="bg-[var(--bg-table-header)] text-xs text-[var(--brand-secondary)] uppercase">
                        <tr>
                            {columns.map(col => (
                                <th 
                                    key={String(col.key)} 
                                    scope="col" 
                                    className={`p-3 font-semibold ${col.headerClassName || ''} ${col.className || ''} ${onSort ? 'cursor-pointer' : ''}`}
                                    title={col.tooltip}
                                    onClick={() => onSort?.(String(col.key))}
                                >
                                    {col.label} {sortConfig && sortConfig.key === String(col.key) ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {data.map(item => (
                            <tr 
                                key={item.id} 
                                className={`${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-table-row-hover)]' : ''} ${item.id === selectedRowId ? 'selected-row-highlight' : ''} ${rowClassName ? rowClassName(item) : ''}`}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map(col => (
                                    <td 
                                        key={`${item.id}-${String(col.key)}`} 
                                        className={`p-3 align-top text-white ${col.cellClassName || ''} ${col.className || ''}`}
                                    >
                                        {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode) || '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {data.length === 0 && (
                <div className="p-12 text-center text-slate-500 italic">
                    Niciun rezultat găsit.
                </div>
            )}
        </div>
    );
}