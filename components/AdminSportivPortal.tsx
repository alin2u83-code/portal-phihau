import React, { useState, useMemo } from 'react';
import { Sportiv, View, User, Plata, Antrenament, IstoricGrade, Familie, TipAbonament, Rol, DecontFederatie, InscriereExamen, SesiuneExamen, Grad, Grupa, AnuntPrezenta, Permissions } from '../types';
import { Card, Select, Button } from './ui';
import { ArrowLeftIcon } from './icons';
import { SportivDashboard } from './SportivDashboard';

interface AdminSportivPortalProps {
    currentUser: User;
    sportivi: Sportiv[];
    participari: InscriereExamen[];
    examene: SesiuneExamen[];
    grade: Grad[];
    istoricGrade: IstoricGrade[];
    grupe: Grupa[];
    plati: Plata[];
    onNavigate: (view: View) => void;
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    permissions: Permissions;
    canSwitchRoles: boolean;
    activeRole: Rol['nume'];
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    onBack: () => void;
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    setIstoricGrade: React.Dispatch<React.SetStateAction<IstoricGrade[]>>;
}

export const AdminSportivPortal: React.FC<AdminSportivPortalProps> = (props) => {
    const { sportivi, onBack, currentUser } = props;
    const [selectedSportivId, setSelectedSportivId] = useState('');

    const selectedSportiv = useMemo(() => {
        return sportivi.find(s => s.id === selectedSportivId);
    }, [sportivi, selectedSportivId]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="mr-2 w-5 h-5"/> Meniu</Button>
            <h1 className="text-xl md:text-3xl font-bold text-white">Portal Sportiv (Mod Administrator)</h1>
            
            <Card>
                <h2 className="text-xl font-bold text-white mb-2">Selectează un Sportiv</h2>
                <p className="text-sm text-slate-400 mb-4">Alege un sportiv din listă pentru a vizualiza și edita profilul său complet.</p>
                <Select
                    label="Sportiv"
                    value={selectedSportivId}
                    onChange={e => setSelectedSportivId(e.target.value)}
                >
                    <option value="">Alege...</option>
                    {sportivi.sort((a,b) => a.nume.localeCompare(b.nume)).map(s => (
                        <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>
                    ))}
                </Select>
            </Card>

            {selectedSportiv && (
                <div className="mt-6 animate-fade-in-down">
                    <SportivDashboard
                        key={selectedSportiv.id}
                        currentUser={currentUser}
                        viewedUser={selectedSportiv}
                        isAdminView={true}
                        {...props}
                    />
                </div>
            )}
        </div>
    );
};