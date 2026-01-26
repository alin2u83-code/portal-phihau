import React from 'react';
import { User, View, Rol } from '../types';
import { ShieldCheckIcon } from './icons';

interface DevNavigationToolbarProps {
    currentUser: User | null;
    onNavigate: (view: View) => void;
    setSimulatedRole: (role: Rol['nume'] | null) => void;
}

const NAV_ITEMS: { label: string; title: string; role: Rol['nume']; view: View }[] = [
    { label: '🧑‍💻 Super Admin', title: 'Dashboard Federație', role: 'SUPER_ADMIN_FEDERATIE', view: 'dashboard' },
    { label: '👑 Admin Club', title: 'Dashboard Club', role: 'Admin Club', view: 'dashboard' },
    { label: '🧑‍🏫 Instructor', title: 'Modul Prezență', role: 'Instructor', view: 'dashboard' },
    { label: '🥋 Sportiv', title: 'Portal Sportiv', role: 'Sportiv', view: 'my-portal' },
];

const DEV_EMAIL = 'admin@phihau.ro'; 

export const DevNavigationToolbar: React.FC<DevNavigationToolbarProps> = ({ currentUser, onNavigate, setSimulatedRole }) => {
    
    if (!currentUser || currentUser.email !== DEV_EMAIL) {
        return null;
    }

    const handleSwitch = (role: Rol['nume'] | null, view: View) => {
        setSimulatedRole(role);
        onNavigate(view);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/80 backdrop-blur-sm p-1.5 border-t border-amber-500 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
                <div className="text-xs text-white hidden md:flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-amber-400"/>
                    <span className="font-bold text-amber-400">DEV MODE:</span>
                </div>
                <div className="flex items-center justify-center flex-grow gap-2">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.role}
                            onClick={() => handleSwitch(item.role, item.view)}
                            className="px-2 py-1 rounded-md text-xs font-bold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                            title={item.title}
                        >
                           {item.label}
                        </button>
                    ))}
                    <button
                        onClick={() => handleSwitch(null, 'dashboard')}
                        className="px-2 py-1 rounded-md text-xs font-bold transition-all bg-slate-600 text-white hover:bg-slate-500"
                        title="Resetează la rolul tău real"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
};
