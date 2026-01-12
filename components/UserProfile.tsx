import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, Participare, Examen, Grad, Antrenament, Plata, Familie, TipAbonament } from '../types';
import { Button, Card, Select } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { DeleteAuditModal } from './DeleteAuditModal';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);
const getAge = (dateString: string) => { const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } return age; };
const parseDurationToMonths = (durationStr: string): number => { const parts = durationStr.split(' '); if (parts.length < 2) return 0; const value = parseInt(parts[0], 10); const unit = parts[1].toLowerCase(); if (unit.startsWith('lun')) return value; if (unit.startsWith('an')) return value * 12; return 0; };

const DataField: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-sm font-medium text-slate-400">{label}</dt>
        <dd className="mt-1 text-md text-white font-semibold">{value || 'N/A'}</dd>
    </div>
);

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    const colorClasses: Record<Rol['nume'], string> = { Admin: 'bg-red-600 text-white', Instructor: 'bg-sky-600 text-white', Sportiv: 'bg-slate-600 text-slate-200' };
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
    grupe: any[];
    familii: Familie[];
    tipuriAbonament: TipAbonament[];
    allRoles: Rol[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setTranzactii: React.Dispatch<React.SetStateAction<any[]>>;
    onBack: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ sportiv, currentUser, participari, examene, grade, antrenamente, plati, grupe, familii, tipuriAbonament, allRoles, setSportivi, setPlati, setTranzactii, onBack }) => {
    const { showError, showSuccess } = useError();
    
    // State for modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // State for role editing
    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(sportiv.roluri.map(r => r.id));
    
    useEffect(() => {
        setSelectedRoleIds(sportiv.roluri.map(r => r.id));
    }, [sportiv]);

    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin');

    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === sportiv.id), [participari, sportiv.id]);
    const admittedParticipations = useMemo(() => sportivParticipari.filter(p => p.rezultat === 'Admis').map(p => ({ ...p, examen: examene.find(e => e.id === p.examen_id) })).sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime()), [sportivParticipari, examene]);
    const currentGrad = useMemo(() => getGrad(admittedParticipations[0]?.grad_sustinut_id, grade), [admittedParticipations, grade]);

    const eligibility = useMemo(() => {
        const sortedGrades = [...grade].sort((a, b) => a.ordine - b.ordine);
        const nextGrad = currentGrad ? sortedGrades.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1) : sortedGrades[0];
        if (!nextGrad) return { eligible: false, message: "Ați atins gradul maxim.", nextGrad: null };
        const age = getAge(sportiv.data_nasterii);
        if (age < nextGrad.varsta_minima) return { eligible: false, message: `Vârsta minimă: ${nextGrad.varsta_minima} ani (are ${age}).`, nextGrad };
        const lastExamDate = admittedParticipations[0]?.examen ? new Date(admittedParticipations[0].examen.data) : new Date(sportiv.data_inscrierii);
        const monthsToWait = parseDurationToMonths(nextGrad.timp_asteptare);
        const eligibilityDate = new Date(lastExamDate);
        eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
        if (new Date() < eligibilityDate) return { eligible: false, message: `Eligibil după: ${eligibilityDate.toLocaleDateString('ro-RO')}.`, nextGrad };
        return { eligible: true, message: "Eligibil pentru examinare.", nextGrad };
    }, [currentGrad, grade, sportiv, admittedParticipations]);
    
    const sportivPlati = useMemo(() => plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id)).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()), [plati, sportiv.id, sportiv.familie_id]);

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
        if (error) { showError("Eroare la salvare", error); return { success: false, error }; }
        if (data) {
             const updatedSportiv = { ...sportiv, ...data };
             setSportivi((prev: Sportiv[]) => prev.map(s => s.id === sportiv.id ? updatedSportiv : s));
        }
        return { success: true };
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

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Listă</Button>
            
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h1>
                        <p className="text-slate-400">Profil detaliat și istoric activitate</p>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}><EditIcon className="w-4 h-4 mr-2"/> Editează</Button>
                        <Button variant="info" onClick={() => setIsWalletModalOpen(true)}><WalletIcon className="w-4 h-4 mr-2"/> Portofel</Button>
                        <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}><TrashIcon className="w-4 h-4 mr-2"/> Șterge</Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><h3 className="text-lg font-bold text-white mb-2">Date Personale</h3><div className="space-y-2 text-sm"><DataField label="Vârstă" value={`${getAge(sportiv.data_nasterii)} ani`} /><DataField label="Grupă" value={grupe.find(g => g.id === sportiv.grupa_id)?.denumire} /><DataField label="Status" value={sportiv.status} /></div></Card>
                <Card><h3 className="text-lg font-bold text-white mb-2">Progres Grad</h3><div className="space-y-2 text-sm"><DataField label="Grad Actual" value={currentGrad?.nume || 'Începător'} /><DataField label="Următorul Grad" value={eligibility.nextGrad?.nume || 'Maxim'} /><p className={`text-xs mt-1 ${eligibility.eligible ? 'text-green-400' : 'text-yellow-400'}`}>{eligibility.message}</p></div></Card>
                <Card><h3 className="text-lg font-bold text-white mb-2">Activitate & Cont</h3><div className="space-y-2 text-sm"><DataField label="Prezențe lună curentă" value={`${antrenamente.filter(a => new Date(a.data).getMonth() === new Date().getMonth() && a.sportivi_prezenti_ids.includes(sportiv.id)).length} antrenamente`} /><DataField label="Cont de acces" value={sportiv.user_id ? "Activ" : "Inexistent"}/></div></Card>
            </div>
            
            {isAdmin && (
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5 text-amber-400"/> Setări Cont & Roluri</h3>
                    {!isEditingRoles ? (
                        <Button variant="secondary" size="sm" onClick={() => setIsEditingRoles(true)}>Modifică Roluri</Button>
                    ) : (
                        <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setIsEditingRoles(false); setSelectedRoleIds(sportiv.roluri.map(r => r.id)); }}>Anulează</Button><Button size="sm" variant="success" onClick={handleSaveRoles}>Salvează</Button></div>
                    )}
                </div>
                {isEditingRoles ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 bg-slate-900/50 rounded">
                        {allRoles.map(role => ( <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer"> <input type="checkbox" className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-brand-secondary focus:ring-brand-secondary" checked={selectedRoleIds.includes(role.id)} onChange={(e) => setSelectedRoleIds(p => e.target.checked ? [...p, role.id] : p.filter(id => id !== role.id))} disabled={sportiv.id === currentUser.id && role.nume === 'Admin'} /> <span>{role.nume}</span> </label> ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">{sportiv.roluri.length > 0 ? sportiv.roluri.map(r => <RoleBadge key={r.id} role={r}/>) : <span className="text-sm text-slate-400 italic">Niciun rol.</span>}</div>
                )}
            </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-0"><div className="p-4 bg-slate-700/50"><h3 className="font-bold text-white">Istoric Examinări</h3></div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-800/50 text-xs uppercase text-slate-400"><tr><th className="p-3">Data</th><th className="p-3">Grad Susținut</th><th className="p-3">Rezultat</th></tr></thead><tbody className="divide-y divide-slate-700">{sportivParticipari.map(p => <tr key={p.id}><td className="p-2">{examene.find(e=>e.id === p.examen_id)?.data}</td><td className="p-2 font-semibold">{grade.find(g=>g.id === p.grad_sustinut_id)?.nume}</td><td className={`p-2 font-bold ${p.rezultat === 'Admis' ? 'text-green-400' : 'text-red-400'}`}>{p.rezultat}</td></tr>)}</tbody></table></div></Card>
                <Card className="p-0"><div className="p-4 bg-slate-700/50"><h3 className="font-bold text-white">Istoric Financiar</h3></div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-800/50 text-xs uppercase text-slate-400"><tr><th className="p-3">Data</th><th className="p-3">Descriere</th><th className="p-3 text-right">Sumă</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-700">{sportivPlati.map(p => <tr key={p.id}><td className="p-2">{p.data}</td><td className="p-2">{p.descriere}</td><td className="p-2 font-semibold text-right">{p.suma.toFixed(2)}</td><td className={`p-2 font-bold ${p.status === 'Achitat' ? 'text-green-400' : 'text-red-400'}`}>{p.status}</td></tr>)}</tbody></table></div></Card>
            </div>

            <SportivFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveSportiv} sportivToEdit={sportiv} grupe={grupe} setGrupe={()=>{}} familii={familii} setFamilii={()=>{}} tipuriAbonament={tipuriAbonament} />
            {isWalletModalOpen && <SportivWallet sportiv={sportiv} familie={familii.find(f => f.id === sportiv.familie_id)} allPlati={plati} allTranzactii={[]} setTranzactii={setTranzactii} onClose={() => setIsWalletModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteAuditModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} sportiv={sportiv} onDeactivate={handleDeactivate} onDelete={handleDelete} />}
        </div>
    );
};
