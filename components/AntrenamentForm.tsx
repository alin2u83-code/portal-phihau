import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from './ui';
import { Antrenament, Grupa } from '../types';

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

    useEffect(() => { if (isOpen) setFormState(getInitialState()); }, [isOpen, grupaId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormState(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};
