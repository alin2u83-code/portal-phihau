import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, Club, DecontFederatie, View, IstoricGrade } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, FileTextIcon, UploadCloudIcon } from './icons';
import { MartialArtsSkeleton } from './MartialArtsSkeleton';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ManagementInscrieri } from './ManagementInscrieri';
import { ImportExamenModal } from './ImportExamenModal';
import { SesiuneForm } from './GestiuneExamene/SesiuneForm';
import { DetaliiSesiune } from './GestiuneExamene/DetaliiSesiune';
import { useExamManager } from '../hooks/useExamManager';
import { useData } from '../contexts/DataContext';

// --- COMPONENTA PRINCIPALĂ (REFActorizată) ---
interface GestiuneExameneProps { 
    onBack: () => void; 
    onNavigate: (view: View) => void;
    onViewSportiv: (sportiv: Sportiv) => void;
    isReadOnly?: boolean;
}

export const GestiuneExamene: React.FC<GestiuneExameneProps> = ({ onBack, onNavigate, onViewSportiv, isReadOnly = false }) => {
  const {
      currentUser, clubs,
      setSesiuniExamene: setSesiuni,
      setInscrieriExamene: setInscrieri,
      setSportivi,
      grade,
      setLocatii,
      setPlati,
      preturiConfig,
      setDeconturiFederatie,
      setIstoricGrade,
      loading,
      filteredData
  } = useData();

  const sesiuni = filteredData.sesiuniExamene;
  const inscrieri = filteredData.inscrieriExamene;
  const sportivi = filteredData.sportivi;
  const istoricGrade = filteredData.istoricGrade;
  const locatii = useData().locatii;
  const plati = filteredData.plati;
  const deconturiFederatie = filteredData.deconturiFederatie;
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [sesiuneToEdit, setSesiuneToEdit] = useState<SesiuneExamen | null>(null);
  const [sesiuneToDelete, setSesiuneToDelete] = useState<SesiuneExamen | null>(null);
  const [selectedSesiuneId, setSelectedSesiuneId] = useLocalStorage<string | null>('phi-hau-selected-sesiune-id', null);
  const { showError, showSuccess } = useError();
  
  const { saveSesiune, deleteSesiune, finalizeExamen, loading: managerLoading } = useExamManager(setSesiuni, setInscrieri, setDeconturiFederatie, setSportivi, setIstoricGrade);
  
  const selectedSesiune = useMemo(() => selectedSesiuneId ? (sesiuni || []).find(e => e.id === selectedSesiuneId) || null : null, [selectedSesiuneId, sesiuni]);
  
  const canGenerateInvoice = useMemo(() => 
      currentUser.roluri.some(r => 
          ['Instructor', 'Admin Club', 'Admin', 'SUPER_ADMIN_FEDERATIE'].includes(r.nume)
      ),
  [currentUser.roluri]);

  useEffect(() => {
    setLocationFilter('');
  }, [clubFilter]);

  const isFederationAdmin = currentUser.roluri.some(r => ['SUPER_ADMIN_FEDERATIE', 'ADMIN'].includes(r.nume.toUpperCase().replace(/\s+/g, '_')));

  const filteredLocatii = useMemo(() => {
    if (isFederationAdmin) {
      if (clubFilter) {
        return (locatii || []).filter(l => l.club_id === clubFilter);
      }
      return (locatii || []);
    }
    return (locatii || []).filter(l => l.club_id === currentUser.club_id);
  }, [locatii, isFederationAdmin, clubFilter, currentUser.club_id]);

  const filteredSesiuni = useMemo(() => {
    let filtered = [...(sesiuni || [])];

    if (dateFilter) {
      filtered = filtered.filter(s => (s.data || s.data_examen || '').toString().slice(0, 10) === dateFilter);
    }
    if (locationFilter) {
      filtered = filtered.filter(s => s.locatie_id === locationFilter);
    }
    if (isFederationAdmin && clubFilter) {
      filtered = filtered.filter(s => s.club_id === clubFilter);
    } else if (!isFederationAdmin && currentUser.club_id) {
      filtered = filtered.filter(s => s.club_id === currentUser.club_id);
    }
    if (statusFilter) {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    return filtered.sort((a, b) => new Date((b.data || b.data_examen || '').toString().slice(0, 10)).getTime() - new Date((a.data || a.data_examen || '').toString().slice(0, 10)).getTime());
  }, [sesiuni, dateFilter, locationFilter, clubFilter, statusFilter, isFederationAdmin, currentUser.club_id]);

  const handleBackToList = () => setSelectedSesiuneId(null);
  
  const handleEditSelected = () => {
    if (selectedSesiune) {
        setSesiuneToEdit(selectedSesiune);
        setIsFormOpen(true);
    }
  };

  const handleSaveSesiune = async (sesiuneData: Partial<SesiuneExamen>) => {
      await saveSesiune(sesiuneData, sesiuneToEdit, locatii);
      if (!managerLoading) setIsFormOpen(false); // Close only if successful (hook handles errors)
  };

  const confirmDeleteSesiune = async (id: string) => {
    const success = await deleteSesiune(id);
    if (success) {
        setSesiuneToDelete(null);
        handleBackToList();
    }
  };

    const handleImportComplete = () => {
        showSuccess("Import Finalizat", "Datele au fost procesate. Pagina se va reîmprospăta pentru a reflecta toate modificările.");
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    };

  if (selectedSesiune) {
     return (
        <div>
            <Button onClick={handleBackToList} className="mb-4" variant="secondary"><ArrowLeftIcon /> Înapoi la listă</Button>
            <DetaliiSesiune 
                sesiune={selectedSesiune} 
                inscrieri={(inscrieri || []).filter(p => p.sesiune_id === selectedSesiune.id)} 
                setInscrieri={setInscrieri} 
                sportivi={sportivi} 
                setSportivi={setSportivi}
                grade={grade} 
                istoricGrade={istoricGrade}
                allInscrieri={inscrieri}
                locatii={locatii}
                plati={plati}
                setPlati={setPlati}
                preturiConfig={preturiConfig}
                setSesiuni={setSesiuni}
                setDeconturiFederatie={setDeconturiFederatie}
                onViewSportiv={onViewSportiv}
                onEdit={handleEditSelected}
                currentUser={currentUser}
                onFinalize={finalizeExamen} // Pass finalize function
                isFinalizing={managerLoading}
                isReadOnly={isReadOnly}
            />
        </div>
     );
  }

  const sortedSesiuni = filteredSesiuni;
  return ( 
    <div>
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu</Button>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestiune Sesiuni Examen</h1>
        {!isReadOnly && (
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                {canGenerateInvoice && (
                    <Button onClick={() => onNavigate('gestiune-facturi')} variant="secondary" className="w-full sm:w-auto justify-center">
                        <FileTextIcon className="w-4 h-4 mr-2" /> Generează Factură Examen
                    </Button>
                )}
                 <Button onClick={() => setIsBulkImportModalOpen(true)} variant="info" className="w-full sm:w-auto justify-center">
                    <UploadCloudIcon className="w-5 h-5 mr-2" /> Import Bulk Examen
                </Button>
                <Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="primary" className="w-full sm:w-auto justify-center">
                    <PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune
                </Button>
            </div>
        )}
      </div>
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input label="Filtrează după dată" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <Select label="Filtrează după locație" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">Toate locațiile</option>
          {filteredLocatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
        </Select>
        {isFederationAdmin && (
          <Select label="Filtrează după club" value={clubFilter} onChange={e => setClubFilter(e.target.value)}>
            <option value="">Toate cluburile</option>
            {(clubs || []).map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
          </Select>
        )}
        <Select label="Filtrează după status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Toate statusurile</option>
          <option value="Programat">Programat</option>
          <option value="Finalizat">Finalizat</option>
        </Select>
      </div>
      
      {loading ? (
          <MartialArtsSkeleton count={6} />
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(sortedSesiuni || []).map(s => { 
                const club = (clubs || []).find(c => c.id === s.club_id);
                const cardStyle = club?.theme_config ? (club.theme_config as React.CSSProperties) : {};
                return (
                    <Card 
                        key={s.id} 
                        className="sesiune-card flex flex-col group"
                        style={cardStyle}
                    >
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${s.status === 'Finalizat' ? 'bg-green-600/30 text-green-300' : 'bg-sky-600/30 text-sky-300'}`}>
                                    {s.status || 'Programat'}
                                </span>
                                <span className="text-sm font-bold text-slate-300">{new Date((s.data || s.data_examen || '').toString().slice(0, 10) + 'T00:00:00').toLocaleDateString('ro-RO')}</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mt-3 group-hover:text-brand-secondary transition-colors">{s.locatie_nume || (locatii || []).find(l => l.id === s.locatie_id)?.nume || 'Locație Nespecificată'}</h3>
                            <p className="text-xs text-slate-400">{s.club_nume || (s.club_id ? (((clubs || []).find(c => c.id === s.club_id))?.nume || 'Club Necunoscut') : 'Eveniment Federație')}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                            <div className="text-sm">
                                <span className="font-bold text-white">{(inscrieri || []).filter(p => p.sesiune_id === s.id).length}</span>
                                <span className="text-slate-400"> participanți</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="info" onClick={() => setSelectedSesiuneId(s.id)}>Vezi Detalii</Button>
                                {!isReadOnly && (
                                    <>
                                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSesiuneToEdit(s); setIsFormOpen(true); }}><EditIcon className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setSesiuneToDelete(s); }}><TrashIcon className="w-4 h-4" /></Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>
                )
            })}
            {(sortedSesiuni || []).length === 0 && <p className="col-span-full p-4 text-center text-slate-400">Nicio sesiune programată.</p>}
          </div>
      )}
      <SesiuneForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSave={handleSaveSesiune} sesiuneToEdit={sesiuneToEdit} locatii={locatii} setLocatii={setLocatii} clubs={clubs} currentUser={currentUser} />
      <ConfirmDeleteModal isOpen={!!sesiuneToDelete} onClose={() => setSesiuneToDelete(null)} onConfirm={() => { if(sesiuneToDelete) confirmDeleteSesiune(sesiuneToDelete.id) }} tableName="Sesiuni (și toate înscrierile asociate)" isLoading={managerLoading} />
       <ImportExamenModal 
            isOpen={isBulkImportModalOpen}
            onClose={() => setIsBulkImportModalOpen(false)}
            onImportComplete={handleImportComplete}
            currentUser={currentUser}
            locatii={locatii}
            setLocatii={setLocatii}
            sesiuni={sesiuni}
            setSesiuni={setSesiuni}
       />
    </div> 
  );
};

export { GestiuneExamene as ExameneManagement };