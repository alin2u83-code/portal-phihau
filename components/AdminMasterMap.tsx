import React, { useEffect } from 'react';
import { View, DecontFederatie, InscriereExamen, Plata, User } from '../types';
import { Card, Button, StatCard, Skeleton } from './ui';
import { UsersIcon, BuildingOfficeIcon, CalendarDaysIcon, WalletIcon, BanknotesIcon, ArchiveBoxIcon } from './icons';
import { supabase } from '../supabaseClient';
import { usePermissions } from '../hooks/usePermissions';
import { useData } from '../contexts/DataContext';
import { QuickAccess } from './QuickAccess';
import { esteDeIncasat } from '../utils/paymentStatus';
import { NewsfeedWidget } from './NewsfeedWidget';
import { DeRezolvatCard, ProblemaDeRezolvat } from './DeRezolvatCard';
import { VIEW_TITLES } from './Header';

interface AdminMasterMapProps {
    onNavigate: (view: View) => void;
    deconturiFederatie: DecontFederatie[];
    inscrieriExamene: InscriereExamen[];
    plati: Plata[];
    currentUser: User | null;
}

type Actiune = { label: string; view: View; primary?: boolean };

const ACTIUNI: Record<'federatie' | 'club' | 'instructor', Actiune[]> = {
    federatie: [
        { label: 'Gestiune cluburi', view: 'cluburi', primary: true },
        { label: 'Deconturi federație', view: 'deconturi-federatie' },
        { label: 'Panou federație', view: 'federation-dashboard' },
    ],
    club: [
        { label: 'Începe prezența', view: 'prezenta', primary: true },
        { label: 'Plăți & Facturi', view: 'plati-hub' },
        { label: 'Adaugă sportiv', view: 'sportivi' },
    ],
    instructor: [
        { label: 'Începe prezența', view: 'prezenta-instructor', primary: true },
        { label: 'Grupe & Orar', view: 'grupe' },
    ],
};

export const AdminMasterMap: React.FC<AdminMasterMapProps> = ({ onNavigate, deconturiFederatie, inscrieriExamene, plati, currentUser }) => {
    const { activeRoleContext, loading, sportivi, clubs, grade, filteredData } = useData();
    const permissions = usePermissions(activeRoleContext);
    const [antrenamenteAzi, setAntrenamenteAzi] = React.useState<number | null>(null);
    const [cereriNoi, setCereriNoi] = React.useState(0);

    const rol: 'federatie' | 'club' | 'instructor' = permissions.isFederationAdmin ? 'federatie' : permissions.isAdminClub ? 'club' : 'instructor';

    const pendingDeconturi = React.useMemo(() =>
        (deconturiFederatie || []).filter(d => d.status_plata === 'In asteptare').length,
    [deconturiFederatie]);

    const pendingExamPayments = React.useMemo(() =>
        (inscrieriExamene || []).filter(i => {
            if (!i.plata_id) return false;
            const p = (plati || []).find(pl => pl.id === i.plata_id);
            return !!p && esteDeIncasat(p);
        }).length,
    [inscrieriExamene, plati]);

    useEffect(() => {
        const today = new Date().toLocaleDateString('sv-SE');
        let query = supabase
            .from('program_antrenamente')
            .select('id', { count: 'exact', head: true })
            .eq('data', today);
        if (currentUser?.club_id) query = query.eq('club_id', currentUser.club_id);
        query.then(({ count }) => setAntrenamenteAzi(count ?? 0));
    }, [currentUser?.club_id]);

    // Doar count (head), doar pentru federatie; RLS decide randurile numarate, la eroare = 0.
    useEffect(() => {
        if (!permissions.isFederationAdmin) return;
        supabase
            .from('cereri_inregistrare')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'in_asteptare')
            .then(({ count, error }) => setCereriNoi(error ? 0 : (count ?? 0)));
    }, [permissions.isFederationAdmin]);

    const problemeFederatie = React.useMemo<ProblemaDeRezolvat[]>(() => {
        const rez: ProblemaDeRezolvat[] = [];
        if (pendingDeconturi > 0) rez.push({ id: 'deconturi', titlu: `${pendingDeconturi} deconturi în așteptare`, detaliu: 'Deconturi trimise de cluburi, neachitate încă.', actiune: 'Vezi deconturile', view: 'deconturi-federatie' });
        if (pendingExamPayments > 0) rez.push({ id: 'plati-examen', titlu: `${pendingExamPayments} plăți de examen neîncasate`, detaliu: 'Înscrieri la examen cu factura neachitată.', actiune: 'Vezi sesiunile', view: 'examene' });
        if (cereriNoi > 0) rez.push({ id: 'cereri', titlu: `${cereriNoi} cereri de înscriere noi`, detaliu: 'Cereri în așteptarea unei decizii.', actiune: 'Vezi cererile', view: 'cereri-inscriere' });
        return rez;
    }, [pendingDeconturi, pendingExamPayments, cereriNoi]);

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                    <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
                </div>
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    const nume = currentUser?.prenume || currentUser?.nume;
    const dataAzi = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
    const cs = filteredData;
    const sportiviActivi = (cs.sportivi || []).filter(s => s.status === 'Activ');
    const deIncasat = (cs.plati || []).filter(p => esteDeIncasat(p)).length;
    const grupeActive = (cs.grupe || []).filter(g => !g.arhivat);
    const azi = antrenamenteAzi === null ? '—' : antrenamenteAzi;

    const kpi = rol === 'federatie'
        ? [
            { label: 'Cluburi active', value: (clubs || []).length, icon: BuildingOfficeIcon },
            { label: 'Sportivi total', value: (sportivi || []).length, icon: UsersIcon },
            { label: 'Deconturi în așteptare', value: pendingDeconturi, icon: BanknotesIcon, accentColor: pendingDeconturi > 0 ? 'rose' : undefined },
        ]
        : rol === 'club'
        ? [
            { label: 'Sportivi activi', value: sportiviActivi.length, icon: UsersIcon },
            { label: 'Antrenamente azi', value: azi, icon: CalendarDaysIcon },
            { label: 'De încasat', value: deIncasat, icon: WalletIcon, accentColor: deIncasat > 0 ? 'rose' : undefined },
        ]
        : [
            { label: 'Antrenamente azi', value: azi, icon: CalendarDaysIcon },
            { label: 'Grupele mele', value: grupeActive.length, icon: ArchiveBoxIcon },
            { label: 'Sportivi în grupe', value: sportiviActivi.filter(s => s.grupa_id).length, icon: UsersIcon },
        ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-tight text-[var(--t-text)]">Bună ziua{nume ? `, ${nume}` : ''}</h2>
                <p className="text-sm text-[var(--t-text-muted)]">{dataAzi}</p>
            </div>

            {rol === 'club' && (
                <DeRezolvatCard sportivi={cs.sportivi} grupe={cs.grupe} plati={cs.plati} tipuriAbonament={cs.tipuriAbonament} grade={grade} onNavigate={onNavigate} />
            )}
            {rol === 'federatie' && <DeRezolvatCard probleme={problemeFederatie} onNavigate={onNavigate} />}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                {kpi.map(k => <StatCard key={k.label} label={k.label} value={k.value} icon={k.icon} accentColor={k.accentColor} />)}
            </div>

            <Card className="md:p-6 space-y-4">
                <h2 className="text-base font-semibold text-[var(--t-text)]">Acțiuni rapide</h2>
                <div className="flex flex-wrap gap-2">
                    {ACTIUNI[rol].map(a => (
                        <Button key={a.view} size="sm" variant={a.primary ? 'primary' : 'secondary'} className="min-h-11 lg:min-h-9" onClick={() => onNavigate(a.view)}>
                            {a.label}
                        </Button>
                    ))}
                </div>
                <QuickAccess userId={currentUser?.id || 'anonymous'} onNavigate={onNavigate as (v: string) => void} labelMap={VIEW_TITLES as Record<string, string>} />
            </Card>

            <NewsfeedWidget clubId={activeRoleContext?.club_id ?? currentUser?.club_id ?? null} onNavigate={onNavigate} />
        </div>
    );
};
