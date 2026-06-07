import React from 'react';
import { Session } from '@supabase/supabase-js';
import { User, View, DecontFederatie } from '../types';
import { UsersIcon, TrophyIcon, BanknotesIcon, WalletIcon, ClipboardCheckIcon, ArchiveBoxIcon, CogIcon } from './icons';

interface UnifiedDashboardProps {
    session: Session | null;
    currentUser: User | null;
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
}

const NavCard: React.FC<{
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
    iconColor?: string;
    iconBg?: string;
}> = ({ title, description, icon: Icon, onClick, iconColor = 'text-amber-400', iconBg = 'bg-amber-400/10' }) => (
    <button
        type="button"
        onClick={onClick}
        className="group w-full text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:border-slate-600 motion-safe:hover:-translate-y-0.5 transition-[transform,border-color,box-shadow] duration-200 hover:shadow-lg p-5 flex gap-4 items-start"
    >
        <div className={`shrink-0 p-3 rounded-xl ${iconBg}`} aria-hidden="true">
            <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-white transition-colors">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{description}</p>
        </div>
    </button>
);

const AdminFederationCard: React.FC<{ deconturi: DecontFederatie[] }> = ({ deconturi }) => {
    const { total, count } = React.useMemo(() => {
        const pending = deconturi.filter(d => d.status_plata === 'In asteptare');
        return {
            total: pending.reduce((sum, d) => sum + (d.suma_totala || 0), 0),
            count: pending.length,
        };
    }, [deconturi]);

    if (count === 0) return null;

    return (
        <div
            role="status"
            aria-label={`${count} deconturi neachitate, total ${total.toFixed(2)} RON`}
            className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-4 mb-8"
        >
            <div>
                <p className="text-sm font-semibold text-amber-300">
                    {count} {count === 1 ? 'decont neachitat' : 'deconturi neachitate'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Verifică și achită înainte de termenul limită</p>
            </div>
            <p className="text-lg font-semibold text-white tabular-nums">{total.toFixed(2)} RON</p>
        </div>
    );
};

const InstructorCards: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <NavCard
            title="Prezență la Antrenament"
            description="Înregistrează prezența sportivilor la antrenamentele de astăzi."
            icon={ClipboardCheckIcon}
            onClick={() => onNavigate('prezenta')}
            iconColor="text-sky-400"
            iconBg="bg-sky-400/10"
        />
        <NavCard
            title="Pregătire Examen"
            description="Gestionează înscrierile și notele pentru următoarea sesiune de examinare."
            icon={TrophyIcon}
            onClick={() => onNavigate('examene')}
            iconColor="text-violet-400"
            iconBg="bg-violet-400/10"
        />
    </div>
);

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ session, currentUser, onNavigate, deconturiFederatie }) => {
    if (!session || !currentUser) {
        return null;
    }

    const navItems = [
        { title: 'Sportivi', description: 'Administrează sportivii, grupele și familiile.', icon: UsersIcon, view: 'sportivi' as View, category: 'Gestiune', roles: ['ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-sky-400', iconBg: 'bg-sky-400/10' },
        { title: 'Examene', description: 'Gestionează sesiunile de examinare și promovările de grad.', icon: TrophyIcon, view: 'examene' as View, category: 'Gestiune', roles: ['ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-violet-400', iconBg: 'bg-violet-400/10' },
        { title: 'Activități Naționale', description: 'Organizează stagii naționale Qwan Ki Do.', icon: TrophyIcon, view: 'activitati-nationale' as View, category: 'Gestiune', roles: ['ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-amber-400', iconBg: 'bg-amber-400/10' },
        { title: 'Competiții', description: 'Înscrieri și rezultate competiții naționale Qwan Ki Do.', icon: TrophyIcon, view: 'competitii' as View, category: 'Gestiune', roles: ['ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-rose-400', iconBg: 'bg-rose-400/10' },
        { title: 'Staff & Roluri', description: 'Gestionează conturile de acces și permisiunile.', icon: CogIcon, view: 'user-management' as View, category: 'Gestiune', roles: ['ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-slate-400', iconBg: 'bg-slate-400/10' },
        { title: 'Dashboard Financiar', description: 'Vizualizează rapoarte și statistici financiare.', icon: BanknotesIcon, view: 'financial-dashboard' as View, category: 'Financiar', roles: ['ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-emerald-400', iconBg: 'bg-emerald-400/10' },
        { title: 'Facturi & Plăți', description: 'Generează facturi și înregistrează încasări.', icon: WalletIcon, view: 'plati-scadente' as View, category: 'Financiar', roles: ['ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-green-400', iconBg: 'bg-green-400/10' },
        { title: 'Deconturi Federație', description: 'Vezi și achită datoriile către federație.', icon: BanknotesIcon, view: 'deconturi-federatie' as View, category: 'Financiar', roles: ['ADMIN', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-orange-400', iconBg: 'bg-orange-400/10' },
        { title: 'Prezență', description: 'Înregistrează prezența la antrenamente.', icon: ClipboardCheckIcon, view: 'prezenta' as View, category: 'Tehnic', roles: ['ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-cyan-400', iconBg: 'bg-cyan-400/10' },
        { title: 'Orar & Grupe', description: 'Definește programul de antrenament și grupele.', icon: ArchiveBoxIcon, view: 'grupe' as View, category: 'Tehnic', roles: ['ADMIN', 'ADMIN_CLUB', 'INSTRUCTOR', 'SUPER_ADMIN_FEDERATIE'], iconColor: 'text-blue-400', iconBg: 'bg-blue-400/10' },
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

    const isAdmin = ['Admin', 'ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'].some(role => userRole.includes(role));
    const isInstructor = userRole.includes('INSTRUCTOR');

    return (
        <div className="space-y-8 animate-fade-in-down">
            {isAdmin && <AdminFederationCard deconturi={deconturiFederatie} />}
            {isInstructor && <InstructorCards onNavigate={onNavigate} />}

            {Object.entries(groupedNavItems).map(([category, items]) =>
                items.length > 0 && (
                    <section key={category} aria-labelledby={`section-${category}`}>
                        <h2
                            id={`section-${category}`}
                            className="text-base font-semibold text-slate-400 mb-4"
                        >
                            {category}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {items.map(item => (
                                <NavCard
                                    key={item.view}
                                    title={item.title}
                                    description={item.description}
                                    icon={item.icon}
                                    onClick={() => onNavigate(item.view)}
                                    iconColor={item.iconColor}
                                    iconBg={item.iconBg}
                                />
                            ))}
                        </div>
                    </section>
                )
            )}
        </div>
    );
};
