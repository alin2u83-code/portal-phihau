import React, { useMemo } from 'react';
import { View, User, Club } from '../types';
import { UsersIcon, BanknotesIcon, TrophyIcon, CogIcon } from './icons';
import { NotificationPermissionWidget } from './NotificationPermissionWidget';
import { FEDERATIE_ID, FEDERATIE_NAME } from '../constants';

// Define roles for clarity
type UserRole = 'SUPER_ADMIN_FEDERATIE' | 'ADMIN_CLUB' | 'INSTRUCTOR' | 'SPORTIV' | 'UNKNOWN';

// Card sub-component
const NavCard: React.FC<{ title: string; description: string; icon: React.ElementType; onClick: () => void; }> = ({ title, description, icon: Icon, onClick }) => (
    <div
        onClick={onClick}
        className="group bg-[var(--bg-card)] rounded-lg shadow-md p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border border-[var(--border-color)] hover:border-[var(--accent)]"
    >
        <div className="p-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full mb-4">
            <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-base text-[var(--text-secondary)]">{description}</p>
    </div>
);

// Header sub-component
const DashboardHeader: React.FC<{ userRole: UserRole; clubName?: string }> = ({ userRole, clubName }) => {
    if (userRole === 'SUPER_ADMIN_FEDERATIE') {
        return (
            <div className="bg-[var(--bg-card)] text-white p-6 rounded-lg shadow-lg mb-8 text-center sm:text-left">
                <h1 className="text-3xl font-bold">Departamentul Român de Qwan Ki Do</h1>
                <p className="mt-1 text-slate-300">Bun venit în panoul de administrare centralizat.</p>
            </div>
        );
    }

    if (userRole === 'ADMIN_CLUB' || userRole === 'INSTRUCTOR') {
        return (
            <div className="bg-[var(--bg-card)] text-white p-6 rounded-lg shadow-lg mb-8 text-center sm:text-left">
                <h1 className="text-3xl font-bold">{clubName ? `Clubul Sportiv ${clubName}` : 'Panou de Administrare Club'}</h1>
                <p className="mt-1 text-slate-300">Bun venit în panoul de administrare.</p>
            </div>
        );
    }
    
    // Fallback for other roles or no role
    return (
        <div className="bg-[var(--bg-card)] text-white p-6 rounded-lg shadow-lg mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-bold">Portal Qwan Ki Do</h1>
             <p className="mt-1 text-slate-300">Bun venit în panoul de administrare.</p>
        </div>
    );
};

interface DashboardProps {
  currentUser: User;
  onNavigate: (view: View) => void;
  clubs: Club[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, clubs }) => {
    
    // FIX: Add a loading state to prevent rendering with incomplete user data.
    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
                <svg className="animate-spin h-8 w-8 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h1 className="text-xl font-bold text-white">Se încarcă datele clubului Phi Hau...</h1>
            </div>
        );
    }

    const { userRole, clubName } = useMemo(() => {
        const roles = new Set((currentUser.roluri || []).filter(Boolean).map(r => r.nume));
        let role: UserRole = 'UNKNOWN';

        if (roles.has('SUPER_ADMIN_FEDERATIE') || roles.has('Admin')) {
            role = 'SUPER_ADMIN_FEDERATIE';
        } else if (roles.has('Admin Club')) {
            role = 'ADMIN_CLUB';
        } else if (roles.has('Instructor')) {
            role = 'INSTRUCTOR';
        } else {
            role = 'SPORTIV';
        }
        
        // FIX: Use optional chaining and a fallback to prevent "reading 'nume' of null" error on login.
        const clubDisplayName = currentUser?.cluburi?.id === FEDERATIE_ID 
            ? FEDERATIE_NAME 
            : currentUser?.cluburi?.nume || 'Club nespecificat';

        return { userRole: role, clubName: clubDisplayName };
    }, [currentUser]);

    const navItems = [
      { view: 'sportivi', title: 'Sportivi', description: 'Gestionează sportivi și familii.', icon: UsersIcon },
      { view: 'examene', title: 'Evenimente', description: 'Definește examene, stagii și competiții.', icon: TrophyIcon },
      { view: 'plati-scadente', title: 'Facturare', description: 'Gestionează plăți și rapoarte.', icon: BanknotesIcon },
      { view: 'user-management', title: 'Setări', description: 'Configurează conturi și permisiuni.', icon: CogIcon }
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
            <div className="mb-6">
                <NotificationPermissionWidget />
            </div>
            
            <DashboardHeader userRole={userRole} clubName={clubName} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {navItems.map(item => (
                    <NavCard
                        key={item.view}
                        title={item.title}
                        description={item.description}
                        icon={item.icon}
                        onClick={() => onNavigate(item.view as View)}
                    />
                ))}
            </div>
        </div>
    );
};