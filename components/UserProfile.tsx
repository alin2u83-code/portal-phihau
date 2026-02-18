import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, InscriereExamen, Examen, Grad, Antrenament, IstoricGrade, Plata, Familie, TipAbonament, Tranzactie, Reducere, Club, ProgramItem, Grupa, VizualizarePlata } from '../types';
import { Button, Card, Select, Modal, Input, RoleBadge } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon, ChartBarIcon, TransferIcon, CheckCircleIcon, ExclamationTriangleIcon, UserPlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { DeleteAuditModal } from './DeleteAuditModal';
import { SportivFeedbackReport } from './SportivFeedbackReport';
import { SportivProgressChart } from './SportivProgressChart';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { AddGradeModal } from './AddGradeModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { GradBadge } from '../utils/grades';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
const getAge = (dateString: string) => { if (!dateString) return 0; const today = new Date(); const birthDate = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00'); if (isNaN(birthDate.getTime())) { return 0; } let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

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
                .single();
            if (fetchError) throw fetchError;

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

    const { totalRestante, istoricFacturi } = useMemo(() => {
        if (!vizualizarePlati || !sportivi) return { totalRestante: 0, istoricFacturi: [] };

        const familyMemberIds = sportiv.familie_id
            ? new Set(sportivi.filter(s => s.familie_id === sportiv.familie_id).map(s => s.id))
            : new Set([sportiv.id]);

        const platiRelevante = vizualizarePlati.filter(p => {
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
        return new Set(plati.filter(p => (p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id))).map(p => p.id));
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
            const { data, error } = await supabase.from('sportivi').update(sportivData).eq('id', sportiv.id).select('*, cluburi(*), utilizator_roluri_multicont(rol_denumire)').single();
            if (error) throw error;

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
        const { error } = await supabase.from('sportivi').update({ status: 'Inactiv' }).eq('id', sportiv.id);
        if(error) showError("Eroare", error.message);
        else { setSportivi(prev => prev.map(s => s.id === sportiv.id ? { ...s, status: 'Inactiv'} : s)); showSuccess("Succes", "Sportivul a fost marcat ca inactiv."); }
    };

    const handleDelete = async () => {
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
        setIsSaving(true);
        const { id, ...updates } = editedPlata;
        const { data, error } = await supabase.from('plati').update(updates).eq('id', id).select().single();
        setIsSaving(false);
        if (error) {
            showError("Eroare la Salvare", error);
        } else {
            setPlati(prev => prev.map(p => p.id === id ? editedPlata : p));
            setPlataToEdit(null);
            showSuccess("Succes", "Factura a fost actualizată.");
        }
    };

    const confirmDeletePlata = async (id: string) => {
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
        <div className="space-y-4">
            <header className="bg-[var(--bg-card)] p-4 rounded-xl shadow-lg border border-[var(--border-color)] flex flex-col md:flex-row items-center gap-6">
                <div><GradBadge grad={currentGrad} isLarge /></div>
                <div className="text-center md:text-left flex-grow">
                    <h1 className="text-3xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h1>
                    <p className="text-lg text-slate-300">{grupe.find(g => g.id === sportiv.grupa_id)?.denumire || 'Fără grupă'}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="info" onClick={() => setIsEditModalOpen(true)} className="!py-2 !px-3"><EditIcon className="w-5 h-5 mr-2"/> Editare</Button>
                    <Button variant="primary" onClick={() => setIsWalletModalOpen(true)} className="!py-2 !px-3"><WalletIcon className="w-5 h-5 mr-2"/> Portofel</Button>
                    <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="!py-2 !px-3"><TrashIcon className="w-5 h-5 mr-2"/> Șterge</Button>
                </div>
            </header>

            {!sportiv.user_id && (
                <Card className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-300" />
                        <p className="font-semibold text-yellow-800 dark:text-yellow-200">Acest sportiv nu are un cont de utilizator activ.</p>
                    </div>
                    <div>
                        <Button 
                            variant="info" 
                            size="sm" 
                            onClick={() => {
                                if (!sportiv.email) {
                                    showError("Email Lipsă", "Introduceți o adresă de email în profilul sportivului pentru a putea genera contul.");
                                    return;
                                }
                                setIsCreateAccountModalOpen(true);
                            }}
                            disabled={!sportiv.email}
                            title={!sportiv.email ? 'Adăugați un email pentru a activa contul' : 'Activează contul de acces'}
                        >
                            <UserPlusIcon className="w-4 h-4 mr-2" /> Activează Acces Aplicație
                        </Button>
                        {!sportiv.email && (
                            <p className="text-xs text-yellow-400 text-center mt-1">
                                Lipsă email - nu se poate genera cont
                            </p>
                        )}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-4">
                    <Card><h3 className="text-lg font-bold text-white mb-3">Date Personale</h3><dl className="space-y-3"><DataField label="Vârstă" value={`${getAge(sportiv.data_nasterii)} ani`} /><DataField label="Data Înscrierii" value={new Date(sportiv.data_inscrierii).toLocaleDateString('ro-RO')} /><DataField label="Status" value={<span className={`px-2 py-0.5 text-xs rounded-full ${sportiv.status === 'Activ' ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>{sportiv.status}</span>} /><DataField label="Club" value={sportiv.cluburi?.id === FEDERATIE_ID ? FEDERATIE_NAME : sportiv.cluburi?.nume} /></dl>
                        {isSuperAdmin && <Button onClick={() => setIsTransferModalOpen(true)} variant="secondary" className="w-full mt-4"><TransferIcon className="w-4 h-4 mr-2"/> Transferă Sportiv</Button>}
                    </Card>
                    <Card><h3 className="text-lg font-bold text-white mb-3">Situație Financiară</h3>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-semibold text-slate-400">Total Restant:</span>
                            <span className={`text-2xl font-bold ${totalRestante > 0 ? 'text-red-400' : 'text-green-400'}`}>{((totalRestante || 0)).toFixed(2)} RON</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <h4 className="text-md font-bold text-slate-300 mb-2">Istoric Facturi</h4>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {possibleViewError ? (
                                    <div className="text-center p-4 bg-red-900/20 rounded-md">
                                        <p className="text-sm text-red-300">Datele financiare sunt indisponibile. Acest lucru se poate datora lipsei unui cont de utilizator activ.</p>
                                        <Button onClick={() => window.location.reload()} variant="secondary" size="sm" className="mt-2">Reîncarcă</Button>
                                    </div>
                                ) : istoricFacturi.length > 0 ? istoricFacturi.map(({ detalii: p, totalIncasat }) => {
                                    if (!p.data_plata && !p.data_emitere) return null;
                                    let amountDisplay; let amountColor; let originalAmount = null;
                                    const ramasDePlata = (p.suma_datorata || 0) - (totalIncasat || 0);
                                    if (p.status === 'Achitat') { amountDisplay = `${((totalIncasat || 0)).toFixed(2)} RON`; amountColor = 'text-green-400';
                                    } else if (p.status === 'Neachitat') { amountDisplay = `${((p.suma_datorata || 0)).toFixed(2)} RON`; amountColor = 'text-red-400';
                                    } else { amountDisplay = `${((ramasDePlata || 0)).toFixed(2)} RON`; amountColor = 'text-amber-400'; originalAmount = p.suma_datorata; }
                                    return (
                                        <div key={p.plata_id} className="text-xs bg-slate-800/50 p-2 rounded-md">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-grow"><p className="font-bold text-white">{p.descriere}</p><p className="text-slate-400">Emis: {new Date(p.data_emitere).toLocaleDateString('ro-RO')}</p></div>
                                                <div className="text-right flex-shrink-0"><p className={`font-bold text-sm ${amountColor}`}>{amountDisplay}</p>{originalAmount && <p className="text-xs text-slate-500 line-through">din {((originalAmount || 0)).toFixed(2)}</p>}</div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Button size="sm" variant="secondary" className="!p-1.5 h-auto" onClick={() => setPlataToEdit(plati.find(pl => pl.id === p.plata_id) || null)}><EditIcon className="w-3 h-3"/></Button>
                                                    <Button size="sm" variant="danger" className="!p-1.5 h-auto" onClick={() => setPlataToDelete(plati.find(pl => pl.id === p.plata_id) || null)}><TrashIcon className="w-3 h-3"/></Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : ( <p className="text-sm text-slate-500 italic text-center py-4">Nu există tranzacții înregistrate pentru acest sportiv.</p> )}
                            </div>
                        </div>
                    </Card>
                    <Card><AttendanceIndicator attendances={lastThreeAttendances} /></Card>
                    <Card><h3 className="text-lg font-bold text-white mb-3">Feedback Instructor</h3>
                        {isEditingFeedback ? <div className="space-y-3"><Input label="Puncte Forte" name="puncte_forte" value={feedbackData.puncte_forte} onChange={(e) => setFeedbackData(p=>({...p, puncte_forte: e.target.value}))}/><Input label="Puncte Slabe" name="puncte_slabe" value={feedbackData.puncte_slabe} onChange={(e) => setFeedbackData(p=>({...p, puncte_slabe: e.target.value}))}/><Input label="Obiective" name="obiective" value={feedbackData.obiective} onChange={(e) => setFeedbackData(p=>({...p, obiective: e.target.value}))}/><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={()=>setIsEditingFeedback(false)}>Anulează</Button><Button size="sm" variant="success" onClick={handleSaveFeedback} isLoading={isSavingFeedback}>Salvează</Button></div></div>
                        : <><dl className="space-y-3"><DataField label="Puncte Forte" value={sportiv.puncte_forte} /><DataField label="Puncte Slabe" value={sportiv.puncte_slabe} /><DataField label="Obiective" value={sportiv.obiective} /></dl><Button size="sm" variant="secondary" className="w-full mt-3" onClick={() => setIsEditingFeedback(true)}><EditIcon className="w-4 h-4 mr-1"/> Editează Feedback</Button></>}
                    </Card>
                    <Button onClick={() => setIsReportModalOpen(true)} className="w-full"><ChartBarIcon className="w-5 h-5 mr-2" /> Generează Raport Feedback</Button>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <Card><h3 className="text-lg font-bold text-white mb-3">Progres Tehnic</h3><SportivProgressChart sportiv={sportiv} gradeHistory={gradeHistory} antrenamente={antrenamente} grade={grade} /></Card>
                    <Card><div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">Istoric Grade</h3><Button size="sm" variant="secondary" onClick={() => setIsAddGradeModalOpen(true)}><PlusIcon className="w-4 h-4 mr-1"/> Adaugă Manual</Button></div>
                        <div className="mt-3 max-h-60 overflow-y-auto pr-2">
                             <table className="w-full text-left text-sm">
                                <thead className="text-slate-400 text-xs uppercase sticky top-0 bg-[var(--bg-card)]">
                                    <tr><th className="py-2">Grad</th><th className="py-2">Data</th><th className="py-2 text-right">Sursă</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">{[...gradeHistory].reverse().map(h => ( <tr key={`${h.date}-${h.rank}`}><td className="py-2 font-semibold text-white">{h.gradNume}</td><td className="py-2">{new Date(h.date).toLocaleDateString('ro-RO')}</td><td className="py-2 text-right capitalize">{h.source}</td></tr> ))}</tbody>
                            </table>
                        </div>
                    </Card>
                    <ProgramAntrenament grupaId={sportiv.grupa_id} grupe={grupe} />
                </div>
            </div>
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
