import React, { useMemo } from 'react';
import { User, Plata, Tranzactie, Grad, Grupa, Participare, Examen, View } from '../types';
import { Button } from './ui';
import { ArrowLeftIcon } from './icons';

// Props
interface ProfilSportivProps {
    currentUser: User;
    plati: Plata[];
    tranzactii: Tranzactie[];
    grade: Grad[];
    grupe: Grupa[];
    participari: Participare[];
    examene: Examen[];
    onBack: () => void;
    onNavigate: (view: View) => void;
}

const getGrad = (gradId: string | null, allGrades: Grad[]): Grad | null => gradId ? allGrades.find(g => g.id === gradId) || null : null;

// Componentă card reutilizabilă pentru statistici
const StatCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode, className?: string }> = ({ title, children, actions, className }) => (
    <div className={`bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-6 flex flex-col text-center md:text-left ${className}`}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
        <div className="flex-grow space-y-4">
            {children}
        </div>
        {actions && <div className="mt-6 pt-4 border-t border-slate-700/50 text-center md:text-right">{actions}</div>}
    </div>
);

// Componentă pentru afișarea unui câmp de date
const DataField: React.FC<{ label: string, value: string | React.ReactNode, valueClassName?: string }> = ({ label, value, valueClassName }) => (
    <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`font-bold text-lg text-white ${valueClassName}`}>{value}</p>
    </div>
);

export const ProfilSportiv: React.FC<ProfilSportivProps> = ({ currentUser, plati, tranzactii, grade, grupe, participari, examene, onBack, onNavigate }) => {

    const { currentGrad, lastExamDate, nextGrad } = useMemo(() => {
        const admittedParticipations = participari
            .filter(p => p.sportiv_id === currentUser.id && (p.media_generala || 0) >= 5)
            .sort((a, b) => {
                const dateA = examene.find(e => e.id === a.sesiune_id)?.data || '1970-01-01';
                const dateB = examene.find(e => e.id === b.sesiune_id)?.data || '1970-01-01';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        
        const lastParticipation = admittedParticipations[0];
        const grad = lastParticipation ? getGrad(lastParticipation.grad_vizat_id, grade) : null;
        const exam = lastParticipation ? examene.find(e => e.id === lastParticipation.sesiune_id) : null;

        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const nextGrade = grad ? sortedGrades.find(g => g.ordine === (grad.ordine ?? 0) + 1) : sortedGrades.find(g => g.ordine === 1);

        return { 
            currentGrad: grad, 
            lastExamDate: exam ? new Date(exam.data + 'T00:00:00').toLocaleDateString('ro-RO') : 'N/A',
            nextGrad: nextGrade
        };
    }, [currentUser, participari, examene, grade]);

    const { totalRestante, ultimaPlata } = useMemo(() => {
        const platiRelevante = plati.filter(p => p.sportiv_id === currentUser.id || (p.familie_id && p.familie_id === currentUser.familie_id));
        
        const restante = platiRelevante
            .filter(p => p.status === 'Neachitat' || p.status === 'Achitat Parțial')
            .reduce((sum, p) => sum + p.suma, 0);

        const tranzactiiRelevante = tranzactii.filter(t => t.sportiv_id === currentUser.id || (t.familie_id && t.familie_id === currentUser.familie_id))
            .sort((a,b) => new Date(b.data_platii).getTime() - new Date(a.data_platii).getTime());
        
        const ultimaTranzactie = tranzactiiRelevante[0];

        return {
            totalRestante: restante,
            ultimaPlata: ultimaTranzactie 
                ? `${ultimaTranzactie.suma.toFixed(2)} lei la ${new Date(ultimaTranzactie.data_platii).toLocaleDateString('ro-RO')}` 
                : "Nicio plată înregistrată"
        };
    }, [currentUser, plati, tranzactii]);

    return (
        <div className="space-y-6 text-white">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-center md:text-left">
                 <h1 className="text-3xl font-bold text-white">{currentUser.nume} {currentUser.prenume}</h1>
                 <p className="text-lg text-slate-300">{grupe.find(g => g.id === currentUser.grupa_id)?.denumire || 'Fără grupă'}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title="Progres Tehnic"
                    actions={
                        <Button variant="info" size="sm" onClick={() => onNavigate('istoric-examene')}>
                            Istoric Examene
                        </Button>
                    }
                >
                    <DataField label="Grad Actual" value={currentGrad?.nume || 'Începător'} valueClassName="text-brand-secondary" />
                    <DataField label="Data Ultimului Examen" value={lastExamDate} />
                    <DataField label="Următorul Grad" value={nextGrad?.nume || 'Maxim atins'} />
                </StatCard>

                <StatCard 
                    title="Situație Financiară"
                    actions={
                        <Button variant="info" size="sm" onClick={() => onNavigate('facturi-personale')}>
                            Vezi Facturi
                        </Button>
                    }
                >
                    <DataField 
                        label="Total de Plată (Restanțe)" 
                        value={`${totalRestante.toFixed(2)} lei`}
                        valueClassName={totalRestante > 0 ? 'text-red-500' : 'text-green-500'}
                    />
                    <DataField label="Ultima Plată Înregistrată" value={ultimaPlata} />
                </StatCard>
            </div>
        </div>
    );
};