import React, { useState, useEffect } from 'react';
import { Sportiv, Rol, User } from '../types';
import { Button, Card, Input, Select, Modal } from './ui';
import { ShieldCheckIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

const RoleBadge: React.FC<{ role: Rol, onRemove?: () => void, isRemovable?: boolean }> = ({ role, onRemove, isRemovable }) => {
    const colorClasses: Record<string, string> = {
        Admin: 'bg-red-600 text-white',
        Instructor: 'bg-sky-600 text-white',
        Sportiv: 'bg-slate-600 text-slate-200',
    };
    const color = colorClasses[role.nume] || 'bg-gray-500 text-white';

    return (
        <span className={`flex items-center gap-2 px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
            {role.nume}
            {isRemovable && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-1 text-white/70 hover:text-white font-bold leading-none"
                    aria-label={`Elimină rolul ${role.nume}`}
                >
                    &times;
                </button>
            )}
        </span>
    );
};

interface SportivAccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sportiv: Sportiv | null;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    currentUser: User;
}

export const SportivAccountSettingsModal: React.FC<SportivAccountSettingsModalProps> = ({ isOpen, onClose, sportiv, setSportivi, allRoles, setAllRoles, currentUser }) => {
    
    const { showError, showSuccess } = useError();
    
    // Common state
    const [loading, setLoading] = useState(false);
    
    // Edit state
    const [editForm, setEditForm] = useState({ email: '', username: '', parola: '', confirmParola: '' });
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [roleToAdd, setRoleToAdd] = useState('');
    
    // Create state
    const [createForm, setCreateForm] = useState({ email: '', username: '', parola: '' });
    const [creationStep, setCreationStep] = useState<'initial' | 'confirm_link'>('initial');

    // Add role state
    const [newRoleName, setNewRoleName] = useState('');

    const canEditRoles = currentUser.roluri.some(r => r.nume === 'Admin');
    const hasAccount = !!sportiv?.user_id;

    useEffect(() => {
        if (sportiv) {
            if (hasAccount) {
                setEditForm({ email: sportiv.email || '', username: sportiv.username || '', parola: '', confirmParola: '' });
                setSelectedRoleIds(sportiv.roluri.map(r => r.id));
            } else {
                const sanitize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
                const emailPrefix = `${sanitize(sportiv.nume)}.${sanitize(sportiv.prenume)}`;
                setCreateForm({ email: `${emailPrefix}@phihau.ro`, username: emailPrefix, parola: 'Parola123!' });
            }
            setCreationStep('initial');
        }
    }, [sportiv, hasAccount]);

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement>) => setCreateForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleRoleRemove = (roleId: string) => setSelectedRoleIds(p => p.filter(id => id !== roleId));
    const handleRoleAdd = () => { if (roleToAdd && !selectedRoleIds.includes(roleToAdd)) { setSelectedRoleIds(p => [...p, roleToAdd]); setRoleToAdd(''); }};

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !sportiv) return;
        if (!editForm.email) { showError("Validare Eșuată", "Utilizatorii cu un cont de acces trebuie să aibă o adresă de email."); return; }
        if (editForm.parola && editForm.parola !== editForm.confirmParola) { showError("Validare Eșuată", "Parolele nu se potrivesc."); return; }
        
        setLoading(true);
        
        try {
            if (editForm.parola) {
                const { error: rpcError } = await supabase.rpc('update_user_password', { user_id: sportiv.user_id, new_password: editForm.parola });
                if (rpcError) throw rpcError;
            }

            if (canEditRoles) {
                let finalRoleIds = [...selectedRoleIds];
                if (finalRoleIds.length === 0) {
                    const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                    if (sportivRole) finalRoleIds.push(sportivRole.id);
                }
                const { error: delErr } = await supabase.from('sportivi_roluri').delete().eq('sportiv_id', sportiv.id);
                if (delErr) throw delErr;
                if (finalRoleIds.length > 0) {
                    const { error: insErr } = await supabase.from('sportivi_roluri').insert(finalRoleIds.map(rol_id => ({ sportiv_id: sportiv.id, rol_id })));
                    if (insErr) throw insErr;
                }
            }
            
            const cleanedUsername = editForm.username.toLowerCase().replace(/\s/g, '');
            if (cleanedUsername && cleanedUsername !== sportiv.username) {
                const { data: existing, error: checkErr } = await supabase.from('sportivi').select('id').eq('username', cleanedUsername).not('id', 'eq', sportiv.id).limit(1);
                if (checkErr) throw checkErr;
                if (existing && existing.length > 0) throw new Error('Numele de utilizator este deja folosit.');
            }

            const updates = { username: cleanedUsername || null, email: editForm.email || null };
            const { data, error } = await supabase.from('sportivi').update(updates).eq('id', sportiv.id).select('*, sportivi_roluri(roluri(id, nume))').single();
            if (error) throw error;
            
            if (data) {
                const updatedUser = { ...data, roluri: data.sportivi_roluri.map((item: any) => item.roluri) } as Sportiv;
                setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
                showSuccess("Succes!", "Setările de acces au fost actualizate!");
                onClose();
            }
        } catch (err: any) {
            showError("Eroare la Salvare", err);
        } finally {
            setLoading(false);
        }
    };
    
    const restoreAdminSession = async (adminSession: any) => {
        if (adminSession) {
            const { error } = await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
            if (error) showError("Eroare Critică", "Sesiunea de admin nu a putut fi restaurată. Reîncărcați pagina.");
        } else {
             showError("Eroare Sesiune", "Sesiunea de administrator a expirat. Vă rugăm să vă autentificați din nou.");
        }
    };

    const handleCreateOrLinkAccount = async (e: React.FormEvent, isLinkAttempt: boolean = false) => {
        e.preventDefault();
        if (!supabase || !sportiv) return;
        if (!createForm.email || !createForm.parola) { showError("Validare Eșuată", "Email-ul și parola sunt obligatorii."); return; }
        
        setLoading(true);
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        try {
            if (isLinkAttempt) { // Linking existing account
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: createForm.email, password: createForm.parola });
                if (signInError) throw new Error("Parola este incorectă pentru contul existent. Asocierea a eșuat.");
                
                if (signInData.user) {
                    const { data: linkedProfile, error: checkError } = await supabase.from('sportivi').select('id, nume, prenume').eq('user_id', signInData.user.id).not('id', 'eq', sportiv.id).maybeSingle();
                    if (checkError) throw checkError;
                    if (linkedProfile) throw new Error(`Contul este deja asociat cu sportivul ${linkedProfile.nume} ${linkedProfile.prenume}.`);

                    const { data, error } = await supabase.from('sportivi').update({ user_id: signInData.user.id, email: createForm.email, username: createForm.username }).eq('id', sportiv.id).select('*, sportivi_roluri(roluri(id, nume))').single();
                    if (error) throw error;
                    
                    const updatedUser = { ...data, roluri: data.sportivi_roluri.map((item: any) => item.roluri) } as Sportiv;
                    setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
                    showSuccess("Succes!", `Sportivul a fost asociat cu succes contului existent!`);
                    onClose();
                }
            } else { // Creating new account
                const { data: authData, error: authError } = await supabase.auth.signUp({ email: createForm.email, password: createForm.parola });
                if (authError) {
                    if (authError.message.includes("User already registered")) {
                        setCreationStep('confirm_link');
                        throw new Error(`Un cont cu email-ul "${createForm.email}" există deja. Confirmați parola pentru a-l asocia.`);
                    }
                    throw authError;
                }
                if (authData.user) {
                    const { data, error } = await supabase.from('sportivi').update({ user_id: authData.user.id, email: createForm.email, username: createForm.username }).eq('id', sportiv.id).select('*, sportivi_roluri(roluri(id, nume))').single();
                    if (error) throw error;

                    const updatedUser = { ...data, roluri: data.sportivi_roluri.map((item: any) => item.roluri) } as Sportiv;
                    setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
                    showSuccess("Succes!", `Cont creat cu succes pentru ${sportiv.nume}!`);
                    onClose();
                }
            }
        } catch (err: any) {
            showError("Eroare", err);
        } finally {
            await supabase.auth.signOut().catch(()=>{}); // Ignore signout error
            await restoreAdminSession(adminSession);
            setLoading(false);
        }
    };
    
    const handleAddNewRole = async () => {
        if (!supabase) return;
        const trimmedName = newRoleName.trim();
        if (!trimmedName || allRoles.some(r => r.nume.toLowerCase() === trimmedName.toLowerCase())) {
            showError("Eroare", "Numele rolului este invalid sau duplicat.");
            return;
        }
        const { data, error } = await supabase.from('roluri').insert({ nume: trimmedName }).select().single();
        if (error) showError("Eroare la creare rol", error);
        else if (data) { setAllRoles(prev => [...prev, data as Rol]); setNewRoleName(''); showSuccess("Succes", "Rol adăugat!"); }
    };

    if (!isOpen || !sportiv) return null;

    const unassignedRoles = allRoles.filter(r => !selectedRoleIds.includes(r.id));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={hasAccount ? `Setări Cont: ${sportiv.nume}` : `Creează Cont: ${sportiv.nume}`}>
            {hasAccount ? (
                // --- EDIT ACCOUNT FORM ---
                <form onSubmit={handleSaveEdit} className="space-y-6">
                     {canEditRoles && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Roluri Asignate</h3>
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                                <div className="flex flex-wrap gap-2 min-h-[2.5rem] items-center">
                                    {selectedRoleIds.map(roleId => { const role = allRoles.find(r => r.id === roleId); if (!role) return null; const isRemovable = !(sportiv.id === currentUser.id && role.nume === 'Admin'); return <RoleBadge key={role.id} role={role} onRemove={() => handleRoleRemove(role.id)} isRemovable={isRemovable} />; })}
                                    {selectedRoleIds.length === 0 && <p className="text-sm text-slate-400 italic">Niciun rol. Va fi asignat 'Sportiv' la salvare.</p>}
                                </div>
                                {unassignedRoles.length > 0 && (
                                    <div className="flex items-end gap-2 pt-4 border-t border-slate-700">
                                        <div className="flex-grow"><Select label="Adaugă rol" value={roleToAdd} onChange={(e) => setRoleToAdd(e.target.value)}><option value="">Selectează...</option>{unassignedRoles.map(role => <option key={role.id} value={role.id}>{role.nume}</option>)}</Select></div>
                                        <Button type="button" variant="info" onClick={handleRoleAdd} disabled={!roleToAdd}><PlusIcon className="w-5 h-5" /></Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Date de Autentificare</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Input label="Nume Utilizator (Username)" name="username" type="text" value={editForm.username} onChange={handleEditFormChange} placeholder="ion.popescu" />
                            <Input label="Adresă Email" name="email" type="email" value={editForm.email} onChange={handleEditFormChange} required />
                            <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={editForm.parola} onChange={handleEditFormChange} />
                             <Input label="Confirmă Parola Nouă" name="confirmParola" type="password" value={editForm.confirmParola} onChange={handleEditFormChange} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4"><Button type="submit" variant="success" size="md" className="px-10" isLoading={loading}>Salvează Setările</Button></div>
                </form>
            ) : (
                // --- CREATE ACCOUNT FORM ---
                creationStep === 'initial' ? (
                     <form onSubmit={handleCreateOrLinkAccount} className="space-y-4">
                        <Input label="Email (Login)" name="email" type="email" value={createForm.email} onChange={handleCreateFormChange} required />
                        <Input label="Nume Utilizator" name="username" type="text" value={createForm.username} onChange={handleCreateFormChange} placeholder="Opțional. Ex: ion.popescu"/>
                        <Input label="Parolă Inițială" name="parola" type="password" value={createForm.parola} onChange={handleCreateFormChange} required />
                        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button><Button type="submit" variant="success" isLoading={loading}>Creează Cont</Button></div>
                    </form>
                ) : (
                     <form onSubmit={(e) => handleCreateOrLinkAccount(e, true)} className="space-y-4">
                        <p className="text-amber-300 text-sm text-center bg-amber-900/50 p-3 rounded-md">Un cont cu acest email există. Confirmați parola pentru a asocia sportivul.</p>
                        <Input label="Confirmă Parola Contului Existent" name="parola" type="password" value={createForm.parola} onChange={handleCreateFormChange} required />
                        <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={() => setCreationStep('initial')} disabled={loading}>Înapoi</Button><Button type="submit" variant="success" isLoading={loading}>Asociază Contul</Button></div>
                    </form>
                )
            )}
             {canEditRoles && (
                <div className="mt-6 pt-6 border-t border-slate-600">
                     <h3 className="text-lg font-semibold text-white mb-2">Management Global Roluri</h3>
                     <div className="flex items-end gap-2">
                        <Input label="Adaugă un rol nou în sistem" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="ex: Contabil"/>
                        <Button onClick={handleAddNewRole} variant="secondary"><PlusIcon className="w-5 h-5"/></Button>
                     </div>
                </div>
            )}
        </Modal>
    );
};