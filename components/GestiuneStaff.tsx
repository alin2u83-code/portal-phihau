import React, { useState, useMemo } from 'react';
import { User, Club, Rol, Sportiv } from '../types';
import { Button, Card, Input, Select } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface GestiuneStaffProps {
    onBack: () => void;
    currentUser: User;
    clubs: Club[];
    allRoles: Rol[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

const initialFormState = {
    nume: '',
    prenume: '',
    email: '',
    parola: '',
    rol_id: '',
    club_id: '',
};

export const GestiuneStaff: React.FC<GestiuneStaffProps> = ({ onBack, currentUser, clubs, allRoles, setSportivi }) => {
    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    const staffRoles = useMemo(() => {
        return allRoles.filter(r => r.nume === 'Instructor' || r.nume === 'Admin Club' || r.nume === 'Admin');
    }, [allRoles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }

        if (formData.parola.length < 8) {
             showError("Parolă Invalidă", "Parola trebuie să aibă cel puțin 8 caractere.");
            return;
        }

        setLoading(true);

        try {
            // Pasul 1: Crearea utilizatorului în auth.users via Edge Function
            const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
                body: { email: formData.email, password: formData.parola },
            });

            if (authError || authData.error) {
                const errorMessage = authError?.message || authData?.error;
                if (String(errorMessage).includes('User already exists')) {
                     throw new Error('Un utilizator cu acest email există deja în sistemul de autentificare.');
                }
                throw new Error(errorMessage || 'A apărut o eroare la crearea contului de autentificare.');
            }
            
            const newAuthUser = authData.user;
            if (!newAuthUser || !newAuthUser.id) {
                throw new Error('Funcția de creare a utilizatorului nu a returnat un ID valid.');
            }

            // Pasul 2: Crearea profilului în 'sportivi'
            const newSportivProfile: Omit<Sportiv, 'id' | 'roluri' | 'cluburi'> = {
                user_id: newAuthUser.id,
                nume: formData.nume,
                prenume: formData.prenume,
                email: formData.email,
                club_id: formData.club_id,
                data_nasterii: '1990-01-01', // Placeholder
                data_inscrierii: new Date().toISOString().split('T')[0],
                status: 'Activ',
                cnp: null,
                familie_id: null,
                tip_abonament_id: null,
                participa_vacanta: false,
                trebuie_schimbata_parola: true,
            };

            const { data: sportivData, error: sportivError } = await supabase
                .from('sportivi')
                .insert(newSportivProfile)
                .select()
                .single();

            if (sportivError) {
                // Rollback-ul nu este posibil din client, informăm adminul.
                throw new Error(`Contul de autentificare a fost creat, dar profilul nu. Ștergeți manual utilizatorul cu email-ul ${formData.email} din panoul Supabase. Eroare: ${sportivError.message}`);
            }

            // Pasul 3: Atribuirea rolului în 'sportivi_roluri'
            const { error: roleError } = await supabase
                .from('sportivi_roluri')
                .insert({ sportiv_id: sportivData.id, rol_id: formData.rol_id });

            if (roleError) {
                throw new Error(`Profilul a fost creat, dar rolul nu a putut fi atribuit. Atribuiți-l manual din pagina de Management Utilizatori. Eroare: ${roleError.message}`);
            }
            
            // Pasul 4: Actualizarea stării locale și finalizarea
            const rolAtribuit = allRoles.find(r => r.id === formData.rol_id);
            const finalSportivObject: Sportiv = { ...sportivData, roluri: rolAtribuit ? [rolAtribuit] : [] };

            setSportivi(prev => [...prev, finalSportivObject]);
            showSuccess("Operațiune finalizată!", `${formData.nume} ${formData.prenume} a fost adăugat ca ${rolAtribuit?.nume}. Utilizatorul va trebui să-și schimbe parola la prima autentificare.`);
            setFormData(initialFormState);

        } catch (err: any) {
            showError("Operațiune eșuată", err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
            
            <Card>
                 <div className="flex items-center gap-3 mb-4">
                    <ShieldCheckIcon className="w-8 h-8 text-amber-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gestiune Staff</h1>
                        <p className="text-slate-300">Creează un profil nou pentru un instructor sau administrator de club.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6 pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nume" name="nume" value={formData.nume} onChange={handleChange} required />
                        <Input label="Prenume" name="prenume" value={formData.prenume} onChange={handleChange} required />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Email (pentru login)" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        <Input label="Parolă Inițială" name="parola" type="password" value={formData.parola} onChange={handleChange} required placeholder="Minim 8 caractere"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Rol" name="rol_id" value={formData.rol_id} onChange={handleChange} required>
                            <option value="">Alege un rol...</option>
                            {staffRoles.map(r => <option key={r.id} value={r.id}>{r.nume}</option>)}
                        </Select>
                        <Select label="Club" name="club_id" value={formData.club_id} onChange={handleChange} required>
                            <option value="">Alege un club...</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                        </Select>
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" variant="success" isLoading={loading} className="px-8">
                            Creează Utilizator Staff
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
