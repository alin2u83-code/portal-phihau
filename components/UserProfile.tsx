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