import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Prezenta, Sportiv, Grupa, ProgramItem } from '../types';
import { Button, Card, Input, Select, Modal, ConfirmationModal } from './ui';
import { PlusIcon, ArrowLeftIcon, TrashIcon, XIcon, RefreshCwIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

type DayOfWeek = ProgramItem['ziua'];
const daysOfWeek: DayOfWeek[] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

const getDayNameFromDate = (date: Date): DayOfWeek => {
    const days: DayOfWeek[] = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    return days[date.getUTCDay()]; // Use UTC day to prevent timezone shifts
};

const AntrenamentForm: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => Promise<void>;
    grupe: Grupa[];
}> = ({ isOpen, onClose, onSave, grupe }) => {
    
    const getInitialState = () => ({
        grupa_id: grupe[0]?.id || '',
        ora_inceput: '18:00',
        is_recurent: false,
        zileSaptamana: new Set<DayOfWeek>(),
        data_start: new Date().toISOString().split('T')[0],
        data_sfarsit: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    });
    
    const [formState, setFormState] = useState(getInitialState());
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    useEffect(() => {
        if (isOpen) {
            setFormState(getInitialState());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormState(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const toggleDay = (day: DayOfWeek) => {
        setFormState(prev => {
            const newDays = new Set(prev.zileSaptamana);
            newDays.has(day) ? newDays.delete(day) : newDays.add(day);
            return { ...prev, zileSaptamana: newDays };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.grupa_id) {
            showError("Grupă lipsă", "Vă rugăm selectați o grupă.");
            return;
        }
        if (formState.is_recurent && formState.zileSaptamana.size === 0) {
            showError("Zile lipsă", "Selectați cel puțin o zi pentru antrenamentul recurent.");
            return;
        }
        
        setLoading(true);

        const antrenamenteToInsert: Omit<Prezenta, 'id' | 'sportivi_prezenti_ids'>[] = [];
        const recurent_group_id = crypto.randomUUID();
        const dayMap: Record<DayOfWeek, number> = { 'Duminică': 0, 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6 };
        
        // Use UTC dates to avoid timezone issues
        const startDate = new Date(formState.data_start + 'T00:00:00Z');
        const endDate = new Date(formState.data_sfarsit + 'T00:00:00Z');
        let currentDate = new Date(startDate);

        while(currentDate <= endDate) {
            const isDaySelected = formState.is_recurent 
                ? Array.from(formState.zileSaptamana).some((day: DayOfWeek) => dayMap[day] === currentDate.getUTCDay())
                : currentDate.toISOString().split('T')[0] === startDate.toISOString().split('T')[0];

            if (isDaySelected) {
                 const ziua = getDayNameFromDate(currentDate);
                 antrenamenteToInsert.push({
                    grupa_id: formState.grupa_id,
                    data_antrenament: currentDate.toISOString().split('T')[0],
                    ziua: ziua,
                    ora_inceput: formState.ora_inceput,
                    is_recurent: formState.is_recurent,
                    recurent_group_id: formState.is_recurent ? recurent_group_id : null,
                 });
            }
            
            if (!formState.is_recurent) break; // Exit loop for single training
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        if (antrenamenteToInsert.length > 0) {
            const { error } = await supabase.from('program_antrenamente').insert(antrenamenteToInsert);
            if (error) {
                showError("Eroare la salvare", error);
            } else {
                await onSave();
                onClose();
            }
        } else {
            showError("Nicio dată validă", "Niciun antrenament nu a fost generat în intervalul selectat.");
        }
        
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Antrenament Nou" persistent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Grupa" name="grupa_id" value={formState.grupa_id} onChange={handleChange} required>
                        {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                    <Input label="Ora Început" type="time" name="ora_inceput" value={formState.ora_inceput} onChange={handleChange} required />
                </div>
                
                <div className="pt-4 border-t border-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="is_recurent" checked={formState.is_recurent} onChange={handleChange} className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary"/>
                        <span className="font-semibold text-white">Antrenament Recurent</span>
                    </label>
                </div>
                
                {formState.is_recurent ? (
                     <div className="p-4 bg-slate-900/50 rounded-lg space-y-4 border border-brand-primary/50 animate-fade-in-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="De la data" type="date" name="data_start" value={formState.data_start} onChange={handleChange} required />
                            <Input label="Până la data" type="date" name="data_sfarsit" value={formState.data_sfarsit} onChange={handleChange} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">În zilele de</label>
                            <div className="flex flex-wrap gap-2">
                                {daysOfWeek.map(day => (
                                    <button type="button" key={day} onClick={() => toggleDay(day)} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${formState.zileSaptamana.has(day) ? 'bg-brand-secondary text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{day}</button>
                                ))}
                            </div>
                        </div>
                     </div>
                ) : (
                    <Input label="Data Antrenamentului" type="date" name="data_start" value={formState.data_start} onChange={handleChange} required />
                )}

                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const AttendanceDetail: React.FC<{
    antrenament: Prezenta;
    onBack: () => void;
    sportivi: Sportiv[];
    grupe: Grupa[];
    onAttendanceSave: () => Promise<void>;
}> = ({ antrenament, onBack, sportivi, grupe, onAttendanceSave }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set(antrenament.sportivi_prezenti_ids));
    const [loading, setLoading] = useState(false);
    const { showError } = useError();

    const sportiviInGrupa = useMemo(() => {
        return sportivi
            .filter(s => s.status === 'Activ' && s.grupa_id === antrenament.grupa_id)
            .sort((a,b) => a.nume.localeCompare(b.nume));
    }, [sportivi, antrenament.grupa_id]);

    const handleCheckboxChange = (sportivId: string, isChecked: boolean) => {
        setPresentIds(prev => { const newSet = new Set(prev); if (isChecked) newSet.add(sportivId); else newSet.delete(sportivId); return newSet; });
    };

    const handleSave = async () => {
        setLoading(true);
        const { error: deleteError } = await supabase.from('prezenta_antrenament').delete().eq('antrenament_id', antrenament.id);

        if (deleteError) {
            showError("Eroare la actualizarea prezenței", deleteError);
            setLoading(false);
            return;
        }

        if (presentIds.size > 0) {
            const toInsert = Array.from(presentIds).map(sportiv_id => ({ antrenament_id: antrenament.id, sportiv_id }));
            const { error: insertError } = await supabase.from('prezenta_antrenament').insert(toInsert);
            if (insertError) {
                showError("Eroare la salvarea prezenței", insertError);
                setLoading(false);
                return;
            }
        }
        
        await onAttendanceSave();
        setLoading(false);
        onBack();
    };

    const grupaAntrenament = grupe.find(g => g.id === antrenament.grupa_id);

    return (
        <Card>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Listă</Button>
            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <h2 className="text-xl font-bold text-brand-secondary mb-2">Prezență Antrenament ({presentIds.size}/{sportiviInGrupa.length} prezenți)</h2>
                <div className="text-sm text-slate-400 grid grid-cols-2 md:grid-cols-3 gap-2">
                    <span>Data: <strong className="text-white">{antrenament.ziua}, {new Date(antrenament.data_antrenament  + 'T00:00:00Z').toLocaleDateString('ro-RO', { timeZone: 'UTC' })}</strong></span>
                    <span>Ora: <strong className="text-white">{antrenament.ora_inceput}</strong></span>
                    <span>Grupa: <strong className="text-white">{grupaAntrenament?.denumire}</strong></span>
                </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                {sportiviInGrupa.map(sportiv => (
                    <label key={sportiv.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 cursor-pointer">
                        <input type="checkbox" className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary" checked={presentIds.has(sportiv.id)} onChange={(e) => handleCheckboxChange(sportiv.id, e.target.checked)} />
                        <span className="font-medium">{sportiv.nume} {sportiv.prenume}</span>
                    </label>
                ))}
                {sportiviInGrupa.length === 0 && <p className="text-slate-400 italic text-center py-4">Nu există sportivi activi în această grupă.</p>}
            </div>

            <div className="mt-8 flex justify-end">
                 <Button onClick={handleSave} variant="success" size="md" className="px-8" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Prezența'}</Button>
            </div>
        </Card>
    );
};

const AntrenamentAstaziCard: React.FC<{
    antrenament: Prezenta;
    grupa?: Grupa;
    status: 'upcoming' | 'live' | 'finished';
    onCheckAttendance: (antrenament: Prezenta) => void;
}> = ({ antrenament, grupa, status, onCheckAttendance }) => {
    
    const statusStyles = {
        upcoming: 'border-brand-primary',
        live: 'border-red-500 animate-pulse-border',
        finished: 'border-slate-700 opacity-70',
    };
    
    const buttonText = status === 'finished' ? 'Verifică Prezența' : 'Prezență';

    return (
        <Card className={`flex flex-col justify-between transition-all duration-300 border-2 ${statusStyles[status]}`}>
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white mb-1">{grupa?.denumire || 'N/A'}</h3>
                    {status === 'live' && (
                        <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            LIVE
                        </div>
                    )}
                </div>
                <p className="text-3xl font-light text-slate-300">{antrenament.ora_inceput}</p>
                 <p className="text-sm text-slate-400 mt-2">Prezenți: <span className="font-bold text-brand-secondary">{antrenament.sportivi_prezenti_ids.length}</span></p>
            </div>
            <Button onClick={() => onCheckAttendance(antrenament)} variant="primary" className="w-full mt-4">
                {buttonText}
            </Button>
        </Card>
    );
};

const DeleteTrainingModal: React.FC<{
  antrenament: Prezenta | null;
  onClose: () => void;
  onDelete: (scope: 'single' | 'series') => void;
  loading: boolean;
}> = ({ antrenament, onClose, onDelete, loading }) => {
  if (!antrenament) return null;

  const isRecurent = antrenament.is_recurent && antrenament.recurent_group_id;

  return (
    <Modal isOpen={!!antrenament} onClose={onClose} title="Confirmare Ștergere Antrenament">
      <div className="space-y-4">
        <p className="text-slate-300">
          {isRecurent
            ? "Acesta este un antrenament recurent. Doriți să ștergeți întreaga serie sau doar această instanță?"
            : "Sunteți sigur că doriți să ștergeți acest antrenament? Această acțiune este ireversibilă."
          }
        </p>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
          <Button variant="danger" onClick={() => onDelete('single')} disabled={loading}>
            {loading ? 'Se șterge...' : 'Șterge Doar Acesta'}
          </Button>
          {isRecurent && (
            <Button variant="danger" onClick={() => onDelete('series')} disabled={loading}>
              {loading ? 'Se șterge...' : 'Șterge Întreaga Serie'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};


export const ActivitatiManagement: React.FC<{
    sportivi: Sportiv[];
    grupe: Grupa[];
    onBack: () => void;
}> = ({ sportivi, grupe, onBack }) => {
    
    const [antrenamente, setAntrenamente] = useState<Prezenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAntrenament, setSelectedAntrenament] = useState<Prezenta | null>(null);
    const [antrenamentToDelete, setAntrenamentToDelete] = useState<Prezenta | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { showError } = useError();
    const [filters, setFilters] = useState({ luna: '', grupa: '', tip: '' });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: antrenamenteData, error: antrenamenteError } = await supabase.from('program_antrenamente').select('*');
        if (antrenamenteError) { showError("Eroare la încărcarea antrenamentelor", antrenamenteError); setLoading(false); return; }

        const { data: prezenteData, error: prezenteError } = await supabase.from('prezenta_antrenament').select('*');
        if (prezenteError) { showError("Eroare la încărcarea prezențelor", prezenteError); setLoading(false); return; }

        const prezenteMap = new Map<string, string[]>();
        prezenteData.forEach(p => {
            if (!prezenteMap.has(p.antrenament_id)) prezenteMap.set(p.antrenament_id, []);
            prezenteMap.get(p.antrenament_id)?.push(p.sportiv_id);
        });

        const combinedData = (antrenamenteData || []).map(a => ({
            ...a,
            sportivi_prezenti_ids: prezenteMap.get(a.id) || []
        }));
        setAntrenamente(combinedData as Prezenta[]);
        setLoading(false);
    }, [showError]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteAntrenament = async (scope: 'single' | 'series') => {
        if (!antrenamentToDelete || !supabase) return;

        setDeleteLoading(true);
        let query = supabase.from('program_antrenamente').delete();

        if (scope === 'series' && antrenamentToDelete.recurent_group_id) {
            query = query.eq('recurent_group_id', antrenamentToDelete.recurent_group_id);
        } else {
            query = query.eq('id', antrenamentToDelete.id);
        }

        const { error } = await query;
        setDeleteLoading(false);
        if (error) { showError("Eroare la ștergere", error); } 
        else { 
            fetchData(); 
            setAntrenamentToDelete(null);
        }
    };

    const getStatus = (antrenament: Prezenta, now: Date): 'upcoming' | 'live' | 'finished' => {
        const startDateTime = new Date(`${antrenament.data_antrenament}T${antrenament.ora_inceput}`);
        const endDateTime = new Date(startDateTime.getTime() + 90 * 60000); // Assume 90 minutes duration
        if (now < startDateTime) return 'upcoming';
        if (now >= startDateTime && now <= endDateTime) return 'live';
        return 'finished';
    };

    const { antrenamenteAzi, alteAntrenamente } = useMemo(() => {
        const todayString = new Date().toISOString().split('T')[0];
        const azi = antrenamente.filter(a => a.data_antrenament === todayString).sort((a,b) => a.ora_inceput.localeCompare(b.ora_inceput));
        const altele = antrenamente.filter(a => a.data_antrenament !== todayString);
        return { antrenamenteAzi: azi, alteAntrenamente: altele };
    }, [antrenamente]);

    const filteredAlteAntrenamente = useMemo(() => {
        return alteAntrenamente.filter(a => {
            const date = new Date(a.data_antrenament + 'T00:00:00Z');
            const monthMatch = filters.luna === '' || date.getUTCMonth() === parseInt(filters.luna, 10);
            const groupMatch = filters.grupa === '' || a.grupa_id === filters.grupa;
            const tipMatch = filters.tip === '' || (filters.tip === 'normal' && a.is_recurent) || (filters.tip === 'extra' && !a.is_recurent);
            return monthMatch && groupMatch && tipMatch;
        }).sort((a,b) => new Date(b.data_antrenament).getTime() - new Date(a.data_antrenament).getTime() || b.ora_inceput.localeCompare(a.ora_inceput));
    }, [alteAntrenamente, filters]);

    if (loading) return <div className="text-center p-8">Se încarcă datele...</div>

    if (selectedAntrenament) {
        return <AttendanceDetail antrenament={selectedAntrenament} onBack={() => setSelectedAntrenament(null)} sportivi={sportivi} grupe={grupe} onAttendanceSave={fetchData} />;
    }

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Antrenamente & Prezență</h1>
                <Button onClick={() => setIsFormOpen(true)} style={{backgroundColor: '#3D3D99'}} className="hover:bg-blue-800"><PlusIcon className="w-5 h-5 mr-2" /> Antrenament Nou</Button>
            </div>
            
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-brand-secondary pl-3">Activitate Astăzi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {antrenamenteAzi.map(a => (
                        <AntrenamentAstaziCard
                            key={a.id}
                            antrenament={a}
                            grupa={grupe.find(g => g.id === a.grupa_id)}
                            status={getStatus(a, currentTime)}
                            onCheckAttendance={setSelectedAntrenament}
                        />
                    ))}
                </div>
                 {antrenamenteAzi.length === 0 && <Card className="text-center py-8"><p className="text-slate-400">Niciun antrenament programat pentru astăzi.</p></Card>}
            </div>

            <h2 className="text-2xl font-bold text-white mb-4 mt-12 border-l-4 border-slate-500 pl-3">Program Complet</h2>
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                     <Select label="Filtrează după lună" name="luna" value={filters.luna} onChange={e => setFilters(p => ({...p, luna: e.target.value}))}>
                        <option value="">Toate lunile</option>
                        {['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'].map((luna, index) => (
                            <option key={index} value={index}>{luna}</option>
                        ))}
                    </Select>
                    <Select label="Filtrează după grupă" name="grupa" value={filters.grupa} onChange={e => setFilters(p => ({...p, grupa: e.target.value}))}>
                        <option value="">Toate Grupele</option>
                        {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
                    </Select>
                    <Select label="Tip Antrenament" name="tip" value={filters.tip} onChange={e => setFilters(p => ({...p, tip: e.target.value}))}>
                        <option value="">Toate Tipurile</option>
                        <option value="normal">Normal (Recurent)</option>
                        <option value="extra">Vacanță / Extra</option>
                    </Select>
                    <Button onClick={() => setFilters({luna:'', grupa:'', tip: ''})} variant="secondary"><XIcon className="w-5 h-5 mr-2"/> Resetare</Button>
                </div>
            </Card>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-4 font-semibold">Data</th>
                                <th className="p-4 font-semibold">Ziua</th>
                                <th className="p-4 font-semibold">Ora</th>
                                <th className="p-4 font-semibold">Grupa</th>
                                <th className="p-4 font-semibold text-center">Prezenți</th>
                                <th className="p-4 font-semibold text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredAlteAntrenamente.map(a => {
                                const grupa = grupe.find(g => g.id === a.grupa_id);
                                return (
                                    <tr key={a.id} className="hover:bg-slate-700/50">
                                        <td className="p-4 font-medium">{new Date(a.data_antrenament + 'T00:00:00Z').toLocaleDateString('ro-RO', { timeZone: 'UTC' })}</td>
                                        <td className="p-4 text-slate-300">{a.ziua}</td>
                                        <td className="p-4 text-slate-400">{a.ora_inceput}</td>
                                        <td className="p-4 flex items-center gap-2">
                                            {a.is_recurent && <RefreshCwIcon className="w-4 h-4 text-brand-secondary" title="Antrenament Recurent"/>}
                                            <span>{grupa?.denumire || 'N/A'}</span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-brand-secondary">{a.sportivi_prezenti_ids.length}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Button onClick={() => setSelectedAntrenament(a)} variant="primary">Prezență</Button>
                                                <Button onClick={() => setAntrenamentToDelete(a)} variant="danger" size="sm" title="Șterge antrenamentul"><TrashIcon /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredAlteAntrenamente.length === 0 && <p className="p-4 text-center text-slate-400">Niciun antrenament conform filtrelor.</p>}
                </div>
            </Card>
            <AntrenamentForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSave={fetchData}
                grupe={grupe}
            />
            <DeleteTrainingModal
                antrenament={antrenamentToDelete}
                onClose={() => setAntrenamentToDelete(null)}
                onDelete={handleDeleteAntrenament}
                loading={deleteLoading}
            />
        </div>
    );
};