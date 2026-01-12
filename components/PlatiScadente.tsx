import React, { useState, useMemo } from 'react';
import { Plata, Sportiv, TipAbonament, Familie, Tranzactie } from '../types';
import { Button, Input, Select, Card } from './ui';
import { EditIcon, ArrowLeftIcon, TrashIcon } from './icons';
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
    onIncaseazaMultiple: (plati: Plata[]) => void;
    onBack: () => void;
}

const initialFilters = { sportiv: '', tip: '', status: 'Neachitat' };

export const PlatiScadente: React.FC<PlatiScadenteProps> = ({ plati, setPlati, sportivi, familii, tipuriAbonament, tranzactii, onIncaseazaMultiple, onBack }) => {
    const [filter, setFilter] = useLocalStorage('phi-hau-plati-scadente-filter', initialFilters);
    const [editingPlata, setEditingPlata] = useState<Plata | null>(null);
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { showError, showSuccess } = useError();
    const [isGenerating, setIsGenerating] = useState(false);

    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        familii.forEach(f => balances.set(f.id, 0));
        tranzactii.forEach(t => {
            if (t.familie_id) {
                balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma);
            }
        });
        plati.forEach(p => {
            if (p.familie_id) {
                balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma);
            }
        });
        return balances;
    }, [familii, plati, tranzactii]);

    const handleGenerateSubscriptions = async () => {
        setIsGenerating(true);
        const dataCurenta = new Date().toISOString().split('T')[0];
        const lunaText = new Date().toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const lunaCurentaIdx = new Date().getMonth();
        const anulCurent = new Date().getFullYear();
        
        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');
        const platiToInsert: Omit<Plata, 'id'>[] = [];
        const sportiviProcesati = new Set<string>();

        familii.forEach(familie => {
            const membriActivi = sportiviActivi.filter(s => s.familie_id === familie.id);
            if (membriActivi.length === 0) return;
            const areAbonamentGenerat = plati.some(p => p.familie_id === familie.id && p.tip === 'Abonament' && new Date(p.data).getMonth() === lunaCurentaIdx && new Date(p.data).getFullYear() === anulCurent);
            if (areAbonamentGenerat) { membriActivi.forEach(m => sportiviProcesati.add(m.id)); return; }

            const nrMembri = membriActivi.length;
            let abonamentConfig = tipuriAbonament.find(ab => ab.numar_membri === nrMembri);
            if (!abonamentConfig && nrMembri >= 3) { abonamentConfig = tipuriAbonament.sort((a,b) => b.numar_membri - a.numar_membri)[0]; }

            if (abonamentConfig) {
                const creditFamilie = familyBalances.get(familie.id) || 0;
                let sumaDatorata = abonamentConfig.pret;
                let status: Plata['status'] = 'Neachitat';
                let observatii = `Pentru ${membriActivi.map(m => m.prenume).join(', ')}`;

                if (creditFamilie > 0) {
                    if (creditFamilie >= sumaDatorata) {
                        status = 'Achitat';
                        observatii += ` | Achitat integral din avansul de ${creditFamilie.toFixed(2)} RON.`;
                    } else {
                        sumaDatorata -= creditFamilie;
                        observatii += ` | Redus cu ${creditFamilie.toFixed(2)} RON din avans.`;
                    }
                }
                 platiToInsert.push({ sportiv_id: membriActivi[0]?.id || null, familie_id: familie.id, suma: sumaDatorata, data: dataCurenta, status: status, descriere: `Abonament ${abonamentConfig.denumire} ${lunaText}`, tip: 'Abonament', observatii: observatii });
                membriActivi.forEach(m => sportiviProcesati.add(m.id));
            }
        });

        const sportiviIndividuali = sportiviActivi.filter(s => !sportiviProcesati.has(s.id));
        sportiviIndividuali.forEach(sportiv => {
            if (!sportiv.tip_abonament_id) return;
            const areAbonamentGenerat = plati.some(p => p.sportiv_id === sportiv.id && p.tip === 'Abonament' && new Date(p.data).getMonth() === lunaCurentaIdx && new Date(p.data).getFullYear() === anulCurent);
            if (areAbonamentGenerat) return;
            const abonamentConfig = tipuriAbonament.find(ab => ab.id === sportiv.tip_abonament_id);
            if (abonamentConfig) {
                 platiToInsert.push({ sportiv_id: sportiv.id, familie_id: null, suma: abonamentConfig.pret, data: dataCurenta, status: 'Neachitat', descriere: `Abonament ${abonamentConfig.denumire} ${lunaText}`, tip: 'Abonament', observatii: '' });
            }
        });
        
        if (platiToInsert.length > 0) { 
             const { data, error } = await supabase.from('plati').insert(platiToInsert).select();
             if(error) showError("Eroare la salvarea abonamentelor", error);
             else if (data) { setPlati(prev => [...prev, ...data as Plata[]]); showSuccess('Succes', `${data.length} abonamente noi au fost generate.`); }
        } else { showSuccess('Info', "Toți sportivii au plățile la zi."); }
        setIsGenerating(false);
    };

    const handleSaveEdit = async (plataId: string) => {
        if(!editingPlata || !supabase) return;
        const { id, ...updates } = editingPlata;
        const { data, error } = await supabase.from('plati').update(updates).eq('id', plataId).select().single();
        if (error) showError("Eroare la salvare", error);
        else if (data) { setPlati(prev => prev.map(p => p.id === plataId ? data as Plata : p)); setEditingPlata(null); }
    };

    const confirmDeletePlata = async (id: string) => {
        if(!supabase) return;
        setIsDeleting(true);

        try {
            const { data, error: checkError } = await supabase.from('tranzactii').select('id').contains('plata_ids', [id]).limit(1);
            if (checkError) throw new Error(`Verificare tranzacții eșuată: ${checkError.message}`);
            
            if (data && data.length > 0) {
                showError("Ștergere Blocată", "Această plată nu poate fi ștearsă deoarece este asociată cu o încasare. Anulați mai întâi tranzacția, dacă este necesar.");
                throw new Error("Deletion blocked due to existing transaction.");
            }
            
            const { error: deleteError } = await supabase.from('plati').delete().eq('id', id);
            if (deleteError) throw deleteError;
            
            setPlati(prev => prev.filter(p => p.id !== id));
            showSuccess("Succes", "Factură ștearsă cu succes.");

        } catch (err: any) {
             if (err.message !== "Deletion blocked due to existing transaction.") {
                 showError("Eroare la ștergere", err);
             }
        } finally {
            setIsDeleting(false);
            setPlataToDelete(null);
        }
    };

    const handleCheckboxToggle = (id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };

    const handleIncaseazaSelectie = () => {
        const toCollect = plati.filter(p => selectedIds.has(p.id));
        if (toCollect.length > 0) onIncaseazaMultiple(toCollect);
    };

    const filteredPlati = useMemo(() => { 
        return plati.filter(p => 
            (filter.sportiv === '' || p.sportiv_id === filter.sportiv || (p.familie_id && sportivi.find(s=>s.id === filter.sportiv)?.familie_id === p.familie_id)) && 
            (filter.tip === '' || p.tip === filter.tip) &&
            (filter.status === '' || p.status === filter.status)
        ).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()); 
    }, [plati, filter, sportivi]);

    const getEntityName = (plata: Plata) => {
        if (plata.familie_id) return `Familia ${familii.find(f => f.id === plata.familie_id)?.nume || 'N/A'}`;
        if (plata.sportiv_id) { const s = sportivi.find(s=>s.id === plata.sportiv_id); return s ? `${s.nume} ${s.prenume}` : 'N/A'; }
        return 'N/A';
    };

    return ( 
    <div>
        <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Facturare & Datorii</h1>
            <div className="flex gap-2">
                {selectedIds.size > 0 && <Button onClick={handleIncaseazaSelectie} variant='success' className="animate-pulse shadow-lg">Încasează Selecția ({selectedIds.size})</Button>}
                <Button onClick={handleGenerateSubscriptions} variant='secondary' isLoading={isGenerating}>Generează Abonamente</Button>
            </div>
        </div>
        <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-700/50 rounded-lg">
                <Select label="Filtrează după sportiv" value={filter.sportiv} onChange={e => setFilter(p=>({...p, sportiv: e.target.value}))}>
                    <option value="">Toți</option>
                    {sportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                </Select>
                <Select label="Tip" value={filter.tip} onChange={e => setFilter(p=>({...p, tip: e.target.value}))}>
                    <option value="">Toate</option>
                    <option value="Abonament">Abonament</option><option value="Taxa Examen">Taxa Examen</option><option value="Taxa Stagiu">Taxa Stagiu</option><option value="Taxa Competitie">Taxa Competitie</option><option value="Echipament">Echipament</option>
                </Select>
                 <Select label="Status Factură" value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}>
                    <option value="">Toate statusurile</option>
                    <option value="Neachitat">Neachitat</option>
                    <option value="Achitat Parțial">Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                </Select>
            </div>
        </Card>
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full text-left min-w-[950px]">
                <thead className="bg-slate-700">
                    <tr>
                        <th className="p-4 w-12"><input type="checkbox" onChange={(e) => { if(e.target.checked) setSelectedIds(new Set(filteredPlati.filter(p => p.status !== 'Achitat').map(p => p.id))); else setSelectedIds(new Set()); }} /></th>
                        <th className="p-4 font-semibold">Plată Pentru</th><th className="p-4 font-semibold">Descriere</th><th className="p-4 font-semibold">Sumă</th><th className="p-4 font-semibold">Dată</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold text-right">Acțiuni</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPlati.map(plata => {
                        const statusClass = plata.status === 'Achitat' ? 'text-green-400' : plata.status === 'Achitat Parțial' ? 'text-yellow-400' : 'text-red-400';
                        const isEditing = editingPlata?.id === plata.id;
                        return (
                        <tr key={plata.id} className={`border-b border-slate-700 ${selectedIds.has(plata.id) ? 'bg-brand-secondary/10' : ''}`}>
                            <td className="p-4 text-center">{plata.status !== 'Achitat' && <input type="checkbox" checked={selectedIds.has(plata.id)} onChange={() => handleCheckboxToggle(plata.id)} />}</td>
                            {isEditing ? (
                                <>
                                    <td className="p-2 font-medium">{getEntityName(plata)}</td>
                                    <td className="p-2"><Input label="" value={editingPlata!.descriere} onChange={e => setEditingPlata({...editingPlata!, descriere: e.target.value})} /></td>
                                    <td className="p-2"><Input label="" type="number" value={editingPlata!.suma} onChange={e => setEditingPlata({...editingPlata!, suma: parseFloat(e.target.value) || 0})} /></td>
                                    <td className="p-2">{plata.data}</td>
                                    <td className="p-2"><Select label="" value={editingPlata!.status} onChange={e => setEditingPlata({...editingPlata!, status: e.target.value as any})}><option value="Neachitat">Neachitat</option><option value="Achitat Parțial">Achitat Parțial</option><option value="Achitat">Achitat</option></Select></td>
                                    <td className="p-2 text-right w-48"><div className="flex gap-1 justify-end"><Button size="sm" variant="success" onClick={() => handleSaveEdit(plata.id)}>Salvează</Button><Button size="sm" variant="secondary" onClick={() => setEditingPlata(null)}>Renunță</Button></div></td>
                                </>
                            ) : (
                                <>
                                    <td className="p-4 font-medium">{getEntityName(plata)}</td>
                                    <td className="p-4 text-sm text-slate-300">{plata.descriere}</td>
                                    <td className="p-4 font-bold">{plata.suma.toFixed(2)} RON</td>
                                    <td className="p-4 text-slate-400 text-sm">{new Date(plata.data).toLocaleDateString('ro-RO')}</td>
                                    <td className={`p-4 font-bold text-sm ${statusClass}`}>{plata.status}</td>
                                    <td className="p-4 text-right w-48"><div className="flex justify-end gap-2">{plata.status !== 'Achitat' && <Button size="sm" variant="primary" onClick={() => onIncaseazaMultiple([plata])}>Încasează</Button>}<Button size="sm" variant="secondary" onClick={() => setEditingPlata(plata)}><EditIcon className="w-4 h-4" /></Button><Button size="sm" variant="danger" onClick={() => setPlataToDelete(plata)}><TrashIcon className="w-4 h-4" /></Button></div></td>
                                </>
                            )}
                        </tr>
                        );
                    })}
                </tbody>
            </table>
            {filteredPlati.length === 0 && <p className="p-8 text-center text-slate-400 italic">Nu există înregistrări conform filtrelor.</p>}
        </div>
        <ConfirmDeleteModal
            isOpen={!!plataToDelete}
            onClose={() => setPlataToDelete(null)}
            onConfirm={() => { if(plataToDelete) confirmDeletePlata(plataToDelete.id) }}
            tableName="Plăți"
            isLoading={isDeleting}
        />
    </div>
    );
};