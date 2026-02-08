import React, { useState } from 'react';
import { User, Rol } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, MailIcon, LockIcon, ShieldCheckIcon, UserCircleIcon, UsersIcon, CheckCircleIcon } from './icons';

interface AccountSettingsProps {
    currentUser: User;
    onBack: () => void;
    userRoles: any[]; // Lista completă a contextelor de rol
}

// --- Helper Functions ---
const getRoleDisplayName = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Super Admin Federație';
        case 'Admin': return 'Admin General';
        case 'Admin Club': return `Admin - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'Instructor': return `Instructor - ${role.club?.nume || 'Club Nedefinit'}`;
        case 'Sportiv': return `Sportiv - ${role.sportiv?.nume || ''} ${role.sportiv?.prenume || ''}`;
        default: return role.rol_denumire;
    }
};

const getRoleDescription = (role: any) => {
    switch(role.rol_denumire) {
        case 'SUPER_ADMIN_FEDERATIE': return 'Acces total la nivel de federație.';
        case 'Admin': return 'Acces administrativ general.';
        case 'Admin Club': return `Management complet pentru ${role.club?.nume || 'club'}.`;
        case 'Instructor': return `Management sportivi și prezențe la ${role.club?.nume || 'club'}.`;
        case 'Sportiv': return 'Accesează portalul personal de sportiv.';
        default: return 'Selectează acest profil pentru a continua.';
    }
}

const getRoleIcon = (roleName: Rol['nume']) => {
    switch(roleName) {
        case 'SUPER_ADMIN_FEDERATIE':
        case 'Admin':
            return ShieldCheckIcon;
        case 'Admin Club':
        case 'Instructor':
            return UsersIcon;
        case 'Sportiv':
        default:
            return UserCircleIcon;
    }
};


export const AccountSettings: React.FC<AccountSettingsProps> = ({ currentUser, onBack, userRoles }) => {
    const { showError, showSuccess } = useError();
    
    // Email State
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    // Password State
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Role State
    const [roleLoading, setRoleLoading] = useState<string | null>(null);

    const handleEmailUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Clientul Supabase nu este inițializat."); return; }
        if (!newEmail || newEmail === currentUser.email) { showError("Date Invalide", "Introduceți o adresă de email nouă, diferită de cea curentă."); return; }
        
        setEmailLoading(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        setEmailLoading(false);

        if (error) { showError("Eroare la actualizare email", error.message); } 
        else { showSuccess("Verificați Email-ul", "Un link de confirmare a fost trimis pe ambele adrese de email."); setNewEmail(''); }
    };
    
    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Clientul Supabase nu este inițializat."); return; }
        const { newPassword, confirmPassword } = passwordForm;
        if (!newPassword || newPassword.length < 6) { showError("Parolă Invalidă", "Parola trebuie să conțină cel puțin 6 caractere."); return; }
        if (newPassword !== confirmPassword) { showError("Eroare", "Parolele nu se potrivesc."); return; }
        
        setPasswordLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordLoading(false);

        if (error) { showError("Eroare la actualizare parolă", error.message); } 
        else { showSuccess("Succes", "Parola a fost actualizată cu succes!"); setPasswordForm({ newPassword: '', confirmPassword: '' }); }
    };

    const handleSetPrimaryRole = async (roleContext: any) => {
        if (!supabase) return;
        const contextKey = `${roleContext.sportiv_id}-${roleContext.rol_denumire}`;
        setRoleLoading(contextKey);

        const { error } = await supabase.rpc('set_primary_context', {
            p_sportiv_id: roleContext.sportiv_id,
            p_rol_denumire: roleContext.rol_denumire
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
        <div className="space-y-8 animate-fade-in-down bg-black p-4 md:p-8 rounded-lg">
            <Button onClick={onBack} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header>
                <h1 className="text-4xl font-black text-white">Setări Cont & Profiluri</h1>
                <p className="text-slate-400">Actualizează-ți datele de securitate și gestionează profilurile de lucru.</p>
            </header>

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

            <Card className="bg-zinc-900 border-zinc-800">
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <MailIcon className="w-6 h-6 text-slate-400" />
                        <h2 className="text-xl font-bold text-white">Schimbare Email</h2>
                    </div>
                    <p className="text-sm text-slate-400">Email curent: <strong className="font-mono text-slate-300">{currentUser.email}</strong></p>
                    <Input label="Email Nou" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="introduceti.noul.email@domeniu.com" required className="bg-black border-zinc-700"/>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white" isLoading={emailLoading}>Actualizează Email</Button>
                    </div>
                </form>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                     <div className="flex items-center gap-3 mb-2">
                        <LockIcon className="w-6 h-6 text-slate-400" />
                        <h2 className="text-xl font-bold text-white">Schimbare Parolă</h2>
                    </div>
                    <Input label="Parolă Nouă" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(p => ({...p, newPassword: e.target.value}))} placeholder="Minim 6 caractere" required className="bg-black border-zinc-700"/>
                    <Input label="Confirmare Parolă Nouă" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))} required className="bg-black border-zinc-700"/>
                     <div className="flex justify-end pt-2">
                        <Button type="submit" variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white" isLoading={passwordLoading}>Actualizează Parola</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};