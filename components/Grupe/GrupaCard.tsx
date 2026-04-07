import React from 'react';
import { Grupa as GrupaType, ProgramItem } from '../../types';
import { Button, Card } from '../ui';
import { TrashIcon, UsersIcon, UserPlusIcon } from '../icons';
import { sortProgram } from './ProgramEditor';

interface GrupaWithDetails extends GrupaType {
    sportivi: { count: number }[];
    program: ProgramItem[];
}

export const GrupaCard: React.FC<{
    grupa: GrupaWithDetails;
    onEdit: (g: GrupaWithDetails) => void;
    onDelete: (g: GrupaWithDetails) => void;
    onAdaugaSportivi: (g: GrupaWithDetails) => void;
}> = ({ grupa, onEdit, onDelete, onAdaugaSportivi }) => {
    const sportiviCount = grupa.sportivi?.[0]?.count ?? 0;

    return (
        <Card className="flex flex-col h-full group">
            <div className="flex-grow">
                <h3 className="text-xl font-bold text-white">{grupa.denumire}</h3>
                <p className="text-sm text-slate-400 mb-4">{grupa.sala || 'Sală nespecificată'}</p>
                <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2 text-green-400"><UsersIcon className="w-4 h-4"/><span>{sportiviCount} Sportivi Activi</span></div>
                </div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Orar</h4>
                <div className="space-y-1">
                    {sortProgram(grupa.program).map(p => (
                        <div key={p.id} className="text-xs font-semibold bg-slate-700/50 px-2 py-1 rounded-full text-slate-300">
                            {p.ziua}: {p.ora_start} - {p.ora_sfarsit}
                        </div>
                    ))}
                    {grupa.program.length === 0 && <p className="text-xs italic text-slate-500">Niciun program.</p>}
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-700 flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="danger" onClick={() => onDelete(grupa)}><TrashIcon className="w-4 h-4"/></Button>
                <Button size="sm" variant="info" onClick={() => onAdaugaSportivi(grupa)}>
                    <UserPlusIcon className="w-4 h-4 mr-1.5" />
                    Sportivi
                </Button>
                <Button size="sm" variant="primary" onClick={() => onEdit(grupa)}>Gestionează</Button>
            </div>
        </Card>
    );
};
