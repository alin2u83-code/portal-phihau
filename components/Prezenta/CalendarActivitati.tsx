import React from 'react';
import { Grupa } from '../../types';
import { Button, Card, Input } from '../ui';
import { ArrowLeftIcon, CalendarDaysIcon } from '../icons';
import { useCalendarView } from '../../hooks/useCalendarView';
import { AntrenamentForm } from '../AntrenamentForm';

export const CalendarActivitati: React.FC<{
    grupa: Grupa; onSelect: (id: string) => void; onBack: () => void; grupe: Grupa[]
}> = ({ grupa, onSelect, onBack, grupe }) => {
    const {
        date, setDate,
        daysToGenerate, setDaysToGenerate,
        antrenamente,
        loading,
        isFormOpen, setIsFormOpen,
        handleGenerate,
        handleSaveCustom
    } = useCalendarView(grupa.id);

    return (
        <div className="space-y-6 animate-fade-in">
            <Button onClick={onBack} variant="secondary" size="sm">
                <ArrowLeftIcon className="w-4 h-4 mr-2"/> Înapoi la Orar
            </Button>

            <Card className="overflow-hidden border-none shadow-xl bg-slate-900/40 backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarDaysIcon className="w-6 h-6 text-indigo-400" />
                        Calendar Activități: <span className="text-indigo-300">{grupa.denumire}</span>
                    </h2>
                    <p className="text-slate-400 mt-1">Gestionează instanțele reale de antrenament și prezența.</p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                        <Input label="Afișează data" type="date" value={date} onChange={e => setDate(e.target.value)} />
                        <Input label="Zile în avans" type="number" value={daysToGenerate} onChange={e => setDaysToGenerate(parseInt(e.target.value) || 0)} />
                        <Button onClick={handleGenerate} isLoading={loading} className="w-full">Generează Calendar</Button>
                        <Button variant="info" onClick={() => setIsFormOpen(true)} className="w-full">+ Adaugă Antrenament</Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Antrenamente Programate</h3>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : antrenamente.length === 0 ? (
                            <div className="text-center py-12 bg-slate-800/10 rounded-2xl border border-dashed border-slate-800">
                                <CalendarDaysIcon className="w-12 h-12 text-slate-700 mx-auto mb-3 opacity-20" />
                                <p className="text-slate-500 italic">Niciun antrenament programat pentru această dată.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {antrenamente.map(a => (
                                    <div key={a.id} className="group p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/50 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.is_recurent ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                <CalendarDaysIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${a.is_recurent ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {a.is_recurent ? 'Recurent' : 'Personalizat'}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">#{a.id.slice(0, 8)}</span>
                                                </div>
                                                <p className="text-lg font-bold text-white leading-none">{a.ora_start} - {a.ora_sfarsit}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => onSelect(a.id)} className="w-full sm:w-auto shadow-lg shadow-indigo-500/10">
                                            Bifează Prezența &rarr;
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            <AntrenamentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveCustom} grupaId={grupa.id} grupe={grupe} />
        </div>
    );
};
