import React, { useState, useMemo } from 'react';
import { User, Rol, Plata, Sportiv, Familie, Club } from '../types';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Card, Button } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon } from './icons';

const DEV_EMAIL = 'admin@phihau.ro';

interface BackdoorTestProps {
    currentUser: User;
    onBack: () => void;
    plati: Plata[];
    sportivi: Sportiv[];
    familii: Familie[];
    clubs: Club[];
}

interface EnrichedPlata extends Plata {
    clubNume: string;
    entitateNume: string;
    clubId: string | null | undefined;
}

export const BackdoorTest: React.FC<BackdoorTestProps> = ({ currentUser, onBack, plati, sportivi, familii, clubs }) => {
    const [loadingRole, setLoadingRole] = useState<Rol['nume'] | null>(null);
    const { showError, showSuccess } = useError();

    const sportiviMap = useMemo(() => new Map(sportivi.map(s => [s.id, s])), [sportivi]);
    const familiiMap = useMemo(() => new Map(familii.map(f => [f.id, f])), [familii]);
    const clubsMap = useMemo(() => new Map(clubs.map(c => [c.id, c])), [clubs]);

    const enrichedPlati = useMemo((): EnrichedPlata[] => {
        return plati.map(p => {
            let entitateNume = 'N/A';
            let clubNume = 'N/A';
            let clubId = null;

            if (p.sportiv_id) {
                const sportiv = sportiviMap.get(p.sportiv_id);
                if (sportiv) {
                    entitateNume = `${sportiv.nume} ${sportiv.prenume}`;
                    clubId = sportiv.club_id;
                }
            } else if (p.familie_id) {
                const familie = familiiMap.get(p.familie_id);
                if (familie) {
                    entitateNume = `Familia ${familie.nume}`;
                    const firstMember = sportivi.find(s => s.familie_id === p.familie_id);
                    if (firstMember) clubId = firstMember.club_id;
                }
            }
            clubNume = clubsMap.get(clubId || '')?.nume || 'Nespecificat';
            
            return { ...p, entitateNume, clubNume, clubId };
        }).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [plati, sportivi, familii, clubs, sportiviMap, familiiMap, clubsMap]);

    const handleSwitchRole = async (roleName: Rol['nume']) => {
        if (!supabase) { showError("Eroare", "Clientul Supabase nu a putut fi stabilit."); return; }
        setLoadingRole(roleName);
        const { error } = await supabase.auth.updateUser({ data: { active_role: roleName } });
        if (error) {
            showError("Eroare la comutarea rolului", error.message);
            setLoadingRole(null);
        } else {
            showSuccess("Context Schimbat", `Trecere la modul ${roleName}. Pagina se va reîncărca...`);
            setTimeout(() => window.location.reload(), 1000);
        }
    };
    
    const activeRole = currentUser.roluri.length > 0 ? currentUser.roluri.sort((a,b) => (a.nume === 'SUPER_ADMIN_FEDERATIE' ? -1 : 1))[0].nume : 'Sportiv';
    const isSuperAdminContext = activeRole === 'SUPER_ADMIN_FEDERATIE';
    const visibleClubsCount = new Set(enrichedPlati.map(p => p.clubId).filter(Boolean)).size;
    const isSuccess = isSuperAdminContext && visibleClubsCount > 1;

    if (currentUser.email !== DEV_EMAIL) {
        return (
            <Card className="text-center p-8">
                <p className="text-red-400 font-bold">Acces restricționat.</p>
                <Button onClick={onBack} className="mt-4">Înapoi</Button>
            </Card>
        );
    }

    const RoleButton: React.FC<{ role: Rol['nume'], label: string }> = ({ role, label }) => (
        <Button 
            variant={activeRole === role ? 'primary' : 'secondary'} 
// FIX: Corrected typo from `handleSwitch` to `handleSwitchRole`.
            onClick={() => handleSwitchRole(role)} 
            isLoading={loadingRole === role} 
            disabled={!!loadingRole}
            className="text-lg py-6 flex-1"
        >
            {label}
        </Button>
    );

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="mr-2 w-5 h-5"/> Înapoi</Button>
            <h1 className="text-3xl font-bold text-white">Portal de Testare Backdoor RLS</h1>
            
            <Card>
                <h3 className="text-lg font-bold text-white mb-4">Comută Contextul de Utilizator</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <RoleButton role="SUPER_ADMIN_FEDERATIE" label="Activează Mod Federație" />
                    <RoleButton role="Admin Club" label="Activează Mod Club" />
                    <RoleButton role="Sportiv" label="Activează Mod Sportiv" />
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className={`p-4 border-b ${isSuccess ? 'bg-green-900/50 border-green-700' : 'bg-amber-900/50 border-amber-700'}`}>
                    <h2 className="font-bold text-lg">{isSuccess ? '✅ Backdoor Funcțional' : '⚠️ Testare Necesară'}</h2>
                    <p className="text-sm">Context activ: <strong className="font-mono">{activeRole}</strong>. Plăți vizibile de la <strong className="font-mono">{visibleClubsCount}</strong> club(uri).</p>
                </div>
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-700 sticky top-0">
                            <tr>
                                <th className="p-2">Club</th>
                                <th className="p-2">Entitate</th>
                                <th className="p-2">Descriere</th>
                                <th className="p-2 text-right">Sumă</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {enrichedPlati.map(p => (
                                <tr key={p.id}>
                                    <td className="p-2 font-bold text-sky-400">{p.clubNume}</td>
                                    <td className="p-2">{p.entitateNume}</td>
                                    <td className="p-2 text-slate-400">{p.descriere}</td>
                                    <td className="p-2 text-right font-mono">{p.suma.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {enrichedPlati.length === 0 && <p className="p-8 text-center text-slate-500 italic">Nicio plată vizibilă în contextul curent.</p>}
                </div>
            </Card>
        </div>
    );
};