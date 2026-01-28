import React, { useState, useMemo } from 'react';
import { Sportiv, User, Rol, Club } from '../types';
import { Button, Input, Card, Select, Modal } from './ui';
import { ArrowLeftIcon, EditIcon, ShieldCheckIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { usePermissions } from '../hooks/usePermissions';

const RoleBadge: React.FC<{ role: Rol }> = ({ role }) => {
    // FIX: Add missing 'SUPER_ADMIN_FEDERATIE' and 'Admin Club' roles to satisfy the Record type.
    const colorClasses: Record<Rol['nume'], string> = {
        Admin: 'bg-red-600 text-white',
        'SUPER_ADMIN_FEDERATIE': 'bg-red-800 text-white',
        'Admin Club': 'bg-blue-600 text-white',
        Instructor: 'bg-sky-600 text-white',
        Sportiv: 'bg-slate-600 text-slate-200',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[role.nume] || 'bg-gray-500 text-white'}`}>
            {role.nume}
        </span>
    );
};

// Componenta pentru editarea profilului personal
const MyProfile: React.FC<{ user: User; setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>; setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> }> = ({ user, setSportivi, setCurrentUser }) => {
    const [formData, setFormData] = useState({
        nume: user.nume,
        prenume: user.prenume,
        email: user.email,
        username: user.username || '',
        parola: '',
        confirmParola: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setErrorMessage("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (formData.parola && formData.parola !== formData.confirmParola) {
            setErrorMessage("Parolele nu se potrivesc.");
            return;
        }
        
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        // 0. Verifică unicitatea username-ului dacă a fost schimbat
        if (formData.username && formData.username !== user.username) {
            const { data: existingUser, error: checkError } = await supabase
                .from('sportivi')
                .select('id')
                .eq('username', formData.username)
                .not('id', 'eq', user.id)
                .limit(1);

            if (checkError) {
                setErrorMessage(`Eroare la verificare: ${checkError.message}`);
                setLoading(false);
                return;
            }
            if (existingUser && existingUser.length > 0) {
                setErrorMessage('Numele de utilizator este deja folosit.');
                setLoading(false);
                return;
            }
        }

        // 1. Actualizează datele de autentificare dacă s-au schimbat
        const authUpdates: any = {};
        if (formData.email !== user.email) authUpdates.email = formData.email;
        if (formData.parola) authUpdates.password = formData.parola;

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) {
                setErrorMessage(`Eroare la actualizarea autentificării: ${authError.message}`);
                setLoading(false);
                return;
            }
        }

        // 2. Actualizează profilul în tabelul 'sportivi'
        const profileUpdates = {
            nume: formData.nume,
            prenume: formData.prenume,
            email: formData.email,
            username: formData.username,
        };
        const { data, error } = await supabase.from('sportivi').update(profileUpdates).eq('user_id', user.user_id).select('*, sportivi_roluri(roluri(id, nume))').single();

        if (error) {
            setErrorMessage(`Eroare la actualizarea profilului: ${error.message}`);
            setLoading(false);
            return;
        }

        // 3. Actualizează starea locală
        if(data) {
            const updatedUser = data as any;
            updatedUser.roluri = (updatedUser.sportivi_roluri || []).map((item: any) => item.roluri).filter(Boolean);
            delete updatedUser.sportivi_roluri;

            setSportivi(prev => prev.map(s => s.id === user.id ? updatedUser : s));
            setCurrentUser(updatedUser);
        }
        
        setSuccessMessage("Profilul a fost actualizat cu succes!");
        setFormData(prev => ({ ...prev, parola: '', confirmParola: '' }));
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
    };

    return (
        <Card className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Profilul Meu</h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nume" name="nume" value={formData.nume} onChange={handleChange} required />
                    <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email (Login)" name="email" type="email" value={formData.email || ''} onChange={handleChange} required />
                    <Input label="Nume Utilizator" name="username" type="text" value={formData.username} onChange={handleChange} placeholder="ex: ion.popescu"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={formData.parola} onChange={handleChange} />
                    <Input label="Confirmă Parola Nouă" name="confirmParola" type="password" value={formData.confirmParola} onChange={handleChange} />
                </div>
                {errorMessage && <p className="text-red-400 text-sm text-center">{errorMessage}</p>}
                <div className="flex justify-end items-center gap-4 pt-2">
                    {successMessage && <p className="text-green-400 text-sm font-semibold">{successMessage}</p>}
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Modificările'}</Button>
                </div>
            </form>
        </Card>
    );
};

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
        return allRoles.filter(r => r.nume === 'Instructor' || r.nume === 'Admin Club' || r.nume === 'Admin' || r.nume === 'SUPER_ADMIN_FEDERATIE');
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
            const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                body: { email: formData.email, password: formData.parola },
            });

            if (authError || authData.error) {
                const errorMessage = authError?.message || authData?.error;
                if (String(errorMessage).includes('User already exists')) {
                     throw new Error('Un utilizator cu acest email există deja în sistemul de autentificare.');
                }
                throw new Error(errorMessage || 'A apărut o eroare la crearea contului de autentificare.');
            }
            
            const newAuthUser = authData.user;
            if (!newAuthUser || !newAuthUser.id) {
                throw new Error('Funcția de creare a utilizatorului nu a returnat un ID valid.');
            }

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

            const { error: roleError } = await supabase
                .from('sportivi_roluri')
                .insert({ sportiv_id: sportivData.id, rol_id: formData.rol_id });

            if (roleError) {
                throw new Error(`Profilul a fost creat, dar rolul nu a putut fi atribuit. Atribuiți-l manual din pagina de Management Utilizatori. Eroare: ${roleError.message}`);
            }
            
            const rolAtribuit = allRoles.find(r => r.id === formData.rol_id);
            const finalSportivObject: Sportiv = { ...sportivData, roluri: rolAtribuit ? [rolAtribuit] : [] };

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
    isEmbedded?: boolean;
    currentUser: User;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    allRoles: Rol[];
    setAllRoles: React.Dispatch<React.SetStateAction<Rol[]>>;
    clubs: Club[];
}

export const UserManagement: React.FC<UserManagementProps> = ({ sportivi, setSportivi, onBack, isEmbedded = false, currentUser, setCurrentUser, allRoles, setAllRoles, clubs }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
    const [userListFeedback, setUserListFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);

    const { showError, showSuccess } = useError();
    const { isFederationAdmin } = usePermissions(currentUser);
    
    const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
    const [selectedUserForAccount, setSelectedUserForAccount] = useState<Sportiv | null>(null);
    const [createAccountForm, setCreateAccountForm] = useState({ email: '', username: '', parola: '' });
    const [createAccountError, setCreateAccountError] = useState('');
    const [createAccountLoading, setCreateAccountLoading] = useState(false);
    const [accountCreationStep, setAccountCreationStep] = useState<'initial' | 'confirm_link'>('initial');
    
    const [newRoleName, setNewRoleName] = useState('');
    const [roleCreationFeedback, setRoleCreationFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const roleWeights: Record<Rol['nume'], number> = useMemo(() => ({
        'SUPER_ADMIN_FEDERATIE': 5,
        'Admin': 4,
        'Admin Club': 3,
        'Instructor': 2,
        'Sportiv': 1,
    }), []);

    const currentUserMaxWeight = useMemo(() => 
        Math.max(0, ...currentUser.roluri.map(r => roleWeights[r.nume] || 0)),
        [currentUser.roluri, roleWeights]
    );

    const availableRolesForAssignment = useMemo(() => 
        allRoles.filter(r => (roleWeights[r.nume] || 0) <= currentUserMaxWeight),
        [allRoles, currentUserMaxWeight, roleWeights]
    );

    const usersToDisplay = useMemo(() => {
        return isFederationAdmin
            ? sportivi
            : sportivi.filter(s => s.club_id === currentUser.club_id);
    }, [sportivi, currentUser, isFederationAdmin]);


    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setNewRoleIds((user.roluri || []).map(r => r.id));
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleSaveRole = async (userId: string) => {
        if (!supabase) { showError("Eroare", "Conexiunea la baza de date nu a putut fi stabilită."); return; }
        
        const targetUser = sportivi.find(s => s.id === userId);
        if (!targetUser) { showError("Eroare", "Utilizatorul țintă nu a fost găsit."); return; }

        const targetUserMaxWeight = Math.max(0, ...(targetUser.roluri || []).map(r => roleWeights[r.nume] || 0));
        if (currentUserMaxWeight <= targetUserMaxWeight && currentUser.id !== targetUser.id) {
             showError("Permisiune Refuzată", "Nu puteți modifica rolurile unui utilizator cu privilegii egale sau mai mari.");
             return;
        }

        const assignedRolesWeight = newRoleIds.map(roleId => roleWeights[allRoles.find(r => r.id === roleId)?.nume || 'Sportiv'] || 0);
        if (assignedRolesWeight.some(weight => weight > currentUserMaxWeight)) {
            showError("Permisiune Refuzată", "Nu puteți acorda un rol cu privilegii mai mari decât rolul dumneavoastră.");
            return;
        }

        let finalRoleIds = [...newRoleIds];
        if (finalRoleIds.length === 0) {
            const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
            if (sportivRole) finalRoleIds.push(sportivRole.id);
        }
        
        const { error: rpcError } = await supabase.rpc('schimba_rol_utilizator', {
            p_user_id: userId,
            p_role_ids: finalRoleIds
        });

        if (rpcError) {
            showError("Eroare la schimbarea rolului", rpcError.message);
            return;
        }
        
        const updatedRoles = allRoles.filter(r => finalRoleIds.includes(r.id));
        setSportivi(prev => prev.map(s => s.id === userId ? { ...s, roluri: updatedRoles } : s));
        
        showSuccess("Succes", `Rolurile pentru ${targetUser.nume} au fost salvate!`);
        setEditingId(null);
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
        setAccountCreationStep('initial');
    };

    const handleCreateAccountFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCreateAccountForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleLinkExistingAccount = async () => {
        if (!supabase || !selectedUserForAccount) return;
        setCreateAccountLoading(true);
        setCreateAccountError('');
        
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: createAccountForm.email, password: createAccountForm.parola });

        if (signInError) {
            setCreateAccountError("Parola este incorectă pentru contul existent. Asocierea a eșuat.");
            if (adminSession) {
                await supabase.auth.setSession({ access_token: adminSession!.access_token, refresh_token: adminSession!.refresh_token });
            }
            setAccountCreationStep('initial');
            setCreateAccountLoading(false);
            return;
        }

        if (signInData.user) {
            const existingUserId = signInData.user.id;
            const { data: linkedProfile, error: checkError } = await supabase.from('sportivi').select('id, nume, prenume').eq('user_id', existingUserId).not('id', 'eq', selectedUserForAccount.id).maybeSingle();

            if (checkError) {
                setCreateAccountError(`Eroare la verificare profil existent: ${checkError.message}`);
            } else if (linkedProfile) {
                setCreateAccountError(`Contul este deja asociat cu sportivul ${linkedProfile.nume} ${linkedProfile.prenume}.`);
            } else {
                const profileUpdates = { user_id: existingUserId, email: createAccountForm.email, username: createAccountForm.username };
                const { data: updateData, error: updateError } = await supabase.from('sportivi').update(profileUpdates).eq('id', selectedUserForAccount.id).select('*, sportivi_roluri(roluri(id, nume))').single();

                if (updateError) {
                    setCreateAccountError(`Asociere eșuată la actualizarea profilului: ${updateError.message}`);
                } else if (updateData) {
                    const updatedUser = { ...updateData, roluri: (updateData.sportivi_roluri || []).map((item: any) => item.roluri).filter(Boolean) };
                    setSportivi(prev => prev.map(s => s.id === selectedUserForAccount.id ? updatedUser as Sportiv : s));
                    
                    setIsCreateAccountModalOpen(false);
                    setUserListFeedback({ type: 'success', message: `Sportivul a fost asociat cu succes contului existent!` });
                    setTimeout(() => setUserListFeedback(null), 4000);
                }
            }
        }
        await supabase.auth.signOut();
        if (adminSession) {
            await supabase.auth.setSession({ access_token: adminSession!.access_token, refresh_token: adminSession!.refresh_token });
        }
        setCreateAccountLoading(false);
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !selectedUserForAccount) return;
        if (!createAccountForm.email || !createAccountForm.parola) {
            setCreateAccountError("Email-ul și parola sunt obligatorii.");
            return;
        }
        setCreateAccountLoading(true);
        setCreateAccountError('');
    
        if (createAccountForm.username) {
            const { data: existingUser, error: checkError } = await supabase.from('sportivi').select('id').eq('username', createAccountForm.username).not('id', 'eq', selectedUserForAccount.id).limit(1);
            if (checkError) { setCreateAccountError(`Eroare la verificare: ${checkError.message}`); setCreateAccountLoading(false); return; }
            if (existingUser && existingUser.length > 0) { setCreateAccountError('Numele de utilizator este deja folosit.'); setCreateAccountLoading(false); return; }
        }
    
        const { data: { session: adminSession } } = await supabase.auth.getSession();
    
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: createAccountForm.email,
            password: createAccountForm.parola,
        });
    
        if (signUpError) {
            if (signUpError.message.includes("User already exists")) {
                setCreateAccountError(`Un cont cu email-ul "${createAccountForm.email}" există deja. Confirmați parola pentru a-l asocia.`);
                setAccountCreationStep('confirm_link');
            } else {
                setCreateAccountError(`Eroare la crearea contului: ${signUpError.message}`);
            }
            if(adminSession) {
                 await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
            }
            setCreateAccountLoading(false);
            return;
        }
        
        const authUser = signUpData.user;
    
        if (authUser) {
            const profileUpdates = { user_id: authUser.id, email: createAccountForm.email, username: createAccountForm.username };
            const { data, error } = await supabase.from('sportivi').update(profileUpdates).eq('id', selectedUserForAccount.id).select('*, sportivi_roluri(roluri(id, nume))').single();
    
            await supabase.auth.signOut().catch(()=>{});
            if (adminSession) {
                await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
            }
    
            if (error) {
                setCreateAccountError(`Cont Auth creat (ID: ${authUser.id}), dar eroare la legarea profilului: ${error.message}. Încercați să asociați contul manual.`);
            } else if (data) {
                const updatedUser = { ...data, roluri: (data.sportivi_roluri || []).map((item: any) => item.roluri).filter(Boolean) };
                setSportivi(prev => prev.map(s => s.id === selectedUserForAccount.id ? updatedUser as Sportiv : s));
                
                setIsCreateAccountModalOpen(false);
                showSuccess("Cont Creat", `Contul pentru ${selectedUserForAccount.nume} a fost creat. Utilizatorul va trebui să confirme adresa de email.`);
                setUserListFeedback({ type: 'success', message: `Cont creat pentru ${selectedUserForAccount.nume}. Este necesară confirmarea adresei de email.` });
                setTimeout(() => setUserListFeedback(null), 5000);
            }
        } else {
            if(adminSession) {
                 await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
            }
            setCreateAccountError('Nu s-a putut crea contul de autentificare. Răspunsul de la server a fost gol.');
        }
        
        setCreateAccountLoading(false);
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
        <div>
            {!isEmbedded && onBack && (
                <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            )}

            {userListFeedback && (
                <div className={`p-3 rounded-md mb-4 text-center font-semibold text-white ${userListFeedback.type === 'success' ? 'bg-green-600/50' : 'bg-red-600/50'}`}>
                    {userListFeedback.message}
                </div>
            )}
            
            <MyProfile user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} />

            {currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'SUPER_ADMIN_FEDERATIE' || r.nume === 'Admin Club') && (
                <>
                <Card className="mb-8">
                     <h3 className="text-xl font-bold text-white mb-4">Adaugă Rol Nou</h3>
                     <div className="flex items-end gap-2">
                        <Input label="Nume Rol" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="ex: Antrenor Copii" />
                        <Button onClick={handleAddNewRole} variant="info"><PlusIcon className="w-5 h-5 mr-2" /> Adaugă</Button>
                     </div>
                      {roleCreationFeedback && <p className={`mt-2 text-sm ${roleCreationFeedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{roleCreationFeedback.message}</p>}
                </Card>

                <Card>
                    <div className="flex justify-between items-center gap-2 mb-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheckIcon className="w-8 h-8 text-amber-400"/>
                            <h2 className="text-2xl font-bold text-white">Administrare Staff & Roluri</h2>
                        </div>
                         <Button variant="info" onClick={() => setIsCreateStaffModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Membru Staff
                        </Button>
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
                                {usersToDisplay.map(user => (
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
                                                        <Button size="sm" variant="success" onClick={() => handleSaveRole(user.id)}>Salvează</Button>
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
                                                            <Button onClick={() => handleEdit(user)} variant="primary" size="sm">Gestionează Roluri</Button>
                                                        ) : (
                                                            <Button onClick={() => handleOpenCreateAccountModal(user)} variant="info" size="sm">Creează Cont</Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                </>
            )}

            {isCreateAccountModalOpen && selectedUserForAccount && (
                <Modal isOpen={isCreateAccountModalOpen} onClose={() => setIsCreateAccountModalOpen(false)} title={`Creează Cont pentru ${selectedUserForAccount.nume} ${selectedUserForAccount.prenume}`}>
                    {accountCreationStep === 'initial' ? (
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
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleLinkExistingAccount(); }} className="space-y-4">
                             <p className="text-amber-300 text-sm text-center bg-amber-900/50 p-3 rounded-md">{createAccountError}</p>
                            <Input label="Confirmă Parola Contului Existent" name="parola" type="password" value={createAccountForm.parola} onChange={handleCreateAccountFormChange} required />
                             <div className="flex justify-end pt-4 space-x-2">
                                <Button type="button" variant="secondary" onClick={() => { setCreateAccountError(''); setAccountCreationStep('initial'); }} disabled={createAccountLoading}>Înapoi</Button>
                                <Button type="submit" variant="success" disabled={createAccountLoading}>{createAccountLoading ? 'Se asociază...' : 'Da, Asociază Contul'}</Button>
                            </div>
                        </form>
                    )}
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