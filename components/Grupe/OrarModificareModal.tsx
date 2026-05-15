import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../supabaseClient';
import { useError } from '../ErrorProvider';
import { Button, Input } from '../ui';
import {
    XIcon,
    CalendarIcon,
    ClockIcon,
    BellIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from '../icons';

// ─── Tipuri ──────────────────────────────────────────────────────────────────

type TipTab = 'schimbare_permanenta' | 'exceptie';
type ZiuaSaptamana = 'Luni' | 'Marți' | 'Miercuri' | 'Joi' | 'Vineri' | 'Sâmbătă' | 'Duminică';

const ZILE: ZiuaSaptamana[] = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

interface GrupaMinim {
    id: string;
    denumire: string;
    club_id?: string | null;
}

interface OrarModificareModalProps {
    isOpen: boolean;
    onClose: () => void;
    grupa: GrupaMinim;
    currentUserId: string;
    onSaved?: () => void;
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {children}
    </label>
);

const FieldGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`space-y-1 ${className}`}>{children}</div>
);

const SelectNativ: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({
    label,
    id,
    className = '',
    ...props
}) => (
    <div>
        {label && <Label htmlFor={id}>{label}</Label>}
        <select
            id={id}
            className={`w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${className}`}
            {...props}
        />
    </div>
);

// ─── Componenta principală ────────────────────────────────────────────────────

export const OrarModificareModal: React.FC<OrarModificareModalProps> = ({
    isOpen,
    onClose,
    grupa,
    currentUserId,
    onSaved,
}) => {
    const { showError, showSuccess } = useError();
    const [activeTab, setActiveTab] = useState<TipTab>('schimbare_permanenta');
    const [loading, setLoading] = useState(false);

    // Tab 1 — Schimbare permanentă
    const [sp_dataVigoare, setSp_dataVigoare] = useState('');
    const [sp_ziNoua, setSp_ziNoua] = useState<ZiuaSaptamana>('Luni');
    const [sp_oraInceput, setSp_oraInceput] = useState('18:00');
    const [sp_oraSfarsit, setSp_oraSfarsit] = useState('19:30');

    // Tab 2 — Excepție / Interval
    const [ex_dataInceput, setEx_dataInceput] = useState('');
    const [ex_dataSfarsit, setEx_dataSfarsit] = useState('');
    const [ex_tip, setEx_tip] = useState<'exceptie' | 'interval'>('exceptie');
    const [ex_esteAnulat, setEx_esteAnulat] = useState(false);
    const [ex_ziNoua, setEx_ziNoua] = useState<ZiuaSaptamana>('Luni');
    const [ex_oraInceput, setEx_oraInceput] = useState('18:00');
    const [ex_oraSfarsit, setEx_oraSfarsit] = useState('19:30');
    const [ex_motiv, setEx_motiv] = useState('');
    const [ex_notifica, setEx_notifica] = useState(false);

    // Reset la deschidere
    useEffect(() => {
        if (isOpen) {
            const azi = new Date().toISOString().split('T')[0];
            setActiveTab('schimbare_permanenta');
            setSp_dataVigoare(azi);
            setSp_ziNoua('Luni');
            setSp_oraInceput('18:00');
            setSp_oraSfarsit('19:30');
            setEx_dataInceput(azi);
            setEx_dataSfarsit('');
            setEx_tip('exceptie');
            setEx_esteAnulat(false);
            setEx_ziNoua('Luni');
            setEx_oraInceput('18:00');
            setEx_oraSfarsit('19:30');
            setEx_motiv('');
            setEx_notifica(false);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // ─── Salvare Tab 1 ────────────────────────────────────────────────────────

    const handleSaveSchimbarePermanenta = async () => {
        if (!sp_dataVigoare) {
            showError('Câmp obligatoriu', 'Selectează data de intrare în vigoare.');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                grupa_id: grupa.id,
                club_id: grupa.club_id,
                tip: 'schimbare_permanenta',
                data_inceput: sp_dataVigoare,
                data_intrare_vigoare: sp_dataVigoare,
                zi_noua: sp_ziNoua,
                ora_inceput_noua: sp_oraInceput,
                ora_sfarsit_noua: sp_oraSfarsit,
                este_anulat: false,
                created_by: currentUserId,
            };
            const { error } = await supabase.from('orar_exceptii').insert(payload);
            if (error) throw error;
            showSuccess('Salvat', 'Schimbarea permanentă a fost înregistrată.');
            onSaved?.();
            onClose();
        } catch (err: any) {
            showError('Eroare la salvare', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Salvare Tab 2 ────────────────────────────────────────────────────────

    const handleSaveExceptie = async () => {
        if (!ex_dataInceput) {
            showError('Câmp obligatoriu', 'Selectează data de început.');
            return;
        }
        setLoading(true);
        try {
            const tipFinal = ex_dataSfarsit && ex_dataSfarsit !== ex_dataInceput ? 'interval' : 'exceptie';
            const payload: Record<string, any> = {
                grupa_id: grupa.id,
                club_id: grupa.club_id,
                tip: tipFinal,
                data_inceput: ex_dataInceput,
                data_sfarsit: ex_dataSfarsit || null,
                este_anulat: ex_esteAnulat,
                motiv: ex_motiv || null,
                created_by: currentUserId,
            };

            if (!ex_esteAnulat) {
                payload.zi_noua = ex_ziNoua;
                payload.ora_inceput_noua = ex_oraInceput;
                payload.ora_sfarsit_noua = ex_oraSfarsit;
            }

            const { data: exceptieData, error } = await supabase
                .from('orar_exceptii')
                .insert(payload)
                .select('id')
                .single();
            if (error) throw error;

            // Notificări în-app pentru sportivii grupei
            if (ex_notifica) {
                await trimiteNotificariSportivi(ex_esteAnulat, ex_dataInceput, ex_dataSfarsit, ex_motiv);
                // Marchează excepția ca notificată
                if (exceptieData?.id) {
                    await supabase
                        .from('orar_exceptii')
                        .update({ notificare_trimisa: true, notificare_trimisa_la: new Date().toISOString() })
                        .eq('id', exceptieData.id);
                }
            }

            const mesajTip = ex_esteAnulat ? 'Anulare' : 'Modificare';
            showSuccess('Salvat', `${mesajTip} înregistrată${ex_notifica ? ' și sportivii au fost notificați' : ''}.`);
            onSaved?.();
            onClose();
        } catch (err: any) {
            showError('Eroare la salvare', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Notificări ───────────────────────────────────────────────────────────

    const trimiteNotificariSportivi = async (
        esteAnulat: boolean,
        dataInceput: string,
        dataSfarsit: string,
        motiv: string
    ) => {
        // Aduce sportivii grupei care au user_id (cont creat)
        const { data: sportivi, error } = await supabase
            .from('sportivi')
            .select('id, user_id, nume, prenume')
            .eq('grupa_id', grupa.id)
            .not('user_id', 'is', null);

        if (error || !sportivi || sportivi.length === 0) return;

        const dataFormatat = dataSfarsit
            ? `${dataInceput} – ${dataSfarsit}`
            : dataInceput;

        const title = esteAnulat
            ? `Antrenament anulat — ${grupa.denumire}`
            : `Program modificat — ${grupa.denumire}`;

        const body = esteAnulat
            ? `Antrenamentul din ${dataFormatat} a fost anulat.${motiv ? ` Motiv: ${motiv}` : ''}`
            : `Programul grupei tale (${dataFormatat}) a fost modificat.${motiv ? ` Motiv: ${motiv}` : ''}`;

        const notificari = sportivi.map((s) => ({
            title,
            body,
            sent_by: currentUserId,
            tip: 'orar_modificare',
            club_id: grupa.club_id,
            recipient_user_id: s.user_id,
            tip_destinatar: 'INDIVIDUAL',
            is_read: false,
            status_citire: false,
        }));

        if (notificari.length > 0) {
            await supabase.from('notificari').insert(notificari);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/80 z-[9999] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Modificare program grupă"
        >
            <div
                className="bg-slate-900 border border-slate-700/80 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
                onClick={(e) => e.stopPropagation()}
                style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-700/80 bg-slate-800/60 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <CalendarIcon className="w-5 h-5 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-white truncate">Modificare Program</h2>
                            <p className="text-xs text-slate-400 truncate">{grupa.denumire}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 -mr-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors active:scale-95 touch-manipulation shrink-0"
                        aria-label="Închide"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700/80 bg-slate-800/30 shrink-0">
                    {(
                        [
                            { key: 'schimbare_permanenta', label: 'Schimbare Permanentă' },
                            { key: 'exceptie', label: 'Excepție / Interval' },
                        ] as { key: TipTab; label: string }[]
                    ).map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-3 py-3 text-sm font-medium transition-all touch-manipulation ${
                                activeTab === tab.key
                                    ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain space-y-4">
                    {/* ── Tab 1: Schimbare permanentă ── */}
                    {activeTab === 'schimbare_permanenta' && (
                        <>
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs text-amber-300">
                                Definește o nouă zi și oră care înlocuiesc programul recurent, începând de la data selectată.
                            </div>

                            <FieldGroup>
                                <Label htmlFor="sp_vigoare">Data intrare în vigoare</Label>
                                <Input
                                    id="sp_vigoare"
                                    label=""
                                    type="date"
                                    value={sp_dataVigoare}
                                    onChange={(e) => setSp_dataVigoare(e.target.value)}
                                />
                            </FieldGroup>

                            <SelectNativ
                                id="sp_zi"
                                label="Ziua nouă"
                                value={sp_ziNoua}
                                onChange={(e) => setSp_ziNoua(e.target.value as ZiuaSaptamana)}
                            >
                                {ZILE.map((zi) => (
                                    <option key={zi} value={zi}>{zi}</option>
                                ))}
                            </SelectNativ>

                            <div className="grid grid-cols-2 gap-3">
                                <FieldGroup>
                                    <Label htmlFor="sp_start">Ora început</Label>
                                    <Input
                                        id="sp_start"
                                        label=""
                                        type="time"
                                        value={sp_oraInceput}
                                        onChange={(e) => setSp_oraInceput(e.target.value)}
                                    />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label htmlFor="sp_end">Ora sfârșit</Label>
                                    <Input
                                        id="sp_end"
                                        label=""
                                        type="time"
                                        value={sp_oraSfarsit}
                                        onChange={(e) => setSp_oraSfarsit(e.target.value)}
                                    />
                                </FieldGroup>
                            </div>
                        </>
                    )}

                    {/* ── Tab 2: Excepție / Interval ── */}
                    {activeTab === 'exceptie' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <FieldGroup>
                                    <Label htmlFor="ex_start">Data început</Label>
                                    <Input
                                        id="ex_start"
                                        label=""
                                        type="date"
                                        value={ex_dataInceput}
                                        onChange={(e) => setEx_dataInceput(e.target.value)}
                                    />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label htmlFor="ex_end">Data sfârșit (opțional)</Label>
                                    <Input
                                        id="ex_end"
                                        label=""
                                        type="date"
                                        value={ex_dataSfarsit}
                                        min={ex_dataInceput}
                                        onChange={(e) => setEx_dataSfarsit(e.target.value)}
                                    />
                                </FieldGroup>
                            </div>

                            {/* Toggle Mutat / Anulat */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEx_esteAnulat(false)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all touch-manipulation ${
                                        !ex_esteAnulat
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                                >
                                    <ClockIcon className="w-4 h-4" />
                                    Mutat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEx_esteAnulat(true)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all touch-manipulation ${
                                        ex_esteAnulat
                                            ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                    }`}
                                >
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    Anulat
                                </button>
                            </div>

                            {/* Zi + Ore — doar dacă e "Mutat" */}
                            {!ex_esteAnulat && (
                                <>
                                    <SelectNativ
                                        id="ex_zi"
                                        label="Ziua nouă"
                                        value={ex_ziNoua}
                                        onChange={(e) => setEx_ziNoua(e.target.value as ZiuaSaptamana)}
                                    >
                                        {ZILE.map((zi) => (
                                            <option key={zi} value={zi}>{zi}</option>
                                        ))}
                                    </SelectNativ>

                                    <div className="grid grid-cols-2 gap-3">
                                        <FieldGroup>
                                            <Label htmlFor="ex_ora_start">Ora început</Label>
                                            <Input
                                                id="ex_ora_start"
                                                label=""
                                                type="time"
                                                value={ex_oraInceput}
                                                onChange={(e) => setEx_oraInceput(e.target.value)}
                                            />
                                        </FieldGroup>
                                        <FieldGroup>
                                            <Label htmlFor="ex_ora_end">Ora sfârșit</Label>
                                            <Input
                                                id="ex_ora_end"
                                                label=""
                                                type="time"
                                                value={ex_oraSfarsit}
                                                onChange={(e) => setEx_oraSfarsit(e.target.value)}
                                            />
                                        </FieldGroup>
                                    </div>
                                </>
                            )}

                            {/* Motiv */}
                            <FieldGroup>
                                <Label htmlFor="ex_motiv">Motiv (opțional)</Label>
                                <textarea
                                    id="ex_motiv"
                                    value={ex_motiv}
                                    onChange={(e) => setEx_motiv(e.target.value)}
                                    rows={2}
                                    placeholder="ex: Concurs județean, sală ocupată..."
                                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none placeholder-slate-500"
                                />
                            </FieldGroup>

                            {/* Checkbox notificare */}
                            <label className="flex items-start gap-3 cursor-pointer group select-none">
                                <div className="relative shrink-0 mt-0.5">
                                    <input
                                        type="checkbox"
                                        checked={ex_notifica}
                                        onChange={(e) => setEx_notifica(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center">
                                        {ex_notifica && (
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                        <BellIcon className="w-4 h-4 text-indigo-400" />
                                        Notifică sportivii grupei
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Trimite notificare în aplicație sportivilor cu cont activ.
                                    </p>
                                </div>
                            </label>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-700/80 bg-slate-800/30 rounded-b-2xl shrink-0 flex gap-2 justify-end">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Anulează
                    </Button>
                    <Button
                        variant="warning"
                        onClick={activeTab === 'schimbare_permanenta' ? handleSaveSchimbarePermanenta : handleSaveExceptie}
                        isLoading={loading}
                    >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        Salvează
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
