import React, { useState, useMemo, useEffect } from 'react';
import { SesiuneExamen, InscriereExamen, Sportiv, Grad, Locatie, Plata, PretConfig, User, Club, DecontFederatie, View, IstoricGrade } from '../types';
import { Button, Modal, Input, Select, Card, ClubSelect } from './ui';
import { PlusIcon, EditIcon, TrashIcon, ArrowLeftIcon, FileTextIcon, UploadCloudIcon, BookOpenIcon } from './icons';
import { MartialArtsSkeleton } from './MartialArtsSkeleton';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ManagementInscrieri } from './ManagementInscrieri';
import { ImportExamenModal } from './ImportExamenModal';
import { ImportTutorial } from './ImportTutorial';
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
  const [monthFrom, setMonthFrom] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [monthTo, setMonthTo] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const LUNI = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];

  const currentYear = new Date().getFullYear();
  const ANI = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  // Derivăm dateFrom / dateTo din selecțiile de lună + an
  const dateFrom = useMemo(() => {
    if (!yearFrom) return '';
    const m = monthFrom ? monthFrom.padStart(2, '0') : '01';
    return `${yearFrom}-${m}-01`;
  }, [yearFrom, monthFrom]);

  const dateTo = useMemo(() => {
    if (!yearTo) return '';
    const m = monthTo ? monthTo.padStart(2, '0') : '12';
    // Ultima zi a lunii selectate
    const lastDay = new Date(Number(yearTo), Number(m), 0).getDate();
    return `${yearTo}-${m.padStart(2, '0')}-${lastDay}`;
  }, [yearTo, monthTo]);

  const hasDateFilter = !!(monthFrom || yearFrom || monthTo || yearTo);

  const applyShortcut = (shortcut: 'last6months' | 'thisYear' | 'lastYear') => {
    const today = new Date();
    if (shortcut === 'last6months') {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 6);
      setMonthFrom(String(from.getMonth() + 1));
      setYearFrom(String(from.getFullYear()));
      setMonthTo(String(today.getMonth() + 1));
      setYearTo(String(today.getFullYear()));
    } else if (shortcut === 'thisYear') {
      setMonthFrom('1');
      setYearFrom(String(today.getFullYear()));
      setMonthTo('12');
      setYearTo(String(today.getFullYear()));
    } else if (shortcut === 'lastYear') {
      const y = today.getFullYear() - 1;
      setMonthFrom('1');
      setYearFrom(String(y));
      setMonthTo('12');
      setYearTo(String(y));
    }
  };

  const clearDateFilter = () => {
    setMonthFrom('');
    setYearFrom('');
    setMonthTo('');
    setYearTo('');
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [showImportTutorial, setShowImportTutorial] = useState(false);
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

    if (dateFrom) {
      filtered = filtered.filter(s => (s.data || s.data_examen || '').toString().slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(s => (s.data || s.data_examen || '').toString().slice(0, 10) <= dateTo);
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
  }, [sesiuni, dateFrom, dateTo, locationFilter, clubFilter, statusFilter, isFederationAdmin, currentUser.club_id]);

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

  if (showImportTutorial) {
    return <ImportTutorial onBack={() => setShowImportTutorial(false)} />;
  }

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
                setIstoricGrade={setIstoricGrade}
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
                onFinalize={finalizeExamen}
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
                <Button onClick={() => setShowImportTutorial(true)} variant="secondary" className="w-full sm:w-auto justify-center">
                    <BookOpenIcon className="w-4 h-4 mr-2" /> Ghid Import
                </Button>
                 <Button onClick={() => setIsBulkImportModalOpen(true)} variant="info" className="w-full sm:w-auto justify-center">
                    <UploadCloudIcon className="w-5 h-5 mr-2" /> Import Bulk Examen
                </Button>
                <Button onClick={() => { setSesiuneToEdit(null); setIsFormOpen(true); }} variant="primary" className="w-full sm:w-auto justify-center">
                    <PlusIcon className="w-5 h-5 mr-2" />Adaugă Sesiune
                </Button>
            </div>
        )}
      </div>
      {/* Bloc filtre perioadă */}
      <div className="mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* De la: Lună + An */}
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">De la — Lună</label>
              <select
                value={monthFrom}
                onChange={e => setMonthFrom(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
              >
                <option value="">Orice lună</option>
                {LUNI.map((luna, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>{luna}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">De la — An</label>
              <select
                value={yearFrom}
                onChange={e => setYearFrom(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
              >
                <option value="">Orice an</option>
                {ANI.map(an => (
                  <option key={an} value={String(an)}>{an}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Separator vizual */}
          <div className="hidden lg:flex items-end pb-[10px]">
            <span className="text-slate-500 text-sm font-medium px-1">—</span>
          </div>

          {/* Până la: Lună + An */}
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Până la — Lună</label>
              <select
                value={monthTo}
                onChange={e => setMonthTo(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
              >
                <option value="">Orice lună</option>
                {LUNI.map((luna, idx) => (
                  <option key={idx + 1} value={String(idx + 1)}>{luna}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">Până la — An</label>
              <select
                value={yearTo}
                onChange={e => setYearTo(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
              >
                <option value="">Orice an</option>
                {ANI.map(an => (
                  <option key={an} value={String(an)}>{an}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buton Resetează */}
          {hasDateFilter && (
            <div className="lg:pb-[2px]">
              <button
                type="button"
                onClick={clearDateFilter}
                className="w-full lg:w-auto px-4 py-2 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg transition-colors whitespace-nowrap"
              >
                Resetează filtrele de perioadă
              </button>
            </div>
          )}
        </div>

        {/* Rezumat interval activ */}
        {hasDateFilter && (yearFrom || yearTo) && (
          <div className="text-xs text-brand-secondary/80 font-medium">
            Interval activ:{' '}
            {yearFrom
              ? `${monthFrom ? LUNI[Number(monthFrom) - 1] : 'Ianuarie'} ${yearFrom}`
              : 'început'}{' '}
            →{' '}
            {yearTo
              ? `${monthTo ? LUNI[Number(monthTo) - 1] : 'Decembrie'} ${yearTo}`
              : 'prezent'}
          </div>
        )}

        {/* Shortcut-uri perioadă */}
        <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-none">
          <span className="shrink-0 text-xs text-slate-400 self-center pr-1">Rapid:</span>
          {[
            { label: 'Ultimele 6 luni', value: 'last6months' as const },
            { label: 'Anul acesta', value: 'thisYear' as const },
            { label: 'Anul trecut', value: 'lastYear' as const },
          ].map(sc => (
            <button
              key={sc.value}
              type="button"
              onClick={() => applyShortcut(sc.value)}
              className="shrink-0 px-3 py-1 text-xs font-medium rounded-full border border-slate-600 text-slate-300 bg-slate-700/60 hover:bg-brand-secondary/20 hover:border-brand-secondary hover:text-brand-secondary transition-colors"
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtre suplimentare */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Select label="Filtrează după locație" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">Toate locațiile</option>
          {filteredLocatii.map(l => <option key={l.id} value={l.id}>{l.nume}</option>)}
        </Select>
        {isFederationAdmin && (
          <ClubSelect
            clubs={clubs || []}
            value={clubFilter}
            onChange={e => setClubFilter(e.target.value)}
            label="Filtrează după club"
          />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                <span className="font-bold text-white">{(inscrieri || []).filter(i => i.sesiune_id === s.id).length || s.nr_inscrisi || 0}</span>
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
            {(sortedSesiuni || []).length === 0 && (
              <p className="col-span-full p-6 text-center text-slate-400">
                {hasDateFilter || locationFilter || statusFilter || (isFederationAdmin && clubFilter)
                  ? 'Nicio sesiune în intervalul și filtrele selectate.'
                  : 'Nicio sesiune programată.'}
              </p>
            )}
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