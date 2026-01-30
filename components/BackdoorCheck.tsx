import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Card, Button } from './ui';
import { ArrowLeftIcon } from './icons';

interface BackdoorCheckProps {
    currentUser: User;
    onBack: () => void;
}

const DEV_EMAIL = 'admin@phihau.ro';

export const BackdoorCheck: React.FC<BackdoorCheckProps> = ({ currentUser, onBack }) => {
    const [liveData, setLiveData] = useState<{ clubs: number, sportivi: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useError();

    useEffect(() => {
        const fetchData = async () => {
            if (!supabase) {
                showError("Eroare", "Client Supabase nu a fost inițializat.");
                setLoading(false);
                return;
            }
            setLoading(true);

            const { count: clubsCount, error: clubsError } = await supabase.from('cluburi').select('*', { count: 'exact', head: true });
            const { count: sportiviCount, error: sportiviError } = await supabase.from('sportivi').select('*', { count: 'exact', head: true });
            
            if (clubsError || sportiviError) {
                showError("Eroare la preluarea datelor", clubsError || sportiviError);
            } else {
                setLiveData({ clubs: clubsCount || 0, sportivi: sportiviCount || 0 });
            }

            setLoading(false);
        };

        fetchData();
    }, [showError]);
    
    const activeRole = currentUser.roluri.length > 0 ? currentUser.roluri.sort((a,b) => (a.nume === 'SUPER_ADMIN_FEDERATIE' ? -1 : 1))[0].nume : 'Sportiv';
    const isSuperAdminContext = activeRole === 'SUPER_ADMIN_FEDERATIE';
    const isSuccess = isSuperAdminContext && liveData && liveData.clubs > 1;

    if (currentUser.email !== DEV_EMAIL) {
        return (
            <Card className="text-center p-8">
                <p className="text-red-400 font-bold">Acces restricționat.</p>
                <Button onClick={onBack} className="mt-4">Înapoi</Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="mr-2 w-5 h-5"/> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Verificare Backdoor RLS</h1>
            
            {loading ? (
                <p className="text-center p-8">Se încarcă datele live...</p>
            ) : (
                <>
                    <div className={`p-4 rounded-lg border ${isSuccess ? 'bg-green-900/50 border-green-700 text-green-300' : 'bg-amber-900/50 border-amber-700 text-amber-300'}`}>
                        <h2 className="font-bold text-lg">Diagnostic</h2>
                        {isSuperAdminContext ? (
                            isSuccess ? (
                                <p>✅ SUCCES: Contextul 'SUPER_ADMIN_FEDERATIE' este activ și poate vedea {liveData?.clubs} cluburi. Politicile RLS funcționează corect, ocolind restricțiile la nivel de club.</p>
                            ) : (
                                <p>⚠️ ATENȚIE: Contextul 'SUPER_ADMIN_FEDERATIE' este activ, dar vede doar {liveData?.clubs} club(uri). Acest lucru poate indica o problemă cu politicile RLS noi sau cu propagarea rolului în JWT.</p>
                            )
                        ) : (
                            <p>ℹ️ INFO: Contextul activ este '{activeRole}'. Acest test este relevant doar pentru 'SUPER_ADMIN_FEDERATIE'. Comutați contextul din panoul DEV și reîncărcați pagina.</p>
                        )}
                        <p className="text-sm mt-2">Rol activ curent: <span className="font-mono bg-slate-700 px-1 rounded">{activeRole}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <h3 className="text-xl font-bold text-slate-400 mb-4">Comparație Conceptuală</h3>
                            <div className="text-sm space-y-2 text-slate-300">
                                <p><strong className="text-white">Prin Rol Vechi (RLS cu funcții SQL):</strong> Vizibilitatea era limitată la 1 singur club (`get_my_club_id()`) chiar și pentru admini, din cauza recursivității blocate de Supabase.</p>
                                <p><strong className="text-white">Prin Context Nou (RLS pe JWT):</strong> Rolul este citit direct din tokenul de autentificare, permițând unei politici `is_super_admin()` să returneze `true` și să ofere acces la toate rândurile, ocolind verificarea `club_id`.</p>
                            </div>
                        </Card>
                        <Card className="border-2 border-brand-secondary">
                            <h3 className="text-xl font-bold text-white mb-4">Date Văzute Acum (Live)</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-400">Total Cluburi Vizibile</p>
                                    <p className="font-bold text-3xl text-brand-secondary">{liveData?.clubs}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Total Sportivi Vizibili</p>
                                    <p className="font-bold text-3xl text-brand-secondary">{liveData?.sportivi}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};