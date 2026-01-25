import React, { useState, useMemo } from 'react';
import { Eveniment, Rezultat, User } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';
import { supabase } from '../supabaseClient';

interface EventCardProps {
    event: Eveniment;
    isFuture: boolean;
    onCancelRegistration?: () => Promise<void>;
}

const EventCard: React.FC<EventCardProps> = ({ event, isFuture, onCancelRegistration }) => {
    const [loading, setLoading] = useState(false);

    const handleCancel = async () => {
        if (onCancelRegistration) {
            setLoading(true);
            await onCancelRegistration();
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-800/70 border-brand-secondary/20 hover:border-brand-secondary/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>{event.denumire}</h3>
                    <p className="text-sm text-slate-300 mt-1">{new Date(event.data).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })} - {event.locatie}</p>
                </div>
                {isFuture && (
                    <div className="flex gap-2 self-end sm:self-center">
                        <Button variant="secondary" size="sm">Vezi Detalii</Button>
                        <Button variant="danger" size="sm" onClick={handleCancel} disabled={loading}>
                            {loading ? 'Se anulează...' : 'Anulează Înscrierea'}
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
};


interface EvenimenteleMeleProps {
    viewedUser: User;
    evenimente: Eveniment[];
    rezultate: Rezultat[];
    setRezultate: React.Dispatch<React.SetStateAction<Rezultat[]>>;
    onBack: () => void;
}

export const EvenimenteleMele: React.FC<EvenimenteleMeleProps> = ({ viewedUser, evenimente, rezultate, setRezultate, onBack }) => {
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const userEventRegistrations = useMemo(() => {
        const userRezultateIds = new Set(rezultate.filter(r => r.sportiv_id === viewedUser.id).map(r => r.eveniment_id));
        return evenimente
            .filter(ev => userRezultateIds.has(ev.id))
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [rezultate, evenimente, viewedUser.id]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEvents = userEventRegistrations.filter(ev => new Date(ev.data) >= today);
    const pastEvents = userEventRegistrations.filter(ev => new Date(ev.data) < today);

    const handleCancelRegistration = async (eventId: string) => {
        if (!supabase) {
            setFeedback({ type: 'error', message: 'Eroare de configurare.' });
            return;
        }

        const registration = rezultate.find(r => r.sportiv_id === viewedUser.id && r.eveniment_id === eventId);
        if (!registration) {
            setFeedback({ type: 'error', message: 'Înscrierea nu a fost găsită.' });
            return;
        }

        if (!window.confirm("Sunteți sigur că doriți să anulați înscrierea la acest eveniment?")) return;

        const { error } = await supabase.from('rezultate').delete().eq('id', registration.id);
        if (error) {
            setFeedback({ type: 'error', message: `Eroare la anulare: ${error.message}` });
        } else {
            setRezultate(prev => prev.filter(r => r.id !== registration.id));
            setFeedback({ type: 'success', message: 'Înscrierea a fost anulată cu succes.' });
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const TabButton: React.FC<{ tab: 'active' | 'history', label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === tab ? 'bg-slate-800/70 text-brand-secondary border-b-2 border-brand-secondary' : 'text-white/70 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6 text-slate-300 hover:text-white">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Evenimentele Mele</h1>
            <p className="text-slate-300 mb-6">Vizualizează evenimentele viitoare la care te-ai înscris și istoricul participărilor tale.</p>

            {feedback && (
                <div className={`p-3 rounded-md mb-4 text-center font-semibold text-white ${feedback.type === 'success' ? 'bg-green-600/50' : 'bg-red-600/50'}`}>
                    {feedback.message}
                </div>
            )}
            
            <div className="border-b border-slate-700 mb-6">
                <TabButton tab="active" label={`Înscrieri Active (${activeEvents.length})`} />
                <TabButton tab="history" label={`Istoric Participări (${pastEvents.length})`} />
            </div>

            <div className="space-y-4">
                {activeTab === 'active' && (
                    activeEvents.length > 0 ? activeEvents.map(ev => (
                        <EventCard key={ev.id} event={ev} isFuture={true} onCancelRegistration={() => handleCancelRegistration(ev.id)} />
                    )) : <p className="text-slate-400 italic text-center py-8">Nu ești înscris la niciun eveniment viitor.</p>
                )}
                {activeTab === 'history' && (
                    pastEvents.length > 0 ? pastEvents.map(ev => (
                        <EventCard key={ev.id} event={ev} isFuture={false} />
                    )) : <p className="text-slate-400 italic text-center py-8">Nu ai participat la niciun eveniment în trecut.</p>
                )}
            </div>
        </div>
    );
};