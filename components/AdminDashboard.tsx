import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useDataProvider } from '../hooks/useDataProvider';
import { View } from '../types';
import { Card } from './ui';
import { UsersIcon, CreditCardIcon, BuildingOfficeIcon, TrophyIcon } from './icons';

interface AdminDashboardProps {
    onNavigate: (view: View) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const { currentUser, activeRoleContext } = useDataProvider();
    const permissions = usePermissions(activeRoleContext);

    const [counts, setCounts] = useState<{ sportivi: number; plati: number; cluburi: number; utilizatori: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!permissions.isFederationAdmin) {
            onNavigate('dashboard');
            return;
        }

        const fetchCounts = async () => {
            try {
                const [sportiviCount, platiCount, cluburiCount, utilizatoriCount] = await Promise.all([
                    supabase.from('sportivi').select('*', { count: 'exact', head: true }),
                    supabase.from('plati').select('*', { count: 'exact', head: true }),
                    supabase.from('cluburi').select('*', { count: 'exact', head: true }),
                    supabase.from('user_roles').select('*', { count: 'exact', head: true })
                ]);

                setCounts({
                    sportivi: sportiviCount.count || 0,
                    plati: platiCount.count || 0,
                    cluburi: cluburiCount.count || 0,
                    utilizatori: utilizatoriCount.count || 0
                });
            } catch (error) {
                console.error('Error fetching admin counts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCounts();
    }, [permissions.isFederationAdmin, onNavigate]);

    if (loading) {
        return <Card className="p-8 text-center bg-slate-900 border-slate-800 text-slate-400">Se încarcă datele administrative...</Card>;
    }

    if (!permissions.isFederationAdmin) {
        return (
            <Card className="p-4 text-center bg-red-900/20 border-red-900/50 text-red-400">
                <p>Acces restricționat. Redirecționare...</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white mb-6">Panou Administrativ</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-400">Sportivi Total</h3>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                            <UsersIcon className="w-6 h-6 text-sky-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{counts?.sportivi}</p>
                </Card>
                
                <Card className="p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-400">Plăți Înregistrate</h3>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                            <CreditCardIcon className="w-6 h-6 text-emerald-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{counts?.plati}</p>
                </Card>
                
                <Card className="p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-400">Cluburi Active</h3>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                            <BuildingOfficeIcon className="w-6 h-6 text-amber-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{counts?.cluburi}</p>
                </Card>

                <Card className="p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-400">Utilizatori</h3>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                            <UsersIcon className="w-6 h-6 text-violet-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{counts?.utilizatori}</p>
                </Card>
            </div>

            <h2 className="text-xl font-bold text-white mt-8 mb-4">Acțiuni Rapide</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group cursor-pointer" onClick={() => onNavigate('stagii')}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-400">Stagii</h3>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                            <TrophyIcon className="w-6 h-6 text-indigo-500" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group cursor-pointer" onClick={() => onNavigate('competitii')}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-slate-400">Competiții</h3>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                            <TrophyIcon className="w-6 h-6 text-rose-500" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
