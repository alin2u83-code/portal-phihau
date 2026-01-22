import React, { useMemo } from 'react';
import { User, InscriereExamen, SesiuneExamen, Grad, PretConfig, Plata, Locatie } from '../types';
import { Button, Card, Select, Input } from './ui';
import { ArrowLeftIcon } from './icons';

interface IstoricExameneSportivProps {
    viewedUser: User;
    participari: InscriereExamen[];
    sesiuni: SesiuneExamen[];
    grade: Grad[];
    onBack: () => void;
    isAdmin: boolean;
    preturiConfig: PretConfig[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    allInscrieri: InscriereExamen[];
    locatii: Locatie[];
}

export const IstoricExameneSportiv: React.FC<IstoricExameneSportivProps> = ({ viewedUser, participari, sesiuni, grade, onBack, isAdmin, preturiConfig, setPlati, setInscrieri, allInscrieri, locatii }) => {
    
    const userParticipari = useMemo(() => {
        return participari.map(p => {
                const sesiune = sesiuni.find(s => s.id === p.sesiune_id);
                const grad = grade.find(g => g.id === p.grad_vizat_id);
                return { ...p, data_examen: sesiune?.data || 'N/A', nume_grad: grad?.nume || 'N/A' };
            })
            .sort((a, b) => new Date(b.data_examen).getTime() - new Date(a.data_examen).getTime());
    }, [participari, sesiuni, grade]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-left"><h1 className="text-3xl font-bold text-white">Istoric & Înscriere Examene</h1><p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p></header>

            <Card className="p-0 overflow-hidden">
                <h2 className="text-xl font-bold text-white p-4">Istoric Participări</h2>
                {/* Mobile View */}
                <div className="md:hidden p-4 space-y-4">{userParticipari.map(p => (
                    <Card key={p.id} className="bg-slate-700/50">
                        <div className="flex justify-between items-start"><div><p className="font-bold text-white">{p.nume_grad}</p><p className="text-xs text-slate-400">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</p></div><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.rezultat === 'Admis' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>{p.rezultat}</span></div>
                        {p.observatii && <div className="mt-3 pt-3 border-t border-slate-600"><p className="text-xs text-slate-400 italic">"{p.observatii}"</p></div>}
                    </Card>
                ))}{userParticipari.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun istoric.</p>}</div>
                
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead className="bg-slate-700/50"><tr><th className="p-3 font-semibold">Data Examen</th><th className="p-3 font-semibold">Grad Susținut</th><th className="p-3 font-semibold text-center">Rezultat</th><th className="p-3 font-semibold">Observații</th></tr></thead>
                    <tbody className="divide-y divide-slate-700">{userParticipari.map(p => (
                        <tr key={p.id} className="hover:bg-slate-700/30">
                            <td className="p-3 whitespace-nowrap">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</td>
                            <td className="p-3 font-semibold text-white">{p.nume_grad}</td>
                            <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.rezultat==='Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : p.rezultat==='Respins' ? 'bg-red-600/20 text-red-400 border-red-600/50' : 'bg-slate-600/20 text-slate-400 border-slate-600/50'}`}>{p.rezultat}</span></td>
                            <td className="p-3 text-slate-400">{p.observatii || '-'}</td>
                        </tr>
                    ))}{userParticipari.length === 0 && <tr><td colSpan={4}><p className="p-8 text-center text-slate-500 italic">Nu ai participat la niciun examen încă.</p></td></tr>}</tbody>
                </table></div>
            </Card>
        </div>
    );
};