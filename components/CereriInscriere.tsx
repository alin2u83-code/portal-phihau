import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

type StatusCerere = 'in_asteptare' | 'aprobata' | 'respinsa';

interface CerereInscriere {
    id: string;
    club_id: string;
    nume: string;
    prenume: string;
    data_nasterii: string | null;
    sex: string | null;
    email_contact: string;
    telefon: string | null;
    mesaj: string | null;
    status: StatusCerere;
    created_at: string;
    procesat_la: string | null;
    motiv_respingere: string | null;
    club: { nume: string } | null;
}

interface CereriInscriereProps {
    onBack: () => void;
}

const TAB_LABELS: { key: StatusCerere; label: string }[] = [
    { key: 'in_asteptare', label: 'În așteptare' },
    { key: 'aprobata', label: 'Aprobate' },
    { key: 'respinsa', label: 'Respinse' },
];

export const CereriInscriere: React.FC<CereriInscriereProps> = ({ onBack }) => {
    const [cereri, setCereri] = useState<CerereInscriere[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<StatusCerere>('in_asteptare');
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Modal respingere
    const [respingereModal, setRespingereModal] = useState<{ open: boolean; cerereId: string | null }>({ open: false, cerereId: null });
    const [motivRespingere, setMotivRespingere] = useState('');

    const [copySuccess, setCopySuccess] = useState(false);

    const fetchCereri = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('cereri_inregistrare')
            .select('*, club:club_id(nume)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setCereri(data as CerereInscriere[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCereri();
    }, [fetchCereri]);

    const filteredCereri = cereri.filter(c => c.status === activeTab);
    const countAsteptare = cereri.filter(c => c.status === 'in_asteptare').length;

    const handleAproba = async (id: string) => {
        setProcessingId(id);
        await supabase
            .from('cereri_inregistrare')
            .update({ status: 'aprobata', procesat_la: new Date().toISOString() })
            .eq('id', id);
        await fetchCereri();
        setProcessingId(null);
    };

    const handleRespinge = (id: string) => {
        setMotivRespingere('');
        setRespingereModal({ open: true, cerereId: id });
    };

    const handleConfirmRespingere = async () => {
        if (!respingereModal.cerereId) return;
        setProcessingId(respingereModal.cerereId);
        setRespingereModal({ open: false, cerereId: null });

        await supabase
            .from('cereri_inregistrare')
            .update({
                status: 'respinsa',
                procesat_la: new Date().toISOString(),
                motiv_respingere: motivRespingere || null,
            })
            .eq('id', respingereModal.cerereId);

        await fetchCereri();
        setProcessingId(null);
        setMotivRespingere('');
    };

    const handleCopyLink = async () => {
        const link = `${window.location.origin}/inscriere`;
        try {
            await navigator.clipboard.writeText(link);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            // fallback
            const el = document.createElement('textarea');
            el.value = link;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
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

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cereri Înscriere</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Gestionează cererile de înregistrare online.</p>
                </div>
                <button
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                        copySuccess
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                    title="Copiază link-ul public de înscriere"
                >
                    {copySuccess ? (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Link copiat!
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656L10.414 19.24A4 4 0 014.757 13.583l1.415-1.415m5.656-5.656l1.414-1.414a4 4 0 015.657 5.657l-3.535 3.535" />
                            </svg>
                            Copiază link înscriere
                        </>
                    )}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
                {TAB_LABELS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-slate-700 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200'
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
                    <svg className="animate-spin h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : filteredCereri.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <p className="text-slate-400 font-medium">
                        {activeTab === 'in_asteptare'
                            ? 'Nicio cerere în așteptare'
                            : activeTab === 'aprobata'
                            ? 'Nicio cerere aprobată'
                            : 'Nicio cerere respinsă'}
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                        {activeTab === 'in_asteptare' ? 'Toate cererile au fost procesate.' : ''}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredCereri.map(cerere => (
                        <div
                            key={cerere.id}
                            className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow hover:border-slate-700 transition-colors"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                {/* Info */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-white font-bold text-base">
                                            {cerere.prenume} {cerere.nume}
                                        </h3>
                                        {cerere.sex && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                                                {cerere.sex}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {cerere.email_contact}
                                        </span>
                                        {cerere.telefon && (
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                {cerere.telefon}
                                            </span>
                                        )}
                                        {cerere.data_nasterii && (
                                            <span className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {formatDate(cerere.data_nasterii)}
                                            </span>
                                        )}
                                    </div>

                                    {cerere.club && (
                                        <p className="text-sm text-slate-500">
                                            Club: <span className="text-slate-300 font-medium">{cerere.club.nume}</span>
                                        </p>
                                    )}

                                    {cerere.mesaj && (
                                        <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2 mt-2 italic border border-slate-700/50">
                                            "{cerere.mesaj}"
                                        </p>
                                    )}

                                    {cerere.motiv_respingere && (
                                        <p className="text-sm text-red-400/80 bg-red-500/5 rounded-lg px-3 py-2 mt-2 border border-red-500/10">
                                            Motiv respingere: {cerere.motiv_respingere}
                                        </p>
                                    )}

                                    <p className="text-xs text-slate-600 pt-1">
                                        Cerere depusă: {formatDateTime(cerere.created_at)}
                                        {cerere.procesat_la && (
                                            <> · Procesat: {formatDateTime(cerere.procesat_la)}</>
                                        )}
                                    </p>
                                </div>

                                {/* Actions — only for in_asteptare */}
                                {cerere.status === 'in_asteptare' && (
                                    <div className="flex gap-2 sm:flex-col shrink-0">
                                        <button
                                            onClick={() => handleAproba(cerere.id)}
                                            disabled={processingId === cerere.id}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingId === cerere.id ? (
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                            Aprobă
                                        </button>
                                        <button
                                            onClick={() => handleRespinge(cerere.id)}
                                            disabled={processingId === cerere.id}
                                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Respinge
                                        </button>
                                    </div>
                                )}

                                {/* Status badge for non-pending */}
                                {cerere.status !== 'in_asteptare' && (
                                    <span
                                        className={`shrink-0 self-start text-xs font-bold px-3 py-1.5 rounded-full border ${
                                            cerere.status === 'aprobata'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}
                                    >
                                        {cerere.status === 'aprobata' ? 'Aprobat' : 'Respins'}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Respingere Modal */}
            {respingereModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-white font-bold text-lg mb-2">Respinge cererea</h3>
                        <p className="text-slate-400 text-sm mb-4">
                            Poți adăuga un motiv opțional care va fi vizibil în istoricul cererii.
                        </p>
                        <textarea
                            value={motivRespingere}
                            onChange={e => setMotivRespingere(e.target.value)}
                            rows={3}
                            placeholder="Motiv respingere (opțional)..."
                            className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setRespingereModal({ open: false, cerereId: null })}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all"
                            >
                                Anulează
                            </button>
                            <button
                                onClick={handleConfirmRespingere}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all"
                            >
                                Confirmă respingerea
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
