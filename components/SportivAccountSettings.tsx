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
                
                // --- Start Migration ---
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
                // --- End Migration ---
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
            
            // Re-fetch roles from the new table to update local state accurately
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
