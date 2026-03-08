import React, { useState, useMemo } from 'react';
import { Sportiv, User, Rol, Club, Permissions } from '../types';
import { Button, Input, Card, Select, Modal, RoleBadge } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, PlusIcon, LockIcon, ClipboardCheckIcon, WalletIcon, UsersIcon, CogIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useRoleAssignment } from '../hooks/useRoleAssignment';
import { ResponsiveTable, Column } from './ResponsiveTable';

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
    currentUser: User;
    permissions: Permissions;
}> = ({ isOpen, onClose, clubs, allRoles, setSportivi, currentUser, permissions }) => {
    const [formData, setFormData] = useState({
        ...initialStaffFormState,
        club_id: permissions.isFederationAdmin ? '' : (currentUser.club_id || '')
    });
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    // Reset form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setFormData({
                ...initialStaffFormState,
                club_id: permissions.isFederationAdmin ? '' : (currentUser.club_id || '')
            });
        }
    }, [isOpen, permissions.isFederationAdmin, currentUser.club_id]);

    const staffRoles = useMemo(() => {
        return allRoles.filter(r => r.nume === 'INSTRUCTOR' || r.nume === 'ADMIN_CLUB' || r.nume === 'ADMIN' || r.nume === 'SUPER_ADMIN_FEDERATIE');
    }, [allRoles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);

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
            const rolAtribuit = allRoles.find(r => r.id === formData.rol_id);
            if (!rolAtribuit) throw new Error("Rolul selectat nu a fost găsit.");

            const rolesToAssign = [rolAtribuit];
            const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
            if (sportivRole && rolAtribuit.nume !== 'SPORTIV') {
                rolesToAssign.push(sportivRole);
            }

            const newSportivProfile: Partial<Sportiv> = {
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

            const result = await createAccountAndAssignRole(
                formData.email,
                formData.parola,
                newSportivProfile,
                rolesToAssign
            );

            if (!result.success || !result.sportiv) {
                throw new Error(result.error || "A apărut o eroare la crearea contului.");
            }

            setSportivi(prev => [...prev, result.sportiv!]);
            showSuccess("Operațiune finalizată!", `${formData.nume} ${formData.prenume} a fost adăugat ca ${rolAtribuit?.nume}. Utilizatorul va trebui să-și schimbe parola la prima autentificare.`);
            setFormData(initialStaffFormState);
            onClose();

        } catch (err: any) {
            console.error('DEBUG:', err);
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
                    <Select 
                        label="Club" 
                        name="club_id" 
                        value={formData.club_id} 
                        onChange={handleChange} 
                        required 
                        disabled={!permissions.isFederationAdmin}
                    >
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

const PermissionGuide: React.FC = () => {
    const roles = [
        {
            name: 'Super Admin Federație',
            icon: ShieldCheckIcon,
            color: 'text-purple-400',
            permissions: [
                'Acces total la toate cluburile din federație',
                'Gestionare structură federație și cluburi noi',
                'Configurare globală prețuri și grade',
                'Administrare staff la orice nivel',
                'Mentenanță date (Backup/Restore)'
            ]
        },
        {
            name: 'Admin Club',
            icon: CogIcon,
            color: 'text-amber-400',
            permissions: [
                'Management complet pentru propriul club',
                'Gestionare sportivi, grupe și orar',
                'Administrare financiară (plăți, facturi, deconturi)',
                'Organizare sesiuni de examene',
                'Configurare abonamente club'
            ]
        },
        {
            name: 'Instructor',
            icon: ClipboardCheckIcon,
            color: 'text-red-400',
            permissions: [
                'Înregistrare prezențe la antrenamente',
                'Vizualizare fișe sportivi din grupele alocate',
                'Propunere sportivi pentru examene',
                'Acces la rapoarte de prezență',
                'Vizualizare istoric grade'
            ]
        },
        {
            name: 'Sportiv',
            icon: UsersIcon,
            color: 'text-sky-400',
            permissions: [
                'Acces la portalul personal (My Portal)',
                'Vizualizare istoric plăți și prezențe',
                'Descărcare fișă digitală și de competiție',
                'Înscriere la evenimente și examene',
                'Actualizare date profil personal'
            ]
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {roles.map((role, idx) => (
                <Card key={idx} className="border-t-2 border-slate-700 hover:border-slate-500 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <role.icon className={`w-5 h-5 ${role.color}`} />
                        <h4 className="font-bold text-white text-sm">{role.name}</h4>
                    </div>
                    <ul className="space-y-1.5">
                        {role.permissions.map((p, i) => (
                            <li key={i} className="text-[11px] text-slate-400 flex items-start gap-2">
                                <span className="text-slate-600 mt-1">•</span>
                                <span>{p}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            ))}
        </div>
    );
};

export const UserManagement: React.FC<UserManagementProps> = ({ sportivi, setSportivi, onBack, currentUser, allRoles, setAllRoles, clubs, permissions }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'guide'>('users');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRoleIds, setNewRoleIds] = useState<string[]>([]);
    const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(permissions.isFederationAdmin ? null : currentUser.club_id);

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

    const usersToDisplay = useMemo(() => {
        if (!selectedClubId) return sportivi;
        return sportivi.filter(s => s.club_id === selectedClubId);
    }, [sportivi, selectedClubId]);


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
            console.error('DEBUG:', error);
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
    
    const { createAccountAndAssignRole } = useRoleAssignment(currentUser, allRoles);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !selectedUserForAccount) return;
        setCreateAccountLoading(true);
        setCreateAccountError('');
        
        try {
            const sportivRole = allRoles.find(r => r.nume === 'SPORTIV');
            if (!sportivRole) throw new Error("Rolul 'SPORTIV' nu a fost găsit.");

            const result = await createAccountAndAssignRole(
                createAccountForm.email,
                createAccountForm.parola,
                { ...selectedUserForAccount, username: createAccountForm.username },
                [sportivRole]
            );

            if (!result.success || !result.sportiv) {
                throw new Error(result.error || 'A apărut o eroare la crearea contului.');
            }

            setSportivi(prev => prev.map(s => s.id === selectedUserForAccount.id ? result.sportiv! : s));
            
            setIsCreateAccountModalOpen(false);
            showSuccess("Cont Creat", `Contul pentru ${selectedUserForAccount.nume} a fost creat cu succes.`);
    
        } catch (err: any) {
            console.error('DEBUG:', err);
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
            console.error('DEBUG:', error);
            setRoleCreationFeedback({type: 'error', message: `Eroare: ${error.message}`});
        } else if (data) {
            setAllRoles(prev => [...prev, data as Rol]);
            setNewRoleName('');
            setRoleCreationFeedback({type: 'success', message: 'Rol adăugat!'});
            setTimeout(() => setRoleCreationFeedback(null), 3000);
        }
    };


    const columns: Column<Sportiv>[] = [
        {
            key: 'nume',
            label: 'Nume Utilizator',
            render: (user) => <span className="font-medium text-white">{user.nume} {user.prenume}</span>
        },
        {
            key: 'email',
            label: 'Email (Login)',
            render: (user) => <span className="text-slate-300">{user.email}</span>
        },
        {
            key: 'club_id',
            label: 'Club',
            render: (user) => {
                const club = clubs.find(c => c.id === user.club_id);
                return <span className="text-xs text-slate-400">{club?.nume || 'N/A'}</span>;
            }
        },
        {
            key: 'roluri',
            label: 'Roluri',
            render: (user) => {
                const targetUserMaxWeight = Math.max(0, ...(user.roluri || []).map(r => roleWeights[r.nume] || 0));
                const canEditUser = currentUser.id === user.id || currentUserMaxWeight > targetUserMaxWeight;

                if (editingId === user.id) {
                    return (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {availableRolesForAssignment.map(role => (
                                <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500"
                                        checked={newRoleIds.includes(role.id)}
                                        onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                    />
                                    <span className="text-slate-300">{role.nume}</span>
                                </label>
                            ))}
                        </div>
                    );
                }

                return user.user_id ? (
                    <div className="flex flex-wrap gap-1">
                        {(user.roluri || []).map(role => <RoleBadge key={role.id} role={role} />)}
                    </div>
                ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500 text-white">
                        Fără Cont
                    </span>
                );
            }
        },
        {
            key: 'actions',
            label: 'Acțiuni',
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            render: (user) => {
                const targetUserMaxWeight = Math.max(0, ...(user.roluri || []).map(r => roleWeights[r.nume] || 0));
                const canEditUser = currentUser.id === user.id || currentUserMaxWeight > targetUserMaxWeight;

                if (editingId === user.id) {
                    return (
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="success" onClick={() => handleSaveRole(user.id)} isLoading={roleSaveLoading[user.id]}>Salvează</Button>
                            <Button size="sm" variant="secondary" onClick={handleCancel}>Anulează</Button>
                        </div>
                    );
                }

                return (
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
                );
            }
        }
    ];

    const renderMobileItem = (user: Sportiv) => {
        const targetUserMaxWeight = Math.max(0, ...(user.roluri || []).map(r => roleWeights[r.nume] || 0));
        const canEditUser = currentUser.id === user.id || currentUserMaxWeight > targetUserMaxWeight;

        return (
            <Card className="mb-4 border-l-4 border-indigo-500">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="font-bold text-white text-lg">{user.nume} {user.prenume}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                </div>

                <div className="mt-2 space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Roluri</label>
                        {editingId === user.id ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                {availableRolesForAssignment.map(role => (
                                    <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500"
                                            checked={newRoleIds.includes(role.id)}
                                            onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                        />
                                        <span className="text-slate-300">{role.nume}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            user.user_id ? (
                                <div className="flex flex-wrap gap-1">
                                    {(user.roluri || []).map(role => <RoleBadge key={role.id} role={role} />)}
                                </div>
                            ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500 text-white">
                                    Fără Cont
                                </span>
                            )
                        )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-700">
                        {editingId === user.id ? (
                            <div className="flex gap-2 w-full">
                                <Button size="sm" variant="success" onClick={() => handleSaveRole(user.id)} isLoading={roleSaveLoading[user.id]} className="flex-1 justify-center">Salvează</Button>
                                <Button size="sm" variant="secondary" onClick={handleCancel} className="flex-1 justify-center">Anulează</Button>
                            </div>
                        ) : (
                            user.user_id ? (
                                canEditUser ? (
                                    <Button onClick={() => handleEdit(user)} variant="primary" size="sm" className="w-full justify-center">Gestionează Roluri</Button>
                                ) : (
                                    <Button variant="secondary" size="sm" disabled title="Nu aveți permisiunea de a modifica acest utilizator" className="w-full justify-center">
                                        <LockIcon className="w-4 h-4 mr-2" /> Restricționat
                                    </Button>
                                )
                            ) : (
                                <Button onClick={() => handleOpenCreateAccountModal(user)} variant="info" size="sm" className="w-full justify-center">Creează Cont</Button>
                            )
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-8">
            {onBack && <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>}
            
            <header className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Administrare Utilizatori & Roluri</h1>
                        <p className="text-slate-400">Gestionează conturile de acces și permisiunile pentru staff și sportivi.</p>
                    </div>
                    <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-[#3D3D99] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Utilizatori
                        </button>
                        <button 
                            onClick={() => setActiveTab('guide')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'guide' ? 'bg-[#3D3D99] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Ghid Permisiuni
                        </button>
                    </div>
                </div>
            </header>

            {activeTab === 'guide' ? (
                <div className="animate-fade-in-down">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <ShieldCheckIcon className="w-6 h-6 text-amber-400" />
                        Matricea de Permisiuni și Responsabilități
                    </h3>
                    <PermissionGuide />
                    <Card className="bg-blue-900/20 border-blue-500/30">
                        <h4 className="font-bold text-blue-300 mb-2">Informații Suplimentare</h4>
                        <p className="text-sm text-blue-200/80 leading-relaxed">
                            Sistemul utilizează un model de control al accesului bazat pe roluri (RBAC) cu suport pentru multiple contexte. 
                            Un utilizator poate avea roluri diferite în cluburi diferite (ex: Instructor la Club A și Admin la Club B). 
                            La autentificare, utilizatorul va fi invitat să aleagă contextul în care dorește să lucreze.
                        </p>
                    </Card>
                </div>
            ) : (
                <div className="animate-fade-in-down">
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
                        <div className="flex items-center gap-4">
                            {isFederationAdmin && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 uppercase font-bold">Filtru Club:</span>
                                    <select 
                                        value={selectedClubId || ''} 
                                        onChange={(e) => setSelectedClubId(e.target.value || null)}
                                        className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none"
                                    >
                                        <option value="">Toate Cluburile</option>
                                        {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                                    </select>
                                </div>
                            )}
                            <Button variant="info" onClick={() => setIsCreateStaffModalOpen(true)}>
                                <PlusIcon className="w-5 h-5 mr-2" /> Adaugă Membru Staff
                            </Button>
                        </div>
                    </div>
                     <div className="p-3 mb-4 text-sm rounded-md bg-sky-900/50 text-sky-300 border border-sky-500/30">
                        <strong>Notă:</strong> La salvarea rolurilor, permisiunile de acces sunt actualizate automat. Un trigger SQL va sincroniza metadatele pentru a activa accesul multi-cont, dacă este cazul.
                    </div>
                    
                    <ResponsiveTable 
                        columns={columns}
                        data={usersToDisplay}
                        renderMobileItem={renderMobileItem}
                    />
                </Card>
                </>
            )}
            </div>
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
                currentUser={currentUser}
                permissions={permissions}
            />
        </div>
    );
};
