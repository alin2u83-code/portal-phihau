import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, User, Rol, Participare, Examen, Grad, Antrenament, Plata, Familie, TipAbonament, Tranzactie, Reducere } from '../types';
import { Button, Card, Select } from './ui';
import { ArrowLeftIcon, EditIcon, WalletIcon, TrashIcon, ShieldCheckIcon, PlusIcon, ChartBarIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { SportivFormModal } from './Sportivi';
import { SportivWallet } from './SportivWallet';
import { DeleteAuditModal } from './DeleteAuditModal';
import { SportivFeedbackReport } from './SportivFeedbackReport';
import { SportivProgressChart } from './SportivProgressChart';

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
}

export const UserProfile: React.FC<UserProfileProps> = ({ sportiv, currentUser, participari, examene, grade, antrenamente, plati, tranzactii, reduceri, grupe, familii, tipuriAbonament, allRoles, setSportivi, setPlati, setTranzactii, onBack }) => {
    const { showError, showSuccess } = useError();
    
    // State for modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // State for role editing
    const [isEditingRoles, setIsEditingRoles] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(sportiv.roluri.map(r => r.id));
    
    // State for financial history filter
    const [financialFilter, setFinancialFilter] = useState<'Toate' | 'Abonament' | 'Taxa Examen' | 'Echipament'>('Toate');

    useEffect(() => {
        setSelectedRoleIds(sportiv.roluri.map(r => r.id));
    }, [sportiv]);

    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin');

    const sportivParticipari = useMemo(() => participari.filter(p => p.sportiv_id === sportiv.id), [participari, sportiv.id]);
    
    const sortedSportivParticipariForDisplay = useMemo(() => {
        return [...sportivParticipari]
            .map(p => ({...p, examen: examene.find(e => e.id === p.examen_id)}))
            .sort((a, b) => new Date(b.examen?.data || 0).getTime() - new Date(a.examen?.data || 0).getTime());
    }, [sportivParticipari, examene]);

    const admittedParticipations = useMemo(() => sortedSportivParticipariForDisplay.filter(p => p.rezultat === 'Admis'), [sortedSportivParticipariForDisplay]);
    
    const currentGrad = useMemo(() => getGrad(admittedParticipations[0]?.grad_sustinut_id, grade), [admittedParticipations, grade]);
    const currentGradParticipationId = admittedParticipations.length > 0 ? admittedParticipations[0].id : null;

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
    
    const { sold, financialHistory } = useMemo(() => {
        const relevantPlati = plati.filter(p => p.sportiv_id === sportiv.id || (p.familie_id && p.familie_id === sportiv.familie_id));
        const relevantTranzactii = tranzactii.filter(t => t.sportiv_id === sportiv.id || (t.familie_id && t.familie_id === sportiv.familie_id));
        
        const totalDatorii = relevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = relevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        const currentSold = totalIncasari - totalDatorii;

        let historyItems = relevantPlati.map(plata => {
            let paymentDate: string | null = null;
            if (plata.status === 'Achitat' || plata.status === 'Achitat Parțial') {
                const payingTransaction = tranzactii.find(t => t.plata_ids?.includes(plata.id));
                if (payingTransaction) {
                    paymentDate = payingTransaction.data_platii;
                }
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
        }).sort((a,b) => new Date(b.facturaDate).getTime() - new Date(a.facturaDate).getTime());

        if (financialFilter !== 'Toate') {
            historyItems = historyItems.filter(item => item.type === financialFilter);
        }
        
        return { sold: currentSold, financialHistory: historyItems };
    }, [sportiv, plati, tranzactii, financialFilter, reduceri]);


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
                    <div className="flex gap-2 self-end sm:self-center flex-wrap">
                        <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}><ChartBarIcon className="w-4 h-4 mr-2"/> Raport Activitate</Button>
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}><EditIcon className="w-4 h-4 mr-2"/> Editează</Button>
                        <Button variant="info" onClick={() => setIsWalletModalOpen(true)}><WalletIcon className="w-4 h-4 mr-2"/> Portofel</Button>
                        <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}><TrashIcon className="w-4 h-4 mr-2"/> Șterge</Button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Evoluție & Progres</h3>
                <SportivProgressChart
                    sportiv={sportiv}
                    participari={participari}
                    examene={examene}
                    grade={grade}
                    antrenamente={antrenamente}
                />
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

             <Card className="lg:col-span-2 p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-white">Istoric Financiar Detaliat</h3>
                        <p className={`text-sm font-bold ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Sold Curent: {sold.toFixed(2)} RON {sold >= 0 ? '(Credit)' : '(Datorie)'}
                        </p>
                    </div>
                    <div className="flex gap-1 bg-slate-800 p-1 rounded-md">
                        {(['Toate', 'Abonament', 'Taxa Examen', 'Echipament'] as const).map(filter => (
                            <Button key={filter} size="sm" variant={financialFilter === filter ? 'primary' : 'secondary'} onClick={() => setFinancialFilter(filter)} className="!py-1 !text-xs">
                                {filter}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th className="p-3">Data Factură</th>
                                <th className="p-3">Descriere</th>
                                <th className="p-3 text-right">Sumă</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3">Data Încasare</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {financialHistory.map(item => (
                                <tr key={item.id}>
                                    <td className="p-2">{new Date(item.facturaDate).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-2">{item.description}</td>
                                    <td className="p-2 text-right font-semibold">
                                        {item.initialAmount && item.initialAmount > item.amount ? (
                                            <div className="text-right">
                                                <span>{item.amount.toFixed(2)} lei</span>
                                                <div className="text-xs text-slate-400 font-normal leading-tight">
                                                    ({item.initialAmount.toFixed(2)} - {item.discount})
                                                </div>
                                            </div>
                                        ) : (
                                            <span>{item.amount.toFixed(2)} lei</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            item.status === 'Achitat' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                            item.status === 'Achitat Parțial' ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 
                                            'bg-red-600/20 text-red-400 border-red-600/50'
                                        }`}>{item.status}</span>
                                    </td>
                                    <td className="p-2">
                                        {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('ro-RO') : (
                                            <span className="text-xs text-slate-500 italic">În așteptare</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {financialHistory.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500 italic">Niciun istoric pentru filtrul selectat.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="p-0"><div className="p-4 bg-slate-700/50"><h3 className="font-bold text-white">Istoric Examinări</h3></div><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-800/50 text-xs uppercase text-slate-400"><tr><th className="p-3">Data</th><th className="p-3">Grad Susținut</th><th className="p-3">Rezultat</th></tr></thead><tbody className="divide-y divide-slate-700">{sortedSportivParticipariForDisplay.map(p => {
                    const isCurrentGradRow = p.id === currentGradParticipationId;
                    return (
                        <tr key={p.id} className={isCurrentGradRow ? 'bg-brand-primary font-bold' : ''}>
                            <td className="p-2">{p.examen?.data}</td>
                            <td className={`p-2 ${isCurrentGradRow ? 'text-brand-secondary' : 'font-semibold'}`}>
                                {grade.find(g => g.id === p.grad_sustinut_id)?.nume}
                                {isCurrentGradRow && <span className="ml-2 text-xs uppercase">(CURENT)</span>}
                            </td>
                            <td className={`p-2 font-bold ${p.rezultat === 'Admis' ? 'text-green-400' : 'text-red-400'}`}>{p.rezultat}</td>
                        </tr>
                    );
                })}</tbody></table></div></Card>

            <SportivFormModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveSportiv} sportivToEdit={sportiv} grupe={grupe} setGrupe={()=>{}} familii={familii} setFamilii={()=>{}} tipuriAbonament={tipuriAbonament} />
            {isWalletModalOpen && <SportivWallet sportiv={sportiv} familie={familii.find(f => f.id === sportiv.familie_id)} allPlati={plati} allTranzactii={tranzactii} setTranzactii={setTranzactii} onClose={() => setIsWalletModalOpen(false)} />}
            {isDeleteModalOpen && <DeleteAuditModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} sportiv={sportiv} onDeactivate={handleDeactivate} onDelete={handleDelete} />}
            {isReportModalOpen && <SportivFeedbackReport isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} sportiv={sportiv} antrenamente={antrenamente} grupe={grupe} grade={grade} participari={participari} examene={examene} />}
        </div>
    );
};