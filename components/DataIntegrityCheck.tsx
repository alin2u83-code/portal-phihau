import React, { useState } from 'react';
import { Sportiv, User, Rol } from '../types';
import { Card, Button } from './ui';
import { ShieldCheckIcon, EditIcon } from './icons';

interface DataIntegrityCheckProps {
    sportivi: Sportiv[];
    currentUser: User;
    onEditSportiv: (sportiv: Sportiv) => void;
}

interface Issue {
    type: 'critical' | 'warning' | 'info';
    message: string;
    details?: React.ReactNode;
}

export const DataIntegrityCheck: React.FC<DataIntegrityCheckProps> = ({ sportivi, currentUser, onEditSportiv }) => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(false);

    const runChecks = () => {
        setLoading(true);
        const newIssues: Issue[] = [];

        // Check 1: Current user profile validity
        if (!currentUser.id || !sportivi.some(s => s.id === currentUser.id)) {
            newIssues.push({
                type: 'critical',
                message: "EROARE CRITICĂ: Utilizatorul curent nu are un profil valid ('sportivi'). Anumite acțiuni (ex: salvarea prezenței) vor eșua din cauza erorilor de Foreign Key. Contactați administratorul pentru a crea/asocia profilul.",
            });
        } else {
             newIssues.push({
                type: 'info',
                message: "Profilul utilizatorului curent este valid și corect asociat. Erorile de FK la salvarea datelor nu ar trebui să apară pentru acest cont.",
            });
        }
        
        // Check 2: Staff members without user accounts
        // FIX: Corrected role names to match the type definition.
        const staffRoles: Rol['nume'][] = ['INSTRUCTOR', 'ADMIN_CLUB', 'ADMIN', 'SUPER_ADMIN_FEDERATIE'];
        const staffWithoutAccounts = sportivi.filter(s =>
            !s.user_id && (s.roluri || []).some(r => staffRoles.includes(r.nume))
        );

        if (staffWithoutAccounts.length > 0) {
            newIssues.push({
                type: 'warning',
                message: `Au fost găsiți ${staffWithoutAccounts.length} membri staff (Instructori/Admini) care nu au un cont de utilizator creat. Aceștia nu se pot autentifica.`,
                details: (
                    <ul className="text-xs list-disc pl-5 mt-2">
                        {staffWithoutAccounts.slice(0, 5).map(s => <li key={s.id}>{s.nume} {s.prenume}</li>)}
                    </ul>
                )
            });
        }

        // Check 3: Athletes with incomplete critical data
        const incompleteProfiles = sportivi.filter(s => s.status === 'Activ' && (!s.data_nasterii || s.data_nasterii === '1900-01-01' || !s.cnp));
        if (incompleteProfiles.length > 0) {
            newIssues.push({
                type: 'warning',
                message: `Există ${incompleteProfiles.length} sportivi activi cu date esențiale lipsă (CNP sau data nașterii).`,
                details: (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {incompleteProfiles.slice(0,10).map(s => (
                            <div key={s.id} className="flex justify-between items-center text-xs p-1 bg-slate-800/50 rounded">
                                <span>{s.nume} {s.prenume}</span>
                                <Button size="sm" variant="secondary" onClick={() => onEditSportiv(s)} className="!text-xs !py-0.5"><EditIcon className="w-3 h-3 mr-1"/> Remediază</Button>
                            </div>
                        ))}
                    </div>
                )
            });
        }

        setIssues(newIssues);
        setLoading(false);
    };

    const IssueItem: React.FC<{ issue: Issue }> = ({ issue }) => {
        const colorClasses = {
            critical: 'border-red-500 bg-red-900/30 text-red-300',
            warning: 'border-amber-500 bg-amber-900/30 text-amber-300',
            info: 'border-sky-500 bg-sky-900/30 text-sky-300',
        };
        return (
            <div className={`p-3 rounded-md border ${colorClasses[issue.type]}`}>
                <p className="text-sm font-semibold">{issue.message}</p>
                {issue.details && <div className="mt-2">{issue.details}</div>}
            </div>
        );
    };

    return (
        <Card className="border-l-4 border-amber-400">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-amber-400" />
                Verificare Integritate Date
            </h2>
            <p className="text-sm text-slate-400 mb-4">
                Rulează o serie de verificări pentru a identifica probleme comune de date care pot cauza erori, precum conturi de acces lipsă sau profiluri incomplete.
            </p>

            <div className="flex justify-end mb-4">
                <Button onClick={runChecks} isLoading={loading} variant="primary">
                    Pornește Verificarea
                </Button>
            </div>
            
            {issues.length > 0 && (
                <div className="space-y-3">
                    {issues.map((issue, index) => (
                        <IssueItem key={index} issue={issue} />
                    ))}
                </div>
            )}
        </Card>
    );
};