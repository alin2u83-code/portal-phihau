import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grupa as GrupaType, ProgramItem, Antrenament } from '../../types';
import { Button, Card, Input, Modal, ConfirmButton, Badge } from '../ui';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { clearCache } from '../../utils/cache';
import { useCalendarView } from '../../hooks/useCalendarView';
import { formatTime } from '../../utils/date';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

type TabId = 'antrenamente' | 'orar' | 'sportivi';

interface GrupaDetailViewProps {
    grupa: GrupaWithDetails;
    onBack: () => void;
    onOpenAdaugaSportivi: (g: GrupaWithDetails) => void;
}

// --- Calendar constants & helpers ---

const LUNI_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

function getCalendarCells(year: number, month: number): (string | null)[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // getDay(): 0=D, 1=L, ..., 6=S → transformăm în Luni-first: (getDay() + 6) % 7
    const startOffset = (firstDay.getDay() + 6) % 7; // 0=Luni, 6=Duminică
    const cells: (string | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push(dateStr);
    }
    return cells;
}

function statusVariant(status?: string): 'green' | 'red' | 'amber' | 'slate' {
    if (status === 'planificat') return 'green';
    if (status === 'anulat') return 'red';
    if (status === 'efectuat') return 'amber';
    return 'slate';
}

// Tab Antrenamente — calendar lunar funcțional (Phase 3)
const TabAntrenamente: React.FC<{
    grupa: GrupaWithDetails;
    isModalAdaugareOpen: boolean;
    setIsModalAdaugareOpen: (v: boolean) => void;
}> = ({ grupa, isModalAdaugareOpen, setIsModalAdaugareOpen }) => {
    const { showError, showSuccess } = useError();

    // --- Hook calendar ---
    const {
        date,
        setDate,
        selectedDate,
        setSelectedDate,
        todayLocal,
        antrenamente,
        loading,
        fetchAntrenamente,
        handleSaveCustom,
    } = useCalendarView(grupa.id);

    // --- Derivate lună curentă ---
    // WR-06: radix explicit 10 pentru a preveni comportament neașteptat
    const currentYear = parseInt(date.substring(0, 4), 10);
    const currentMonth = parseInt(date.substring(5, 7), 10) - 1; // 0-indexed

    // --- Grupare antrenamente pe zile ---
    const antrenamenteByDate = useMemo(() => {
        const map: Record<string, Antrenament[]> = {};
        antrenamente.forEach(a => {
            if (!map[a.data]) map[a.data] = [];
            map[a.data].push(a);
        });
        return map;
    }, [antrenamente]);

    // --- State modal anulare ---
    const [modalAnulareId, setModalAnulareId] = useState<string | null>(null);
    const [motivAnulare, setMotivAnulare] = useState('');

    // --- State form adăugare ---
    const [formData, setFormData] = useState({
        data: selectedDate || todayLocal,
        ora_start: '18:00',
        ora_sfarsit: '19:30',
    });

    // Re-sync data cu ziua selectată la deschiderea modalului
    useEffect(() => {
        if (isModalAdaugareOpen) {
            setFormData(f => ({ ...f, data: selectedDate || todayLocal }));
        }
    }, [isModalAdaugareOpen, selectedDate, todayLocal]);

    // --- Navigare lună ---
    const navigateMonth = (direction: -1 | 1) => {
        // Folosim aritmetică directă pe an/lună pentru a evita overflow-ul setMonth()
        // Ex: Jan 31 + 1 lună cu setMonth() → Mar 3 (overflow); cu aritmetică → Feb 01
        const yr = parseInt(date.substring(0, 4), 10);
        const mo = parseInt(date.substring(5, 7), 10) - 1; // 0-indexed
        const newDate = new Date(yr, mo + direction, 1);
        const yyyy = newDate.getFullYear();
        const mm = String(newDate.getMonth() + 1).padStart(2, '0');
        setDate(`${yyyy}-${mm}-01`);
        setSelectedDate(null); // Pitfall 4 — reset selectedDate la schimbarea lunii
    };

    // --- Mutații CRUD locale (D-13) ---
    const handleAnulare = async (id: string, motiv: string | null) => {
        const { error } = await supabase
            .from('program_antrenamente')
            .update({ status: 'anulat', motiv_anulare: motiv })
            .eq('id', id);
        if (error) {
            showError('Eroare anulare', error.message);
            return;
        }
        showSuccess('Succes', 'Antrenamentul a fost anulat.');
        await fetchAntrenamente();
    };

    const handleReactivare = async (id: string) => {
        const { error } = await supabase
            .from('program_antrenamente')
            .update({ status: 'planificat', motiv_anulare: null })
            .eq('id', id);
        if (error) {
            showError('Eroare reactivare', error.message);
            return;
        }
        showSuccess('Succes', 'Antrenamentul a fost reactivat.');
        await fetchAntrenamente();
    };

    const handleStergere = async (id: string) => {
        const { error } = await supabase
            .from('program_antrenamente')
            .delete()
            .eq('id', id);
        if (error) {
            showError('Eroare ștergere', error.message);
            return;
        }
        showSuccess('Succes', 'Antrenamentul a fost șters.');
        await fetchAntrenamente();
    };

    const deschideModalAnulare = (id: string) => {
        setModalAnulareId(id);
        setMotivAnulare('');
    };

    // --- Submit adăugare one-off ---
    const handleSubmitAdaugare = async () => {
        await handleSaveCustom({
            grupa_id: grupa.id,
            is_recurent: false,
            data: formData.data,
            ora_start: formData.ora_start,
            ora_sfarsit: formData.ora_sfarsit,
        }, grupa.club_id ?? undefined); // Pitfall 6 — club_id obligatoriu pentru RLS
        setIsModalAdaugareOpen(false);
    };

    // --- Antrenamente pentru ziua selectată ---
    const antrenamenteForSelectedDay = selectedDate ? (antrenamenteByDate[selectedDate] || []) : [];

    // --- Celule calendar ---
    const calendarCells = getCalendarCells(currentYear, currentMonth);

    if (loading) {
        return <div className="text-center py-8 text-slate-400">Se încarcă antrenamentele…</div>;
    }

    return (
        <div className="space-y-4">
            {/* Calendar header */}
            <div className="flex items-center justify-between px-1">
                <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                    aria-label="Luna anterioară"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-base font-bold text-white">
                    {LUNI_RO[currentMonth]} {currentYear}
                </span>
                <button
                    onClick={() => navigateMonth(1)}
                    className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                    aria-label="Luna următoare"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((zi, i) => (
                    <div key={i} className="text-center text-xs font-bold text-slate-400 py-1">
                        {zi}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cellDate, idx) => {
                    if (!cellDate) {
                        return <div key={`empty-${idx}`} className="min-h-[40px]" />;
                    }
                    const dotsForDay = antrenamenteByDate[cellDate] || [];
                    const isToday = cellDate === todayLocal;
                    const isSelected = cellDate === selectedDate;

                    return (
                        <div
                            key={cellDate}
                            onClick={() => setSelectedDate(cellDate)}
                            className={[
                                'min-h-[40px] rounded-lg text-center text-sm p-1 cursor-pointer transition-all flex flex-col items-center justify-start gap-0.5',
                                isSelected
                                    ? 'bg-indigo-600/30 ring-1 ring-indigo-500'
                                    : 'hover:bg-slate-700/50',
                                isToday
                                    ? 'ring-2 ring-indigo-400 font-bold'
                                    : '',
                            ].join(' ')}
                        >
                            <span className={`text-sm leading-6 ${isToday ? 'font-bold text-white' : 'text-slate-300'}`}>
                                {parseInt(cellDate.substring(8, 10))}
                            </span>
                            {dotsForDay.length > 0 && (
                                <div className="flex gap-0.5 justify-center min-h-[6px]">
                                    {dotsForDay.slice(0, 3).map(a => (
                                        <span
                                            key={a.id}
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                a.status === 'anulat' ? 'bg-rose-400' : 'bg-emerald-400'
                                            }`}
                                        />
                                    ))}
                                    {dotsForDay.length > 3 && (
                                        <span className="text-[9px] text-slate-400 leading-none">...</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* DayPanel */}
            <div className="mt-4 border-t border-slate-700 pt-4">
                {selectedDate === null ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                        Selectează o zi din calendar pentru a vedea antrenamentele.
                    </p>
                ) : antrenamenteForSelectedDay.length === 0 ? (
                    <Card className="text-center py-6">
                        <p className="text-sm font-semibold text-slate-300 mb-1">
                            Niciun antrenament pe {selectedDate}
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                            Apasă butonul pentru a adăuga un antrenament one-off în această zi.
                        </p>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsModalAdaugareOpen(true)}
                            className="min-h-[40px] touch-manipulation"
                        >
                            <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Antrenament
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {antrenamenteForSelectedDay.map(a => (
                            <div
                                key={a.id}
                                className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50 min-h-[44px]"
                            >
                                <span className="text-sm font-mono text-slate-200 shrink-0">
                                    {formatTime(a.ora_start)}–{formatTime(a.ora_sfarsit ?? '')}
                                </span>
                                <Badge variant={statusVariant(a.status)} className="shrink-0">
                                    {a.status || 'planificat'}
                                </Badge>
                                <div className="flex gap-1 ml-auto shrink-0">
                                    {a.status !== 'anulat' && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => deschideModalAnulare(a.id)}
                                            className="touch-manipulation"
                                        >
                                            <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Anulează
                                        </Button>
                                    )}
                                    {a.status === 'anulat' && (
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => handleReactivare(a.id)}
                                            className="touch-manipulation"
                                        >
                                            <CheckCircleIcon className="w-3.5 h-3.5 mr-1" /> Reactivează
                                        </Button>
                                    )}
                                    <ConfirmButton
                                        variant="danger"
                                        size="sm"
                                        aria-label="Șterge antrenament"
                                        onConfirm={() => handleStergere(a.id)}
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </ConfirmButton>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Anulare */}
            <Modal
                isOpen={modalAnulareId !== null}
                onClose={() => setModalAnulareId(null)}
                title="Anulare Antrenament"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Motiv anulare (opțional)
                        </label>
                        <textarea
                            value={motivAnulare}
                            onChange={e => setMotivAnulare(e.target.value)}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            placeholder="Ex: Sala indisponibilă, instructor bolnav..."
                        />
                    </div>
                    <p className="text-xs text-slate-400">
                        Antrenamentul rămâne vizibil în calendar cu status anulat.
                    </p>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={() => setModalAnulareId(null)}>
                        Renunță
                    </Button>
                    <Button
                        variant="danger"
                        onClick={async () => {
                            if (modalAnulareId) {
                                await handleAnulare(modalAnulareId, motivAnulare.trim() || null); // Pitfall 5 — NULL dacă gol
                                setModalAnulareId(null);
                            }
                        }}
                    >
                        Anulează Antrenament
                    </Button>
                </div>
            </Modal>

            {/* Modal Adăugare */}
            <Modal
                isOpen={isModalAdaugareOpen}
                onClose={() => setIsModalAdaugareOpen(false)}
                title="Adaugă Antrenament"
            >
                <div className="space-y-4">
                    <Input
                        label="Data"
                        type="date"
                        value={formData.data}
                        onChange={e => setFormData(f => ({ ...f, data: e.target.value }))}
                    />
                    <Input
                        label="Ora start"
                        type="time"
                        value={formData.ora_start}
                        onChange={e => setFormData(f => ({ ...f, ora_start: e.target.value }))}
                    />
                    <Input
                        label="Ora sfârșit"
                        type="time"
                        value={formData.ora_sfarsit}
                        onChange={e => setFormData(f => ({ ...f, ora_sfarsit: e.target.value }))}
                    />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="secondary" onClick={() => setIsModalAdaugareOpen(false)}>
                        Anulează
                    </Button>
                    <Button variant="primary" onClick={handleSubmitAdaugare}>
                        Salvează Antrenament
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

// Tab Orar — logică copiată din OrarEditorModal cu adaptări D-02/D-03/D-04
const TabOrar: React.FC<{ grupa: GrupaWithDetails }> = ({ grupa }) => {
    const [program, setProgram] = useState<ProgramItem[]>(grupa.program || []);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();
    const queryClient = useQueryClient();
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

    // Reset când se schimbă grupa sau când props-ul program se actualizează după un refetch
    // WR-03: adăugat grupa.program ca dependință pentru a re-sincroniza state-ul local
    React.useEffect(() => {
        setProgram(grupa.program || []);
    }, [grupa.id, grupa.program]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // CR-02: verificăm eroarea de delete — dacă eșuează nu pierdem datele existente
            const { error: deleteError } = await supabase
                .from('orar_saptamanal')
                .delete()
                .eq('grupa_id', grupa.id);
            if (deleteError) throw deleteError;
            const toInsert = program.map(({ id, ...rest }) => ({
                ...rest,
                grupa_id: grupa.id,
                club_id: grupa.club_id,
            }));
            if (toInsert.length > 0) {
                const { error: insertError } = await supabase.from('orar_saptamanal').insert(toInsert);
                if (insertError) throw insertError;
            }
            // clearCache ÎNAINTE de invalidateQueries — Pitfall 3
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_grupe_'))
                .forEach(k => clearCache(k));
            await queryClient.invalidateQueries({ queryKey: ['grupe'] });
            showSuccess('Succes', 'Orarul a fost salvat.');
            // D-04: NU apelăm onClose() — rămânem pe tab după salvare
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
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <CogIcon className="w-4 h-4 text-indigo-400" />
                <span>Definește șablonul recurent al antrenamentelor pentru această grupă.</span>
            </div>

            <div className="space-y-6">
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
                                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation min-h-[36px]"
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-700">
                <Button variant="secondary" onClick={() => setProgram(grupa.program || [])} disabled={loading}
                    className="w-full sm:w-auto touch-manipulation">
                    Resetează
                </Button>
                <Button variant="success" onClick={handleSave} isLoading={loading}
                    className="w-full sm:w-auto touch-manipulation">
                    <CheckCircleIcon className="w-4 h-4 mr-2" /> Salvează Orar
                </Button>
            </div>
        </div>
    );
};

// Tab Sportivi — query read-only per grupă + buton Adaugă Sportivi (D-05, D-06)
const TabSportivi: React.FC<{ grupa: GrupaWithDetails; onOpenAdaugaSportivi: (g: GrupaWithDetails) => void }> = ({ grupa, onOpenAdaugaSportivi }) => {
    const { data: sportivi = [], isLoading, error } = useQuery({
        queryKey: ['sportivi-grupa', grupa.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sportivi')
                .select('id, nume, prenume, grad_actual_id, grade:grad_actual_id(denumire)')
                .eq('grupa_id', grupa.id)
                .eq('status', 'Activ');
            if (error) throw error;
            return data ?? [];
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) return <div className="text-center py-8 text-slate-400">Se încarcă...</div>;
    if (error) return <div className="text-center py-8 text-rose-400">Nu s-au putut încărca datele. Verifică conexiunea și încearcă din nou.</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {sportivi.length} sportivi activi
                </h3>
                <Button
                    variant="info"
                    size="sm"
                    onClick={() => onOpenAdaugaSportivi(grupa)}
                    className="min-h-[40px] touch-manipulation"
                >
                    Adaugă Sportivi
                </Button>
            </div>

            {sportivi.length === 0 ? (
                <Card className="text-center py-8">
                    <p className="text-sm font-semibold text-slate-300">Niciun sportiv în această grupă</p>
                    <p className="text-xs text-slate-400 mt-1">Adaugă primul sportiv folosind butonul de mai jos.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {sportivi.map((s: any) => (
                        <div
                            key={s.id}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-800/30 border border-slate-700/50"
                        >
                            <span className="text-sm text-slate-300">
                                {(s.prenume || '')} {(s.nume || '')}
                            </span>
                            {s.grade?.denumire && (
                                <span className="text-xs text-slate-500 ml-auto">{s.grade.denumire}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const GrupaDetailView: React.FC<GrupaDetailViewProps> = ({ grupa, onBack, onOpenAdaugaSportivi }) => {
    const [activeTab, setActiveTab] = useState<TabId>('antrenamente');
    const [isModalAdaugareOpen, setIsModalAdaugareOpen] = useState(false);

    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;

    return (
        <div>
            {/* Header row */}
            <div className="flex items-center justify-between py-4 border-b border-slate-700 flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="w-4 h-4 mr-1.5" />
                    Înapoi la Grupe
                </Button>
                <div className="flex items-center gap-3">
                    {activeTab === 'antrenamente' && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsModalAdaugareOpen(true)}
                            className="min-h-[40px] touch-manipulation"
                        >
                            <PlusIcon className="w-4 h-4 mr-1" /> Adaugă Antrenament
                        </Button>
                    )}
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-white">{grupa.denumire}</h1>
                        <p className="text-sm text-slate-400">Sala: {grupa.sala || 'Nespecificată'} · {sportiviCount} sportivi activi</p>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-700 gap-1">
                {(['antrenamente', 'orar', 'sportivi'] as TabId[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`h-10 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                            activeTab === tab
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab === 'antrenamente' ? 'Antrenamente' : tab === 'orar' ? 'Orar' : 'Sportivi'}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="py-6 overflow-y-auto">
                {activeTab === 'antrenamente' && (
                    <TabAntrenamente
                        grupa={grupa}
                        isModalAdaugareOpen={isModalAdaugareOpen}
                        setIsModalAdaugareOpen={setIsModalAdaugareOpen}
                    />
                )}
                {activeTab === 'orar' && <TabOrar grupa={grupa} />}
                {activeTab === 'sportivi' && <TabSportivi grupa={grupa} onOpenAdaugaSportivi={onOpenAdaugaSportivi} />}
            </div>
        </div>
    );
};
