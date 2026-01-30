import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User, View, Sportiv, Plata, Antrenament, IstoricGrade, Familie, TipAbonament, Rol } from '../types';
import { Card, Button } from './ui';
import { UsersIcon, ChartBarIcon, BanknotesIcon, TrophyIcon, WalletIcon, PlusIcon, FileTextIcon, CalendarDaysIcon, ClipboardCheckIcon } from './icons';
import { useError } from './ErrorProvider';

// Props
interface AdminClubDashboardProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    sportivi: Sportiv[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    antrenamente: Antrenament[];
    istoricGrade: IstoricGrade[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    tranzactii: any[]; // Assuming tranzactii is passed for balance calculation
}

const StatCard: React.FC<{
    icon: React.ElementType,
    title: string,
    value: string | number,
    description: string,
    colorClass: string
}> = ({ icon: Icon, title, value, description, colorClass }) => (
    <Card className={`relative overflow-hidden border-l-4 ${colorClass}`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-bold uppercase text-slate-400 tracking-wider">{title}</p>
                <p className="text-4xl font-black text-white mt-1">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
            <Icon className="w-10 h-10 text-slate-700" />
        </div>
    </Card>
);

const NavCard: React.FC<{ title: string; icon: React.ElementType; onClick: () => void; }> = ({ title, icon: Icon, onClick }) => (
    <Button onClick={onClick} variant="secondary" className="h-full flex-col !items-center !justify-center gap-2 py-4">
        <Icon className="w-8 h-8 text-brand-secondary" />
        <span className="font-bold">{title}</span>
    </Button>
);

export const AdminClubDashboard: React.FC<AdminClubDashboardProps> = ({ currentUser, sportivi, plati, setPlati, antrenamente, istoricGrade, familii, tipuriAbonament, tranzactii, onNavigate }) => {
    const { showSuccess, showError } = useError();
    const [isGenerating, setIsGenerating] = useState(false);

    const stats = useMemo(() => {
        const activeSportivi = (sportivi || []).filter(s => s.status === 'Activ').length;
        const totalDebt = (plati || []).filter(p => p.status === 'Neachitat' || p.status === 'Achitat Parțial').reduce((sum, p) => sum + p.suma, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weeklyTrainings = (antrenamente || []).filter(a => new Date(a.data) >= sevenDaysAgo);
        const totalPresent = weeklyTrainings.reduce((sum, a) => sum + (a.sportivi_prezenti_ids || []).length, 0);
        const totalExpected = weeklyTrainings.reduce((sum, a) => {
            const groupMembers = (sportivi || []).filter(s => s.grupa_id === a.grupa_id && s.status === 'Activ').length;
            return sum + groupMembers;
        }, 0);
        const weeklyAttendance = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const examCandidates = (sportivi || []).filter(s => {
            if (s.status !== 'Activ' || !s.grad_actual_id) return false;
            const lastPromo = (istoricGrade || []).filter(ig => ig.sportiv_id === s.id).sort((a,b) => new Date(b.data_obtinere).getTime() - new Date(a.data_obtinere).getTime())[0];
            const lastDate = new Date(lastPromo ? lastPromo.data_obtinere : s.data_inscrierii);
            return lastDate <= sixMonthsAgo;
        }).length;

        return { activeSportivi, totalDebt, weeklyAttendance, examCandidates };
    }, [sportivi, plati, antrenamente, istoricGrade]);

    const balances = useMemo(() => {
        const famBalances = new Map<string, number>();
        const indivBalances = new Map<string, number>();

        (familii || []).forEach(f => famBalances.set(f.id, 0));
        (sportivi || []).forEach(s => indivBalances.set(s.id, 0));

        (tranzactii || []).forEach(t => {
            if (t.familie_id) {
                famBalances.set(t.familie_id, (famBalances.get(t.familie_id) || 0) + t.suma);
            } else if (t.sportiv_id) {
                indivBalances.set(t.sportiv_id, (indivBalances.get(t.sportiv_id) || 0) + t.suma);
            }
        });

        (plati || []).forEach(p => {
            if (p.familie_id) {
                famBalances.set(p.familie_id, (famBalances.get(p.familie_id) || 0) - p.suma);
            } else if (p.sportiv_id) {
                indivBalances.set(p.sportiv_id, (indivBalances.get(p.sportiv_id) || 0) - p.suma);
            }
        });

        return { famBalances, indivBalances };
    }, [familii, sportivi, plati, tranzactii]);

    const handleGenerateSubscriptions = async () => {
        if (!supabase) return;
        
        setIsGenerating(true);
        const today = new Date();
        const dataCurenta = today.toISOString().split('T')[0];
        const lunaText = today.toLocaleString('ro-RO', { month: 'long', year: 'numeric'});
        const lunaCurentaIdx = today.getMonth();
        const anulCurent = today.getFullYear();
        
        const sportiviActivi = (sportivi || []).filter(s => s.status === 'Activ');
        const platiToInsert: Omit<Plata, 'id'>[] = [];
        const sportiviProcesati = new Set<string>();

        (familii || []).forEach(familie => {
            const membriActiviInFamilie = sportiviActivi.filter(s => s.familie_id === familie.id);
            if (membriActiviInFamilie.length === 0) return;

            const exists = (plati || []).some(p => 
                p.familie_id === familie.id && 
                p.tip === 'Abonament' && 
                new Date(p.data).getMonth() === lunaCurentaIdx && 
                new Date(p.data).getFullYear() === anulCurent
            );
            if (exists) { membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id)); return; }

            const nrMembri = membriActiviInFamilie.length;
            let abonamentConfig = (tipuriAbonament || []).find(ab => ab.numar_membri === nrMembri);
            if (!abonamentConfig && nrMembri > 1) {
                abonamentConfig = [...(tipuriAbonament || [])].filter(ab => ab.numar_membri > 1).sort((a, b) => b.numar_membri - a.numar_membri)[0];
            }

            if (abonamentConfig) {
                const creditFamilie = balances.famBalances.get(familie.id) || 0;
                let sumaDeFacturat = abonamentConfig.pret;
                let status: Plata['status'] = 'Neachitat';
                let observatii = `Abonament pt: ${membriActiviInFamilie.map(m => m.prenume).join(', ')}.`;
                if (creditFamilie >= sumaDeFacturat) { status = 'Achitat'; observatii += ` Stins automat din credit.`; } 
                else if (creditFamilie > 0) { sumaDeFacturat -= creditFamilie; observatii += ` Parțial stins din credit.`; }

                platiToInsert.push({ sportiv_id: null, familie_id: familie.id, suma: sumaDeFacturat, data: dataCurenta, status: status, descriere: `Abonament Familie ${lunaText}`, tip: 'Abonament', observatii: observatii });
                membriActiviInFamilie.forEach(m => sportiviProcesati.add(m.id));
            }
        });

        sportiviActivi.forEach(sportiv => {
            if (sportiviProcesati.has(sportiv.id) || sportiv.familie_id) return;
            const exists = (plati || []).some(p => p.sportiv_id === sportiv.id && p.tip === 'Abonament' && new Date(p.data).getMonth() === lunaCurentaIdx && new Date(p.data).getFullYear() === anulCurent);
            if (exists) return;
            const abonamentConfig = (tipuriAbonament || []).find(ab => ab.numar_membri === 1);
            if (abonamentConfig) {
                const creditSportiv = balances.indivBalances.get(sportiv.id) || 0;
                let sumaDeFacturat = abonamentConfig.pret;
                let status: Plata['status'] = 'Neachitat';
                let observatii = 'Generat automat.';
                if (creditSportiv >= sumaDeFacturat) { status = 'Achitat'; observatii += ' Stins automat din credit.'; } 
                else if (creditSportiv > 0) { sumaDeFacturat -= creditSportiv; observatii += ' Parțial stins din credit.'; }
                platiToInsert.push({ sportiv_id: sportiv.id, familie_id: null, suma: sumaDeFacturat, data: dataCurenta, status: status, descriere: `Abonament ${lunaText}`, tip: 'Abonament', observatii: observatii });
            }
        });

        if (platiToInsert.length > 0) {
            const { data, error } = await supabase.from('plati').insert(platiToInsert).select();
            if (error) { showError("Eroare la generare", `A apărut o eroare: ${error.message}`); } 
            else if (data) { setPlati(prev => [...prev, ...data]); showSuccess("Generare Finalizată", `${data.length} facturi noi au fost generate.`); }
        } else {
            showSuccess("Info", "Nicio factură nouă de generat pentru luna curentă.");
        }
        setIsGenerating(false);
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-white">Panou de Control Club</h1>
                <p className="text-slate-400">Bine ai venit, {currentUser.prenume}!</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={UsersIcon} title="Membri Activi" value={stats.activeSportivi} description="Sportivi cu status 'Activ'" colorClass="border-red-600" />
                <StatCard icon={ChartBarIcon} title="Prezență Săptămânală" value={`${stats.weeklyAttendance}%`} description="Media ultimelor 7 zile" colorClass="border-red-600" />
                <StatCard icon={BanknotesIcon} title="Datorii Curente" value={`${stats.totalDebt.toFixed(0)} lei`} description="Suma totală neachitată" colorClass="border-red-600" />
                <StatCard icon={TrophyIcon} title="Candidați Examen" value={stats.examCandidates} description="Stagiu de min. 6 luni" colorClass="border-red-600" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Module Principale</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <NavCard title="Sportivi" icon={UsersIcon} onClick={() => onNavigate('sportivi')} />
                        <NavCard title="Facturi" icon={BanknotesIcon} onClick={() => onNavigate('plati-scadente')} />
                        <NavCard title="Prezențe" icon={ClipboardCheckIcon} onClick={() => onNavigate('prezenta-instructor')} />
                        <NavCard title="Examene" icon={TrophyIcon} onClick={() => onNavigate('examene')} />
                    </div>
                </Card>
                 <Card>
                    <h3 className="text-lg font-bold text-white mb-4">Acțiuni Rapide</h3>
                    <div className="flex flex-col gap-3">
                        <Button onClick={handleGenerateSubscriptions} variant="info" isLoading={isGenerating} className="justify-start py-4">
                            <CalendarDaysIcon className="w-5 h-5 mr-3"/> Generează Facturi Abonament
                        </Button>
                        <Button onClick={() => onNavigate('jurnal-incasari')} variant="secondary" className="justify-start py-4">
                            <WalletIcon className="w-5 h-5 mr-3"/> Înregistrează Plată Nouă
                        </Button>
                        <Button onClick={() => onNavigate('sportivi')} variant="secondary" className="justify-start py-4">
                            <PlusIcon className="w-5 h-5 mr-3"/> Adaugă Sportiv Nou
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};
