import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Card, Badge, EmptyState, ConfirmModal } from '../ui';
import { ArrowLeftIcon } from '../icons';

type StatusCerere = 'in_asteptare' | 'aprobata' | 'respinsa';
type TipCerere = 'export' | 'stergere';

interface CerereGDPR {
    id: string;
    sportiv_id: string;
    tip_cerere: TipCerere;
    status: StatusCerere;
    data_cerere: string;
    procesat_la: string | null;
    procesat_de: string | null;
    sportiv: { nume: string; prenume: string; club_id: string | null } | null;
}

interface CereriGDPRProps {
    onBack: () => void;
}

const TAB_LABELS: { key: StatusCerere; label: string }[] = [
    { key: 'in_asteptare', label: 'În așteptare' },
    { key: 'aprobata', label: 'Aprobate' },
    { key: 'respinsa', label: 'Respinse' },
];

export const CereriGDPR: React.FC<CereriGDPRProps> = ({ onBack }) => {
    const [cereri, setCereri] = useState<CerereGDPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StatusCerere>('in_asteptare');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [respingereModal, setRespingereModal] = useState<{ open: boolean; cerereId: string | null }>({
        open: false,
        cerereId: null,
    });

    // Fetch fara nicio filtrare de club in client — scoping-ul e facut integral
    // de RLS (politica "Admin_Club_Select_Cereri_GDPR" din Planul 01, scopata
    // pe get_active_club_id()). Un ADMIN_CLUB primeste de la Supabase DOAR
    // cererile clubului sau activ; nu lipseste un .eq('club_id', ...) aici.
    const fetchCereri = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cereri_gdpr')
            .select('*, sportiv:sportiv_id(nume, prenume, club_id)')
            .order('data_cerere', { ascending: false });

        if (!error && data) {
            setCereri(data as CerereGDPR[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCereri();
    }, [fetchCereri]);

    const filteredCereri = cereri.filter(c => c.status === activeTab);
    const countAsteptare = cereri.filter(c => c.status === 'in_asteptare').length;

    // Payload-ul de update contine EXCLUSIV status. Ambele campuri de audit
    // (data procesarii + autorul procesarii) sunt setate server-side de
    // trigger-ul tr_cereri_gdpr_procesare (Planul 01) cu auth.uid()/now() —
    // trimiterea lor din client ar scrie valori gresite (ex. un id de sportiv
    // in loc de un id de utilizator auth).
    const handleAproba = async (id: string) => {
        setProcessingId(id);
        await supabase.from('cereri_gdpr').update({ status: 'aprobata' }).eq('id', id);
        await fetchCereri();
        setProcessingId(null);
    };

    const handleRespinge = (id: string) => {
        setRespingereModal({ open: true, cerereId: id });
    };

    const handleConfirmRespingere = async () => {
        if (!respingereModal.cerereId) return;
        const id = respingereModal.cerereId;
        setProcessingId(id);
        setRespingereModal({ open: false, cerereId: null });

        await supabase.from('cereri_gdpr').update({ status: 'respinsa' }).eq('id', id);

        await fetchCereri();
        setProcessingId(null);
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('ro-RO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const tipLabel = (tip: TipCerere) => (tip === 'export' ? 'Export date' : 'Ștergere date');

    const statusBadge = (status: StatusCerere) => {
        if (status === 'in_asteptare') return <Badge variant="amber">În așteptare</Badge>;
        if (status === 'aprobata') return <Badge variant="green">Aprobată</Badge>;
        return <Badge variant="red">Respinsă</Badge>;
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={onBack}>
                    <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Cereri GDPR</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                        Coadă de aprobare pentru cererile de export/ștergere date depuse de sportivii clubului tău.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
                {TAB_LABELS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                        {tab.key === 'in_asteptare' && countAsteptare > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                {countAsteptare}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
            ) : filteredCereri.length === 0 ? (
                <EmptyState
                    title={
                        activeTab === 'in_asteptare'
                            ? 'Nicio cerere în așteptare'
                            : activeTab === 'aprobata'
                            ? 'Nicio cerere aprobată'
                            : 'Nicio cerere respinsă'
                    }
                    description={activeTab === 'in_asteptare' ? 'Toate cererile au fost procesate.' : undefined}
                />
            ) : (
                <Card className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'var(--t-table-header-bg)', color: 'var(--t-table-header-text)' }}>
                                    <th className="p-4 font-semibold">Sportiv</th>
                                    <th className="p-4 font-semibold">Tip cerere</th>
                                    <th className="p-4 font-semibold">Data cererii</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Procesat la</th>
                                    {activeTab === 'in_asteptare' && <th className="p-4 font-semibold text-right">Acțiuni</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {filteredCereri.map(cerere => (
                                    <tr key={cerere.id} className="hover:bg-[var(--t-table-row-hover)] transition-colors">
                                        <td className="p-4 font-medium text-white">
                                            {cerere.sportiv ? `${cerere.sportiv.prenume} ${cerere.sportiv.nume}` : '—'}
                                        </td>
                                        <td className="p-4 text-slate-300">{tipLabel(cerere.tip_cerere)}</td>
                                        <td className="p-4 text-slate-300 text-sm">{formatDateTime(cerere.data_cerere)}</td>
                                        <td className="p-4">{statusBadge(cerere.status)}</td>
                                        <td className="p-4 text-slate-300 text-sm">{formatDateTime(cerere.procesat_la)}</td>
                                        {activeTab === 'in_asteptare' && (
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        isLoading={processingId === cerere.id}
                                                        disabled={processingId !== null && processingId !== cerere.id}
                                                        onClick={() => handleAproba(cerere.id)}
                                                    >
                                                        Aprobă
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        disabled={processingId !== null}
                                                        onClick={() => handleRespinge(cerere.id)}
                                                    >
                                                        Respinge
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Bloc informativ permanent — previne cea mai probabila confuzie:
                aprobarea NU sterge si NU exporta automat datele (D-11). */}
            <Card className="text-sm text-slate-400 space-y-2">
                <p className="font-semibold text-slate-200">Ce se întâmplă după aprobare?</p>
                <p>
                    Aprobarea unei cereri înregistrează doar decizia administratorului — <span className="text-slate-300">exportul și
                    ștergerea efectivă a datelor rămân acțiuni MANUALE</span>, separate. Aprobarea nu declanșează automat nicio operație pe
                    date.
                </p>
                <p>
                    Pentru <span className="text-slate-300">export</span>, folosește funcțiile de export CSV/PDF deja existente în aplicație
                    (fișa digitală a sportivului, rapoartele existente).
                </p>
                <p>
                    Pentru <span className="text-slate-300">ștergere</span>, mergi în ecranul de gestiune a sportivilor și șterge profilul
                    respectiv, după ce ai verificat obligațiile legale de păstrare a datelor descrise în politica de retenție (
                    <code className="text-slate-300">docs/gdpr/POLITICA-RETENTIE.md</code>).
                </p>
            </Card>

            <ConfirmModal
                isOpen={respingereModal.open}
                onClose={() => setRespingereModal({ open: false, cerereId: null })}
                onConfirm={handleConfirmRespingere}
                title="Respinge cererea GDPR"
                message="Ești sigur că vrei să respingi această cerere? Sportivul va vedea statusul „Respinsă” în pagina Protecția datelor."
                confirmLabel="Confirmă respingerea"
                variant="danger"
            />
        </div>
    );
};
