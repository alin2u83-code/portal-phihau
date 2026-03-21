import React, { useState, useEffect } from 'react';
import { AnuntGeneral, User, Club, Grupa, Permissions } from '../types';
import { Button, Card, Input, Select } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

interface NotificariProps {
    onBack: () => void;
    currentUser: User;
    clubs: Club[];
    grupe: Grupa[];
    permissions: Permissions;
}

type TargetType = 'all' | 'club' | 'grupa';

export const Notificari: React.FC<NotificariProps> = ({ onBack, currentUser, clubs, grupe, permissions }) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    // Non-super-admins can only send to their club or specific group — default to 'club'
    const canSendToAll = permissions.isFederationAdmin || permissions.isSuperAdmin;
    const [targetType, setTargetType] = useState<TargetType>(canSendToAll ? 'all' : 'club');
    // For non-super-admin, pre-select own club
    const [targetId, setTargetId] = useState(canSendToAll ? '' : (currentUser.club_id || ''));
    const [history, setHistory] = useState<AnuntGeneral[]>([]);
    const [loading, setLoading] = useState(false);
    const { showError, showSuccess } = useError();

    // Clubs available for selection: all clubs for super admin, own club only for others
    const availableClubs = canSendToAll ? clubs : clubs.filter(c => c.id === currentUser.club_id);
    // Grupe available: all for super admin, only from own club for others
    const availableGrupe = canSendToAll ? grupe : grupe.filter(g => g.club_id === currentUser.club_id);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('notificari')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            if (error) showError("Eroare la preluarea istoricului", error);
            else setHistory(data as AnuntGeneral[]);
        };
        fetchHistory();
    }, [showError]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) { showError("Eroare Configurare", "Clientul Supabase nu este inițializat."); return; }
        if (!title.trim() || !body.trim()) { showError("Date Incomplete", "Titlul și mesajul sunt obligatorii."); return; }
        if (targetType !== 'all' && !targetId) { showError("Destinatar Lipsă", "Vă rugăm selectați clubul sau grupa destinatară."); return; }
        if (!currentUser?.user_id) { showError("Eroare de Autentificare", "ID-ul de utilizator nu a fost găsit."); return; }

        setLoading(true);
        try {
            let query = supabase.from('sportivi').select('user_id').not('user_id', 'is', null);
            if (targetType === 'club') query = query.eq('club_id', targetId);
            else if (targetType === 'grupa') query = query.eq('grupa_id', targetId);
            // For non-super-admin sending to 'club', always restrict to own club
            else if (!canSendToAll) query = query.eq('club_id', currentUser.club_id);

            const { data: sportivi, error: sportiviError } = await query;
            if (sportiviError) throw sportiviError;

            const recipientIds = sportivi.map(s => s.user_id).filter(Boolean);
            if (recipientIds.length === 0) { showError("Niciun Destinatar", "Nu s-au găsit utilizatori în segmentul selectat."); setLoading(false); return; }

            const senderName = `${currentUser.nume || ''} ${currentUser.prenume || ''}`.trim();
            const notificationsToInsert = recipientIds.map(userId => ({
                recipient_user_id: userId,
                title,
                body,
                sent_by: currentUser.user_id,
                sender_sportiv_id: currentUser.id,
                metadata: { sender_name: senderName }
            }));

            const { error: dbError } = await supabase.from('notificari').insert(notificationsToInsert);
            if (dbError) throw dbError;

            showSuccess("Succes", `Anunțul a fost trimis către ${recipientIds.length} utilizatori!`);
            const historyEntry = { ...notificationsToInsert[0], id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
            setHistory(prev => [historyEntry as unknown as AnuntGeneral, ...prev]);
            setTitle('');
            setBody('');
        } catch (error: any) {
            showError("Eroare la trimitere", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Trimite Anunțuri</h1>

            <Card>
                <form onSubmit={handleSend} className="space-y-4">
                    <p className="text-sm text-slate-400">
                        {canSendToAll
                            ? 'Ca administrator federație, poți trimite anunțuri către toți utilizatorii, un club specific sau o grupă.'
                            : 'Anunțurile tale vor fi trimise sportivilor din clubul tău.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select label="Destinatari" value={targetType} onChange={e => { setTargetType(e.target.value as TargetType); setTargetId(canSendToAll ? '' : (currentUser.club_id || '')); }}>
                            {canSendToAll && <option value="all">Toți Utilizatorii</option>}
                            <option value="club">{canSendToAll ? 'Un Anumit Club' : 'Clubul Meu'}</option>
                            <option value="grupa">{canSendToAll ? 'O Anumită Grupă' : 'O Grupă din Clubul Meu'}</option>
                        </Select>

                        {targetType === 'club' && canSendToAll && (
                            <Select label="Alege Clubul" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                                <option value="">Selectează club...</option>
                                {availableClubs.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                            </Select>
                        )}

                        {targetType === 'club' && !canSendToAll && (
                            <div className="flex items-end">
                                <p className="text-sm text-slate-300 pb-2">
                                    {availableClubs.find(c => c.id === currentUser.club_id)?.nume || 'Clubul tău'}
                                </p>
                            </div>
                        )}

                        {targetType === 'grupa' && (
                            <Select label="Alege Grupa" value={targetId} onChange={e => setTargetId(e.target.value)} required>
                                <option value="">Selectează grupa...</option>
                                {availableGrupe.map(g => <option key={g.id} value={g.id}>{g.denumire}{canSendToAll ? ` (${clubs.find(c => c.id === g.club_id)?.nume || 'Club Necunoscut'})` : ''}</option>)}
                            </Select>
                        )}
                    </div>

                    <Input label="Titlu Anunț" value={title} onChange={e => setTitle(e.target.value)} required />
                    <Input label="Mesaj" value={body} onChange={e => setBody(e.target.value)} required />
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
                            <p className="text-xs text-slate-500 mt-1">
                                {(anunt as any).metadata?.sender_name && <span className="mr-2">De la: {(anunt as any).metadata.sender_name}</span>}
                                Trimis la: {new Date((anunt.created_at || '').toString().slice(0, 19)).toLocaleString('ro-RO')}
                            </p>
                        </div>
                    )) : (
                        <p className="text-slate-400 italic">Niciun anunț trimis recent.</p>
                    )}
                </div>
            </Card>
        </div>
    );
};
