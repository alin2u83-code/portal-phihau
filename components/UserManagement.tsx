import React, { useState, useMemo } from 'react';
import { Sportiv, User, Rol, Club, Permissions } from '../types';
import { Button, Input, Card, Select, Modal, RoleBadge } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, PlusIcon, LockIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

const initialStaffFormState = {
    nume: '',
    prenume: '',
    email: '',
    parola: '',
    rol_id: '',
    club_id: '',
};

const CreateStaffModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    clubs: Club[];
    allRoles: Rol[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}> = ({ isOpen, onClose, clubs, allRoles, setSportivi }) => {
    const [formData, setFormData] = useState(initialStaffFormState);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const staffRoles = useMemo(() => {
        return allRoles.filter(r => r.nume === 'INSTRUCTOR' || r.nume === 'ADMIN_CLUB' || r.nume === 'ADMIN' || r.nume === 'SUPER_ADMIN_FEDERATIE');
    }, [allRoles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }

        if (formData.parola.length < 8) {
             showError("Parolă Invalidă", "Parola trebuie să aibă cel puțin 8 caractere.");
            return;
        }

        setLoading(true);

        try {
            let newAuthUser: { id: string } | null = null;

            // FIX: Implementat fallback pentru crearea de utilizatori.
            // Încearcă mai întâi cu funcția Edge, iar dacă eșuează, folosește `signUp` ca alternativă.
            try {
                const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                    body: { email: formData.email, password: formData.parola },
                });

                if (authError || authData?.error) {
                    console.warn("Edge Function 'create-user-admin' a eșuat. Se comută pe supabase.auth.signUp.", authError || authData.error);
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email: formData.email,
                        password: formData.parola,
                    });
                    if (signUpError) {
                        if (signUpError.message.includes("User already exists")) {
                            throw new Error('Un utilizator cu acest email există deja. Contactați administratorul pentru a asocia manual contul existent.');
                        }
                        throw signUpError;
                    }
                    if (!signUpData.user) throw new Error("Metoda alternativă (signUp) nu a returnat un utilizator valid.");
                    newAuthUser = signUpData.user;
                    showSuccess("Cont Creat (Confirmare Necesară)", "Utilizatorul trebuie să confirme adresa de email înainte de a se putea autentifica.");
                } else {
                    newAuthUser = authData.user;
                }
            } catch (e: any) {
                throw new Error(`Eroare la crearea contului de autentificare: ${e.message}`);
            }

            if (!newAuthUser || !newAuthUser.id) {
                throw new Error('Funcția de creare a utilizatorului nu a returnat un ID valid.');
            }

            // Secvența corectă: 1. Auth User -> 2. Sportiv Profile -> 3. Roles
            const newSportivProfile: Omit<Sportiv, 'id' | 'roluri' | 'cluburi'> = {
                user_id: newAuthUser.id,
                nume: formData.nume,
                prenume: formData.prenume,
                email: formData.email,
                club_id: formData.club_id,
                data_nasterii: '1990-01-01', // Placeholder
                data_inscrierii: new Date().toISOString().split('T')[0],
                status: 'Activ',
                cnp: null,
                familie_id: null,
                tip_abonament_id: null,
                participa_vacanta: false,
                trebuie_schimbata_parola: true,
            };

            const { data: sportivData, error: sportivError } = await supabase
                .from('sportivi')
                .insert(newSportivProfile)
                .select('*, cluburi(*)')
                .single();

            if (sportivError) {
                throw new Error(`Contul de autentificare a fost creat, dar profilul nu. Ștergeți manual utilizatorul cu email-ul ${formData.email} din panoul Supabase. Eroare: ${sportivError.message}`);
            }

            const rolAtribuit = allRoles.find(r => r.id === formData.rol_id);
            if (!rolAtribuit) throw new Error("Rolul selectat nu a fost găsit.");

            const rolesToInsert = [
                {
                    user_id: newAuthUser.id,
                    rol_denumire: rolAtribuit.nume,
                    club_id: formData.club_id,
                    sportiv_id: sportivData.id,
                    is_primary: false,
                }
            ];
            
            // Orice membru staff este și un "Sportiv" din punct de vedere contextual
            const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
            if (sportivRole) {
                rolesToInsert.push({
                    user_id: newAuthUser.id,
                    rol_denumire: 'SPORTIV',
                    club_id: formData.club_id,
                    sportiv_id: sportivData.id,
                    is_primary: true
                });
            }

            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert(rolesToInsert);
            if (roleError) {
                throw new Error(`Profilul a fost creat, dar rolurile nu au putut fi atribuite. Eroare: ${roleError.message}`);
            }
            
            const finalRoles = [rolAtribuit];
            if(sportivRole && rolAtribuit.nume !== 'SPORTIV') {
                finalRoles.push(sportivRole);
            }
            
            const finalSportivObject: Sportiv = { ...sportivData, roluri: finalRoles };

            setSportivi(prev => [...prev, finalSportivObject]);
            showSuccess("Operațiune finalizată!", `${formData.nume} ${formData.prenume} a fost adăugat ca ${rolAtribuit?.nume}. Utilizatorul va trebui să-și schimbe parola la prima autentificare.`);
            setFormData(initialStaffFormState);
            onClose();

        } catch (err: any) {
            showError("Operațiune eșuată", err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Adaugă Membru Staff">
            <form onSubmit={handleSave} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nume" name="nume" value={formData.nume} onChange={handleChange} required />
                    <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleChange} required />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email (pentru login)" name="email" type="email" value={formData.email} onChange={handleChange} required />
                    <Input label="Parolă Inițială" name="parola" type="password" value={formData.parola} onChange={handleChange} required placeholder="Minim 8 caractere"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Rol" name="rol_id" value={formData.rol_id} onChange={handleChange} required>
                        <option value="">Alege un rol...</option>
                        {staffRoles.map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}
                    </Select>
                    <Select label="Club" name="club_id" value={formData.club_id} onChange={handleChange} required>
                        <option value="">Alege un club...</option>
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                    </Select>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} className="mr-2">Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading} className="px-8">
                        Creează Utilizator
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


interface UserManagementProps {
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack?: () => void;
    currentUser: User;
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    clubs: Club[];
    permissions: Permissions;
}

export const UserManagement: React.FC<UserManagementProps> = ({ sportivi, setSportivi, onBack, currentUser, allRoles, setAllRoles, clubs, permissions }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
    const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);

    const { showError, showSuccess } = useError();
    const { isFederationAdmin } = permissions;
    
    const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
    const [selectedUserForAccount, setSelectedUserForAccount] = useState<Sportiv | null>(null);
    const [createAccountForm, setCreateAccountForm] = useState({ email: '', username: '', parola: '' });
    const [createAccountError, setCreateAccountError] = useState('');
    const [createAccountLoading, setCreateAccountLoading] = useState(false);
    
    const [newRoleName, setNewRoleName] = useState('');
    const [roleCreationFeedback, setRoleCreationFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [roleSaveLoading, setRoleSaveLoading] = useState<Record<string, boolean>>({});

    const roleWeights: Record<Rol['nume'], number> = useMemo(() => ({
        'SUPER_ADMIN_FEDERATIE': 5,
        'ADMIN': 4,
        'ADMIN_CLUB': 3,
        'INSTRUCTOR': 2,
        'SPORTIV': 1,
    }), []);

    const currentUserMaxWeight = useMemo(() => 
        Math.max(0, ...currentUser.roluri.map(r => roleWeights[r.nume] || 0)),
        [currentUser.roluri, roleWeights]
    );

    const availableRolesForAssignment = useMemo(() => 
        allRoles.filter(r => (roleWeights[r.nume] || 0) <= currentUserMaxWeight),
        [allRoles, currentUserMaxWeight, roleWeights]
    );

    const usersToDisplay = useMemo(() => sportivi, [sportivi]);


    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setNewRoleIds((user.roluri || []).map(r => r.id));
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleSaveRole = async (userId: string) => {
        if (!supabase) { showError("Eroare", "Conexiunea la baza de date nu a putut fi stabilită."); return; }
        
        setRoleSaveLoading(prev => ({ ...prev, [userId]: true }));

        const targetUser = sportivi.find(s => s.id === userId);
        if (!targetUser) { showError("Eroare", "Utilizatorul țintă nu a fost găsit."); setRoleSaveLoading(prev => ({ ...prev, [userId]: false })); return; }
        if (!targetUser.user_id) {
            showError("Eroare", "Acest sportiv nu are un cont de utilizator asociat. Nu se pot asigna roluri.");
            setRoleSaveLoading(prev => ({ ...prev, [userId]: false }));
            return;
        }
        
        const targetUserCurrentMaxWeight = Math.max(0, ...(targetUser.roluri || []).map(r => roleWeights[r.nume] || 0));
        const newAssignedRolesWeights = newRoleIds.map(roleId => roleWeights[allRoles.find(r => r.id === roleId)?.nume || 'SPORTIV'] || 0);
        const newMaxAssignedWeight = Math.max(0, ...newAssignedRolesWeights);

        // Prevent modifying users with equal or higher privileges (unless it's self-edit) or assigning higher privilege roles
        if (currentUser.id !== targetUser.id) {
            if (currentUserMaxWeight <= targetUserCurrentMaxWeight) {
                showError("Permisiune Refuzată", "Nu puteți modifica rolurile unui utilizator cu privilegii egale sau mai mari.");
                setRoleSaveLoading(prev => ({ ...prev, [userId]: false }));
                return;
            }
            if (newMaxAssignedWeight > currentUserMaxWeight) {
                showError("Permisiune Refuzată", "Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră.");
                setRoleSaveLoading(prev => ({ ...prev, [userId]: false }));
                return;
            }
        } else {
            // Self-edit: allow demotion, but not promotion beyond current max
            if (newMaxAssignedWeight > currentUserMaxWeight) {
                showError("Permisiune Refuzată", "Nu vă puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră curent.");
                setRoleSaveLoading(prev => ({ ...prev, [userId]: false }));
                return;
            }
        }

        let finalRoleIds = [...newRoleIds];
        const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
        if (finalRoleIds.length === 0 && sportivRole) {
            finalRoleIds.push(sportivRole.id);
        }
        
        try {
            const rolesToUpsert = finalRoleIds.map(roleId => {
                const role = allRoles.find(r => r.id === roleId);
                if (!role) return null;
                return {
                    user_id: targetUser.user_id,
                    rol_denumire: role.nume,
                    club_id: targetUser.club_id,
                    sportiv_id: targetUser.id,
                };
            }).filter((r): r is NonNullable<typeof r> => r !== null);

            const roleDenumiriToKeep = rolesToUpsert.map(r => r.rol_denumire);

            if (rolesToUpsert.length > 0) {
                const { error: upsertError } = await supabase
                    .from('utilizator_roluri_multicont')
                    .upsert(rolesToUpsert, { onConflict: 'user_id,sportiv_id,rol_denumire' });
                if (upsertError) throw upsertError;
            }
            
            const deleteQuery = supabase
                .from('utilizator_roluri_multicont')
                .delete()
                .eq('sportiv_id', targetUser.id);

            if (roleDenumiriToKeep.length > 0) {
                deleteQuery.not('rol_denumire', 'in', `(${roleDenumiriToKeep.map(r => `'${r}'`).join(',')})`);
            }
            
            const { error: deleteError } = await deleteQuery;
            if (deleteError) throw deleteError;

            const updatedRoles = allRoles.filter(r => finalRoleIds.includes(r.id));
            setSportivi(prev => prev.map(s => s.id === userId ? { ...s, roluri: updatedRoles } : s));
            
            showSuccess("Succes", `Rolurile pentru ${targetUser.nume} au fost salvate!`);
            setEditingId(null);
        } catch (error: any) {
            showError("Eroare la schimbarea rolului", error.message);
        } finally {
            setRoleSaveLoading(prev => ({ ...prev, [userId]: false }));
        }
    };


    const handleRoleChange = (roleId: string, isChecked: boolean) => {
        setNewRoleIds(prev => isChecked ? [...new Set([...prev, roleId])] : prev.filter(id => id !== roleId));
    };

    const handleOpenCreateAccountModal = (user: Sportiv) => {
        setSelectedUserForAccount(user);
        
        const sanitize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
        const emailPrefix = `${sanitize(user.nume)}.${sanitize(user.prenume)}`;

        setCreateAccountForm({
            email: `${emailPrefix}@phihau.ro`,
            username: user.username || emailPrefix,
            parola: 'Parola123!'
        });
        setIsCreateAccountModalOpen(true);
        setCreateAccountError('');
    };

    const handleCreateAccountFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreateAccountForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !selectedUserForAccount) return;
        setCreateAccountLoading(true);
        setCreateAccountError('');
        
        try {
            const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                body: { email: createAccountForm.email, password: createAccountForm.parola },
            });

            if (authError || authData.error) {
                const errorMessage = authError?.message || authData.error;
                if (String(errorMessage).includes('User already exists')) {
                     throw new Error('Un utilizator cu acest email există deja. Asociați-l manual dacă este necesar.');
                }
                throw new Error(errorMessage || 'A apărut o eroare la crearea contului.');
            }
    
            const authUser = authData.user;
            if (!authUser) throw new Error("Nu s-a putut crea contul de autentificare. Răspunsul de la server a fost gol.");
    
            const profileUpdates = { user_id: authUser.id, email: createAccountForm.email, username: createAccountForm.username };
            const { data, error } = await supabase.from('sportivi').update(profileUpdates).eq('id', selectedUserForAccount.id).select('*, cluburi(*)').single();
    
            if (error) throw new Error(`Cont Auth creat, dar eroare la legarea profilului: ${error.message}.`);
            
            const { error: roleError } = await supabase.from('utilizator_roluri_multicont').insert({
                user_id: authUser.id,
                sportiv_id: selectedUserForAccount.id,
                club_id: selectedUserForAccount.club_id,
                rol_denumire: 'SPORTIV',
                is_primary: true
            });
            if (roleError) throw new Error(`Profil legat, dar eroare la asignarea rolului 'Sportiv': ${roleError.message}`);

            const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
            const updatedUser = { ...data, roluri: sportivRole ? [sportivRole] : [] };

            setSportivi(prev => prev.map(s => s.id === selectedUserForAccount.id ? updatedUser as Sportiv : s));
            
            setIsCreateAccountModalOpen(false);
            showSuccess("Cont Creat", `Contul pentru ${selectedUserForAccount.nume} a fost creat cu succes.`);
    
        } catch (err: any) {
            setCreateAccountError(err.message);
        } finally {
            setCreateAccountLoading(false);
        }
    };

    const handleAddNewRole = async () => {
        if (!supabase) return;
        const trimmedName = newRoleName.trim();
        if (!trimmedName) {
            setRoleCreationFeedback({type: 'error', message: "Numele rolului nu poate fi gol."});
            return;
        }
        if (allRoles.some(r => r.nume.toLowerCase() === trimmedName.toLowerCase())) {
             setRoleCreationFeedback({type: 'error', message: "Un rol cu acest nume există deja."});
            return;
        }
        
        const { data, error } = await supabase.from('roluri').insert({ nume: trimmedName }).select().single();
        if (error) {
            setRoleCreationFeedback({type: 'error', message: `Eroare: ${error.message}`});
        } else if (data) {
            setAllRoles(prev => [...prev, data as Rol]);
            setNewRoleName('');
            setRoleCreationFeedback({type: 'success', message: 'Rol adăugat!'});
            setTimeout(() => setRoleCreationFeedback(null), 3000);
        }
    };


    return (
        <div className="space-y-8">
            {onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>}
            
            <header>
                <h1 className="text-3xl font-bold text-white">Administrare Utilizatori & Roluri</h1>
                <p className="text-slate-400">Gestionează conturile de acces și permisiunile pentru staff și sportivi.</p>
            </header>

            {permissions.hasAdminAccess && (
                <>
                <Card>
                     <h3 className="text-xl font-bold text-white mb-4">Adaugă Rol Nou în Nomenclator</h3>
                     <div className="flex items-end gap-2">
                        <Input label="Nume Rol" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="ex: Antrenor Copii" />
                        <Button onClick={handleAddNewRole} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Adaugă Rol</Button>
                     </div>
                      {roleCreationFeedback && <p className={`mt-2 text-sm ${roleCreationFeedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{roleCreationFeedback.message}</p>}
                </Card>

                <Card>
                    <div className="flex justify-between items-center gap-2 mb-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="w-8 h-8 text-amber-400"/>
                            <h2 className="text-2xl font-bold text-white">Administrare Staff & Permisiuni</h2>
                        </div>
                         <Button variant="info" onClick={() => setIsCreateStaffModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Membru Staff
                        </Button>
                    </div>
                     <div className="p-3 mb-4 text-sm rounded-md bg-sky-900/50 text-sky-300 border border-sky-500/30">
                        <strong>Notă:</strong> La salvarea rolurilor, permisiunile de acces sunt actualizate automat. Un trigger SQL va sincroniza metadatele pentru a activa accesul multi-cont, dacă este cazul.
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="p-4 font-semibold">Nume Utilizator</th>
                                    <th className="p-4 font-semibold">Email (Login)</th>
                                    <th className="p-4 font-semibold">Roluri</th>
                                    <th className="p-4 font-semibold text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersToDisplay.map(user => {
                                    const targetUserMaxWeight = Math.max(0, ...(user.roluri || []).map(r => roleWeights[r.nume] || 0));
                                    const canEditUser = currentUser.id === user.id || currentUserMaxWeight > targetUserMaxWeight;

                                    return (
                                        <tr key={user.id} className="border-b border-slate-700">
                                            <td className="p-4 font-medium">{user.nume} {user.prenume}</td>
                                            <td className="p-4">{user.email}</td>
                                            {editingId === user.id ? (
                                                <>
                                                    <td className="p-2">
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                            {availableRolesForAssignment.map(role => (
                                                                <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500"
                                                                        checked={newRoleIds.includes(role.id)}
                                                                        onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                                                    />
                                                                    <span>{role.nume}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right w-32">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="success" onClick={() => handleSaveRole(user.id)} isLoading={roleSaveLoading[user.id]}>Salvează</Button>
                                                            <Button size="sm" variant="secondary" onClick={handleCancel}>Anulează</Button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-4">
                                                        {user.user_id ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {(user.roluri || []).map(role => <RoleBadge key={role.id} role={role} />)}
                                                            </div>
                                                        ) : (
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500 text-white">
                                                                Fără Cont
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right w-32">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {user.user_id ? (
                                                                canEditUser ? (
                                                                    <Button onClick={() => handleEdit(user)} variant="primary" size="sm">Gestionează Roluri</Button>
                                                                ) : (
                                                                    <Button variant="secondary" size="sm" disabled title="Nu aveți permisiunea de a modifica acest utilizator">
                                                                        <LockIcon className="w-4 h-4" />
                                                                    </Button>
                                                                )
                                                            ) : (
                                                                <Button onClick={() => handleOpenCreateAccountModal(user)} variant="info" size="sm">Creează Cont</Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
                </>
            )}

            {isCreateAccountModalOpen && selectedUserForAccount && (
                <Modal isOpen={isCreateAccountModalOpen} onClose={() => setIsCreateAccountModalOpen(false)} title={`Creează Cont pentru ${selectedUserForAccount.nume} ${selectedUserForAccount.prenume}`}>
                    <form onSubmit={handleCreateAccount} className="space-y-4">
                        <Input label="Email (Login)" name="email" type="email" value={createAccountForm.email} onChange={handleCreateAccountFormChange} required />
                        <Input label="Nume Utilizator" name="username" type="text" value={createAccountForm.username} onChange={handleCreateAccountFormChange} placeholder="Opțional. Ex: ion.popescu"/>
                        <Input label="Parolă Inițială" name="parola" type="password" value={createAccountForm.parola} onChange={handleCreateAccountFormChange} required />
                        {createAccountError && <p className="text-red-400 text-sm text-center bg-red-900/50 p-2 rounded">{createAccountError}</p>}
                        <div className="flex justify-end pt-4 space-x-2">
                            <Button type="button" variant="secondary" onClick={() => setIsCreateAccountModalOpen(false)} disabled={createAccountLoading}>Anulează</Button>
                            <Button type="submit" variant="success" disabled={createAccountLoading}>{createAccountLoading ? 'Se creează...' : 'Creează Cont'}</Button>
                        </div>
                    </form>
                </Modal>
            )}

            <CreateStaffModal
                isOpen={isCreateStaffModalOpen}
                onClose={() => setIsCreateStaffModalOpen(false)}
                clubs={clubs}
                allRoles={allRoles}
                setSportivi={setSportivi}
            />
        </div>
    );
};
