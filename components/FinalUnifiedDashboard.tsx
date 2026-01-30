import React from 'react';
import { User, View, DecontFederatie, Antrenament, Sportiv, Grupa, InscriereExamen, Plata, AnuntPrezenta, SesiuneExamen, Grad, Permissions, Rol, IstoricGrade, Familie, TipAbonament, Tranzactie } from '../types';
import { SportivDashboard } from './SportivDashboard';
import { GeneralAttendanceWidget } from './GeneralAttendanceWidget';
import { AdminMasterMap } from './AdminMasterMap';

// Props
interface FinalUnifiedDashboardProps {
    currentUser: User;
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    permissions: Permissions;
    inscrieriExamene: InscriereExamen[];
    plati: Plata[];
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    sportivi: Sportiv[];
    grade: Grad[];
    grupe: Grupa[];
    sesiuniExamene: SesiuneExamen[];
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
}

// Main Component
export const FinalUnifiedDashboard: React.FC<FinalUnifiedDashboardProps> = (props) => {
    const { currentUser, onNavigate, deconturiFederatie, permissions, inscrieriExamene, plati } = props;

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

    // Admin Views (Federation, Club, Instructor)
    if (permissions.hasAdminAccess) {
        return (
            <div className="space-y-8 animate-fade-in-down">
                <header>
                    <h1 className="text-3xl font-bold text-white">Panou de Control Principal</h1>
                    <p className="text-slate-400">Selectează un modul pentru a începe.</p>
                </header>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
                    <div className="lg:col-span-2">
                        <AdminMasterMap 
                            onNavigate={onNavigate}
                            deconturiFederatie={deconturiFederatie}
                            inscrieriExamene={inscrieriExamene}
                            plati={plati}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        {(permissions.isAdminClub || permissions.isInstructor || permissions.isFederationAdmin) && (
                            <GeneralAttendanceWidget currentUser={currentUser} />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Sportiv View
    return (
        <SportivDashboard
            currentUser={currentUser}
            viewedUser={currentUser}
            participari={props.inscrieriExamene}
            examene={props.sesiuniExamene}
            grade={props.grade}
            grupe={props.grupe}
            plati={props.plati}
            onNavigate={onNavigate}
            antrenamente={props.antrenamente}
            anunturi={props.anunturi}
            setAnunturi={props.setAnunturi}
            sportivi={props.sportivi}
            permissions={permissions}
        />
    );
};