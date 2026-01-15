import React, { useState, useMemo } from 'react';
import { User, Antrenament, AnuntPrezenta } from '../types';
import { Card, Button, Select, Input } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ChatBubbleLeftEllipsisIcon } from './icons';

interface AnuntPrezentaWidgetProps {
    currentUser: User;
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
}

export const AnuntPrezentaWidget: React.FC<AnuntPrezentaWidgetProps> = ({ currentUser, antrenamente, anunturi, setAnunturi }) => {
    const { showSuccess, showError } = useError();
    const [mode, setMode] = useState<'options' | 'delay' | 'absent'>('options');
    const [delayTime, setDelayTime] = useState('15');
    const [absentReason, setAbsentReason] = useState('');
    const [loading, setLoading] = useState(false);

    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todaysTraining = useMemo(() => {
        return antrenamente.find(a => 
            a.data === todayString &&
            (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
        );
    }, [antrenamente, todayString, currentUser]);

    const existingAnunt = useMemo(() => {
        if (!todaysTraining) return null;
        return anunturi.find(a => a.antrenament_id === todaysTraining.id && a.sportiv_id === currentUser.id);
    }, [anunturi, todaysTraining, currentUser.id]);

    if (!todaysTraining) {
        return null; // Nu afișa nimic dacă nu există antrenament azi
    }

    const handleSendAnunt = async (status: 'Confirm' | 'Intarziat' | 'Absent', detalii: string | null) => {
        if (!supabase) return;
        setLoading(true);

        const anuntData = {
            id: existingAnunt?.id, // Supabase upsert folosește PK pentru a decide update/insert
            antrenament_id: todaysTraining.id,
            sportiv_id: currentUser.id,
            status,
            detalii
        };
        
        const { data, error } = await supabase.from('anunturi_prezenta')
            .upsert(anuntData)
            .select()
            .single();

        setLoading(false);
        if (error) {
            showError("Eroare la trimitere", error);
        } else if (data) {
            showSuccess("Mesaj Trimis", "Anunțul tău a fost trimis instructorului.");
            setAnunturi(prev => {
                const index = prev.findIndex(a => a.antrenament_id === todaysTraining.id && a.sportiv_id === currentUser.id);
                if (index !== -1) {
                    const newAnunturi = [...prev];
                    newAnunturi[index] = data;
                    return newAnunturi;
                } else {
                    return [...prev, data];
                }
            });
            setMode('options'); // Resetează interfața
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
        <Card className="bg-slate-700/30 border-slate-600 mb-6">
            <h3 className="text-lg font-bold text-white mb-2">Antrenamentul de azi ({todaysTraining.ora_start})</h3>
            <p className="text-sm text-slate-400 mb-4">Anunță instructorul despre prezența ta.</p>

            {existingAnunt && mode === 'options' ? renderExistingAnunt() :
                mode === 'options' ? renderOptions() :
                mode === 'delay' ? renderDelayForm() :
                renderAbsentForm()
            }
        </Card>
    );
};