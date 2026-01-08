
import React, { useState, useMemo, useEffect } from 'react';
import { Sportiv, Participare, Examen, Grad, Prezenta, Grupa, Plata, Eveniment, Rezultat, TipAbonament, Familie, Tranzactie } from '../types';
import { Button, Modal, Input, Select, Card } from './ui';
// FIX: Added ArrowLeftIcon to imports
import { PlusIcon, EditIcon, TrashIcon, ChevronDownIcon, ArrowLeftIcon } from './icons';

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);

const getAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const parseDurationToMonths = (durationStr: string): number => {
    const parts = durationStr.split(' ');
    if (parts.length < 2) return 0;
    const value = parseInt(parts[0], 10);
    const unit = parts[1].toLowerCase();
    if (unit.startsWith('lun')) return value; // luni
    if (unit.startsWith('an')) return value * 12; // an/ani
    return 0;
};

interface PlataRapidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  sportiv: Sportiv;
  plati: Plata[];
  setPlati: React.Dispatch<React.SetStateAction<Plata[]>>;
  setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>;
}

const PlataRapidaModal: React.FC<PlataRapidaModalProps> = ({ isOpen, onClose, sportiv, plati, setPlati, setTranzactii }) => {
  const [selectedPlatiIds, setSelectedPlatiIds] = useState<Set<string>>(new Set());
  const [metodaPlata, setMetodaPlata] = useState<'Cash' | 'Transfer Bancar'>('Cash');
  const [dataPlatii, setDataPlatii] = useState(new Date().toISOString().split('T')[0]);
  const [observatii, setObservatii] = useState('');

  const datorii = useMemo(() => {
    return plati.filter(p => 
      (p.sportivId === sportiv.id || (p.familieId && p.familieId === sportiv.familieId)) &&
      (p.status === 'Neachitat' || p.status === 'Achitat Parțial')
    ).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [plati, sportiv]);

  const totalSelectat = useMemo(() => {
    return datorii.reduce((acc, p) => selectedPlatiIds.has(p.id) ? acc + p.suma : acc, 0);
  }, [selectedPlatiIds, datorii]);

  const handleToggleSelectie = (plataId: string) => {
    setSelectedPlatiIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(plataId)) {
        newSet.delete(plataId);
      } else {
        newSet.add(plataId);
      }
      return newSet;
    });
  };
  
  const handleSave = () => {
    if (selectedPlatiIds.size === 0) {
      alert("Vă rugăm selectați cel puțin o datorie de achitat.");
      return;
    }

    const newTranzactie: Tranzactie = {
      id: new Date().toISOString(),
      plataIds: Array.from(selectedPlatiIds),
      sportivId: sportiv.familieId ? null : sportiv.id,
      familieId: sportiv.familieId,
      suma: totalSelectat,
      dataPlatii: dataPlatii,
      metodaPlata: metodaPlata
    };
    setTranzactii(prev => [...prev, newTranzactie]);

    setPlati(prev => prev.map(p => {
      if (selectedPlatiIds.has(p.id)) {
        return {
          ...p,
          status: 'Achitat',
          metodaPlata: metodaPlata,
          dataPlatii: dataPlatii,
          observatii: p.observatii ? `${p.observatii}\nPlata rapida: ${observatii}` : `Plata rapida: ${observatii}`
        };
      }
      return p;
    }));
    
    onClose();
  };
  
  useEffect(() => {
    if (isOpen) {
      setSelectedPlatiIds(new Set());
      setMetodaPlata('Cash');
      setDataPlatii(new Date().toISOString().split('T')[0]);
      setObservatii('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Plată Rapidă pentru ${sportiv.nume} ${sportiv.prenume}`}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Selectează Datoriile de Achitat</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-slate-900/50 p-3 rounded-md">
          {datorii.length > 0 ? datorii.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-slate-700 p-2 rounded-md">
              <label htmlFor={`plata-${p.id}`} className="flex items-center space-x-3 cursor-pointer">
                <input
                  id={`plata-${p.id}`}
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-500 bg-slate-800 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  checked={selectedPlatiIds.has(p.id)}
                  onChange={() => handleToggleSelectie(p.id)}
                />
                <div className="flex-grow">
                  <p className="font-medium">{p.descriere}</p>
                  <p className="text-sm text-slate-400">Data: {new Date(p.data).toLocaleDateString('ro-RO')}</p>
                </div>
              </label>
              <span className="font-bold text-lg">{p.suma.toFixed(2)} RON</span>
            </div>
          )) : (
            <p className="text-slate-400 text-center py-4">Nicio datorie neachitată.</p>
          )}
        </div>

        <div className="p-4 bg-slate-700 rounded-lg flex justify-between items-center">
          <h3 className="text-xl font-semibold">Total de Plată:</h3>
          <p className="text-3xl font-bold text-green-400">{totalSelectat.toFixed(2)} RON</p>
        </div>

        <h3 className="text-lg font-semibold text-white pt-2">Detalii Plată</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data Plății" type="date" value={dataPlatii} onChange={e => setDataPlatii(e.target.value)} />
            <Select label="Metoda de Plată" value={metodaPlata} onChange={e => setMetodaPlata(e.target.value as any)}>
                <option value="Cash">Cash</option>
                <option value="Transfer Bancar">Transfer Bancar</option>
            </Select>
        </div>
        <Input label="Observații (Opțional)" value={observatii} onChange={e => setObservatii(e.target.value)} placeholder="Detalii tranzacție, referință, etc." />
        
        <div className="flex justify-end pt-4 space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>Anulează</Button>
          <Button variant="success" onClick={handleSave} disabled={selectedPlatiIds.size === 0}>Înregistrează Plata</Button>
        </div>
      </div>
    </Modal>
  );
};

interface SportivFormFieldsProps {
  formState: Omit<Sportiv, 'id'>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: any } }) => void;
  grupe: Grupa[];
  familii: Familie[];
  tipuriAbonament: TipAbonament[];
  customFields: string[];
}

const SportivFormFields: React.FC<SportivFormFieldsProps> = ({ formState, handleChange, grupe, familii, tipuriAbonament, customFields }) => (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nume" name="nume" value={formState.nume} onChange={handleChange} required />
            <Input label="Prenume" name="prenume" value={formState.prenume} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Email" name="email" type="email" value={formState.email} onChange={handleChange} required />
            <Input label="Parolă" name="parola" type="text" value={formState.parola} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data Nașterii" name="dataNasterii" type="date" value={formState.dataNasterii} onChange={handleChange} required />
            <Input label="CNP" name="cnp" value={formState.cnp} onChange={handleChange} required maxLength={13} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Data Înscrierii" name="dataInscrierii" type="date" value={formState.dataInscrierii} onChange={handleChange} required />
            <Select label="Familie" name="familieId" value={formState.familieId || ''} onChange={handleChange}>
                <option value="">Individual</option>
                {familii.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
            </Select>
         </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Grupa" name="grupaId" value={formState.grupaId || ''} onChange={handleChange}>
                <option value="">Nicio grupă</option>
                {grupe.map(g => <option key={g.id} value={g.id}>{g.denumire}</option>)}
            </Select>
            <Select label="Tip Abonament (Individual)" name="tipAbonamentId" value={formState.tipAbonamentId || ''} onChange={handleChange} disabled={!!formState.familieId}>
                <option value="">Niciun abonament</option>
                {tipuriAbonament.filter(ab => ab.numarMembri === 1).map(ab => <option key={ab.id} value={ab.id}>{ab.denumire}</option>)}
            </Select>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Status" name="status" value={formState.status} onChange={handleChange}>
                <option value="Activ">Activ</option>
                <option value="Inactiv">Inactiv</option>
            </Select>
            <Input label="Club de Proveniență" name="clubProvenienta" value={formState.clubProvenienta} onChange={handleChange} />
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Select label="Participă la antrenamente de vacanță" name="participaVacanta" value={formState.participaVacanta ? 'Da' : 'Nu'} onChange={e => handleChange({ target: { name: 'participaVacanta', value: e.target.value === 'Da' } })}>
                <option value="Nu">Nu</option>
                <option value="Da">Da</option>
            </Select>
            <Input label="Înălțime (cm)" name="inaltime" type="number" value={formState.inaltime || ''} onChange={handleChange} />
         </div>
         {customFields.length > 0 && <div className="border-t border-slate-700 pt-4 mt-4">
             <h3 className="text-lg font-semibold mb-2 text-white">Câmpuri Suplimentare</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(field => (
                    <Input key={field} label={field} name={field} value={formState[field] || ''} onChange={handleChange} />
                ))}
             </div>
        </div>}
    </>
);

const emptySportivState: Omit<Sportiv, 'id'> = {
    nume: '', prenume: '', email: '', parola: '', dataNasterii: '', cnp: '',
    dataInscrierii: new Date().toISOString().split('T')[0],
    status: 'Activ', clubProvenienta: 'Phi Hau Iași',
    grupaId: null,
    familieId: null,
    tipAbonamentId: null,
    participaVacanta: false,
    inaltime: undefined,
}

interface AddSportivFormProps {
  onSave: (sportiv: Sportiv) => void;
  onCancel: () => void;
  grupe: Grupa[];
  familii: Familie[];
  tipuriAbonament: TipAbonament[];
  customFields: string[];
}

const AddSportivForm: React.FC<AddSportivFormProps> = ({ onSave, onCancel, grupe, familii, tipuriAbonament, customFields }) => {
    const [formState, setFormState] = useState<Omit<Sportiv, 'id'>>(emptySportivState);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: any } }) => {
        const {name, value} = e.target;
        setFormState(p => {
            const newState = {...p, [name]: value === null ? null : value };
            if (name === 'familieId' && value) {
                newState.tipAbonamentId = null; // Reseteaza abonamentul individual daca e selectata o familie
            }
            return newState;
        });
    }
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Cast to Sportiv because TypeScript has trouble inferring the type of an object spread
        // that includes an index signature. This is a safe cast as formState is initialized with all required properties.
        const newSportiv = { id: new Date().toISOString(), ...formState } as Sportiv;
        onSave(newSportiv);
        setFormState(emptySportivState);
    };

    return (
        <Card className="mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <SportivFormFields formState={formState} handleChange={handleChange} grupe={grupe} familii={familii} tipuriAbonament={tipuriAbonament} customFields={customFields} />
                <div className="flex justify-end pt-2 space-x-2">
                    <Button type="button" variant="secondary" onClick={onCancel}>Anulează</Button>
                    <Button type="submit" variant="success">Salvează Sportiv</Button>
                </div>
            </form>
        </Card>
    );
};

interface SportivDetailProps { sportiv: Sportiv; participari: Participare[]; examene: Examen[]; grade: Grad[]; prezente: Prezenta[]; grupe: Grupa[]; plati: Plata[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>; evenimente: Eveniment[]; rezultate: Rezultat[]; customFields: string[]; }
const SportivDetail: React.FC<SportivDetailProps> = ({ sportiv, participari, examene, grade, prezente, grupe, plati, setPlati, setTranzactii, evenimente, rezultate, customFields }) => {
    const [isPlataModalOpen, setIsPlataModalOpen] = useState(false);
    
    const admittedParticipations = useMemo(() => participari.filter(p => p.rezultat === 'Admis'), [participari]);
    const sortedAdmitted = useMemo(() => [...admittedParticipations].sort((a, b) => (getGrad(b.gradSustinutId, grade)?.ordine ?? 0) - (getGrad(a.gradSustinutId, grade)?.ordine ?? 0)), [admittedParticipations, grade]);
    const currentGrad = useMemo(() => getGrad(sortedAdmitted[0]?.gradSustinutId, grade), [sortedAdmitted, grade]);
    const grupaCurenta = useMemo(() => grupe.find(g => g.id === sportiv.grupaId), [grupe, sportiv.grupaId]);

    const monthlyPresence = useMemo(() => {
        const counts: Record<string, number> = {};
        prezente.filter(p => p.sportiviPrezentiIds.includes(sportiv.id)).forEach(p => {
            const monthYear = new Date(p.data).toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
            counts[monthYear] = (counts[monthYear] || 0) + 1;
        });
        return Object.entries(counts).map(([key, value]) => ({ month: key.charAt(0).toUpperCase() + key.slice(1), count: value })).sort((a, b) => new Date(`1 ${b.month}`) as any - (new Date(`1 ${a.month}`) as any));
    }, [prezente, sportiv.id]);

    const eligibility = useMemo(() => {
        const nextGrad = grade.find(g => g.ordine === (currentGrad?.ordine ?? 0) + 1);
        if (!nextGrad) return { eligible: false, message: "A atins gradul maxim.", nextGrad: null };

        const age = getAge(sportiv.dataNasterii);
        if (age < nextGrad.varstaMinima) return { eligible: false, message: `Vârstă minimă neîndeplinită (${age} ani). Necesar: ${nextGrad.varstaMinima} ani.`, nextGrad };

        const lastExamParticipation = sortedAdmitted[0];
        const startDate = lastExamParticipation ? new Date(examene.find(e => e.id === lastExamParticipation.examenId)!.data) : new Date(sportiv.dataInscrierii);
        
        const monthsToWait = parseDurationToMonths(nextGrad.timpAsteptare);
        const eligibilityDate = new Date(startDate);
        eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);

        if (new Date() < eligibilityDate) return { eligible: false, message: `Timp de așteptare insuficient. Eligibil după: ${eligibilityDate.toLocaleDateString('ro-RO')}.`, nextGrad };

        return { eligible: true, message: "Eligibil pentru examinare.", nextGrad };
    }, [currentGrad, grade, sportiv, examene, sortedAdmitted]);

    const sportivPlati = useMemo(() => plati.filter(p => p.sportivId === sportiv.id || (p.familieId && p.familieId === sportiv.familieId)).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime()), [plati, sportiv.id, sportiv.familieId]);
    const sportivRezultate = useMemo(() => rezultate.filter(r => r.sportivId === sportiv.id), [rezultate, sportiv.id]);

    const evenimenteCombinate = useMemo(() => {
        const exameneList = sortedAdmitted.map((p, index) => {
            const examen = examene.find(e => e.id === p.examenId);
            return {
                id: p.id,
                data: examen?.data || 'N/A',
                tip: 'Examen' as const,
                detalii: { ...p, grad: getGrad(p.gradSustinutId, grade), isCurrent: index === 0 }
            }
        });
        const alteEvenimente = sportivRezultate.map(r => {
             const eveniment = evenimente.find(e => e.id === r.evenimentId);
             return {
                id: r.id,
                data: eveniment?.data || 'N/A',
                tip: eveniment?.tip || 'Stagiu',
                detalii: { ...r, eveniment }
             }
        });
        return [...exameneList, ...alteEvenimente].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [sortedAdmitted, sportivRezultate, examene, grade, evenimente]);

    const customFieldsData = customFields.map(field => ({
        label: field,
        value: sportiv[field]
    })).filter(item => item.value);

    return (
        <>
        <PlataRapidaModal 
            isOpen={isPlataModalOpen} 
            onClose={() => setIsPlataModalOpen(false)} 
            sportiv={sportiv} 
            plati={plati}
            setPlati={setPlati}
            setTranzactii={setTranzactii}
        />
        <Card>
            {/* Header */}
            <div className="flex justify-between items-start">
                <div><h3 className="text-2xl font-bold text-white">{sportiv.nume} {sportiv.prenume}</h3><p className={`mt-1 text-sm font-semibold px-2 py-0.5 inline-block rounded ${sportiv.status === 'Activ' ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-200'}`}>{sportiv.status}</p></div>
                {currentGrad && ( <div className="text-right"><p className="text-slate-400 text-sm">Grad Curent</p><p className={`font-bold text-lg px-3 py-1 rounded bg-slate-700`}>{currentGrad.nume}</p></div> )}
            </div>

            {/* Date generale */}
            <div className="mt-6 border-t border-slate-700 pt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div><p className="text-sm text-slate-400">Data Nașterii</p><p>{sportiv.dataNasterii} ({getAge(sportiv.dataNasterii)} ani)</p></div>
                 <div><p className="text-sm text-slate-400">Data Înscrierii</p><p>{sportiv.dataInscrierii}</p></div>
                 <div><p className="text-sm text-slate-400">Grupa</p><p>{grupaCurenta?.denumire || 'N/A'}</p></div>
                 <div><p className="text-sm text-slate-400">Înălțime</p><p>{sportiv.inaltime ? `${sportiv.inaltime} cm` : 'N/A'}</p></div>
            </div>
             {customFieldsData.length > 0 && (
                <div className="mt-6 border-t border-slate-700 pt-6">
                    <h4 className="text-xl font-semibold mb-4 text-white">Informații Suplimentare</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {customFieldsData.map(item => (
                            <div key={item.label}>
                                <p className="text-sm text-slate-400">{item.label}</p>
                                <p>{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Info Section */}
            <div className="mt-6 border-t border-slate-700 pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 className="text-xl font-semibold mb-4 text-white">Eligibilitate Examen</h4>
                    <div className={`p-4 rounded-lg ${eligibility.eligible ? 'bg-green-800/50' : 'bg-red-800/50'}`}>
                        <p className="font-bold text-lg">{eligibility.nextGrad ? `Grad următor: ${eligibility.nextGrad.nume}` : ''}</p>
                        <p className={`font-semibold ${eligibility.eligible ? 'text-green-300' : 'text-red-300'}`}>{eligibility.message}</p>
                    </div>
                </div>
                <div>
                    <h4 className="text-xl font-semibold mb-4 text-white">Statistică Prezențe</h4>
                    {monthlyPresence.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {monthlyPresence.map(p => <div key={p.month} className="flex justify-between bg-slate-700 p-2 rounded-md text-sm"><span>{p.month}</span><span className="font-semibold">{p.count} prezențe</span></div>)}
                        </div>
                    ): <p className="text-slate-400">Nicio prezență înregistrată.</p>}
                </div>
            </div>

            {/* Istoric Financiar */}
            <div className="mt-6 border-t border-slate-700 pt-6">
                 <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold text-white">Istoric Financiar</h4>
                    <Button onClick={() => setIsPlataModalOpen(true)} variant="success">Plată Rapidă</Button>
                </div>
                {sportivPlati.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {sportivPlati.map(plata => (
                        <div key={plata.id} className="bg-slate-700 p-3 rounded-md grid grid-cols-4 gap-4 text-sm">
                            <span className="font-semibold col-span-2">{plata.descriere}</span>
                            <span>{plata.suma} RON</span>
                            <span className={`font-semibold text-right ${plata.status === 'Achitat' ? 'text-green-400' : 'text-yellow-400'}`}>{plata.status}</span>
                        </div>
                    ))}
                    </div>
                ) : <p className="text-slate-400">Nicio plată înregistrată.</p>}
            </div>

            {/* Istoric Sportiv Timeline */}
            <div className="mt-6 border-t border-slate-700 pt-6">
                <h4 className="text-xl font-semibold mb-4 text-white">Istoric Sportiv (Timeline)</h4>
                <div className="relative pl-8">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-600"></div>
                    {evenimenteCombinate.map(item => (
                        <div key={item.id} className="relative mb-8">
                            <div className="absolute -left-5 top-2 w-4 h-4 rounded-full bg-slate-500 border-2 border-slate-800"></div>
                            <p className="text-sm text-slate-400 font-semibold">{new Date(item.data).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            {item.tip === 'Examen' && (
                                <Card className={`mt-2 ${item.detalii.isCurrent ? 'bg-amber-800/50 ring-2 ring-amber-500' : 'bg-slate-700'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-bold ${item.detalii.isCurrent ? 'text-amber-300' : 'text-white'}`}>Examen Grad {item.detalii.grad?.nume}</p>
                                            <p className={`text-sm font-semibold px-2 py-0.5 inline-block rounded mt-1 ${item.detalii.rezultat === 'Admis' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{item.detalii.rezultat}</p>
                                        </div>
                                        {item.detalii.isCurrent && <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Grad Curent</span>}
                                    </div>
                                    {item.detalii.observatii && <p className="text-sm text-slate-300 mt-2 border-t border-slate-600 pt-2">Observații: {item.detalii.observatii}</p>}
                                </Card>
                            )}
                            {(item.tip === 'Stagiu' || item.tip === 'Competitie') && (
                                <Card className="mt-2 bg-slate-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white">{item.detalii.eveniment?.denumire}</p>
                                            <p className="text-sm text-slate-300">{item.detalii.rezultat}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.tip === 'Stagiu' ? 'bg-sky-700' : 'bg-purple-700'}`}>{item.tip.toUpperCase()}</span>
                                    </div>
                                </Card>
                            )}
                        </div>
                    ))}
                    {evenimenteCombinate.length === 0 && <p className="text-slate-400 pl-4">Niciun eveniment în istoric.</p>}
                </div>
            </div>
        </Card>
        </>
    );
};


// FIX: Added onBack to props interface
interface SportiviManagementProps { onBack: () => void; sportivi: Sportiv[]; setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>; participari: Participare[]; examene: Examen[]; grade: Grad[]; prezente: Prezenta[]; grupe: Grupa[]; plati: Plata[]; setPlati: React.Dispatch<React.SetStateAction<Plata[]>>; setTranzactii: React.Dispatch<React.SetStateAction<Tranzactie[]>>; evenimente: Eveniment[]; rezultate: Rezultat[]; tipuriAbonament: TipAbonament[]; familii: Familie[]; customFields: string[]; setCustomFields: React.Dispatch<React.SetStateAction<string[]>>; }
export const SportiviManagement: React.FC<SportiviManagementProps> = ({ onBack, sportivi, setSportivi, participari, examene, grade, prezente, grupe, plati, setPlati, setTranzactii, evenimente, rezultate, tipuriAbonament, familii, customFields, setCustomFields }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  
  const platiRestante = useMemo(() => {
    const lunaCurenta = new Date().getMonth();
    const anulCurent = new Date().getFullYear();
    const sportiviCuRestante = new Set<string>();

    sportivi.forEach(s => {
        if (s.status !== 'Activ') return;

        let areAbonamentPlatit = false;
        if (s.familieId) {
            areAbonamentPlatit = plati.some(p => p.familieId === s.familieId && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
        } else {
            areAbonamentPlatit = plati.some(p => p.sportivId === s.id && p.tip === 'Abonament' && p.status === 'Achitat' && new Date(p.data).getMonth() === lunaCurenta && new Date(p.data).getFullYear() === anulCurent);
        }
        if (!areAbonamentPlatit) {
            sportiviCuRestante.add(s.id);
        }
    });
    return sportiviCuRestante;
  }, [sportivi, plati]);
  
  const handleAddSportiv = (sportiv: Sportiv) => { setSportivi(prev => [...prev, sportiv]); setShowAddForm(false); };
  const handleEditChange = (id: string, field: string, value: any) => { setSportivi(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s)); };
  const handleDelete = (sportivId: string) => { if (window.confirm("Ești sigur că vrei să ștergi acest sportiv?")) { setSportivi(prev => prev.filter(s => s.id !== sportivId)); if (selectedSportiv?.id === sportivId) setSelectedSportiv(null); } };
  const filteredSportivi = sportivi.filter(s => `${s.nume} ${s.prenume}`.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b) => a.nume.localeCompare(b.nume));

    const handleAddColumn = () => {
        const trimmedName = newColumnName.trim();
        if (!trimmedName) { alert("Numele coloanei nu poate fi gol."); return; }
        const reservedNames = Object.keys(emptySportivState);
        if (customFields.includes(trimmedName) || reservedNames.includes(trimmedName)) { alert("Acest nume de coloană există deja."); return; }
        setCustomFields(prev => [...prev, trimmedName]);
        setNewColumnName('');
        setIsColumnModalOpen(false);
    };

  if (selectedSportiv) return (<div><Button onClick={() => setSelectedSportiv(null)} className="mb-4">&larr; Înapoi la listă</Button><SportivDetail sportiv={selectedSportiv} participari={participari.filter(p => p.sportivId === selectedSportiv.id)} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} setTranzactii={setTranzactii} evenimente={evenimente} rezultate={rezultate} customFields={customFields} /></div>)

  return (
    <div>
      {/* FIX: Added "Back to Menu" button for navigation consistency */}
      <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Meniu</Button>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-white">Management Sportivi</h1>
        <div className="flex gap-2">
            <Button onClick={() => setIsColumnModalOpen(true)} variant="secondary">Adaugă Coloană</Button>
            <Button onClick={() => setShowAddForm(p => !p)} variant="info">
            {showAddForm ? 'Anulează' : <><PlusIcon className="w-5 h-5 mr-2" />Adaugă Sportiv</>}
            <ChevronDownIcon className={`w-5 h-5 ml-2 transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
            </Button>
        </div>
      </div>
      
      {showAddForm && <AddSportivForm onSave={handleAddSportiv} onCancel={() => setShowAddForm(false)} grupe={grupe} familii={familii} tipuriAbonament={tipuriAbonament} customFields={customFields} />}

      <div className="mb-4 mt-6"><Input label="Caută sportiv..." type="text" placeholder="Nume, prenume..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>

      <div className="bg-slate-800 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-left min-w-[950px]">
          <thead className="bg-slate-700"><tr><th className="p-4 font-semibold">Nume Complet</th><th className="p-4 font-semibold">Email</th><th className="p-4 font-semibold">Status</th>{customFields.map(field => <th key={field} className="p-4 font-semibold">{field}</th>)}<th className="p-4 font-semibold">Acțiuni</th></tr></thead>
          <tbody>
            {filteredSportivi.map(sportiv => {
                 return (
                 <tr key={sportiv.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4 font-medium cursor-pointer" onClick={() => setSelectedSportiv(sportiv)}>
                        <div className="flex items-center">
                            {platiRestante.has(sportiv.id) && <span className="w-3 h-3 bg-red-500 rounded-full mr-3 flex-shrink-0" title="Abonament neachitat"></span>}
                            <span>{sportiv.nume} {sportiv.prenume}</span>
                        </div>
                    </td>
                    <td className="p-2 min-w-[200px]"><Input label="" value={sportiv.email} onChange={e => handleEditChange(sportiv.id, 'email', e.target.value)} /></td>
                    <td className="p-2"><Select label="" value={sportiv.status} onChange={(e) => handleEditChange(sportiv.id, 'status', e.target.value)} className="w-28"><option value="Activ">Activ</option><option value="Inactiv">Inactiv</option></Select></td>
                    {customFields.map(field => (
                        <td key={field} className="p-2 min-w-[150px]"><Input label="" value={sportiv[field] || ''} onChange={e => handleEditChange(sportiv.id, field, e.target.value)} /></td>
                    ))}
                    <td className="p-4"><div className="flex items-center space-x-2"><Button onClick={() => handleDelete(sportiv.id)} variant="danger" size="sm"><TrashIcon /></Button></div></td>
                 </tr> 
                )
            })}
          </tbody>
        </table>
         {filteredSportivi.length === 0 && <p className="p-4 text-center text-slate-400">Niciun sportiv găsit.</p>}
      </div>
      <Modal isOpen={isColumnModalOpen} onClose={() => setIsColumnModalOpen(false)} title="Adaugă Coloană Nouă">
        <div className="space-y-4">
            <Input label="Nume Coloană" value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder="Ex: Telefon Părinte" />
            <div className="flex justify-end pt-2 space-x-2">
                <Button variant="secondary" onClick={() => setIsColumnModalOpen(false)}>Anulează</Button>
                <Button variant="success" onClick={handleAddColumn}>Salvează Coloana</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
