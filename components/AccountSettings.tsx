import React, { useState } from 'react';
import { User, Rol, Sportiv } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, MailIcon, LockIcon, CheckCircleIcon } from './icons';
import { getRoleDisplayName, getRoleDescription, getRoleIcon } from '../hooks/useUserRoles';

interface AccountSettingsProps {
    currentUser: User;
    onBack: () => void;
    userRoles: any[];
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ currentUser, onBack, userRoles, setCurrentUser, setSportivi }) => {
    const { showError, showSuccess } = useError();
    
    // State combinat pentru datele personale și de securitate
    const [formData, setFormData] = useState({
        nume: currentUser.nume,
        prenume: currentUser.prenume,
        email: currentUser.email || '',
        parola: '',
        confirmParola: ''
    });
    const [loading, setLoading] = useState(false);
    
    const [roleLoading, setRoleLoading] = useState<string | null>(null);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare", "Client Supabase neinițializat."); return; }
        if (formData.parola && formData.parola !== formData.confirmParola) { showError("Eroare", "Parolele nu se potrivesc."); return; }
        if (formData.parola && formData.parola.length < 6) { showError("Eroare", "Parola trebuie să aibă cel puțin 6 caractere."); return; }
        
        setLoading(true);

        try {
            // Pas 1: Actualizează datele de autentificare dacă este necesar
            const authUpdates: any = {};
            if (formData.email !== currentUser.email) authUpdates.email = formData.email;
            if (formData.parola) authUpdates.password = formData.parola;

            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError) throw authError;
            }

            // Pas 2: Actualizează profilul în tabela 'sportivi'
            const profileUpdates = {
                nume: formData.nume,
                prenume: formData.prenume,
                email: formData.email,
            };
            const { data, error: profileError } = await supabase.from('sportivi').update(profileUpdates).eq('id', currentUser.id).select('*, cluburi(*)').single();
            if (profileError) throw profileError;

            // Pas 3: Actualizează starea globală a aplicației
            const updatedUser = { ...currentUser, ...data };

            setCurrentUser(updatedUser);
            setSportivi(prev => prev.map(s => s.id === currentUser.id ? updatedUser as Sportiv : s));
            
            showSuccess("Succes", "Profilul a fost actualizat.");
            setFormData(p => ({...p, parola: '', confirmParola: ''}));
        } catch (err: any) {
            showError("Eroare la actualizare", err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSetPrimaryRole = async (roleContext: any) => {
        if (!supabase) return;
        const contextKey = `${roleContext.sportiv_id}-${roleContext.rol_denumire}`;
        setRoleLoading(contextKey);

        const { error } = await supabase.rpc('switch_primary_context', {
            p_target_context_id: roleContext.id
        });

        if (error) {
            showError("Eroare la setarea rolului", error.message);
            setRoleLoading(null);
        } else {
            showSuccess("Rol Principal Actualizat", "Aplicația se va reîncărca pentru a aplica noul context.");
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    };
    
    return (
        <div className="space-y-8 animate-fade-in-down">
            <header>
                <h1 className="text-4xl font-black text-white">Setări Cont & Profiluri</h1>
                <p className="text-slate-400">Actualizează-ți datele de securitate și gestionează profilurile de lucru.</p>
            </header>

            <Card className="bg-zinc-900 border-zinc-800">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Date Personale & Securitate</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nume" name="nume" value={formData.nume} onChange={handleFormChange} required className="bg-black border-zinc-700"/>
                        <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleFormChange} required className="bg-black border-zinc-700"/>
                    </div>
                    <Input label="Email de Autentificare" name="email" type="email" value={formData.email} onChange={handleFormChange} required className="bg-black border-zinc-700"/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={formData.parola} onChange={handleFormChange} className="bg-black border-zinc-700"/>
                        <Input label="Confirmare Parolă Nouă" name="confirmParola" type="password" value={formData.confirmParola} onChange={handleFormChange} className="bg-black border-zinc-700"/>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" variant="success" isLoading={loading}>Salvează Modificările</Button>
                    </div>
                </form>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <h2 className="text-2xl font-bold text-white mb-4">Profilurile Mele</h2>
                <p className="text-sm text-slate-400 mb-6">Alege profilul principal pe care dorești să-l folosești la următoarea autentificare. Acesta va determina permisiunile și datele vizibile la pornirea aplicației.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(userRoles || []).map((role, index) => {
                        const Icon = getRoleIcon(role.rol_denumire);
                        const isPrimary = role.is_primary;
                        const contextKey = `${role.sportiv_id}-${role.rol_denumire}`;
                        return (
                            <div key={contextKey} className={`relative p-6 rounded-lg transition-all duration-300 ${isPrimary ? 'bg-zinc-800 border-2 border-red-600 shadow-lg shadow-red-900/50' : 'bg-black border border-zinc-800'}`}>
                                {isPrimary && <div className="absolute top-3 right-3 text-xs font-bold bg-red-600 text-white px-2 py-1 rounded-full">Principal</div>}
                                <div className="flex items-center gap-4">
                                    <Icon className={`w-10 h-10 shrink-0 ${isPrimary ? 'text-red-500' : 'text-slate-500'}`} />
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{getRoleDisplayName(role)}</h3>
                                        <p className="text-xs text-slate-400">{role.club?.nume || 'Federație'}</p>
                                    </div>
                                </div>
                                {!isPrimary && (
                                    <div className="mt-4 pt-4 border-t border-zinc-800">
                                        <Button 
                                            variant="primary" 
                                            className="w-full bg-red-600 hover:bg-red-700"
                                            onClick={() => handleSetPrimaryRole(role)}
                                            isLoading={roleLoading === contextKey}
                                            disabled={!!roleLoading}
                                        >
                                            Setează ca Principal
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>
        </div>
    );
};
