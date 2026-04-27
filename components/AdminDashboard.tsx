import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useDataProvider } from '../hooks/useDataProvider';
import { View } from '../types';
import { Card } from './ui';
import {
    UsersIcon, CreditCardIcon, BuildingOfficeIcon, TrophyIcon,
    CalendarDaysIcon, ClipboardCheckIcon, BanknotesIcon, CogIcon,
    UserPlusIcon, ClockIcon, ChartBarIcon, FileTextIcon,
    BellIcon, SitemapIcon, BookOpenIcon, ClipboardListIcon,
    ArchiveBoxIcon,
} from './icons';

interface AdminDashboardProps {
    onNavigate: (view: View) => void;
}

interface StatCard {
    label: string;
    value: number | undefined;
    icon: React.ElementType;
    color: string;
}

interface ActionCard {
    label: string;
    view: View;
    icon: React.ElementType;
    color: string;
}

interface ActionGroup {
    title: string;
    items: ActionCard[];
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
        return <Card className="p-8 text-center bg-slate-900 border-slate-800 text-slate-400">Se încarcă datele administrative...</Card>;
    }

    if (!permissions.isFederationAdmin) {
        return (
            <Card className="p-4 text-center bg-red-900/20 border-red-900/50 text-red-400">
                <p>Acces restricționat. Redirecționare...</p>
            </Card>
        );
    }

    const stats: StatCard[] = [
        { label: 'Sportivi Total', value: counts?.sportivi, icon: UsersIcon, color: 'text-sky-500' },
        { label: 'Plăți Înregistrate', value: counts?.plati, icon: CreditCardIcon, color: 'text-emerald-500' },
        { label: 'Cluburi Active', value: counts?.cluburi, icon: BuildingOfficeIcon, color: 'text-amber-500' },
        { label: 'Utilizatori', value: counts?.utilizatori, icon: UsersIcon, color: 'text-violet-500' },
    ];

    const actionGroups: ActionGroup[] = [
        {
            title: 'Gestiune Membri',
            items: [
                { label: 'Sportivi', view: 'sportivi', icon: UsersIcon, color: 'text-sky-400' },
                { label: 'Import Sportivi', view: 'import-sportivi', icon: ArchiveBoxIcon, color: 'text-sky-400' },
                { label: 'Deduplicare', view: 'deduplicare-sportivi', icon: ClipboardListIcon, color: 'text-sky-400' },
                { label: 'Familii', view: 'familii', icon: UsersIcon, color: 'text-sky-400' },
                { label: 'Legitimații', view: 'legitimatii', icon: FileTextIcon, color: 'text-sky-400' },
                { label: 'Nomenclator Grade', view: 'grade', icon: BookOpenIcon, color: 'text-sky-400' },
                { label: 'Administrare Staff', view: 'user-management', icon: UserPlusIcon, color: 'text-sky-400' },
            ],
        },
        {
            title: 'Activitate Sală',
            items: [
                { label: 'Grupe & Orar', view: 'grupe', icon: CalendarDaysIcon, color: 'text-teal-400' },
                { label: 'Program Antrenamente', view: 'program-antrenamente', icon: CalendarDaysIcon, color: 'text-teal-400' },
                { label: 'Înregistrare Prezențe', view: 'prezenta', icon: ClipboardCheckIcon, color: 'text-teal-400' },
                { label: 'Raport Prezențe', view: 'raport-prezenta', icon: ChartBarIcon, color: 'text-teal-400' },
                { label: 'Raport Lunar Prezențe', view: 'raport-lunar-prezenta', icon: ChartBarIcon, color: 'text-teal-400' },
            ],
        },
        {
            title: 'Evenimente & Examene',
            items: [
                { label: 'Sesiuni Examene', view: 'examene', icon: TrophyIcon, color: 'text-indigo-400' },
                { label: 'Stagii', view: 'stagii', icon: TrophyIcon, color: 'text-indigo-400' },
                { label: 'Competiții', view: 'competitii', icon: TrophyIcon, color: 'text-rose-400' },
                { label: 'Rapoarte Examen', view: 'rapoarte-examen', icon: ChartBarIcon, color: 'text-indigo-400' },
                { label: 'Rapoarte', view: 'rapoarte', icon: ChartBarIcon, color: 'text-indigo-400' },
            ],
        },
        {
            title: 'Financiar & Plăți',
            items: [
                { label: 'Facturi & Plăți', view: 'plati-scadente', icon: BanknotesIcon, color: 'text-emerald-400' },
                { label: 'Jurnal Încasări', view: 'jurnal-incasari', icon: ClipboardListIcon, color: 'text-emerald-400' },
                { label: 'Raport Financiar', view: 'raport-financiar', icon: ChartBarIcon, color: 'text-emerald-400' },
                { label: 'Taxe Anuale', view: 'taxe-anuale', icon: CreditCardIcon, color: 'text-emerald-400' },
                { label: 'Facturi Federale', view: 'deconturi-federatie', icon: FileTextIcon, color: 'text-emerald-400' },
                { label: 'Config. Abonamente', view: 'tipuri-abonament', icon: CogIcon, color: 'text-emerald-400' },
                { label: 'Configurare Prețuri', view: 'configurare-preturi', icon: CogIcon, color: 'text-emerald-400' },
            ],
        },
        {
            title: 'Setări & Admin',
            items: [
                { label: 'Gestiune Cluburi', view: 'cluburi', icon: BuildingOfficeIcon, color: 'text-amber-400' },
                { label: 'Structură Federație', view: 'structura-federatie', icon: SitemapIcon, color: 'text-amber-400' },
                { label: 'Setări Club', view: 'setari-club', icon: CogIcon, color: 'text-amber-400' },
                { label: 'Mentenanță Date', view: 'data-maintenance', icon: ArchiveBoxIcon, color: 'text-amber-400' },
                { label: 'Setări Cont', view: 'account-settings', icon: CogIcon, color: 'text-amber-400' },
                { label: 'Notificări', view: 'notificari', icon: BellIcon, color: 'text-amber-400' },
                { label: 'Cereri Înscriere', view: 'cereri-inscriere', icon: UserPlusIcon, color: 'text-amber-400' },
                { label: 'Istoric Activitate', view: 'istoric-activitate', icon: ClockIcon, color: 'text-amber-400' },
            ],
        },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-xl md:text-2xl font-bold text-white">Panou Administrativ</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-4 md:p-6 bg-slate-900 border-slate-800 hover:border-slate-700 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm md:text-base font-medium text-slate-400">{label}</h3>
                            <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                                <Icon className={`w-5 h-5 ${color}`} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
                    </Card>
                ))}
            </div>

            {/* Action Groups */}
            {actionGroups.map(({ title, items }) => (
                <div key={title}>
                    <h2 className="text-base font-semibold text-slate-300 mb-3">{title}</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {items.map(({ label, view, icon: Icon, color }) => (
                            <button
                                key={view}
                                onClick={() => onNavigate(view)}
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group"
                            >
                                <div className="shrink-0 p-1.5 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                                    <Icon className={`w-4 h-4 ${color}`} />
                                </div>
                                <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-tight">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
