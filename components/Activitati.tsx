import React, { useState, useMemo } from 'react';
import { Grupa, Prezenta, ProgramItem } from '../types';
import { Button, Card, Input, Select } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface ProgramareActivitatiProps {
    grupe: Grupa[];
    prezente: Prezenta[];
    setPrezente: React.Dispatch<React.SetStateAction<Prezenta[]>>;
    onBack: () => void;
}

const FRECVENTE = [
    { value: 'saptamanal', label: 'Săptămânal' },
    { value: 'bilunar', label: 'La 2 săptămâni (Bilunar)' },
];

const ZILE_INDEX: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 0 };

interface PreviewInstance {
    data: Date;
    ora: string;
    isConflict: boolean;
}

export const ProgramareActivitati: React.FC<ProgramareActivitatiProps> = ({ grupe, prezente, setPrezente, onBack }) => {
    const [formState, setFormState] = useState({
        grupaId: '',
        programId: '', // Composite key: 'ziua-ora_start'
        dataStart: '',
        dataSfarsit: '',
        frecventa: 'saptamanal'
    });
    const [preview, setPreview] = useState<PreviewInstance[] | null>(null);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const selectedGrupa = useMemo(() => grupe.find(g => g.id === formState.grupaId), [grupe, formState.grupaId]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: value }));
        setPreview(null); // Reset preview on form change
    };

    const handlePreview = () => {
        if (!formState.grupaId || !formState.programId || !formState.dataStart || !formState.dataSfarsit) {
            showError("Date Incomplete", "Vă rugăm selectați grupa, programul și intervalul de date.");
            return;
        }

        const [ziua, ora_start] = formState.programId.split('-');
        
        const dates = generateDates(formState.dataStart, formState.dataSfarsit, ziua as ProgramItem['ziua'], formState.frecventa);
        
        const existingTrainings = new Set(prezente.map(p => `${p.data}-${p.ora}-${p.grupa_id}`));

        const previewInstances = dates.map(date => {
            const dateString = date.toISOString().split('T')[0];
            const conflictKey = `${dateString}-${ora_start}-${formState.grupaId}`;
            return {
                data: date,
                ora: ora_start,
                isConflict: existingTrainings.has(conflictKey),
            };
        });

        setPreview(previewInstances);
    };

    const generateDates = (start: string, end: string, ziua: ProgramItem['ziua'], frecventa: string): Date[] => {
        const dates: Date[] = [];
        let current = new Date(start);
        const endDate = new Date(end);
        const dayIndex = ZILE_INDEX[ziua];

        // Move to the first matching weekday on or after the start date
        current.setUTCHours(0, 0, 0, 0);
        while (current.getUTCDay() !== dayIndex) {
            current.setUTCDate(current.getUTCDate() + 1);
        }

        const increment = (frecventa === 'bilunar') ? 14 : 7;

        while (current <= endDate) {
            dates.push(new Date(current));
            current.setUTCDate(current.getUTCDate() + increment);
        }
        return dates;
    };
    
    const handleGenerate = async () => {
        if (!preview || preview.filter(p => !p.isConflict).length === 0) {
            showError("Nicio acțiune", "Nu există antrenamente noi de generat sau toate intră în conflict cu cele existente.");
            return;
        }

        const newTrainingsToInsert = preview
            .filter(p => !p.isConflict)
            .map(p => ({
                data: p.data.toISOString().split('T')[0],
                ora: p.ora,
                grupa_id: formState.grupaId,
                tip: 'Normal' as 'Normal' | 'Vacanta'
            }));
            
        if (!window.confirm(`Sunteți pe cale să generați ${newTrainingsToInsert.length} antrenamente noi. Doriți să continuați?`)) return;

        setLoading(true);
        const { data, error } = await supabase.from('prezente').insert(newTrainingsToInsert).select('*, prezente_sportivi(sportiv_id)');
        setLoading(false);

        if (error) {
            showError("Eroare la Salvare", error);
        } else if (data) {
            const formattedData = data.map((p: any) => ({
                ...p,
                sportivi_prezenti_ids: p.prezente_sportivi ? p.prezente_sportivi.map((ps: any) => ps.sportiv_id) : []
            }));

            setPrezente(prev => [...prev, ...formattedData]);
            showSuccess("Succes!", `${data.length} antrenamente au fost adăugate în calendar.`);
            setPreview(null);
        }
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            
            <h1 className="text-3xl font-bold text-white">Generator Program Recurent</h1>
            
            <Card className="border-l-4 border-brand-secondary">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-1">
                        <Select label="1. Selectează Grupa" name="grupaId" value={formState.grupaId} onChange={handleFormChange}>
                            <option value="">Alege grupa...</option>
                            {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                        </Select>
                    </div>
                    <div className="lg:col-span-1">
                         <Select label="2. Selectează Orarul" name="programId" value={formState.programId} onChange={handleFormChange} disabled={!selectedGrupa}>
                            <option value="">Alege program...</option>
                            {selectedGrupa?.program.map(p => <option key={`${p.ziua}-${p.ora_start}`} value={`${p.ziua}-${p.ora_start}`}>{p.ziua}, {p.ora_start}-{p.ora_sfarsit}</option>)}
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                        <Input label="3. Data Start" type="date" name="dataStart" value={formState.dataStart} onChange={handleFormChange}/>
                        <Input label="Data Sfârșit" type="date" name="dataSfarsit" value={formState.dataSfarsit} onChange={handleFormChange}/>
                    </div>
                    <div className="lg:col-span-1">
                         <Select label="4. Frecvență" name="frecventa" value={formState.frecventa} onChange={handleFormChange}>
                             {FRECVENTE.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                         </Select>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <Button onClick={handlePreview} variant="primary">
                        <CalendarDaysIcon className="w-5 h-5 mr-2" />
                        Previzualizează Antrenamentele
                    </Button>
                </div>
            </Card>

            {preview !== null && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">
                            Rezultate Previzualizare <span className="text-slate-400 font-normal">({preview.length} instanțe)</span>
                        </h3>
                        <Button 
                            onClick={handleGenerate} 
                            variant="success" 
                            isLoading={loading}
                            disabled={preview.filter(p => !p.isConflict).length === 0}
                        >
                            Generează {preview.filter(p => !p.isConflict).length} Antrenamente
                        </Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                        {preview.length > 0 ? preview.map((inst, index) => (
                            <div key={index} className={`flex justify-between items-center p-2 rounded-md ${inst.isConflict ? 'bg-red-900/30' : 'bg-slate-700/50'}`}>
                                <p className="font-mono text-sm">{inst.data.toLocaleDateString('ro-RO')} la ora {inst.ora}</p>
                                {inst.isConflict && (
                                    <span className="text-xs font-bold text-red-400 px-2 py-1 bg-red-500/10 rounded-full border border-red-500/30">
                                        CONFLICT
                                    </span>
                                )}
                            </div>
                        )) : (
                            <p className="text-slate-500 italic text-center py-4">Niciun antrenament de generat pentru intervalul și setările selectate.</p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};