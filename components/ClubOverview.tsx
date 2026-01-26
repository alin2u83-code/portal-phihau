import React, { useState, useEffect, useMemo } from 'react';
import { User, Sportiv, Tranzactie, DecontFederatie, View, Club } from '../types';
import { supabase } from '../supabaseClient';
import { Card, Button } from './ui';
import { UsersIcon, ClipboardCheckIcon, BanknotesIcon, AlertTriangleIcon, SitemapIcon } from './icons';
import { useError } from './ErrorProvider';

interface ClubOverviewProps {
    currentUser: User;
    sportivi: Sportiv[];
    tranzactii: Tranzactie[];
    deconturiFederatie: DecontFederatie[];
    onNavigate: (view: View) => void;
}

const KpiCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; onClick?: () => void; isLoading?: boolean }> = ({ title, value, icon: Icon, onClick, isLoading }) => (
    <div onClick={onClick} className={`bg-slate-800/50 p-4 rounded-lg flex items-center gap-4 ${onClick ? 'cursor-pointer hover:bg-slate-700/50' : ''} transition-colors border border-slate-700`}>
        <div className="p-3 bg-slate-700 rounded-full">
            <Icon className="w-6 h-6 text-sky-400" />
        </div>
        <div>
            <p className="text-sm text-slate-400 font-semibold">{title}</p>
            {isLoading ? (
                <div className="h-8 w-16 bg-slate-700 rounded-md animate-pulse mt-1"></div>
            ) : (
                <p className="text-3xl font-bold text-white">{value}</p>
            )}
        </div>
    </div>
);

export const ClubOverview: React.FC<ClubOverviewProps> = ({ currentUser, sportivi, tranzactii, deconturiFederatie, onNavigate }) => {
    const [prezentiAzi, setPrezentiAzi] = useState(0);
    const [loadingPrezenta, setLoadingPrezenta] = useState(true);
    const { showError } = useError();

    useEffect(() => {
        if (!supabase || !currentUser.club_id) {
            setLoadingPrezenta(false);
            return;
        }

        const fetchAttendance = async () => {
            setLoadingPrezenta(true);
            const { data, error } = await supabase
                .from('sumar_prezenta_astazi')
                .select('sportiv_id');

            if (error) {
                console.warn("Could not fetch today's attendance summary:", error.message);
                setPrezentiAzi(0);
            } else {
                setPrezentiAzi(data?.length || 0);
            }
            setLoadingPrezenta(false);
        };

        fetchAttendance();
    }, [currentUser.club_id]);

    const totalSportiviActivi = useMemo(() => {
        return sportivi.filter(s => s.status === 'Activ').length;
    }, [sportivi]);

    const incasariLunaCurenta = useMemo(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return tranzactii
            .filter(t => {
                const dataPlatii = new Date(t.data_platii);
                return dataPlatii >= firstDay && dataPlatii <= lastDay;
            })
            .reduce((sum, t) => sum + t.suma, 0);
    }, [tranzactii]);

    const vizeMedicale = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fifteenDaysFromNow = new Date();
        fifteenDaysFromNow.setDate(today.getDate() + 15);

        const alerts: { sportiv: Sportiv; status: 'expirat' | 'expiră curând'; daysRemaining: number }[] = [];

        sportivi.forEach(s => {
            if (s.status === 'Activ' && s.viza_medicala_expirare) {
                const expiryDate = new Date(s.viza_medicala_expirare + 'T00:00:00');
                if (isNaN(expiryDate.getTime())) return;
                
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (expiryDate < today) {
                    alerts.push({ sportiv: s, status: 'expirat', daysRemaining: diffDays });
                } else if (expiryDate <= fifteenDaysFromNow) {
                    alerts.push({ sportiv: s, status: 'expiră curând', daysRemaining: diffDays });
                }
            }
        });

        return alerts.sort((a,b) => a.daysRemaining - b.daysRemaining);
    }, [sportivi]);

    const ultimaFacturaFederala = useMemo(() => {
        return deconturiFederatie
            .filter(d => d.club_id === currentUser.club_id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }, [deconturiFederatie, currentUser.club_id]);

    return (
        <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard title="Sportivi Activi" value={totalSportiviActivi} icon={UsersIcon} onClick={() => onNavigate('sportivi')} />
                <KpiCard title="Prezenți Azi" value={prezentiAzi} icon={ClipboardCheckIcon} isLoading={loadingPrezenta} onClick={() => onNavigate('live-attendance')} />
                <KpiCard title="Încasări Luna Curentă" value={`${incasariLunaCurenta.toFixed(0)} lei`} icon={BanknotesIcon} onClick={() => onNavigate('financial-dashboard')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <AlertTriangleIcon className="w-5 h-5 text-amber-400" />
                        Alerte Vize Medicale
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {vizeMedicale.length > 0 ? vizeMedicale.map(alert => (
                            <div key={alert.sportiv.id} className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded">
                                <span className="font-medium">{alert.sportiv.nume} {alert.sportiv.prenume}</span>
                                <span className={`font-bold ${alert.status === 'expirat' ? 'text-red-400' : 'text-amber-400'}`}>
                                    {alert.status === 'expirat' ? 'Expirat!' : `Expiră în ${alert.daysRemaining} zile`}
                                </span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-400 italic text-center py-4">Nicio viză medicală nu necesită atenție.</p>
                        )}
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        <SitemapIcon className="w-5 h-5 text-red-400" />
                        Relația cu Federația
                    </h3>
                    {ultimaFacturaFederala ? (
                        <div className="space-y-2">
                            <p className="text-sm text-slate-400">Ultimul decont: {ultimaFacturaFederala.activitate}</p>
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-lg">{ultimaFacturaFederala.suma_totala.toFixed(2)} RON</p>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${ultimaFacturaFederala.status === 'Platit' ? 'bg-green-600/30 text-green-300' : 'bg-amber-600/30 text-amber-300'}`}>
                                    {ultimaFacturaFederala.status}
                                </span>
                            </div>
                            <Button onClick={() => onNavigate('deconturi-federatie')} variant="secondary" size="sm" className="w-full mt-2">Vezi toate deconturile</Button>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic text-center py-4">Niciun decont înregistrat de la federație.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};