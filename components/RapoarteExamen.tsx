import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata } from '../types';
import { Button, Select, Card, Input, Stepper } from './ui';
import { ArrowLeftIcon, PrinterIcon, SaveIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface RapoarteExamenProps {
    sesiuni: SesiuneExamen[];
    inscrieri: InscriereExamen[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    sportivi: Sportiv[];
    grade: Grad[];
    locatii: Locatie[];
    plati: Plata[];
    onBack: () => void;
}

type View = 'note' | 'federatie';

export const RapoarteExamen: React.FC<RapoarteExamenProps> = ({ sesiuni, inscrieri, setInscrieri, sportivi, grade, locatii, plati, onBack }) => {
    const [activeView, setActiveView] = useState<View>('note');
    const [selectedSesiuneId, setSelectedSesiuneId] = useState<string>('');
    const [localInscrieri, setLocalInscrieri] = useState<InscriereExamen[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const selectedSesiune = useMemo(() => sesiuni.find(s => s.id === selectedSesiuneId), [sesiuni, selectedSesiuneId]);
    
    const participanti = useMemo(() => {
        if (!selectedSesiuneId) return [];
        return inscrieri
            .filter(i => i.sesiune_id === selectedSesiuneId)
            .sort((a, b) => (a.sportivi?.nume || '').localeCompare(b.sportivi?.nume || '') || 0);
    }, [selectedSesiuneId, inscrieri]);

    useEffect(() => {
        setLocalInscrieri(participanti);
    }, [participanti]);

    const handleNoteChange = (inscriereId: string, field: keyof InscriereExamen, value: number | null) => {
        setLocalInscrieri(prev => 
            prev.map(i => i.id === inscriereId ? { ...i, [field]: value } : i)
        );
    };
    
    const handleSaveNotes = async () => {
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neconfigurat."); return; }
        setLoading(true);

        const updates = localInscrieri.map(i => ({
            id: i.id,
            nota_tehnica: i.nota_tehnica,
            nota_forta: i.nota_forta,
            nota_viteza: i.nota_viteza,
            nota_atitudine: i.nota_atitudine,
        }));
            
        const { data, error } = await supabase.from('inscrieri_examene').upsert(updates).select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)');

        setLoading(false);
        if (error) {
            showError("Eroare la Salvarea Notelor", error);
        } else if (data) {
            setInscrieri(prev => {
                const updatedMap = new Map(prev.map(item => [item.id, item]));
                data.forEach(d => updatedMap.set(d.id, d as InscriereExamen));
                return Array.from(updatedMap.values());
            });
            showSuccess("Succes!", "Notele au fost salvate.");
        }
    };
    
    const handlePrint = () => window.print();

    const getExamOutcome = (inscriere: InscriereExamen) => {
        const notes = [inscriere.nota_tehnica, inscriere.nota_forta, inscriere.nota_viteza, inscriere.nota_atitudine];
        if (notes.some(n => n === null)) {
            return { media: 'N/A', rezultat: 'Neprezentat' };
        }
        const numericNotes = notes as number[];
        if (numericNotes.some(n => n < 5)) {
            return { media: (numericNotes.reduce((a, b) => a + b, 0) / 4).toFixed(2), rezultat: 'Respins' };
        }
        const media = numericNotes.reduce((a, b) => a + b, 0) / 4;
        return {
            media: media.toFixed(2),
            rezultat: media >= 5 ? 'Admis' : 'Respins'
        };
    };

    const renderHeader = () => (
        <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Sesiune Examen {new Date(selectedSesiune!.data + 'T00:00:00').toLocaleDateString('ro-RO')}</h2>
            <p className="text-slate-300">Locație: {locatii.find(l => l.id === selectedSesiune!.locatie_id)?.nume || 'N/A'}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
                <div className="flex gap-4 items-center">
                    <Select label="Selectează Sesiunea" value={selectedSesiuneId} onChange={e => setSelectedSesiuneId(e.target.value)} className="w-64">
                        <option value="">Alege o sesiune...</option>
                        {[...sesiuni].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(s => <option key={s.id} value={s.id}>{new Date(s.data + 'T00:00:00').toLocaleDateString('ro-RO')} - {locatii.find(l => l.id === s.locatie_id)?.nume}</option>)}
                    </Select>
                    <Button onClick={handlePrint} variant="info" disabled={!selectedSesiune}><PrinterIcon className="w-4 h-4 mr-2" /> Printează</Button>
                </div>
            </div>

            {selectedSesiune ? (
                <Card>
                    <div className="flex justify-between items-center mb-6 no-print">
                        <div className="border-b border-slate-700">
                            <button onClick={() => setActiveView('note')} className={`px-4 py-2 text-sm font-bold rounded-t-lg ${activeView === 'note' ? 'bg-slate-700 text-brand-secondary' : 'text-white/70'}`}>Note Tehnice</button>
                            <button onClick={() => setActiveView('federatie')} className={`px-4 py-2 text-sm font-bold rounded-t-lg ${activeView === 'federatie' ? 'bg-slate-700 text-brand-secondary' : 'text-white/70'}`}>Raport Federație</button>
                        </div>
                        {activeView === 'note' && <Button onClick={handleSaveNotes} variant="success" isLoading={loading}><SaveIcon className="w-4 h-4 mr-2"/> Salvează Note</Button>}
                    </div>

                    <div id="printable-area">
                        {renderHeader()}
                        {activeView === 'note' ? (
                            <>
                                {/* --- VEDERE DESKTOP NOTE --- */}
                                <div className="hidden md:block">
                                    <table className="w-full text-left text-sm">
                                        <thead><tr className="bg-slate-700/50">
                                            <th className="p-2">Nr.</th><th className="p-2">Nume Prenume</th><th className="p-2">Grad Susținut</th>
                                            <th className="p-2 w-24 text-center">Tehnică</th><th className="p-2 w-24 text-center">Forță</th>
                                            <th className="p-2 w-24 text-center">Viteză</th><th className="p-2 w-24 text-center">Atitudine</th>
                                            <th className="p-2 w-28 text-center font-bold">Medie</th>
                                        </tr></thead>
                                        <tbody>{localInscrieri.map((p, idx) => {
                                            const { media } = getExamOutcome(p);
                                            return <tr key={p.id} className="border-b border-slate-700">
                                                <td className="p-2">{idx+1}.</td><td className="p-2 font-semibold">{p.sportivi?.nume} {p.sportivi?.prenume}</td><td>{p.grade?.nume}</td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={p.nota_tehnica ?? ''} onChange={e => handleNoteChange(p.id, 'nota_tehnica', e.target.value === '' ? null : parseFloat(e.target.value))} className="text-center"/></td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={p.nota_forta ?? ''} onChange={e => handleNoteChange(p.id, 'nota_forta', e.target.value === '' ? null : parseFloat(e.target.value))} className="text-center"/></td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={p.nota_viteza ?? ''} onChange={e => handleNoteChange(p.id, 'nota_viteza', e.target.value === '' ? null : parseFloat(e.target.value))} className="text-center"/></td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={p.nota_atitudine ?? ''} onChange={e => handleNoteChange(p.id, 'nota_atitudine', e.target.value === '' ? null : parseFloat(e.target.value))} className="text-center"/></td>
                                                <td className="p-2 text-center font-bold text-lg text-brand-secondary">{media}</td>
                                            </tr>
                                        })}</tbody>
                                    </table>
                                </div>
                                {/* --- VEDERE MOBIL NOTE --- */}
                                <div className="md:hidden space-y-4">{localInscrieri.map((p, idx) => {
                                    const { media } = getExamOutcome(p);
                                    return <Card key={p.id} className="bg-slate-800"><p className="font-bold">{idx+1}. {p.sportivi?.nume} {p.sportivi?.prenume} - <span className="text-brand-secondary">{p.grade?.nume}</span></p><div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="flex justify-between items-center"><span className="text-sm">Tehnică</span><Stepper value={p.nota_tehnica ?? 0} onChange={val => handleNoteChange(p.id, 'nota_tehnica', val)}/></div>
                                        <div className="flex justify-between items-center"><span className="text-sm">Forță</span><Stepper value={p.nota_forta ?? 0} onChange={val => handleNoteChange(p.id, 'nota_forta', val)}/></div>
                                        <div className="flex justify-between items-center"><span className="text-sm">Viteză</span><Stepper value={p.nota_viteza ?? 0} onChange={val => handleNoteChange(p.id, 'nota_viteza', val)}/></div>
                                        <div className="flex justify-between items-center"><span className="text-sm">Atitudine</span><Stepper value={p.nota_atitudine ?? 0} onChange={val => handleNoteChange(p.id, 'nota_atitudine', val)}/></div>
                                    </div><div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center"><span className="font-bold">Media Generală</span><span className="font-bold text-lg text-brand-secondary">{media}</span></div></Card>
                                })}</div>
                            </>
                        ) : (
                             <table className="w-full text-left text-sm">
                                <thead><tr className="bg-slate-700/50">
                                    <th className="p-2">Nr. Crt</th><th className="p-2">Nume Sportiv</th><th className="p-2">Gradul Susținut</th>
                                    <th className="p-2">Rezultat</th><th className="p-2">Contribuția</th><th className="p-2">Observații</th>
                                </tr></thead>
                                <tbody>{participanti.map((p, idx) => {
                                    const { rezultat } = getExamOutcome(p);
                                    const taxa = plati.find(pl => pl.sportiv_id === p.sportiv_id && pl.tip === 'Taxa Examen' && pl.data === selectedSesiune.data);
                                    return <tr key={p.id} className="border-b border-slate-700">
                                        <td className="p-2">{idx+1}.</td><td className="p-2 font-semibold">{p.sportivi?.nume} {p.sportivi?.prenume}</td><td>{p.grade?.nume}</td><td>{rezultat}</td><td>{taxa ? `${taxa.suma.toFixed(2)} RON` : 'N/A'}</td><td>{p.observatii || ''}</td>
                                    </tr>
                                })}</tbody>
                            </table>
                        )}
                    </div>

                </Card>
            ) : (
                <Card className="text-center p-12">
                    <p className="text-slate-400">Vă rugăm selectați o sesiune de examen pentru a vizualiza rapoartele.</p>
                </Card>
            )}
        </div>
    );
};