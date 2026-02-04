import React, { useState, useEffect } from 'react';
import { AnuntGeneral, User } from '../types';
import { Button, Card, Input } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface NotificariProps {
    onBack: () => void;
    currentUser: User;
}

export const Notificari: React.FC<NotificariProps> = ({ onBack, currentUser }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [history, setHistory] = useState<AnuntGeneral[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    useEffect(() => {
        const fetchHistory = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('notificari')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                showError("Eroare la preluarea istoricului", error);
            } else {
                setHistory(data as AnuntGeneral[]);
            }
        };
        fetchHistory();
    }, [showError]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
             showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
             return;
        }
        if (!title.trim() || !body.trim()) {
            showError("Date Incomplete", "Titlul și mesajul sunt obligatorii.");
            return;
        }
        
        // Verifică dacă utilizatorul curent are un user_id valid (UUID) înainte de a trimite.
        // Aceasta este cheia pentru a respecta constrângerea de cheie străină `sent_by`.
        if (!currentUser?.user_id) {
            showError("Eroare de Autentificare", "ID-ul de utilizator nu a fost găsit în sesiune. Notificarea nu poate fi trimisă.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from('notificari')
            .insert({
                title: title, // Coloana 'title' este folosită corect
                body: body,   // Coloana 'body' (înlocuitor pentru 'mesaj') este folosită corect
                sent_by: currentUser.user_id, // Se folosește user_id-ul valid
                sender_sportiv_id: currentUser.id,
            })
            .select()
            .single();

        setLoading(false);

        if (error) {
            showError("Eroare la trimitere", `Asigurați-vă că rolul dumneavoastră are permisiunea de a insera în tabelul 'notificari'. Detalii: ${error.message}`);
        } else if (data) {
            showSuccess("Succes", "Anunțul a fost trimis cu succes!");
            setHistory(prev => [data as AnuntGeneral, ...prev]);
            setTitle('');
            setBody('');
        }
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Trimite Anunțuri (Notificări)</h1>
            
            <Card>
                <form onSubmit={handleSend} className="space-y-4">
                    <p className="text-sm text-slate-400">
                        Anunțurile trimise aici vor apărea ca o notificare pe ecran pentru toți utilizatorii care au aplicația deschisă și au permis notificările în browser.
                    </p>
                    <Input label="Titlu Notificare" value={title} onChange={e => setTitle(e.target.value)} required />
                    <Input label="Mesaj Notificare" value={body} onChange={e => setBody(e.target.value)} required />
                    <div className="flex justify-end">
                        <Button type="submit" variant="primary" isLoading={loading}>Trimite Anunțul</Button>
                    </div>
                </form>
            </Card>

            <Card>
                <h3 className="text-xl font-bold text-white mb-4">Ultimele Anunțuri Trimise</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.length > 0 ? history.map(anunt => (
                        <div key={anunt.id} className="bg-slate-700/50 p-3 rounded-md">
                            <p className="font-bold text-white">{anunt.title}</p>
                            <p className="text-sm text-slate-300">{anunt.body}</p>
                            <p className="text-xs text-slate-500 mt-1">Trimis la: {new Date(anunt.created_at).toLocaleString('ro-RO')}</p>
                        </div>
                    )) : (
                        <p className="text-slate-400 italic">Niciun anunț trimis recent.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};