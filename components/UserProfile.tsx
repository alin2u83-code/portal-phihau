import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, Participare, Examen, Grad, Antrenament, Plata, Familie, TipAbonament, Tranzactie, Reducere, Club } from '../types';
import { Button, Card, Select, Modal, Input } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon, ChartBarIcon, TransferIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { DeleteAuditModal } from './DeleteAuditModal';
import { SportivFeedbackReport } from './SportivFeedbackReport';
import { SportivProgressChart } from './SportivProgressChart';
import { IstoricExameneSportiv } from './IstoricExameneSportiv';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
const getAge = (dateString: string) => { if (!dateString) return 0; const today = new Date(); const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00'); if (isNaN(birthDate.getTime())) { return 0; } let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

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
    // FIX: Corrected key from 'Super Admin' to 'SUPER_ADMIN_FEDERATIE' to match the 'Rol' type definition.
    const colorClasses: Record<Rol['nume'], string> = { Admin: 'bg-red-600 text-white', 'SUPER_ADMIN_FEDERATIE': 'bg-red-800 text-white', 'Admin Club': 'bg-blue-600 text-white', Instructor: 'bg-sky-600 text-white', Sportiv: 'bg-slate-600 text-slate-200' };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[role.nume] || 'bg-gray-500 text-white'}`}>{role.nume}</span>;
};

interface UserProfileProps {
    sportiv: Sportiv;
    currentUser: User;
    participari: Participare[];
    examene: Examen[];
    grade: Grad[];
    antrenamente: Antrenament[];
    plati: Plata[];
    tranzactii: Tranzactie[];
    reduceri: Reducere[];
    grupe: any[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    allRoles: Rol[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<any[]>>;
    onBack: () => void;
    clubs: Club[];
}

export const UserProfile: React.FC<UserProfileProps> = ({ sportiv, currentUser, participari, examene, grade, antrenamente, plati, tranzactii, reduceri, grupe, familii, tipuriAbonament, allRoles, setSportivi, setPlati, setTranzactii, onBack, clubs }) => {
    const { showError, showSuccess } = useError();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

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
    const isSuperAdmin = currentUser.roluri.some(r => r.nume === 'Super Admin' || r.nume === 'Admin');

    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === sportiv.id), [participari, sportiv.id]);
    
    const sortedSportivParticipariForDisplay = useMemo(() => {
        return [...sportivParticipari]
            .map(p => ({...p, examen: examene.find(e => e.id === p.sesiune_id)}))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
    }, [sportivParticipari, examene]);

    const admittedParticipations = useMemo(() => sortedSportivParticipariForDisplay.filter(p => p.rezultat === 'Admis'), [sortedSportivParticipariForDisplay]);
    
    const currentGrad = useMemo(() => {
        const officialGrad = getGrad(sportiv.grad_actual_id, grade);
        if (officialGrad) {
            return officialGrad;
        }
        const lastAdmittedGrade = getGrad(admittedParticipations[0]?.grad_vizat_id, grade);
        return lastAdmittedGrade;
    }, [admittedParticipations, grade, sportiv.grad_actual_id]);
    const currentGradParticipationId = admittedParticipations.length > 0 ? admittedParticipations[0].id : null;

    const eligibility = useMemo(() => {
        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const nextGrad = currentGrad ? sortedGrades.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1) : sortedGrades[0];
        if (!nextGrad) return { eligible: false, message: "Ați atins gradul maxim.", nextGrad: null };
        const age = getAge(sportiv.data_nasterii);
        if (age < nextGrad.varsta_minima) return { eligible: false, message: `Vârsta minimă: ${nextGrad.varsta_minima} ani (are ${age}).`, nextGrad };
        const lastExamDateStr = admittedParticipations[0]?.examen ? admittedParticipations[0].examen.data : sportiv.data_inscrierii;
        const lastExamDate = new Date(lastExamDateStr + 'T00:00:00');
        const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
        const eligibilityDate = new Date(lastExamDate);
        eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
        if (new Date() < eligibilityDate) return { eligible: false, message: `Eligibil după: ${eligibilityDate.toLocaleDateString('ro-RO')}.`, nextGrad };
        return { eligible: true, message: "Eligibil pentru examinare.", nextGrad };
    }, [currentGrad, grade, sportiv, admittedParticipations]);
    
    const { sold, individualHistory, familieHistory } = useMemo(() => {
        const allRelevantPlati = plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id));
        const allRelevantTranzactii = tranzactii.filter(t => t.sportiv_id === sportiv.id || (t.familie_id && t.familie_id === sportiv.familie_id));
        const totalDatorii = allRelevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = allRelevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        const currentSold = totalIncasari - totalDatorii;
        
        const uniquePlati: Plata[] = Array.from(new Map<string, Plata>(allRelevantPlati.map(p => [p.id, p])).values());

        const processPlati = (platiList: Plata[]) => {
            let historyItems = platiList.map(plata => {
                let paymentDate: string | null = null;
                if (plata.status === 'Achitat' || plata.status === 'Achitat Parțial') {
                    const payingTransaction = tranzactii.find(t => t.plata_ids?.includes(plata.id));
                    if (payingTransaction) paymentDate = payingTransaction.data_platii;
                }
                const reducereAplicata = plata.reducere_id ? reduceri.find(r => r.id === plata.reducere_id) : null;
                let discountInfo = null;
                if (reducereAplicata && plata.suma_initiala) {
                    const valoareReducere = plata.suma_initiala - plata.suma;
                    discountInfo = `${valoareReducere.toFixed(2)} lei (${reducereAplicata.nume})`;
                }
                return {
                    id: plata.id,
                    facturaDate: plata.data,
                    description: plata.descriere,
                    amount: plata.suma,
                    initialAmount: plata.suma_initiala,
                    discount: discountInfo,
                    status: plata.status,
                    type: plata.tip,
                    paymentDate: paymentDate
                };
            }).sort((a, b) => new Date(b.facturaDate).getTime() - new Date(a.facturaDate).getTime());
            
            if (financialFilter !== 'Toate') {
                historyItems = historyItems.filter(item => item.type === financialFilter);
            }
            return historyItems;
        };
        
        const individualPlati = uniquePlati.filter(p => p.sportiv_id === sportiv.id && !p.familie_id);
        const familiePlati = uniquePlati.filter(p => p.familie_id && p.familie_id === sportiv.familie_id);

        return { 
            sold: currentSold, 
            individualHistory: processPlati(individualPlati), 
            familieHistory: processPlati(familiePlati)
        };
    }, [sportiv, plati, tranzactii, financialFilter, reduceri, familii]);


    const trainingHistory = useMemo(() => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        threeMonthsAgo.setHours(0,0,0,0);

        return antrenamente
            .filter(a => {
                if (!a.data) return false;
                const trainingDate = new Date(a.data + 'T00:00:00');
                if (trainingDate < threeMonthsAgo) return false;

                const isForGroup = a.grupa_id && a.grupa_id === sportiv.grupa_id;
                const isVacationTraining = !a.grupa_id && sportiv.participa_vacanta;
                
                return isForGroup || isVacationTraining;
            })
            .map(a => ({
                ...a,
                status: a.sportivi_prezenti_ids.includes(sportiv.id) ? 'Prezent' : 'Absent',
                grupaNume: grupe.find(g => g.id === a.grupa_id)?.denumire || 'Vacanță'
            }))
            .sort((a, b) => {
                const dateA = a.data ? new Date(a.data + 'T00:00:00').getTime() : 0;
                const dateB = b.data ? new Date(b.data + 'T00:00:00').getTime() : 0;
                return dateB - dateA;
            });
    }, [sportiv, antrenamente, grupe]);

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

    if (showHistory) {
        return <IstoricExameneSportiv 
            viewedUser={sportiv}
            participari={sportivParticipari}
            sesiuni={examene}
            grade={grade}
            onBack={() => setShowHistory(false)}
        />
    }


    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Listă</Button>
            
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h1>
                        <p className="text-slate-400">Profil detaliat și istoric activitate</p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center flex-wrap">
                        {isSuperAdmin && <Button variant="secondary" onClick={() => setIsTransferModalOpen(true)}><TransferIcon className="w-4 h-4 mr-2"/> Transfer</Button>}
                        <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}><ChartBarIcon className="w-4 h-4 mr-2"/> Raport</Button>
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}><EditIcon className="w-4 h-4 mr-2"/> Editează</Button>
                        <Button variant="info" onClick={() => setIsWalletModalOpen(true)}><WalletIcon className="w-4 h-4 mr-2"/> Portofel</Button>
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
                            participari={participari}
                            examene={examene}
                            grade={grade}
                            antrenamente={antrenamente}
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
                        <h3 className="text-lg font-bold text-white mb-4">Istoric Prezențe Recente (Ultimele 3 Luni)</h3>
                        <div className="max-h-72 overflow-y-auto pr-2 space-y-3">
                            {trainingHistory.length > 0 ? (
                                trainingHistory.map(antrenament => (
                                    <div key={antrenament.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold text-white">{new Date(antrenament.data + 'T00:00:00').toLocaleDateString('ro-RO')}</p>
                                            <p className="text-xs text-slate-400">{antrenament.grupaNume}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            antrenament.status === 'Prezent' ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-400'
                                        }`}>
                                            {antrenament.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-500 italic text-center py-4">Nicio prezență înregistrată în ultimele 3 luni.</p>
                            )}
                        </div>
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
                                        ? <span className="text-red-400 font-normal text-sm">Profil nealocat unui club. Contactați administratorul Lungu Alin.</span> 
                                        : (sportiv.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : sportiv.cluburi?.nume || 'N/A')
                                } 
                            />
                            <DataField label="Status" value={sportiv.status} />
                            <DataField label="Cont de acces" value={sportiv.user_id ? "Activ" : "Inexistent"}/>
                        </div>
                    </Card>

                    {isAdmin && (
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2 animate-fade-in-down"><ShieldCheckIcon className="w-5 h-5 text-amber-400"/> Roluri Cont</h3>
                            {!isEditingRoles ? (
                                <Button variant="secondary" size="sm" onClick={() => setIsEditingRoles(true)}>Modifică</Button>
                            ) : (
                                <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setIsEditingRoles(false); setSelectedRoleIds(sportiv.roluri.map(r => r.id)); }}>Anulează</Button><Button size="sm" variant="success" onClick={handleSaveRoles}>Salvează</Button></div>
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
                            <Button size="sm" variant="secondary" onClick={() => setShowHistory(true)}>Istoric</Button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <DataField 
                                label="Grad Actual" 
                                value={
                                    <span 
                                        className="text-brand-secondary hover:underline cursor-pointer font-bold"
                                        onClick={() => setShowHistory(true)}
                                    >
                                        {currentGrad?.nume || 'Începător'}
                                    </span>
                                } 
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
        </div>
    );
};