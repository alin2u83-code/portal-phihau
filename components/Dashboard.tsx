import React from 'react';
import { User, View, DecontFederatie, Club, Antrenament, Sportiv, Grupa } from '../types';
import { Permissions } from '../hooks/usePermissions';
import { UsersIcon, ArchiveBoxIcon, WalletIcon, BanknotesIcon, ClipboardCheckIcon, TrophyIcon } from './icons';
import { Card } from './ui';
import { GeneralAttendanceWidget } from './GeneralAttendanceWidget';

// Props
interface DashboardProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    permissions: Permissions;
    clubs: Club[];
    antrenamente: Antrenament[];
    sportivi: Sportiv[];
    grupe: Grupa[];
}

// Sub-components
const NavCard: React.FC<{ title: string; icon: React.ElementType; onClick: () => void; }> = ({ title, icon: Icon, onClick }) => (
    <div
        onClick={onClick}
        className="group bg-[var(--bg-card)] rounded-xl shadow-lg p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-[var(--border-color)] hover:border-amber-400/50"
    >
        <div className="p-4 bg-slate-700/50 text-amber-400 rounded-full mb-4 border border-slate-600">
            <Icon className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
    </div>
);

const AdminSummaryCard: React.FC<{ deconturi: DecontFederatie[] }> = ({ deconturi }) => {
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

// Main Component
export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, deconturiFederatie, permissions }) => {

    if (!currentUser) {
        return (
             <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center p-4">
                <svg className="animate-spin h-8 w-8 text-brand-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h1 className="text-xl font-bold text-white">Se încarcă...</h1>
            </div>
        );
    }

    const { isAdminClub, isInstructor, isFederationAdmin } = permissions;

    const adminLinks = [
        { title: 'Sportivi', icon: UsersIcon, view: 'sportivi' as View },
        { title: 'Grupe', icon: ArchiveBoxIcon, view: 'grupe' as View },
        { title: 'Finanțe Club', icon: WalletIcon, view: 'financial-dashboard' as View },
        { title: 'Facturi Federale', icon: BanknotesIcon, view: 'deconturi-federatie' as View },
    ];

    const instructorLinks = [
        { title: 'Prezență Antrenament', icon: ClipboardCheckIcon, view: 'prezenta' as View },
        { title: 'Înscrieri Examene', icon: TrophyIcon, view: 'examene' as View },
        { title: 'Vizualizare Sportivi', icon: UsersIcon, view: 'sportivi' as View },
    ];

    return (
        <div className="space-y-8 animate-fade-in-down">
            <header>
                <h1 className="text-3xl font-bold text-white">Bun venit, {currentUser.prenume}!</h1>
                <p className="text-slate-400">Selectează un modul pentru a începe.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {(isAdminClub || isFederationAdmin) && (
                        <>
                            <AdminSummaryCard deconturi={deconturiFederatie} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {adminLinks.map(link => (
                                    <NavCard key={link.view} title={link.title} icon={link.icon} onClick={() => onNavigate(link.view)} />
                                ))}
                            </div>
                        </>
                    )}

                    {isInstructor && !isAdminClub && !isFederationAdmin && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {instructorLinks.map(link => (
                                <NavCard key={link.view} title={link.title} icon={link.icon} onClick={() => onNavigate(link.view)} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    {(isAdminClub || isInstructor) && (
                        <GeneralAttendanceWidget currentUser={currentUser} />
                    )}
                </div>
            </div>
        </div>
    );
};