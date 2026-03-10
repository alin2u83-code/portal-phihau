import React, { useState, useEffect, useMemo } from 'react';
import { Grupa as GrupaType, ProgramItem, User, Club, Sportiv } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useData } from '../contexts/DataContext';

// Interfață extinsă pentru datele aduse din Supabase
interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

// Helper pentru sortarea programului în ordine cronologică
const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };
const sortProgram = (program: ProgramItem[]): ProgramItem[] => {
    if (!program) return [];
    return [...program].sort((a, b) => {
        const ziCompare = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
        if (ziCompare !== 0) return ziCompare;
        return a.ora_start.localeCompare(b.ora_start);
    });
};

// Componentă pentru editarea programului (reutilizată și îmbunătățită)
const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => {
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    const [newItem, setNewItem] = useState<Omit<ProgramItem, 'id'>>({ ziua: 'Luni', ora_start: '18:00', ora_sfarsit: '19:30', is_activ: true });

    const handleAdd = () => { setProgram(p => [...p, { ...newItem, id: `new-${Date.now()}` }]); };
    const handleRemove = (itemToRemove: ProgramItem) => { setProgram(p => p.filter(item => item.id !== itemToRemove.id)); };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value as any })) };
    
    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-md font-semibold mb-2 text-white">Program Săptămânal</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {sortProgram(program).map((item) => ( 
                        <div key={item.id} className="flex items-center gap-3 bg-slate-700 p-2 rounded">
                            <span className="font-semibold flex-grow text-white">{item.ziua}: {item.ora_start} - {item.ora_sfarsit}</span>
                            <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(item)}><TrashIcon className="w-4 h-4" /></Button> 
                        </div>
                    ))}
                    {program.length === 0 && <p className="text-slate-400 text-sm italic">Niciun interval adăugat.</p>}
                </div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg space-y-3 border border-slate-700">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Adaugă Interval Nou</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <Select label="Ziua" name="ziua" value={newItem.ziua} onChange={handleChange}> {zileSaptamana.map(zi => <option key={zi} value={zi}>{zi}</option>)} </Select>
                    <Input label="Ora Start" type="time" name="ora_start" value={newItem.ora_start} onChange={handleChange} />
                    <Input label="Ora Sfârșit" type="time" name="ora_sfarsit" value={newItem.ora_sfarsit} onChange={handleChange} />
                    <Button type="button" variant="info" onClick={handleAdd} className="w-full h-[50px] flex items-center justify-center"><PlusIcon className="w-6 h-6"/></Button>
                </div>
            </div>
        </div>
    );
};

// Modal pentru adăugare/editare grupă
const GrupaFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (grupa: GrupaWithDetails) => Promise<void>; grupaToEdit: GrupaWithDetails | null; currentUser: User; clubs: Club[]; }> = ({ isOpen, onClose, onSave, grupaToEdit, currentUser, clubs }) => {
    const [formState, setFormState] = useState({ denumire: '', sala: '', club_id: '' });
    const [program, setProgram] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError } = useError();
    const isFederationAdmin = currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');

    useEffect(() => {
        if (isOpen) {
            setFormState({ 
                denumire: grupaToEdit?.denumire || '', 
                sala: grupaToEdit?.sala || '',
                club_id: grupaToEdit?.club_id || (isFederationAdmin ? '' : currentUser.club_id || '')
            });
            setProgram(grupaToEdit?.program || []);
        }
    }, [isOpen, grupaToEdit, currentUser, isFederationAdmin]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormState(p => ({ ...p, [e.target.name]: e.target.value }));
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
            sportivi: grupaToEdit?.sportivi || [{ count: 0 }]
        };
        await onSave(finalGrupa);
        setLoading(false);
        onClose();
    };
    
    return ( <Modal isOpen={isOpen} onClose={onClose} title={grupaToEdit ? "Gestionează Grupă" : "Adaugă Grupă Nouă"}> <form onSubmit={handleSubmit} className="space-y-4"> <Input label="Denumire Grupă" name="denumire" value={formState.denumire} onChange={handleChange} required />
    {isFederationAdmin && ( <Select label="Club" name="club_id" value={formState.club_id} onChange={handleChange} required> <option value="">Selectează club...</option> {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)} </Select> )}
    <Input label="Sala" name="sala" value={formState.sala || ''} onChange={handleChange} /> <ProgramEditor program={program} setProgram={setProgram} /> <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button variant="success" type="submit" isLoading={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button></div> </form> </Modal> );
};

// Componenta Card pentru o singură grupă
const GrupaCard: React.FC<{ grupa: GrupaWithDetails; onEdit: (g: GrupaWithDetails) => void; onDelete: (g: GrupaWithDetails) => void; }> = ({ grupa, onEdit, onDelete }) => {
    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;
    
    return (
        <Card className="flex flex-col h-full group">
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-white">{grupa.denumire}</h3>
                <p className="text-sm text-slate-400 mb-4">{grupa.sala || 'Sală nespecificată'}</p>
                <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-green-400"><UsersIcon className="w-4 h-4"/><span>{sportiviCount} Sportivi Activi</span></div>
                </div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Orar</h4>
                <div className="space-y-1">
                    {sortProgram(grupa.program).map(p => (
                        <div key={p.id} className="text-xs font-semibold bg-slate-700/50 px-2 py-1 rounded-full text-slate-300">
                            {p.ziua}: {p.ora_start} - {p.ora_sfarsit}
                        </div>
                    ))}
                    {grupa.program.length === 0 && <p className="text-xs italic text-slate-500">Niciun program.</p>}
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-end gap-2">
                <Button size="sm" variant="danger" onClick={() => onDelete(grupa)}><TrashIcon className="w-4 h-4"/></Button>
                <Button size="sm" variant="primary" onClick={() => onEdit(grupa)}>Gestionează</Button>
            </div>
        </Card>
    );
};


// Componenta Principală
interface GrupeManagementProps { 
    onBack: () => void; 
}
export const GrupeManagement: React.FC<GrupeManagementProps> = ({ onBack }) => {
    const { currentUser, clubs, grupe, setGrupe } = useData();
    const [loading, setLoading] = useState(false); // Keep loading state if needed, or use loading from useData
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grupaToEdit, setGrupaToEdit] = useState<GrupaWithDetails | null>(null);
    const [grupaToDelete, setGrupaToDelete] = useState<GrupaWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showError, showSuccess } = useError();

    // Remove useEffect for fetching grupe, as it's now in DataContext

    const handleSave = async (grupaData: GrupaWithDetails) => {
        const { program, sportivi, ...grupaInfo } = grupaData;
        const { id: grupaId, ...grupaDbPayload } = grupaInfo;

        if (grupaToEdit) { // UPDATE
            const { data: updatedGrupa, error: grupaError } = await supabase.from('grupe').update(grupaDbPayload).eq('id', grupaToEdit.id).select().single();
            if (grupaError) { 
                console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
                showError("Eroare la actualizarea grupei", grupaError); 
                return; 
            }
            await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupaToEdit.id);
            if (program.length > 0) {
                const programToInsert = program.map(({ id, ...rest }) => ({ ...rest, grupa_id: grupaToEdit.id }));
                const { error: insertError } = await supabase.from('orar_saptamanal').insert(programToInsert);
                if (insertError) { 
                    console.error('DETALII EROARE:', JSON.stringify(insertError, null, 2));
                    showError("Eroare la sincronizarea programului", insertError); 
                    return; 
                }
            }
            const { data: newProgramItems } = await supabase.from('orar_saptamanal').select('*').eq('grupa_id', grupaToEdit.id);
            if (updatedGrupa) setGrupe(prev => (prev as GrupaWithDetails[]).map(g => g.id === grupaToEdit.id ? { ...g, ...updatedGrupa, program: newProgramItems || [] } : g));
            showSuccess("Succes", "Grupa a fost actualizată.");
        } else { // CREATE
            const { data: newGrupa, error: grupaError } = await supabase.from('grupe').insert(grupaDbPayload).select().single();
            if (grupaError) { 
                console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
                showError("Eroare la adăugarea grupei", grupaError); 
                return; 
            }
            if (newGrupa && program.length > 0) {
                const programToInsert = program.map(({id, ...rest}) => ({ ...rest, grupa_id: newGrupa.id }));
                await supabase.from('orar_saptamanal').insert(programToInsert);
            }
            if (newGrupa) {
                const { data: finalGrupa } = await supabase.from('grupe').select('*, sportivi(count), program:orar_saptamanal!grupa_id(*)').eq('id', newGrupa.id).single();
                setGrupe(prev => [...(prev as GrupaWithDetails[]), finalGrupa as GrupaWithDetails]);
                showSuccess("Succes", "Grupa a fost creată.");
            }
        }
    };

    const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
    const handleOpenEdit = (grupa: GrupaWithDetails) => { setGrupaToEdit(grupa); setIsModalOpen(true); };
    
    const confirmDelete = async (grupaId: string) => {
        const grupa = (grupe as GrupaWithDetails[]).find(g => g.id === grupaId);
        if ((grupa?.sportivi?.[0]?.count ?? 0) > 0) {
            showError("Ștergere Blocată", "Grupa are sportivi activi și nu poate fi ștearsă.");
            setGrupaToDelete(null);
            return;
        }
        setIsDeleting(true);
        await supabase.from('orar_saptamanal').delete().eq('grupa_id', grupaId);
        const { error: grupaError } = await supabase.from('grupe').delete().eq('id', grupaId);
        if (grupaError) { 
            console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
            showError("Eroare la ștergerea grupei", grupaError); 
        }
        else { setGrupe(prev => (prev as GrupaWithDetails[]).filter(g => g.id !== grupaId)); showSuccess("Succes", "Grupa a fost ștearsă."); }
        setIsDeleting(false);
        setGrupaToDelete(null);
    };

    // Remove loading check if not needed
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Management Grupe & Orar</h1>
                <Button onClick={handleOpenAdd} variant="info" className="w-full sm:w-auto"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grupă</Button>
            </div>
            {grupe.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(grupe as GrupaWithDetails[]).map(grupa => (
                        <GrupaCard key={grupa.id} grupa={grupa} onEdit={handleOpenEdit} onDelete={setGrupaToDelete} />
                    ))}
                </div>
            ) : (
                <Card className="text-center p-12">
                    <p className="text-slate-400 italic">Nicio grupă definită pentru acest club.</p>
                </Card>
            )}

            <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} currentUser={currentUser} clubs={clubs} />
            <ConfirmDeleteModal isOpen={!!grupaToDelete} onClose={() => setGrupaToDelete(null)} onConfirm={() => { if(grupaToDelete) confirmDelete(grupaToDelete.id) }} tableName="Grupe" isLoading={isDeleting} />
        </div>
    );
};
