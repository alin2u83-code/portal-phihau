import React, { useState, useEffect, useMemo } from 'react';
import { Grupa as GrupaType, ProgramItem, User, Club, Locatie } from '../../types';
import { Modal, Button, Input, Select } from '../ui';
import { useError } from '../ErrorProvider';
import { ProgramEditor } from './ProgramEditor';
import { supabase } from '../../supabaseClient';
import { PlusIcon } from '../icons';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

interface AddLocatieInlineProps {
    clubId: string | null;
    onAdded: (locatie: Locatie) => void;
    onCancel: () => void;
}

const AddLocatieInline: React.FC<AddLocatieInlineProps> = ({ clubId, onAdded, onCancel }) => {
    const [nume, setNume] = useState('');
    const [adresa, setAdresa] = useState('');
    const [saving, setSaving] = useState(false);
    const { showError } = useError();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nume.trim()) { showError("Validare", "Numele locației este obligatoriu."); return; }
        setSaving(true);
        try {
            const payload: any = { nume: nume.trim() };
            if (adresa.trim()) payload.adresa = adresa.trim();
            if (clubId) payload.club_id = clubId;
            const { data, error } = await supabase.from('nom_locatii').insert(payload).select().single();
            if (error) throw error;
            onAdded(data as Locatie);
        } catch (err: any) {
            showError("Eroare la adăugarea locației", err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="mt-2 p-3 bg-slate-800/60 border border-indigo-500/30 rounded-lg space-y-2">
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide">Locație nouă</p>
            <Input
                label="Nume locație"
                value={nume}
                onChange={e => setNume(e.target.value)}
                placeholder="ex: Sala Sporturilor"
                required
            />
            <Input
                label="Adresă (opțional)"
                value={adresa}
                onChange={e => setAdresa(e.target.value)}
                placeholder="ex: Str. Sportului nr. 1"
            />
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
                    Anulează
                </Button>
                <Button type="submit" variant="info" size="sm" isLoading={saving}>
                    Adaugă Locație
                </Button>
            </div>
        </form>
    );
};

export const GrupaFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (grupa: GrupaWithDetails) => Promise<void>;
    grupaToEdit: GrupaWithDetails | null;
    currentUser: User;
    clubs: Club[];
    locatii: Locatie[];
    onLocatieAdded?: (locatie: Locatie) => void;
}> = ({ isOpen, onClose, onSave, grupaToEdit, currentUser, clubs, locatii, onLocatieAdded }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '', club_id: '', locatie_id: '' });
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddLocatie, setShowAddLocatie] = useState(false);
    const [localLocatii, setLocalLocatii] = useState<Locatie[]>([]);
    const { showError } = useError();
    const isFederationAdmin = currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');

    // Sincronizăm locatii din props în starea locală
    useEffect(() => {
        setLocalLocatii(locatii);
    }, [locatii]);

    useEffect(() => {
        if (isOpen) {
            setFormState({
                denumire: grupaToEdit?.denumire || '',
                sala: grupaToEdit?.sala || '',
                club_id: grupaToEdit?.club_id || (isFederationAdmin ? '' : currentUser.club_id || ''),
                locatie_id: (grupaToEdit as any)?.locatie_id || ''
            });
            setProgram(grupaToEdit?.program || []);
            setShowAddLocatie(false);
        }
    }, [isOpen, grupaToEdit, currentUser, isFederationAdmin]);

    // Filtrăm locațiile pe baza club_id-ului selectat curent
    const locatiiFiltrate = useMemo(() => {
        const clubId = formState.club_id || currentUser.club_id;
        if (!clubId) return localLocatii; // federation admin fără club selectat — arată toate
        return localLocatii.filter(l => !l.club_id || l.club_id === clubId);
    }, [localLocatii, formState.club_id, currentUser.club_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => {
            const next = { ...p, [name]: value };
            // Când se schimbă clubul, resetăm locația dacă nu mai e valabilă
            if (name === 'club_id') {
                next.locatie_id = '';
            }
            return next;
        });
    };

    const handleLocatieAdded = (locatie: Locatie) => {
        setLocalLocatii(prev => [...prev, locatie]);
        setFormState(p => ({ ...p, locatie_id: locatie.id }));
        setShowAddLocatie(false);
        // Propagăm în sus pentru a actualiza DataContext
        if (onLocatieAdded) onLocatieAdded(locatie);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isFederationAdmin && !formState.club_id) { showError("Validare eșuată", "Super Adminii trebuie să selecteze un club."); return; }
        setLoading(true);
        const finalGrupa: GrupaWithDetails = {
            id: grupaToEdit?.id || '',
            denumire: formState.denumire,
            sala: formState.sala,
            program: program,
            club_id: formState.club_id || null,
            sportivi: grupaToEdit?.sportivi || [{ count: 0 }],
            locatie_id: formState.locatie_id || null
        } as any;
        await onSave(finalGrupa);
        setLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Gestionează Grupă" : "Adaugă Grupă Nouă"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required />
                {isFederationAdmin && (
                    <Select label="Club" name="club_id" value={formState.club_id} onChange={handleChange} required>
                        <option value="">Selectează club...</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                    </Select>
                )}
                <div className="space-y-1">
                    <Select label="Locație (Sala)" name="locatie_id" value={formState.locatie_id} onChange={handleChange}>
                        <option value="">Selectează locație...</option>
                        {locatiiFiltrate.map(l => <option key={l.id} value={l.id}>{l.nume}{l.adresa ? ` — ${l.adresa}` : ''}</option>)}
                    </Select>
                    {!showAddLocatie && (
                        <button
                            type="button"
                            onClick={() => setShowAddLocatie(true)}
                            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-1"
                        >
                            <PlusIcon className="w-3 h-3" />
                            Adaugă locație nouă
                        </button>
                    )}
                    {showAddLocatie && (
                        <AddLocatieInline
                            clubId={formState.club_id || currentUser.club_id || null}
                            onAdded={handleLocatieAdded}
                            onCancel={() => setShowAddLocatie(false)}
                        />
                    )}
                </div>
                <ProgramEditor program={program} setProgram={setProgram} />
                <div className="flex justify-end pt-4 space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="success" type="submit" isLoading={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};
