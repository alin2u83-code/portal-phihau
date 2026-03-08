import React, { useState, useMemo } from 'react';
import { Eveniment, View, Sportiv, Rezultat, Plata, Permissions } from '../types';
import { Button, Modal, Input } from './ui';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './icons';
import { useError } from './ErrorProvider';
import { getPretValabil } from '../utils/pricing';
import { supabase } from '../supabaseClient';
import { useData } from '../contexts/DataContext';

interface CalendarEvent {
  id: string;
  title: string;
  scope: 'club' | 'federatie';
  time: string;
  date: string;
  isFuture: boolean;
  type: 'Antrenament' | 'Examen' | 'Stagiu' | 'Competitie';
  originalEvent: Eveniment;
}

interface BulkRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selectedSportivIds: string[]) => Promise<void>;
    event: Eveniment;
    clubSportivi: Sportiv[];
    registrations: Rezultat[];
}

const BulkRegistrationModal: React.FC<BulkRegistrationModalProps> = ({ isOpen, onClose, onSave, event, clubSportivi, registrations }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterTerm, setFilterTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const registeredIds = useMemo(() => new Set(registrations.filter(r => r.eveniment_id === event.id).map(r => r.sportiv_id)), [registrations, event.id]);

    const availableSportivi = useMemo(() => {
        return clubSportivi.filter(s => s.status === 'Activ' && !registeredIds.has(s.id));
    }, [clubSportivi, registeredIds]);

    const filteredSportivi = useMemo(() => {
        if (!filterTerm) return availableSportivi;
        return availableSportivi.filter(s => `${s.nume} ${s.prenume}`.toLowerCase().includes(filterTerm.toLowerCase()));
    }, [availableSportivi, filterTerm]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSaveClick = async () => {
        setLoading(true);
        await onSave(Array.from(selectedIds));
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Înscrie Lot la ${event.denumire}`}>
            <div className="space-y-4">
                <Input label="" placeholder="Filtrează sportivi..." value={filterTerm} onChange={e => setFilterTerm(e.target.value)} />
                <div className="max-h-80 overflow-y-auto space-y-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
                    {filteredSportivi.map(s => (
                        <label key={s.id} className="flex items-center gap-3 p-2 rounded-md bg-slate-700/50 hover:bg-slate-700 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => handleToggle(s.id)} className="h-5 w-5 rounded border-slate-500 bg-slate-900 text-brand-secondary focus:ring-brand-secondary" />
                            <span className="font-medium">{s.nume} {s.prenume}</span>
                        </label>
                    ))}
                    {filteredSportivi.length === 0 && <p className="text-center italic text-slate-400 p-4">Toți sportivii din club sunt deja înscriși sau nu există sportivi activi.</p>}
                </div>
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="primary" onClick={handleSaveClick} isLoading={loading} disabled={selectedIds.size === 0}>Înscrie {selectedIds.size > 0 ? `${selectedIds.size} Sportivi` : ''}</Button>
                </div>
            </div>
        </Modal>
    );
};

interface EventActionsProps {
    event: CalendarEvent;
    currentUser: any;
    rezultate: Rezultat[];
    clubSportivi: Sportiv[];
    onSingleRegister: (event: Eveniment) => Promise<void>;
    onBulkRegister: (event: Eveniment) => void;
    permissions: Permissions;
}

const EventActions: React.FC<EventActionsProps> = ({ event, currentUser, rezultate, clubSportivi, onSingleRegister, onBulkRegister, permissions }) => {
    const [loading, setLoading] = useState(false);

    const registrationStatus = useMemo(() => {
        if (permissions.isSportiv) {
            const isRegistered = rezultate.some(r => r.sportiv_id === currentUser.id && r.eveniment_id === event.id);
            return { isRegistered };
        }
        if (permissions.isAdminClub || permissions.isFederationAdmin) {
            const clubSportiviIds = new Set(clubSportivi.map(s => s.id));
            const registeredCount = rezultate.filter(r => r.eveniment_id === event.id && clubSportiviIds.has(r.sportiv_id)).length;
            return { registeredCount };
        }
        return {};
    }, [rezultate, currentUser, event.id, permissions, clubSportivi]);

    if (!event.isFuture || event.scope !== 'federatie') return null;
    
    const handleSingleClick = async () => {
        setLoading(true);
        await onSingleRegister(event.originalEvent);
        setLoading(false);
    };

    if (permissions.isSportiv) {
        if (registrationStatus.isRegistered) {
            return <div className="text-center text-sm font-bold bg-green-900/50 text-green-300 p-2 rounded-md w-full">Înscris</div>;
        }
        return <Button variant="primary" onClick={handleSingleClick} isLoading={loading} className="w-full md:w-auto">Mă înscriu</Button>;
    }

    if (permissions.isAdminClub || permissions.isFederationAdmin) {
        if ((registrationStatus.registeredCount ?? 0) > 0) {
            return <div className="text-center text-sm font-bold bg-green-900/50 text-green-300 p-2 rounded-md w-full">Lot Înscris ({registrationStatus.registeredCount})</div>;
        }
        return <Button variant="primary" onClick={() => onBulkRegister(event.originalEvent)} className="w-full md:w-auto">Înscriere Lot</Button>;
    }

    return null;
};


interface CalendarViewProps {
    onBack: () => void;
    onNavigate: (view: View) => void;
    permissions: Permissions;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onBack, onNavigate, permissions }) => {
    const { filteredData, locatii, currentUser, setRezultate, setPlati, preturiConfig } = useData();
    const antrenamente = filteredData.antrenamente;
    const sesiuniExamene = filteredData.sesiuniExamene;
    const evenimente = filteredData.evenimente;
    const sportivi = filteredData.sportivi;
    const rezultate = filteredData.rezultate;

    const [currentDate, setCurrentDate] = useState(() => {
        const d = new Date();
        // Set to the first of the current month to avoid issues with days in month
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const { showError, showSuccess } = useError();
    const [modalEvent, setModalEvent] = useState<Eveniment | null>(null);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const handleSingleRegistration = async (event: Eveniment) => {
        if (!supabase) { showError("Eroare Configurare", "Client Supabase neconfigurat."); return; }
        if (!currentUser) return;
        const taxaConfig = getPretValabil(preturiConfig, event.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie', event.data);
        const newRezultat: Omit<Rezultat, 'id'> = { sportiv_id: currentUser.id, eveniment_id: event.id, rezultat: 'Participare' };

        try {
            const { data: rData, error: rError } = await supabase.from('rezultate').insert(newRezultat).select().single();
            if (rError) throw rError;
            setRezultate(prev => [...prev, rData as Rezultat]);

            if (taxaConfig) {
                const newPlata: Omit<Plata, 'id'> = { sportiv_id: currentUser.id, familie_id: currentUser.familie_id, suma: taxaConfig.suma, data: event.data, status: 'Neachitat', descriere: `Taxa ${event.tip}: ${event.denumire}`, tip: event.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie', observatii: 'Generat automat la înscriere.' };
                const { data: pData, error: pError } = await supabase.from('plati').insert(newPlata).select().single();
                if (pError) throw pError;
                setPlati(prev => [...prev, pData as Plata]);
            }
            showSuccess("Înscriere reușită!", `Te-ai înscris la ${event.denumire}.`);
        } catch (err) {
            console.error('DEBUG:', err);
            showError("Eroare la înscriere", err);
        }
    };

    const handleSaveBulkRegistration = async (selectedSportivIds: string[]) => {
        if (!supabase || !modalEvent) return;
        let newPlati: Plata[] = [];
        let newRezultate: Rezultat[] = [];
        let errorCount = 0;

        for (const sportivId of selectedSportivIds) {
            const sportiv = sportivi.find(s => s.id === sportivId);
            if (!sportiv) { errorCount++; continue; }
            
            const taxaConfig = getPretValabil(preturiConfig, modalEvent.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie', modalEvent.data);
            
            try {
                const { data: rData, error: rError } = await supabase.from('rezultate').insert({ sportiv_id: sportiv.id, eveniment_id: modalEvent.id, rezultat: 'Participare' }).select().single();
                if (rError) throw rError;
                newRezultate.push(rData as Rezultat);

                if (taxaConfig) {
                    const newPlata: Omit<Plata, 'id'> = { sportiv_id: sportiv.id, familie_id: sportiv.familie_id, suma: taxaConfig.suma, data: modalEvent.data, status: 'Neachitat', descriere: `Taxa ${modalEvent.tip}: ${modalEvent.denumire}`, tip: modalEvent.tip === 'Stagiu' ? 'Taxa Stagiu' : 'Taxa Competitie', observatii: 'Generat automat la înscriere lot.' };
                    const { data: pData, error: pError } = await supabase.from('plati').insert(newPlata).select().single();
                    if (pError) throw pError;
                    newPlati.push(pData as Plata);
                }
            } catch (err) {
                console.error('DEBUG:', err);
                errorCount++;
                showError(`Eroare la înscrierea lui ${sportiv.nume}`, err);
            }
        }

        if (newRezultate.length > 0) setRezultate(prev => [...prev, ...newRezultate]);
        if (newPlati.length > 0) setPlati(prev => [...prev, ...newPlati]);
        if (newRezultate.length > 0) showSuccess("Succes", `${newRezultate.length} sportivi au fost înscriși.`);
        if (errorCount > 0) showError("Atenție", `${errorCount} înscrieri au eșuat.`);
        setModalEvent(null);
    };

    const eventsByDate = useMemo(() => {
        const eventMap = new Map<string, CalendarEvent[]>();
        const today = new Date();
        today.setHours(0,0,0,0);

        const allEvents = [
            ...antrenamente.map(a => ({...a, type: 'Antrenament' as const, denumire: a.grupe?.denumire || 'Antrenament'})),
            ...sesiuniExamene.map(e => ({...e, type: 'Examen' as const, denumire: `Examen ${locatii.find(l => l.id === e.locatie_id)?.nume || ''}`})),
            ...evenimente.map(e => ({ ...e, type: e.tip })),
        ];

        allEvents.forEach(e => {
            const eventDate = new Date(e.data);
            const event: CalendarEvent = {
                id: e.id,
                title: e.denumire,
                scope: 'club_id' in e && e.club_id ? 'club' : 'federatie',
                time: 'ora_start' in e ? e.ora_start : '',
                date: e.data,
                isFuture: eventDate >= today,
                type: e.type,
                originalEvent: e as Eveniment,
            };
            if(e.type === 'Antrenament') event.scope = 'club';
            if(e.type === 'Examen') event.scope = 'club';

            const dateKey = e.data;
            const existing = eventMap.get(dateKey) || [];
            eventMap.set(dateKey, [...existing, event]);
        });

        eventMap.forEach((events, date) => {
            eventMap.set(date, events.sort((a, b) => a.time.localeCompare(b.time)));
        });

        return eventMap;
    }, [antrenamente, sesiuniExamene, evenimente, locatii]);


    const { days, monthName } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
        
        const daysArray: (Date | null)[] = Array(startingDayOfWeek).fill(null);
        for (let i = 1; i <= daysInMonth; i++) {
            daysArray.push(new Date(year, month, i));
        }
        return { days: daysArray, monthName };
    }, [currentDate]);

    const agendaDays = useMemo(() => {
        return days.filter((d): d is Date => d !== null).map(day => {
            const dateString = day.toISOString().split('T')[0];
            return { day, events: eventsByDate.get(dateString) || [] };
        }).filter(d => d.events.length > 0);
    }, [days, eventsByDate]);

    const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
    const weekdays = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    const eventStyles = {
        antrenament: 'bg-slate-700 text-slate-200 border border-slate-600',
        clubDefault: 'bg-slate-700 text-slate-200 border-l-4 border-slate-700',
        federatie: 'bg-slate-800 text-white border-l-4 border-brand-secondary shadow-glow-blue'
    };
    
    const getEventStyleClass = (event: CalendarEvent) => {
        if (event.scope === 'federatie') return eventStyles.federatie;
        if (event.type === 'Antrenament') return eventStyles.antrenament;
        return eventStyles.clubDefault;
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
                {permissions.hasAdminAccess && (
                    <Button onClick={() => onNavigate('stagii')} variant="primary">
                        <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Eveniment
                    </Button>
                )}
            </div>
            <div className="bg-light-navy rounded-lg shadow-md border border-slate-700">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold capitalize text-white">{monthName}</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)} className="!p-1.5 h-auto"><ChevronLeftIcon className="w-5 h-5"/></Button>
                        <Button variant="secondary" size="sm" onClick={() => {
                            const d = new Date();
                            d.setDate(1);
                            d.setHours(0, 0, 0, 0);
                            setCurrentDate(d);
                        }} className="text-xs px-3">Azi</Button>
                        <Button variant="secondary" size="sm" onClick={() => changeMonth(1)} className="!p-1.5 h-auto"><ChevronRightIcon className="w-5 h-5"/></Button>
                    </div>
                </div>

                {/* Desktop: Grid View */}
                <div className="hidden md:block">
                    <div className="grid grid-cols-7 border-b border-slate-700">
                        {weekdays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-bold uppercase text-slate-400">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 min-h-[60vh]">
                        {days.map((day, index) => {
                            if (!day) return <div key={`pad-${index}`} className="border-r border-b border-slate-700 bg-deep-navy"></div>;
                            const dateString = day.toISOString().split('T')[0];
                            const dayEvents = eventsByDate.get(dateString) || [];
                            const isCurrentDay = day.getTime() === today.getTime();
                            return (
                                <div key={dateString} className="border-r border-b border-slate-700 p-2 flex flex-col relative min-h-[120px] bg-light-navy/50 transition-colors hover:bg-light-navy/70">
                                    <span className={`font-bold text-sm ${isCurrentDay ? 'bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center' : 'text-slate-300'}`}>{day.getDate()}</span>
                                    <div className="mt-2 space-y-2 overflow-y-auto">
                                        {dayEvents.map(event => (
                                            <div key={event.id} className="space-y-1">
                                                <div title={event.title} className={`p-1 rounded-md text-[10px] font-bold truncate ${getEventStyleClass(event)}`}>
                                                    {event.time && <span className="font-mono mr-1">{event.time}</span>}
                                                    {event.title}
                                                </div>
                                                <EventActions event={event} currentUser={currentUser} rezultate={rezultate} clubSportivi={sportivi} onSingleRegister={handleSingleRegistration} onBulkRegister={setModalEvent} permissions={permissions} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile: Agenda View */}
                <div className="md:hidden">
                    {agendaDays.length > 0 ? (
                        agendaDays.map(({ day, events }) => (
                            <div key={day.toISOString()} className="p-4 border-b border-slate-700">
                                <h3 className="font-bold text-brand-secondary">{day.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric' })}</h3>
                                <div className="mt-2 space-y-4">
                                    {events.map(event => (
                                        <div key={event.id}>
                                            <div className={`p-2 rounded-md ${getEventStyleClass(event)}`}>
                                                <p className="font-bold">{event.title}</p>
                                                {event.time && <p className="text-xs font-mono">{event.time}</p>}
                                            </div>
                                            <div className="mt-2">
                                                 <EventActions event={event} currentUser={currentUser} rezultate={rezultate} clubSportivi={sportivi} onSingleRegister={handleSingleRegistration} onBulkRegister={setModalEvent} permissions={permissions} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="p-8 text-center text-slate-500 italic">Niciun eveniment programat în această lună.</p>
                    )}
                </div>
            </div>

            {modalEvent && <BulkRegistrationModal isOpen={!!modalEvent} onClose={() => setModalEvent(null)} onSave={handleSaveBulkRegistration} event={modalEvent} clubSportivi={sportivi} registrations={rezultate} />}
        </div>
    );
};