
import React, { useState, useMemo } from 'react';
import { Plata, Sportiv, TipAbonament, Familie } from '../types';
import { Button, Input, Select, Card } from './ui';
import { EditIcon } from './icons';

interface PlatiScadenteProps { 
    plati: Plata[]; 
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; 
    sportivi: Sportiv[]; 
    familii: Familie[]; 
    tipuriAbonament: TipAbonament[]; 
    onIncaseazaAcum: (plata: Plata) => void;
}

export const PlatiScadente: React.FC<PlatiScadenteProps> = ({ plati, setPlati, sportivi, familii, tipuriAbonament, onIncaseazaAcum }) => {
    const [filter, setFilter] = useState({ sportiv: '', tip: '', status: 'Neachitat' });
    const [showSuccess, setShowSuccess] = useState<string|null>(null);
    const [editingPlata, setEditingPlata] = useState<Plata | null>(null);

    const handleGenerateSubscriptions = () => {
        const dataCurenta = new Date().toISOString().split('T')[0];
        const lunaText = new Date().toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const lunaCurentaIdx = new Date().getMonth();
        const anulCurent = new Date().getFullYear();
        
        const sportiviActivi = sportivi.filter(s => s.status === 'Activ');
        const platiNoi: Plata[] = [];
        const sportiviProcesati = new Set<string>();

        // 1. Procesează familiile
        familii.forEach(familie => {
            const membriActivi = sportiviActivi.filter(s => s.familieId === familie.id);
            if (membriActivi.length === 0) return;

            const areAbonamentGenerat = plati.some(p => p.familieId === familie.id && p.tip === 'Abonament' && new Date(p.data).getMonth() === lunaCurentaIdx && new Date(p.data).getFullYear() === anulCurent);
            if (areAbonamentGenerat) {
                membriActivi.forEach(m => sportiviProcesati.add(m.id));
                return;
            }

            const nrMembri = membriActivi.length;
            let abonamentConfig = tipuriAbonament.find(ab => ab.numarMembri === nrMembri);
            // Fallback pentru 3+ membri
            if (!abonamentConfig && nrMembri >= 3) {
                abonamentConfig = tipuriAbonament.sort((a,b) => b.numarMembri - a.numarMembri)[0];
            }

            if (abonamentConfig) {
                 platiNoi.push({ 
                    id: `fam-${familie.id}-${anulCurent}-${lunaCurentaIdx}`, 
                    sportivId: membriActivi[0]?.id || null, // Asociază cu primul membru ca reprezentant
                    familieId: familie.id,
                    suma: abonamentConfig.pret, 
                    data: dataCurenta, 
                    status: 'Neachitat', 
                    descriere: `Abonament ${abonamentConfig.denumire} ${lunaText}`, 
                    tip: 'Abonament', 
                    metodaPlata: null, 
                    dataPlatii: null,
                    observatii: `Pentru ${membriActivi.map(m => m.prenume).join(', ')}`
                });
                membriActivi.forEach(m => sportiviProcesati.add(m.id));
            }
        });

        // 2. Procesează sportivii individuali
        const sportiviIndividuali = sportiviActivi.filter(s => !sportiviProcesati.has(s.id));
        sportiviIndividuali.forEach(sportiv => {
            if (!sportiv.tipAbonamentId) return; // Doar cei cu abonament individual setat

            const areAbonamentGenerat = plati.some(p => p.sportivId === sportiv.id && p.tip === 'Abonament' && new Date(p.data).getMonth() === lunaCurentaIdx && new Date(p.data).getFullYear() === anulCurent);
            if (areAbonamentGenerat) return;

            const abonamentConfig = tipuriAbonament.find(ab => ab.id === sportiv.tipAbonamentId);
            if (abonamentConfig) {
                 platiNoi.push({ 
                    id: `${sportiv.id}-${anulCurent}-${lunaCurentaIdx}`, 
                    sportivId: sportiv.id,
                    familieId: null,
                    suma: abonamentConfig.pret, 
                    data: dataCurenta, 
                    status: 'Neachitat', 
                    descriere: `Abonament ${abonamentConfig.denumire} ${lunaText}`, 
                    tip: 'Abonament', 
                    metodaPlata: null, 
                    dataPlatii: null,
                    observatii: ''
                });
            }
        });
        
        if (platiNoi.length > 0) { setPlati(prev => [...prev, ...platiNoi]); setShowSuccess(`${platiNoi.length} abonamente noi au fost generate cu succes!`); } 
        else { setShowSuccess("Toți sportivii activi au deja o plată generată pentru luna curentă."); }
        setTimeout(() => setShowSuccess(null), 4000);
    };

    const handleSaveEdit = (plataId: string) => {
        if(!editingPlata || editingPlata.id !== plataId) return;
        setPlati(prev => prev.map(p => p.id === plataId ? editingPlata : p));
        setEditingPlata(null);
        setShowSuccess(`Plata a fost salvată!`);
        setTimeout(() => setShowSuccess(null), 2000);
    };

    const handleEditChange = (field: keyof Plata, value: any) => {
        if(!editingPlata) return;
        let updatedPlata = { ...editingPlata, [field]: value };
        if(field === 'status' && value === 'Achitat' && !editingPlata.dataPlatii) {
            updatedPlata.dataPlatii = new Date().toISOString().split('T')[0];
        }
        setEditingPlata(updatedPlata);
    };

    const filteredPlati = useMemo(() => { 
        return plati.filter(p => 
            (filter.sportiv === '' || p.sportivId === filter.sportiv || (p.familieId && sportivi.find(s=>s.id === filter.sportiv)?.familieId === p.familieId)) && 
            (filter.tip === '' || p.tip === filter.tip) &&
            (filter.status === '' || p.status === filter.status)
        ); 
    }, [plati, filter, sportivi]);

    const getEntityName = (plata: Plata) => {
        if (plata.familieId) {
            return `Familia ${familii.find(f => f.id === plata.familieId)?.nume || 'N/A'}`;
        }
        if (plata.sportivId) {
            const s = sportivi.find(s=>s.id === plata.sportivId);
            return s ? `${s.nume} ${s.prenume}` : 'N/A';
        }
        return 'N/A';
    }


    return ( 
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Plăți Scadente & Istoric</h1>
            <div className="flex gap-2">
                <Button onClick={handleGenerateSubscriptions} variant='secondary'>Generează Abonamente Lunare</Button>
            </div>
        </div>
        <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-700/50 rounded-lg">
                <Select label="Filtrează după sportiv/reprezentant" value={filter.sportiv} onChange={e => setFilter(p=>({...p, sportiv: e.target.value}))}>
                    <option value="">Toți</option>
                    {sportivi.map(s => <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>)}
                </Select>
                <Select label="Filtrează după tip" value={filter.tip} onChange={e => setFilter(p=>({...p, tip: e.target.value}))}>
                    <option value="">Toate</option>
                    <option value="Abonament">Abonament</option>
                    <option value="Taxa Examen">Taxa Examen</option>
                    <option value="Taxa Stagiu">Taxa Stagiu</option>
                    <option value="Taxa Competitie">Taxa Competitie</option>
                    <option value="Echipament">Echipament</option>
                </Select>
                 <Select label="Filtrează după status" value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}>
                    <option value="">Toate</option>
                    <option value="Neachitat">Neachitat</option>
                    <option value="Achitat Parțial">Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                </Select>
            </div>
        </Card>
        {showSuccess && <div className="bg-green-600/50 text-white p-3 rounded-md mb-4 text-center font-semibold">{showSuccess}</div>}
        <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
            <table className="w-full text-left min-w-[950px]">
                <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Plată Pentru</th><th className="p-4 font-semibold">Descriere</th><th className="p-4 font-semibold">Sumă de plată</th><th className="p-4 font-semibold">Dată Generare</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Acțiuni</th></tr></thead>
                <tbody>
                    {filteredPlati.sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map(plata => {
                        const statusClass = plata.status === 'Achitat' ? 'text-green-400' : plata.status === 'Achitat Parțial' ? 'text-yellow-400' : 'text-red-400';
                        return (
                        <tr key={plata.id} className="border-b border-slate-700">
                            {editingPlata?.id === plata.id ? (
                            <>
                                <td className="p-2 font-medium">{getEntityName(plata)}</td>
                                <td className="p-2"><Input label="" value={editingPlata.descriere} onChange={e => handleEditChange('descriere', e.target.value)} /></td>
                                <td className="p-2"><Input label="" type="number" value={editingPlata.suma} onChange={e => handleEditChange('suma', parseFloat(e.target.value))} /></td>
                                <td className="p-2">{new Date(plata.data).toLocaleDateString('ro-RO')}</td>
                                <td className="p-2">
                                    <Select label="" value={editingPlata.status} onChange={e => handleEditChange('status', e.target.value)}>
                                        <option value="Neachitat">Neachitat</option>
                                        <option value="Achitat Parțial">Achitat Parțial</option>
                                        <option value="Achitat">Achitat</option>
                                    </Select>
                                </td>
                                <td className="p-2">
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="success" onClick={() => handleSaveEdit(plata.id)}>Salvează</Button>
                                        <Button size="sm" variant="secondary" onClick={() => setEditingPlata(null)}>Anulează</Button>
                                    </div>
                                </td>
                            </>
                            ) : (
                            <>
                                <td className="p-4 font-medium">{getEntityName(plata)}</td>
                                <td className="p-4">{plata.descriere}</td>
                                <td className="p-4 font-bold">{plata.suma.toFixed(2)} RON</td>
                                <td className="p-4">{new Date(plata.data).toLocaleDateString('ro-RO')}</td>
                                <td className={`p-4 font-semibold ${statusClass}`}>{plata.status}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        {plata.status !== 'Achitat' && <Button onClick={() => onIncaseazaAcum(plata)} variant="success" size="sm">Încasează</Button>}
                                        <Button onClick={() => setEditingPlata(plata)} variant="primary" size="sm" title="Modifică status sau sumă"><EditIcon /></Button>
                                    </div>
                                </td>
                            </>
                            )}
                        </tr> 
                        )
                    })}
                    {filteredPlati.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-400">Nicio plată găsită conform filtrelor.</td></tr>}
                </tbody>
            </table>
        </div>
    </div> 
    );
};
