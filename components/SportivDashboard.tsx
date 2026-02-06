import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useError } from './ErrorProvider';
import { Sportiv, Grad, User, View, AnuntPrezenta, ProgramItem, Antrenament, Permissions, Rol, Grupa } from '../types';
import { Card, Button, Input, Select } from './ui';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { AttendanceTracker } from './AttendanceTracker';
import { CheckIcon } from './icons';
import { GradBadge } from '../utils/grades';
import { BirthDateInput } from './BirthDateInput';

// --- COMPONENTE INTERNE ---

const CompleteProfileForm: React.FC<{
    user: User;
    grades: Grad[];
}> = ({ user, grades }) => {
    const { initialize } = useAuthStore();
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nume: user.nume || '',
        prenume: user.prenume || '',
        data_nasterii: user.data_nasterii === '1900-01-01' ? '' : (user.data_nasterii || ''),
        grad_actual_id: user.grad_actual_id || null,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value === '' ? null : e.target.value }));
    };

    const handleDateChange = (value: string) => {
        setFormData(p => ({ ...p, data_nasterii: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nume || !formData.prenume || !formData.data_nasterii) {
            showError("Date Incomplete", "Numele, prenumele și data nașterii sunt obligatorii.");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('sportivi').update({
                nume: formData.nume,
                prenume: formData.prenume,
                data_nasterii: formData.data_nasterii,
                grad_actual_id: formData.grad_actual_id,
            }).eq('id', user.id);

            if (error) throw error;

            showSuccess("Profil Completat", "Datele tale au fost salvate. Se reîncarcă sesiunea...");
            await initialize();
        } catch (err: any) {
            showError("Eroare la salvare", err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Card className="max-w-lg mx-auto animate-fade-in-down">
            <h2 className="text-2xl font-bold text-white mb-2">Completează-ți Profilul</h2>
            <p className="text-slate-400 mb-6">Pentru a continua, te rugăm să completezi datele de bază ale profilului tău.</p>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nume" name="nume" value={formData.nume} onChange={handleChange} required />
                    <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleChange} required />
                </div>
                <BirthDateInput label="Data Nașterii" value={formData.data_nasterii} onChange={handleDateChange} required />
                <Select label="Grad Actual (Dacă este cazul)" name="grad_actual_id" value={formData.grad_actual_id || ''} onChange={handleChange}>
                    <option value="">Începător / Fără Grad</option>
                    {(grades || []).sort((a,b)=>a.ordine-b.ordine).map(g => <option key={g.id} value={g.id}>{g.nume}</option>)}
                </Select>
                <Button type="submit" isLoading={loading} className="w-full !mt-6">Salvează Profilul</Button>
            </form>
        </Card>
    );
};

const ProgramAntrenament: React.FC<{ grupaId: string | null; grupe: Grupa[] }> = ({ grupaId, grupe }) => {
    const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };
    const grupaCurenta = useMemo(() => grupe.find(g => g.id === grupaId), [grupaId, grupe]);
    
    const programSortat = useMemo(() => {
        if (!grupaCurenta?.program) return [];
        return [...grupaCurenta.program]
            .filter(p => p.is_activ !== false)
            .sort((a, b) => (zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua]) || a.ora_start.localeCompare(b.ora_start));
    }, [grupaCurenta]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-2">Program Antrenament</h3>
            {!grupaId || !grupaCurenta ? (
                <p className="text-sm text-slate-400 italic">Contactați instructorul pentru alocarea la o grupă.</p>
            ) : (
                 <>
                    <div className="text-sm text-slate-400 mb-4">{grupaCurenta.denumire} - Sala: {grupaCurenta.sala || 'Nespecificată'}</div>
                    {programSortat.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400 text-xs uppercase"><tr><th className="py-2">Ziua</th><th className="py-2">Ora Start</th><th className="py-2">Ora Sfârșit</th></tr></thead><tbody className="divide-y divide-slate-700">{programSortat.map((item, index) => (<tr key={index}><td className="py-2 font-semibold">{item.ziua}</td><td className="py-2">{item.ora_start}</td><td className="py-2">{item.ora_sfarsit}</td></tr>))}</tbody></table></div>
                    ) : ( <p className="text-sm text-slate-400 italic">Grupa curentă nu are un program definit.</p> )}
                </>
            )}
        </Card>
    );
};

type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';
interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
    currentUser: User;
}
const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState<AnuntStatus | null>(anunt?.status || null);

    useEffect(() => { setOptimisticStatus(anunt?.status || null); }, [anunt]);

    const handleClick = async (status: AnuntStatus) => {
        setLoading(true);
        setOptimisticStatus(status);
        try { await onStatusChange(training.id, status); } 
        catch (e) { setOptimisticStatus(anunt?.status || null); } 
        finally { setLoading(false); }
    };
    
    const getStyling = (status: AnuntStatus) => {
        const base = ['font-bold', 'gap-2', 'text-base'];
        const isSelected = optimisticStatus === status;
        const isInactive = optimisticStatus !== null && !isSelected;
        if (isSelected) base.push('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-[var(--bg-card)]', 'scale-[1.02]');
        if (isInactive) base.push('opacity-50', 'hover:opacity-100');
        const variant: 'success' | 'warning' | 'danger' = status === 'Confirm' ? 'success' : status === 'Intarziat' ? 'warning' : 'danger';
        return { variant, className: base.join(' '), isSelected };
    };

    const ActionButton: React.FC<{ status: AnuntStatus; children: React.ReactNode; }> = ({ status, children }) => {
        const { variant, className, isSelected } = getStyling(status);
        return (<Button onClick={() => handleClick(status)} variant={variant} className={className} disabled={loading || !currentUser?.id}> {children} {isSelected && <CheckIcon className="w-5 h-5 ml-2" />} </Button>);
    };

    return (
        <Card className="bg-light-navy border-slate-800">
            <h3 className="text-xl font-bold text-white mb-4">Antrenamentul de azi: {new Date(training.data + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <ActionButton status="Confirm">Participă</ActionButton>
                <ActionButton status="Intarziat">Întârzii</ActionButton>
                <ActionButton status="Absent">Absent</ActionButton>
            </div>
        </Card>
    );
};

// --- COMPONENTA PRINCIPALĂ ---
interface SportivDashboardProps {
    grade: Grad[];
    grupe: Grupa[];
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    sportivi: Sportiv[];
    appDataError: string | null;
    onNavigate: (view: View) => void;
    permissions: Permissions;
    canSwitchRoles: boolean;
    activeRole: Rol['nume'];
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
}

export const SportivDashboard: React.FC<SportivDashboardProps> = (props) => {
    const { grade, grupe, antrenamente, anunturi, setAnunturi, sportivi, appDataError, onNavigate, permissions, canSwitchRoles, activeRole, onSwitchRole, isSwitchingRole } = props;
    const { userDetails } = useAuthStore();
    const { showSuccess, showError } = useError();

    const needsProfileCompletion = useMemo(() => !userDetails || !userDetails.nume || !userDetails.prenume || !userDetails.data_nasterii || userDetails.data_nasterii === '1900-01-01', [userDetails]);

    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
    const todaysTrainings = useMemo(() => {
        if (!userDetails) return [];
        return (antrenamente || [])
            .filter(a => a.data === todayString && (a.grupa_id === userDetails.grupa_id || (userDetails.participa_vacanta && a.grupa_id === null)))
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, todayString, userDetails]);

    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        if (!supabase || !userDetails) return;
        try {
            const { data, error } = await supabase.from('anunturi_prezenta').upsert({ antrenament_id: trainingId, sportiv_id: userDetails.id, status }, { onConflict: 'antrenament_id, sportiv_id' }).select().single();
            if (error) throw error;
            if (data) {
                showSuccess("Status actualizat", `Ai anunțat: ${status}`);
                setAnunturi(prev => { const index = prev.findIndex(a => a.id === data.id); if (index > -1) { const next = [...prev]; next[index] = data; return next; } else { return [...prev, data]; } });
            }
        } catch (error) { showError("Eroare", "Nu s-a putut salva statusul. Verificați conexiunea și RLS."); throw error; }
    };
    
    const currentGrad = useMemo(() => userDetails ? (grade.find(g => g.id === userDetails.grad_actual_id) || null) : null, [userDetails, grade]);

    if (!userDetails) { return <p className="text-center">Se încarcă profilul utilizatorului...</p>; }
    if (needsProfileCompletion) { return <CompleteProfileForm user={userDetails} grades={grade} />; }

    return (
        <div className="space-y-6">
            {appDataError && ( <Card className="bg-amber-900/30 border-amber-500 text-amber-300"><p><strong>Atenție:</strong> Unele date nu au putut fi încărcate ({appDataError}). Anumite secțiuni pot fi indisponibile.</p></Card> )}
            
            <header className="text-center md:text-left border-b border-slate-700/50 pb-4">
                <h1 className="text-3xl font-bold text-white">{userDetails.nume} {userDetails.prenume}</h1>
                <div className="mt-2"><GradBadge grad={currentGrad || {nume: 'Începător', ordine: 0} as Grad} isLarge /></div>
                <div className="mt-4 max-w-md mx-auto md:mx-0"><NotificationPermissionWidget /></div>
            </header>

            {!appDataError && todaysTrainings.length > 0 && (<div className="space-y-4 animate-fade-in-down">{todaysTrainings.map(training => (<TrainingActionCard key={training.id} training={training} anunt={(anunturi || []).find(a => a.antrenament_id === training.id && a.sportiv_id === userDetails.id)} onStatusChange={handleStatusChange} currentUser={userDetails} />))}</div>)}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {!appDataError && antrenamente && (<div className="lg:col-span-1"><AttendanceTracker currentUser={userDetails} antrenamente={antrenamente} onNavigate={onNavigate} /></div>)}
                {!appDataError && grupe && (<div className="lg:col-span-2 space-y-6"><ProgramAntrenament grupaId={userDetails.grupa_id} grupe={grupe} /></div>)}
            </div>
        </div>
    );
};
