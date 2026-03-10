import React, { useState, useMemo } from 'react';
import { Card, Button, Input, Select } from './ui';
import { Plus, Calendar, Users, Globe, Trash2 } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

export const EvenimentePage: React.FC = () => {
    const { evenimente, currentUser } = useData();
    const { showError, showSuccess } = useError();
    const [activeTab, setActiveTab] = useState<'CLUB' | 'FEDERATIE'>('CLUB');
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        denumire: '',
        data: '',
        data_sfarsit: '',
        locatie: '',
        organizator: '',
        tip: 'Stagiu' as 'Stagiu' | 'Competitie',
        probe_disponibile: ['Thao Quyen', 'Co Vo Dao', 'Song Dau']
    });

    const filteredEvenimente = useMemo(() => {
        return (evenimente || []).filter(e => e.tip_eveniment === activeTab);
    }, [evenimente, activeTab]);

    const handleAddEveniment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase.from('evenimente').insert({
                ...formData,
                tip_eveniment: activeTab,
                club_id: activeTab === 'CLUB' ? currentUser?.club_id : null,
                vizibilitate_globala: activeTab === 'FEDERATIE' ? true : false,
            });

            if (error) throw error;
            showSuccess('Succes', 'Eveniment adăugat cu succes!');
            setIsAdding(false);
            setFormData({ denumire: '', data: '', data_sfarsit: '', locatie: '', organizator: '', tip: 'Stagiu', probe_disponibile: ['Thao Quyen', 'Co Vo Dao', 'Song Dau'] });
        } catch (err: any) {
            showError('Eroare', err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Evenimente</h1>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="w-4 h-4 mr-2" /> Adaugă Eveniment
                </Button>
            </div>

            {isAdding && (
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                    <form onSubmit={handleAddEveniment} className="space-y-4">
                        <Input label="Denumire" value={formData.denumire} onChange={e => setFormData({...formData, denumire: e.target.value})} required />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Data Start" type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} required />
                            <Input label="Data Sfârșit" type="date" value={formData.data_sfarsit} onChange={e => setFormData({...formData, data_sfarsit: e.target.value})} required />
                        </div>
                        <Input label="Locație" value={formData.locatie} onChange={e => setFormData({...formData, locatie: e.target.value})} required />
                        <Button type="submit">Salvează</Button>
                    </form>
                </Card>
            )}

            <div className="flex gap-2">
                <Button variant={activeTab === 'CLUB' ? 'primary' : 'secondary'} onClick={() => setActiveTab('CLUB')}>Evenimente Club</Button>
                <Button variant={activeTab === 'FEDERATIE' ? 'primary' : 'secondary'} onClick={() => setActiveTab('FEDERATIE')}>Calendar Național</Button>
            </div>

            <div className="grid gap-4">
                {filteredEvenimente.map(ev => (
                    <Card key={ev.id} className="p-4 bg-zinc-900 border-zinc-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white">{ev.denumire}</h3>
                            <p className="text-sm text-zinc-400">{ev.data} - {ev.locatie}</p>
                        </div>
                        {ev.tip_eveniment === 'FEDERATIE' && <Globe className="text-amber-500" />}
                    </Card>
                ))}
            </div>
        </div>
    );
};
