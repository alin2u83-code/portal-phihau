import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { Button, Card, Badge, EmptyState } from '../ui';
import { ArrowLeftIcon, ShieldCheckIcon } from '../icons';

type StatusCerere = 'in_asteptare' | 'aprobata' | 'respinsa';
type TipCerere = 'export' | 'stergere';

// Nota: interfata NU declara campul de audit "procesat de admin" — componenta
// sportivului nu il citeste si nu il scrie niciodata (vezi Gotcha 2 din plan).
interface CerereGDPR {
    id: string;
    sportiv_id: string;
    tip_cerere: TipCerere;
    status: StatusCerere;
    data_cerere: string;
    procesat_la: string | null;
}

interface ProtectiaDatelorProps {
    onBack: () => void;
    sportivId: string | null;
}

export const ProtectiaDatelor: React.FC<ProtectiaDatelorProps> = ({ onBack, sportivId }) => {
    const { showError, showSuccess } = useError();
    const [cereri, setCereri] = useState<CerereGDPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingTip, setCreatingTip] = useState<TipCerere | null>(null);

    // Fetch cererile proprii ale sportivului curent — .eq('sportiv_id', ...) e
    // redundant fata de RLS, dar se pastreaza deliberat ca aparare in adancime
    // (CLAUDE.md: "frontend also filters ... to defend against RLS bypass").
    const fetchCereri = useCallback(async () => {
        if (!sportivId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('cereri_gdpr')
            .select('*')
            .eq('sportiv_id', sportivId)
            .order('data_cerere', { ascending: false });

        if (!error && data) {
            setCereri(data as CerereGDPR[]);
        }
        setLoading(false);
    }, [sportivId]);

    useEffect(() => {
        fetchCereri();
    }, [fetchCereri]);

    const areCerereInAsteptare = (tip: TipCerere) =>
        cereri.some(c => c.tip_cerere === tip && c.status === 'in_asteptare');

    // Insert-ul trimite EXCLUSIV sportiv_id si tip_cerere — status si data_cerere
    // au valori implicite in DB (Planul 01); procesat_de/procesat_la sunt scrise
    // exclusiv de trigger-ul server-side la schimbarea statusului.
    const handleCreareCerere = async (tip: TipCerere) => {
        if (!sportivId) return;
        setCreatingTip(tip);
        const { error } = await supabase
            .from('cereri_gdpr')
            .insert({ sportiv_id: sportivId, tip_cerere: tip });

        if (error) {
            showError('Eroare la trimiterea cererii', error);
        } else {
            showSuccess(
                'Cerere trimisă',
                tip === 'export'
                    ? 'Cererea de export al datelor a fost înregistrată și va fi analizată de administratorul clubului tău.'
                    : 'Cererea de ștergere a datelor a fost înregistrată și va fi analizată de administratorul clubului tău.'
            );
            await fetchCereri();
        }
        setCreatingTip(null);
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
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Protecția datelor</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                        Drepturile tale privind datele cu caracter personal prelucrate de portal.
                    </p>
                </div>
            </div>

            {/* Sectiunea de drepturi — vizibila pentru ORICE rol autentificat (D-15) */}
            <Card className="space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-5 h-5 text-amber-400 shrink-0" />
                    <h2 className="text-lg font-bold text-white">Drepturile tale conform GDPR</h2>
                </div>

                <div className="space-y-3 text-sm">
                    <div>
                        <p className="font-semibold text-slate-100">Dreptul de acces</p>
                        <p className="text-slate-400">
                            Poți afla ce date personale deține portalul despre tine (date de identificare, prezență, grade, plăți) și poți
                            solicita o copie a acestora prin cererea de export de mai jos.
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-100">Dreptul la rectificare</p>
                        <p className="text-slate-400">
                            Dacă o dată despre tine este incorectă sau incompletă, poți cere corectarea ei contactând administratorul clubului
                            tău.
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-100">Dreptul la ștergere</p>
                        <p className="text-slate-400">
                            Poți solicita ștergerea datelor tale personale prin cererea de mai jos. Anumite date financiare și de certificare a
                            gradelor pot fi păstrate o perioadă determinată, pe baza obligațiilor legale — detalii în politica de retenție a
                            federației (<code className="text-slate-300">docs/gdpr/POLITICA-RETENTIE.md</code>).
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-100">Dreptul la opoziție</p>
                        <p className="text-slate-400">
                            Te poți opune anumitor prelucrări ale datelor tale (de exemplu, comunicări care nu sunt necesare pentru activitatea
                            sportivă), contactând administratorul clubului tău.
                        </p>
                    </div>
                </div>

                <div className="pt-3 border-t border-[var(--t-border)] text-xs text-slate-500 space-y-1.5">
                    <p>
                        Nota completă de informare privind protecția datelor este disponibilă la înregistrarea unui sportiv nou, în formularul
                        de creare a profilului.
                    </p>
                    <p>
                        Lista furnizorilor externi (subprocesatori) care pot avea acces la anumite date este documentată de federație (
                        <code className="text-slate-300">docs/gdpr/SUBPROCESATORI.md</code>).
                    </p>
                    <p>
                        Dacă consideri că drepturile tale nu sunt respectate, poți depune o plângere la Autoritatea Națională de Supraveghere a
                        Prelucrării Datelor cu Caracter Personal (ANSPDCP) —{' '}
                        <a
                            href="https://www.dataprotection.ro"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline"
                        >
                            www.dataprotection.ro
                        </a>
                        .
                    </p>
                </div>
            </Card>

            {sportivId ? (
                <>
                    {/* Sectiunea de creare cerere — randata DOAR cand exista un profil de sportiv legat (D-10) */}
                    <Card className="space-y-4">
                        <h2 className="text-lg font-bold text-white">Solicită o cerere</h2>
                        <p className="text-sm text-slate-400">
                            Cererea ta va fi trimisă administratorului clubului tău spre aprobare. Aprobarea NU declanșează automat exportul
                            sau ștergerea — acestea rămân acțiuni manuale, ulterioare aprobării.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Button
                                    variant="info"
                                    className="w-full"
                                    isLoading={creatingTip === 'export'}
                                    disabled={creatingTip !== null || areCerereInAsteptare('export')}
                                    onClick={() => handleCreareCerere('export')}
                                >
                                    Solicită export date
                                </Button>
                                {areCerereInAsteptare('export') && (
                                    <p className="text-xs text-slate-500 mt-1.5">Ai deja o cerere de export în așteptare.</p>
                                )}
                            </div>
                            <div className="flex-1">
                                <Button
                                    variant="danger"
                                    className="w-full"
                                    isLoading={creatingTip === 'stergere'}
                                    disabled={creatingTip !== null || areCerereInAsteptare('stergere')}
                                    onClick={() => handleCreareCerere('stergere')}
                                >
                                    Solicită ștergere date
                                </Button>
                                {areCerereInAsteptare('stergere') && (
                                    <p className="text-xs text-slate-500 mt-1.5">Ai deja o cerere de ștergere în așteptare.</p>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Lista cererilor proprii — randata DOAR cand exista un profil de sportiv legat (D-14) */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold text-white">Cererile mele</h2>
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                            </div>
                        ) : cereri.length === 0 ? (
                            <EmptyState
                                title="Nicio cerere depusă"
                                description="Cererile tale de export sau ștergere a datelor vor apărea aici, împreună cu statusul lor."
                            />
                        ) : (
                            <div className="grid gap-3">
                                {cereri.map(cerere => (
                                    <Card
                                        key={cerere.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                                    >
                                        <div>
                                            <p className="font-semibold text-white">{tipLabel(cerere.tip_cerere)}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Cerere depusă: {formatDateTime(cerere.data_cerere)}
                                                {cerere.procesat_la && <> · Procesat: {formatDateTime(cerere.procesat_la)}</>}
                                            </p>
                                        </div>
                                        {statusBadge(cerere.status)}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                // Utilizator fara profil de sportiv legat (ex. SUPER_ADMIN_FEDERATIE fara sportiv) — fara
                // butoane de creare cerere, fara eroare (D-10, D-15).
                <Card className="text-sm text-slate-400">
                    Acest cont nu are un profil de sportiv asociat, deci nu poate depune direct o cerere din această pagină. Pentru cereri
                    privind datele tale personale, te rugăm să contactezi administratorul clubului tău.
                </Card>
            )}
        </div>
    );
};
