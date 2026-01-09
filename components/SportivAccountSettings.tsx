import React, { useState, useEffect } from 'react';
import { Sportiv } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';

interface SportivAccountSettingsProps {
    sportiv: Sportiv;
    onBack: () => void;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

const ALL_ROLES: ('Admin' | 'Instructor' | 'Sportiv')[] = ['Admin', 'Instructor', 'Sportiv'];

export const SportivAccountSettings: React.FC<SportivAccountSettingsProps> = ({ sportiv, onBack, setSportivi }) => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        roluri: [] as ('Admin' | 'Instructor' | 'Sportiv')[],
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setFormData({
            email: sportiv.email,
            username: sportiv.username || '',
            roluri: sportiv.roluri || ['Sportiv'],
        });
    }, [sportiv]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleRoleChange = (role: 'Admin' | 'Instructor' | 'Sportiv', isChecked: boolean) => {
        setFormData(prev => {
            const updatedRoles = isChecked
                ? [...new Set([...prev.roluri, role])]
                : prev.roluri.filter(r => r !== role);
            
            if (updatedRoles.length === 0) return { ...prev, roluri: ['Sportiv'] }; // Must have at least one role
            return { ...prev, roluri: updatedRoles };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { setErrorMessage("Clientul Supabase nu este configurat."); return; }
        
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        const cleanedUsername = formData.username.toLowerCase().replace(/\s/g, '');

        if (cleanedUsername && cleanedUsername !== sportiv.username) {
            const { data: existingUser, error: checkError } = await supabase.from('sportivi').select('id').eq('username', cleanedUsername).not('id', 'eq', sportiv.id).limit(1);
            if (checkError) { setErrorMessage(`Eroare la verificare username: ${checkError.message}`); setLoading(false); return; }
            if (existingUser && existingUser.length > 0) { setErrorMessage('Numele de utilizator este deja folosit.'); setLoading(false); return; }
        }

        const updates = {
            roluri: formData.roluri,
            username: cleanedUsername,
            email: formData.email,
        };

        const { data, error } = await supabase.from('sportivi').update(updates).eq('id', sportiv.id).select().single();

        if (error) {
            setErrorMessage(`Eroare la actualizarea profilului: ${error.message}`);
        } else if (data) {
            setSportivi(prev => prev.map(s => s.id === sportiv.id ? data as Sportiv : s));
            setSuccessMessage("Setările contului au fost actualizate cu succes!");
        }
        
        setLoading(false);
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const handleResetPassword = async () => {
        if (!supabase) return;
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');
        const { error } = await supabase.auth.resetPasswordForEmail(sportiv.email, {
            redirectTo: window.location.origin,
        });
        setLoading(false);
        if (error) {
            setErrorMessage(`Eroare resetare: ${error.message}`);
        } else {
            setSuccessMessage("Email de resetare parolă trimis sportivului!");
        }
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
                        <h2 className="text-2xl font-bold text-white">Setări Cont & Roluri</h2>
                        <p className="text-slate-400">pentru {sportiv.nume} {sportiv.prenume}</p>
                    </div>
                </div>
                
                <form onSubmit={handleSave} className="space-y-6 pt-6 border-t border-slate-700">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Roluri</h3>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 p-4 bg-slate-700/50 rounded-lg">
                            {ALL_ROLES.map(role => (
                                <label key={role} className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500"
                                        checked={formData.roluri.includes(role)}
                                        onChange={(e) => handleRoleChange(role, e.target.checked)}
                                    />
                                    <span>{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Date de Autentificare</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-700/50 rounded-lg">
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
                                required 
                            />
                        </div>
                    </div>
                    
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-2">Resetare Parolă</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Pentru a reseta parola, trimite un link securizat pe adresa de email a utilizatorului.
                        </p>
                        <Button type="button" onClick={handleResetPassword} variant="secondary" size="sm" disabled={loading}>
                            Trimite Link Resetare Email
                        </Button>
                    </div>

                    {errorMessage && <div className="p-3 bg-status-danger/20 text-status-danger rounded-md text-sm text-center">{errorMessage}</div>}
                    {successMessage && <div className="p-3 bg-status-success/20 text-status-success rounded-md text-sm text-center font-bold">{successMessage}</div>}

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