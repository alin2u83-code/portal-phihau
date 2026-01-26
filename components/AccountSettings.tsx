import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, MailIcon, LockIcon } from './icons';

interface AccountSettingsProps {
    currentUser: User;
    onBack: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ currentUser, onBack }) => {
    const { showError, showSuccess } = useError();
    
    // Email State
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    // Password State
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handleEmailUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        if (!newEmail || newEmail === currentUser.email) {
            showError("Date Invalide", "Introduceți o adresă de email nouă, diferită de cea curentă.");
            return;
        }
        setEmailLoading(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        setEmailLoading(false);

        if (error) {
            showError("Eroare la actualizare email", error.message);
        } else {
            showSuccess("Verificați Email-ul", "Un link de confirmare a fost trimis pe ambele adrese de email.");
            setNewEmail('');
        }
    };
    
    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        const { newPassword, confirmPassword } = passwordForm;
        if (!newPassword || newPassword.length < 6) {
            showError("Parolă Invalidă", "Parola trebuie să conțină cel puțin 6 caractere.");
            return;
        }
        if (newPassword !== confirmPassword) {
            showError("Eroare", "Parolele nu se potrivesc.");
            return;
        }
        
        setPasswordLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordLoading(false);

        if (error) {
            showError("Eroare la actualizare parolă", error.message);
        } else {
            showSuccess("Succes", "Parola a fost actualizată cu succes!");
            setPasswordForm({ newPassword: '', confirmPassword: '' });
        }
    };
    
    return (
        <div className="space-y-8 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header>
                <h1 className="text-3xl font-bold text-white">Setări de Securitate</h1>
                <p className="text-slate-400">Actualizează-ți adresa de email și parola.</p>
            </header>

            <Card className="bg-slate-800/50 backdrop-blur-sm border border-amber-300/20">
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <MailIcon className="w-6 h-6 text-amber-300" />
                        <h2 className="text-xl font-bold text-white">Schimbare Email</h2>
                    </div>
                    <p className="text-sm text-slate-400">Email curent: <strong className="font-mono text-slate-300">{currentUser.email}</strong></p>
                    <Input 
                        label="Email Nou" 
                        type="email" 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                        placeholder="introduceti.noul.email@domeniu.com"
                        required
                    />
                    <p className="!mt-2 text-xs text-amber-400/80 bg-amber-900/30 p-2 rounded-md border border-amber-400/20">
                        <strong>Atenție:</strong> Va trebui să confirmi schimbarea de pe ambele adrese de email (cea veche și cea nouă).
                    </p>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" variant="primary" isLoading={emailLoading}>Actualizează Email</Button>
                    </div>
                </form>
            </Card>

            <Card className="bg-slate-800/50 backdrop-blur-sm border border-amber-300/20">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                     <div className="flex items-center gap-3 mb-2">
                        <LockIcon className="w-6 h-6 text-amber-300" />
                        <h2 className="text-xl font-bold text-white">Schimbare Parolă</h2>
                    </div>
                    <Input 
                        label="Parolă Nouă" 
                        type="password" 
                        value={passwordForm.newPassword} 
                        onChange={(e) => setPasswordForm(p => ({...p, newPassword: e.target.value}))}
                        placeholder="Minim 6 caractere"
                        required
                    />
                    <Input 
                        label="Confirmare Parolă Nouă" 
                        type="password" 
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(p => ({...p, confirmPassword: e.target.value}))}
                        required
                    />
                     <div className="flex justify-end pt-2">
                        <Button type="submit" variant="primary" isLoading={passwordLoading}>Actualizează Parola</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};