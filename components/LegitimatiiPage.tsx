import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button, Input } from './ui';
import { useData } from '../contexts/DataContext';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export const LegitimatiiPage: React.FC = () => {
    const { currentUser, activeRoleContext, clubs } = useData();
    const isFederationAdmin = currentUser?.roluri?.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE') ?? false;

    const defaultClubId = isFederationAdmin
        ? ''
        : (activeRoleContext?.club_id ?? '');

    const [legitimatii, setLegitimatii] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClubId, setSelectedClubId] = useState<string>(defaultClubId);

    // Dacă contextul activ se schimbă (ex: switch cont), resetăm selecția de club
    useEffect(() => {
        if (!isFederationAdmin) {
            setSelectedClubId(activeRoleContext?.club_id ?? '');
        }
    }, [activeRoleContext?.club_id, isFederationAdmin]);

    const fetchLegitimatii = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('vedere_gestiune_legitimatii').select('*');

        if (isFederationAdmin) {
            // SUPER_ADMIN vede toate cluburile; poate filtra opțional după dropdown
            if (selectedClubId) {
                query = query.eq('club_id', selectedClubId);
            }
        } else {
            // ADMIN_CLUB / INSTRUCTOR — forțat pe propriul club
            const clubId = activeRoleContext?.club_id;
            if (clubId) {
                query = query.eq('club_id', clubId);
            }
        }

        const { data, error } = await query.order('nume').order('prenume');
        if (error) {
            toast.error('Eroare la încărcarea legitimațiilor');
            console.error(error);
        } else {
            setLegitimatii(data || []);
        }
        setLoading(false);
    }, [isFederationAdmin, selectedClubId, activeRoleContext?.club_id]);

    useEffect(() => {
        fetchLegitimatii();
    }, [fetchLegitimatii]);

    const filteredLegitimatii = useMemo(() => {
        if (!searchTerm.trim()) return legitimatii;
        const term = searchTerm.toLowerCase();
        return legitimatii.filter(
            l =>
                l.nume?.toLowerCase().includes(term) ||
                l.prenume?.toLowerCase().includes(term) ||
                l.nr_legitimatie?.toLowerCase().includes(term)
        );
    }, [legitimatii, searchTerm]);

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Management Legitimații</h2>

            {/* Dropdown club — doar pentru SUPER_ADMIN_FEDERATIE */}
            {isFederationAdmin && (
                <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                        Filtrare Club
                    </label>
                    <select
                        value={selectedClubId}
                        onChange={e => setSelectedClubId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    >
                        <option value="">Toate cluburile</option>
                        {clubs.map(club => (
                            <option key={club.id} value={club.id}>
                                {club.nume}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Căutare */}
            <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">
                    Căutare
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Căutare rapidă (nume, prenume, nr. legitimație)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm touch-manipulation appearance-none"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-slate-400 py-8 text-center">Se încarcă...</div>
            ) : filteredLegitimatii.length === 0 ? (
                <div className="text-slate-500 py-8 text-center">
                    {legitimatii.length === 0
                        ? 'Nu există legitimații înregistrate.'
                        : 'Niciun rezultat pentru căutarea curentă.'}
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 pr-4">Nume</th>
                                    <th className="text-left py-2 pr-4">Prenume</th>
                                    <th className="text-left py-2 pr-4">Grad</th>
                                    {isFederationAdmin && (
                                        <th className="text-left py-2 pr-4">Club</th>
                                    )}
                                    <th className="text-left py-2">Nr. Legitimație</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLegitimatii.map((l, index) => (
                                    <LegitimatieRow
                                        key={l.id || l.sportiv_id || index}
                                        legitimatie={l}
                                        showClub={isFederationAdmin}
                                        onSaved={fetchLegitimatii}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredLegitimatii.map((l, index) => (
                            <LegitimatieCard
                                key={l.id || l.sportiv_id || index}
                                legitimatie={l}
                                showClub={isFederationAdmin}
                                onSaved={fetchLegitimatii}
                            />
                        ))}
                    </div>
                </>
            )}
        </Card>
    );
};

interface LegitimatieProps {
    legitimatie: any;
    showClub: boolean;
    onSaved: () => void;
}

const LegitimatieRow: React.FC<LegitimatieProps> = ({ legitimatie, showClub, onSaved }) => {
    const [value, setValue] = useState(legitimatie.nr_legitimatie || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (value === (legitimatie.nr_legitimatie || '')) return;
        setSaving(true);
        const { error } = await supabase
            .from('sportivi')
            .update({ nr_legitimatie: value })
            .eq('id', legitimatie.id || legitimatie.sportiv_id);

        if (error) {
            toast.error('Eroare la salvare');
            console.error(error);
        } else {
            toast.success('Salvat!');
            onSaved();
        }
        setSaving(false);
    };

    return (
        <tr className="border-b border-slate-700/50">
            <td className="py-2 pr-4">{legitimatie.nume}</td>
            <td className="py-2 pr-4">{legitimatie.prenume}</td>
            <td className="py-2 pr-4">{legitimatie.grad_nume || legitimatie.grad || '—'}</td>
            {showClub && (
                <td className="py-2 pr-4 text-slate-400 text-xs">{legitimatie.club_nume || '—'}</td>
            )}
            <td className="py-2">
                <div className="flex items-center gap-2">
                    <Input
                        label=""
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onBlur={handleSave}
                        disabled={saving}
                    />
                    <Button size="sm" onClick={() => handleSave()} isLoading={saving}>
                        Salvare
                    </Button>
                </div>
            </td>
        </tr>
    );
};

const LegitimatieCard: React.FC<LegitimatieProps> = ({ legitimatie, showClub, onSaved }) => {
    const [value, setValue] = useState(legitimatie.nr_legitimatie || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (value === (legitimatie.nr_legitimatie || '')) return;
        setSaving(true);
        const { error } = await supabase
            .from('sportivi')
            .update({ nr_legitimatie: value })
            .eq('id', legitimatie.id || legitimatie.sportiv_id);

        if (error) {
            toast.error('Eroare la salvare');
            console.error(error);
        } else {
            toast.success('Salvat!');
            onSaved();
        }
        setSaving(false);
    };

    return (
        <Card className="p-4 bg-slate-800">
            <div className="font-bold text-lg">
                {legitimatie.nume} {legitimatie.prenume}
            </div>
            <div className="text-slate-400 text-sm mb-1">
                Grad: {legitimatie.grad_nume || legitimatie.grad || '—'}
            </div>
            {showClub && (
                <div className="text-slate-500 text-xs mb-2">{legitimatie.club_nume || '—'}</div>
            )}
            <Input
                label="Număr Legitimație"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={handleSave}
                disabled={saving}
                className="w-full"
            />
        </Card>
    );
};
