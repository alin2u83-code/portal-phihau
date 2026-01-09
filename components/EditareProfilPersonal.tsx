import React, { useState } from 'react';
import { Sportiv, User } from '../types';
import { Button, Input, Card } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

interface EditareProfilPersonalProps {
    user: User;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    onBack: () => void;
}

export const EditareProfilPersonal: React.FC<EditareProfilPersonalProps> = ({ user, setSportivi, setCurrentUser, onBack }) => {
    const [formData, setFormData] = useState({
        nume: user.nume,
        prenume: user.prenume,
        email: user.email,
        username: user.username || '',
        parola: '',
        confirmParola: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.toLowerCase());
    };

    const validateUsername = (username: string) => {
        // Litere, cifre, puncte și underscore, minim 3 caractere
        const re = /^[a-zA-Z0-9._]{3,20}$/;
        return re.test(username);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validări Frontend
        if (!validateEmail(formData.email)) {
            setErrorMessage("Adresa de email nu are un format valid.");
            return;
        }

        if (formData.username && !validateUsername(formData.username)) {
            setErrorMessage("Numele de utilizator trebuie să aibă între 3 și 20 de caractere și poate conține doar litere, cifre, puncte (.) sau underscore (_).");
            return;
        }

        if (formData.parola && formData.parola.length < 6) {
            setErrorMessage("Parola trebuie să aibă cel puțin 6 caractere.");
            return;
        }

        if (formData.parola && formData.parola !== formData.confirmParola) {
            setErrorMessage("Parolele nu se potrivesc.");
            return;
        }

        if (!supabase) {
            setErrorMessage("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        // Verifică unicitatea username-ului dacă a fost schimbat
        if (formData.username && formData.username !== user.username) {
            const { data: existingUser, error: checkError } = await supabase
                .from('sportivi')
                .select('id')
                .eq('username', formData.username)
                .not('id', 'eq', user.id)
                .limit(1);

            if (checkError) {
                setErrorMessage(`Eroare la verificare: ${checkError.message}`);
                setLoading(false);
                return;
            }
            if (existingUser && existingUser.length > 0) {
                setErrorMessage('Acest nume de utilizator este deja folosit.');
                setLoading(false);
                return;
            }
        }

        // 1. Actualizează datele de autentificare dacă s-au schimbat
        const authUpdates: any = {};
        if (formData.email !== user.email) authUpdates.email = formData.email;
        if (formData.parola) authUpdates.password = formData.parola;

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) {
                setErrorMessage(`Eroare la actualizarea autentificării: ${authError.message}`);
                setLoading(false);
                return;
            }
        }

        // 2. Actualizează profilul în tabelul 'sportivi'
        const profileUpdates = {
            nume: formData.nume,
            prenume: formData.prenume,
            email: formData.email,
            username: formData.username,
        };
        const { data, error } = await supabase.from('sportivi').update(profileUpdates).eq('user_id', user.user_id).select().single();

        if (error) {
            setErrorMessage(`Eroare la actualizarea profilului: ${error.message}`);
            setLoading(false);
            return;
        }

        // 3. Actualizează starea locală
        if(data) {
            const updatedUser = data as User;
            setSportivi(prev => prev.map(s => s.id === user.id ? updatedUser : s));
            setCurrentUser(updatedUser);
        }
        
        setSuccessMessage("Profilul a fost actualizat cu succes!");
        setFormData(prev => ({ ...prev, parola: '', confirmParola: '' }));
        setTimeout(() => setSuccessMessage(''), 3000);
        setLoading(false);
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            <Card>
                <h2 className="text-2xl font-bold text-white mb-4">Profil & Securitate</h2>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nume" name="nume" value={formData.nume} onChange={handleChange} required />
                        <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleChange} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Email (Login)" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        <Input label="Nume Utilizator" name="username" type="text" value={formData.username} onChange={handleChange} placeholder="ex: ion.popescu"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Parolă Nouă (lasă gol pentru a o păstra)" name="parola" type="password" value={formData.parola} onChange={handleChange} />
                        <Input label="Confirmă Parola Nouă" name="confirmParola" type="password" value={formData.confirmParola} onChange={handleChange} />
                    </div>
                    {errorMessage && <p className="text-red-400 text-sm p-3 bg-red-900/30 rounded-md border border-red-500/30">{errorMessage}</p>}
                    <div className="flex justify-end items-center gap-4 pt-2">
                        {successMessage && <p className="text-green-400 text-sm font-semibold">{successMessage}</p>}
                        <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Modificările'}</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
