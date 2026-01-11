import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Prezenta, Sportiv, Grupa, Plata } from '../types';
import { Button, Card, Input, Modal, Select } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ArrowLeftIcon, UserPlusIcon } from './icons';

// --- Attendance Detail Sub-components ---

const AddGuestModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAddGuest: (sportivId: string) => void;
    allSportivi: Sportiv[];
    currentMemberIds: Set<string>;
}> = ({ isOpen, onClose, onAddGuest, allSportivi, currentMemberIds }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const potentialGuests = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return allSportivi.filter(s => 
            !currentMemberIds.has(s.id) && 
            s.status === 'Activ' &&
            `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10);
    }, [searchTerm, allSportivi, currentMemberIds]);

    const handleSelect = (sportivId: string) => {
        onAddGuest(sportivId);
        setSearchTerm('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Sportiv Extra la Antrenament">
            <div className="space-y-4">
                <Input label="Caută sportiv..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nume sau prenume..." />
                <div className="max-h-60 overflow-y-auto space-y-2">
                    {potentialGuests.map(s => (
                        <div key={s.id} onClick={() => handleSelect(s.id)} className="p-3 bg-slate-700 hover:bg-slate-600 rounded-md cursor-pointer transition-colors">
                            {s.nume} {s.prenume}
                        </div>
                    ))}
                     {searchTerm && potentialGuests.length === 0 && <p className="text-slate-400 text-sm p-2">Niciun rezultat.</p>}
                </div>
            </div>
        </Modal>
    );
};

const SportivAttendanceCard: React.FC<{
    sportiv: Sportiv;
    isPresent: boolean;
    hasUnpaidFee: boolean;
    onToggle: () => void;
}> = ({ sportiv, isPresent, hasUnpaidFee, onToggle }) => {
    const baseClasses = "relative p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 flex flex-col items-center justify-center text-center h-24";
    const statusClasses = isPresent
        ? "bg-brand-primary border-brand-secondary shadow-lg shadow-brand-secondary/20"
        : "bg-slate-800/60 border-slate-700 hover:border-slate-500";
    
    return (
        <div onClick={onToggle} className={`${baseClasses} ${statusClasses}`}>
            {hasUnpaidFee && <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full ring-2 ring-slate-800" title="Abonament neachitat"></div>}
            <span className={`font-bold text-md ${isPresent ? 'text-white' : 'text-slate-300'}`}>{sportiv.nume} {sportiv.prenume}</span>
        </div>
    );
};

const SesiunePrezentaDetail: React.FC<{
    antrenament: Prezenta;
    grupa: Grupa | undefined;
    allSportivi: Sportiv[];
    allPlati: Plata[];
    onBack: () => void;
    onAttendanceChange: () => void;
}> = ({ antrenament, grupa, allSportivi, allPlati, onBack, onAttendanceChange }) => {
    const [presentSportivIds, setPresentSportivIds] = useState(new Set(antrenament.sportivi_prezenti_ids));
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const { showError } = useError();

    const unpaidFeesMap = useMemo(() => {
        const unpaid = new Map<string, boolean>();
        allPlati.forEach(plata => {
            if (plata.tip === 'Abonament' && plata.status !== 'Achitat') {
                if (plata.sportiv_id) unpaid.set(plata.sportiv_id, true);
                if (plata.familie_id) {
                    allSportivi.forEach(s => {
                        if (s.familie_id === plata.familie_id) unpaid.set(s.id, true);
                    });
                }
            }
        });
        return unpaid;
    }, [allPlati, allSportivi]);

    const { groupMembers, guestMembers } = useMemo(() => {
        const members = allSportivi.filter(s => s.grupa_id === antrenament.grupa_id && s.status === 'Activ');
        const memberIds = new Set(members.map(m => m.id));
        
        const allAssociatedIds = new Set([...antrenament.sportivi_prezenti_ids, ...members.map(m => m.id)]);

        const guests = Array.from(allAssociatedIds)
            .filter(id => !memberIds.has(id))
            .map(id => allSportivi.find(s => s.id === id))
            .filter((s): s is Sportiv => s !== undefined);
            
        return { groupMembers: members, guestMembers: guests };
    }, [allSportivi, antrenament]);

    const allAttendingSportivi = useMemo(() => [...groupMembers, ...guestMembers].sort((a, b) => a.nume.localeCompare(b.nume)), [groupMembers, guestMembers]);

    const handleTogglePresence = async (sportivId: string) => {
        if (!supabase) return;
        const isCurrentlyPresent = presentSportivIds.has(sportivId);
        const optimisticState = new Set(presentSportivIds);
        if (isCurrentlyPresent) optimisticState.delete(sportivId); else optimisticState.add(sportivId);
        setPresentSportivIds(optimisticState);

        try {
            if (isCurrentlyPresent) {
                const { error } = await supabase.from('prezenta_antrenament').delete().match({ antrenament_id: antrenament.id, sportiv_id: sportivId });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('prezenta_antrenament').insert({ antrenament_id: antrenament.id, sportiv_id: sportivId });
                if (error) throw error;
            }
            onAttendanceChange(); // Re-fetch data to update counts
        } catch (error: any) {
            showError("Eroare la actualizarea prezenței", error);
            setPresentSportivIds(presentSportivIds); // Revert optimistic update
        }
    };
    
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Sesiuni</Button>
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{grupa?.denumire}</h2>
                        <p className="text-slate-400">{new Date(antrenament.data).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })} @ {antrenament.ora_inceput}</p>
                    </div>
                    <Button onClick={() => setIsGuestModalOpen(true)} variant="info" className="self-start sm:self-center"><UserPlusIcon className="w-5 h-5 mr-2" /> Adaugă Sportiv Extra</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allAttendingSportivi.map(sportiv => (
                        <SportivAttendanceCard 
                            key={sportiv.id}
                            sportiv={sportiv}
                            isPresent={presentSportivIds.has(sportiv.id)}
                            hasUnpaidFee={unpaidFeesMap.has(sportiv.id)}
                            onToggle={() => handleTogglePresence(sportiv.id)}
                        />
                    ))}
                </div>
                 {allAttendingSportivi.length === 0 && <p className="text-slate-400 text-center py-8">Niciun sportiv în această grupă.</p>}
            </Card>
             <AddGuestModal 
                isOpen={isGuestModalOpen} 
                onClose={() => setIsGuestModalOpen(false)} 
                allSportivi={allSportivi}
                currentMemberIds={new Set(groupMembers.map(m => m.id))}
                onAddGuest={handleTogglePresence}
            />
        </div>
    );
};

// --- Main Management Component ---

interface AntrenamenteManagementProps {
    sportivi: Sportiv[];
    grupe: Grupa[];
    plati: Plata[];
}

export const AntrenamenteManagement: React.FC<AntrenamenteManagementProps> = ({ sportivi, grupe, plati }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [antrenamentePeZi, setAntrenamentePeZi] = useState<Prezenta[]>([]);
    const [selectedAntrenament, setSelectedAntrenament] = useState<Prezenta | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();

    const fetchDataForDate = useCallback(async (dateStr: string) => {
        if (!supabase) return;
        setLoading(true);
        setSelectedAntrenament(null);

        try {
            const targetDate = new Date(dateStr + 'T12:00:00Z'); // Use noon to avoid timezone issues
            const ziua = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'][targetDate.getUTCDay()];
            
            const { data: scheduleData, error: scheduleError } = await supabase.from('program_antrenamente').select('*').eq('ziua', ziua).eq('is_recurent', true);
            if (scheduleError) throw scheduleError;

            const { data: instanceData, error: instanceError } = await supabase.from('program_antrenamente').select('*').eq('data', dateStr);
            if (instanceError) throw instanceError;

            const existingInstanceMap = new Map(instanceData.map(i => [`${i.grupa_id}-${i.ora_inceput}`, i]));
            const instancesToCreate = scheduleData.filter(s => !existingInstanceMap.has(`${s.grupa_id}-${s.ora_inceput}`));

            if (instancesToCreate.length > 0) {
                const newInstances = instancesToCreate.map(s => ({
                    grupa_id: s.grupa_id, data: dateStr, ziua: s.ziua,
                    ora_inceput: s.ora_inceput, ora_sfarsit: s.ora_sfarsit, is_recurent: false
                }));
                const { error: createError } = await supabase.from('program_antrenamente').insert(newInstances);
                if (createError) throw createError;
            }

            const { data: finalInstances, error: finalError } = await supabase.from('program_antrenamente').select('*').eq('data', dateStr).order('ora_inceput');
            if (finalError) throw finalError;

            const { data: prezenteData, error: prezenteError } = await supabase.from('prezenta_antrenament').select('*').in('antrenament_id', finalInstances.map(i => i.id));
            if (prezenteError) throw prezenteError;

            const prezenteMap = new Map<string, string[]>();
            prezenteData.forEach(p => {
                if (!prezenteMap.has(p.antrenament_id)) prezenteMap.set(p.antrenament_id, []);
                prezenteMap.get(p.antrenament_id)?.push(p.sportiv_id);
            });
            
            const combinedData = finalInstances.map(a => ({ ...a, sportivi_prezenti_ids: prezenteMap.get(a.id) || [] }));
            setAntrenamentePeZi(combinedData as Prezenta[]);
        } catch (error: any) {
            showError("Eroare la încărcarea datelor", error);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchDataForDate(selectedDate);
    }, [selectedDate, fetchDataForDate]);

    if (selectedAntrenament) {
        return (
            <SesiunePrezentaDetail
                antrenament={selectedAntrenament}
                grupa={grupe.find(g => g.id === selectedAntrenament.grupa_id)}
                allSportivi={sportivi}
                allPlati={plati}
                onBack={() => setSelectedAntrenament(null)}
                onAttendanceChange={() => fetchDataForDate(selectedDate)}
            />
        );
    }

    return (
        <div>
            <Card className="mb-6">
                <div className="flex items-end gap-4">
                    <Input label="Selectează Data" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    <Button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} variant="secondary">Azi</Button>
                </div>
            </Card>

            {loading ? <p className="text-center text-slate-400 py-8">Se încarcă sesiunile...</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {antrenamentePeZi.length === 0 && <p className="text-slate-400 italic md:col-span-3 text-center py-8">Niciun antrenament programat pentru această zi.</p>}
                    {antrenamentePeZi.map(a => {
                        const grupa = grupe.find(g => g.id === a.grupa_id);
                        return (
                            <Card key={a.id} className="cursor-pointer hover:border-brand-secondary transition-colors duration-300 transform hover:-translate-y-1" onClick={() => setSelectedAntrenament(a)}>
                                <h3 className="font-bold text-lg text-white">{grupa?.denumire}</h3>
                                <p className="text-slate-400 text-sm">{a.ora_inceput} - {a.ora_sfarsit}</p>
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <p className="font-bold text-2xl text-brand-secondary">{a.sportivi_prezenti_ids.length} prezenți</p>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
