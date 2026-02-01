import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, InscriereExamen, Examen, Grad, Antrenament, IstoricGrade, Plata, Familie, TipAbonament, Tranzactie, Reducere, Club, ProgramItem, Grupa } from '../types';
import { Button, Card, Select, Modal, Input } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon, ChartBarIcon, TransferIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { DeleteAuditModal } from './DeleteAuditModal';
import { SportivFeedbackReport } from './SportivFeedbackReport';
import { SportivProgressChart } from './SportivProgressChart';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { AddGradeModal } from './AddGradeModal';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
const getAge = (dateString: string) => { if (!dateString) return 0; const today = new Date(); const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00'); if (isNaN(birthDate.getTime())) { return 0; } let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

const getGradStyle = (gradName: string): string => {
    const name = gradName.toLowerCase();
    if (name.includes('dang')) {
        if (name.includes('5')) return 'bg-black text-white border-2 border-yellow-400';
        if (name.includes('6') || name.includes('7')) return 'bg-white text-red-600 border-2 border-red-600';
        return 'bg-black text-white border-2 border-red-600';
    }
    if (name.includes('neagră')) return 'bg-black text-white';
    if (name.includes('violet')) return 'bg-violet-600 text-white';
    if (name.includes('roșu')) return 'bg-red-600 text-white';
    if (name.includes('albastru')) return 'bg-white text-blue-600 border border-blue-600';
    if (name.includes('galben')) return 'bg-yellow-400 text-black';
    return 'bg-slate-600 text-white'; // Default
};

const GradBadge: React.FC<{ grad: Grad | null | undefined }> = ({ grad }) => {
    if (!grad) return null;
    return (
        <span className={`px-3 py-1 text-sm font-bold rounded-full whitespace-nowrap ${getGradStyle(grad.nume)}`}>
            {grad.nume}
        </span>
    );
};

const ProgramAntrenament: React.FC<{ grupaId: string | null; grupe: Grupa[] }> = ({ grupaId, grupe }) => {
    const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };

    const grupaCurenta = useMemo(() => grupe.find(g => g.id === grupaId), [grupaId, grupe]);
    
    const programSortat = useMemo(() => {
        if (!grupaCurenta?.program) return [];
        return [...grupaCurenta.program]
            .filter(p => p.is_activ !== false) // Show only active sessions
            .sort((a, b) => {
                const ziCompare = zileSaptamanaOrdonate[a.ziua] - zileSaptamanaOrdonate[b.ziua];
                if (ziCompare !== 0) return ziCompare;
                return a.ora_start.localeCompare(b.ora_start);
            });
    }, [grupaCurenta]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-2 animate-fade-in-down">Programul Meu de Antrenament</h3>
            {!grupaId || !grupaCurenta ? (
                <p className="text-sm text-slate-400 italic">Contactați instructorul pentru alocarea la o grupă.</p>
            ) : programSortat.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="py-2">Ziua</th>
                                <th className="py-2">Ora Start</th>
                                <th className="py-2">Ora Sfârșit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {programSortat.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-2 font-semibold">{item.ziua}</td>
                                    <td className="py-2">{item.ora_start}</td>
                                    <td className="py-2">{item.ora_sfarsit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-slate-400 italic">Grupa curentă nu are un program definit.</p>
            )}
        </Card>
    );
};

const AttendanceIndicator: React.FC<{ attendances: {date: string; present: boolean}[] }> = ({ attendances }) => {
    const indicators = [...attendances].reverse(); // Afișează cel mai vechi primul

    // Umple array-ul pentru a afișa întotdeauna 3 indicatori
    const displayItems = Array.from({ length: 3 }, (_, i) => {
        if (i < indicators.length) {
            return { ...indicators[i], isPlaceholder: false };
        }
        return { date: 'N/A', present: false, isPlaceholder: true };
    });

    return (
        <div>
            <h3 className="text-lg font-bold text-white mb-3">Prezență Recente</h3>
            <div className="flex justify-center md:justify-start gap-2">
                {displayItems.map((att, index) => (
                    <div 
                        key={index} 
                        title={att.isPlaceholder ? 'Antrenament neînregistrat' : `${new Date(att.date + 'T00:00:00').toLocaleDateString('ro-RO')}: ${att.present ? 'Prezent' : 'Absent'}`}
                        className={`w-8 h-12 rounded-md transition-all duration-300 ${att.isPlaceholder ? 'bg-slate-700' : att.present ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                    </div>
                ))}
            </div>
        </div>
    );
};

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv;
    clubs: Club[];
    onTransferComplete: (updatedSportiv: Sportiv) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, sportiv, clubs, onTransferComplete }) => {
    const [newClubId, setNewClubId] = useState('');
    const [loading, setLoading] = useState(false);
    const [transferSuccess, setTransferSuccess] = useState(false);
    const { showError, showSuccess } = useError();
    
    const availableClubs = clubs.filter(c => c.id !== sportiv.club_id);

    const handleTransfer = async () => {
        if (!newClubId) {
            showError("Validare", "Vă rugăm selectați noul club.");
            return;
        }

        setLoading(true);
        try {
            const { error: rpcError } = await supabase.rpc('transfer_sportiv', {
                p_sportiv_id: sportiv.id,
                p_new_club_id: newClubId,
                p_old_club_id: sportiv.club_id
            });
            if (rpcError) throw rpcError;

            const { data: updatedSportiv, error: fetchError } = await supabase
                .from('sportivi')
                .select('*, roluri(id, nume)')
                .eq('id', sportiv.id)
                .single();
            if (fetchError) throw fetchError;

            showSuccess("Transfer Finalizat", `${sportiv.nume} ${sportiv.prenume} a fost mutat la noul club.`);
            setTransferSuccess(true);
            
            setTimeout(() => {
                onTransferComplete(updatedSportiv as Sportiv);
            }, 2000);

        } catch (err: any) {
            showError("Eroare la Transfer", err.message);
            setLoading(false);
        }
    };
    
    const handleClose = () => {
        if (loading || transferSuccess) return;
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={transferSuccess ? "Transfer Realizat" : `Transfer Sportiv: ${sportiv.nume}`}
            persistent={loading || transferSuccess}
        >
            {transferSuccess ? (
                <div className="text-center py-8 flex flex-col items-center gap-4 animate-fade-in-down">
                    <CheckCircleIcon className="w-16 h-16 text-green-500" />
                    <h3 className="text-xl font-bold text-white">Succes!</h3>
                    <p className="text-slate-300">
                        {sportiv.nume} {sportiv.prenume} a fost transferat. Fereastra se va închide automat.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p>Selectați noul club pentru <strong>{sportiv.nume} {sportiv.prenume}</strong>.</p>
                    <Select
                        label="Club Destinație"
                        value={newClubId}
                        onChange={e => setNewClubId(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Alege un club...</option>
                        {availableClubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                    </Select>
                    <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>Anulează</Button>
                        <Button variant="primary" onClick={handleTransfer} isLoading={loading}>Confirmă Transfer</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};


const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="mt-1 text-md text-slate-200 font-semibold">{value || 'N/A'}</dd>
    </div>
);

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    const colorClasses: Record<Rol['nume'], string> = { Admin: 'bg-red-600 text-white', 'SUPER_ADMIN_FEDERATIE': 'bg-red-800 text-white', 'Admin Club': 'bg-blue-600 text-white', Instructor: 'bg-sky-600 text-white', Sportiv: 'bg-slate-600 text-white' };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[role.nume] || 'bg-gray-500 text-white'}`}>{role.nume}</span>;
};

interface UserProfileProps {
    sportiv: Sportiv;
    currentUser: User;
    participari: InscriereExamen[];
    examene: Examen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    setIstoricGrade: React.Dispatch<React.SetStateAction<IstoricGrade[]>>;
    antrenamente: Antrenament[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    reduceri: Reducere[];
    grupe: Grupa[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    allRoles: Rol[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onBack: () => void;
    clubs: Club[];
}

export const UserProfile: React.FC<UserProfileProps> = ({ sportiv, currentUser, participari, examene, grade, istoricGrade, setIstoricGrade, antrenamente, plati, tranzactii, reduceri, grupe, familii, tipuriAbonament, allRoles, setSportivi, setPlati, setTranzactii, onBack, clubs }) => {
    const { showError, showSuccess } = useError();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);

    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>((sportiv.roluri || []).map(r => r.id));

    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    const [feedbackData, setFeedbackData] = useState({
        puncte_forte: sportiv.puncte_forte || '',
        puncte_slabe: sportiv.puncte_slabe || '',
        obiective: sportiv.obiective || '',
    });
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    
    const [financialFilter, setFinancialFilter] = useState<'Toate' | 'Abonament' | 'Taxa Examen' | 'Echipament'>('Toate');

    useEffect(() => {
        setSelectedRoleIds((sportiv.roluri || []).map(r => r.id));
        setFeedbackData({
            puncte_forte: sportiv.puncte_forte || '',
            puncte_slabe: sportiv.puncte_slabe || '',
            obiective: sportiv.obiective || '',
        });
    }, [sportiv]);

    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin');
    const isSuperAdmin = currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin');

    const gradeHistory = useMemo(() => {
        const examGrades = participari
            .filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis')
            .map(p => {
                const examen = examene.find(e => e.id === p.sesiune_id);
                const grad = grade.find(g => g.id === p.grad_vizat_id);
                if (!examen || !grad) return null;
                return {
                    source: 'examen',
                    date: new Date(examen.data).getTime(),
                    grad_id: grad.id,
                    gradNume: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

        const manualGrades = istoricGrade
            .filter(hg => hg.sportiv_id === sportiv.id && !hg.sesiune_examen_id)
            .map(hg => {
                const grad = grade.find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return {
                    source: 'manual',
                    date: new Date(hg.data_obtinere).getTime(),
                    grad_id: grad.id,
                    gradNume: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);

        return [...examGrades, ...manualGrades].sort((a, b) => a.date - b.date);

    }, [participari, examene, grade, istoricGrade, sportiv.id]);
    
    const currentGrad = useMemo(() => {
        const lastGradeEvent = [...gradeHistory].sort((a,b) => b.date - a.date)[0];
        return lastGradeEvent ? grade.find(g => g.id === lastGradeEvent.grad_id) : null;
    }, [gradeHistory, grade]);

    const lastThreeAttendances = useMemo(() => {
        const now = new Date();
        const relevantTrainings = (antrenamente || [])
            .filter(a => {
                const trainingDate = new Date(`${a.data}T${a.ora_start || '00:00'}`);
                if (trainingDate > now) return false;
                
                const isInGroup = a.grupa_id === sportiv.grupa_id;
                const isVacationTraining = sportiv.participa_vacanta && a.grupa_id === null;
                
                return isInGroup || isVacationTraining;
            })
            .sort((a, b) => new Date(`${b.data}T${b.ora_start || '00:00'}`).getTime() - new Date(`${a.data}T${a.ora_start || '00:00'}`).getTime())
            .slice(0, 3);
        
        return relevantTrainings.map(a => ({
            date: a.data,
            present: a.prezenta.some(p => p.sportiv_id === sportiv.id)
        }));
    }, [antrenamente, sportiv]);

    const handleSaveFeedback = async () => {
        setIsSavingFeedback(true);
        const { error } = await supabase.from('sportivi').update(feedbackData).eq('id', sportiv.id);
        if (error) showError("Eroare la Salvare", error.message);
        else { setSportivi(p => p.map(s => s.id === sportiv.id ? { ...s, ...feedbackData } : s)); setIsEditingFeedback(false); showSuccess("Feedback Salvat", "Observațiile au fost salvate cu succes."); }
        setIsSavingFeedback(false);
    };

    const handleSave = async (formData: Partial<Sportiv>) => {
        const { roluri, ...sportivData } = formData;
        if (sportiv.id) {
            const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportiv.id).select('*, cluburi(*), sportivi_roluri(roluri(id, nume))').single();
            if (error) return { success: false, error };
            
            const updatedUser = { ...data, roluri: data.sportivi_roluri.map((r: any) => r.roluri) };
            delete updatedUser.sportivi_roluri;
            
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
            return { success: true };
        }
        return { success: false, error: 'Sportiv ID is missing' };
    };

    const handleDeactivate = async () => {
        const { error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportiv.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, status: 'Inactiv'} : s)); showSuccess("Succes", "Sportivul a fost marcat ca inactiv."); }
    };

    const handleDelete = async () => {
        const { error } = await supabase.from('sportivi').delete().eq('id', sportiv.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.filter(s => s.id !== sportiv.id)); onBack(); showSuccess("Succes", "Sportivul a fost șters definitiv."); }
    };
    
     const handleSaveRoles = async () => {
        if (!supabase) { showError("Eroare", "Supabase client not initialized."); return; }
        let finalRoleIds = [...selectedRoleIds];
        if (finalRoleIds.length === 0) { const sportivRole = allRoles.find(r => r.nume === 'Sportiv'); if (sportivRole) finalRoleIds.push(sportivRole.id); }
        const { error } = await supabase.rpc('schimba_rol_utilizator', { p_user_id: sportiv.id, p_role_ids: finalRoleIds });
        if (error) { showError("Eroare RPC", error.message); } else {
            const updatedRoles = allRoles.filter(r => finalRoleIds.includes(r.id));
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, roluri: updatedRoles } : s));
            setIsEditingRoles(false); showSuccess("Roluri Salvate", "Rolurile au fost actualizate.");
        }
    };
    
    const handleAddGrade = async (data: { grad_id: string; data_obtinere: string; observatii: string }) => {
        if(!supabase) return;
        try {
            const { data: newGradeHistory, error } = await supabase.from('istoric_grade').insert({
                sportiv_id: sportiv.id,
                ...data
            }).select().single();
            if (error) throw error;
            setIstoricGrade(prev => [...prev, newGradeHistory]);
            showSuccess("Succes", "Gradul a fost adăugat în istoric.");
            setIsAddGradeModalOpen(false);
        } catch (err: any) {
            showError("Eroare la adăugare", err.message);
        }
    };

    const unassignedRoles = allRoles.filter(r => !selectedRoleIds.includes(r.id));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button><Button variant="info" onClick={() => setIsEditModalOpen(true)}><EditIcon className="w-4 h-4 mr-2"/> Editează Profil</Button></div>
            <header className="bg-[var(--bg-card)] p-6 rounded-xl shadow-lg border border-[var(--border-color)] flex flex-col md:flex-row items-center gap-6">
                <div><GradBadge grad={currentGrad} /></div>
                <div className="text-center md:text-left flex-grow">
                    <h1 className="text-3xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h1>
                    <p className="text-lg text-slate-300">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || 'Fără grupă'}</p>
                </div>
                <div className="flex gap-2"><Button variant="primary" onClick={() => setIsWalletModalOpen(true)} className="!py-2 !px-3"><WalletIcon className="w-5 h-5 mr-2"/> Portofel</Button><Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="!py-2 !px-3"><TrashIcon className="w-5 h-5 mr-2"/> Șterge</Button></div>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card><h3 className="text-lg font-bold text-white mb-3">Date Personale</h3><dl className="space-y-3"><DataField label="Vârstă" value={`${getAge(sportiv.data_nasterii)} ani`} /><DataField label="Data Înscrierii" value={new Date(sportiv.data_inscrierii).toLocaleDateString('ro-RO')} /><DataField label="Status" value={<span className={`px-2 py-0.5 text-xs rounded-full ${sportiv.status === 'Activ' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>{sportiv.status}</span>} /><DataField label="Club" value={sportiv.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : sportiv.cluburi?.nume} /></dl>
                        {isSuperAdmin && <Button onClick={() => setIsTransferModalOpen(true)} variant="secondary" className="w-full mt-4"><TransferIcon className="w-4 h-4 mr-2"/> Transferă Sportiv</Button>}
                    </Card>
                    <Card><h3 className="text-lg font-bold text-white mb-3">Roluri & Permisiuni</h3>
                        <div className="flex flex-wrap gap-2">{sportiv.roluri.map(r => <RoleBadge key={r.id} role={r}/>)}</div>
                        {isAdmin && (isEditingRoles ? <div className="mt-4 space-y-2"><div className="flex items-end gap-2"><Select label="Adaugă Rol" value="" onChange={e => { if (e.target.value) setSelectedRoleIds(p => [...new Set([...p, e.target.value])]); }}><option value="">Selectează...</option>{unassignedRoles.map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}</Select></div><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => setIsEditingRoles(false)}>Anulează</Button><Button size="sm" variant="success" onClick={handleSaveRoles}>Salvează</Button></div></div> : <Button size="sm" variant="secondary" className="w-full mt-3" onClick={() => setIsEditingRoles(true)}><EditIcon className="w-4 h-4 mr-1"/> Modifică Roluri</Button>)}
                    </Card>
                    <Card>
                        <AttendanceIndicator attendances={lastThreeAttendances} />
                    </Card>
                    <Card><h3 className="text-lg font-bold text-white mb-3">Feedback Instructor</h3>
                        {isEditingFeedback ? <div className="space-y-3"><Input label="Puncte Forte" name="puncte_forte" value={feedbackData.puncte_forte} onChange={(e) => setFeedbackData(p=>({...p, puncte_forte: e.target.value}))}/><Input label="Puncte Slabe" name="puncte_slabe" value={feedbackData.puncte_slabe} onChange={(e) => setFeedbackData(p=>({...p, puncte_slabe: e.target.value}))}/><Input label="Obiective" name="obiective" value={feedbackData.obiective} onChange={(e) => setFeedbackData(p=>({...p, obiective: e.target.value}))}/><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={()=>setIsEditingFeedback(false)}>Anulează</Button><Button size="sm" variant="success" onClick={handleSaveFeedback} isLoading={isSavingFeedback}>Salvează</Button></div></div>
                        : <><dl className="space-y-3"><DataField label="Puncte Forte" value={sportiv.puncte_forte} /><DataField label="Puncte Slabe" value={sportiv.puncte_slabe} /><DataField label="Obiective" value={sportiv.obiective} /></dl><Button size="sm" variant="secondary" className="w-full mt-3" onClick={() => setIsEditingFeedback(true)}><EditIcon className="w-4 h-4 mr-1"/> Editează Feedback</Button></>}
                    </Card>
                    <Button onClick={() => setIsReportModalOpen(true)} className="w-full"><ChartBarIcon className="w-5 h-5 mr-2" /> Generează Raport Feedback</Button>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <Card><h3 className="text-lg font-bold text-white mb-3">Progres Tehnic</h3><SportivProgressChart sportiv={sportiv} gradeHistory={gradeHistory} antrenamente={antrenamente} grade={grade} /></Card>
                    <Card><div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">Istoric Grade</h3><Button size="sm" variant="secondary" onClick={() => setIsAddGradeModalOpen(true)}><PlusIcon className="w-4 h-4 mr-1"/> Adaugă Manual</Button></div>
                        <div className="mt-3 max-h-60 overflow-y-auto pr-2">{[...gradeHistory].reverse().map(h => <div key={`${h.date}-${h.rank}`} className="flex justify-between p-2 border-b border-slate-700 last:border-0"><span className="font-semibold text-white">{h.gradNume}</span><span className="text-sm text-slate-400">{new Date(h.date).toLocaleDateString('ro-RO')} ({h.source})</span></div>)}</div>
                    </Card>
                </div>
            </div>
            {isEditModalOpen && <SportivFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSave} sportivToEdit={sportiv} grupe={grupe} setGrupe={()=>{}} familii={familii} setFamilii={()=>{}} tipuriAbonament={tipuriAbonament} clubs={clubs} currentUser={currentUser} />}
            {isWalletModalOpen && <SportivWallet sportiv={sportiv} familie={familii.find(f => f.id === sportiv.familie_id)} allPlati={plati} allTranzactii={tranzactii} setTranzactii={setTranzactii} onClose={() => setIsWalletModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteAuditModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} sportiv={sportiv} onDeactivate={handleDeactivate} onDelete={handleDelete} />}
            {isReportModalOpen && <SportivFeedbackReport isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} sportiv={sportiv} antrenamente={antrenamente} grupe={grupe} grade={grade} participari={participari} examene={examene} />}
            {isTransferModalOpen && <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} sportiv={sportiv} clubs={clubs} onTransferComplete={(updatedSportiv) => { setSportivi(p => p.map(s => s.id === updatedSportiv.id ? updatedSportiv : s)); setIsTransferModalOpen(false); }} />}
            {isAddGradeModalOpen && <AddGradeModal isOpen={isAddGradeModalOpen} onClose={() => setIsAddGradeModalOpen(false)} onSave={handleAddGrade} sportiv={sportiv} grades={grade} />}
        </div>
    );
};