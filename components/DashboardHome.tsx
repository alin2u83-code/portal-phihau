import React, { useMemo } from 'react';
import { User, View, Rol } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { UsersIcon, TrophyIcon, BanknotesIcon, WalletIcon } from './icons';
import { Card } from './ui';

interface DashboardHomeProps {
    currentUser: User;
    onNavigate: (view: View) => void;
}

// Sub-component for navigation cards
const NavCard: React.FC<{ title: string; description: string; icon: React.ElementType; onClick: () => void; }> = ({ title, description, icon: Icon, onClick }) => (
    <div
        onClick={onClick}
        className="group bg-[var(--bg-card)] rounded-xl shadow-lg p-6 flex flex-col items-start cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-[var(--border-color)] hover:border-amber-400/50"
    >
        <div className="p-3 bg-slate-700/50 text-amber-400 rounded-lg mb-4 border border-slate-600">
            <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] flex-grow">{description}</p>
        <div className="w-full h-px bg-slate-700 my-4"></div>
        <span className="text-xs font-bold text-amber-400 group-hover:underline">Accesează Modul &rarr;</span>
    </div>
);

// Sub-component for role badge
const RoleBadge: React.FC<{ roleName: Rol['nume'] }> = ({ roleName }) => {
    const styles: Record<Rol['nume'], string> = {
        'SUPER_ADMIN_FEDERATIE': 'bg-red-600/80 text-white border-red-400/50',
        'Admin': 'bg-red-600/80 text-white border-red-400/50',
        'Admin Club': 'bg-red-600/80 text-white border-red-400/50',
        'Instructor': 'bg-blue-600/80 text-white border-blue-400/50',
        'Sportiv': 'bg-green-600/80 text-white border-green-400/50',
    };
    
    const style = styles[roleName] || 'bg-slate-600 text-white border-slate-400';

    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${style}`}>
            {roleName.replace(/_/g, ' ')}
        </span>
    );
};

export const DashboardHome: React.FC<DashboardHomeProps> = ({ currentUser, onNavigate }) => {
    const activeRole = useMemo((): Rol['nume'] => {
        if (currentUser?.roluri && currentUser.roluri.length > 0) {
            const roleWeights: Record<Rol['nume'], number> = { 'SUPER_ADMIN_FEDERATIE': 5, 'Admin': 4, 'Admin Club': 3, 'Instructor': 2, 'Sportiv': 1 };
            return [...currentUser.roluri].sort((a, b) => (roleWeights[b.nume] || 0) - (roleWeights[a.nume] || 0))[0]?.nume || 'Sportiv';
        }
        return 'Sportiv';
    }, [currentUser]);
    const permissions = usePermissions(currentUser, activeRole);

    const navItems = [
        {
            title: 'Modul Sportivi',
            description: 'Gestionează sportivii clubului, familiile și grupele de antrenament.',
            icon: UsersIcon,
            view: 'sportivi' as View,
            allowedRoles: ['Admin Club', 'Instructor', 'Admin', 'SUPER_ADMIN_FEDERATIE']
        },
        {
            title: 'Modul Evenimente',
            description: 'Planifică și administrează examene de grad, stagii și competiții.',
            icon: TrophyIcon,
            view: 'examene' as View,
            allowedRoles: ['Admin Club', 'Instructor', 'Admin', 'SUPER_ADMIN_FEDERATIE']
        },
        {
            title: 'Datorii Federație',
            description: 'Vizualizează și confirmă plățile pentru activitățile organizate de federație.',
            icon: BanknotesIcon,
            view: 'deconturi-federatie' as View,
            allowedRoles: ['Admin Club', 'Admin', 'SUPER_ADMIN_FEDERATIE']
        },
        {
            title: 'Finanțe Club',
            description: 'Administrează facturile, încasările și rapoartele financiare interne.',
            icon: WalletIcon,
            view: 'financial-dashboard' as View,
            allowedRoles: ['Admin Club', 'Admin', 'SUPER_ADMIN_FEDERATIE']
        }
    ];

    const availableNavItems = useMemo(() => {
        const userRoles = new Set(currentUser.roluri.map(r => r.nume));
        if (currentUser.rol === 'ADMIN_CLUB') userRoles.add('Admin Club'); // include simple role

        return navItems.filter(item => 
            item.allowedRoles.some(allowedRole => userRoles.has(allowedRole as Rol['nume']))
        );
    }, [currentUser, navItems]);
    
    const userPrimaryRole = currentUser.roluri[0]?.nume || 'Sportiv';

    return (
        <div className="space-y-8 animate-fade-in-down">
            {/* Header */}
            <header className="bg-[var(--bg-card)] p-6 rounded-xl shadow-lg border border-[var(--border-color)]">
                <h2 className="text-3xl font-bold text-white">Bună ziua, {currentUser.prenume}!</h2>
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                    <RoleBadge roleName={userPrimaryRole} />
                    <span>{currentUser.cluburi?.nume || 'Club neasociat'}</span>
                </div>
            </header>
            
            {/* Navigation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableNavItems.map(item => (
                    <NavCard
                        key={item.title}
                        title={item.title}
                        description={item.description}
                        icon={item.icon}
                        onClick={() => onNavigate(item.view)}
                    />
                ))}
            </div>
        </div>
    );
};
