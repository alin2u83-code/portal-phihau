import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button, Input } from './ui';
import { useData } from '../contexts/DataContext';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export const LegitimatiiPage: React.FC = () => {
    const [legitimatii, setLegitimatii] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchLegitimatii = async () => {
            const { data, error } = await supabase.from('vedere_gestiune_legitimatii').select('*');
            if (error) {
                toast.error("Eroare la încărcarea legitimațiilor");
                console.error(error);
            } else {
                setLegitimatii(data || []);
            }
            setLoading(false);
        };
        fetchLegitimatii();
    }, []);

    const filteredLegitimatii = useMemo(() => {
        return legitimatii.filter(l => 
            l.nume.toLowerCase().includes(searchTerm.toLowerCase()) || 
            l.prenume.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [legitimatii, searchTerm]);

    const handleSave = async (sportivId: string, nrLegitimatie: string) => {
        setSavingId(sportivId);
        const { error } = await supabase
            .from('sportivi')
            .update({ nr_legitimatie: nrLegitimatie })
            .eq('id', sportivId);

        if (error) {
            toast.error("Eroare la salvarea numărului de legitimație");
            console.error(error);
        } else {
            toast.success("Numărul de legitimație a fost salvat!");
            setLegitimatii(prev => prev.map(l => l.sportiv_id === sportivId ? { ...l, nr_legitimatie: nrLegitimatie } : l));
        }
        setSavingId(null);
    };

    if (loading) return <div>Se încarcă...</div>;

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Management Legitimații</h2>
            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input 
                    label="Căutare"
                    placeholder="Căutare rapidă (nume/prenume)..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="text-left py-2">Nume</th>
                            <th className="text-left py-2">Prenume</th>
                            <th className="text-left py-2">Grad</th>
                            <th className="text-left py-2">Nr. Legitimație</th>
                            <th className="text-left py-2">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLegitimatii.map((l, index) => (
                            <tr key={`${l.sportiv_id}-${index}`} className="border-b border-slate-700/50">
                                <td className="py-2">{l.nume}</td>
                                <td className="py-2">{l.prenume}</td>
                                <td className="py-2">{l.grad}</td>
                                <td className="py-2">
                                    <Input 
                                        label="Nr. Legitimație"
                                        value={l.nr_legitimatie || ''} 
                                        onChange={(e) => setLegitimatii(prev => prev.map(item => item.sportiv_id === l.sportiv_id ? {...item, nr_legitimatie: e.target.value} : item))}
                                    />
                                </td>
                                <td className="py-2">
                                    <Button size="sm" onClick={() => handleSave(l.sportiv_id, l.nr_legitimatie)} isLoading={savingId === l.sportiv_id}>Salvare</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {filteredLegitimatii.map((l, index) => (
                    <Card key={`${l.sportiv_id}-${index}`} className="p-4 bg-slate-800">
                        <div className="font-bold text-lg">{l.nume} {l.prenume}</div>
                        <div className="text-slate-400 mb-2">Grad: {l.grad}</div>
                        <Input 
                            label="Număr Legitimație"
                            value={l.nr_legitimatie || ''} 
                            onChange={(e) => setLegitimatii(prev => prev.map(item => item.sportiv_id === l.sportiv_id ? {...item, nr_legitimatie: e.target.value} : item))}
                            onBlur={() => handleSave(l.sportiv_id, l.nr_legitimatie)}
                        />
                    </Card>
                ))}
            </div>
        </Card>
    );
};
