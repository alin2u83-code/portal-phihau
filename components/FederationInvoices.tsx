import React, { useState, useEffect, useMemo } from 'react';
import { DecontFederatie, DecontSportiv, User, Permissions, MetodaPlataDecont } from '../types';
import { Card, Button, Modal, Select, EmptyState } from './ui';
import { BanknotesIcon, UploadCloudIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { formatNume, sortBySportivNume } from '../utils/formatareSportiv';
import { formatSezon } from '../utils/anFiscal';

// --- Sub-componente ---

interface SportivAcoperit {
    id: string;
    sportiv_id: string;
    nume?: string | null;
    prenume?: string | null;
}

const METODE_PLATA: MetodaPlataDecont[] = ['Cash', 'Transfer Bancar', 'Revolut'];

interface PaymentConfirmationModalProps {
    decont: DecontFederatie;
    onClose: () => void;
    onConfirm: (decont: DecontFederatie, file: File, metodaPlata: MetodaPlataDecont) => Promise<void>;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
    decont,
    onClose,
    onConfirm,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [metodaPlata, setMetodaPlata] = useState<MetodaPlataDecont | ''>('');
    const [sportiviAcoperiti, setSportiviAcoperiti] = useState<SportivAcoperit[]>([]);
    const [loadingSportivi, setLoadingSportivi] = useState(true);
    const [eroareSportivi, setEroareSportivi] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!supabase) return;
        setLoadingSportivi(true);
        setEroareSportivi(null);
        supabase
            .from('decont_sportivi')
            .select('id, sportiv_id, an, sportivi(id, nume, prenume)')
            .eq('decont_id', decont.id)
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    setEroareSportivi(error.message);
                } else {
                    const lista: SportivAcoperit[] = (data || []).map((row: any) => ({
                        id: row.id,
                        sportiv_id: row.sportiv_id,
                        nume: row.sportivi?.nume,
                        prenume: row.sportivi?.prenume,
                    }));
                    setSportiviAcoperiti(lista.sort((a, b) => sortBySportivNume(a, b)));
                }
                setLoadingSportivi(false);
            });
        return () => { active = false; };
    }, [decont.id]);

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
        if (!file || !metodaPlata) return;
        setLoading(true);
        await onConfirm(decont, file, metodaPlata);
        setLoading(false);
    };

    const nrDiferit = !loadingSportivi && !eroareSportivi && decont.nr_participanti != null && sportiviAcoperiti.length !== decont.nr_participanti;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Confirmă Plata: ${decont.tip_activitate}`}>
            <div className="space-y-4">
                <p>
                    Suma totală: <strong>{(decont.suma_totala || 0).toFixed(2)} RON</strong>.
                    Încărcați dovada plății și alegeți metoda folosită.
                </p>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">
                        Sportivi acoperiți ({decont.nr_participanti ?? sportiviAcoperiti.length})
                    </label>

                    {nrDiferit && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                            ⚠️ Numărul de sportivi legați ({sportiviAcoperiti.length}) diferă de contorul decontului ({decont.nr_participanti}).
                        </div>
                    )}

                    {loadingSportivi ? (
                        <p className="text-center text-slate-500 text-sm py-4 italic">Se încarcă sportivii...</p>
                    ) : eroareSportivi ? (
                        <p className="text-center text-rose-400 text-sm py-4">{eroareSportivi}</p>
                    ) : sportiviAcoperiti.length === 0 ? (
                        <EmptyState title="Niciun sportiv legat" description="Decontul nu are încă sportivi legați în decont_sportivi." />
                    ) : (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--t-border)] p-2 bg-[var(--t-surface-2)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                                {sportiviAcoperiti.map(s => (
                                    <div key={s.id} className="px-2 py-1.5 text-sm text-slate-300">
                                        {formatNume(s)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Select
                    label="Metoda Plata"
                    value={metodaPlata}
                    onChange={e => setMetodaPlata(e.target.value as MetodaPlataDecont | '')}
                >
                    <option value="">Alege metoda...</option>
                    {METODE_PLATA.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </Select>

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

                <div className="flex justify-end pt-4 gap-2 border-t border-[var(--t-border)]">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="success" onClick={handleConfirm} isLoading={loading} disabled={!file || !metodaPlata}>
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
    currentUser: User;
    onBack: () => void;
    permissions: Permissions;
}

export const FederationInvoices: React.FC<FederationInvoicesProps> = ({
    deconturi,
    setDeconturi,
    decontSportivi,
    currentUser,
    onBack,
    permissions,
}) => {
    const { isFederationAdmin, isAdminClub } = permissions;
    const { showError, showSuccess } = useError();
    const [selectedDecont, setSelectedDecont] = useState<DecontFederatie | null>(null);

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

    const handleConfirmPayment = async (decont: DecontFederatie, file: File, metodaPlata: MetodaPlataDecont) => {
        if (!supabase) return;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `public/${decont.club_id}/${decont.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('chitante_deconturi').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data, error } = await supabase
                .from('deconturi_federatie')
                .update({
                    status_plata: 'Platit',
                    metoda_plata: metodaPlata,
                    confirmata_federatie: true,
                    dovada_transfer_url: filePath,
                })
                .eq('id', decont.id)
                .select()
                .single();
            if (error) throw error;

            setDeconturi(prev => prev.map(d => d.id === decont.id ? data : d));
            showSuccess("Succes", `Plata a fost confirmată prin ${metodaPlata}.`);
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
                                <th className="p-3">Sezon</th>
                                <th className="p-3">Data</th>
                                <th className="p-3 text-center">Nr. Sportivi</th>
                                <th className="p-3 text-right">Sumă</th>
                                <th className="p-3">Metoda</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredDeconturi.map(d => (
                                <tr key={d.id}>
                                    <td className="p-3 font-semibold">{d.tip_activitate}</td>
                                    <td className="p-3">{d.an_fiscal != null ? formatSezon(d.an_fiscal) : '-'}</td>
                                    <td className="p-3">{d.data_generare ? new Date(d.data_generare).toLocaleDateString('ro-RO') : '-'}</td>
                                    <td className="p-3 text-center">{d.nr_participanti}</td>
                                    <td className="p-3 text-right font-bold text-white">{(d.suma_totala || 0).toFixed(2)} RON</td>
                                    <td className="p-3">{d.metoda_plata ?? '-'}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status_plata === 'Platit' ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>
                                            {d.status_plata === 'Platit' ? 'ACHITAT' : 'NEACHITAT'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {d.status_plata === 'In asteptare' && (isAdminClub || isFederationAdmin) ? (
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
                    onClose={() => setSelectedDecont(null)}
                    onConfirm={handleConfirmPayment}
                />
            )}
        </div>
    );
};
