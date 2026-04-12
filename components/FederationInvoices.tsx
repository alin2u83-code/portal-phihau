import React, { useState, useMemo } from 'react';
import { DecontFederatie, DecontSportiv, Sportiv, User, Rol, Permissions } from '../types';
import { Card, Button, Modal, Input } from './ui';
import { ArrowLeftIcon, BanknotesIcon, UploadCloudIcon, SearchIcon, CheckCircleIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// --- Sub-componente ---

interface SportivSelectItemProps {
    sportiv: Sportiv;
    selected: boolean;
    onToggle: (id: string) => void;
}

const SportivSelectItem: React.FC<SportivSelectItemProps> = ({ sportiv, selected, onToggle }) => (
    <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors select-none">
        <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(sportiv.id)}
            className="w-4 h-4 accent-brand-primary rounded"
        />
        <span className={`text-sm ${selected ? 'text-white font-semibold' : 'text-slate-300'}`}>
            {sportiv.nume} {sportiv.prenume}
        </span>
    </label>
);

interface PaymentConfirmationModalProps {
    decont: DecontFederatie;
    sportivi: Sportiv[];
    decontSportivi: DecontSportiv[];
    anCurent: number;
    onClose: () => void;
    onConfirm: (decont: DecontFederatie, file: File, sportiviSelectati: string[]) => Promise<void>;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
    decont,
    sportivi,
    decontSportivi,
    anCurent,
    onClose,
    onConfirm,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Sportivii deja acoperiți de un alt decont în același an
    const sportiviDejaAcoperiti = useMemo(() => {
        return new Set(
            decontSportivi
                .filter(ds => ds.an === anCurent && ds.decont_id !== decont.id)
                .map(ds => ds.sportiv_id)
        );
    }, [decontSportivi, anCurent, decont.id]);

    const sportiviDisponibili = useMemo(() => {
        return sportivi
            .filter(s => s.status === 'Activ' && !sportiviDejaAcoperiti.has(s.id))
            .filter(s => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                return s.nume.toLowerCase().includes(q) || s.prenume.toLowerCase().includes(q);
            });
    }, [sportivi, sportiviDejaAcoperiti, search]);

    const handleToggle = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === sportiviDisponibili.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sportiviDisponibili.map(s => s.id)));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleConfirm = async () => {
        if (!file) return;
        setLoading(true);
        await onConfirm(decont, file, Array.from(selectedIds));
        setLoading(false);
    };

    // Suma per sportiv: dacă decont are suma și nr_participanti > 0, calculăm
    const sumPerSportiv = decont.nr_participanti && decont.nr_participanti > 0
        ? (decont.suma_totala || 0) / decont.nr_participanti
        : null;
    const totalCalculat = sumPerSportiv != null ? selectedIds.size * sumPerSportiv : null;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Confirmă Plata: ${decont.tip_activitate}`}>
            <div className="space-y-4">
                <p>
                    Suma totală: <strong>{(decont.suma_totala || 0).toFixed(2)} RON</strong>.
                    Încărcați dovada plății și selectați sportivii acoperiți de acest decont.
                </p>

                {/* Secțiune selecție sportivi */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-300">
                            Sportivi acoperiți ({selectedIds.size} selectați)
                        </label>
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-xs text-brand-secondary hover:underline"
                        >
                            {selectedIds.size === sportiviDisponibili.length ? 'Deselectează tot' : 'Selectează tot'}
                        </button>
                    </div>

                    {/* Număr actualizat */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-sm">
                            <CheckCircleIcon className="w-4 h-4 text-brand-secondary flex-shrink-0" />
                            <span className="text-slate-300">
                                <strong className="text-white">{selectedIds.size} sportivi selectați</strong>
                                {totalCalculat != null && (
                                    <> — Total: {selectedIds.size} × {sumPerSportiv!.toFixed(2)} = <strong className="text-white">{totalCalculat.toFixed(2)} RON</strong></>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Căutare */}
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Caută sportiv..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary"
                        />
                    </div>

                    {/* Lista sportivi — mobil: full-width scroll, desktop: grid 2 col */}
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 p-2 bg-slate-800/50">
                        {sportiviDisponibili.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-4 italic">
                                {search ? 'Niciun sportiv găsit.' : 'Toți sportivii activi sunt deja acoperiți de alt decont.'}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                                {sportiviDisponibili.map(s => (
                                    <SportivSelectItem
                                        key={s.id}
                                        sportiv={s}
                                        selected={selectedIds.has(s.id)}
                                        onToggle={handleToggle}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Upload dovadă plată */}
                <label htmlFor="file-upload-decont" className="cursor-pointer block">
                    <div className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors ${preview ? 'border-green-500 bg-green-900/20' : 'border-slate-600 hover:border-brand-primary hover:bg-brand-primary/10'}`}>
                        {preview ? (
                            <img src={preview} alt="Previzualizare" className="max-h-48 mx-auto rounded-md" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <UploadCloudIcon className="w-10 h-10 text-slate-400 mb-2" />
                                <span className="font-semibold text-brand-primary">Alege un fișier</span>
                                <p className="text-xs text-slate-500">PNG, JPG, PDF (MAX. 5MB)</p>
                            </div>
                        )}
                    </div>
                </label>
                <input id="file-upload-decont" name="file-upload-decont" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />

                {file && <p className="text-sm text-center font-semibold text-slate-300">Fișier selectat: {file.name}</p>}

                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="success" onClick={handleConfirm} isLoading={loading} disabled={!file}>
                        Confirmă și Încarcă
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Componenta Principală ---

interface FederationInvoicesProps {
    deconturi: DecontFederatie[];
    setDeconturi: React.Dispatch<React.SetStateAction<DecontFederatie[]>>;
    decontSportivi: DecontSportiv[];
    setDecontSportivi: React.Dispatch<React.SetStateAction<DecontSportiv[]>>;
    sportivi: Sportiv[];
    currentUser: User;
    onBack: () => void;
    permissions: Permissions;
}

export const FederationInvoices: React.FC<FederationInvoicesProps> = ({
    deconturi,
    setDeconturi,
    decontSportivi,
    setDecontSportivi,
    sportivi,
    currentUser,
    onBack,
    permissions,
}) => {
    const { isFederationAdmin, isAdminClub } = permissions;
    const { showError, showSuccess } = useError();
    const [selectedDecont, setSelectedDecont] = useState<DecontFederatie | null>(null);

    const anCurent = new Date().getFullYear();

    const filteredDeconturi = useMemo(() => {
        const sorted = [...deconturi].sort((a, b) => {
            const dateA = a.data_generare ? new Date(a.data_generare).getTime() : 0;
            const dateB = b.data_generare ? new Date(b.data_generare).getTime() : 0;
            return dateB - dateA;
        });
        if (isFederationAdmin) return sorted;
        return sorted.filter(d => d.club_id === currentUser.club_id);
    }, [deconturi, currentUser.club_id, isFederationAdmin]);

    const totalDePlata = useMemo(() => {
        return filteredDeconturi
            .filter(d => d.status_plata === 'In asteptare')
            .reduce((sum, d) => sum + (d.suma_totala || 0), 0);
    }, [filteredDeconturi]);

    const handleConfirmPayment = async (decont: DecontFederatie, file: File, sportiviSelectati: string[]) => {
        if (!supabase) return;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `public/${decont.club_id}/${decont.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('chitante_deconturi').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data, error } = await supabase
                .from('deconturi_federatie')
                .update({ status_plata: 'Platit' })
                .eq('id', decont.id)
                .select()
                .single();
            if (error) throw error;

            // Inserează rândurile în decont_sportivi pentru fiecare sportiv selectat
            if (sportiviSelectati.length > 0) {
                // Determinăm anul din data_generare a decontului, fallback la anCurent
                const anDecont = decont.data_generare
                    ? new Date(decont.data_generare).getFullYear()
                    : anCurent;

                const rows = sportiviSelectati.map(sportivId => ({
                    decont_id: decont.id,
                    sportiv_id: sportivId,
                    an: anDecont,
                }));

                const { data: dsData, error: dsError } = await supabase
                    .from('decont_sportivi')
                    .upsert(rows, { onConflict: 'decont_id,sportiv_id', ignoreDuplicates: true })
                    .select();

                if (dsError) throw dsError;

                if (dsData && dsData.length > 0) {
                    setDecontSportivi(prev => [...prev, ...dsData]);
                }
            }

            setDeconturi(prev => prev.map(d => d.id === decont.id ? data : d));
            showSuccess("Succes", `Plata a fost confirmată${sportiviSelectati.length > 0 ? ` pentru ${sportiviSelectati.length} sportivi` : ''}.`);
            setSelectedDecont(null);
        } catch (err: any) {
            console.error('DETALII EROARE:', JSON.stringify(err, null, 2));
            showError("Eroare la Confirmare", err.message);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Deconturi către Federație</h1>

            <Card className="bg-brand-primary/10 border-brand-primary/30">
                <div className="flex items-center gap-4">
                    <BanknotesIcon className="w-10 h-10 text-brand-secondary" />
                    <div>
                        <h3 className="text-sm font-bold uppercase text-slate-400">Total de Plată către Federație</h3>
                        <p className={`text-4xl font-black ${totalDePlata > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {totalDePlata.toFixed(2)} RON
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 font-bold text-white">Istoric Deconturi</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/30 text-slate-400 text-xs uppercase">
                            <tr>
                                <th className="p-3">Activitate</th>
                                <th className="p-3">Data</th>
                                <th className="p-3 text-center">Nr. Sportivi</th>
                                <th className="p-3 text-right">Sumă</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredDeconturi.map(d => (
                                <tr key={d.id}>
                                    <td className="p-3 font-semibold">{d.tip_activitate}</td>
                                    <td className="p-3">{d.data_generare ? new Date(d.data_generare).toLocaleDateString('ro-RO') : '-'}</td>
                                    <td className="p-3 text-center">{d.nr_participanti}</td>
                                    <td className="p-3 text-right font-bold text-white">{(d.suma_totala || 0).toFixed(2)} RON</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status_plata === 'Platit' ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>
                                            {d.status_plata === 'Platit' ? 'ACHITAT' : 'NEACHITAT'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {d.status_plata === 'In asteptare' && isAdminClub ? (
                                            <Button size="sm" variant="success" onClick={() => setSelectedDecont(d)}>Confirmă Plată</Button>
                                        ) : (
                                            <span className="text-xs text-slate-500 italic">
                                                {d.status_plata === 'Platit'
                                                    ? `${decontSportivi.filter(ds => ds.decont_id === d.id).length} sportivi`
                                                    : 'Fără dovadă'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredDeconturi.length === 0 && (
                        <p className="p-8 text-center text-slate-500 italic">Niciun decont înregistrat.</p>
                    )}
                </div>
            </Card>

            {selectedDecont && (
                <PaymentConfirmationModal
                    decont={selectedDecont}
                    sportivi={sportivi}
                    decontSportivi={decontSportivi}
                    anCurent={anCurent}
                    onClose={() => setSelectedDecont(null)}
                    onConfirm={handleConfirmPayment}
                />
            )}
        </div>
    );
};
