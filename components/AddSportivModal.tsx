import React, { useState } from 'react';
import { Card, Button, Input } from './ui';
import { X } from 'lucide-react';
import { Sportiv } from '../types';

interface AddSportivModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: Partial<Sportiv>) => Promise<{ success: boolean; error?: any; }>;
}

export const AddSportivModal: React.FC<AddSportivModalProps> = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<Sportiv>>({
        nume: '',
        prenume: '',
        email: '',
        data_nasterii: '',
        status: 'Activ'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await onSave(formData);
        if (result.success) onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Adaugă Sportiv Nou</h2>
                    <Button variant="secondary" onClick={onClose} className="!p-2"><X className="w-5 h-5" /></Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nume" value={formData.nume || ''} onChange={e => setFormData({...formData, nume: e.target.value})} required />
                    <Input label="Prenume" value={formData.prenume || ''} onChange={e => setFormData({...formData, prenume: e.target.value})} required />
                    <Input label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    <Input label="Data Nașterii" type="date" value={formData.data_nasterii || ''} onChange={e => setFormData({...formData, data_nasterii: e.target.value})} required />
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={onClose}>Anulează</Button>
                        <Button type="submit">Salvează</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
