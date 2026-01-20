import React, { useState, useMemo } from 'react';
import { Plata, Sportiv, TipAbonament, Familie, Tranzactie, Reducere } from '../types';
import { Button, Input, Select, Card, Modal } from './ui';
import { EditIcon, ArrowLeftIcon, TrashIcon, BanknotesIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PlatiScadenteProps { 
    plati: Plata[]; 
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; 
    sportivi: Sportiv[]; 
    familii: Familie[]; 
    tipuriAbonament: TipAbonament[];
    tranzactii: Tranzactie[];
    reduceri: Reducere[];
    onIncaseazaMultiple: (plati: Plata[]) => void;
    onBack: () => void;
}

const initialFilters = { sportiv: '', tip: '', status: 'Neachitat' };

export const PlatiScadente: React.FC<PlatiScadenteProps> = ({ plati, setPlati, sportivi, familii, tipuriAbonament, tranzactii, reduceri, onIncaseazaMultiple, onBack }) => {
    const [filter, setFilter] = useLocalStorage('phi-hau-plati-scadente-filter', initialFilters);
    const [editingPlata, setEditingPlata] = useState<Plata | null>(null);
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { showError, showSuccess } = useError();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<Plata | null>(null);

    // Calculăm soldul curent pentru fiecare familie și sportiv individual
    const balances = useMemo(() => {
        const famBalances = new Map<string, number>();
        const indivBalances = new Map<string, number>();

        familii.forEach(f => famBalances.set(f.id, 0));
        sportivi.forEach(s => indivBalances.set(s.id, 0));

        // Adunăm încasările
        tranzactii.forEach(t => {
            if (t.familie_id) {
                famBalances.set(t.familie_id, (famBalances.get(t.familie_id) || 0) + t.suma);
            } else if (t.sportiv_id) {
                indivBalances.set(t.sportiv_id, (indivBalances.get(t.sportiv_id) || 0) + t.suma);
            }
        });

        // Scădem datoriile existente
        plati.forEach(p => {
            if (p.familie_id) {
                famBalances.set(p.familie_id, (famBalances.get(p.familie_id) || 0) - p.suma);
            } else if (p.sportiv_id) {
                indivBalances.set(p.sportiv_id, (indivBalances.get(p.sportiv_id) || 0) - p.suma);
            }
        });

        return { famBalances, indivBalances };
    }, [familii, sportivi, plati, tranzactii]);

    const handleGenerateSubscriptions = async () => {
        if (!supabase) return;
        
        setIsGenerating(true);
        const today = new Date();
        const dataCurenta = today.toISOString().split('T')[0];
        const lunaText = today.toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const lunaCurentaIdx = today.getMonth();
        const anulCurent = today.getFullYear();
        
        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');
        const platiToInsert: Omit<Plata, 'id'>[] = [];
        const sportiviProcesati = new Set<string>();

        // 1. Procesăm familiile
        familii.forEach(familie => {
            const membriActiviInFamilie = sportiviActivi.filter(s => s.familie_id === familie.id);
            if (membriActiviInFamilie.length === 0) return;

            // Verificăm dacă există deja factură de abonament pe luna curentă pentru această familie
            const exists = plati.some(p => 
                p.familie_id === familie.id && 
                p.tip === 'Abonament' && 
                new Date(p.data).getMonth() === lunaCurentaIdx && 
                new Date(p.data).getFullYear() === anulCurent
            );

            if (exists) {
                membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
                return;
            }

            const nrMembri = membriActiviInFamilie.length;
            let abonamentConfig;
            
            if (familie.tip_abonament_id) {
                abonamentConfig = tipuriAbonament.find(ab => ab.id === familie.tip_abonament_id);
            } else {
                abonamentConfig = tipuriAbonament.find(ab => ab.numar_membri === nrMembri);
                
                // Fallback pentru familii numeroase
                if (!abonamentConfig && nrMembri > 1) {
                    abonamentConfig = [...tipuriAbonament]
                        .filter(ab => ab.numar_membri > 1)
                        .sort((a, b) => b.numar_membri - a.numar_membri)[0];
                }
            }

            if (abonamentConfig) {
                const creditFamilie = balances.famBalances.get(familie.id) || 0;
                let sumaDeFacturat = abonamentConfig.pret;
                let status: Plata['status'] = 'Neachitat';
                let observatii = `Abonament pt: ${membriActiviInFamilie.map(m => m.prenume).join(', ')}`;

                if (creditFamilie > 0) {
                    if (creditFamilie >= sumaDeFacturat) {
                        status = 'Achitat';
                        observatii += ` | Achitat automat din credit (${creditFamilie.toFixed(2)} lei).`;
                    } else {
                        sumaDeFacturat -= creditFamilie;
                        status = 'Achitat Parțial';
                        observatii += ` | Redus cu credit (${creditFamilie.toFixed(2)} lei).`;
                    }
                }

                platiToInsert.push({
                    sportiv_id: null,
                    familie_id: familie.id,
                    suma: sumaDeFacturat,
                    data: dataCurenta,
                    status: status,
                    descriere: `Abonament ${abonamentConfig.denumire} - ${lunaText}`,
                    tip: 'Abonament',
                    observatii: observatii
                });
                
                membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
            }
        });

        // 2. Procesăm sportivii individuali
        const sportiviIndividuali = sportiviActivi.filter(s => !sportiviProcesati.has(s.id));
        
        sportiviIndividuali.forEach(sportiv => {
            if (!sportiv.tip_abonament_id) return;

            const exists = plati.some(p => 
                p.sportiv_id === sportiv.id && 
                p.tip === 'Abonament' && 
                new Date(p.data).getMonth() === lunaCurentaIdx && 
                new Date(p.data).getFullYear() === anulCurent
            );

            if (exists) return;

            const abonamentConfig = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id);
            if (abonamentConfig) {
                const creditSportiv = balances.indivBalances.get(sportiv.id) || 0;
                let sumaDeFacturat = abonamentConfig.pret;
                let status: Plata['status'] = 'Neachitat';
                let observatii = '';

                if (creditSportiv > 0) {
                    if (creditSportiv >= sumaDeFacturat) {
                        status = 'Achitat';
                        observatii = `Achitat automat din credit (${creditSportiv.toFixed(2)} lei).`;
                    } else {
                        sumaDeFacturat -= creditSportiv;
                        status = 'Achitat Parțial';
                        observatii = `Redus cu credit (${creditSportiv.toFixed(2)} lei).`;
                    }
                }

                platiToInsert.push({
                    sportiv_id: sportiv.id,
                    familie_id: null,
                    suma: sumaDeFacturat,
                    data: dataCurenta,
                    status: status,
                    descriere: `Abonament ${abonamentConfig.denumire} - ${lunaText}`,
                    tip: 'Abonament',
                    observatii: observatii
                });
            }
        });
        
        if (platiToInsert.length > 0) { 
             const { data, error } = await supabase.from('plati').insert(platiToInsert).select();
             if (error) {
                 showError("Eroare la generare", error);
             } else if (data) {
                 setPlati(prev => [...prev, ...data as Plata[]]);
                 showSuccess('Succes', `S-au generat ${data.length} facturi noi pentru ${lunaText}.`);
             }
        } else {
            showSuccess('Info', "Nu există abonamente noi de generat pentru luna curentă.");
        }
        setIsGenerating(false);
    };

    const handleSaveEdit = async (plataId: string) => {
        if(!editingPlata || !supabase) return;
        setIsSaving(true);
        const { id, ...updates } = editingPlata;
        try {
            const { data, error } = await supabase.from('plati').update(updates).eq('id', plataId).select().single();
            if (error) throw error;
            if (data) { 
                setPlati(prev => prev.map(p => p.id === plataId ? data as Plata : p)); 
                setEditingPlata(null); 
                showSuccess("Succes", "Modificările au fost salvate.");
            }
        } catch(err) {
            showError("Eroare la salvare", err);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeletePlata = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('plati').delete().eq('id', id);
            if (error) throw error;
            setPlati(prev => prev.filter(p => p.id !== id));
            showSuccess("Succes", "Factura a fost ștearsă.");
        } catch (err: any) {
             showError("Eroare la ștergere", err);
        } finally {
            setIsDeleting(false);
            setPlataToDelete(null);
        }
    };

    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) {
            const f = familii.find(fam => fam.id === plata.familie_id);
            return f ? `Familia ${f.nume}` : 'Familie N/A';
        }
        const s = sportivi.find(sp => sp.id === plata.sportiv_id);
        return s ? `${s.nume} ${s.prenume}` : 'N/A';
    };

    const filteredPlati = useMemo(() => {
        return plati.filter(p => {
            const entityName = getEntityName(p);
            const nameMatch = !filter.sportiv || entityName.toLowerCase().includes(filter.sportiv.toLowerCase());
            const typeMatch = !filter.tip || p.tip === filter.tip;
            const statusMatch = !filter.status || p.status === filter.status;
            return nameMatch && typeMatch && statusMatch;
        }).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [plati, sportivi, familii, filter]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllVisible = () => {
        if (selectedIds.size === filteredPlati.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredPlati.map(p => p.id)));
    };
    
    const tranzactiiPentruPlata = useMemo(() => {
        if (!viewingHistoryFor) return [];
        return tranzactii.filter(t => t.plata_ids?.includes(viewingHistoryFor.id));
    }, [viewingHistoryFor, tranzactii]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary" className="mb-2"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Facturi & Datorii</h1>
                <Button 
                    variant="info" 
                    onClick={handleGenerateSubscriptions} 
                    isLoading={isGenerating}
                    className="shadow-lg shadow-sky-900/20"
                >
                    <BanknotesIcon className="w-5 h-5 mr-2" />
                    Generare Abonamente Lună Curentă
                </Button>
            </div>

            <Card className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Caută Sportiv/Familie" value={filter.sportiv} onChange={e => setFilter({...filter, sportiv: e.target.value})} />
                <Select label="Categorie" value={filter.tip} onChange={e => setFilter({...filter, tip: e.target.value})}>
                    <option value="">Toate</option>
                    <option value="Abonament">Abonament</option>
                    <option value="Taxa Examen">Taxa Examen</option>
                    <option value="Taxa Stagiu">Taxa Stagiu</option>
                    <option value="Taxa Competitie">Taxa Competiție</option>
                    <option value="Echipament">Echipament</option>
                    <option value="Taxa Anuala">Taxa Anuală</option>
                </Select>
                <Select label="Status" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
                    <option value="">Toate</option>
                    <option value="Neachitat">Neachitate</option>
                    <option value="Achitat">Achitate</option>
                    <option value="Achitat Parțial">Achitate Parțial</option>
                </Select>
            </Card>

            {selectedIds.size > 0 && (
                <div className="bg-brand-secondary/20 p-4 rounded-lg flex justify-between items-center animate-fade-in-down">
                    <p className="font-bold text-brand-secondary">{selectedIds.size} facturi selectate (Total: {filteredPlati.filter(p => selectedIds.has(p.id)).reduce((s,p)=>s+p.suma, 0).toFixed(2)} lei)</p>
                    <Button variant="success" onClick={() => onIncaseazaMultiple(plati.filter(p => selectedIds.has(p.id)))}>Încasează Selecție</Button>
                </div>
            )}

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-2 w-10">
                                    <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filteredPlati.length} onChange={handleSelectAllVisible} className="rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"/>
                                </th>
                                <th className="p-2 font-semibold">Data Scadență</th>
                                <th className="p-2 font-semibold">Destinatar</th>
                                <th className="p-2 font-semibold">Descriere</th>
                                <th className="p-2 font-semibold text-right">Sumă</th>
                                <th className="p-2 font-semibold text-center">Status</th>
                                <th className="p-2 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredPlati.map(p => (
                                <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="p-2">
                                        <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleToggleSelect(p.id)} className="rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"/>
                                    </td>
                                    <td className="p-2 text-slate-400">{new Date(p.data).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-2 font-medium">{getEntityName(p)}</td>
                                    <td className="p-2">
                                        <div className="font-semibold">{p.descriere}</div>
                                        {p.observatii && <div className="text-[10px] text-slate-500 italic max-w-xs truncate" title={p.observatii}>{p.observatii}</div>}
                                    </td>
                                    <td className="p-2 text-right font-bold">{p.suma.toFixed(2)} lei</td>
                                    <td className="p-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            p.status === 'Achitat' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                            p.status === 'Achitat Parțial' ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 
                                            'bg-red-600/20 text-red-400 border-red-600/50'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="info" onClick={() => setViewingHistoryFor(p)} title="Istoric Încasări"><BanknotesIcon className="w-4 h-4"/></Button>
                                            <Button size="sm" variant="secondary" onClick={() => setEditingPlata(p)} title="Editează detalii"><EditIcon className="w-4 h-4"/></Button>
                                            <Button size="sm" variant="danger" onClick={() => setPlataToDelete(p)} title="Șterge factură"><TrashIcon className="w-4 h-4"/></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPlati.length === 0 && <p className="p-12 text-center text-slate-500 italic">Nu există facturi care să corespundă filtrelor.</p>}
                </div>
            </Card>

            <ConfirmDeleteModal 
                isOpen={!!plataToDelete} 
                onClose={() => setPlataToDelete(null)} 
                onConfirm={() => plataToDelete && confirmDeletePlata(plataToDelete.id)} 
                tableName="Factură" 
                isLoading={isDeleting} 
            />
            
            {editingPlata && (
                <Modal 
                    isOpen={!!editingPlata} 
                    onClose={() => setEditingPlata(null)} 
                    title="Editează Factură"
                >
                    <div className="mt-4 space-y-4 text-left">
                        <Input label="Descriere" value={editingPlata.descriere} onChange={e => setEditingPlata({...editingPlata, descriere: e.target.value})} />
                        <Input label="Sumă" type="number" value={editingPlata.suma} onChange={e => setEditingPlata({...editingPlata, suma: parseFloat(e.target.value) || 0})} />
                        <Select label="Status" value={editingPlata.status} onChange={e => setEditingPlata({...editingPlata, status: e.target.value as any})}>
                            <option value="Neachitat">Neachitat</option>
                            <option value="Achitat Parțial">Achitat Parțial</option>
                            <option value="Achitat">Achitat</option>
                        </Select>
                        <Input label="Observații" value={editingPlata.observatii || ''} onChange={e => setEditingPlata({...editingPlata, observatii: e.target.value})} />
                    </div>
                     <div className="mt-6 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setEditingPlata(null)} disabled={isSaving}>
                          Anulează
                        </Button>
                        <Button variant="success" onClick={() => handleSaveEdit(editingPlata.id)} isLoading={isSaving}>
                          Salvează
                        </Button>
                    </div>
                </Modal>
            )}
            
            {viewingHistoryFor && (
                <Modal
                    isOpen={!!viewingHistoryFor}
                    onClose={() => setViewingHistoryFor(null)}
                    title={`Istoric Încasări pentru: ${viewingHistoryFor.descriere}`}
                >
                    {tranzactiiPentruPlata.length > 0 ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="p-2">Data Plății</th>
                                    <th className="p-2">Suma</th>
                                    <th className="p-2">Metoda</th>
                                    <th className="p-2">Descriere</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {tranzactiiPentruPlata.map(t => (
                                    <tr key={t.id}>
                                        <td className="p-2">{new Date(t.data_platii).toLocaleDateString('ro-RO')}</td>
                                        <td className="p-2 font-bold">{t.suma.toFixed(2)} RON</td>
                                        <td className="p-2">{t.metoda_plata}</td>
                                        <td className="p-2 text-slate-400">{t.descriere}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-slate-400 p-8">Nicio încasare înregistrată pentru această factură.</p>
                    )}
                </Modal>
            )}
        </div>
    );
};