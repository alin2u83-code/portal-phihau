import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from './ui';
import { Antrenament, Grupa } from '../types';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useError } from './ErrorProvider';

export const AntrenamentForm: React.FC<{
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: any) => Promise<void>;
    grupaId: string | null; 
    grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, grupaId, grupe }) => {
    const getInitialState = () => ({
        data: new Date().toISOString().split('T')[0],
        ora_start: '18:00',
        ora_sfarsit: '19:30',
        grupa_id: grupaId || '',
        ziua: 'Luni',
        is_recurent: false
    });
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);
    const [conflicts, setConflicts] = useState<Antrenament[]>([]);
    
    // We need to fetch existing trainings to check for conflicts
    const { allTrainings } = useAttendanceData(grupe.length > 0 ? grupe[0].club_id : null, !isOpen);
    const { showError } = useError();

    useEffect(() => { 
        if (isOpen) {
            setFormState(getInitialState()); 
            setConflicts([]);
        }
    }, [isOpen, grupaId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormState(prev => ({ ...prev, [name]: val }));
    };

    const handlePreview = () => {
        if (!formState.grupa_id) return;

        let foundConflicts: Antrenament[] = [];

        if (formState.is_recurent) {
            // For recurrent, we'd ideally check the 'orar_saptamanal' table, 
            // but since we only have 'allTrainings' (program_antrenamente),
            // we can check if there are any generated trainings on that day of the week
            // that overlap. This is a simplified check.
            const dayMap: Record<string, number> = { 'Duminică': 0, 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6 };
            const targetDay = dayMap[formState.ziua];
            
            foundConflicts = allTrainings.filter(a => {
                if (a.grupa_id !== formState.grupa_id) return false;
                const aDate = new Date(a.data);
                if (aDate.getDay() !== targetDay) return false;
                
                // Check time overlap
                return (formState.ora_start < a.ora_sfarsit && formState.ora_sfarsit > a.ora_start);
            });

        } else {
            // For custom, check specific date and time
            foundConflicts = allTrainings.filter(a => {
                if (a.grupa_id !== formState.grupa_id) return false;
                if (a.data !== formState.data) return false;
                
                // Check time overlap
                return (formState.ora_start < a.ora_sfarsit && formState.ora_sfarsit > a.ora_start);
            });
        }

        setConflicts(foundConflicts);
    };

    // Run preview whenever relevant fields change
    useEffect(() => {
        if (isOpen) {
            handlePreview();
        }
    }, [formState.data, formState.ora_start, formState.ora_sfarsit, formState.grupa_id, formState.ziua, formState.is_recurent, allTrainings, isOpen]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (conflicts.length > 0) {
            const confirm = window.confirm("Există conflicte de orar cu alte antrenamente. Doriți să salvați oricum?");
            if (!confirm) return;
        }

        setLoading(true);
        // Clean up data based on type
        const submitData = { ...formState };
        if (submitData.is_recurent) {
            delete (submitData as any).data;
        } else {
            delete (submitData as any).ziua;
        }
        await onSave(submitData);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formState.is_recurent ? "Adaugă Antrenament Recurent" : "Creează Antrenament Personalizat"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 mb-2">
                    <input 
                        type="checkbox" 
                        id="is_recurent" 
                        name="is_recurent" 
                        checked={formState.is_recurent} 
                        onChange={handleChange}
                        className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <label htmlFor="is_recurent" className="text-sm font-semibold text-slate-200 cursor-pointer select-none">
                        Antrenament Recurent (Adaugă în Orar)
                    </label>
                </div>

                {formState.is_recurent ? (
                    <Select label="Ziua Săptămânii" name="ziua" value={formState.ziua} onChange={handleChange} required>
                        {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(zi => (
                            <option key={zi} value={zi}>{zi}</option>
                        ))}
                    </Select>
                ) : (
                    <Input label="Data" type="date" name="data" value={formState.data} onChange={handleChange} required />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit} onChange={handleChange} required />
                </div>
                 <Select label="Grupa" name="grupa_id" value={formState.grupa_id} onChange={handleChange} required>
                    <option value="">Alege o grupă...</option>
                    {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>

                {conflicts.length > 0 && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg mt-4">
                        <p className="text-sm font-bold text-rose-400 mb-2">Atenție: Conflicte detectate!</p>
                        <ul className="text-xs text-rose-300 space-y-1">
                            {conflicts.slice(0, 3).map(c => (
                                <li key={c.id}>
                                    • {c.data} ({c.ora_start} - {c.ora_sfarsit})
                                </li>
                            ))}
                            {conflicts.length > 3 && <li>...și încă {conflicts.length - 3}</li>}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};
