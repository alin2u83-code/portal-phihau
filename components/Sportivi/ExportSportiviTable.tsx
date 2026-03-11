import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Card, Input } from '../ui';
import { DownloadIcon, XIcon } from '../icons';
import { useError } from '../ErrorProvider';

export const ExportSportiviTable: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [sportivi, setSportivi] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filters
    const [categorieFilter, setCategorieFilter] = useState('');
    const [genFilter, setGenFilter] = useState('');
    const [departamentFilter, setDepartamentFilter] = useState('');

    const { showSuccess, showError } = useError();

    // State for inline editing
    const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSportivi();
    }, []);

    const fetchSportivi = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vedere_federatie_sportivi')
            .select('*')
            .order('nume', { ascending: true });

        if (error) {
            console.error("Fetch Sportivi Error:", error);
            showError("Eroare", "Nu s-au putut încărca sportivii.");
        } else {
            setSportivi(data || []);
        }
        setLoading(false);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const newSelected = new Set(selectedIds);
            filteredSportivi.forEach(s => newSelected.add(s.id));
            setSelectedIds(newSelected);
        } else {
            const newSelected = new Set(selectedIds);
            filteredSportivi.forEach(s => newSelected.delete(s.id));
            setSelectedIds(newSelected);
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
        if (!id) {
            showError("Eroare", "Sportivul nu are un ID valid.");
            return;
        }
        setEditingCell({ id, field });
        setEditValue(value || '');
    };

    const saveEdit = async () => {
        if (!editingCell || isSaving) return;
        const { id, field } = editingCell;
        
        console.log("Saving edit for:", { id, field, editValue });
        
        const sportiv = sportivi.find(s => s.id === id);
        console.log("Found sportiv:", sportiv);

        if (!id) {
            showError("Eroare", "ID-ul sportivului este nedefinit.");
            return;
        }

        setIsSaving(true);
        // Optimistic update
        setSportivi(prev => prev.map(s => s.id === id ? { ...s, [field]: editValue } : s));
        setEditingCell(null);

        try {
            if (field === 'nr_pasaport' || field === 'judet' || field === 'club_judet') {
                // Handle JSONB update for custom fields
                const { data: current, error: fetchError } = await supabase
                    .from('sportivi')
                    .select('custom_fields')
                    .eq('id', id)
                    .single();
                
                if (fetchError) throw fetchError;

                const newCustomFields = { ...(current?.custom_fields || {}), [field]: editValue };
                const { error } = await supabase
                    .from('sportivi')
                    .update({ custom_fields: newCustomFields })
                    .eq('id', id);
                
                if (error) throw error;
            } else if (field === 'nr_legitimatie_maestru') {
                // Handle update for titluri_sportive
                const { error } = await supabase
                    .from('titluri_sportive')
                    .upsert({ 
                        sportiv_id: id, 
                        nr_legitimatie: editValue, 
                        tip_titlu: 'Maestru al Sportului' 
                    }, { onConflict: 'sportiv_id' });
                
                if (error) throw error;
            } else {
                // Standard field update
                const tableField = field === 'nr_legitimatie_federatie' ? 'nr_legitimatie' : field;
                const { error } = await supabase
                    .from('sportivi')
                    .update({ [tableField]: editValue })
                    .eq('id', id);
                
                if (error) throw error;
            }
            showSuccess("Succes", "Modificare salvată.");
            // Refresh to get calculated fields (like Categorie) or joined data
            fetchSportivi();
        } catch (error: any) {
            console.error("Save Edit Error:", error);
            showError("Eroare", `Nu s-a putut salva modificarea pentru ${field}. ${error.message}`);
            fetchSportivi(); // Revert on error
        } finally {
            setIsSaving(false);
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
            // We use client-side data for export to ensure exact formatting and avoid RPC type mismatch errors
            // (RPC Error 42804: character varying(13) vs text)
            const exportData = sportivi
                .filter(s => selectedIds.has(s.id))
                .map((s, index) => ({
                    'Nr.crt': index + 1,
                    'NUME SPORTIV': s.nume || '',
                    'PRENUME SPORTIV': s.prenume || '',
                    'CATEGORIE SPORTIV seniori, tineret, juniori, cadeți, copii': s.categorie || '',
                    'SEX': s.gen || '',
                    'CNP': s.cnp || '',
                    'DATA NAȘTERII': s.data_nasterii || '',
                    'JUDEȚUL': s.judet || '',
                    'LOCUL NAȘTERII': s.locul_nasterii || '',
                    'ADRESA: LOCALITATE, STRADA, NR., BLOC, ETC.': s.adresa || '',
                    'NR. PAȘAPORT SPORTIV/NU ARE': s.nr_pasaport || '',
                    'CETĂȚENIA': s.cetatenia || '',
                    'JUDEȚ UNDE ESTE INREGISTRAT CLUBUL': s.club_judet || '',
                    'DENUMIRE CLUB': s.club_nume || '',
                    'DEPARTAMENT': s.departament || '',
                    'MAESTRU EMERIT AL SPORTULUI / MAESTRU AL SPORTULUI DA/NU': (s.tip_titlu && s.tip_titlu !== 'Niciunul') ? 'DA' : 'NU'
                }));

            if (exportData && exportData.length > 0) {
                // Convert to CSV
                const headers = Object.keys(exportData[0]);
                const csvRows = [];
                csvRows.push(headers.join(','));

                for (const row of exportData) {
                    const values = headers.map(header => {
                        const val = row[header];
                        const valStr = '' + (val || '');
                        const escaped = valStr.replace(/"/g, '""');
                        
                        // Export CNP as a number (no quotes) to avoid Excel text errors
                        // and satisfy the user request "exportul cnp-ului sa fie numar"
                        if (header === 'CNP' && /^\d+$/.test(valStr)) {
                            return escaped;
                        }
                        
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
        return sportivi.filter(s => {
            const matchesSearch = !searchTerm || 
                (s.nume?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
                (s.prenume?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
                (s.cnp?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
            
            const matchesCategorie = !categorieFilter || s.categorie === categorieFilter;
            const matchesGen = !genFilter || s.gen === genFilter;
            const matchesDepartament = !departamentFilter || s.departament === departamentFilter;

            return matchesSearch && matchesCategorie && matchesGen && matchesDepartament;
        });
    }, [sportivi, searchTerm, categorieFilter, genFilter, departamentFilter]);

    // Unique values for filters
    const categories = useMemo(() => Array.from(new Set(sportivi.map(s => s.categorie).filter(Boolean))), [sportivi]);
    const genuri = useMemo(() => Array.from(new Set(sportivi.map(s => s.gen).filter(Boolean))), [sportivi]);
    const departamente = useMemo(() => Array.from(new Set(sportivi.map(s => s.departament).filter(Boolean))), [sportivi]);

    const fields = [
        { key: 'nume', label: 'Nume', editable: true, type: 'text' },
        { key: 'prenume', label: 'Prenume', editable: true, type: 'text' },
        { key: 'cnp', label: 'CNP', editable: true, type: 'text' },
        { key: 'data_nasterii', label: 'Data Nașterii', editable: true, type: 'date' },
        { key: 'gen', label: 'Sex', editable: true, type: 'select', options: ['Masculin', 'Feminin'] },
        { key: 'locul_nasterii', label: 'Locul Nașterii', editable: true, type: 'text' },
        { key: 'cetatenia', label: 'Cetățenie', editable: true, type: 'text' },
        { key: 'judet', label: 'Județ', editable: true, type: 'text' },
        { key: 'adresa', label: 'Adresa', editable: true, type: 'textarea' },
        { key: 'departament', label: 'Departament', editable: true, type: 'text' },
        { key: 'nr_legitimatie_federatie', label: 'Legitimație Fed.', editable: true, type: 'text' },
        { key: 'nr_pasaport', label: 'Pașaport', editable: true, type: 'text' },
        { key: 'nr_legitimatie_maestru', label: 'Nr. Leg. Maestru', editable: true, type: 'text' },
        { key: 'club_judet', label: 'Județ Club', editable: true, type: 'text' },
        { key: 'club_nume', label: 'Club', editable: false, type: 'text' },
        { key: 'categorie', label: 'Categorie', editable: false, type: 'text' }
    ];

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                        <Input 
                            label="Caută sportiv"
                            placeholder="Nume, Prenume, CNP..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Categorie</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                            value={categorieFilter}
                            onChange={(e) => setCategorieFilter(e.target.value)}
                        >
                            <option value="">Toate Categoriile</option>
                            {categories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Sex</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                            value={genFilter}
                            onChange={(e) => setGenFilter(e.target.value)}
                        >
                            <option value="">Toate Genurile</option>
                            {genuri.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 ml-1">Departament</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-primary"
                            value={departamentFilter}
                            onChange={(e) => setDepartamentFilter(e.target.value)}
                        >
                            <option value="">Toate Departamentele</option>
                            {departamente.map(d => <option key={d as string} value={d as string}>{d as string}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-200 uppercase text-[10px] whitespace-nowrap">
                            <tr>
                                <th className="p-2 w-10 text-center sticky left-0 bg-slate-800 z-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                                        checked={filteredSportivi.length > 0 && filteredSportivi.every(s => selectedIds.has(s.id))}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="p-2 w-10 text-center">Nr.</th>
                                {fields.map(f => (
                                    <th key={f.key} className="p-2">{f.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr><td colSpan={fields.length + 2} className="p-8 text-center">Se încarcă...</td></tr>
                            ) : filteredSportivi.length === 0 ? (
                                <tr><td colSpan={fields.length + 2} className="p-8 text-center text-slate-500 italic">Niciun sportiv găsit.</td></tr>
                            ) : filteredSportivi.map((s, index) => (
                                <tr key={s.id || index} className="hover:bg-slate-800/50 transition-colors whitespace-nowrap">
                                    <td className="p-2 text-center sticky left-0 bg-slate-900 group-hover:bg-slate-800/50">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-slate-600 bg-slate-700 text-brand-primary focus:ring-brand-primary"
                                            checked={selectedIds.has(s.id)}
                                            onChange={() => handleSelectRow(s.id)}
                                        />
                                    </td>
                                    <td className="p-2 text-center text-slate-500">{index + 1}</td>
                                    
                                    {/* Editable Cells */}
                                    {fields.map(f => (
                                        <td 
                                            key={f.key} 
                                            className={`p-2 min-w-[120px] ${f.editable ? 'cursor-pointer hover:bg-slate-700/50' : 'cursor-default opacity-80'}`}
                                            onClick={() => f.editable && startEditing(s.id, f.key, s[f.key])}
                                        >
                                            {editingCell?.id === s.id && editingCell?.field === f.key ? (
                                                f.type === 'select' ? (
                                                    <select
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={saveEdit}
                                                        className="w-full bg-slate-950 border border-brand-primary rounded px-2 py-1 text-white text-xs focus:outline-none"
                                                    >
                                                        {f.key === 'gen' ? (
                                                            <>
                                                                <option value="">Nespecificat</option>
                                                                <option value="Masculin">Masculin</option>
                                                                <option value="Feminin">Feminin</option>
                                                            </>
                                                        ) : (
                                                            f.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                                        )}
                                                    </select>
                                                ) : f.type === 'date' ? (
                                                    <input 
                                                        autoFocus
                                                        type="date"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={saveEdit}
                                                        className="w-full bg-slate-950 border border-brand-primary rounded px-2 py-1 text-white text-xs focus:outline-none"
                                                    />
                                                ) : f.type === 'textarea' ? (
                                                    <textarea 
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={saveEdit}
                                                        className="w-full bg-slate-950 border border-brand-primary rounded px-2 py-1 text-white text-xs focus:outline-none min-h-[60px]"
                                                    />
                                                ) : (
                                                    <input 
                                                        autoFocus
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={saveEdit}
                                                        onKeyDown={handleKeyDown}
                                                        maxLength={f.key === 'cnp' ? 13 : undefined}
                                                        className="w-full bg-slate-950 border border-brand-primary rounded px-2 py-1 text-white text-xs focus:outline-none"
                                                    />
                                                )
                                            ) : (
                                                <span className={!s[f.key] ? 'text-slate-600 italic' : ''}>
                                                    {s[f.key] || '-'}
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
