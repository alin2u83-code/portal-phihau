import React from 'react';
import { Session } from '@supabase/supabase-js';
import { User, View, DecontFederatie } from '../types';
import { Login } from './Login';
import { Card } from './ui';
import { UsersIcon, TrophyIcon, BanknotesIcon, WalletIcon, ClipboardCheckIcon, ArchiveBoxIcon, CogIcon } from './icons';

interface UnifiedDashboardProps {
    session: Session | null;
    currentUser: User | null;
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
}

// Sub-components
const NavCard: React.FC<{ title: string; description: string; icon: React.ElementType; onClick: () => void; color?: string }> = ({ title, description, icon: Icon, onClick, color = 'text-amber-400' }) => (
    <div
        onClick={onClick}
        className="group bg-[var(--bg-card)] rounded-xl shadow-lg p-6 flex flex-col items-start cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-[var(--border-color)] hover:border-amber-400/50"
    >
        <div className={`p-3 bg-slate-700/50 ${color} rounded-lg mb-4 border border-slate-600`}>
            <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] flex-grow">{description}</p>
        <div className="w-full h-px bg-slate-700 my-4"></div>
        <span className="text-xs font-bold text-amber-400 group-hover:underline">Accesează Modul &rarr;</span>
    </div>
);

const AdminFederationCard: React.FC<{ deconturi: DecontFederatie[] }> = ({ deconturi }) => {
    const { total, count } = React.useMemo(() => {
        const pending = deconturi.filter(d => d.status === 'In asteptare');
        return {
            total: pending.reduce((sum, d) => sum + d.suma_totala, 0),
            count: pending.reduce((sum, d) => sum + d.numar_sportivi, 0),
        };
    }, [deconturi]);

    return (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-400/30">
            <h3 className="text-lg font-bold text-amber-400">Situație Plăți Federație</h3>
            <p className="text-4xl font-black text-white mt-2">{total.toFixed(2)} RON</p>
            <p className="text-sm text-slate-400">Total de plată pentru {count} sportivi din activități neachitate.</p>
        </Card>
    );
};

const InstructorCards: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NavCard
            title="Prezență la Antrenament"
            description="Înregistrează rapid prezența sportivilor la antrenamentele de astăzi."
            icon={ClipboardCheckIcon}
            onClick={() => onNavigate('prezenta')}
            color="text-sky-400"
        />
        <NavCard
            title="Pregătire Examen"
            description="Gestionează înscrierile și notele pentru următoarea sesiune de examinare."
            icon={TrophyIcon}
            onClick={() => onNavigate('examene')}
            color="text-green-400"
        />
    </div>
);


// Main Component Logic
export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ session, currentUser, onNavigate, deconturiFederatie }) => {
    if (!session || !currentUser) {
        return <Login />;
    }

    const navItems = [
        { title: 'Sportivi', description: 'Administrează sportivii, grupele și familiile.', icon: UsersIcon, view: 'sportivi' as View, category: 'Gestiune', roles: ['Admin', 'Admin Club', 'Instructor', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Evenimente', description: 'Creează și gestionează examene, stagii, competiții.', icon: TrophyIcon, view: 'examene' as View, category: 'Gestiune', roles: ['Admin', 'Admin Club', 'Instructor', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Staff & Roluri', description: 'Gestionează conturile de acces și permisiunile.', icon: CogIcon, view: 'user-management' as View, category: 'Gestiune', roles: ['Admin', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Dashboard Financiar', description: 'Vizualizează rapoarte și statistici financiare.', icon: BanknotesIcon, view: 'financial-dashboard' as View, category: 'Financiar', roles: ['Admin', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Facturi & Plăți', description: 'Generează facturi și înregistrează încasări.', icon: WalletIcon, view: 'plati-scadente' as View, category: 'Financiar', roles: ['Admin', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Deconturi Federație', description: 'Vezi și achită datoriile către federație.', icon: BanknotesIcon, view: 'deconturi-federatie' as View, category: 'Financiar', roles: ['Admin', 'Admin Club', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Prezență', description: 'Înregistrează prezența la antrenamente.', icon: ClipboardCheckIcon, view: 'prezenta' as View, category: 'Tehnic', roles: ['Admin', 'Admin Club', 'Instructor', 'SUPER_ADMIN_FEDERATIE'] },
        { title: 'Orar & Grupe', description: 'Definește programul de antrenament și grupele.', icon: ArchiveBoxIcon, view: 'grupe' as View, category: 'Tehnic', roles: ['Admin', 'Admin Club', 'Instructor', 'SUPER_ADMIN_FEDERATIE'] },
    ];
    
    const userRole = currentUser.rol || (currentUser.roluri && currentUser.roluri.length > 0 ? currentUser.roluri[0].nume : 'SPORTIV');

    const availableNavItems = navItems.filter(item =>
        item.roles.some(role => userRole.includes(role))
    );
    
    const groupedNavItems = {
        Gestiune: availableNavItems.filter(i => i.category === 'Gestiune'),
        Financiar: availableNavItems.filter(i => i.category === 'Financiar'),
        Tehnic: availableNavItems.filter(i => i.category === 'Tehnic'),
    };

    return (
        <div className="space-y-12 animate-fade-in-down">
            <div>
                {['Admin', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'].some(role => userRole.includes(role)) && <AdminFederationCard deconturi={deconturiFederatie} />}
                {userRole.includes('INSTRUCTOR') && <InstructorCards onNavigate={onNavigate} />}
            </div>

            {Object.entries(groupedNavItems).map(([category, items]) => (
                items.length > 0 && (
                    <div key={category}>
                        <h2 className="text-2xl font-bold text-white mb-6 border-b-2 border-amber-400/50 pb-2">{category}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items.map(item => (
                                <NavCard
                                    key={item.view}
                                    title={item.title}
                                    description={item.description}
                                    icon={item.icon}
                                    onClick={() => onNavigate(item.view)}
                                />
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
};
