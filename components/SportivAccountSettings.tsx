import React, { useState, useEffect } from 'react';
import { Sportiv, Rol, User } from '../types';
import { Button, Card, Input, Select, Modal, RoleBadge } from './ui';
import { ShieldCheckIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

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

    const canEditRoles = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'SUPER_ADMIN_FEDERATIE');
    const hasAccount = !!sportiv?.user_id;

    useEffect(() => {
        if (sportiv) {
            if (hasAccount) {
                setEditForm({ email: sportiv.email || '', username: sportiv.username || '', parola: '', confirmParola: '' });
                setSelectedRoleIds((sportiv.roluri || []).map(r => r.id));
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
        if (!supabase || !sportiv || !sportiv.user_id) return;
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
                
                await supabase.from('utilizator_roluri_multicont').delete().eq('user_id', sportiv.user_id);
                
                const rolesToInsert = finalRoleIds.map(roleId => {
                    const role = allRoles.find(r => r.id === roleId);
                    if (!role) return null;
                    return {
                        user_id: sportiv.user_id,
                        rol_denumire: role.nume,
                        club_id: sportiv.club_id,
                        sportiv_id: sportiv.id,
                        is_primary: false,
                    };
                }).filter(Boolean);

                if (rolesToInsert.length > 0) {
                    const { error: insErr } = await supabase.from('utilizator_roluri_multicont').insert(rolesToInsert as any);
                    if (insErr) throw insErr;
                }
            }
            
            const cleanedUsername = (editForm.username || '').toLowerCase().replace(/\s/g, '');
            if (cleanedUsername && cleanedUsername !== sportiv.username) {
                const { data: existing, error: checkErr } = await supabase.from('sportivi').select('id').eq('username', cleanedUsername).not('id', 'eq', sportiv.id).limit(1);
                if (checkErr) throw checkErr;
                if (existing && existing.length > 0) throw new Error('Numele de utilizator este deja folosit.');
            }

            const updates = { username: cleanedUsername || null, email: editForm.email || null };
            const { data, error } = await supabase.from('sportivi').update(updates).eq('id', sportiv.id).select().single();
            if (error) throw error;
            
            const { data: rolesData, error: rolesError } = await supabase.from('utilizator_roluri_multicont').select('*').eq('user_id', sportiv.user_id);
            if (rolesError) throw rolesError;
            
            const mappedRoles = (rolesData || []).map(mcr => {
                const roleFromNomenclator = allRoles.find(r => r.nume === mcr.rol_denumire);
                return roleFromNomenclator ? { id: roleFromNomenclator.id, nume: mcr.rol_denumire as Rol['nume'] } : null;
            }).filter((r): r is Rol => r !== null);


            if (data) {
                const updatedUser = { ...data, roluri: mappedRoles } as Sportiv;
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Setări Cont: ${sportiv?.nume} ${sportiv?.prenume}`}>
            {hasAccount ? (
                <form onSubmit={handleSaveEdit} className="space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Informații Autentificare</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Email (Login)" name="email" type="email" value={editForm.email} onChange={handleEditFormChange} required />
                            <Input label="Nume Utilizator" name="username" value={editForm.username} onChange={handleEditFormChange} />
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-lg font-bold text-white mb-4">Resetare Parolă</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={editForm.parola} onChange={handleEditFormChange} />
                            <Input label="Confirmă Parola" name="confirmParola" type="password" value={editForm.confirmParola} onChange={handleEditFormChange} />
                        </div>
                    </Card>
                    {canEditRoles && (
                        <Card>
                            <h3 className="text-lg font-bold text-white mb-4">Management Roluri</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedRoleIds.map(roleId => {
                                    const role = allRoles.find(r => r.id === roleId);
                                    if (!role) return null;
                                    return (
                                        <RoleBadge
                                            key={role.id}
                                            role={role}
                                            isRemovable={role.nume !== 'Sportiv'}
                                            onRemove={() => handleRoleRemove(role.id)}
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex items-end gap-2">
                                <Select label="Adaugă Rol Nou" value={roleToAdd} onChange={e => setRoleToAdd(e.target.value)}>
                                    <option value="">Selectează...</option>
                                    {allRoles.filter(r => !selectedRoleIds.includes(r.id)).map(r => (
                                        <option key={r.id} value={r.id}>{r.nume}</option>
                                    ))}
                                </Select>
                                <Button type="button" onClick={handleRoleAdd} variant="secondary" className="h-9"><PlusIcon className="w-4 h-4" /></Button>
                            </div>
                        </Card>
                    )}
                    <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                        <Button type="submit" variant="success" isLoading={loading}>Salvează Modificările</Button>
                    </div>
                </form>
            ) : (
                <div className="text-center p-4">
                    <h3 className="text-lg font-bold text-white mb-2">Acest sportiv nu are un cont de acces.</h3>
                    <p className="text-sm text-slate-400">Puteți crea un cont de acces din panoul de User Management.</p>
                    <Button variant="secondary" onClick={onClose} className="mt-6">Închide</Button>
                </div>
            )}
        </Modal>
    );
};
