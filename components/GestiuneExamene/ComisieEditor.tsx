import React, { useState } from 'react';
import { Button, Input } from '../ui';
import { PlusIcon, TrashIcon } from '../icons';

export const ComisieEditor: React.FC<{
    membri: string[];
    setMembri: (membri: string[]) => void;
}> = ({ membri, setMembri }) => {
    const [newMembru, setNewMembru] = useState('');

    const handleAdd = () => {
        const trimmed = newMembru.trim();
        if (trimmed && !(membri || []).includes(trimmed)) {
            setMembri([...(membri || []), trimmed]);
            setNewMembru('');
        }
    };

    const handleRemove = (membruToRemove: string) => {
        setMembri((membri || []).filter(m => m !== membruToRemove));
    };

    return (
        <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-2 ml-1">Membri Comisie</label>
            <div className="space-y-2 mb-3">
                {(membri || []).map(membru => (
                    <div key={membru} className="bg-slate-700/50 p-2 rounded-md flex justify-between items-center text-sm">
                        <span className="font-medium text-white">{membru}</span>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleRemove(membru)} className="!p-1.5 h-auto" title={`Elimină pe ${membru}`}>
                            <TrashIcon className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {(membri || []).length === 0 && <p className="text-xs text-slate-500 italic text-center py-2">Niciun membru adăugat.</p>}
            </div>
            <div className="flex items-end gap-2">
                <div className="flex-grow">
                    <Input label="" value={newMembru} onChange={e => setNewMembru(e.target.value)} placeholder="Nume și prenume membru..." 
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}/>
                </div>
                <Button type="button" variant="info" onClick={handleAdd} className="h-[50px] w-[50px] !p-0 flex items-center justify-center flex-shrink-0" title="Adaugă membru">
                    <PlusIcon className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
};
