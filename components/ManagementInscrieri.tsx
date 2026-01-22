import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SesiuneExamen, Sportiv, InscriereExamen, Grad, Plata, PretConfig } from '../types';
import { Button, Input, Modal, Select, Card } from './ui';
import { TrashIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { getPretProdus } from '../utils/pricing';

// Helper functions
const getAgeOnDate = (birthDateStr: string, onDateStr: string): number => {
    if (!birthDateStr || !onDateStr) return 0;
    const onDate = new Date(onDateStr);
    const birthDate = new Date(birthDateStr);
    let age = onDate.getFullYear() - birthDate.getFullYear();
    const m = onDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};
const getGrad = (gradId: string | null, allGrades: Grad[]): Grad | null => gradId ? allGrades.find(g => g.id === gradId) || null : null;

interface ManagementInscrieriProps {
    sesiune: SesiuneExamen;
    sportivi: Sportiv[];
    allInscrieri: InscriereExamen[];
    grade: Grad[];
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>;
    plati: Plata[];
    setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
    preturiConfig: PretConfig[];
}

export const ManagementInscrieri: React.FC<ManagementInscrieriProps> = ({ sesiune, sportivi, allInscrieri, grade, setInscrieri, plati, setPlati, preturiConfig }) => {
    const { showError, showSuccess } = useError();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // State for modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
    const [gradSustinutId, setGradSustinutId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    // State for deletion confirmation
    const [inscriereToDelete, setInscriereToDelete] = useState<InscriereExamen | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const inscrisiInSesiuneIds = useMemo(() => {
        return new Set(allInscrieri.filter(i => i.sesiune_id === sesiune.id).map(i => i.sportiv_id));
    }, [allInscrieri, sesiune.id]);
    
    const participantiInscrisi = useMemo(() => {
        return allInscrieri
            .filter(i => i.sesiune_id === sesiune.id)
            .sort((a,b) => (a.sportivi?.nume || '').localeCompare(b.sportivi?.nume || ''));
    }, [allInscrieri, sesiune.id]);
    
    const sportiviDisponibili = useMemo(() => {
        if (searchTerm.length === 0) return [];
        return sportivi
            .filter(s => 
                s.status === 'Activ' && 
                !inscrisiInSesiuneIds.has(s.id) &&
                `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.nume.localeCompare(b.nume));
    }, [sportivi, inscrisiInSesiuneIds, searchTerm]);

    const sortedGrades = useMemo(() => [...grade].sort((a,b) => a.ordine - b.ordine), [grade]);

    const handleOpenModal = (sportiv: Sportiv) => {
        setSelectedSportiv(sportiv);
        const currentGrade = grade.find(g => g.id === sportiv.grad_actual_id);
        const currentOrder = currentGrade ? currentGrade.ordine : 0;
        const nextGrade = sortedGrades.find(g => g.ordine === currentOrder + 1);
        setGradSustinutId(nextGrade ? nextGrade.id : '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSportiv(null);
        setGradSustinutId('');
    };

    const handleSaveInscriere = async () => {
        if (!selectedSportiv || !gradSustinutId) { showError("Date lipsă", "Vă rugăm selectați un grad."); return; }
        setIsSaving(true);
        try {
            const varstaLaExamen = getAgeOnDate(selectedSportiv.data_nasterii, sesiune.data);
            const newInscriereData = { sportiv_id: selectedSportiv.id, sesiune_id: sesiune.id, grad_actual_id: selectedSportiv.grad_actual_id || null, grad_vizat_id: gradSustinutId, varsta_la_examen: varstaLaExamen, rezultat: 'Neprezentat' as const };
            const { data: iData, error: iError } = await supabase.from('inscrieri_examene').insert(newInscriereData).select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)').single();
            if (iError) throw iError;
            
            const gradSustinut = grade.find(g => g.id === gradSustinutId);
            let newPlata: Plata | null = null;
            let facturaMessage = '';
    
            if (gradSustinut) {
                const taxaConfig = getPretProdus(preturiConfig, 'Taxa Examen', gradSustinut.nume, { dataReferinta: sesiune.data });
                if (taxaConfig) {
                    const plataData: Omit<Plata, 'id'> = { sportiv_id: selectedSportiv.id, familie_id: selectedSportiv.familie_id, suma: taxaConfig.suma, data: sesiune.data, status: 'Neachitat', descriere: `Taxa examen ${gradSustinut.nume}`, tip: 'Taxa Examen', observatii: 'Generat automat la înscriere examen.' };
                    const { data: pData, error: pError } = await supabase.from('plati').insert(plataData).select().single();
                    if (pError) { showError("Avertisment", `Înscriere salvată, dar factura nu a putut fi generată: ${pError.message}`); } 
                    else { newPlata = pData as Plata; facturaMessage = ' și factura a fost generată'; }
                }
            }
            
            setInscrieri(prev => [...prev, iData as InscriereExamen]);
            if (newPlata) { setPlati(prev => [...prev, newPlata]); }
            showSuccess("Succes", `${selectedSportiv.nume} a fost înscris${facturaMessage}.`);
            handleCloseModal();
        } catch (err: any) {
            showError("Eroare la Înscriere", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleWithdraw = async () => {
        if (!inscriereToDelete) return;
        setIsDeleting(true);
        try {
            const descriereFactura = `Taxa examen ${inscriereToDelete.grade.nume}`;
            const plataAsociata = plati.find(p => p.sportiv_id === inscriereToDelete.sportiv_id && p.tip === 'Taxa Examen' && p.data === sesiune.data && p.descriere === descriereFactura);
            if (plataAsociata) {
                if (plataAsociata.status !== 'Neachitat') { throw new Error("Factura asociată a fost deja achitată (parțial sau total) și nu poate fi ștearsă automat. Anulați manual încasarea întâi."); }
                const { error: plataError } = await supabase.from('plati').delete().eq('id', plataAsociata.id);
                if (plataError) throw plataError;
                setPlati(prev => prev.filter(p => p.id !== plataAsociata.id));
            }
            const { error } = await supabase.from('inscrieri_examene').delete().eq('id', inscriereToDelete.id);
            if (error) throw error;
            setInscrieri(prev => prev.filter(i => i.id !== inscriereToDelete.id));
            showSuccess("Succes", "Înscrierea și factura asociată (dacă a existat) au fost retrase.");
        } catch (err: any) {
            showError("Eroare la Retragere", err.message);
        } finally {
            setIsDeleting(false);
            setInscriereToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
             <Card>
                <h3 className="text-lg font-bold text-white mb-2">Adaugă Participant</h3>
                <div className="relative" ref={searchContainerRef}>
                    <Input
                        label=""
                        placeholder="Caută sportiv activ..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setIsDropdownVisible(e.target.value.length > 0);
                        }}
                        onFocus={() => {
                            if (searchTerm.length > 0) setIsDropdownVisible(true);
                        }}
                    />
                    {isDropdownVisible && sportiviDisponibili.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {sportiviDisponibili.map(sportiv => (
                                <div
                                    key={sportiv.id}
                                    className="p-2 hover:bg-brand-secondary/20 cursor-pointer border-b border-slate-700 last:border-b-0"
                                    onMouseDown={() => {
                                        handleOpenModal(sportiv);
                                        setSearchTerm('');
                                        setIsDropdownVisible(false);
                                    }}
                                >
                                    <p className="font-medium">{sportiv.nume} {sportiv.prenume}</p>
                                    <p className="text-xs text-slate-400">{getGrad(sportiv.grad_actual_id, grade)?.nume || 'Începător'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                     {isDropdownVisible && searchTerm.length > 0 && sportiviDisponibili.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg p-3 text-sm text-slate-400 italic">Niciun sportiv disponibil găsit.</div>
                    )}
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-bold text-white mb-2">Participanți Înscriși ({participantiInscrisi.length})</h3>
                <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                    {participantiInscrisi.map(inscriere => (
                        <div key={inscriere.id} className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md">
                            <div>
                                <p className="font-medium">{inscriere.sportivi.nume} {inscriere.sportivi.prenume}</p>
                                <p className="text-xs font-semibold text-brand-secondary">{inscriere.grade.nume}</p>
                            </div>
                            <Button size="sm" variant='danger' onClick={() => setInscriereToDelete(inscriere)} title="Retrage înscriere"><TrashIcon className="w-4 h-4" /></Button>
                        </div>
                    ))}
                    {participantiInscrisi.length === 0 && <p className="p-4 text-center text-slate-500 italic">Niciun sportiv înscris la această sesiune.</p>}
                </div>
            </Card>

            {isModalOpen && selectedSportiv && (
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={handleCloseModal} 
                    title={`Înscriere: ${selectedSportiv.nume} ${selectedSportiv.prenume}`}
                >
                    <div className="space-y-4">
                        <Select label="Selectează gradul vizat pentru examen" value={gradSustinutId} onChange={(e) => setGradSustinutId(e.target.value)} required>
                            <option value="">Alege un grad...</option>
                            {sortedGrades.map(g => (<option key={g.id} value={g.id}>{g.nume}</option>))}
                        </Select>
                        <div className="flex justify-end pt-4 gap-2 border-t border-slate-700">
                            <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>Anulează</Button>
                            <Button variant="primary" onClick={handleSaveInscriere} isLoading={isSaving} disabled={!gradSustinutId}>Salvează</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmDeleteModal 
                isOpen={!!inscriereToDelete}
                onClose={() => setInscriereToDelete(null)}
                onConfirm={handleWithdraw}
                tableName="înscriere"
                isLoading={isDeleting}
                title="Confirmare Retragere"
                customMessage={`Sunteți sigur că doriți să retrageți înscrierea sportivului ${inscriereToDelete?.sportivi?.nume} ${inscriereToDelete?.sportivi?.prenume}? Factura asociată (dacă există și este neachitată) va fi de asemenea ștearsă.`}
                confirmButtonText="Da, retrage"
            />
        </div>
    );
};
