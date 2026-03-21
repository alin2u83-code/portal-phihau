import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, InscriereExamen, Examen, Grad, Antrenament, IstoricGrade, Plata, Familie, TipAbonament, Tranzactie, Reducere, Club, Grupa, VizualizarePlata } from '../types';
import { Button, Card, Select, Modal, Input, RoleBadge, Skeleton } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon, ChartBarIcon, TransferIcon, CheckCircleIcon, ExclamationTriangleIcon, UserPlusIcon, UserCircleIcon, ClipboardListIcon, TrophyIcon, BanknotesIcon, CalendarDaysIcon, UsersIcon, CheckIcon, XIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi/SportivFormModal';
import { SportivWallet } from './Sportivi/SportivWallet';
import { DeleteAuditModal } from './Sportivi/DeleteAuditModal';
import { SportivFeedbackReport } from './SportivFeedbackReport';
import { SportivProgressChart, ChartDataPoint } from './SportivProgressChart';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';
import { AddGradeModal } from './AddGradeModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { GradBadge } from '../utils/grades';
import { SportivAvatarEditor } from './SportivAvatarEditor';
import { useData } from '../contexts/DataContext';

import { AttendanceIndicator } from './UserProfile/AttendanceIndicator';
import { TransferModal } from './UserProfile/TransferModal';
import { PlataEditModal } from './UserProfile/PlataEditModal';
import { CreateAccountModal } from './UserProfile/CreateAccountModal';
import { TrainingHistory } from './UserProfile/TrainingHistory';
import { DataField } from './UserProfile/DataField';

import { ProfilTab } from './UserProfile/ProfilTab';
import { ContactTab } from './UserProfile/ContactTab';
import { GradeTab } from './UserProfile/GradeTab';
import { FinanciarTab } from './UserProfile/FinanciarTab';

const getGrad = (gradId: string | null, allGrades: Grad[]) => gradId ? allGrades.find(g => g.id === gradId) : null;
import { getAge } from '../utils/date';
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

interface UserProfileProps {
    sportiv: Sportiv;
    onBack: () => void;
    onNavigate?: (view: import('../types').View) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ sportiv, onBack, onNavigate }) => {
    const {
        currentUser,
        setIstoricGrade,
        setSportivi,
        setPlati,
        setTranzactii,
        clubs,
        allRoles,
        filteredData
    } = useData();
    
    const participari = filteredData.inscrieriExamene;
    const examene = filteredData.sesiuniExamene;
    const grade = useData().grade;
    const istoricGrade = filteredData.istoricGrade;
    const antrenamente = filteredData.antrenamente;
    const plati = filteredData.plati;
    const tranzactii = filteredData.tranzactii;
    const reduceri = filteredData.reduceri;
    const grupe = filteredData.grupe;
    const familii = filteredData.familii;
    const tipuriAbonament = filteredData.tipuriAbonament;
    const vizualizarePlati = filteredData.vizualizarePlati;
    const sportivi = filteredData.sportivi;
    
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
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);

    useEffect(() => {
        setFeedbackData({
            puncte_forte: sportiv.puncte_forte || '',
            puncte_slabe: sportiv.puncte_slabe || '',
            obiective: sportiv.obiective || '',
        });
    }, [sportiv]);

    const isSuperAdmin = currentUser.roluri.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'ADMIN');
    const isClubAdmin = currentUser.roluri.some(r => r.nume === 'ADMIN_CLUB');
    const canViewSensitiveInfo = useMemo(() => {
        return currentUser.roluri.some(r => 
            ['SUPER_ADMIN_FEDERATIE', 'ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR'].includes(r.nume)
        );
    }, [currentUser.roluri]);

    const gradeHistory = useMemo(() => {
        if (!participari || !grade || !examene || !istoricGrade) return [];

        const examGrades = (participari || [])
            .filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis')
            .map(p => {
                const examen = (examene || []).find(e => e.id === p.sesiune_id);
                const grad = (grade || []).find(g => g.id === p.grad_sustinut_id);
                if (!examen || !grad) return null;
                return {
                    source: 'examen',
                    date: new Date((examen.data || '').toString().slice(0, 10)).getTime(),
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
                    date: new Date((hg.data_obtinere || '').toString().slice(0, 10)).getTime(),
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
            istoricFacturi: facturiProcesate.sort((a, b) => new Date((b.detalii.data_emitere || '').toString().slice(0, 10)).getTime() - new Date((a.detalii.data_emitere || '').toString().slice(0, 10)).getTime())
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
                const trainingDate = new Date(`${(a.data || '').toString().slice(0, 10)}T${a.ora_start || '00:00'}`);
                if (trainingDate > now) return false;
                
                const isInGroup = a.grupa_id === sportiv.grupa_id;
                const isVacationTraining = sportiv.participa_vacanta && a.grupa_id === null;
                
                return isInGroup || isVacationTraining;
            })
            .sort((a, b) => new Date(`${(b.data || '').toString().slice(0, 10)}T${b.ora_start || '00:00'}`).getTime() - new Date(`${(a.data || '').toString().slice(0, 10)}T${a.ora_start || '00:00'}`).getTime())
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
            }).select().maybeSingle();
            if (error) throw error;
            if (newGradeHistory) {
                setIstoricGrade(prev => [...prev, newGradeHistory]);
                showSuccess("Succes", "Gradul a fost adăugat în istoric.");
                setIsAddGradeModalOpen(false);
            }
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

    const handleApproveName = async () => {
        if (!supabase) return;
        setIsApproving(true);
        try {
            const { error } = await supabase.rpc('aproba_modificare_sportiv', { p_sportiv_id: sportiv.id });
            if (error) throw error;
            
            const updatedSportiv = {
                ...sportiv,
                nume: sportiv.propunere_modificare?.nume || sportiv.nume,
                prenume: sportiv.propunere_modificare?.prenume || sportiv.prenume,
                status_aprobare: 'aprobat' as const,
                propunere_modificare: null
            };
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedSportiv : s));
            showSuccess("Aprobat", "Modificarea numelui a fost aprobată.");
        } catch (err: any) {
            showError("Eroare", err.message);
        } finally {
            setIsApproving(false);
        }
    };

    const handleRejectName = async () => {
        if (!supabase) return;
        setIsRejecting(true);
        try {
            const { error } = await supabase
                .from('sportivi')
                .update({ 
                    status_aprobare: 'respins',
                    propunere_modificare: null 
                })
                .eq('id', sportiv.id);
                
            if (error) throw error;
            
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? { 
                ...s, 
                status_aprobare: 'respins', 
                propunere_modificare: null 
            } : s));
            showSuccess("Respins", "Modificarea numelui a fost respinsă.");
        } catch (err: any) {
            showError("Eroare", err.message);
        } finally {
            setIsRejecting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-slate-800"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Management Sportivi</span>
            </button>

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
                        {canViewSensitiveInfo && (
                            <div className="mt-2 transform scale-110">
                                <GradBadge grad={currentGrad} isLarge />
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left space-y-1">
                        {sportiv.status_aprobare === 'asteptare' && sportiv.propunere_modificare ? (
                            <div className="space-y-2 mb-2">
                                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                                    <h1 className="text-xl md:text-2xl font-bold text-slate-500 line-through decoration-red-500/50 decoration-2">
                                        {sportiv.nume} {sportiv.prenume}
                                    </h1>
                                    <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                                        <h1 className="text-2xl md:text-3xl font-bold text-amber-400 tracking-tight italic">
                                            {sportiv.propunere_modificare.nume || sportiv.nume} {sportiv.propunere_modificare.prenume || sportiv.prenume}
                                        </h1>
                                        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-900 rounded uppercase tracking-wider">
                                            În așteptare
                                        </span>
                                    </div>
                                </div>
                                
                                {isClubAdmin && (
                                    <div className="flex items-center justify-center md:justify-start gap-2 animate-fade-in">
                                        <Button 
                                            size="sm" 
                                            variant="success" 
                                            onClick={handleApproveName}
                                            isLoading={isApproving}
                                            className="h-8 text-xs"
                                        >
                                            <CheckIcon className="w-3 h-3 mr-1" /> Aprobă Nume
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="danger" 
                                            onClick={handleRejectName}
                                            isLoading={isRejecting}
                                            className="h-8 text-xs"
                                        >
                                            <XIcon className="w-3 h-3 mr-1" /> Respinge
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <h1 className="text-3xl font-bold text-white tracking-tight">{sportiv.nume} {sportiv.prenume}</h1>
                        )}
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
                    {onNavigate && (
                        <>
                            <Button variant="secondary" onClick={() => onNavigate('plati-scadente')} className="shadow-sm hover:shadow-md transition-all" title="Vezi plățile acestui sportiv">
                                <BanknotesIcon className="w-4 h-4 mr-2"/> Plăți
                            </Button>
                            <Button variant="secondary" onClick={() => onNavigate('examene')} className="shadow-sm hover:shadow-md transition-all" title="Vezi examenele acestui sportiv">
                                <TrophyIcon className="w-4 h-4 mr-2"/> Examene
                            </Button>
                        </>
                    )}
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
                    { id: 'grade', label: 'Evoluție & Grade', icon: TrophyIcon, hidden: !canViewSensitiveInfo },
                    { id: 'financiar', label: 'Istoric Financiar', icon: BanknotesIcon },
                ].filter(tab => !tab.hidden).map(tab => (
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
                    <ProfilTab
                        sportiv={sportiv}
                        grupe={grupe}
                        antrenamente={antrenamente}
                        canViewSensitiveInfo={canViewSensitiveInfo}
                        lastThreeAttendances={lastThreeAttendances}
                        isEditingFeedback={isEditingFeedback}
                        setIsEditingFeedback={setIsEditingFeedback}
                        feedbackData={feedbackData}
                        setFeedbackData={setFeedbackData}
                        handleSaveFeedback={handleSaveFeedback}
                        isSavingFeedback={isSavingFeedback}
                        setIsCreateAccountModalOpen={setIsCreateAccountModalOpen}
                        setIsReportModalOpen={setIsReportModalOpen}
                        getAge={getAge}
                    />
                )}

                {activeTab === 'contact' && (
                    <ContactTab
                        sportiv={sportiv}
                        isSuperAdmin={isSuperAdmin}
                        setIsTransferModalOpen={setIsTransferModalOpen}
                    />
                )}

                {activeTab === 'grade' && (
                    <GradeTab
                        chartData={chartData}
                        primaryColor={primaryColor}
                        setIsAddGradeModalOpen={setIsAddGradeModalOpen}
                        gradeHistory={gradeHistory}
                        sportiv={sportiv}
                        participari={participari}
                        examene={examene}
                        grade={grade}
                    />
                )}

                {activeTab === 'financiar' && (
                    <FinanciarTab
                        totalRestante={totalRestante}
                        tipuriAbonament={tipuriAbonament}
                        sportiv={sportiv}
                        familii={familii}
                        vizualizarePlati={vizualizarePlati}
                        possibleViewError={possibleViewError}
                        istoricFacturi={istoricFacturi}
                        setPlataToEdit={setPlataToEdit}
                        plati={plati}
                        setPlataToDelete={setPlataToDelete}
                    />
                )}
            </div>

            {/* Modals */}
            {isEditModalOpen && <SportivFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSave} sportivToEdit={sportiv} grupe={grupe} setGrupe={()=>{}} grade={grade} familii={familii} setFamilii={()=>{}} tipuriAbonament={tipuriAbonament} clubs={clubs} currentUser={currentUser} allRoles={allRoles} />}
            {isWalletModalOpen && <SportivWallet sportiv={sportiv} familie={familii.find(f => f.id === sportiv.familie_id)} allSportivi={sportivi} vizualizarePlati={vizualizarePlati} allPlati={plati} setPlati={setPlati} setTranzactii={setTranzactii} onClose={() => setIsWalletModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteAuditModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} sportiv={sportiv} onDeactivate={handleDeactivate} onDelete={handleDelete} />}
            {isReportModalOpen && <SportivFeedbackReport isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} sportiv={sportiv} antrenamente={antrenamente} grupe={grupe} grade={grade} participari={participari} examene={examene} />}
            {isTransferModalOpen && <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} sportiv={sportiv} clubs={clubs} onTransferComplete={(updatedSportiv) => { setSportivi(p => p.map(s => s.id === updatedSportiv.id ? updatedSportiv : s)); setIsTransferModalOpen(false); }} />}
            {isAddGradeModalOpen && <AddGradeModal isOpen={isAddGradeModalOpen} onClose={() => setIsAddGradeModalOpen(false)} onSave={handleAddGrade} sportiv={sportiv} grades={grade} />}
            {isCreateAccountModalOpen && <CreateAccountModal sportiv={sportiv} onClose={() => setIsCreateAccountModalOpen(false)} onAccountCreated={handleAccountCreated} currentUser={currentUser} allRoles={allRoles} />}
            <PlataEditModal plata={plataToEdit} onClose={() => setPlataToEdit(null)} onSave={handleSavePlataEdit} isLoading={isSaving} />
            <ConfirmDeleteModal isOpen={!!plataToDelete} onClose={() => setPlataToDelete(null)} onConfirm={() => { if(plataToDelete) confirmDeletePlata(plataToDelete.id) }} tableName="Factură" isLoading={isDeleting} />
        </div>
    );
};
