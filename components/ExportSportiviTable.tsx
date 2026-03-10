import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { DownloadIcon, SaveIcon, XIcon } from './icons';
import { useError } from './ErrorProvider';

export const ExportSportiviTable: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [sportivi, setSportivi] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { showSuccess, showError } = useError();

    // State for inline editing
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        fetchSportivi();
    }, []);

    const fetchSportivi = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sportivi')
            .select('id, nume, prenume, locul_nasterii, cetatenia, departament')
            .order('nume', { ascending: true });

        if (error) {
            showError("Eroare", "Nu s-au putut încărca sportivii.");
        } else {
            setSportivi(data || []);
        }
        setLoading(false);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredSportivi.map(s => s.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const startEditing = (id: string, field: string, value: string) => {
        setEditingCell({ id, field });
        setEditValue(value || '');
    };

    const saveEdit = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;

        // Optimistic update
        setSportivi(prev => prev.map(s => s.id === id ? { ...s, [field]: editValue } : s));
        setEditingCell(null);

        const { error } = await supabase
            .from('sportivi')
            .update({ [field]: editValue })
            .eq('id', id);

        if (error) {
            showError("Eroare", "Nu s-a putut salva modificarea.");
            fetchSportivi(); // Revert on error
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const handleExport = async () => {
        if (selectedIds.size === 0) {
            showError("Atenție", "Selectați cel puțin un sportiv pentru export.");
            return;
        }

        setExporting(true);
        try {
            const { data, error } = await supabase.rpc('export_sportivi_selectati', {
                p_sportivi_ids: Array.from(selectedIds)
            });

            if (error) throw error;

            if (data && data.length > 0) {
                // Convert to CSV
                const headers = Object.keys(data[0]);
                const csvRows = [];
                csvRows.push(headers.join(','));

                for (const row of data) {
                    const values = headers.map(header => {
                        const val = row[header];
                        const escaped = ('' + (val || '')).replace(/"/g, '""');
                        return `"${escaped}"`;
                    });
                    csvRows.push(values.join(','));
                }

                const csvString = csvRows.join('\n');
                const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', 'export_sportivi.csv');
                a.style.visibility = 'hidden';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                showSuccess("Succes", "Fișierul a fost descărcat.");
            } else {
                showError("Atenție", "Nu s-au găsit date pentru export.");
            }
        } catch (err: any) {
            showError("Eroare Export", err.message);
        } finally {
            setExporting(false);
        }
    };

    const filteredSportivi = useMemo(() => {
        if (!searchTerm) return sportivi;
        const lower = searchTerm.toLowerCase();
        return sportivi.filter(s => 
            (s.nume?.toLowerCase().includes(lower) || '') ||
            (s.prenume?.toLowerCase().includes(lower) || '')
        );
    }, [sportivi, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Export & Editare Rapidă</h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        <XIcon className="w-4 h-4 mr-1" /> Închide
                    </Button>
                    <Button variant="primary" onClick={handleExport} isLoading={exporting} disabled={selectedIds.size === 0}>
                        <DownloadIcon className="w-4 h-4 mr-1" /> Exportă Selecția ({selectedIds.size})
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="mb-4">
                    <Input 
                        label="Caută sportiv"
                        placeholder="Caută sportiv..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-200 uppercase text-xs">
                            <tr>
                                <th className="p-3 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                                        checked={filteredSportivi.length > 0 && selectedIds.size === filteredSportivi.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="p-3">Nume</th>
                                <th className="p-3">Prenume</th>
                                <th className="p-3">Locul Nașterii (Click pt. editare)</th>
                                <th className="p-3">Cetățenia (Click pt. editare)</th>
                                <th className="p-3">Departament (Click pt. editare)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center">Se încarcă...</td></tr>
                            ) : filteredSportivi.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">Niciun sportiv găsit.</td></tr>
                            ) : filteredSportivi.map(s => (
                                <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                                            checked={selectedIds.has(s.id)}
                                            onChange={() => handleSelectRow(s.id)}
                                        />
                                    </td>
                                    <td className="p-3 font-medium text-white">{s.nume}</td>
                                    <td className="p-3 font-medium text-white">{s.prenume}</td>
                                    
                                    {/* Editable Cells */}
                                    {['locul_nasterii', 'cetatenia', 'departament'].map(field => (
                                        <td 
                                            key={field} 
                                            className="p-3 cursor-pointer hover:bg-slate-700/50"
                                            onClick={() => startEditing(s.id, field, s[field])}
                                        >
                                            {editingCell?.id === s.id && editingCell?.field === field ? (
                                                <input 
                                                    autoFocus
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveEdit}
                                                    onKeyDown={handleKeyDown}
                                                    className="w-full bg-slate-900 border border-brand-primary rounded px-2 py-1 text-white text-sm focus:outline-none"
                                                />
                                            ) : (
                                                <span className={!s[field] ? 'text-slate-500 italic' : ''}>
                                                    {s[field] || '-'}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
