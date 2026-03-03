import React, { useState, useEffect } from 'react';
import { AnuntGeneral, User, Club, Grupa } from '../types';
import { Button, Card, Input, Select } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface NotificariProps {
    onBack: () => void;
    currentUser: User;
    clubs: Club[];
    grupe: Grupa[];
}

type TargetType = 'all' | 'club' | 'grupa';

export const Notificari: React.FC<NotificariProps> = ({ onBack, currentUser, clubs, grupe }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [targetType, setTargetType] = useState<TargetType>('all');
    const [targetId, setTargetId] = useState('');
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
        
        if (targetType !== 'all' && !targetId) {
            showError("Destinatar Lipsă", "Vă rugăm selectați clubul sau grupa destinatară.");
            return;
        }

        if (!currentUser?.user_id) {
            showError("Eroare de Autentificare", "ID-ul de utilizator nu a fost găsit în sesiune. Notificarea nu poate fi trimisă.");
            return;
        }

        setLoading(true);

        try {
            // Pasul 1: Invocă funcția Edge pentru a trimite notificările push
            // Putem adăuga target info în payload dacă funcția o suportă
            const { error: functionError } = await supabase.functions.invoke('send-push-notifications', {
                body: { 
                    title, 
                    body,
                    targetType,
                    targetId
                },
            });

            if (functionError) {
                // Afișează o eroare, dar continuă pentru a salva notificarea in-app
                showError("Eroare Notificări Push", `Nu s-au putut trimite notificările push, dar anunțul va fi vizibil în aplicație. Detalii: ${functionError.message}`);
            }

            // Pasul 2: Salvează notificarea în baza de date (pentru istoric și in-app bell)
            let query = supabase.from('sportivi').select('user_id').not('user_id', 'is', null);
            
            if (targetType === 'club') {
                query = query.eq('club_id', targetId);
            } else if (targetType === 'grupa') {
                query = query.eq('grupa_id', targetId);
            }

            const { data: sportivi, error: sportiviError } = await query;
            if (sportiviError) throw sportiviError;
            
            const recipientIds = sportivi.map(s => s.user_id).filter(Boolean);

            if (recipientIds.length === 0) {
                showError("Niciun Destinatar", "Nu s-au găsit utilizatori în segmentul selectat.");
                setLoading(false);
                return;
            }

            const notificationsToInsert = recipientIds.map(userId => ({
                recipient_user_id: userId,
                title: title,
                body: body,
                sent_by: currentUser.user_id,
                sender_sportiv_id: currentUser.id
            }));

            const { error: dbError } = await supabase.from('notificari').insert(notificationsToInsert);

            if (dbError) {
                throw dbError;
            } else {
                showSuccess("Succes", `Anunțul a fost trimis către ${recipientIds.length} utilizatori!`);
                // Adăugăm o singură instanță în istoric pentru a nu supraîncărca UI-ul
                const historyEntry = { ...notificationsToInsert[0], id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
                setHistory(prev => [historyEntry as unknown as AnuntGeneral, ...prev]);
                setTitle('');
                setBody('');
            }
        } catch (error: any) {
             showError("Eroare la trimitere", `Asigurați-vă că rolul dumneavoastră are permisiunea de a insera în tabelul 'notificari'. Detalii: ${error.message}`);
        } finally {
            setLoading(false);
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Destinatari" value={targetType} onChange={e => { setTargetType(e.target.value as TargetType); setTargetId(''); }}>
                            <option value="all">Toți Utilizatorii</option>
                            <option value="club">Un Anumit Club</option>
                            <option value="grupa">O Anumită Grupă</option>
                        </Select>

                        {targetType === 'club' && (
                            <Select label="Alege Clubul" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                                <option value="">Selectează club...</option>
                                {clubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                            </Select>
                        )}

                        {targetType === 'grupa' && (
                            <Select label="Alege Grupa" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                                <option value="">Selectează grupa...</option>
                                {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire} ({clubs.find(c => c.id === g.club_id)?.nume || 'Club Necunoscut'})</option>)}
                            </Select>
                        )}
                    </div>

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
                            <p className="font-bold text-white">{anunt.title || (anunt as any).titlu}</p>
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
