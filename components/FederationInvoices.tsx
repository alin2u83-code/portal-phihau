import React, { useState, useMemo } from 'react';
import { DecontFederatie, User, Rol, Permissions } from '../types';
import { Card, Button, Modal, Input } from './ui';
import { ArrowLeftIcon, BanknotesIcon, UploadCloudIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

// --- Sub-componente ---

interface PaymentConfirmationModalProps {
    decont: DecontFederatie;
    onClose: () => void;
    onConfirm: (decont: DecontFederatie, file: File) => Promise<void>;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({ decont, onClose, onConfirm }) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleConfirm = async () => {
        if (!file) return;
        setLoading(true);
        await onConfirm(decont, file);
        setLoading(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Confirmă Plata: ${decont.activitate}`}>
            <div className="space-y-4">
                <p>Pentru a confirma plata sumei de <strong>{decont.suma_totala.toFixed(2)} RON</strong>, vă rugăm să încărcați o dovadă (chitanță, ordin de plată).</p>
                
                <label htmlFor="file-upload" className="cursor-pointer block">
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
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />

                {file && <p className="text-sm text-center font-semibold text-slate-300">Fișier selectat: {file.name}</p>}

                <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button variant="success" onClick={handleConfirm} isLoading={loading} disabled={!file}>Confirmă și Încarcă</Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Componenta Principală ---

interface FederationInvoicesProps {
    deconturi: DecontFederatie[];
    setDeconturi: React.Dispatch<React.SetStateAction<DecontFederatie[]>>;
    currentUser: User;
    onBack: () => void;
    permissions: Permissions;
}

export const FederationInvoices: React.FC<FederationInvoicesProps> = ({ deconturi, setDeconturi, currentUser, onBack, permissions }) => {
    const { isFederationAdmin, isAdminClub } = permissions;
    const { showError, showSuccess } = useError();
    const [selectedDecont, setSelectedDecont] = useState<DecontFederatie | null>(null);

    const filteredDeconturi = useMemo(() => {
        const sorted = [...deconturi].sort((a, b) => new Date(b.data_activitate).getTime() - new Date(a.data_activitate).getTime());
        if (isFederationAdmin) {
            return sorted;
        }
        return sorted.filter(d => d.club_id === currentUser.club_id);
    }, [deconturi, currentUser.club_id, isFederationAdmin]);

    const totalDePlata = useMemo(() => {
        return filteredDeconturi
            .filter(d => d.status === 'In asteptare')
            .reduce((sum, d) => sum + d.suma_totala, 0);
    }, [filteredDeconturi]);
    
    const handleConfirmPayment = async (decont: DecontFederatie, file: File) => {
        if (!supabase) return;
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `public/${decont.club_id}/${decont.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('chitante_deconturi').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('chitante_deconturi').getPublicUrl(filePath);
            
            const { data, error } = await supabase.from('deconturi_federatie')
                .update({ status: 'Platit', chitanta_url: urlData.publicUrl })
                .eq('id', decont.id)
                .select()
                .single();
            
            if (error) throw error;
            
            setDeconturi(prev => prev.map(d => d.id === decont.id ? data : d));
            showSuccess("Succes", "Plata a fost confirmată și dovada a fost încărcată.");
            setSelectedDecont(null);

        } catch (err: any) {
            showError("Eroare la Confirmare", err.message);
        }
    };


    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
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
                                    <td className="p-3 font-semibold">{d.activitate}</td>
                                    <td className="p-3">{new Date(d.data_activitate).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 text-center">{d.numar_sportivi}</td>
                                    <td className="p-3 text-right font-bold text-white">{d.suma_totala.toFixed(2)} RON</td>
                                    <td className="p-3 text-center">
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'Platit' ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>
                                            {d.status === 'Platit' ? 'ACHITAT' : 'NEACHITAT'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {d.status === 'In asteptare' && isAdminClub ? (
                                            <Button size="sm" variant="success" onClick={() => setSelectedDecont(d)}>Confirmă Plată</Button>
                                        ) : (
                                            <a href={d.chitanta_url || '#'} target="_blank" rel="noopener noreferrer" className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${d.chitanta_url ? 'bg-sky-600/50 text-sky-300 hover:bg-sky-600/70' : 'bg-slate-600 text-slate-400 cursor-not-allowed'}`}>
                                                Vezi Dovada
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredDeconturi.length === 0 && <p className="p-8 text-center text-slate-500 italic">Niciun decont înregistrat.</p>}
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