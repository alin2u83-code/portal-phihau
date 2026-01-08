
import React, { useState, useMemo, useEffect } from 'react';
import { PretConfig, Sportiv } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon } from './icons';
import { getPretProdus } from '../utils/pricing';

const emptyFormState: Omit<PretConfig, 'id' | 'valabilDeLaData'> = { categorie: 'Taxa Examen', denumireServiciu: '', suma: 0, specificatii: {} };

interface PretFormProps { isOpen: boolean; onClose: () => void; onSave: (pret: PretConfig) => void; pretToEdit: PretConfig | null; }
const PretForm: React.FC<PretFormProps> = ({ isOpen, onClose, onSave, pretToEdit }) => {
    const [formState, setFormState] = useState<Omit<PretConfig, 'id'>>({ ...emptyFormState, valabilDeLaData: new Date().toISOString().split('T')[0] });
    React.useEffect(() => { if (pretToEdit) setFormState(pretToEdit); else setFormState({ ...emptyFormState, valabilDeLaData: new Date().toISOString().split('T')[0] }); }, [pretToEdit, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(p => ({ ...p, [name]: name === 'suma' ? parseFloat(value) : value }));
    };

    const handleSpecChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = name === 'inaltimeMin' || name === 'inaltimeMax';
        const processedValue = isNumeric ? (value ? parseInt(value) : undefined) : (value || undefined);
        
        setFormState(p => ({
            ...p,
            specificatii: { ...(p.specificatii || {}), [name]: processedValue }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ id: pretToEdit?.id || new Date().toISOString(), ...formState }); onClose(); };

    return ( <Modal isOpen={isOpen} onClose={onClose} title={pretToEdit ? "Editează Preț" : "Adaugă Preț Nou"}> <form onSubmit={handleSubmit} className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Select label="Categorie" name="categorie" value={formState.categorie} onChange={handleChange}> <option value="Taxa Examen">Taxa Examen</option> <option value="Taxa Stagiu">Taxa Stagiu</option> <option value="Taxa Competitie">Taxa Competiție</option> <option value="Echipament">Echipament</option> </Select> <Input label="Denumire Serviciu/Produs" name="denumireServiciu" value={formState.denumireServiciu} onChange={handleChange} required /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <Input label="Sumă (RON)" name="suma" type="number" step="0.01" value={formState.suma} onChange={handleChange} required /> <Input label="Valabil de la Data" name="valabilDeLaData" type="date" value={formState.valabilDeLaData} onChange={handleChange} required /> </div> {formState.categorie === 'Echipament' && ( <div className="border-t border-slate-700 pt-4 mt-4"> <h3 className="text-lg font-semibold mb-2 text-white">Specificații Echipament</h3> <p className="text-sm text-slate-400 mb-4">Completați aceste câmpuri pentru a defini prețul pentru o anumită variantă de produs (interval de înălțime SAU mărime specifică).</p> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <Input label="Înălțime Minimă (cm)" name="inaltimeMin" type="number" value={formState.specificatii?.inaltimeMin || ''} onChange={handleSpecChange} /> <Input label="Înălțime Maximă (cm)" name="inaltimeMax" type="number" value={formState.specificatii?.inaltimeMax || ''} onChange={handleSpecChange} /> <Select label="Mărime" name="marime" value={formState.specificatii?.marime || ''} onChange={handleSpecChange}> <option value="">N/A</option> <option value="S">S</option> <option value="M">M</option> <option value="L">L</option> <option value="XL">XL</option> </Select> </div> </div> )} <div className="flex justify-end pt-4 space-x-2"><Button type="button" variant="secondary" onClick={onClose}>Anulează</Button><Button variant="success" type="submit">Salvează</Button></div> </form> </Modal> );
};

interface ConfigurarePreturiProps { preturi: PretConfig[]; setPreturi: React.Dispatch<React.SetStateAction<PretConfig[]>>; onBack: () => void; sportivi: Sportiv[]; }
export const ConfigurarePreturi: React.FC<ConfigurarePreturiProps> = ({ preturi, setPreturi, onBack, sportivi }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [pretToEdit, setPretToEdit] = useState<PretConfig | null>(null);

    const [checkerSportivId, setCheckerSportivId] = useState('');
    const [checkerEchipament, setCheckerEchipament] = useState('');
    const [calculatedPriceInfo, setCalculatedPriceInfo] = useState<{ suma: number; marime: string } | null>(null);

    const handleSave = (pret: PretConfig) => { if (pretToEdit) { setPreturi(prev => prev.map(p => p.id === pret.id ? pret : p)); } else { setPreturi(prev => [...prev, pret]); } };
    const handleEdit = (pret: PretConfig) => { setPretToEdit(pret); setIsFormOpen(true); };
    const handleDelete = (id: string) => { if (window.confirm("Ești sigur?")) { setPreturi(prev => prev.filter(p => p.id !== id)); } };

    const sortedPreturi = [...preturi].sort((a, b) => {
        if (a.denumireServiciu < b.denumireServiciu) return -1;
        if (a.denumireServiciu > b.denumireServiciu) return 1;
        return (a.specificatii?.inaltimeMin || 0) - (b.specificatii?.inaltimeMin || 0);
    });
    
    const formatSpecificatii = (s?: PretConfig['specificatii']) => {
        if (!s) return 'N/A';
        const parts: string[] = [];
        if (s.inaltimeMin && s.inaltimeMax) parts.push(`${s.inaltimeMin}-${s.inaltimeMax}cm`);
        else if (s.inaltimeMin) parts.push(`> ${s.inaltimeMin}cm`);
        if (s.marime) parts.push(s.marime);
        return parts.join(', ') || 'Standard';
    };
    
    const echipamenteDisponibile = useMemo(() => {
        return [...new Set(preturi.filter(p => p.categorie === 'Echipament').map(p => p.denumireServiciu))]
    }, [preturi]);

    useEffect(() => {
        if (checkerSportivId && checkerEchipament) {
            const sportiv = sportivi.find(s => s.id === checkerSportivId);
            if (sportiv && sportiv.inaltime) {
                const pretConfig = getPretProdus(preturi, 'Echipament', checkerEchipament, { inaltime: sportiv.inaltime });
                if (pretConfig) {
                    setCalculatedPriceInfo({
                        suma: pretConfig.suma,
                        marime: formatSpecificatii(pretConfig.specificatii)
                    });
                } else {
                    setCalculatedPriceInfo(null);
                }
            } else {
                setCalculatedPriceInfo(null);
            }
        } else {
            setCalculatedPriceInfo(null);
        }
    }, [checkerSportivId, checkerEchipament, sportivi, preturi]);


    return ( <div> <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
        <Card className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">Calculator Preț Echipament</h3>
            <p className="text-sm text-slate-400 mb-4">Selectează un sportiv și un produs pentru a vedea prețul calculat automat pe baza înălțimii din profil.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Select label="Sportiv" value={checkerSportivId} onChange={e => setCheckerSportivId(e.target.value)}>
                    <option value="">Selectează sportiv...</option>
                    {sportivi.filter(s => s.status === 'Activ' && s.inaltime).map(s => (
                        <option key={s.id} value={s.id}>{s.nume} {s.prenume} ({s.inaltime} cm)</option>
                    ))}
                </Select>
                    <Select label="Produs Echipament" value={checkerEchipament} onChange={e => setCheckerEchipament(e.target.value)} disabled={!checkerSportivId}>
                    <option value="">Selectează produs...</option>
                    {echipamenteDisponibile.map(item => (
                        <option key={item} value={item}>{item}</option>
                    ))}
                </Select>
                <div className="md:pl-4">
                    {calculatedPriceInfo ? (
                        <div>
                            <p className="text-sm text-slate-400">Preț Calculat:</p>
                            <p className="text-3xl font-bold text-green-400">{calculatedPriceInfo.suma.toFixed(2)} RON</p>
                            <p className="text-xs text-slate-400">Regula aplicată: {calculatedPriceInfo.marime}</p>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">{checkerSportivId && checkerEchipament ? "Niciun preț găsit pentru înălțimea sportivului." : "Aștept selecție..."}</p>
                    )}
                </div>
            </div>
        </Card>
    <div className="flex justify-between items-center mb-6"> <h1 className="text-3xl font-bold text-white">Configurare Prețuri (Taxe, Echipamente, etc.)</h1> <Button onClick={() => { setPretToEdit(null); setIsFormOpen(true); }} variant="info"><PlusIcon className="w-5 h-5 mr-2" />Adaugă Preț</Button> </div> <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto"> <table className="w-full text-left min-w-[800px]"> <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Denumire Serviciu</th><th className="p-4 font-semibold">Categorie</th><th className="p-4 font-semibold">Specificații (Mărime/Înălțime)</th><th className="p-4 font-semibold">Sumă</th><th className="p-4 font-semibold">Valabil De La</th><th className="p-4 font-semibold">Acțiuni</th></tr></thead> <tbody> {sortedPreturi.map(pret => ( <tr key={pret.id} className="border-b border-slate-700"> <td className="p-4 font-medium">{pret.denumireServiciu}</td> <td className="p-4"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-600">{pret.categorie}</span></td> <td className="p-4">{formatSpecificatii(pret.specificatii)}</td> <td className="p-4 font-bold">{pret.suma.toFixed(2)} RON</td> <td className="p-4">{new Date(pret.valabilDeLaData).toLocaleDateString('ro-RO')}</td> <td className="p-4"><div className="flex items-center space-x-2"><Button onClick={() => handleEdit(pret)} variant="primary" size="sm"><EditIcon /></Button><Button onClick={() => handleDelete(pret.id)} variant="danger" size="sm"><TrashIcon /></Button></div></td> </tr> ))} </tbody> </table> {sortedPreturi.length === 0 && <p className="p-4 text-center text-slate-400">Niciun preț configurat.</p>} </div> <PretForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSave} pretToEdit={pretToEdit} /> </div> );
};