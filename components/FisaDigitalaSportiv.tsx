import React, { useMemo } from 'react';
// FIX: Replaced deprecated type 'Participare' with 'InscriereExamen'.
import { User, Grad, InscriereExamen, Examen, Plata, View } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, WalletIcon } from './icons';

// Props
interface FisaDigitalaSportivProps {
    currentUser: User;
    grade: Grad[];
    participari: InscriereExamen[];
    examene: Examen[];
    plati: Plata[];
    onBack: () => void;
}

const getGrad = (gradId: string | null, allGrades: Grad[]): Grad | null => gradId ? allGrades.find(g => g.id === gradId) || null : null;

const parseDurationToMonths = (durationStr: string | null | undefined): number => {
    if (!durationStr) return 0;
    const parts = durationStr.split(' ');
    if (parts.length < 2) return 0;
    const value = parseInt(parts[0], 10);
    if (isNaN(value)) return 0;
    const unit = parts[1].toLowerCase();
    if (unit.startsWith('lun')) return value;
    if (unit.startsWith('an')) return value * 12;
    return 0;
};


export const FisaDigitalaSportiv: React.FC<FisaDigitalaSportivProps> = ({ currentUser, grade, participari, examene, plati, onBack }) => {
    
    const { currentGrad, nextGrad, timeToNextGrade } = useMemo(() => {
        const officialGrad = getGrad(currentUser.grad_actual_id, grade);

        const admittedParticipations = participari
            .filter(p => p.sportiv_id === currentUser.id && p.rezultat === 'Admis')
            .sort((a, b) => {
                const dateA = examene.find(e => e.id === a.sesiune_id)?.data || '1970-01-01';
                const dateB = examene.find(e => e.id === b.sesiune_id)?.data || '1970-01-01';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        
        const lastParticipation = admittedParticipations[0];
        const historyGrad = lastParticipation ? getGrad(lastParticipation.grad_vizat_id, grade) : null;
        
        const gradActual = officialGrad || historyGrad;

        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const gradUrmator = gradActual ? sortedGrades.find(g => g.ordine === (gradActual.ordine ?? 0) + 1) : sortedGrades[0];

        let progress = { monthsElapsed: 0, monthsRequired: 0, percentage: 0 };
        if (gradUrmator) {
            const lastExamDate = lastParticipation ? new Date(examene.find(e => e.id === lastParticipation.sesiune_id)!.data) : new Date(currentUser.data_inscrierii);
            const now = new Date();
            
            const monthsRequired = parseDurationToMonths(gradUrmator.timp_asteptare);
            const monthsElapsed = (now.getFullYear() - lastExamDate.getFullYear()) * 12 + (now.getMonth() - lastExamDate.getMonth());
            
            progress.monthsElapsed = Math.max(0, monthsElapsed);
            progress.monthsRequired = monthsRequired;
            progress.percentage = monthsRequired > 0 ? Math.min(100, (progress.monthsElapsed / monthsRequired) * 100) : 100;
        }

        return { currentGrad: gradActual, nextGrad: gradUrmator, timeToNextGrade: progress };
    }, [currentUser, grade, participari, examene]);

    const totalRestante = useMemo(() => {
        return plati
            .filter(p => (p.sportiv_id === currentUser.id || (p.familie_id && p.familie_id === currentUser.familie_id)) && (p.status === 'Neachitat' || p.status === 'Achitat Parțial'))
            .reduce((sum, p) => sum + p.suma, 0);
    }, [currentUser, plati]);

    const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => (
        <div className="w-full bg-slate-700 rounded-full h-2.5">
            <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <h1 className="text-3xl font-bold text-white">Fișa Digitală a Sportivului</h1>

            {totalRestante > 0 && (
                <Card className="border-l-4 border-red-500 bg-red-900/30">
                    <div className="flex items-center gap-4">
                        <WalletIcon className="w-8 h-8 text-red-400" />
                        <div>
                            <h3 className="text-lg font-bold text-white">Alertă Plată</h3>
                            <p className="text-red-300">Aveți o sumă restantă de <strong>{totalRestante.toFixed(2)} RON</strong>. Vă rugăm să contactați secretariatul.</p>
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="p-4 bg-slate-700 rounded-full border-2 border-slate-600">
                        <ShieldCheckIcon className="w-12 h-12 text-brand-secondary" />
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-white">{currentUser.nume} {currentUser.prenume}</h2>
                        <p className="text-slate-400">{currentUser.cluburi?.nume || 'Club neasociat'}</p>
                        <p className="mt-2 font-bold text-lg text-brand-secondary">{currentGrad?.nume || 'Începător'}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Progres către Gradul Următor</h3>
                {nextGrad ? (
                    <div className="space-y-3">
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold">Grad Vizat: <strong className="text-white">{nextGrad.nume}</strong></span>
                            <span className="text-sm text-slate-400">{timeToNextGrade.monthsElapsed} / {timeToNextGrade.monthsRequired} luni</span>
                        </div>
                        <ProgressBar percentage={timeToNextGrade.percentage} />
                        <p className="text-xs text-slate-500 text-center">Progres bazat pe stagiul minim de pregătire necesar.</p>
                    </div>
                ) : (
                    <p className="text-center text-slate-400">Felicitări! Ați atins gradul maxim înregistrat în sistem.</p>
                )}
            </Card>
        </div>
    );
};