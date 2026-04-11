import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem, User, Club, Sportiv, Locatie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, TrashIcon, EditIcon, ArrowLeftIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { clearCache } from '../utils/cache';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useData } from '../contexts/DataContext';
import { useGrupe } from '../hooks/useGrupe';
import { usePermissions } from '../hooks/usePermissions';

import { GrupaFormModal } from './Grupe/GrupaFormModal';
import { GrupaCard } from './Grupe/GrupaCard';
import { AdaugaSportiviModal } from './Grupe/AdaugaSportiviModal';
import { OrarEditorModal } from './Grupe/OrarEditorModal';
import { GrupeSecundareModal } from './Grupe/GrupeSecundareModal';
import { TourOverlay, TourButton, TOURS } from './GhidUtilizator';

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
    const { currentUser, clubs, setGrupe, locatii, setLocatii, activeRoleContext, sportivi, setSportivi } = useData();

    // Fetch grupe direct — nu prin context (evită probleme de timing/cache la nivel de provider)
    const permissions = usePermissions(activeRoleContext);
    const grupeClubId = permissions.isFederationLevel ? null : (activeRoleContext?.club_id ?? null);
    const { data: grupeData, isLoading: grupeLoading, refetch: refetchGrupe } = useGrupe(activeRoleContext?.id, grupeClubId);
    const grupe = grupeData || [];

    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grupaToEdit, setGrupaToEdit] = useState<GrupaWithDetails | null>(null);
    const [grupaToDelete, setGrupaToDelete] = useState<GrupaWithDetails | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [grupaForAdaugaSportivi, setGrupaForAdaugaSportivi] = useState<GrupaWithDetails | null>(null);
    const [grupaForOrar, setGrupaForOrar] = useState<GrupaWithDetails | null>(null);
    const [grupaForSecundari, setGrupaForSecundari] = useState<GrupaWithDetails | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Șterge cache localStorage + invalidează React Query + re-fetch direct
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            await queryClient.invalidateQueries({ queryKey: ['grupe'] });
            await refetchGrupe();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLocatieAdded = (locatie: Locatie) => {
        if (setLocatii) {
            setLocatii((prev: Locatie[]) => [...prev, locatie]);
        }
    };

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
            queryClient.invalidateQueries({ queryKey: ['grupe'] });
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
                const { data: finalGrupa } = await supabase.from('grupe').select('*, sportivi!grupa_id(count), program:orar_saptamanal!grupa_id(*)').eq('id', newGrupa.id).single();
                setGrupe(prev => [...(prev as GrupaWithDetails[]), finalGrupa as GrupaWithDetails]);
                queryClient.invalidateQueries({ queryKey: ['grupe'] });
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
        queryClient.invalidateQueries({ queryKey: ['grupe'] });
        showSuccess(
            "Succes",
            `${sportiviIds.length} sportiv${sportiviIds.length !== 1 ? 'i adăugați' : ' adăugat'} în ${grupaForAdaugaSportivi.denumire}.`
        );
    };
    
    const handleScoateSportivDinGrupa = async (sportiviId: string) => {
        const { error } = await supabase.from('sportivi').update({ grupa_id: null }).eq('id', sportiviId);
        if (error) { showError('Eroare', error); return; }
        setSportivi(prev => (prev as Sportiv[]).map(s => s.id === sportiviId ? { ...s, grupa_id: null } : s));
        queryClient.invalidateQueries({ queryKey: ['grupe'] });
        await refetchGrupe();
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
            queryClient.invalidateQueries({ queryKey: ['grupe'] });
            showSuccess("Succes", "Grupa a fost ștearsă."); 
        }
        setIsDeleting(false);
        setGrupaToDelete(null);
    };

    if (grupeLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={onBack}><ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi</Button>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">Management Grupe & Orar</h1>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-slate-800 rounded-xl p-6 animate-pulse">
                            <div className="h-6 bg-slate-700 rounded w-2/3 mb-4"></div>
                            <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-slate-700 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={onBack}><ArrowLeftIcon className="w-5 h-5 mr-2" />Înapoi</Button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Management Grupe & Orar</h1>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="secondary"
                        onClick={handleRefresh}
                        isLoading={isRefreshing}
                        title="Reîncarcă datele (util dacă alți admini au făcut modificări)"
                        className="flex-1 sm:flex-none"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Actualizează
                    </Button>
                    <Button onClick={handleOpenAdd} variant="info" className="flex-1 sm:flex-none" data-tour="grupe-adauga"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Grupă</Button>
                </div>
            </div>
            {grupe.length > 0 ? (
                <div data-tour="grupe-lista" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(grupe as GrupaWithDetails[]).map(grupa => (
                        <GrupaCard key={grupa.id} grupa={grupa} onEdit={handleOpenEdit} onDelete={setGrupaToDelete} onAdaugaSportivi={setGrupaForAdaugaSportivi} onConfigurareOrar={setGrupaForOrar} onGestionareSecundari={setGrupaForSecundari} />
                    ))}
                </div>
            ) : (
                <Card className="text-center p-12">
                    <p className="text-slate-400 italic">Nicio grupă definită pentru acest club.</p>
                </Card>
            )}

            <TourOverlay steps={TOURS.grupe} pageKey="grupe" />
            <TourButton steps={TOURS.grupe} pageKey="grupe" />
            <GrupaFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} grupaToEdit={grupaToEdit} currentUser={currentUser} clubs={clubs} locatii={locatii} onLocatieAdded={handleLocatieAdded} />
            <ConfirmDeleteModal isOpen={!!grupaToDelete} onClose={() => setGrupaToDelete(null)} onConfirm={() => { if(grupaToDelete) confirmDelete(grupaToDelete.id) }} tableName="Grupe" isLoading={isDeleting} />
            {grupaForOrar && (
                <OrarEditorModal
                    isOpen={!!grupaForOrar}
                    onClose={() => setGrupaForOrar(null)}
                    grupa={grupaForOrar}
                    setGrupe={setGrupe}
                />
            )}
            {grupaForAdaugaSportivi && (
                <AdaugaSportiviModal
                    isOpen={!!grupaForAdaugaSportivi}
                    onClose={() => setGrupaForAdaugaSportivi(null)}
                    grupa={grupaForAdaugaSportivi}
                    totiSportivii={sportivi as Sportiv[]}
                    sportiviInGrupa={(sportivi as Sportiv[]).filter(s => s.grupa_id === grupaForAdaugaSportivi.id)}
                    onSave={handleAdaugaSportiviInGrupa}
                    onRemove={handleScoateSportivDinGrupa}
                />
            )}
            {grupaForSecundari && (
                <GrupeSecundareModal
                    isOpen={!!grupaForSecundari}
                    onClose={() => setGrupaForSecundari(null)}
                    grupa={grupaForSecundari}
                    totiSportivii={sportivi as Sportiv[]}
                    toateGrupele={grupe as GrupaWithDetails[]}
                    onChanged={handleRefresh}
                />
            )}
        </div>
    );
};
