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

    if (loading) return <div>Se încarcă...</div>;

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Management Legitimații</h2>
            <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">Căutare</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Căutare rapidă (nume/prenume)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm touch-manipulation appearance-none"
                    />
                </div>
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
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLegitimatii.map((l, index) => (
                            <LegitimatieRow key={l.sportiv_id || l.id || index} legitimatie={l} />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {filteredLegitimatii.map((l, index) => (
                    <LegitimatieCard key={l.sportiv_id || l.id || index} legitimatie={l} />
                ))}
            </div>
        </Card>
    );
};

const LegitimatieRow: React.FC<{ legitimatie: any }> = ({ legitimatie }) => {
    const [value, setValue] = useState(legitimatie.nr_legitimatie || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (value === legitimatie.nr_legitimatie) return;
        setSaving(true);
        const { error } = await supabase
            .from('sportivi')
            .update({ nr_legitimatie: value })
            .eq('id', legitimatie.id || legitimatie.sportiv_id);

        if (error) {
            toast.error("Eroare la salvare");
            console.error(error);
        } else {
            toast.success("Salvat!");
        }
        setSaving(false);
    };

    return (
        <tr className="border-b border-slate-700/50">
            <td className="py-2">{legitimatie.nume}</td>
            <td className="py-2">{legitimatie.prenume}</td>
            <td className="py-2">{legitimatie.grad}</td>
            <td className="py-2 flex items-center gap-2">
                <Input 
                    label=""
                    value={value} 
                    onChange={(e) => setValue(e.target.value)}
                    disabled={saving}
                />
                <Button size="sm" onClick={handleSave} isLoading={saving}>Salvare</Button>
            </td>
        </tr>
    );
};

const LegitimatieCard: React.FC<{ legitimatie: any }> = ({ legitimatie }) => {
    const [value, setValue] = useState(legitimatie.nr_legitimatie || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (value === legitimatie.nr_legitimatie) return;
        setSaving(true);
        const { error } = await supabase
            .from('sportivi')
            .update({ nr_legitimatie: value })
            .eq('id', legitimatie.id || legitimatie.sportiv_id);

        if (error) {
            toast.error("Eroare la salvare");
            console.error(error);
        } else {
            toast.success("Salvat!");
        }
        setSaving(false);
    };

    return (
        <Card className="p-4 bg-slate-800">
            <div className="font-bold text-lg">{legitimatie.nume} {legitimatie.prenume}</div>
            <div className="text-slate-400 mb-2">Grad: {legitimatie.grad}</div>
            <Input 
                label="Număr Legitimație"
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleSave}
                disabled={saving}
                className="w-full"
            />
        </Card>
    );
};
