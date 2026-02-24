import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useDataProvider } from '../hooks/useDataProvider';
import { View } from '../types';
import { Card } from './ui';

interface AdminDashboardProps {
    onNavigate: (view: View) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const { currentUser, activeRoleContext } = useDataProvider();
    const permissions = usePermissions(currentUser, activeRoleContext?.roluri?.nume);

    const [counts, setCounts] = useState<{ sportivi: number; plati: number; cluburi: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!permissions.isFederationAdmin) {
            onNavigate('dashboard');
            return;
        }

        const fetchCounts = async () => {
            try {
                const [sportiviCount, platiCount, cluburiCount] = await Promise.all([
                    supabase.from('sportivi').select('*', { count: 'exact', head: true }),
                    supabase.from('plati').select('*', { count: 'exact', head: true }),
                    supabase.from('cluburi').select('*', { count: 'exact', head: true })
                ]);

                setCounts({
                    sportivi: sportiviCount.count || 0,
                    plati: platiCount.count || 0,
                    cluburi: cluburiCount.count || 0
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
        return <Card className="p-4 text-center">Loading admin data...</Card>;
    }

    if (!permissions.isFederationAdmin) {
        return (
            <Card className="p-4 text-center bg-red-900/50 text-red-300">
                <p>Acces restricționat. Redirecționare...</p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
                <h3 className="text-lg font-semibold">Sportivi</h3>
                <p className="text-2xl">{counts?.sportivi}</p>
            </Card>
            <Card className="p-4">
                <h3 className="text-lg font-semibold">Plăți</h3>
                <p className="text-2xl">{counts?.plati}</p>
            </Card>
            <Card className="p-4">
                <h3 className="text-lg font-semibold">Cluburi</h3>
                <p className="text-2xl">{counts?.cluburi}</p>
            </Card>
        </div>
    );
};
