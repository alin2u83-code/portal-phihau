import React from 'react';
import { Input, Button } from './ui';
import { SearchIcon } from './icons';
import { useIsMobile } from '../hooks/useIsMobile';

// --- TYPE DEFINITIONS ---

export interface Column<T> {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    renderHeader?: () => React.ReactNode;
    headerClassName?: string;
    cellClassName?: string;
    className?: string; // For responsive utilities
    tooltip?: string;
}

export interface ResponsiveTableProps<T> {
    columns: Column<T>[];
    data: T[];
    onRowClick?: (item: T) => void;
    selectedRowId?: string | null;
    rowClassName?: (item: T) => string;
    onSort?: (key: any, shiftKey: boolean) => void;
    sortConfig?: { key: string; direction: 'asc' | 'desc' } | { key: string; direction: 'asc' | 'desc' }[];
    searchTerm?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    renderMobileItem?: (item: T) => React.ReactNode;
    pageSize?: number;
    idKey?: keyof T;
    detailsHeight?: number;
    /** Lățimea maximă (px) sub care se activează card layout. Default: 768 (mobil). Setează 1024 pentru a activa și pe tabletă. */
    cardBreakpoint?: number;
    /** Clasa CSS pentru containerul card-urilor. Default: 'divide-y divide-[var(--border-color)]' */
    cardContainerClassName?: string;
    /** Dezactivează paginarea internă. Util când părintele gestionează paginarea server-side. */
    disablePagination?: boolean;
}

// --- MAIN COMPONENT ---

export function ResponsiveTable<T>({
    columns,
    data,
    onRowClick,
    selectedRowId,
    rowClassName,
    onSort,
    sortConfig,
    searchTerm,
    onSearchChange,
    searchPlaceholder,
    renderMobileItem,
    idKey = 'id' as keyof T,
    pageSize = 10,
    detailsHeight = 0,
    cardBreakpoint = 768,
    cardContainerClassName,
    disablePagination = false,
}: ResponsiveTableProps<T>) {
    const isMobile = useIsMobile();
    // Track window width only when a custom cardBreakpoint above 768px is needed
    const [windowWidth, setWindowWidth] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
    React.useEffect(() => {
        if (cardBreakpoint <= 768) return; // isMobile already covers this case
        const onResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [cardBreakpoint]);
    const useCardLayout = renderMobileItem != null && (cardBreakpoint > 768 ? windowWidth < cardBreakpoint : isMobile);
    const [currentPage, setCurrentPage] = React.useState(1);

    const paginatedData = React.useMemo(() => {
        if (!data) return [];
        if (disablePagination || !pageSize) return data;
        const start = (currentPage - 1) * pageSize;
        return data.slice(start, start + pageSize);
    }, [data, currentPage, pageSize, disablePagination]);

    const safeData = data || [];
    const totalPages = disablePagination ? 1 : Math.ceil(safeData.length / pageSize);

    return (
        <div className="bg-[var(--bg-card)] rounded-lg shadow-md overflow-hidden border border-[var(--border-color)]">
            {/* Render search input if onSearchChange handler is provided. */}
            {onSearchChange && (
                <div className="p-4 border-b border-[var(--border-color)]">
                    <div className="relative w-full max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            label=""
                            type="text"
                            value={searchTerm || ''}
                            onChange={(e) => {
                                setCurrentPage(1);
                                onSearchChange(e.target.value);
                            }}
                            placeholder={searchPlaceholder || "Caută..."}
                            className="!pl-10"
                        />
                    </div>
                </div>
            )}
            
            {/* Mobile/Tablet Card View */}
            {useCardLayout ? (
                <div className={cardContainerClassName ?? 'divide-y divide-[var(--border-color)]'}>
                    {paginatedData.map((item, index) => (
                        <div key={String(item[idKey] || index)} onClick={() => onRowClick?.(item)}>
                            {renderMobileItem!(item)}
                        </div>
                    ))}
                </div>
            ) : (
                /* Desktop/Tablet View (or Mobile fallback) */
                <div className="overflow-x-auto relative">
                    <table className="w-full text-sm text-left text-slate-300 border-separate border-spacing-0">
                        <thead>
                            <tr>
                                {columns.map(col => (
                                    <th 
                                        key={String(col.key)} 
                                        scope="col" 
                                        className={`
                                            p-3 font-semibold 
                                            sticky z-20 bg-[var(--bg-table-header)] 
                                            border-b border-[var(--border-color)]
                                            ${col.headerClassName || ''} 
                                            ${col.className || ''} 
                                            ${onSort ? 'cursor-pointer' : ''}
                                        `}
                                        style={{
                                            top: detailsHeight > 0 ? `${detailsHeight - 90}px` : '0px',
                                            boxShadow: 'inset 0 -1px 0 var(--border-color)'
                                        }}
                                        title={col.tooltip}
                                        onClick={(e) => {
                                            setCurrentPage(1);
                                            onSort?.(String(col.key), e.shiftKey);
                                        }}
                                    >
                                        {col.renderHeader ? col.renderHeader() : col.label} {!col.renderHeader && (() => {
                                                if (!sortConfig) return '';
                                                const configs = Array.isArray(sortConfig) ? sortConfig : [sortConfig];
                                                const config = configs.find(c => c.key === String(col.key));
                                                if (!config) return '';
                                                const index = configs.indexOf(config);
                                                const indicator = config.direction === 'asc' ? '▲' : '▼';
                                                return configs.length > 1 ? `${indicator}${index + 1}` : indicator;
                                            })()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {paginatedData.map((item, index) => (
                                <tr 
                                    key={String(item[idKey] || index)} 
                                    className={`${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-table-row-hover)]' : ''} ${item[idKey] === selectedRowId ? 'selected-row-highlight' : ''} ${rowClassName ? rowClassName(item) : ''}`}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {columns.map(col => (
                                        <td 
                                            key={`${String(item[idKey] || index)}-${String(col.key)}`} 
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
            )}
            
            {safeData.length === 0 && (
                <div className="p-12 text-center text-slate-500 italic">
                    Niciun rezultat găsit.
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-[var(--border-color)] flex justify-between items-center">
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-slate-400">Pagina {currentPage} din {totalPages}</span>
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Următor
                    </Button>
                </div>
            )}
        </div>
    );
}
