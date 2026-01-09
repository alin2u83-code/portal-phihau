import React, { useState, useEffect } from 'react';
import { Sportiv, Rol, User } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';

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
    
    const handleRoleChange = (roleId: string, isChecked: boolean) => {
        setSelectedRoleIds(prev => {
            const updatedRoleIds = isChecked
                ? [...new Set([...prev, roleId])]
                : prev.filter(id => id !== roleId);
            return updatedRoleIds;
        });
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
        // Aceasta necesită o funcție pe server (RPC) cu privilegii de admin, deoarece nu se poate schimba parola altui utilizator de pe client.
        if (formData.parola && hasAccount && sportiv.user_id) {
             try {
                // Presupunem că există o funcție RPC 'update_user_password' pe backend.
                // Aceasta trebuie creată în Supabase SQL Editor.
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
        // ---- END PASSWORD UPDATE ----

        // ---- ROLE UPDATE LOGIC ----
        if (canEditRoles) {
            let finalRoleIds = [...selectedRoleIds];
            if (finalRoleIds.length === 0) {
                const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
                if (sportivRole) finalRoleIds.push(sportivRole.id);
            }

            const { error: deleteError } = await supabase.from('sportivi_roluri').delete().eq('sportiv_id', sportiv.id);
            if (deleteError) {
                setErrorMessage(`Eroare la ștergerea rolurilor vechi: ${deleteError.message}`);
                setLoading(false);
                return;
            }

            const newRolesToInsert = finalRoleIds.map(rol_id => ({ sportiv_id: sportiv.id, rol_id }));
            const { error: insertError } = await supabase.from('sportivi_roluri').insert(newRolesToInsert);
            if (insertError) {
                setErrorMessage(`Eroare la adăugarea rolurilor noi: ${insertError.message}`);
                setLoading(false);
                return;
            }
        }
        // ---- END ROLE UPDATE LOGIC ----

        const cleanedUsername = formData.username.toLowerCase().replace(/\s/g, '');
        
        if (cleanedUsername) {
            const { data: existingUser, error: checkError } = await supabase
                .from('sportivi')
                .select('id')
                .eq('username', cleanedUsername)
                .not('id', 'eq', sportiv.id)
                .limit(1);

            if (checkError) {
                setErrorMessage(`Eroare la verificare username: ${checkError.message}`);
                setLoading(false);
                return;
            }
            if (existingUser && existingUser.length > 0) {
                setErrorMessage('Numele de utilizator este deja folosit.');
                setLoading(false);
                return;
            }
        }


        const updates = {
            username: cleanedUsername || null,
            email: formData.email || null,
        };

        const { data, error } = await supabase.from('sportivi').update(updates).eq('id', sportiv.id).select('*, sportivi_roluri(roluri(id, nume))').single();

        if (error) {
            setErrorMessage(`Eroare la actualizarea profilului: ${error.message}`);
        } else if (data) {
            const updatedUser = data as any;
            updatedUser.roluri = updatedUser.sportivi_roluri.map((item: any) => item.roluri);
            delete updatedUser.sportivi_roluri;
            
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? updatedUser : s));
            setSuccessMessage("Setările de acces au fost actualizate!");
            setFormData(prev => ({ ...prev, parola: '', confirmParola: ''})); // Curăță câmpurile de parolă
        }
        
        setLoading(false);
        setTimeout(() => setSuccessMessage(''), 4000);
    };

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
                        <h2 className="text-2xl font-bold text-slate-900">Setări Cont & Roluri</h2>
                        <p className="text-slate-600">pentru {sportiv.nume} {sportiv.prenume}</p>
                    </div>
                </div>
                
                <form onSubmit={handleSave} className="space-y-6 pt-6 border-t border-slate-200">
                    {canEditRoles && (
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Roluri</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 p-4 bg-slate-100 rounded-lg border border-slate-200">
                                {allRoles.map(role => (
                                    <label key={role.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-slate-400 bg-white text-brand-primary focus:ring-brand-secondary"
                                            checked={selectedRoleIds.includes(role.id)}
                                            onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                        />
                                        <span>{role.nume}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Date de Autentificare</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
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

                    {errorMessage && <div className="p-3 bg-status-danger/10 text-status-danger rounded-md text-sm text-center border border-status-danger/20">{errorMessage}</div>}
                    {successMessage && <div className="p-3 bg-status-success/10 text-status-success rounded-md text-sm text-center font-bold border border-status-success/20">{successMessage}</div>}

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