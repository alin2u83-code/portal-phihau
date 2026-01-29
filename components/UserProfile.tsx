import React, { useState, useMemo, useEffect } from 'react';
// FIX: Replaced deprecated type 'Participare' with 'InscriereExamen'.
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
    const colorClasses: Record<Rol['nume'], string> = { Admin: 'bg-red-600 text-white', 'SUPER_ADMIN_FEDERATIE': 'bg-red-800 text-white', 'Admin Club': 'bg-blue-600 text-white', Instructor: 'bg-sky-600 text-white', Sportiv: 'bg-slate-600 text-slate-200' };
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
            .filter(Boolean);

        const manualGrades = istoricGrade
            .filter(ig => ig.sportiv_id === sportiv.id)
            .map(ig => {
                const grad = grade.find(g => g.id === ig.grad_id);
                if (!grad) return null;
                return {
                    source: 'manual',
                    date: new Date(ig.data_obtinere).getTime(),
                    grad_id: grad.id,
                    gradNume: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter(Boolean);
            
        return [...examGrades, ...manualGrades].sort((a,b) => b.date - a.date);
    }, [participari, istoricGrade, examene, grade, sportiv.id]);
    
    const currentGrad = useMemo(() => {
        if (sportiv.grad_actual_id) {
            const officialGrad = getGrad(sportiv.grad_actual_id, grade);
            if (officialGrad) return officialGrad;
        }
        if (gradeHistory.length > 0) {
            return getGrad(gradeHistory[0].grad_id, grade);
        }
        return null;
    }, [sportiv.grad_actual_id, gradeHistory, grade]);


    const eligibility = useMemo(() => {
        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const nextGrad = currentGrad ? sortedGrades.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1) : sortedGrades[0];
        if (!nextGrad) return { eligible: false, message: "Ați atins gradul maxim.", nextGrad: null };
        const age = getAge(sportiv.data_nasterii);
        if (age < nextGrad.varsta_minima) return { eligible: false, message: `Vârsta minimă: ${nextGrad.varsta_minima} ani (are ${age}).`, nextGrad };
        
        const lastPromotionDateMs = gradeHistory.length > 0 ? gradeHistory[0].date : new Date(sportiv.data_inscrierii).getTime();
        const lastPromotionDate = new Date(lastPromotionDateMs);
        
        const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
        const eligibilityDate = new Date(lastPromotionDate);
        eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
        
        if (new Date() < eligibilityDate) return { eligible: false, message: `Eligibil după: ${eligibilityDate.toLocaleDateString('ro-RO')}.`, nextGrad };
        
        return { eligible: true, message: "Eligibil pentru examinare.", nextGrad };
    }, [currentGrad, grade, sportiv, gradeHistory]);
    
    const { sold } = useMemo(() => {
        const allRelevantPlati = plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id));
        const allRelevantTranzactii = tranzactii.filter(t => t.sportiv_id === sportiv.id || (t.familie_id && t.familie_id === sportiv.familie_id));
        const totalDatorii = allRelevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = allRelevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        return { sold: totalIncasari - totalDatorii };
    }, [sportiv, plati, tranzactii]);
    
    const allGradesWithDates = useMemo(() => {
        return gradeHistory.map(gh => ({
            id: gh.grad_id,
            nume: gh.gradNume,
            data_obtinere: new Date(gh.date).toISOString().split('T')[0]
        }));
    }, [gradeHistory]);

    const handleSaveRoles = async () => {
        if (!isAdmin) return;
        let finalRoleIds = [...selectedRoleIds];
        if (finalRoleIds.length === 0) {
            const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
            if (sportivRole) finalRoleIds.push(sportivRole.id);
        }
        
        const { error: deleteError } = await supabase.from('sportivi_roluri').delete().eq('sportiv_id', sportiv.id);
        if (deleteError) { showError("Eroare la ștergerea rolurilor vechi", deleteError); return; }

        if (finalRoleIds.length > 0) {
            const newRolesToInsert = finalRoleIds.map(rol_id => ({ sportiv_id: sportiv.id, rol_id }));
            const { error: insertError } = await supabase.from('sportivi_roluri').insert(newRolesToInsert);
            if (insertError) { showError("Eroare la adăugarea rolurilor noi", insertError); return; }
        }

        const updatedRoles = allRoles.filter(r => finalRoleIds.includes(r.id));
        setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, roluri: updatedRoles } : s));
        showSuccess("Succes", "Rolurile au fost actualizate.");
        setIsEditingRoles(false);
    };

    const handleSaveSportiv = async (formData: Partial<Sportiv>) => {
        const { roluri, ...sportivData } = formData;
        const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportiv.id).select().single();
        if (error) {
            showError("Eroare la salvare", error);
            return { success: false, error };
        }
        setSportivi((prev: Sportiv[]) => prev.map(s => s.id === sportiv.id ? { ...s, ...data } : s));
        return { success: true };
    };

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFeedbackData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveFeedback = async () => {
        setIsSavingFeedback(true);
        const { error } = await supabase.from('sportivi').update({
            puncte_forte: feedbackData.puncte_forte,
            puncte_slabe: feedbackData.puncte_slabe,
            obiective: feedbackData.obiective,
        }).eq('id', sportiv.id);

        if (error) {
            showError("Eroare la salvare feedback", error);
        } else {
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, ...feedbackData } : s));
            showSuccess("Feedback salvat", "Observațiile au fost salvate cu succes.");
            setIsEditingFeedback(false);
        }
        setIsSavingFeedback(false);
    };
    
    const handleDeactivate = async (s: Sportiv) => {
        const { data, error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', s.id).select().single();
        if (error) showError("Eroare la Dezactivare", error);
        else { setSportivi(p => p.map(sp => sp.id === s.id ? { ...sp, ...data } : sp)); showSuccess("Succes", "Sportiv marcat ca 'Inactiv'."); }
    };

    const handleDelete = async (s: Sportiv) => {
        const { error } = await supabase.from('sportivi').delete().eq('id', s.id);
        if (error) showError("Eroare la Ștergere", error);
        else { setSportivi(p => p.filter(sp => sp.id !== s.id)); showSuccess("Succes", "Sportiv șters definitiv."); onBack(); }
    };

    const handleTransferComplete = (updatedSportiv: Sportiv) => {
        setSportivi(prev => prev.map(s => s.id === updatedSportiv.id ? updatedSportiv : s));
        setIsTransferModalOpen(false);
        onBack();
    };

    const handleSaveManualGrade = async (data: { grad_id: string; data_obtinere: string; observatii: string }) => {
        const { grad_id, data_obtinere, observatii } = data;
        const newGradeEntry = {
            sportiv_id: sportiv.id,
            grad_id,
            data_obtinere,
            observatii
        };
        const { data: insertedData, error } = await supabase.from('istoric_grade').insert(newGradeEntry).select().single();
        if (error) {
            showError("Eroare la adăugarea gradului", error);
            return;
        }

        setIstoricGrade(prev => [...prev, insertedData]);
        
        // Verificăm dacă gradul adăugat manual este mai mare decât cel curent
        const newGrade = grade.find(g => g.id === grad_id);
        if (newGrade && (!currentGrad || newGrade.ordine > currentGrad.ordine)) {
            const { error: updateError } = await supabase.from('sportivi').update({ grad_actual_id: grad_id }).eq('id', sportiv.id);
            if(updateError) {
                showError("Grad adăugat în istoric, dar eroare la actualizarea gradului curent", updateError);
            } else {
                 setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, grad_actual_id: grad_id } : s));
            }
        }
        
        showSuccess("Succes!", "Gradul a fost adăugat manual în istoricul sportivului.");
        setIsAddGradeModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Listă</Button>
            
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h1>
                        <div className="mt-2 flex items-center gap-2">
                            <GradBadge grad={currentGrad} />
                        </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center flex-wrap">
                        {isSuperAdmin && <Button variant="secondary" onClick={() => setIsTransferModalOpen(true)}><TransferIcon className="w-4 h-4 mr-2"/> Transfer</Button>}
                        <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}><ChartBarIcon className="w-4 h-4 mr-2"/> Raport</Button>
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}><EditIcon className="w-4 h-4 mr-2"/> Editează</Button>
                        <Button variant="info" onClick={() => setIsWalletModalOpen(true)}><WalletIcon className="w-4 h-4 mr-2"/> Portofel</Button>
                        {isAdmin && <Button variant="secondary" onClick={() => setIsAddGradeModalOpen(true)}><PlusIcon className="w-4 h-4 mr-2"/> Adaugă Grad Manual</Button>}
                        <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}><TrashIcon className="w-4 h-4 mr-2"/> Șterge</Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4 animate-fade-in-down">Evoluție & Progres</h3>
                        <SportivProgressChart
                            sportiv={sportiv}
                            gradeHistory={gradeHistory}
                            antrenamente={antrenamente}
                            grade={grade}
                        />
                    </Card>
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white animate-fade-in-down">Feedback & Obiective</h3>
                            {!isEditingFeedback ? (
                                <Button variant="secondary" size="sm" onClick={() => setIsEditingFeedback(true)}>Editează</Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => { setIsEditingFeedback(false); setFeedbackData({ puncte_forte: sportiv.puncte_forte || '', puncte_slabe: sportiv.puncte_slabe || '', obiective: sportiv.obiective || '' }); }}>Anulează</Button>
                                    <Button variant="success" size="sm" onClick={handleSaveFeedback} isLoading={isSavingFeedback}>Salvează</Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Puncte Forte</label>
                                {isEditingFeedback ? ( <textarea name="puncte_forte" value={feedbackData.puncte_forte} onChange={handleFeedbackChange} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-secondary focus:border-brand-secondary transition-all" rows={3}></textarea>
                                ) : ( <p className="font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap p-2 bg-slate-800/50 rounded-md min-h-[4rem]">{sportiv.puncte_forte || <span className="italic text-slate-500">Nespecificat</span>}</p> )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Puncte Slabe</label>
                                {isEditingFeedback ? ( <textarea name="puncte_slabe" value={feedbackData.puncte_slabe} onChange={handleFeedbackChange} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-secondary focus:border-brand-secondary transition-all" rows={3}></textarea>
                                ) : ( <p className="font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap p-2 bg-slate-800/50 rounded-md min-h-[4rem]">{sportiv.puncte_slabe || <span className="italic text-slate-500">Nespecificat</span>}</p> )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Obiective pentru Următorul Grad</label>
                                {isEditingFeedback ? ( <textarea name="obiective" value={feedbackData.obiective} onChange={handleFeedbackChange} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-secondary focus:border-brand-secondary transition-all" rows={3}></textarea>
                                ) : ( <p className="font-semibold text-slate-300 leading-relaxed whitespace-pre-wrap p-2 bg-slate-800/50 rounded-md min-h-[4rem]">{sportiv.obiective || <span className="italic text-slate-500">Nespecificat</span>}</p> )}
                            </div>
                        </div>
                    </Card>
                     <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Istoric Grade Obținute</h3>
                        {allGradesWithDates.length > 0 ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {allGradesWithDates.map(g => (
                                    <div key={g.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-md">
                                        <GradBadge grad={g} />
                                        <p className="text-sm font-bold text-slate-300">
                                            {new Date(g.data_obtinere + 'T00:00:00').toLocaleDateString('ro-RO')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 italic">Niciun grad obținut încă.</p>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                         <h3 className="text-lg font-bold text-white mb-2 animate-fade-in-down">Date Personale</h3>
                        <div className="space-y-2 text-sm">
                            <DataField label="Vârstă" value={`${getAge(sportiv.data_nasterii)} ani`} />
                            <DataField label="Grupă" value={grupe.find(g => g.id === sportiv.grupa_id)?.denumire} />
                            <DataField 
                                label="Club" 
                                value={
                                    !sportiv.club_id 
                                        ? <span className="text-red-400 font-normal text-sm">Contactați instructorul pentru asignarea la club</span> 
                                        : (sportiv.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : sportiv.cluburi?.nume || 'N/A')
                                } 
                            />
                            <DataField label="Status" value={sportiv.status} />
                            <DataField label="Cont de acces" value={sportiv.user_id ? "Activ" : "Inexistent"}/>
                        </div>
                    </Card>
                    
                    <ProgramAntrenament grupaId={sportiv.grupa_id} grupe={grupe} />

                    {isAdmin && (
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 animate-fade-in-down"><ShieldCheckIcon className="w-5 h-5 text-amber-400"/> Roluri Cont</h3>
                            {!isEditingRoles ? (
                                <Button variant="secondary" size="sm" onClick={() => setIsEditingRoles(true)}>Modifică</Button>
                            ) : (
                                <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setIsEditingRoles(false); setSelectedRoleIds((sportiv.roluri || []).map(r => r.id)); }}>Anulează</Button><Button size="sm" variant="success" onClick={handleSaveRoles}>Salvează</Button></div>
                            )}
                        </div>
                        {isEditingRoles ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 bg-slate-900/50 rounded">
                                {allRoles.map(role => ( <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer"> <input type="checkbox" className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-brand-secondary focus:ring-brand-secondary" checked={selectedRoleIds.includes(role.id)} onChange={(e) => setSelectedRoleIds(p => e.target.checked ? [...p, role.id] : p.filter(id => id !== role.id))} disabled={sportiv.id === currentUser.id && role.nume === 'Admin'} /> <span>{role.nume}</span> </label> ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">{(sportiv.roluri || []).length > 0 ? (sportiv.roluri || []).map(r => <RoleBadge key={r.id} role={r}/>) : <span className="text-sm text-slate-400 italic">Niciun rol.</span>}</div>
                        )}
                    </Card>
                    )}
                     <Card>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-white animate-fade-in-down">Progres Tehnic</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            <DataField 
                                label="Grad Actual" 
                                value={currentGrad?.nume || 'Începător'} 
                            />
                            <DataField label="Următorul Grad" value={eligibility.nextGrad?.nume || 'Maxim'} />
                            <p className={`text-xs mt-1 ${eligibility.eligible ? 'text-green-400' : 'text-yellow-400'}`}>{eligibility.message}</p>
                        </div>
                    </Card>
                </div>
            </div>

            <SportivFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveSportiv} sportivToEdit={sportiv} grupe={grupe} setGrupe={()=>{}} familii={familii} setFamilii={()=>{}} tipuriAbonament={tipuriAbonament} clubs={clubs} currentUser={currentUser} />
            {isWalletModalOpen && <SportivWallet sportiv={sportiv} familie={familii.find(f => f.id === sportiv.familie_id)} allPlati={plati} allTranzactii={tranzactii} setTranzactii={setTranzactii} onClose={() => setIsWalletModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteAuditModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} sportiv={sportiv} onDeactivate={handleDeactivate} onDelete={handleDelete} />}
            {isReportModalOpen && <SportivFeedbackReport isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} sportiv={sportiv} antrenamente={antrenamente} grupe={grupe} grade={grade} participari={participari} examene={examene} />}
            {isTransferModalOpen && <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} sportiv={sportiv} clubs={clubs} onTransferComplete={handleTransferComplete} />}
            {isAddGradeModalOpen && <AddGradeModal isOpen={isAddGradeModalOpen} onClose={() => setIsAddGradeModalOpen(false)} onSave={handleSaveManualGrade} sportiv={sportiv} grades={grade} />}
        </div>
    );
};