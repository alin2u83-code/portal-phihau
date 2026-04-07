import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem, User, Club, Sportiv } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useData } from '../contexts/DataContext';

import { GrupaFormModal } from './Grupe/GrupaFormModal';
import { GrupaCard } from './Grupe/GrupaCard';
import { AdaugaSportiviModal } from './Grupe/AdaugaSportiviModal';

// Interfață extinsă pentru datele aduse din Supabase
interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

// Componenta Principală
interface GrupeManagementProps { 
    onBack: () => void; 
}
export const Grupe: React.FC<GrupeManagementProps> = ({ onBack }) => {
    const { currentUser, clubs, grupe, setGrupe, locatii, activeRoleContext, sportivi, setSportivi } = useData();
    const [loading, setLoading] = useState(false); // Keep loading state if needed, or use loading from useData
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grupaToEdit, setGrupaToEdit] = useState<GrupaWithDetails | null>(null);
    const [grupaToDelete, setGrupaToDelete] = useState<GrupaWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [grupaForAdaugaSportivi, setGrupaForAdaugaSportivi] = useState<GrupaWithDetails | null>(null);
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

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
                const programToInsert = program.map(({ id, ...rest }) => ({ ...rest, grupa_id: grupaToEdit.id, club_id: grupaToEdit.club_id }));
                const { error: insertError } = await supabase.from('orar_saptamanal').insert(programToInsert);
                if (insertError) { 
                    console.error('DETALII EROARE:', JSON.stringify(insertError, null, 2));
                    showError("Eroare la sincronizarea programului", insertError); 
                    return; 
                }
            }
            const { data: newProgramItems } = await supabase.from('orar_saptamanal').select('*').eq('grupa_id', grupaToEdit.id);
            if (updatedGrupa) setGrupe(prev => (prev as GrupaWithDetails[]).map(g => g.id === grupaToEdit.id ? { ...g, ...updatedGrupa, program: newProgramItems || [] } : g));
            queryClient.invalidateQueries({ queryKey: ['grupe', activeRoleContext?.id] });
            showSuccess("Succes", "Grupa a fost actualizată.");
        } else { // CREATE
            const { data: newGrupa, error: grupaError } = await supabase.from('grupe').insert(grupaDbPayload).select().single();
            if (grupaError) { 
                console.error('DETALII EROARE:', JSON.stringify(grupaError, null, 2));
                showError("Eroare la adăugarea grupei", grupaError); 
                return; 
            }
            if (newGrupa && program.length > 0) {
                const programToInsert = program.map(({id, ...rest}) => ({ ...rest, grupa_id: newGrupa.id, club_id: newGrupa.club_id }));
                await supabase.from('orar_saptamanal').insert(programToInsert);
            }
            if (newGrupa) {
                const { data: finalGrupa } = await supabase.from('grupe').select('*, sportivi(count), program:orar_saptamanal!grupa_id(*)').eq('id', newGrupa.id).single();
                setGrupe(prev => [...(prev as GrupaWithDetails[]), finalGrupa as GrupaWithDetails]);
                queryClient.invalidateQueries({ queryKey: ['grupe', activeRoleContext?.id] });
                showSuccess("Succes", "Grupa a fost creată.");
            }
        }
    };

    const handleOpenAdd = () => { setGrupaToEdit(null); setIsModalOpen(true); };
    const handleOpenEdit = (grupa: GrupaWithDetails) => { setGrupaToEdit(grupa); setIsModalOpen(true); };

    const handleAdaugaSportiviInGrupa = async (sportiviIds: string[]) => {
        if (!grupaForAdaugaSportivi || sportiviIds.length === 0) return;
        const { error } = await supabase
            .from('sportivi')
            .update({ grupa_id: grupaForAdaugaSportivi.id })
            .in('id', sportiviIds);
        if (error) {
            showError("Eroare la adăugarea sportivilor", error);
            return;
        }
        // Actualizăm starea locală a sportivilor
        setSportivi(prev =>
            prev.map(s =>
                sportiviIds.includes(s.id)
                    ? { ...s, grupa_id: grupaForAdaugaSportivi.id }
                    : s
            )
        );
        // Actualizăm numărul de sportivi din grupă local
        setGrupe(prev =>
            (prev as GrupaWithDetails[]).map(g =>
                g.id === grupaForAdaugaSportivi.id
                    ? {
                        ...g,
                        sportivi: [{ count: (g.sportivi?.[0]?.count ?? 0) + sportiviIds.length }],
                    }
                    : g
            )
        );
        queryClient.invalidateQueries({ queryKey: ['sportivi'] });
        queryClient.invalidateQueries({ queryKey: ['grupe', activeRoleContext?.id] });
        showSuccess(
            "Succes",
            `${sportiviIds.length} sportiv${sportiviIds.length !== 1 ? 'i adăugați' : ' adăugat'} în ${grupaForAdaugaSportivi.denumire}.`
        );
    };
    
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
        else { 
            setGrupe(prev => (prev as GrupaWithDetails[]).filter(g => g.id !== grupaId)); 
            queryClient.invalidateQueries({ queryKey: ['grupe', activeRoleContext?.id] });
            showSuccess("Succes", "Grupa a fost ștearsă."); 
        }
        setIsDeleting(false);
        setGrupaToDelete(null);
    };

    // Remove loading check if not needed
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={onBack}><ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi</Button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Management Grupe & Orar</h1>
                </div>
                <Button onClick={handleOpenAdd} variant="info" className="w-full sm:w-auto"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grupă</Button>
            </div>
            {grupe.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(grupe as GrupaWithDetails[]).map(grupa => (
                        <GrupaCard key={grupa.id} grupa={grupa} onEdit={handleOpenEdit} onDelete={setGrupaToDelete} onAdaugaSportivi={setGrupaForAdaugaSportivi} />
                    ))}
                </div>
            ) : (
                <Card className="text-center p-12">
                    <p className="text-slate-400 italic">Nicio grupă definită pentru acest club.</p>
                </Card>
            )}

            <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} currentUser={currentUser} clubs={clubs} locatii={locatii} />
            <ConfirmDeleteModal isOpen={!!grupaToDelete} onClose={() => setGrupaToDelete(null)} onConfirm={() => { if(grupaToDelete) confirmDelete(grupaToDelete.id) }} tableName="Grupe" isLoading={isDeleting} />
            {grupaForAdaugaSportivi && (
                <AdaugaSportiviModal
                    isOpen={!!grupaForAdaugaSportivi}
                    onClose={() => setGrupaForAdaugaSportivi(null)}
                    grupa={grupaForAdaugaSportivi}
                    totiSportivii={sportivi as Sportiv[]}
                    sportiviInGrupa={(sportivi as Sportiv[]).filter(s => s.grupa_id === grupaForAdaugaSportivi.id)}
                    onSave={handleAdaugaSportiviInGrupa}
                />
            )}
        </div>
    );
};
