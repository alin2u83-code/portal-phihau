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
        <div className="glass-card rounded-2xl shadow-xl overflow-hidden border border-slate-800">
            <div className="p-5 border-b border-slate-800 bg-slate-900/40">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            {columns.map(col => (
                                <th key={String(col.key)} scope="col" className={`px-6 py-4 border-b border-slate-800 ${col.headerClassName || ''}`} title={col.tooltip}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.map(item => (
                            <tr 
                                key={item.id} 
                                className={`transition-colors group ${onRowClick ? 'cursor-pointer hover:bg-blue-600/5' : ''} ${item.id === selectedRowId ? 'bg-blue-600/10' : ''} ${rowClassName ? rowClassName(item) : ''}`} 
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map(col => (
                                    <td key={`${item.id}-${String(col.key)}`} className={`px-6 py-4 align-middle font-medium ${col.cellClassName || ''}`}>
                                        {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode) || '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile/Tablet Card List */}
            <div className="lg:hidden p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => onRowClick?.(item)} 
                        className={`bg-slate-900/40 p-5 rounded-2xl border border-slate-800 shadow-sm transition-all active:scale-95 ${onRowClick ? 'cursor-pointer' : ''} ${item.id === selectedRowId ? 'ring-2 ring-blue-500 border-transparent' : ''} ${rowClassName ? rowClassName(item) : ''}`}
                    >
                        {columns.map((col, idx) => (
                             <div key={String(col.key)} className={`flex justify-between items-start gap-4 ${idx !== columns.length - 1 ? 'mb-3 pb-3 border-b border-slate-800/50' : ''}`}>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{col.label}</span>
                                <div className="text-right text-sm">
                                    {col.render ? col.render(item) : <span className="text-white font-bold">{(item[col.key as keyof T] as React.ReactNode) || '-'}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {data.length === 0 && (
                <div className="p-16 text-center text-slate-600 font-bold italic uppercase tracking-widest text-xs">
                    Niciun record identificat
                </div>
            )}
        </div>
    );
}
