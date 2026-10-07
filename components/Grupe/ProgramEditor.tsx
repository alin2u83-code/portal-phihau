import React, { useState } from 'react';
import { ProgramItem } from '../../types';
import { Button, Input } from '../ui';
import { PlusIcon, TrashIcon, CheckIcon, XIcon } from '../icons';
import { formatTime } from '../../utils/date';

const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };

export const sortProgram = (program: ProgramItem[]): ProgramItem[] => {
    if (!program) return [];
    return [...program].sort((a, b) => {
        const ziCompare = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
        if (ziCompare !== 0) return ziCompare;
        return a.ora_start.localeCompare(b.ora_start);
    });
};

// `Input` din ui.tsx are `appearance-none`: pe Android Chrome campul `time` nu mai raspunde la atingere.
// Restauram aspectul nativ doar pentru campurile de ora si deschidem selectorul explicit la atingere.
const campOraProps = {
    style: { appearance: 'auto', minHeight: 48 } as React.CSSProperties,
    onClick: (e: React.MouseEvent<HTMLInputElement>) => {
        try { (e.currentTarget as any).showPicker?.(); } catch { /* showPicker indisponibil sau fara gest utilizator */ }
    },
};
const hhmm = (t: string) => (t || '').slice(0, 5);

export const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => {
    const zileSaptamana: ProgramItem['ziua'][] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
    const [zileSelectate, setZileSelectate] = useState<ProgramItem['ziua'][]>([]);
    const [oraStart, setOraStart] = useState('18:00');
    const [oraSfarsit, setOraSfarsit] = useState('19:30');

    const handleToggleZi = (zi: ProgramItem['ziua']) => {
        setZileSelectate(prev => prev.includes(zi) ? prev.filter(z => z !== zi) : [...prev, zi]);
    };
    const [editId, setEditId] = useState<string | null>(null);
    const [editStart, setEditStart] = useState('');
    const [editSfarsit, setEditSfarsit] = useState('');

    const handleStartEdit = (item: ProgramItem) => {
        setEditId(item.id);
        setEditStart(hhmm(item.ora_start));
        setEditSfarsit(hhmm(item.ora_sfarsit));
    };
    const handleSaveEdit = () => {
        if (!editId || !editStart || !editSfarsit || editSfarsit <= editStart) return;
        setProgram(p => p.map(item => item.id === editId ? { ...item, ora_start: editStart, ora_sfarsit: editSfarsit } : item));
        setEditId(null);
    };
    const editInvalid = !editStart || !editSfarsit || editSfarsit <= editStart;
    const handleRemove = (itemToRemove: ProgramItem) => { setProgram(p => p.filter(item => item.id !== itemToRemove.id)); };

    const handleAdd = () => {
        if (zileSelectate.length === 0) return;
        const noile = zileSelectate.map((zi, i) => ({
            ziua: zi, ora_start: oraStart, ora_sfarsit: oraSfarsit, is_activ: true,
            id: `new-${Date.now()}-${i}`
        }));
        setProgram(p => [...p, ...noile]);
        setZileSelectate([]);
    };

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-md font-semibold mb-2 text-white">Program Săptămânal</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {sortProgram(program).map((item) => (
                        editId === item.id ? (
                            <div key={item.id} className="bg-slate-700 p-3 rounded space-y-3 border border-indigo-400">
                                <span className="font-semibold text-white block">{item.ziua}</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Input label="Ora Start" type="time" value={editStart} onChange={e => setEditStart(e.target.value)} {...campOraProps} />
                                    <Input label="Ora Sfârșit" type="time" value={editSfarsit} onChange={e => setEditSfarsit(e.target.value)} {...campOraProps} />
                                </div>
                                {editInvalid && editStart && editSfarsit && <p className="text-xs text-rose-400">Ora de sfârșit trebuie să fie după ora de start.</p>}
                                <div className="flex gap-2">
                                    <Button type="button" variant="secondary" onClick={() => setEditId(null)} className="flex-1 flex items-center justify-center gap-1"><XIcon className="w-4 h-4" /> Anulează</Button>
                                    <Button type="button" variant="success" onClick={handleSaveEdit} disabled={editInvalid} className="flex-1 flex items-center justify-center gap-1"><CheckIcon className="w-4 h-4" /> Salvează ora</Button>
                                </div>
                            </div>
                        ) : (
                            <div key={item.id} className="flex items-center gap-3 bg-slate-700 p-2 rounded">
                                <button
                                    type="button"
                                    onClick={() => handleStartEdit(item)}
                                    className="font-semibold flex-grow text-left text-white min-h-[44px] px-1 touch-manipulation"
                                    title="Atinge pentru a modifica ora"
                                >
                                    {item.ziua}: {formatTime(item.ora_start)} - {formatTime(item.ora_sfarsit)}
                                    <span className="ml-2 text-xs font-normal text-indigo-300">modifică</span>
                                </button>
                                <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(item)}><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                        )
                    ))}
                    {program.length === 0 && <p className="text-slate-400 text-sm italic">Niciun interval adăugat — grupa nu are orar salvat.</p>}
                </div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-lg space-y-3 border border-slate-700">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Adaugă Interval Nou</h4>
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">Zile (poți bifa mai multe deodată)</label>
                    <div className="flex flex-wrap gap-2">
                        {zileSaptamana.map(zi => {
                            const bifat = zileSelectate.includes(zi);
                            return (
                                <button
                                    key={zi}
                                    type="button"
                                    onClick={() => handleToggleZi(zi)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${bifat ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-indigo-400'}`}
                                >
                                    {zi}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <Input label="Ora Start" type="time" value={oraStart} onChange={e => setOraStart(e.target.value)} {...campOraProps} />
                    <Input label="Ora Sfârșit" type="time" value={oraSfarsit} onChange={e => setOraSfarsit(e.target.value)} {...campOraProps} />
                </div>
                <Button
                    type="button"
                    variant="info"
                    onClick={handleAdd}
                    disabled={zileSelectate.length === 0}
                    className="w-full flex items-center justify-center gap-2"
                >
                    <PlusIcon className="w-5 h-5" />
                    {zileSelectate.length === 0 ? 'Bifează cel puțin o zi' : `Adaugă în program (${zileSelectate.length} ${zileSelectate.length === 1 ? 'zi' : 'zile'})`}
                </Button>
            </div>
        </div>
    );
};
