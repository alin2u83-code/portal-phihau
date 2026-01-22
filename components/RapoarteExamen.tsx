import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, NoteExamen } from '../types';
import { Button, Select, Card, Input } from './ui';
import { ArrowLeftIcon, PrinterIcon, SaveIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface RapoarteExamenProps {
    sesiuni: SesiuneExamen[];
    inscrieri: InscriereExamen[];
    note: NoteExamen[];
    setNote: React.Dispatch<React.SetStateAction<NoteExamen[]>>;
    sportivi: Sportiv[];
    grade: Grad[];
    locatii: Locatie[];
    plati: Plata[];
    onBack: () => void;
}

type View = 'note' | 'federatie';

// --- Sub-componente interne ---
const Stepper: React.FC<{ value: number; onChange: (newValue: number) => void }> = ({ value, onChange }) => {
    const step = (amount: number) => onChange(Math.max(0, Math.min(10, value + amount)));
    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="!p-1 h-6 w-6" onClick={() => step(-1)}>-</Button>
            <span className="font-bold text-lg w-8 text-center">{value}</span>
            <Button size="sm" variant="secondary" className="!p-1 h-6 w-6" onClick={() => step(1)}>+</Button>
        </div>
    );
};

export const RapoarteExamen: React.FC<RapoarteExamenProps> = ({ sesiuni, inscrieri, note, setNote, sportivi, grade, locatii, plati, onBack }) => {
    const [activeView, setActiveView] = useState<View>('note');
    const [selectedSesiuneId, setSelectedSesiuneId] = useState<string>('');
    const [localNotes, setLocalNotes] = useState<Record<string, Partial<Omit<NoteExamen, 'id' | 'inscriere_id'>>>>({});
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const selectedSesiune = useMemo(() => sesiuni.find(s => s.id === selectedSesiuneId), [sesiuni, selectedSesiuneId]);
    
    const participanti = useMemo(() => {
        if (!selectedSesiuneId) return [];
        return inscrieri
            .filter(i => i.sesiune_id === selectedSesiuneId)
            .map(i => ({
                ...i,
                sportiv: sportivi.find(s => s.id === i.sportiv_id),
                grad: grade.find(g => g.id === i.grad_vizat_id),
            }))
            .sort((a, b) => a.sportiv?.nume.localeCompare(b.sportiv?.nume || '') || 0);
    }, [selectedSesiuneId, inscrieri, sportivi, grade]);

    useEffect(() => {
        const initialNotes: Record<string, Partial<Omit<NoteExamen, 'id' | 'inscriere_id'>>> = {};
        participanti.forEach(p => {
            const existingNote = note.find(n => n.inscriere_id === p.id);
            initialNotes[p.id] = {
                nota_tehnica: existingNote?.nota_tehnica ?? null,
                nota_forta: existingNote?.nota_forta ?? null,
                nota_viteza: existingNote?.nota_viteza ?? null,
                nota_atitudine: existingNote?.nota_atitudine ?? null,
            };
        });
        setLocalNotes(initialNotes);
    }, [participanti, note]);

    const handleNoteChange = (inscriereId: string, field: keyof Omit<NoteExamen, 'id' | 'inscriere_id'>, value: string) => {
        const numValue = value === '' ? null : Math.max(0, Math.min(10, parseFloat(value)));
        setLocalNotes(prev => ({
            ...prev,
            [inscriereId]: { ...prev[inscriereId], [field]: numValue }
        }));
    };
    
    const handleSaveNotes = async () => {
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neconfigurat."); return; }
        setLoading(true);

        const upsertData = Object.entries(localNotes)
            .map(([inscriere_id, noteValues]) => ({
                inscriere_id,
                ...noteValues
            }));
            
        const { data, error } = await supabase.from('note_examene').upsert(upsertData, { onConflict: 'inscriere_id' }).select();

        setLoading(false);
        if (error) {
            showError("Eroare la Salvarea Notelor", error);
        } else if (data) {
            setNote(prev => {
                const updatedNotes = new Map(prev.map(n => [n.inscriere_id, n]));
                data.forEach(d => updatedNotes.set(d.inscriere_id, d as NoteExamen));
                return Array.from(updatedNotes.values());
            });
            showSuccess("Succes!", "Notele au fost salvate.");
        }
    };
    
    const handlePrint = () => window.print();

    const renderHeader = () => (
        <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Sesiune Examen {new Date(selectedSesiune!.data + 'T00:00:00').toLocaleDateString('ro-RO')}</h2>
            <p className="text-slate-600">Locație: {locatii.find(l => l.id === selectedSesiune!.locatie_id)?.nume || 'N/A'}</p>
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
                                        <tbody>{participanti.map((p, idx) => {
                                            const note = localNotes[p.id] || {};
                                            const n = [note.nota_tehnica, note.nota_forta, note.nota_viteza, note.nota_atitudine];
                                            const media = n.every(val => typeof val === 'number') ? (n.reduce((acc, val) => acc + (val || 0), 0) / 4).toFixed(2) : 'N/A';
                                            return <tr key={p.id} className="border-b border-slate-700">
                                                <td className="p-2">{idx+1}.</td><td className="p-2 font-semibold">{p.sportiv?.nume} {p.sportiv?.prenume}</td><td>{p.grad?.nume}</td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_tehnica ?? ''} onChange={e => handleNoteChange(p.id, 'nota_tehnica', e.target.value)} className="text-center"/></td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_forta ?? ''} onChange={e => handleNoteChange(p.id, 'nota_forta', e.target.value)} className="text-center"/></td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_viteza ?? ''} onChange={e => handleNoteChange(p.id, 'nota_viteza', e.target.value)} className="text-center"/></td>
                                                <td><Input label="" type="number" step="0.5" min="0" max="10" value={note.nota_atitudine ?? ''} onChange={e => handleNoteChange(p.id, 'nota_atitudine', e.target.value)} className="text-center"/></td>
                                                <td className="p-2 text-center font-bold text-lg text-brand-secondary">{media}</td>
                                            </tr>
                                        })}</tbody>
                                    </table>
                                </div>
                                {/* --- VEDERE MOBIL NOTE --- */}
                                <div className="md:hidden space-y-4">{participanti.map((p, idx) => {
                                    const note = localNotes[p.id] || {};
                                    const n = [note.nota_tehnica, note.nota_forta, note.nota_viteza, note.nota_atitudine];
                                    const media = n.every(val => typeof val === 'number') ? (n.reduce((acc, val) => acc + (val || 0), 0) / 4).toFixed(2) : 'N/A';
                                    return <Card key={p.id} className="bg-slate-800"><p className="font-bold">{idx+1}. {p.sportiv?.nume} {p.sportiv?.prenume} - <span className="text-brand-secondary">{p.grad?.nume}</span></p><div className="mt-4 grid grid-cols-2 gap-4">
                                        {(Object.keys(note) as (keyof typeof note)[]).map(key => <div key={key} className="flex justify-between items-center"><span className="text-sm capitalize">{key.split('_')[1]}</span><Stepper value={note[key] ?? 0} onChange={val => handleNoteChange(p.id, key, String(val))}/></div>)}
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
                                    const taxa = plati.find(pl => pl.sportiv_id === p.sportiv_id && pl.tip === 'Taxa Examen' && pl.data === selectedSesiune.data);
                                    return <tr key={p.id} className="border-b border-slate-700">
                                        <td className="p-2">{idx+1}.</td><td className="p-2 font-semibold">{p.sportiv?.nume} {p.sportiv?.prenume}</td><td>{p.grad?.nume}</td><td>{p.rezultat}</td><td>{taxa ? `${taxa.suma.toFixed(2)} RON` : 'N/A'}</td><td>{p.observatii || ''}</td>
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