import React, { useMemo } from 'react';
import { User, View, Sportiv, Plata, Antrenament, IstoricGrade, Familie, TipAbonament, Rol, DecontFederatie, InscriereExamen, SesiuneExamen, Grad, Grupa, AnuntPrezenta } from '../types';
import { Card, Button } from './ui';
import { UsersIcon, TrophyIcon, BanknotesIcon, WalletIcon, ClipboardCheckIcon, ArchiveBoxIcon, CogIcon, UserPlusIcon, BookOpenIcon, ChartBarIcon, BookMarkedIcon, FileTextIcon, CalendarDaysIcon, ShieldCheckIcon } from './icons';
import { SportivDashboard } from './SportivDashboard';
import { AdminMasterMap } from './AdminMasterMap';
import { FederationDashboard } from './FederationDashboard';
import { GeneralAttendanceWidget } from './GeneralAttendanceWidget';

interface FinalUnifiedDashboardProps {
    currentUser: User;
    permissions: Permissions;
    onNavigate: (view: View) => void;
    canSwitchRoles: boolean;
    activeRole: Rol['nume'];
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    // Data props, which can be undefined for 'Sportiv' role
    sportivi?: Sportiv[];
    plati?: Plata[];
    antrenamente?: Antrenament[];
    istoricGrade?: IstoricGrade[];
    familii?: Familie[];
    tipuriAbonament?: TipAbonament[];
    deconturiFederatie?: DecontFederatie[];
    inscrieriExamene?: InscriereExamen[];
    sesiuniExamene?: SesiuneExamen[];
    grade?: Grad[];
    grupe?: Grupa[];
    anunturi?: AnuntPrezenta[];
    setAnunturi?: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    adminContext?: 'club' | 'federation';
}

export const FinalUnifiedDashboard: React.FC<FinalUnifiedDashboardProps> = ({
    currentUser,
    permissions,
    onNavigate,
    canSwitchRoles,
    activeRole,
    onSwitchRole,
    isSwitchingRole,
    sportivi,
    plati,
    antrenamente,
    istoricGrade,
    deconturiFederatie,
    inscrieriExamene,
    sesiuniExamene,
    grade,
    grupe,
    anunturi,
    setAnunturi,
    adminContext,
}) => {

    if (!permissions.hasAdminAccess || activeRole === 'Sportiv') {
        return (
            <SportivDashboard
                currentUser={currentUser}
                viewedUser={currentUser}
                // FIX: Add fallback to empty array to prevent TypeError on .filter() or .map()
                participari={inscrieriExamene || []}
                examene={sesiuniExamene || []}
                grade={grade || []}
                istoricGrade={istoricGrade || []}
                grupe={grupe || []}
                plati={plati || []}
                onNavigate={onNavigate}
                antrenamente={antrenamente || []}
                anunturi={anunturi || []}
                setAnunturi={setAnunturi!}
                sportivi={sportivi || []}
                permissions={permissions}
                canSwitchRoles={canSwitchRoles}
                activeRole={activeRole!}
                onSwitchRole={onSwitchRole}
                isSwitchingRole={isSwitchingRole}
            />
        );
    }
    
    if (permissions.isSuperAdmin && adminContext === 'federation') {
        return <FederationDashboard onNavigate={onNavigate} />;
    }

    return (
        <div className="space-y-8 animate-fade-in-down">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                    <h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1>
                    <p className="text-slate-400">Selectează un modul pentru a începe.</p>
                </div>
                 {permissions.hasAdminAccess && canSwitchRoles && (
                    <Button 
                        onClick={() => onNavigate('admin-console')}
                        variant="secondary"
                    >
                        <ShieldCheckIcon className="w-5 h-5 mr-2" /> Schimbă Context Rol
                    </Button>
                )}
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                <div className="lg:col-span-2">
                    <AdminMasterMap 
                        onNavigate={onNavigate}
                        // FIX: Add fallback to empty array to prevent TypeError on .filter() or .map()
                        deconturiFederatie={deconturiFederatie || []}
                        inscrieriExamene={inscrieriExamene || []}
                        plati={plati || []}
                    />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <GeneralAttendanceWidget currentUser={currentUser!} />
                    
                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Acțiuni Instructori</h3>
                        <div className="space-y-3">
                             <Button onClick={() => onNavigate('prezenta-instructor')} variant="info" className="w-full justify-start text-base py-3">
                                <ClipboardCheckIcon className="w-5 h-5 mr-3"/> Prezență Zilnică (Mod Instructor)
                            </Button>
                            <Button onClick={() => onNavigate('raport-lunar-prezenta')} variant="secondary" className="w-full justify-start text-base py-3">
                                <CalendarDaysIcon className="w-5 h-5 mr-3"/> Raport Lunar Prezențe
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};