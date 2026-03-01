import React, { useState, useMemo, useEffect } from 'react';
import { Antrenament, Sportiv, Grupa } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon, CheckCircleIcon, CalendarDaysIcon } from './icons';
import { useAttendanceData } from '../hooks/useAttendanceData';
import { useError } from './ErrorProvider';

interface ListaPrezentaAntrenamentProps {
    grupa: Grupa;
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
}

// Helper: Get today's date string (YYYY-MM-DD)
const getTodayString = () => new Date().toISOString().split('T')[0];

// Helper: Filter trainings for today
const filterTrainingsForToday = (antrenamente: Antrenament[]) => {
    const today = getTodayString();
    return antrenamente.filter(a => a.data === today).sort((a, b) => a.ora_start.localeCompare(b.ora_start));
};

// Component: Attendance Marking Form
export const FormularPrezenta: React.FC<{
    antrenament: Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }};
    onBack: () => void;
    onViewSportiv?: (s: Sportiv) => void;
    saveAttendance: (id: string, records: { sportiv_id: string; status: 'prezent' | 'absent' }[]) => Promise<boolean>;
}> = ({ antrenament, onBack, onViewSportiv, saveAttendance }) => {
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // Populate initial data
    useEffect(() => {
        const initialPresent = new Set(
            (antrenament.prezenta || [])
                .filter(p => p.status === 'prezent')
                .map(p => p.sportiv_id)
        );
        setPresentIds(initialPresent);
    }, [antrenament]);

    const sportiviInGrupa = useMemo(() => {
        return (antrenament.grupe?.sportivi || [])
            .filter(s => s.status === 'Activ')
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [antrenament.grupe]);

    // Helper: Toggle individual checkbox
    const handleToggle = (sportivId: string) => {
        setPresentIds(prev => {
            const next = new Set(prev);
            if (next.has(sportivId)) next.delete(sportivId);
            else next.add(sportivId);
            return next;
        });
    };

    // Helper: Select/Deselect All
    const handleSelectAll = (present: boolean) => {
        setPresentIds(present ? new Set(sportiviInGrupa.map(s => s.id)) : new Set());
    };

    // Helper: Handle Save
    const handleSave = async () => {
        setLoading(true);
        setSaved(false);
        
        const records = sportiviInGrupa.map(s => ({
            sportiv_id: s.id,
            status: presentIds.has(s.id) ? 'prezent' as const : 'absent' as const,
        }));

        const success = await saveAttendance(antrenament.id, records);
        
        setLoading(false);
        if (success) {
            setSaved(true);
            // Hide success indicator after 3 seconds
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <Card className={`transition-all duration-300 relative ${saved ? 'ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}`}>
            {saved && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse flex items-center gap-1 shadow-md z-10">
                    <CheckCircleIcon className="w-4 h-4" /> Prezență Salvată!
                </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
                <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="mr-2"/> Înapoi</Button>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-white">Prezență: {antrenament.grupe?.denumire}</h2>
                    <p className="text-sm text-slate-400">{new Date(antrenament.data).toLocaleDateString('ro-RO')} • {antrenament.ora_start}</p>
                </div>
            </div>

            <div className="flex gap-2 mb-4 p-2 bg-slate-800/30 rounded-lg">
                <Button size="sm" variant="secondary" onClick={() => handleSelectAll(true)}>Toți Prezenți</Button>
                <Button size="sm" variant="secondary" onClick={() => handleSelectAll(false)}>Toți Absenți</Button>
                <span className="ml-auto text-sm text-slate-400 flex items-center">
                    {presentIds.size} / {sportiviInGrupa.length} prezenți
                </span>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {sportiviInGrupa.map(s => (
                    <div 
                        key={s.id} 
                        className={`flex items-center gap-3 p-3 rounded-md transition-colors ${presentIds.has(s.id) ? 'bg-green-900/20 border border-green-800/30' : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50'}`}
                        onClick={() => handleToggle(s.id)}
                    >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${presentIds.has(s.id) ? 'bg-green-500 border-green-500' : 'border-slate-500'}`}>
                            {presentIds.has(s.id) && <CheckCircleIcon className="w-4 h-4 text-white" />}
                        </div>
                        <span 
                            className={`font-medium flex-grow select-none ${onViewSportiv ? 'hover:text-brand-primary hover:underline' : ''}`}
                            onClick={(e) => {
                                if (onViewSportiv) {
                                    e.stopPropagation();
                                    onViewSportiv(s);
                                }
                            }}
                        >
                            {s.nume} {s.prenume}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-700">
                <Button variant="success" size="md" onClick={handleSave} isLoading={loading} className="w-full sm:w-auto">
                    Confirmă Prezența Lot
                </Button>
            </div>
        </Card>
    );
};

export const ListaPrezentaAntrenament: React.FC<ListaPrezentaAntrenamentProps> = ({ grupa, onBack, onViewSportiv }) => {
    const { antrenamente, loading, saveAttendance } = useAttendanceData(grupa.club_id);
    const [selectedTraining, setSelectedTraining] = useState<(Antrenament & { grupe: Grupa & { sportivi: Sportiv[] }}) | null>(null);

    const todaysTrainings = useMemo(() => {
        // Filter by group ID and today's date
        const filtered = filterTrainingsForToday(antrenamente).filter(a => a.grupa_id === grupa.id);
        return filtered;
    }, [antrenamente, grupa.id]);

    if (selectedTraining) {
        return (
            <FormularPrezenta 
                antrenament={selectedTraining} 
                onBack={() => setSelectedTraining(null)} 
                onViewSportiv={onViewSportiv}
                saveAttendance={saveAttendance}
            />
        );
    }

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-4"><ArrowLeftIcon className="mr-2"/> Înapoi la Grupe</Button>
            <Card>
                <h2 className="text-xl font-bold text-white mb-1">Antrenamente Azi: {grupa.denumire}</h2>
                <p className="text-sm text-slate-400 mb-6">{new Date().toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                
                {loading ? (
                    <p className="text-center p-8 text-slate-400">Se încarcă antrenamentele...</p>
                ) : todaysTrainings.length === 0 ? (
                    <div className="text-center p-8 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <CalendarDaysIcon className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">Nu există antrenamente programate pentru astăzi.</p>
                        <p className="text-xs text-slate-500 mt-1">Verifică orarul sau calendarul pentru alte zile.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaysTrainings.map(a => (
                            <div key={a.id} className="p-4 bg-slate-700/50 rounded-lg flex justify-between items-center hover:bg-slate-700 transition-colors border border-slate-600/30">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${a.is_recurent ? 'bg-sky-900/50 text-sky-300' : 'bg-amber-900/50 text-amber-300'}`}>
                                            {a.is_recurent ? 'Recurent' : 'Extra'}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-white">{a.ora_start} - {a.ora_sfarsit}</span>
                                </div>
                                <Button size="sm" onClick={() => setSelectedTraining(a as any)}>
                                    Bifează Prezența &rarr;
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};
