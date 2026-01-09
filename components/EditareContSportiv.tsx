import React, { useState } from 'react';
import { Sportiv } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';

interface EditareContSportivProps {
    sportiv: Sportiv;
    onBack: () => void;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

export const EditareContSportiv: React.FC<EditareContSportivProps> = ({ sportiv, onBack, setSportivi }) => {
    const [formData, setFormData] = useState({
        email: sportiv.email,
        username: sportiv.username || '',
        parola: '',
        confirmParola: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        if (formData.parola && formData.parola !== formData.confirmParola) {
            setErrorMessage("Parolele nu se potrivesc.");
            setLoading(false);
            return;
        }

        const emailChanged = formData.email !== sportiv.email;
        const passwordChanged = formData.parola !== '';
        const usernameChanged = formData.username !== sportiv.username;

        if (emailChanged || passwordChanged) {
            alert("FUNCȚIONALITATE RESTRICȚIONATĂ PENTRU ADMIN\n\nActualizarea email-ului sau parolei unui alt utilizator este o operațiune sensibilă care necesită privilegii de administrator Supabase și nu poate fi executată în siguranță direct din client.\n\nImplementarea recomandată este prin intermediul unei funcții server-side (Edge Function) sau prin trimiterea unui email de resetare a parolei utilizatorului.\n\nDoar numele de utilizator va fi actualizat, dacă a fost modificat.");
        }

        if (usernameChanged) {
            if (!supabase) {
                setErrorMessage("Clientul Supabase nu este configurat.");
                setLoading(false);
                return;
            }
            // Verifică unicitatea username-ului
            const { data: existingUser, error: checkError } = await supabase
                .from('sportivi')
                .select('id')
                .eq('username', formData.username)
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

            // Actualizează doar username-ul în profil
            const { data, error } = await supabase
                .from('sportivi')
                .update({ username: formData.username })
                .eq('id', sportiv.id)
                .select()
                .single();

            if (error) {
                setErrorMessage(`Eroare la actualizarea profilului: ${error.message}`);
            } else if (data) {
                setSportivi(prev => prev.map(s => s.id === sportiv.id ? data as Sportiv : s));
                setSuccessMessage("Numele de utilizator a fost actualizat cu succes!");
            }
        } else {
             if (!emailChanged && !passwordChanged) {
                setSuccessMessage("Nicio modificare detectată.");
             }
        }
        
        setLoading(false);
        setFormData(prev => ({...prev, parola: '', confirmParola: ''}));
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Profilul Sportivului
            </Button>
            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <ShieldCheckIcon className="w-8 h-8 text-amber-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Gestionează Cont de Autentificare</h2>
                        <p className="text-slate-300">pentru {sportiv.nume} {sportiv.prenume}</p>
                    </div>
                </div>
                
                <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-amber-300 bg-amber-900/50 p-3 rounded-md">
                        <strong>Atenție:</strong> Modificarea acestor date afectează modul în care utilizatorul se autentifică.
                        Actualizarea email-ului și a parolei sunt funcționalități restricționate din motive de securitate.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Email (Login)" 
                            name="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                        />
                        <Input 
                            label="Nume Utilizator" 
                            name="username" 
                            type="text" 
                            value={formData.username} 
                            onChange={handleChange} 
                            placeholder="ex: ion.popescu"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Parolă Nouă (lasă gol pentru a o păstra)" 
                            name="parola" 
                            type="password" 
                            value={formData.parola} 
                            onChange={handleChange} 
                        />
                        <Input 
                            label="Confirmă Parola Nouă" 
                            name="confirmParola" 
                            type="password" 
                            value={formData.confirmParola} 
                            onChange={handleChange} 
                        />
                    </div>
                    {errorMessage && <p className="text-red-400 text-sm text-center">{errorMessage}</p>}
                    <div className="flex justify-end items-center gap-4 pt-2">
                        {successMessage && <p className="text-green-400 text-sm font-semibold">{successMessage}</p>}
                        <Button type="submit" variant="success" disabled={loading}>
                            {loading ? 'Se salvează...' : 'Salvează Modificările'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};