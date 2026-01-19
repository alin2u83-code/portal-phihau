import React, { useState, useMemo } from 'react';
import { Button, Card, Modal, Input } from './ui';
import { ArrowLeftIcon, ShieldCheckIcon, CogIcon, EditIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Sportiv, Grad, PretConfig, Participare, Examen, Plata, View, Familie } from '../types';
import { BirthDateInput } from './BirthDateInput';
import { getPretProdus } from '../utils/pricing';

const TABLES_TO_MANAGE = ['roluri', 'grade', 'familii', 'grupe', 'tipuri_abonament', 'examene', 'evenimente', 'preturi_config', 'grade_preturi_config', 'reduceri', 'sportivi', 'program_antrenamente', 'sportivi_roluri', 'participari', 'rezultate', 'plati', 'prezenta_antrenament', 'anunturi_prezenta', 'tranzactii', 'notificari'];

// --- Sub-componente ---
const QuickEditModal: React.FC<{
    sportiv: Sportiv | null;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Sportiv>) => Promise<void>;
}> = ({ sportiv, onClose, onSave }) => {
    const [formData, setFormData] = useState({ data_nasterii: sportiv?.data_nasterii || '', cnp: sportiv?.cnp || '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sportiv) return;
        setLoading(true);
        await onSave(sportiv.id, { data_nasterii: formData.data_nasterii, cnp: formData.cnp });
        setLoading(false);
        onClose();
    };

    if (!sportiv) return null;

    return (
        <Modal isOpen={!!sportiv} onClose={onClose} title={`Editare Rapidă: ${sportiv.nume} ${sportiv.prenume}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <BirthDateInput label="Data Nașterii" value={formData.data_nasterii} onChange={(v) => setFormData(p => ({ ...p, data_nasterii: v }))} required />
                <Input label="CNP" name="cnp" value={formData.cnp} onChange={e => setFormData(p => ({ ...p, cnp: e.target.value }))} required maxLength={13} />
                <div className="flex justify-end pt-4 space-x-2 border-t border-slate-700">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Anulează</Button>
                    <Button type="submit" variant="success" isLoading={loading}>Salvează</Button>
                </div>
            </form>
        </Modal>
    );
};


// --- Componenta Principală ---
interface DataMaintenanceProps {
    onBack: () => void;
    onDataRestored: () => void;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
    grade: Grad[];
    preturiConfig: PretConfig[];
    participari: Participare[];
    examene: Examen[];
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    familii: Familie[];
    onNavigate: (view: View) => void;
}

export const DataMaintenancePage: React.FC<DataMaintenanceProps> = ({ onBack, onDataRestored, sportivi, setSportivi, grade, preturiConfig, participari, examene, plati, setPlati, familii, onNavigate }) => {
    const { showError, showSuccess } = useError();
    const [progressMessage, setProgressMessage] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    
    // --- State & Memo pentru Audit ---
    const [editingSportiv, setEditingSportiv] = useState<Sportiv | null>(null);

    const sportiviIncompleti = useMemo(() => sportivi.filter(s => s.status === 'Activ' && (!s.data_nasterii || !s.cnp)), [sportivi]);
    const gradeFaraPret = useMemo(() => grade.filter(g => !preturiConfig.some(p => p.categorie === 'Taxa Examen' && p.denumire_serviciu === g.nume)), [grade, preturiConfig]);
    
    const sportiviFaraAbonament = useMemo(() => {
        return sportivi.filter(s => s.status === 'Activ' && !s.familie_id && !s.tip_abonament_id);
    }, [sportivi]);

    const facturiExamenLipsa = useMemo(() => {
        return participari.filter(p => {
            const examen = examene.find(e => e.id === p.examen_id);
            if (!examen) return false;
            return !plati.some(pl => pl.sportiv_id === p.sportiv_id && pl.tip === 'Taxa Examen' && pl.data === examen.data);
        });
    }, [participari, examene, plati]);

    // --- Handlers ---
    const handleQuickSave = async (id: string, updates: Partial<Sportiv>) => {
        const { data, error } = await supabase.from('sportivi').update(updates).eq('id', id).select().single();
        if (error) showError("Eroare la salvare", error);
        else if (data) { setSportivi(p => p.map(s => s.id === id ? { ...s, ...data } : s)); showSuccess("Succes", "Datele au fost actualizate."); }
    };

    const handleCleanSchema = async () => {
        if (!window.confirm("Această acțiune este ireversibilă și va încerca să elimine coloane vechi din baza de date. Doriți să continuați?")) return;
        setLoading(p => ({ ...p, cleaning: true }));
        const { data, error } = await supabase.rpc('clean_schema_references');
        if (error) showError("Eroare RPC", error);
        else showSuccess("Operațiune Finalizată", data);
        setLoading(p => ({ ...p, cleaning: false }));
    };

    const handleGenerateInvoices = async () => {
        if (facturiExamenLipsa.length === 0) { showSuccess("Info", "Nicio factură de generat."); return; }
        setLoading(p => ({ ...p, invoicing: true }));
        const newPlatiToInsert: Omit<Plata, 'id'>[] = [];
        
        for (const p of facturiExamenLipsa) {
            const examen = examene.find(e => e.id === p.examen_id);
            const sportiv = sportivi.find(s => s.id === p.sportiv_id);
            const grad = grade.find(g => g.id === p.grad_sustinut_id);
            if (!examen || !sportiv || !grad) continue;
            
            const pretConfig = getPretProdus(preturiConfig, 'Taxa Examen', grad.nume, { dataReferinta: examen.data });
            if (pretConfig) {
                newPlatiToInsert.push({
                    sportiv_id: sportiv.id,
                    familie_id: sportiv.familie_id,
                    suma: pretConfig.suma,
                    data: examen.data,
                    status: 'Neachitat',
                    descriere: `Taxa examen grad ${grad.nume}`,
                    tip: 'Taxa Examen',
                    observatii: 'Generat automat din modulul de mentenanță.'
                });
            }
        }
        if (newPlatiToInsert.length === 0) { showSuccess("Info", "Nicio factură nu a putut fi generată (posibil prețuri lipsă)."); setLoading(p => ({ ...p, invoicing: false })); return; }
        
        const { data, error } = await supabase.from('plati').insert(newPlatiToInsert).select();
        if (error) showError("Eroare la generarea facturilor", error);
        else if(data) { setPlati(prev => [...prev, ...data]); showSuccess("Succes", `${data.length} facturi noi au fost generate.`); }
        
        setLoading(p => ({ ...p, invoicing: false }));
    };

    // --- Backup & Restore Logic ---
    const handleGenerateBackup = async () => {
        if (!supabase) {
            showError("Eroare Configurare", "Clientul Supabase nu este inițializat.");
            return;
        }
        setLoading(p => ({ ...p, backingUp: true }));
        setProgressMessage('Se colectează datele...');

        try {
            const backupData: { [key: string]: any[] } = {};
            
            for (const table of TABLES_TO_MANAGE) {
                setProgressMessage(`Se extrage tabelul: ${table}...`);
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    throw new Error(`Eroare la extragerea datelor din '${table}': ${error.message}`);
                }
                backupData[table] = data || [];
            }
            
            setProgressMessage('Se generează fișierul...');
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `backup-phihau-complet-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showSuccess("Backup Generat", "Fișierul de backup complet a fost descărcat cu succes.");

        } catch (err: any) {
            showError("Eroare la Generare Backup", err.message);
        } finally {
            setLoading(p => ({ ...p, backingUp: false }));
            setProgressMessage('');
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm(`ATENȚIE!\n\nSunteți pe cale să restaurați datele din fișierul "${file.name}".\n\nAceastă acțiune este IREVERSIBILĂ și va ȘTERGE TOATE datele curente din tabelele manageriate, înlocuindu-le cu cele din fișierul de backup.\n\nSunteți absolut sigur că doriți să continuați?`)) {
            event.target.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("Fișierul nu a putut fi citit.");
                const backupData = JSON.parse(text);
                await processRestore(backupData);
            } catch (err: any) {
                showError("Eroare la Restaurare", `Fișierul de backup este invalid sau corupt. ${err.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const processRestore = async (backupData: { [key: string]: any[] }) => {
        if (!supabase) return;
        setLoading(p => ({ ...p, restoring: true }));
        setProgressMessage('Se pregătește restaurarea...');

        const deletionOrder = ['tranzactii', 'anunturi_prezenta', 'prezenta_antrenament', 'rezultate', 'participari', 'plati', 'sportivi_roluri', 'program_antrenamente', 'sportivi', 'grade_preturi_config', 'preturi_config', 'examene', 'evenimente', 'grupe', 'familii', 'tipuri_abonament', 'reduceri', 'grade', 'roluri', 'notificari'];
        const insertionOrder = [...deletionOrder].reverse();

        try {
            const backupTables = Object.keys(backupData);
            
            for (const table of deletionOrder) {
                if (backupTables.includes(table)) {
                    setProgressMessage(`Se șterg datele vechi din: ${table}...`);
                    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Workaround to delete all
                    if (error) throw new Error(`Eroare la ștergerea datelor din '${table}': ${error.message}`);
                }
            }

            for (const table of insertionOrder) {
                const dataToInsert = backupData[table];
                if (dataToInsert && dataToInsert.length > 0) {
                    setProgressMessage(`Se inserează date noi în: ${table}...`);
                    const { error } = await supabase.from(table).insert(dataToInsert);
                    if (error) throw new Error(`Eroare la inserarea datelor în '${table}': ${error.message}`);
                }
            }

            showSuccess("Restaurare Completă", "Datele au fost restaurate. Aplicația se va reîncărca.");
            setTimeout(() => onDataRestored(), 2000);

        } catch (err: any) {
            showError("Restaurare Eșuată", err.message);
        } finally {
            setLoading(p => ({ ...p, restoring: false }));
            setProgressMessage('');
        }
    };

    return (
        <div className="space-y-8">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
            <h1 className="text-3xl font-bold text-white">Mentenanță & Administrare Sistem</h1>
            {feedback && <div className={`p-3 rounded-md text-center font-semibold text-white ${feedback.type === 'success' ? 'bg-green-600/50' : 'bg-red-600/50'}`}>{feedback.message}</div>}

            <Card className="border-l-4 border-amber-400">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><ShieldCheckIcon className="w-6 h-6 text-amber-400"/>Audit Integritate Date</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-white">Profiluri Incomplete ({sportiviIncompleti.length})</h3>
                        <p className="text-xs text-slate-400 mb-2">Sportivi activi fără dată de naștere sau CNP.</p>
                        {sportiviIncompleti.length > 0 ? (
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                                {sportiviIncompleti.map(s => <div key={s.id} className="flex justify-between items-center text-sm p-1.5 bg-slate-700/50 rounded"><span className="font-medium">{s.nume} {s.prenume}</span><Button size="sm" variant="secondary" onClick={() => setEditingSportiv(s)}><EditIcon className="w-4 h-4 mr-1"/> Editare Rapidă</Button></div>)}
                            </div>
                        ) : <p className="text-sm text-green-400 font-semibold italic">Toate profilurile sunt complete!</p>}
                    </div>

                    <div>
                        <h3 className="font-semibold text-white">Sportivi Fără Abonament ({sportiviFaraAbonament.length})</h3>
                        <p className="text-xs text-slate-400 mb-2">Sportivi individuali activi care nu au un tip de abonament asignat.</p>
                        {sportiviFaraAbonament.length > 0 ? (
                            <div>
                                <p className="text-sm text-amber-300">{sportiviFaraAbonament.map(s => `${s.nume} ${s.prenume}`).join(', ')}</p>
                                <Button size="sm" variant="secondary" className="mt-2" onClick={() => onNavigate('sportivi')}>Asignează Abonamente</Button>
                            </div>
                        ) : <p className="text-sm text-green-400 font-semibold italic">Toți sportivii individuali activi au abonamente asignate!</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-white">Prețuri Grade Lipsă ({gradeFaraPret.length})</h3>
                            <p className="text-xs text-slate-400 mb-2">Grade care nu au o taxă de examen definită.</p>
                             {gradeFaraPret.length > 0 ? (
                                <div className="space-y-1"><p className="text-sm text-amber-300">{gradeFaraPret.map(g=>g.nume).join(', ')}</p><Button size="sm" variant="secondary" className="mt-2" onClick={() => onNavigate('configurare-preturi')}>Configurează Prețuri</Button></div>
                            ) : <p className="text-sm text-green-400 font-semibold italic">Toate gradele au prețuri!</p>}
                        </div>
                        <div>
                             <h3 className="font-semibold text-white">Facturi Examen Lipsă ({facturiExamenLipsa.length})</h3>
                            <p className="text-xs text-slate-400 mb-2">Participări la examene fără o factură generată.</p>
                             {facturiExamenLipsa.length > 0 ? (
                                <Button size="sm" variant="info" isLoading={loading['invoicing']} onClick={handleGenerateInvoices}>Generează {facturiExamenLipsa.length} Facturi</Button>
                             ) : <p className="text-sm text-green-400 font-semibold italic">Nicio factură lipsă!</p>}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="border-l-4 border-sky-400">
                 <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CogIcon className="w-6 h-6 text-sky-400"/>Acțiuni Bază de Date</h2>
                 <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded">
                    <div>
                        <h4 className="font-semibold text-white">Curăță Referințe Vechi</h4>
                        <p className="text-xs text-slate-400">Elimină coloane învechite (ex: 'contribuție') din schema bazei de date.</p>
                    </div>
                    <Button variant="secondary" isLoading={loading['cleaning']} onClick={handleCleanSchema}>Execută</Button>
                 </div>
            </Card>
            
            <Card className="border-l-4 border-brand-primary">
                <h2 className="text-2xl font-bold text-white mb-4">Backup & Restaurare Date</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-white">Backup Date</h3>
                        <p className="text-slate-400 mb-4 text-sm">Generează un fișier JSON cu o copie a datelor. Păstrați acest fișier într-un loc sigur.</p>
                        <Button variant="primary" className="w-full" onClick={handleGenerateBackup} isLoading={loading['backingUp']}>{loading['backingUp'] ? progressMessage : 'Generare Backup'}</Button>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Restaurare din Backup</h3>
                        <p className="text-slate-400 mb-4 text-sm"><strong className="text-amber-400">Atenție:</strong> Acțiunea este ireversibilă și va suprascrie datele.</p>
                        <div className="relative">
                            <Button as="label" htmlFor="restore-file-input" variant="danger" className="w-full cursor-pointer" isLoading={loading['restoring']}>{loading['restoring'] ? progressMessage : 'Încarcă Fișier'}</Button>
                            <input id="restore-file-input" type="file" className="hidden" accept=".json" onChange={handleFileChange} disabled={loading['restoring'] || loading['backingUp']} />
                        </div>
                    </div>
                </div>
            </Card>

            <QuickEditModal sportiv={editingSportiv} onClose={() => setEditingSportiv(null)} onSave={handleQuickSave} />
        </div>
    );
};

export { DataMaintenancePage as BackupManager };
