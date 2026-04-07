import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button, Card, Input } from './ui';
import { User } from '../types';
import { useError } from './ErrorProvider';
import { ShieldCheckIcon } from './icons';
import { getAuthErrorMessage } from '../utils/error';
import { checkLeakedPassword } from '../utils/checkLeakedPassword';
import { Eye, EyeOff } from 'lucide-react';

interface MandatoryPasswordChangeProps {
    currentUser: User;
    onPasswordChanged: () => void;
}

export const MandatoryPasswordChange: React.FC<MandatoryPasswordChangeProps> = ({ currentUser, onPasswordChanged }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { showError, showSuccess } = useError();

    const validatePassword = () => {
        if (newPassword.length < 8) {
            showError("Parolă Invalidă", "Parola trebuie să conțină cel puțin 8 caractere.");
            return false;
        }
        if (!/\d/.test(newPassword)) {
            showError("Parolă Invalidă", "Parola trebuie să conțină cel puțin o cifră.");
            return false;
        }
        if (newPassword !== confirmPassword) {
            showError("Parolele nu se potrivesc", "Vă rugăm introduceți aceeași parolă în ambele câmpuri.");
            return false;
        }
        return true;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePassword()) {
            return;
        }
        if (!supabase) {
             showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
             return;
        }

        setLoading(true);

        try {
            const { leaked, count } = await checkLeakedPassword(newPassword);
            if (leaked) {
                showError("Parolă Compromisă", `Această parolă a apărut în ${count.toLocaleString()} breșe de securitate cunoscute. Te rugăm să alegi o altă parolă.`);
                setLoading(false);
                return;
            }

            const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
            if (authError) {
                throw authError;
            }

            const { error: profileError } = await supabase
                .from('sportivi')
                .update({ trebuie_schimbata_parola: false })
                .eq('user_id', currentUser.user_id);

            if (profileError) {
                throw new Error(`Parola a fost schimbată, dar a apărut o eroare la actualizarea profilului. Vă rugăm contactați un administrator. Detalii: ${profileError.message}`);
            }

            showSuccess("Parolă Actualizată", "Parola a fost schimbată cu succes. Veți fi redirecționat.");

            setTimeout(() => {
                onPasswordChanged();
            }, 1500);

        } catch (err: any) {
            showError("Eroare", getAuthErrorMessage(err));
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-deep-navy p-4">
            <div className="w-full max-w-md">
                <Card className="border-t-4 border-brand-secondary">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-white">Schimbare Parolă</h1>
                        <p className="text-slate-400 mt-2">Bun venit, {currentUser.prenume}!</p>
                    </div>

                    <div className="p-3 mb-6 text-center text-sm rounded-md bg-blue-900/30 text-blue-300 border border-blue-500/30 flex items-start gap-3">
                         <ShieldCheckIcon className="w-6 h-6 text-blue-300 flex-shrink-0 mt-0.5" />
                         <span>Pentru siguranța datelor tale, te rugăm să alegi o parolă nouă la prima conectare.</span>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="relative">
                            <Input
                                label="Parolă Nouă"
                                id="newPassword"
                                name="newPassword"
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(prev => !prev)}
                                className="absolute right-3 top-[34px] p-1 text-slate-400 hover:text-white active:text-amber-400 transition-colors touch-manipulation"
                                aria-label={showNew ? 'Ascunde parola' : 'Arată parola'}
                            >
                                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="relative">
                            <Input
                                label="Confirmă Parola Nouă"
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(prev => !prev)}
                                className="absolute right-3 top-[34px] p-1 text-slate-400 hover:text-white active:text-amber-400 transition-colors touch-manipulation"
                                aria-label={showConfirm ? 'Ascunde parola' : 'Arată parola'}
                            >
                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="text-xs text-slate-400 pl-1 pt-1">
                            * Minim 8 caractere, cel puțin o cifră.
                        </div>

                        <Button type="submit" className="w-full !mt-6" size="md" disabled={loading} variant="primary">
                            {loading ? 'Se salvează...' : 'Salvează Parola Nouă'}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};
