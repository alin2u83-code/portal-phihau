import React from 'react';
import { User } from '../types';
import { 
    UsersIcon, 
    BanknotesIcon, 
    TrophyIcon, 
    CogIcon, 
    ClipboardListIcon, 
    ClipboardCheckIcon, 
    UserCircleIcon,
    ChartBarIcon
} from './icons';

interface WelcomeHeroProps {
    profile: User;
}

// Sub-component for menu items
const MenuCard: React.FC<{ title: string; icon: React.ElementType }> = ({ title, icon: Icon }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/50 hover:scale-105 transition-transform duration-200 border border-slate-700">
        <Icon className="w-8 h-8 text-brand-secondary mb-2" />
        <span className="font-semibold text-sm text-white">{title}</span>
    </div>
);


export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ profile }) => {
    // Determine user role and corresponding style
    const { role, roleStyle } = React.useMemo(() => {
        // Prioritize the simple 'rol' field if it exists, otherwise derive from the complex 'roluri' array.
        const userRole = profile.rol || (profile.roluri && profile.roluri.length > 0 ? profile.roluri[0].nume : 'SPORTIV');
        
        let style = 'bg-green-600 text-white'; // Default for SPORTIV
        
        if (['ADMIN_CLUB', 'Admin', 'SUPER_ADMIN_FEDERATIE'].includes(userRole)) {
            style = 'bg-red-600 text-white';
        } else if (userRole === 'INSTRUCTOR') {
            style = 'bg-blue-600 text-white';
        }
        
        return { role: userRole, roleStyle: style };
    }, [profile]);
    
    // Determine menu items based on role
    const menuItems = React.useMemo(() => {
        switch (role) {
            case 'ADMIN_CLUB':
            case 'Admin':
            case 'SUPER_ADMIN_FEDERATIE':
                return [
                    { title: 'Sportivi', icon: UsersIcon },
                    { title: 'Finanțe', icon: BanknotesIcon },
                    { title: 'Evenimente', icon: TrophyIcon },
                    { title: 'Setări Club', icon: CogIcon },
                ];
            case 'INSTRUCTOR':
                 return [
                    { title: 'Prezență', icon: ClipboardCheckIcon },
                    { title: 'Grade', icon: TrophyIcon },
                    { title: 'Thao Quyen', icon: ClipboardListIcon },
                ];
            case 'SPORTIV':
            default:
                return [
                    { title: 'Profilul Meu', icon: UserCircleIcon },
                    { title: 'Vize Medicale', icon: ClipboardCheckIcon },
                    { title: 'Istoric Grade', icon: ChartBarIcon },
                ];
        }
    }, [role]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 md:p-6">
            {/* Identity Card */}
            <div className="lg:col-span-1 bg-[var(--bg-card)] p-6 rounded-xl shadow-lg border border-[var(--border-color)] flex flex-col justify-center animate-fade-in-down">
                <h2 className="text-3xl font-bold text-white text-center">
                    {profile.nume} {profile.prenume}
                </h2>
                <div className="flex justify-center items-center gap-4 mt-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full capitalize ${roleStyle}`}>
                        {role.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="text-sm text-slate-400">
                        {profile.cluburi?.nume || 'Phi Hau Iași'}
                    </span>
                </div>
            </div>

            {/* Menu Cards */}
            <div className="lg:col-span-2 bg-[var(--bg-card)] p-6 rounded-xl shadow-lg border border-[var(--border-color)] animate-fade-in-down" style={{ animationDelay: '150ms' }}>
                <h3 className="text-lg font-semibold text-white mb-4">Meniul de Administrare</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {menuItems.map(item => (
                        <MenuCard key={item.title} title={item.title} icon={item.icon} />
                    ))}
                </div>
            </div>
        </div>
    );
};
