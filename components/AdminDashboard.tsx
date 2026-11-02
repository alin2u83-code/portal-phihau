import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useDataProvider } from '../hooks/useDataProvider';
import { View } from '../types';
import { Card, StatCard, Skeleton } from './ui';
import { UsersIcon, CreditCardIcon, BuildingOfficeIcon } from './icons';

interface AdminDashboardProps {
    onNavigate: (view: View) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const { activeRoleContext } = useDataProvider();
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
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
        );
    }

    if (!permissions.isFederationAdmin) {
        return (
            <Card className="text-center text-[var(--t-status-danger)]">
                <p>Acces restricționat. Redirecționare...</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-semibold leading-tight text-[var(--t-text)]">Panou administrativ</h2>
                <p className="text-sm text-[var(--t-text-muted)]">Totaluri la nivel de federație.</p>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Sportivi total" value={counts?.sportivi ?? '—'} icon={UsersIcon} />
                <StatCard label="Plăți înregistrate" value={counts?.plati ?? '—'} icon={CreditCardIcon} />
                <StatCard label="Cluburi" value={counts?.cluburi ?? '—'} icon={BuildingOfficeIcon} />
                <StatCard label="Utilizatori" value={counts?.utilizatori ?? '—'} icon={UsersIcon} />
            </div>
        </div>
    );
};
