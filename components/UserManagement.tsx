import React, { useState } from 'react';
import { Sportiv, User } from '../types';
import { Button, Input, Card, Select } from './ui';
import { ArrowLeftIcon, EditIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';

// Componenta pentru editarea profilului personal
const MyProfile: React.FC<{ user: User; setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>; setCurrentUser: React.Dispatch<React.SetStateAction<User | null>> }> = ({ user, setSportivi, setCurrentUser }) => {
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setErrorMessage("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        if (formData.parola && formData.parola !== formData.confirmParola) {
            setErrorMessage("Parolele nu se potrivesc.");
            return;
        }
        
        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        // 0. Verifică unicitatea username-ului dacă a fost schimbat
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
                setErrorMessage('Numele de utilizator este deja folosit.');
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
        <Card className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Profilul Meu</h2>
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
                {errorMessage && <p className="text-red-400 text-sm text-center">{errorMessage}</p>}
                <div className="flex justify-end items-center gap-4 pt-2">
                    {successMessage && <p className="text-green-400 text-sm font-semibold">{successMessage}</p>}
                    <Button type="submit" variant="success" disabled={loading}>{loading ? 'Se salvează...' : 'Salvează Modificările'}</Button>
                </div>
            </form>
        </Card>
    );
};


interface UserManagementProps {
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    onBack: () => void;
    currentUser: User;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const UserManagement: React.FC<UserManagementProps> = ({ sportivi, setSportivi, onBack, currentUser, setCurrentUser }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRol, setNewRol] = useState<User['rol']>('Sportiv');
    const [showSuccessId, setShowSuccessId] = useState<string | null>(null);
    
    const handleEdit = (user: User) => {
        setEditingId(user.id);
        setNewRol(user.rol);
    };

    const handleCancel = () => {
        setEditingId(null);
    };

    const handleSave = async (userId: string) => {
        if (!supabase) {
            alert("Eroare de configurare: Conexiunea la baza de date nu a putut fi stabilită.");
            return;
        }
        const { data, error } = await supabase.from('sportivi').update({ rol: newRol }).eq('id', userId).select().single();
        
        if (error) {
            alert(`Eroare la actualizarea rolului: ${error.message}`);
            return;
        }

        if(data) {
            setSportivi(prev => prev.map(s => s.id === userId ? data as Sportiv : s));
        }
        
        setShowSuccessId(userId);
        setEditingId(null);
        setTimeout(() => setShowSuccessId(null), 3000);
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            
            <MyProfile user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} />

            {currentUser.rol === 'Admin' && (
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheckIcon className="w-8 h-8 text-amber-400"/>
                        <h2 className="text-2xl font-bold text-white">Panou Administrator - Management Roluri</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="p-4 font-semibold">Nume Utilizator</th>
                                    <th className="p-4 font-semibold">Email (Login)</th>
                                    <th className="p-4 font-semibold">Rol</th>
                                    <th className="p-4 font-semibold text-right">Acțiuni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sportivi.map(user => (
                                    <tr key={user.id} className="border-b border-slate-700">
                                        <td className="p-4 font-medium">{user.nume} {user.prenume}</td>
                                        <td className="p-4">{user.email}</td>
                                        {editingId === user.id ? (
                                            <>
                                                <td className="p-2">
                                                    <Select label="" name="rol" value={newRol} onChange={e => setNewRol(e.target.value as User['rol'])} disabled={user.id === currentUser.id}>
                                                        <option value="Sportiv">Sportiv</option>
                                                        <option value="Instructor">Instructor</option>
                                                        <option value="Admin">Admin</option>
                                                    </Select>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="success" onClick={() => handleSave(user.id)}>Salvează</Button>
                                                        <Button size="sm" variant="secondary" onClick={handleCancel}>Anulează</Button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${user.rol === 'Admin' ? 'bg-amber-600' : user.rol === 'Instructor' ? 'bg-sky-600' : 'bg-slate-600'}`}>
                                                        {user.rol}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {showSuccessId === user.id && <span className="text-sm text-green-400">Salvat!</span>}
                                                        <Button onClick={() => handleEdit(user)} variant="primary" size="sm" disabled={user.id === currentUser.id}><EditIcon /></Button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};