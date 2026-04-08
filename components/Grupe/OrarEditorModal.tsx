import React, { useState, useMemo } from 'react';
import { Grupa, ProgramItem } from '../../types';
import { Button, Modal, Input } from '../ui';
import { CogIcon, PlusIcon, TrashIcon, CheckCircleIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';

interface GrupaWithDetails extends Grupa {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

interface OrarEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    grupa: GrupaWithDetails;
    setGrupe: React.Dispatch<React.SetStateAction<any[]>>;
}

export const OrarEditorModal: React.FC<OrarEditorModalProps> = ({ isOpen, onClose, grupa, setGrupe }) => {
    const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    // Resetăm programul când se deschide modalul sau se schimbă grupa
    React.useEffect(() => {
        if (isOpen) {
            setProgram(grupa.program || []);
        }
    }, [isOpen, grupa]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupa.id);
            const toInsert = program.map(({ id, ...rest }) => ({
                ...rest,
                grupa_id: grupa.id,
                club_id: grupa.club_id,
            }));
            if (toInsert.length > 0) {
                const { error } = await supabase.from('orar_saptamanal').insert(toInsert);
                if (error) throw error;
            }
            setGrupe((prev: GrupaWithDetails[]) =>
                prev.map(g => g.id === grupa.id ? { ...g, program } : g)
            );
            showSuccess('Succes', 'Orarul a fost salvat.');
            onClose();
        } catch (error: any) {
            showError('Eroare la salvare orar', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = (zi: ProgramItem['ziua'] = 'Luni') =>
        setProgram(p => [...p, { id: `new-${Date.now()}`, ziua: zi, ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true }]);

    const handleRemoveItem = (id: string) => setProgram(p => p.filter(item => item.id !== id));

    const handleItemChange = (id: string, field: keyof ProgramItem, value: any) =>
        setProgram(p => p.map(item => item.id === id ? { ...item, [field]: value } : item));

    const programByDay = useMemo(() => {
        const grouped: Record<string, ProgramItem[]> = {};
        zileSaptamana.forEach(zi => (grouped[zi] = program.filter(p => p.ziua === zi)));
        return grouped;
    }, [program]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Orar Săptămânal: ${grupa.denumire}`}
        >
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-slate-400 text-sm -mt-2">
                    <CogIcon className="w-4 h-4 text-indigo-400" />
                    <span>Definește șablonul recurent al antrenamentelor pentru această grupă.</span>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                    {zileSaptamana.map(zi => (
                        <div key={zi} className="group">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    {zi}
                                </h3>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleAddItem(zi)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <PlusIcon className="w-3 h-3 mr-1" /> Adaugă Interval
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {programByDay[zi].length > 0 ? (
                                    programByDay[zi].map(item => (
                                        <div
                                            key={item.id}
                                            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 hover:border-indigo-500/30 transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Start</span>
                                                <Input
                                                    label=""
                                                    type="time"
                                                    value={item.ora_start}
                                                    onChange={e => handleItemChange(item.id, 'ora_start', e.target.value)}
                                                    className="flex-grow"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-12">Sfârșit</span>
                                                <Input
                                                    label=""
                                                    type="time"
                                                    value={item.ora_sfarsit}
                                                    onChange={e => handleItemChange(item.id, 'ora_sfarsit', e.target.value)}
                                                    className="flex-grow"
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        onClick={() => handleAddItem(zi)}
                                        className="py-3 px-4 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 hover:border-slate-700 hover:text-slate-400 cursor-pointer transition-all"
                                    >
                                        <p className="text-sm italic">Niciun antrenament pentru {zi.toLowerCase()}.</p>
                                        <p className="text-xs mt-1">Apasă pentru a adăuga primul interval.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Anulează
                    </Button>
                    <Button variant="success" onClick={handleSave} isLoading={loading}>
                        <CheckCircleIcon className="w-4 h-4 mr-2" /> Salvează Orar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
