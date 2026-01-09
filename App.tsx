import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, Examen, Grad, Participare, View, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie } from './types';
import { Dashboard } from './components/Dashboard';
import { SportiviManagement } from './components/Sportivi';
import { ExameneManagement } from './components/Examene';
import { GradeManagement } from './components/Grade';
import { PrezentaManagement } from './components/Prezenta';
import { GrupeManagement } from './components/Grupe';
import { RaportPrezenta } from './components/RaportPrezenta';
import { StagiiCompetitiiManagement } from './components/StagiiCompetitii';
import { PlatiScadente } from './components/PlatiScadente';
import { JurnalIncasari } from './components/JurnalIncasari';
import { TipuriAbonamentManagement } from './components/TipuriAbonament';
import { ConfigurarePreturi } from './components/ConfigurarePreturi';
import { RaportFinanciar } from './components/RaportFinanciar';
import { FamiliiManagement } from './components/Familii';
import { Login } from './components/Login';
import { PortalSportiv } from './components/PortalSportiv';
import { UserManagement } from './components/UserManagement';
import { Button, Card } from './components/ui';
import { ArrowLeftIcon } from './components/icons';
import { logoBase64 } from './assets/logo';
import { Session } from '@supabase/supabase-js';
import { FamilieDetail } from './components/FamilieDetail';
import { SportivAccountSettings } from './components/SportivAccountSettings';
import { EditareProfilPersonal } from './components/EditareProfilPersonal';

const TopBar: React.FC<{ onLogout: () => void; onHome: () => void; user: User | null; isPortal?: boolean }> = ({ onLogout, onHome, user, isPortal = false }) => {
    const userName = user ? (user.rol.includes('Admin') ? 'Administrator' : `${user.nume} ${user.prenume}`) : '...';
    return (
        <header className="bg-slate-800 shadow-md mb-8 border-b border-slate-700">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                 <div 
                    onClick={onHome} 
                    className="flex items-center gap-4 cursor-pointer group transition-all"
                    title="Mergi la ecranul principal"
                >
                    <div className="bg-white/5 p-1 rounded-lg group-hover:bg-brand-secondary/10 transition-colors">
                        <img src={logoBase64} alt="Phi Hau Iași Logo" className="h-10 w-10 object-contain" />
                    </div>
                    <span className="font-bold text-xl text-white hidden sm:block group-hover:text-brand-secondary transition-colors">
                        {isPortal ? 'Portal Sportiv' : 'Phi Hau Iași Admin'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-300 hidden md:block text-sm border-r border-slate-700 pr-4">
                        <span className="text-slate-500 font-medium">Cont:</span> {userName}
                    </span>
                    <Button onClick={onLogout} variant="danger" size="sm" className="shadow-lg shadow-red-900/20">
                        Deconectare
                    </Button>
                </div>
            </div>
        </header>
    );
};

export type MenuKey = 'sportivi' | 'examene' | 'financiar' | 'antrenamente' | 'stagii' | 'competitii' | 'setari' | null;

const menuConfig: Record<NonNullable<MenuKey>, { title: string, items: { view: View, label: string, roles?: User['rol'][number][] }[] }> = {
    sportivi: { title: "Meniu Sportivi", items: [ { view: 'sportivi', label: 'Listă Sportivi' }, { view: 'familii', label: 'Gestiune Familii' }, ] },
    examene: { title: "Meniu Examene", items: [ { view: 'examene', label: 'Configurare Examene' }, { view: 'grade', label: 'Tabel Grade' } ] },
    financiar: { title: "Meniu Financiar", items: [ { view: 'plati-scadente', label: 'Facturi (Datorii)' }, { view: 'jurnal-incasari', label: 'Jurnal Încasări' }, { view: 'raport-financiar', label: 'Raport Financiar' }, { view: 'tipuri-abonament', label: 'Configurare Abonamente' }, { view: 'configurare-preturi', label: 'Configurare Alte Prețuri' } ] },
    antrenamente: { title: "Meniu Antrenamente", items: [ { view: 'prezenta', label: 'Înregistrare Prezențe' }, { view: 'grupe', label: 'Orar & Gestiune Grupe' }, { view: 'raport-prezenta', label: 'Raport Prezențe' } ] },
    stagii: { title: "Meniu Stagii", items: [ { view: 'stagii', label: 'Listă Stagii & Participanți' } ] },
    competitii: { title: "Meniu Competiții", items: [ { view: 'competitii', label: 'Listă Competiții & Rezultate' } ] },
    setari: { title: "Setări Globale", items: [ { view: 'user-management', label: 'Gestionare Acces Utilizatori', roles: ['Admin', 'Instructor'] } ] },
};

const SubMenu: React.FC<{ menuKey: NonNullable<MenuKey>; onSelectItem: (view: View) => void; onBack: () => void; currentUser: User; }> = ({ menuKey, onSelectItem, onBack, currentUser }) => {
    const { title, items } = menuConfig[menuKey];
    const visibleItems = items.filter(item => !item.roles || item.roles.some(role => currentUser.rol.includes(role)));
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard</Button>
            <h1 className="text-3xl font-bold text-white mb-6 text-center">{title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {visibleItems.map(item => (
                    <div key={item.view} onClick={() => onSelectItem(item.view)}
                         className="bg-brand-primary hover:bg-blue-800 text-white font-bold py-6 px-4 rounded-lg shadow-lg cursor-pointer text-center transition-colors">
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Data states
  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [examene, setExamene] = useState<Examen[]>([]);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [participari, setParticipari] = useState<Participare[]>([]);
  const [prezente, setPrezente] = useState<Prezenta[]>([]);
  const [grupe, setGrupe] = useState<Grupa[]>([]);
  const [familii, setFamilii] = useState<Familie[]>([]);
  const [plati, setPlati] = useState<Plata[]>([]);
  const [tranzactii, setTranzactii] = useState<Tranzactie[]>([]);
  const [evenimente, setEvenimente] = useState<Eveniment[]>([]);
  const [rezultate, setRezultate] = useState<Rezultat[]>([]);
  const [preturiConfig, setPreturiConfig] = useState<PretConfig[]>([]);
  const [tipuriAbonament, setTipuriAbonament] = useState<TipAbonament[]>([]);
  const [customFields, setCustomFields] = useState<string[]>([]);

  // App view state
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [activeView, setActiveView] = useState<View | null>(null);
  const [plataToIncasare, setPlataToIncasare] = useState<Plata | null>(null);
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [selectedFamilie, setSelectedFamilie] = useState<Familie | null>(null);
  
    useEffect(() => {
        const getSession = async () => {
            if (!supabase) {
                setLoading(false);
                return;
            }
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
                await fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        };
        getSession();

        if (!supabase) return;

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
             if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        if (!supabase) return;
        const { data, error } = await supabase.from('sportivi').select('*').eq('user_id', userId);

        if (error) {
            console.error("Eroare la preluarea profilului utilizator:", error);
            setFetchError(`Eroare la preluarea profilului. Motiv: ${error.message}.`);
            setCurrentUser(null);
            setLoading(false);
        } else if (data && data.length === 1) {
            setCurrentUser(data[0] as User);
        } else if (data && data.length > 1) {
            console.error("Data integrity issue: Multiple profiles found for user_id:", userId);
            setFetchError(`Au fost găsite mai multe profile asociate contului dvs.`);
            setCurrentUser(null);
            setLoading(false);
        } else {
            console.error("No profile found for user_id:", userId);
            setFetchError(`Profilul dvs. nu a fost găsit în baza de date.`);
            setCurrentUser(null);
            setLoading(false);
        }
    };
    
    useEffect(() => {
        const fetchAllData = async () => {
            if (!currentUser || !supabase) return;
            setLoading(true);
            try {
                const results = await Promise.all([
                    supabase.from('sportivi').select('*'), supabase.from('examene').select('*'),
                    supabase.from('grade').select('*'), supabase.from('participari').select('*'),
                    supabase.from('grupe').select('*'), supabase.from('program_antrenamente').select('*'),
                    supabase.from('prezente').select('*'), supabase.from('prezente_sportivi').select('*'),
                    supabase.from('familii').select('*'), supabase.from('plati').select('*'),
                    supabase.from('tranzactii').select('*'), supabase.from('evenimente').select('*'),
                    supabase.from('rezultate').select('*'), supabase.from('preturi_config').select('*'),
                    supabase.from('tipuri_abonament').select('*'),
                ]);

                const [ sportiviRes, exameneRes, gradeRes, participariRes, grupeRes, programRes, prezenteRes, prezenteSportiviRes, familiiRes, platiRes, tranzactiiRes, evenimenteRes, rezultateRes, preturiRes, abonamenteRes ] = results;
                
                const grupeData = grupeRes.data || [];
                const programData = (programRes.data || []) as any[];
                const combinedGrupe = grupeData.map(g => ({ ...g, program: programData.filter(p => p.grupa_id === g.id).map(p => ({ ziua: p.ziua, ora_start: p.ora_start, ora_sfarsit: p.ora_sfarsit })) }));
                setGrupe(combinedGrupe as Grupa[]);
                
                const prezenteData = prezenteRes.data || [];
                const prezenteSportiviData = (prezenteSportiviRes.data as any[]) || [];
                const combinedPrezente = prezenteData.map(p => ({ ...p, id: p.id.toString(), sportivi_prezenti_ids: prezenteSportiviData.filter(ps => ps.prezenta_id.toString() === p.id.toString()).map(ps => ps.sportiv_id) }));
                setPrezente(combinedPrezente as Prezenta[]);

                setSportivi(sportiviRes.data as Sportiv[] || []);
                setExamene(exameneRes.data as Examen[] || []);
                setGrade(gradeRes.data as Grad[] || []);
                setParticipari(participariRes.data as Participare[] || []);
                setFamilii(familiiRes.data as Familie[] || []);
                setPlati(platiRes.data as Plata[] || []);
                setTranzactii(tranzactiiRes.data as Tranzactie[] || []);
                setEvenimente(evenimenteRes.data as Eveniment[] || []);
                setRezultate(rezultateRes.data as Rezultat[] || []);
                setPreturiConfig(preturiRes.data as PretConfig[] || []);
                setTipuriAbonament(abonamenteRes.data as TipAbonament[] || []);
            } catch (error) {
                console.error("Eroare preluare date:", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchAllData();
        }
    }, [currentUser]);

  const handleLogout = async () => { 
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null); setActiveMenu(null); setActiveView(null);
  };

  const handleBackToDashboard = () => { setActiveMenu(null); setActiveView(null); setSelectedSportiv(null); setSelectedFamilie(null); };

  const renderAdminContent = () => {
    if (loading) return <div className="text-center p-8">Se încarcă...</div>;
    
    if(activeView === 'familie-detail' && selectedFamilie) {
        return <FamilieDetail familie={selectedFamilie} membri={sportivi.filter(s => s.familie_id === selectedFamilie.id)} onBack={() => setActiveView('sportivi')} onSelectSportiv={(s) => { setSelectedSportiv(s); setActiveView('sportivi'); }} sportivi={sportivi} setSportivi={setSportivi} />
    }

    if (activeView === 'sportiv-account-settings' && selectedSportiv) {
        return <SportivAccountSettings sportiv={selectedSportiv} onBack={() => setActiveView('sportivi')} setSportivi={setSportivi} />;
    }

    if (activeView) {
      switch (activeView) {
        case 'sportivi': return <SportiviManagement onBack={() => setActiveView(null)} sportivi={sportivi} setSportivi={setSportivi} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} evenimente={evenimente} rezultate={rezultate} tipuriAbonament={tipuriAbonament} familii={familii} customFields={customFields} selectedSportiv={selectedSportiv} onSelectSportiv={setSelectedSportiv} onClearSelectedSportiv={() => setSelectedSportiv(null)} onSelectFamilie={(fid) => { setSelectedFamilie(familii.find(f => f.id === fid) || null); setActiveView('familie-detail'); }} onNavigateToAccountSettings={(s) => { setSelectedSportiv(s); setActiveView('sportiv-account-settings'); }} />;
        case 'examene': return <ExameneManagement onBack={() => setActiveView(null)} examene={examene} setExamene={setExamene} participari={participari} setParticipari={setParticipari} sportivi={sportivi} grade={grade} setPlati={setPlati} preturi={preturiConfig} />;
        case 'grade': return <GradeManagement onBack={() => setActiveView(null)} grade={grade} setGrade={setGrade} />;
        case 'prezenta': return <PrezentaManagement onBack={() => setActiveView(null)} sportivi={sportivi} prezente={prezente} setPrezente={setPrezente} grupe={grupe} plati={plati} />;
        case 'grupe': return <GrupeManagement onBack={() => setActiveView(null)} grupe={grupe} setGrupe={setGrupe} />;
        case 'raport-prezenta': return <RaportPrezenta onBack={() => setActiveView(null)} prezente={prezente} sportivi={sportivi} grupe={grupe} />;
        case 'familii': return <FamiliiManagement onBack={() => setActiveView(null)} familii={familii} setFamilii={setFamilii} />;
        case 'stagii': return <StagiiCompetitiiManagement onBack={() => setActiveView(null)} type="Stagiu" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} />;
        case 'competitii': return <StagiiCompetitiiManagement onBack={() => setActiveView(null)} type="Competitie" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} />;
        case 'plati-scadente': return <PlatiScadente onBack={() => setActiveView(null)} plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} onIncaseazaAcum={(p) => { setPlataToIncasare(p); setActiveView('jurnal-incasari'); }} />;
        case 'jurnal-incasari': return <JurnalIncasari onBack={() => setActiveView(null)} plati={plati} setPlati={setPlati} sportivi={sportivi} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} setTranzactii={setTranzactii} plataInitiala={plataToIncasare} onIncasareProcesata={() => setPlataToIncasare(null)} />;
        case 'raport-financiar': return <RaportFinanciar onBack={() => setActiveView(null)} plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} />;
        case 'tipuri-abonament': return <TipuriAbonamentManagement onBack={() => setActiveView(null)} tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} />;
        case 'configurare-preturi': return <ConfigurarePreturi onBack={() => setActiveView(null)} preturi={preturiConfig} setPreturi={setPreturiConfig} sportivi={sportivi} />;
        case 'user-management': return <UserManagement onBack={() => setActiveView(null)} sportivi={sportivi} setSportivi={setSportivi} currentUser={currentUser!} setCurrentUser={setCurrentUser} />;
        default: return <Dashboard onSelectMenu={setActiveMenu} />;
      }
    }

    if (activeMenu) {
        return <SubMenu menuKey={activeMenu} onSelectItem={setActiveView} onBack={() => setActiveMenu(null)} currentUser={currentUser!} />;
    }

    return <Dashboard onSelectMenu={setActiveMenu} />;
  };

  const renderPortalContent = () => {
    if (activeView === 'editare-profil-personal') {
        return <EditareProfilPersonal user={currentUser!} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView(null)} />;
    }
    return (
        <PortalSportiv 
            sportiv={currentUser!} 
            participari={participari} 
            examene={examene} 
            grade={grade} 
            prezente={prezente} 
            grupe={grupe} 
            plati={plati} 
            setPlati={setPlati} 
            evenimente={evenimente} 
            rezultate={rezultate} 
            setRezultate={setRezultate} 
            preturiConfig={preturiConfig} 
            onNavigateToEditProfil={() => setActiveView('editare-profil-personal')}
            sportivi={sportivi}
            familii={familii}
        />
    );
  };

  if (!session) return <Login />;
  if (fetchError) return <div className="min-h-screen flex items-center justify-center p-4"><Card><h2 className="text-red-400 text-xl font-bold mb-4">Eroare Autentificare</h2><p className="mb-6">{fetchError}</p><Button onClick={handleLogout} variant="secondary">Încearcă din nou</Button></Card></div>;
  if (!currentUser) return <div className="min-h-screen flex items-center justify-center">Se încarcă profilul...</div>;

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <TopBar 
        onLogout={handleLogout} 
        onHome={handleBackToDashboard} 
        user={currentUser} 
        isPortal={!currentUser.rol.includes('Admin') && !currentUser.rol.includes('Instructor')} 
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {currentUser.rol.includes('Admin') || currentUser.rol.includes('Instructor') ? renderAdminContent() : renderPortalContent()}
      </main>
    </div>
  );
}

export default App;