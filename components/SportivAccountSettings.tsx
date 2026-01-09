import React, { useState, useEffect } from 'react';
import { Sportiv, Rol, User } from '../types';
import { Button, Card, Input, Select } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, PlusIcon } from './icons';
import { supabase } from '../supabaseClient';

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

interface SportivAccountSettingsProps {
    sportiv: Sportiv;
    onBack: () => void;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    allRoles: Rol[];
    currentUser: User;
}

export const SportivAccountSettings: React.FC<SportivAccountSettingsProps> = ({ sportiv, onBack, setSportivi, allRoles, currentUser }) => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        parola: '',
        confirmParola: '',
    });
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [roleToAdd, setRoleToAdd] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const canEditRoles = currentUser.roluri.some(r => r.nume === 'Admin');
    const hasAccount = !!sportiv.user_id;

    useEffect(() => {
        setFormData({
            email: sportiv.email || '',
            username: sportiv.username || '',
            parola: '',
            confirmParola: '',
        });
        setSelectedRoleIds(sportiv.roluri.map(r => r.id));
    }, [sportiv]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleRoleRemove = (roleId: string) => {
        setSelectedRoleIds(prev => prev.filter(id => id !== roleId));
    };

    const handleRoleAdd = () => {
        if (roleToAdd && !selectedRoleIds.includes(roleToAdd)) {
            setSelectedRoleIds(prev => [...prev, roleToAdd]);
            setRoleToAdd('');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { setErrorMessage("Clientul Supabase nu este configurat."); return; }

        if (hasAccount && !formData.email) {
            setErrorMessage("Utilizatorii cu un cont de acces trebuie să aibă o adresă de email.");
            return;
        }

        if (formData.parola && formData.parola !== formData.confirmParola) {
            setErrorMessage("Parolele nu se potrivesc.");
            return;
        }
        
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        
        // ---- PASSWORD UPDATE ----
        if (formData.parola && hasAccount && sportiv.user_id) {
             try {
                const { error: rpcError } = await supabase.rpc('update_user_password', {
                    user_id: sportiv.user_id,
                    new_password: formData.parola
                });
                if (rpcError) throw rpcError;
            } catch (error: any) {
                 setErrorMessage(`Eroare la actualizarea parolei: ${error.message}. Asigurați-vă că funcția RPC 'update_user_password' este configurată corect în Supabase.`);
                 setLoading(false);
                 return;
            }
        }

        // ---- ROLE UPDATE LOGIC ----
        if (canEditRoles) {
            let finalRoleIds = [...selectedRoleIds];
            if (finalRoleIds.length === 0) {
                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                if (sportivRole) finalRoleIds.push(sportivRole.id);
            }

            const { error: deleteError } = await supabase.from('sportivi_roluri').delete().eq('sportiv_id', sportiv.id);
            if (deleteError) { setErrorMessage(`Eroare la ștergerea rolurilor vechi: ${deleteError.message}`); setLoading(false); return; }

            const newRolesToInsert = finalRoleIds.map(rol_id => ({ sportiv_id: sportiv.id, rol_id }));
            if (newRolesToInsert.length > 0) {
                const { error: insertError } = await supabase.from('sportivi_roluri').insert(newRolesToInsert);
                if (insertError) { setErrorMessage(`Eroare la adăugarea rolurilor noi: ${insertError.message}`); setLoading(false); return; }
            }
        }
        
        const cleanedUsername = formData.username.toLowerCase().replace(/\s/g, '');
        
        if (cleanedUsername) {
            const { data: existingUser, error: checkError } = await supabase.from('sportivi').select('id').eq('username', cleanedUsername).not('id', 'eq', sportiv.id).limit(1);
            if (checkError) { setErrorMessage(`Eroare la verificare username: ${checkError.message}`); setLoading(false); return; }
            if (existingUser && existingUser.length > 0) { setErrorMessage('Numele de utilizator este deja folosit.'); setLoading(false); return; }
        }

        const updates = { username: cleanedUsername || null, email: formData.email || null };
        const { data, error } = await supabase.from('sportivi').update(updates).eq('id', sportiv.id).select('*, sportivi_roluri(roluri(id, nume))').single();

        if (error) {
            setErrorMessage(`Eroare la actualizarea profilului: ${error.message}`);
        } else if (data) {
            const updatedUser = data as any;
            updatedUser.roluri = updatedUser.sportivi_roluri.map((item: any) => item.roluri);
            delete updatedUser.sportivi_roluri;
            
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
            setSuccessMessage("Setările de acces au fost actualizate!");
            setFormData(prev => ({ ...prev, parola: '', confirmParola: ''}));
        }
        
        setLoading(false);
        setTimeout(() => setSuccessMessage(''), 4000);
    };
    
    const unassignedRoles = allRoles.filter(r => !selectedRoleIds.includes(r.id));

    return (
        <div className="max-w-4xl mx-auto">
            <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Profil
            </Button>
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-brand-primary rounded-full">
                        <ShieldCheckIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Setări Cont & Roluri</h2>
                        <p className="text-slate-400">pentru {sportiv.nume} {sportiv.prenume}</p>
                    </div>
                </div>
                
                <form onSubmit={handleSave} className="space-y-6 pt-6 border-t border-slate-700">
                    {canEditRoles && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Roluri Asignate</h3>
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
                                <div className="flex flex-wrap gap-2 min-h-[2.5rem] items-center">
                                    {selectedRoleIds.map(roleId => {
                                        const role = allRoles.find(r => r.id === roleId);
                                        if (!role) return null;
                                        const isRemovable = !(sportiv.id === currentUser.id && role.nume === 'Admin');
                                        return <RoleBadge key={role.id} role={role} onRemove={() => handleRoleRemove(role.id)} isRemovable={isRemovable} />;
                                    })}
                                    {selectedRoleIds.length === 0 && <p className="text-sm text-slate-400 italic">Niciun rol asignat. Va fi asignat 'Sportiv' la salvare.</p>}
                                </div>
                                {unassignedRoles.length > 0 && (
                                    <div className="flex items-end gap-2 pt-4 border-t border-slate-700">
                                        <div className="flex-grow">
                                            <Select label="Adaugă rol" value={roleToAdd} onChange={(e) => setRoleToAdd(e.target.value)}>
                                                <option value="">Selectează...</option>
                                                {unassignedRoles.map(role => <option key={role.id} value={role.id}>{role.nume}</option>)}
                                            </Select>
                                        </div>
                                        <Button type="button" variant="info" onClick={handleRoleAdd} disabled={!roleToAdd}><PlusIcon className="w-5 h-5" /></Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Date de Autentificare</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <Input 
                                label="Nume Utilizator (Username)" 
                                name="username" 
                                type="text" 
                                value={formData.username} 
                                onChange={handleChange} 
                                placeholder="ion.popescu"
                            />
                            <Input 
                                label="Adresă Email" 
                                name="email" 
                                type="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required={hasAccount}
                                placeholder={hasAccount ? "Obligatoriu pentru conturi" : "Opțional"}
                            />
                            <Input 
                                label="Parolă Nouă (lasă gol pentru a o păstra)"
                                name="parola"
                                type="password"
                                value={formData.parola}
                                onChange={handleChange}
                                disabled={!hasAccount}
                                placeholder={hasAccount ? 'Introduceți parola nouă...' : 'Creați întâi un cont'}
                            />
                             <Input 
                                label="Confirmă Parola Nouă"
                                name="confirmParola"
                                type="password"
                                value={formData.confirmParola}
                                onChange={handleChange}
                                disabled={!hasAccount}
                            />
                        </div>
                    </div>

                    {errorMessage && <div className="p-3 bg-red-600/10 text-red-400 rounded-md text-sm text-center border border-red-500/20">{errorMessage}</div>}
                    {successMessage && <div className="p-3 bg-green-600/10 text-green-400 rounded-md text-sm text-center font-bold border border-green-500/20">{successMessage}</div>}

                    <div className="flex justify-end pt-4">
                        <Button type="submit" variant="success" size="md" className="px-10" disabled={loading}>
                            {loading ? 'Se salvează...' : 'Salvează Setările'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};