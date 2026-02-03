import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Antrenament, Sportiv, Grupa, Plata, TipAbonament, AnuntPrezenta, ProgramItem } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, EditIcon, XIcon, CheckIcon, ExclamationTriangleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// --- Sub-componente ---

const AntrenamentForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Antrenament, 'id' | 'prezenta'>) => Promise<void>;
    antrenamentToEdit: Antrenament | null;
    grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, antrenamentToEdit, grupe }) => {
    const getInitialState = () => ({
        data: antrenamentToEdit?.data || new Date().toISOString().split('T')[0],
        ora_start: antrenamentToEdit?.ora_start || '18:00',
        ora_sfarsit: antrenamentToEdit?.ora_sfarsit || '19:30',
        grupa_id: antrenamentToEdit?.grupa_id || null,
        tip: (antrenamentToEdit?.grupa_id ? 'Normal' : 'Vacanta') as 'Normal' | 'Vacanta',
    });
    
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormState(getInitialState());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, antrenamentToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value === '' ? null : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { tip, ...antrenamentData } = formState;
        const finalData = {
            ...antrenamentData,
            grupa_id: tip === 'Normal' ? antrenamentData.grupa_id : null,
            ziua: null,
            is_recurent: false,
        };
        await onSave(finalData);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={antrenamentToEdit ? "Editează Antrenament" : "Creează Antrenament Nou"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <Input label="Data" type="date" name="data" value={formState.data} onChange={handleChange} required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Ora Start" type="time" name="ora_start" value={formState.ora_start} onChange={handleChange} required />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={formState.ora_sfarsit ?? ''} onChange={handleChange} required />
                </div>
                 <Select label="Grupa" name="grupa_id" value={formState.grupa_id || ''} onChange={handleChange}>
                    <option value="">Antrenament Liber (Vacanță)</option>
                    {(grupe || []).map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                </Select>
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};

interface AttendanceDetailProps {
    antrenament: Antrenament;
    onBack: () => void;
    setAntrenamente: React.Dispatch<React.SetStateAction<Antrenament[]>>;
    allSportivi: Sportiv[];
    allPlati: Plata[];
}

const AttendanceDetail: React.FC<AttendanceDetailProps> = ({ antrenament, onBack, setAntrenamente, allSportivi, allPlati }) => {
    const AthleteRow: React.FC<{
        sportiv: Sportiv;
        isPresent: boolean;
        isUpdating: boolean;
        hasViza: boolean;
        onToggle: (id: string) => void;
        onRemove?: (id: string) => void;
    }> = ({ sportiv, isPresent, isUpdating, hasViza, onToggle, onRemove }) => (
        <div className="flex items-center gap-2">
            <label htmlFor={`att-${sportiv.id}`} className={`flex-grow flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isPresent ? 'bg-green-900/30 border-green-700/50 opacity-100' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 opacity-60 hover:opacity-100'}`}>
                <input 
                    id={`att-${sportiv.id}`} 
                    type="checkbox" 
                    className="h-6 w-6 shrink-0 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary focus:ring-offset-slate-800 disabled:opacity-50" 
                    checked={isPresent} 
                    onChange={()