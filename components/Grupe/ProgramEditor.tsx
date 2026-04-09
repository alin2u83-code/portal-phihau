import React, { useState } from 'react';
import { ProgramItem } from '../../types';
import { Button, Input, Select } from '../ui';
import { PlusIcon, TrashIcon } from '../icons';
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

export const ProgramEditor: React.FC<{ program: ProgramItem[], setProgram: React.Dispatch<React.SetStateAction<ProgramItem[]>> }> = ({ program, setProgram }) => {
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
                            <span className="font-semibold flex-grow text-white">{item.ziua}: {formatTime(item.ora_start)} - {formatTime(item.ora_sfarsit)}</span>
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
