import React, { useState, useMemo, useCallback } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, View } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { ArrowLeftIcon, PlusIcon, MinusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useDebouncedCallback } from 'use-debounce';

// --- PROPS ---
interface RapoarteExamenProps {
    onBack: () => void;
    sesiuni: SesiuneExamen[];
    inscrieri: InscriereExamen[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    sportivi: Sportiv[];
    grade: Grad[];
    locatii: Locatie[];
    plati: Plata[];
}

type Participant = InscriereExamen & {
    numeComplet: string;
    numeGrad: string;
};

// --- Main Component ---
export const RapoarteExamen: React.FC<RapoarteExamenProps> = (props) => {
    const { onBack, sesiuni, inscrieri, setInscrieri, sportivi, grade, locatii, plati } = props;
    const { showError, showSuccess } = useError();
    const [view, setView] = useState<'note' | 'federatie'>('note');
    const [selectedSesiuneId, setSelectedSesiuneId] = useState<string>('');
    const [participants, setParticipants] = useState<Participant[]>([]);

    const selectedSesiune = useMemo(() => {
        if (!selectedSesiuneId) return null;
        const sesiune = sesiuni.find(s => s.id === selectedSesiuneId);
        if (!sesiune) return null;
        const locatie = locatii.find(l => l.id === sesiune.locatie_id);
        return { ...sesiune, numeLocatie: locatie?.nume || 'N/A' };
    }, [selectedSesiuneId, sesiuni, locatii]);

    React.useEffect(() => {
        if (selectedSesiuneId) {
            const participantiSesiune = inscrieri
                .filter(i => i.sesiune_id === selectedSesiuneId)
                .map(i => {
                    const sportiv = sportivi.find(s => s.id === i.sportiv_id);
                    const grad = grade.find(g => g.id === i.grad_vizat_id);
                    return {
                        ...i,
                        numeComplet: sportiv ? `${sportiv.nume} ${sportiv.prenume}` : 'N/A',
                        numeGrad: grad?.nume || 'N/A'
                    };
                })
                .sort((a, b) => a.numeComplet.localeCompare(b.numeComplet));
            setParticipants(participantiSesiune);
        } else {
            setParticipants([]);
        }
    }, [selectedSesiuneId, inscrieri, sportivi, grade]);

    const handleSaveNotes = useDebouncedCallback(async (inscriereId: string, updates: Partial<InscriereExamen>) => {
        const { nota_thao_quyen, nota_song_doi } = updates;
        const notes = [nota_thao_quyen, nota_song_doi].filter(n => n !== null && n !== undefined && !isNaN(n)) as number[];
        const media_generala = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
        
        const finalUpdates = { ...updates, media_generala };
        
        const { data, error } = await supabase.from('inscrieri_examene').update(finalUpdates).eq('id', inscriereId).select().single();

        if (error) {
            showError("Eroare la salvare", error.message);
        } else if (data) {
            setInscrieri(prev => prev.map(i => i.id === inscriereId ? { ...i, ...data } : i));
        }
    }, 500);

    const handleNoteChange = (inscriereId: string, field: 'nota_thao_quyen' | 'nota_song_doi', value: number | null) => {
        setParticipants(prev => prev.map(p => {
            if (p.id === inscriereId) {
                const updatedParticipant = { ...p, [field]: value };
                handleSaveNotes(inscriereId, { [field]: value });
                return updatedParticipant;
            }
            return p;
        }));
    };

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    @page { size: A4 landscape; margin: 20mm; }
                    table { font-size: 10pt; }
                }
            `}</style>

            <div className="no-print">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            </div>
            <h1 className="text-3xl font-bold text-white">Rapoarte Examen</h1>

            <Card className="no-print">
                <Select label="Selectați Sesiunea de Examen" value={selectedSesiuneId} onChange={e => setSelectedSesiuneId(e.target.value)}>
                    <option value="">Alegeți o sesiune...</option>
                    {[...sesiuni].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()).map(s => (
                        <option key={s.id} value={s.id}>
                            {new Date(s.data + 'T00:00:00').toLocaleDateString('ro-RO')} - {locatii.find(l=>l.id===s.locatie_id)?.nume}
                        </option>
                    ))}
                </Select>
            </Card>

            {selectedSesiune && (
                <div id="print-area">
                    <Card>
                        <div className="flex justify-between items-center no-print">
                            <h2 className="text-2xl font-bold text-white">{selectedSesiune.numeLocatie}</h2>
                             <div className="flex gap-1 bg-slate-900/50 p-1 rounded-md">
                                <Button size="sm" variant={view === 'note' ? 'primary' : 'secondary'} onClick={() => setView('note')}>Note Tehnice</Button>
                                <Button size="sm" variant={view === 'federatie' ? 'primary' : 'secondary'} onClick={() => setView('federatie')}>Raport Federație</Button>
                                <Button size="sm" variant="info" onClick={() => window.print()}>Printează</Button>
                            </div>
                        </div>
                        <div className="mt-4 border-b border-slate-700 pb-4">
                            <p><strong>Club:</strong> Clubul Sportiv Phi Hau Iași</p>
                            <p><strong>Data:</strong> {new Date(selectedSesiune.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                            <p><strong>Locație:</strong> {selectedSesiune.numeLocatie}</p>
                        </div>
                        
                        <div className="mt-4">
                            {view === 'note' ? 
                                <NoteTehniceView participants={participants} onNoteChange={handleNoteChange} /> : 
                                <RaportFederatieView participants={participants} plati={plati} dataExamen={selectedSesiune.data} />
                            }
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// --- Note Tehnice View ---
const NoteTehniceView: React.FC<{
    participants: Participant[];
    onNoteChange: (inscriereId: string, field: 'nota_thao_quyen' | 'nota_song_doi', value: number | null) => void;
}> = ({ participants, onNoteChange }) => {
    
    const StepperInput: React.FC<{ value: number | null | undefined, onChange: (newValue: number) => void }> = ({ value, onChange }) => {
        const numValue = value ?? 0;
        return (
            <div className="flex items-center gap-1">
                {/* FIX: Use MinusIcon for the stepper button. */}
                <Button type="button" size="sm" variant="secondary" className="!p-2 h-8 w-8" onClick={() => onChange(Math.max(0, numValue - 0.25))}><MinusIcon className="w-4 h-4" /></Button>
                <Input label="" type="number" step="0.25" value={value ?? ''} onChange={e => onChange(parseFloat(e.target.value) || 0)} className="w-20 text-center font-bold !py-1" />
                {/* FIX: Use PlusIcon for the stepper button. */}
                <Button type="button" size="sm" variant="secondary" className="!p-2 h-8 w-8" onClick={() => onChange(Math.min(10, numValue + 0.25))}><PlusIcon className="w-4 h-4" /></Button>
            </div>
        );
    };

    return (
        <div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-700/50">
                        <tr>
                            <th className="p-2 font-semibold">Nr. Crt</th>
                            <th className="p-2 font-semibold">Nume și Prenume</th>
                            <th className="p-2 font-semibold">Grad Susținut</th>
                            <th className="p-2 font-semibold text-center">Notă Thao Quyen</th>
                            <th className="p-2 font-semibold text-center">Notă Song Doi</th>
                            <th className="p-2 font-semibold text-center">Media Generală</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {participants.map((p, index) => (
                            <tr key={p.id}>
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2 font-semibold">{p.numeComplet}</td>
                                <td className="p-2">{p.numeGrad}</td>
                                <td className="p-2 text-center"><Input label="" type="number" step="0.01" className="!py-1 w-24 mx-auto text-center" defaultValue={p.nota_thao_quyen ?? ''} onBlur={e => onNoteChange(p.id, 'nota_thao_quyen', e.target.value === '' ? null : parseFloat(e.target.value))} /></td>
                                <td className="p-2 text-center"><Input label="" type="number" step="0.01" className="!py-1 w-24 mx-auto text-center" defaultValue={p.nota_song_doi ?? ''} onBlur={e => onNoteChange(p.id, 'nota_song_doi', e.target.value === '' ? null : parseFloat(e.target.value))} /></td>
                                <td className={`p-2 text-center font-bold text-lg ${p.media_generala && p.media_generala >= 5 ? 'text-green-400' : 'text-red-400'}`}>{p.media_generala?.toFixed(2) ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {participants.map((p, index) => (
                    <Card key={p.id} className="bg-slate-800/50">
                        <div className="mb-3">
                            <p className="font-bold text-white">{index+1}. {p.numeComplet}</p>
                            <p className="text-sm text-slate-400">{p.numeGrad}</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center"><label>Notă Thao Quyen</label><StepperInput value={p.nota_thao_quyen} onChange={val => onNoteChange(p.id, 'nota_thao_quyen', val)} /></div>
                            <div className="flex justify-between items-center"><label>Notă Song Doi</label><StepperInput value={p.nota_song_doi} onChange={val => onNoteChange(p.id, 'nota_song_doi', val)} /></div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
                            <label className="font-bold">Media Generală</label>
                            <p className={`font-bold text-xl ${p.media_generala && p.media_generala >= 5 ? 'text-green-400' : 'text-red-400'}`}>{p.media_generala?.toFixed(2) ?? '-'}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

// --- Raport Federație View ---
const RaportFederatieView: React.FC<{
    participants: Participant[];
    plati: Plata[];
    dataExamen: string;
}> = ({ participants, plati, dataExamen }) => {
    
    const findContribution = (sportivId: string, gradSustinut: string) => {
        const plata = plati.find(p => p.sportiv_id === sportivId && p.tip === 'Taxa Examen' && p.data === dataExamen && p.descriere.includes(gradSustinut));
        return plata?.suma.toFixed(2) ?? 'N/A';
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-700/50">
                    <tr>
                        <th className="p-2 font-semibold">Nr. Crt</th>
                        <th className="p-2 font-semibold">Nume Sportiv</th>
                        <th className="p-2 font-semibold">Grad Susținut</th>
                        <th className="p-2 font-semibold text-center">Rezultat</th>
                        <th className="p-2 font-semibold text-right">Contribuție (RON)</th>
                        <th className="p-2 font-semibold">Observații</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {participants.map((p, index) => {
                        const rezultat = p.media_generala === null || p.media_generala === undefined ? 'Neprezentat' : p.media_generala >= 5 ? 'Admis' : 'Respins';
                        return (
                            <tr key={p.id}>
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2 font-semibold">{p.numeComplet}</td>
                                <td className="p-2">{p.numeGrad}</td>
                                <td className={`p-2 text-center font-bold ${rezultat === 'Admis' ? 'text-green-400' : 'text-red-400'}`}>{rezultat}</td>
                                <td className="p-2 text-right">{findContribution(p.sportiv_id, p.numeGrad)}</td>
                                <td className="p-2">{p.observatii || '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
