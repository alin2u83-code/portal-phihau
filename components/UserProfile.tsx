import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, InscriereExamen, Examen, Grad, Antrenament, IstoricGrade, Plata, Familie, TipAbonament, Tranzactie, Reducere, Club, ProgramItem, Grupa, VizualizarePlata } from '../types';
import { Button, Card, Select, Modal, Input, RoleBadge, Skeleton } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon, ChartBarIcon, TransferIcon, CheckCircleIcon, ExclamationTriangleIcon, UserPlusIcon, UserCircleIcon, ClipboardListIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { DeleteAuditModal } from './DeleteAuditModal';
import { SportivFeedbackReport } from './SportivFeedbackReport';
import { SportivProgressChart, ChartDataPoint } from './SportivProgressChart';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { AddGradeModal } from './AddGradeModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { GradBadge } from '../utils/grades';
import { SportivAvatarEditor } from './SportivAvatarEditor';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
const getAge = (dateString: string) => { if (!dateString) return 0; const today = new Date(); const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00'); if (isNaN(birthDate.getTime())) { return 0; } let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

const ProgramAntrenament: React.FC<{ grupaId: string | null; grupe: Grupa[] }> = ({ grupaId, grupe }) => {
    const zileSaptamanaOrdonate: Record<ProgramItem['ziua'], number> = { 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6, 'Duminică': 7 };

    const grupaCurenta = useMemo(() => (grupe || []).find(g => g.id === grupaId), [grupaId, grupe]);
    
    const programSortat = useMemo(() => {
        if (!grupaCurenta?.program) return [];
        return [...(grupaCurenta.program || [])]
            .filter(p => p.is_activ !== false) // Show only active sessions
            .sort((a, b) => {
                const ziCompare = (zileSaptamanaOrdonate[a.ziua] || 0) - (zileSaptamanaOrdonate[b.ziua] || 0);
                if (ziCompare !== 0) return ziCompare;
                return (a.ora_start || '').localeCompare(b.ora_start || '');
            });
    }, [grupaCurenta]);

    if (!grupe) return <Card><Skeleton className="h-24 w-full" /></Card>;

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
    if (!attendances) return (
        <div>
            <h3 className="text-lg font-bold text-white mb-3">Prezență Recente</h3>
            <div className="flex gap-2">
                <Skeleton className="w-8 h-12" />
                <Skeleton className="w-8 h-12" />
                <Skeleton className="w-8 h-12" />
            </div>
        </div>
    );

    const indicators = [...(attendances || [])].reverse(); // Afișează cel mai vechi primul

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

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransferComplete, sportiv, clubs }) => {
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
                .maybeSingle();
            if (fetchError) throw fetchError;
            if (!updatedSportiv) throw new Error("Nu s-a putut recupera profilul după transfer. Verificați permisiunile.");

            showSuccess("Transfer Finalizat", `${sportiv.nume} ${sportiv.prenume} a fost mutat la noul club.`);
            setTransferSuccess(true);
            
            setTimeout(() => {
                onTransferComplete(updatedSportiv as Sportiv);
            }, 2000);

        } catch (err: any) {
            showError("Eroare la Transfer", err.message);
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
                        {(availableClubs || []).map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
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

interface PlataEditModalProps {
    plata: Plata | null;
    onClose: () => void;
    onSave: (plata: Plata) => Promise<void>;
    isLoading: boolean;
}

const PlataEditModal: React.FC<PlataEditModalProps> = ({ plata, onClose, onSave, isLoading }) => {
    const [formData, setFormData] = useState<Plata | null>(plata);

    useEffect(() => {
        setFormData(plata);
    }, [plata]);

    if (!formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: name === 'suma' ? parseFloat(value) || 0 : value } : null);
    };

    const handleSaveClick = async () => {
        if (formData) {
            await onSave(formData);
        }
    };

    return (
        <Modal isOpen={!!plata} onClose={onClose} title="Editează Factură">
            <div className="space-y-4">
                <Input label="Descriere" name="descriere" value={formData.descriere} onChange={handleChange} />
                <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formData.suma} onChange={handleChange} />
                <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                    <option value="Neachitat">Neachitat</option>
                    <option value="Achitat Parțial">Achitat Parțial</option>
                    <option value="Achitat">Achitat</option>
                </Select>
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Anulează</Button>
                    <Button variant="success" onClick={handleSaveClick} isLoading={isLoading}>Salvează</Button>
                </div>
            </div>
        </Modal>
    );
}

const CreateAccountModal: React.FC<{
    sportiv: Sportiv;
    onClose: () => void;
    onAccountCreated: () => void;
}> = ({ sportiv, onClose, onAccountCreated }) => {
    const { showError, showSuccess } = useError();
    const [form, setForm] = useState({ email: '', parola: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const sanitize = (str: string) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
        const nume = sanitize(sportiv.nume);
        const prenume = sanitize(sportiv.prenume);
        const defaultEmail = sportiv.email || `${nume}.${prenume}@phihau.ro`;
        const defaultPassword = `${nume}.1234!`;
        setForm({ email: defaultEmail, parola: defaultPassword });
    }, [sportiv]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        if (!form.email || !form.parola) {
            showError("Date Incomplete", "Emailul și parola sunt obligatorii.");
            return;
        }
        setLoading(true);

        try {
            // FIX: Bypass Edge Function, use supabase.auth.signUp directly.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.parola,
            });

            if (authError) {
                if (authError.message.includes('User already exists')) {
                    throw new Error('Un utilizator cu acest email există deja în sistem. Asociați-l manual.');
                }
                throw authError;
            }
            
            const newAuthUser = authData.user;
            if (!newAuthUser) throw new Error("Contul de autentificare nu a putut fi creat. Răspunsul de la server a fost gol.");
            
            // FIX: Immediately link the new auth user to the existing sportiv profile.
            const { error: updateError } = await supabase.from('sportivi').update({ user_id: newAuthUser.id, email: form.email }).eq('id', sportiv.id);
            if (updateError) throw updateError;
            
            // FIX: Immediately insert the default 'Sportiv' role.
            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
                user_id: newAuthUser.id,
                sportiv_id: sportiv.id,
                club_id: sportiv.club_id,
                rol_denumire: 'Sportiv',
                is_primary: true
            });
            if (roleError) {
                throw new Error(`Profilul a fost creat, dar rolul 'Sportiv' nu a putut fi asignat: ${roleError.message}. Contactați administratorul.`);
            }

            showSuccess("Cont Creat!", `Contul pentru ${sportiv.nume} a fost generat. Utilizatorul trebuie să confirme adresa de email.`);
            onAccountCreated();
            onClose();

        } catch (err: any) {
            showError("Eroare la Generare Cont", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Generează Cont pentru ${sportiv.nume}`}>
            <form onSubmit={handleSave} className="space-y-4">
                <Input label="Email de Autentificare" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                <Input label="Parolă Inițială" value={form.parola} onChange={e => setForm(p => ({ ...p, parola: e.target.value }))} required />
                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Generează și Asociază</Button>
                </div>
            </form>
        </Modal>
    );
};


const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="mt-1 text-md text-slate-200 font-semibold">{value || 'N/A'}</dd>
    </div>
);

interface TrainingHistoryProps {
    sportivId: string;
    antrenamente: Antrenament[];
    grupe: Grupa[];
}

const TrainingHistory: React.FC<TrainingHistoryProps> = ({ sportivId, antrenamente, grupe }) => {
    const trainingRecords = useMemo(() => {
        const records: { date: string; groupName: string; status: 'Prezent' | 'Absent' | 'N/A' }[] = [];
        
        if (!antrenamente || !grupe) return [];

        antrenamente.forEach(antr => {
            const isPresent = (antr.prezenta || []).some(p => p.sportiv_id === sportivId);
            const group = (grupe || []).find(g => g.id === antr.grupa_id);
            
            records.push({
                date: antr.data,
                groupName: group?.denumire || 'Grupă necunoscută',
                status: isPresent ? 'Prezent' : 'Absent',
            });
        });

        return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sportivId, antrenamente, grupe]);

    if (!antrenamente || !grupe) return <Card><Skeleton className="h-40 w-full" /></Card>;

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-3">Istoric Antrenamente</h3>
            {trainingRecords.length > 0 ? (
                <div className="max-h-60 overflow-y-auto pr-2">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-[var(--bg-card)]">
                            <tr>
                                <th className="py-2">Data</th>
                                <th className="py-2">Grupă</th>
                                <th className="py-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {trainingRecords.map((record, index) => (
                                <tr key={index}>
                                    <td className="py-2 font-semibold text-white">{new Date(record.date).toLocaleDateString('ro-RO')}</td>
                                    <td className="py-2 text-slate-300">{record.groupName}</td>
                                    <td className={`py-2 text-right font-bold ${record.status === 'Prezent' ? 'text-green-500' : 'text-red-500'}`}>{record.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-slate-500 italic text-center py-4">Nu există înregistrări de antrenament pentru acest sportiv.</p>
            )}
        </Card>
    );
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
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
    onBack: () => void;
    clubs: Club[];
    vizualizarePlati: VizualizarePlata[];
    sportivi: Sportiv[];
}

export const UserProfile: React.FC<UserProfileProps> = ({ sportiv, currentUser, participari, examene, grade, istoricGrade, setIstoricGrade, antrenamente, plati, tranzactii, reduceri, grupe, familii, tipuriAbonament, setSportivi, setPlati, setTranzactii, onBack, clubs, vizualizarePlati, sportivi }) => {
    const { showError, showSuccess } = useError();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isAddGradeModalOpen, setIsAddGradeModalOpen] = useState(false);
    const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'profil' | 'contact' | 'grade' | 'financiar'>('profil');

    const clubTheme = useMemo(() => {
        const club = clubs.find(c => c.id === sportiv.club_id);
        // Cast to any to avoid type errors if theme_config is not strictly typed yet
        return (club as any)?.theme_config || {};
    }, [clubs, sportiv.club_id]);

    const primaryColor = clubTheme.primaryColor || '#3b82f6';

    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    const [feedbackData, setFeedbackData] = useState({
        puncte_forte: sportiv.puncte_forte || '',
        puncte_slabe: sportiv.puncte_slabe || '',
        obiective: sportiv.obiective || '',
    });
    const [isSavingFeedback, setIsSavingFeedback] = useState(false);
    
    const [plataToEdit, setPlataToEdit] = useState<Plata | null>(null);
    const [plataToDelete, setPlataToDelete] = useState<Plata | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setFeedbackData({
            puncte_forte: sportiv.puncte_forte || '',
            puncte_slabe: sportiv.puncte_slabe || '',
            obiective: sportiv.obiective || '',
        });
    }, [sportiv]);

    const isSuperAdmin = currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');

    const gradeHistory = useMemo(() => {
        if (!participari || !grade || !examene || !istoricGrade) return [];

        const examGrades = (participari || [])
            .filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis')
            .map(p => {
                const examen = (examene || []).find(e => e.id === p.sesiune_id);
                const grad = (grade || []).find(g => g.id === p.grad_vizat_id);
                if (!examen || !grad) return null;
                return {
                    source: 'examen',
                    date: new Date(examen.data).getTime(),
                    grad_id: grad.id,
                    rankName: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

        const manualGrades = (istoricGrade || [])
            .filter(hg => hg.sportiv_id === sportiv.id && !hg.sesiune_examen_id)
            .map(hg => {
                const grad = (grade || []).find(g => g.id === hg.grad_id);
                if (!grad) return null;
                return {
                    source: 'manual',
                    date: new Date(hg.data_obtinere).getTime(),
                    grad_id: grad.id,
                    rankName: grad.nume,
                    rank: grad.ordine
                };
            })
            .filter((g): g is NonNullable<typeof g> => g !== null);

        return [...examGrades, ...manualGrades].sort((a, b) => a.date - b.date);

    }, [participari, examene, grade, istoricGrade, sportiv.id]);

    const chartData: ChartDataPoint[] = useMemo(() => {
        return gradeHistory.map(item => ({
            date: new Date(item.date).toLocaleDateString('ro-RO'),
            rankOrder: item.rank,
            rankName: item.rankName,
            timestamp: item.date,
            source: item.source
        }));
    }, [gradeHistory]);
    
    const currentGrad = useMemo(() => {
        const lastGradeEvent = [...gradeHistory].sort((a,b) => b.date - a.date)[0];
        return lastGradeEvent ? grade.find(g => g.id === lastGradeEvent.grad_id) : null;
    }, [gradeHistory, grade]);

    const { totalRestante, istoricFacturi } = useMemo(() => {
        if (!vizualizarePlati || !sportivi) return { totalRestante: 0, istoricFacturi: [] };

        const familyMemberIds = sportiv.familie_id
            ? new Set((sportivi || []).filter(s => s.familie_id === sportiv.familie_id).map(s => s.id))
            : new Set([sportiv.id]);

        const platiRelevante = (vizualizarePlati || []).filter(p => {
            if (p.familie_id && p.familie_id === sportiv.familie_id) return true;
            if (p.sportiv_id && familyMemberIds.has(p.sportiv_id)) return true;
            return false;
        });

        const facturiMap = new Map<string, {
            detalii: VizualizarePlata;
            incasari: { data_plata: string; suma_incasata: number }[];
            totalIncasat: number;
        }>();

        platiRelevante.forEach(p => {
            if (!facturiMap.has(p.plata_id)) {
                facturiMap.set(p.plata_id, { detalii: { ...p, suma_datorata: p.suma_datorata }, incasari: [], totalIncasat: 0 });
            }
            if (p.data_plata && p.suma_incasata) {
                const factura = facturiMap.get(p.plata_id)!;
                factura.incasari.push({ data_plata: p.data_plata, suma_incasata: p.suma_incasata });
                factura.totalIncasat += p.suma_incasata;
            }
        });
        
        const facturiProcesate = Array.from(facturiMap.values());
        
        const restante = facturiProcesate.reduce((sum, f) => {
            const ramasDePlata = (f.detalii.suma_datorata || 0) - f.totalIncasat;
            return sum + Math.max(0, ramasDePlata);
        }, 0);

        return { 
            totalRestante: restante, 
            istoricFacturi: facturiProcesate.sort((a, b) => new Date(b.detalii.data_emitere).getTime() - new Date(a.detalii.data_emitere).getTime())
        };
    }, [sportiv, vizualizarePlati, sportivi]);

    const userPlatiIds = useMemo(() => {
        return new Set((plati || []).filter(p => (p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id))).map(p => p.id));
    }, [plati, sportiv]);
    const possibleViewError = userPlatiIds.size > 0 && istoricFacturi.length === 0 && !sportiv.user_id;

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
        if (!supabase) {
            showError("Eroare", "Client Supabase neinițializat.");
            return;
        }
        setIsSavingFeedback(true);
        const { error } = await supabase.from('sportivi').update(feedbackData).eq('id', sportiv.id);
        if (error) showError("Eroare la Salvare", error.message);
        else { setSportivi(p => p.map(s => s.id === sportiv.id ? { ...s, ...feedbackData } : s)); setIsEditingFeedback(false); showSuccess("Feedback Salvat", "Observațiile au fost salvate cu succes."); }
        setIsSavingFeedback(false);
    };

    const handleSave = async (formData: Partial<Sportiv>): Promise<{ success: boolean; error?: any; data?: Sportiv; }> => {
        try {
            if (!sportiv.id) throw new Error("ID-ul sportivului lipsește.");
            
            const { roluri, cluburi, ...sportivData } = formData;
            const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportiv.id).select('*, cluburi(*), utilizator_roluri_multicont(rol_denumire)').maybeSingle();
            if (error) throw error;
            if (!data) throw new Error("Nu s-au putut prelua datele actualizate. Verificați permisiunile.");

            const updatedRoles = (data.utilizator_roluri_multicont || []).map((r: any) => ({ nume: r.rol_denumire })).filter(Boolean);
            const updatedSportiv = { ...data, roluri: updatedRoles };
            delete (updatedSportiv as any).utilizator_roluri_multicont;

            setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedSportiv : s));
            showSuccess("Succes", "Profilul a fost actualizat.");
            return { success: true, data: updatedSportiv };
        } catch (err: any) {
            if (err.message && (err.message.includes('duplicate key value violates unique constraint') || err.message.includes('unique_sportiv_phi_hau'))) {
                showError("Eroare Duplicat", "Un sportiv cu același nume, prenume și dată de naștere există deja în sistem.");
            } else {
                showError("Eroare la Salvare", err.message);
            }
            return { success: false, error: err };
        }
    };

    const handleDeactivate = async () => {
        if (!supabase) return;
        const { error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportiv.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, status: 'Inactiv'} : s)); showSuccess("Succes", "Sportivul a fost marcat ca inactiv."); }
    };

    const handleDelete = async () => {
        if (!supabase) return;
        const { error } = await supabase.from('sportivi').delete().eq('id', sportiv.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.filter(s => s.id !== sportiv.id)); onBack(); showSuccess("Succes", "Sportivul a fost șters definitiv."); }
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

    const handleSavePlataEdit = async (editedPlata: Plata) => {
        if (!supabase) return;
        setIsSaving(true);
        const { id, ...updates } = editedPlata;
        const { data, error } = await supabase.from('plati').update(updates).eq('id', id).select().maybeSingle();
        setIsSaving(false);
        if (error) {
            showError("Eroare la Salvare", error.message || error);
        } else if (!data) {
            showError("Eroare la Salvare", "Nu s-a putut actualiza factura. Verificați permisiunile.");
        } else {
            setPlati(prev => prev.map(p => p.id === id ? data : p));
            setPlataToEdit(null);
            showSuccess("Succes", "Factura a fost actualizată.");
        }
    };

    const confirmDeletePlata = async (id: string) => {
        if (!supabase) return;
        setIsDeleting(true);
        const { data: tranzactiiData, error: tranzactiiError } = await supabase.from('tranzactii').select('id, plata_ids').contains('plata_ids', [id]);
        if (tranzactiiError) { showError("Eroare la Verificare", tranzactiiError); setIsDeleting(false); return; }
        if (tranzactiiData && tranzactiiData.length > 0) {
            showError("Ștergere Blocată", "Această factură este parte dintr-o tranzacție și nu poate fi ștearsă. Anulați întâi tranzacția din Jurnalul de Încasări.");
            setIsDeleting(false);
            setPlataToDelete(null);
            return;
        }
        const { error } = await supabase.from('plati').delete().eq('id', id);
        setIsDeleting(false);
        if (error) {
            showError("Eroare la Ștergere", error);
        } else {
            setPlati(prev => prev.filter(p => p.id !== id));
            setPlataToDelete(null);
            showSuccess("Succes", "Factura a fost ștearsă.");
        }
    };

    const handleAccountCreated = () => {
        showSuccess("Succes!", "Pagina se va reîncărca pentru a reflecta noul cont.");
        setTimeout(() => window.location.reload(), 1500);
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Header */}
            <header 
                className="bg-[var(--bg-card)] p-6 rounded-xl shadow-lg border border-[var(--border-color)] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden"
                style={{ borderTop: `4px solid ${primaryColor}` }}
            >
                <div className="flex flex-col md:flex-row items-center gap-6 flex-grow z-10">
                    <div className="flex flex-col items-center">
                        <SportivAvatarEditor 
                            sportiv={sportiv} 
                            onUploadSuccess={(url) => {
                                setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, foto_url: url } : s));
                            }} 
                        />
                        <div className="mt-2 transform scale-110">
                            <GradBadge grad={currentGrad} isLarge />
                        </div>
                    </div>
                    <div className="text-center md:text-left space-y-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">{sportiv.nume} {sportiv.prenume}</h1>
                        <p className="text-lg text-slate-300 font-medium">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || 'Fără grupă'}</p>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                             <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${sportiv.status === 'Activ' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                {sportiv.status}
                            </span>
                            {sportiv.cod_sportiv && (
                                <span className="px-3 py-1 text-xs font-mono text-slate-400 bg-slate-800 rounded-full border border-slate-700">
                                    #{sportiv.cod_sportiv}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3 z-10">
                    <Button variant="secondary" onClick={() => setIsEditModalOpen(true)} className="shadow-sm hover:shadow-md transition-all">
                        <EditIcon className="w-4 h-4 mr-2"/> Editare
                    </Button>
                    <Button variant="primary" onClick={() => setIsWalletModalOpen(true)} className="shadow-sm hover:shadow-md transition-all bg-indigo-600 hover:bg-indigo-500 border-none">
                        <WalletIcon className="w-4 h-4 mr-2"/> Portofel
                    </Button>
                    {isSuperAdmin && (
                        <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="shadow-sm hover:shadow-md transition-all">
                            <TrashIcon className="w-4 h-4 mr-2"/> Șterge
                        </Button>
                    )}
                </div>
            </header>

            {/* Tabs Navigation */}
            <div className="flex overflow-x-auto gap-2 border-b border-slate-700 pb-1 mb-6">
                {[
                    { id: 'profil', label: 'Profil & Activitate', icon: UserCircleIcon },
                    { id: 'contact', label: 'Contact & Info', icon: ClipboardListIcon },
                    { id: 'grade', label: 'Evoluție & Grade', icon: TrophyIcon },
                    { id: 'financiar', label: 'Istoric Financiar', icon: BanknotesIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${
                            activeTab === tab.id 
                                ? `border-[${primaryColor}] text-white bg-slate-800/50` 
                                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                        }`}
                        style={{ borderColor: activeTab === tab.id ? primaryColor : 'transparent' }}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'profil' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Stats & Quick Info */}
                        <div className="space-y-6">
                            {!sportiv.user_id && (
                                <Card className="bg-amber-900/20 border-l-4 border-amber-500">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2 text-amber-400 font-bold">
                                            <ShieldCheckIcon className="w-5 h-5" />
                                            <h3>Cont Inactiv</h3>
                                        </div>
                                        <p className="text-sm text-amber-200/80">Acest sportiv nu are acces la aplicație.</p>
                                        <Button 
                                            size="sm" 
                                            className="w-full bg-amber-600 hover:bg-amber-500 text-white border-none"
                                            onClick={() => {
                                                if (!sportiv.email) {
                                                    showError("Email Lipsă", "Introduceți o adresă de email în profilul sportivului.");
                                                    return;
                                                }
                                                setIsCreateAccountModalOpen(true);
                                            }}
                                            disabled={!sportiv.email}
                                        >
                                            <UserPlusIcon className="w-4 h-4 mr-2" /> Generează Cont
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            <Card>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <ChartBarIcon className="w-5 h-5 text-slate-400" />
                                    Statistici
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-slate-400 uppercase">Vârstă</p>
                                        <p className="text-xl font-bold text-white">{getAge(sportiv.data_nasterii)} ani</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-3 rounded-lg text-center">
                                        <p className="text-xs text-slate-400 uppercase">Vechime</p>
                                        <p className="text-xl font-bold text-white">{getAge(sportiv.data_inscrierii)} ani</p>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <AttendanceIndicator attendances={lastThreeAttendances} />
                            </Card>
                        </div>

                        {/* Right Column: Training & Feedback */}
                        <div className="lg:col-span-2 space-y-6">
                            <TrainingHistory sportivId={sportiv.id} antrenamente={antrenamente} grupe={grupe} />
                            
                            <Card>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <ClipboardListIcon className="w-5 h-5 text-slate-400" />
                                        Feedback & Obiective
                                    </h3>
                                    {!isEditingFeedback && (
                                        <Button size="sm" variant="secondary" onClick={() => setIsEditingFeedback(true)}>
                                            <EditIcon className="w-4 h-4 mr-1"/> Editează
                                        </Button>
                                    )}
                                </div>
                                
                                {isEditingFeedback ? (
                                    <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                        <Input label="Puncte Forte" value={feedbackData.puncte_forte} onChange={(e) => setFeedbackData(p=>({...p, puncte_forte: e.target.value}))}/>
                                        <Input label="Puncte Slabe" value={feedbackData.puncte_slabe} onChange={(e) => setFeedbackData(p=>({...p, puncte_slabe: e.target.value}))}/>
                                        <Input label="Obiective" value={feedbackData.obiective} onChange={(e) => setFeedbackData(p=>({...p, obiective: e.target.value}))}/>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button size="sm" variant="secondary" onClick={()=>setIsEditingFeedback(false)}>Anulează</Button>
                                            <Button size="sm" variant="success" onClick={handleSaveFeedback} isLoading={isSavingFeedback}>Salvează Modificări</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-emerald-900/20 p-4 rounded-lg border border-emerald-500/20">
                                            <h4 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wider">Puncte Forte</h4>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{sportiv.puncte_forte || 'Nespecificat'}</p>
                                        </div>
                                        <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/20">
                                            <h4 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Puncte Slabe</h4>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{sportiv.puncte_slabe || 'Nespecificat'}</p>
                                        </div>
                                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/20">
                                            <h4 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wider">Obiective</h4>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{sportiv.obiective || 'Nespecificat'}</p>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <Button onClick={() => setIsReportModalOpen(true)} variant="secondary" size="sm" className="w-full md:w-auto">
                                        <ChartBarIcon className="w-4 h-4 mr-2" /> Generează Raport Detaliat
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === 'contact' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="text-lg font-bold text-white mb-4">Informații Personale</h3>
                            <dl className="space-y-4 divide-y divide-slate-700">
                                <div className="pt-2"><DataField label="CNP" value={sportiv.cnp} /></div>
                                <div className="pt-2"><DataField label="Data Nașterii" value={new Date(sportiv.data_nasterii).toLocaleDateString('ro-RO')} /></div>
                                <div className="pt-2"><DataField label="Gen" value={sportiv.gen || 'Nespecificat'} /></div>
                                <div className="pt-2"><DataField label="Înălțime" value={sportiv.inaltime ? `${sportiv.inaltime} cm` : 'Nespecificat'} /></div>
                            </dl>
                        </Card>
                        <Card>
                            <h3 className="text-lg font-bold text-white mb-4">Contact & Adresă</h3>
                            <dl className="space-y-4 divide-y divide-slate-700">
                                <div className="pt-2"><DataField label="Email" value={sportiv.email} /></div>
                                <div className="pt-2"><DataField label="Telefon" value={sportiv.telefon} /></div>
                                <div className="pt-2"><DataField label="Adresă" value={sportiv.adresa} /></div>
                                <div className="pt-2"><DataField label="Club" value={sportiv.cluburi?.nume} /></div>
                            </dl>
                            {isSuperAdmin && (
                                <div className="mt-6 pt-4 border-t border-slate-700">
                                    <Button onClick={() => setIsTransferModalOpen(true)} variant="secondary" className="w-full">
                                        <TransferIcon className="w-4 h-4 mr-2"/> Transferă la alt Club
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeTab === 'grade' && (
                    <div className="space-y-6">
                        <Card>
                            <h3 className="text-lg font-bold text-white mb-4">Evoluție în Timp</h3>
                            <SportivProgressChart data={chartData} themeColor={primaryColor} />
                        </Card>

                        <Card>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Istoric Examinări & Grade</h3>
                                <Button size="sm" variant="secondary" onClick={() => setIsAddGradeModalOpen(true)}>
                                    <PlusIcon className="w-4 h-4 mr-1"/> Adaugă Manual
                                </Button>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-slate-700">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-800 text-slate-400">
                                        <tr>
                                            <th className="p-3">Data</th>
                                            <th className="p-3">Grad</th>
                                            <th className="p-3">Sursă</th>
                                            <th className="p-3">Observații</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                                        {gradeHistory.length > 0 ? gradeHistory.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-3 font-medium text-white">{new Date(item.date).toLocaleDateString('ro-RO')}</td>
                                                <td className="p-3"><span className="font-bold text-amber-400">{item.rankName}</span></td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${item.source === 'examen' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>
                                                        {item.source === 'examen' ? 'Examen Oficial' : 'Acordat Manual'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-400 italic">-</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-500 italic">Nu există istoric înregistrat.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'financiar' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            <Card className="sticky top-4">
                                <h3 className="text-lg font-bold text-white mb-4">Sumar Financiar</h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                        <p className="text-sm text-slate-400">Total Restant</p>
                                        <p className={`text-3xl font-bold mt-1 ${totalRestante > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {totalRestante.toFixed(2)} <span className="text-sm text-slate-500 font-normal">RON</span>
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-slate-300">Abonament Activ</p>
                                        <div className="p-3 bg-slate-800 rounded border border-slate-700">
                                            {tipuriAbonament.find(t => t.id === sportiv.tip_abonament_id)?.denumire || 'Nespecificat'}
                                        </div>
                                    </div>

                                    {sportiv.familie_id && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-slate-300">Familie</p>
                                            <div className="p-3 bg-slate-800 rounded border border-slate-700 flex items-center gap-2">
                                                <UsersIcon className="w-4 h-4 text-slate-400" />
                                                {familii.find(f => f.id === sportiv.familie_id)?.nume || 'Familie'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-2">
                            <Card>
                                <h3 className="text-lg font-bold text-white mb-4">Istoric Facturi & Plăți</h3>
                                <div className="space-y-3">
                                    {!vizualizarePlati ? (
                                        <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                                    ) : possibleViewError ? (
                                        <div className="text-center p-6 bg-red-900/20 rounded-lg border border-red-900/50">
                                            <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                            <p className="text-red-300">Datele financiare sunt indisponibile.</p>
                                        </div>
                                    ) : istoricFacturi.length > 0 ? (
                                        istoricFacturi.map(({ detalii: p, totalIncasat }) => {
                                            if (!p.data_plata && !p.data_emitere) return null;
                                            const ramasDePlata = (p.suma_datorata || 0) - (totalIncasat || 0);
                                            const isPaid = p.status === 'Achitat';
                                            const isPartial = p.status === 'Achitat Parțial';

                                            return (
                                                <div key={p.plata_id} className="bg-slate-800/40 hover:bg-slate-800/80 transition-colors p-4 rounded-lg border border-slate-700/50 flex flex-col sm:flex-row justify-between gap-4">
                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                                            <p className="font-bold text-white text-lg">{p.descriere}</p>
                                                        </div>
                                                        <p className="text-sm text-slate-400 flex items-center gap-2">
                                                            <CalendarDaysIcon className="w-3 h-3" /> 
                                                            Emis: {new Date(p.data_emitere).toLocaleDateString('ro-RO')}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="text-right min-w-[120px]">
                                                        <p className={`font-bold text-xl ${isPaid ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-red-400'}`}>
                                                            {isPaid ? totalIncasat.toFixed(2) : ramasDePlata.toFixed(2)} RON
                                                        </p>
                                                        {!isPaid && (
                                                            <p className="text-xs text-slate-500">din {p.suma_datorata.toFixed(2)} RON</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                                                        <Button size="sm" variant="secondary" onClick={() => setPlataToEdit(plati.find(pl => pl.id === p.plata_id) || null)} title="Editează">
                                                            <EditIcon className="w-4 h-4"/>
                                                        </Button>
                                                        <Button size="sm" variant="danger" onClick={() => setPlataToDelete(plati.find(pl => pl.id === p.plata_id) || null)} title="Șterge">
                                                            <TrashIcon className="w-4 h-4"/>
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-10 text-slate-500">
                                            <BanknotesIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p>Nu există istoric financiar înregistrat.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isEditModalOpen && <SportivFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSave} sportivToEdit={sportiv} grupe={grupe} setGrupe={()=>{}} grade={grade} familii={familii} setFamilii={()=>{}} tipuriAbonament={tipuriAbonament} clubs={clubs} currentUser={currentUser} />}
            {isWalletModalOpen && <SportivWallet sportiv={sportiv} familie={familii.find(f => f.id === sportiv.familie_id)} allSportivi={sportivi} vizualizarePlati={vizualizarePlati} allPlati={plati} setPlati={setPlati} setTranzactii={setTranzactii} onClose={() => setIsWalletModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteAuditModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} sportiv={sportiv} onDeactivate={handleDeactivate} onDelete={handleDelete} />}
            {isReportModalOpen && <SportivFeedbackReport isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} sportiv={sportiv} antrenamente={antrenamente} grupe={grupe} grade={grade} participari={participari} examene={examene} />}
            {isTransferModalOpen && <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} sportiv={sportiv} clubs={clubs} onTransferComplete={(updatedSportiv) => { setSportivi(p => p.map(s => s.id === updatedSportiv.id ? updatedSportiv : s)); setIsTransferModalOpen(false); }} />}
            {isAddGradeModalOpen && <AddGradeModal isOpen={isAddGradeModalOpen} onClose={() => setIsAddGradeModalOpen(false)} onSave={handleAddGrade} sportiv={sportiv} grades={grade} />}
            {isCreateAccountModalOpen && <CreateAccountModal sportiv={sportiv} onClose={() => setIsCreateAccountModalOpen(false)} onAccountCreated={handleAccountCreated} />}
            <PlataEditModal plata={plataToEdit} onClose={() => setPlataToEdit(null)} onSave={handleSavePlataEdit} isLoading={isSaving} />
            <ConfirmDeleteModal isOpen={!!plataToDelete} onClose={() => setPlataToDelete(null)} onConfirm={() => { if(plataToDelete) confirmDeletePlata(plataToDelete.id) }} tableName="Factură" isLoading={isDeleting} />
        </div>
    );
};
