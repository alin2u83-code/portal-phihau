import React, { useState, useMemo } from 'react';
import { User, Antrenament, AnuntPrezenta } from '../types';
import { Card, Button, Select, Input } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ChatBubbleLeftEllipsisIcon } from './icons';

interface SingleTrainingAnuntProps {
    training: Antrenament;
    currentUser: User;
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
}

const SingleTrainingAnunt: React.FC<SingleTrainingAnuntProps> = ({ training, currentUser, anunturi, setAnunturi }) => {
    const { showSuccess, showError } = useError();
    const [mode, setMode] = useState<'options' | 'delay' | 'absent'>('options');
    const [delayTime, setDelayTime] = useState('15');
    const [absentReason, setAbsentReason] = useState('');
    const [loading, setLoading] = useState(false);

    const existingAnunt = useMemo(() => {
        return anunturi.find(a => a.antrenament_id === training.id && a.sportiv_id === currentUser.id);
    }, [anunturi, training.id, currentUser.id]);

    const handleSendAnunt = async (status: 'Confirm' | 'Intarziat' | 'Absent', detalii: string | null) => {
        if (!supabase) return;
        setLoading(true);

        try {
            let result: { data: AnuntPrezenta | null, error: any };

            if (existingAnunt) {
                // Update existing announcement
                result = await supabase
                    .from('anunturi_prezenta')
                    .update({ status, detalii })
                    .eq('id', existingAnunt.id)
                    .select()
                    .single();
            } else {
                // Insert new announcement
                result = await supabase
                    .from('anunturi_prezenta')
                    .insert({
                        antrenament_id: training.id,
                        sportiv_id: currentUser.id,
                        status,
                        detalii
                    })
                    .select()
                    .single();
            }
            
            const { data, error } = result;

            if (error) {
                throw error;
            }

            if (data) {
                showSuccess("Mesaj Trimis", "Anunțul tău a fost trimis instructorului.");
                setAnunturi(prev => {
                    const index = prev.findIndex(a => a.id === data.id);
                    if (index > -1) {
                        const newAnunturi = [...prev];
                        newAnunturi[index] = data;
                        return newAnunturi;
                    } else {
                        return [...prev, data];
                    }
                });
                setMode('options'); // Reset UI
            }
        } catch (err: any) {
            showError("Eroare la trimitere", err);
        } finally {
            setLoading(false);
        }
    };

    const renderExistingAnunt = () => {
        let statusText = '';
        switch(existingAnunt?.status) {
            case 'Confirm': statusText = 'Prezență confirmată'; break;
            case 'Intarziat': statusText = `Ai anunțat că întârzii`; break;
            case 'Absent': statusText = `Ai anunțat că ești absent`; break;
        }
        return (
            <div className="text-center p-4">
                <ChatBubbleLeftEllipsisIcon className="w-8 h-8 mx-auto text-brand-secondary mb-2" />
                <p className="font-bold text-white">{statusText}</p>
                {existingAnunt?.detalii && <p className="text-sm text-slate-300">Detalii: "{existingAnunt.detalii}"</p>}
                <p className="text-xs text-slate-500 mt-2">Poți schimba statusul trimițând un anunț nou.</p>
            </div>
        );
    };

    const renderOptions = () => (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="success" size="md" className="!py-3" onClick={() => handleSendAnunt('Confirm', null)} isLoading={loading}>Confirm Prezența</Button>
            <Button variant="secondary" size="md" className="!py-3 bg-status-warning hover:bg-amber-600" onClick={() => setMode('delay')} disabled={loading}>Anunț Întârziere</Button>
            <Button variant="danger" size="md" className="!py-3" onClick={() => setMode('absent')} disabled={loading}>Anunț Absență</Button>
        </div>
    );

    const renderDelayForm = () => (
        <div className="flex items-end gap-3">
            <Select label="Voi întârzia cu aprox." value={delayTime} onChange={e => setDelayTime(e.target.value)}>
                <option value="15">15 minute</option>
                <option value="30">30 minute</option>
                <option value="45">45 minute</option>
            </Select>
            <Button variant="primary" onClick={() => handleSendAnunt('Intarziat', `Întârzie ${delayTime} min`)} isLoading={loading}>Trimite</Button>
            <Button variant="secondary" onClick={() => setMode('options')}>Anulează</Button>
        </div>
    );
    
    const renderAbsentForm = () => (
        <div className="flex items-end gap-3">
            <Input label="Motiv (opțional)" value={absentReason} onChange={e => setAbsentReason(e.target.value)} placeholder="Ex: Răcit, Școală..." />
            <Button variant="primary" onClick={() => handleSendAnunt('Absent', absentReason || 'Motiv nespecificat')} isLoading={loading}>Trimite</Button>
            <Button variant="secondary" onClick={() => setMode('options')}>Anulează</Button>
        </div>
    );

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600">
            <p className="font-bold text-white">Antrenament la ora {training.ora_start}</p>
            <p className="text-sm text-slate-400 mb-4">Anunță instructorul despre prezența ta.</p>
            {existingAnunt && mode === 'options' ? renderExistingAnunt() :
                mode === 'options' ? renderOptions() :
                mode === 'delay' ? renderDelayForm() :
                renderAbsentForm()
            }
        </div>
    );
};

interface AnuntPrezentaWidgetProps {
    currentUser: User;
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
}

export const AnuntPrezentaWidget: React.FC<AnuntPrezentaWidgetProps> = ({ currentUser, antrenamente, anunturi, setAnunturi }) => {
    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todaysTrainings = useMemo(() => {
        return antrenamente
            .filter(a => 
                a.data === todayString &&
                (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
            )
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, todayString, currentUser]);

    if (todaysTrainings.length === 0) {
        return null; // Nu afișa nimic dacă nu există antrenament azi
    }
    
    return (
        <Card className="bg-slate-700/30 border-slate-600 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Antrenamentele de Azi</h3>
            <div className="space-y-4">
                {todaysTrainings.map(training => (
                    <SingleTrainingAnunt
                        key={training.id}
                        training={training}
                        currentUser={currentUser}
                        anunturi={anunturi}
                        setAnunturi={setAnunturi}
                    />
                ))}
            </div>
        </Card>
    );
};
