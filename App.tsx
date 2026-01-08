import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, Examen, Grad, Participare, View, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, ProgramItem } from './types';
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
import { Button } from './components/ui';
import { ArrowLeftIcon } from './components/icons';
import { logoBase64 } from './assets/logo';
import { Session } from '@supabase/supabase-js';

const TopBar: React.FC<{ onLogout: () => void; user: User | null }> = ({ onLogout, user }) => {
    const userName = user ? (user.rol === 'Admin' ? 'Administrator' : `${user.nume} ${user.prenume}`) : '...';
    return (
        <header className="bg-slate-800 shadow-md mb-8">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                 <div className="flex items-center gap-4">
                    <img src={logoBase64} alt="Club Logo" className="h-10 w-10" />
                    <span className="font-bold text-xl text-white hidden sm:block">Phi Hau Iași Admin</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-slate-300 hidden md:block">Utilizator: {userName}</span>
                    <Button onClick={onLogout} variant="danger" size="sm">Logout</Button>
                </div>
            </div>
        </header>
    );
};

export type MenuKey = 'sportivi' | 'examene' | 'financiar' | 'antrenamente' | 'stagii' | 'competitii' | 'setari' | null;

const menuConfig: Record<NonNullable<MenuKey>, { title: string, items: { view: View, label: string, roles?: User['rol'][] }[] }> = {
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
    const visibleItems = items.filter(item => !item.roles || item.roles.includes(currentUser.rol));
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
  const [customFields, setCustomFields] = useState<string[]>([]); // This can remain local or be stored in a settings table

  // App view state
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [activeView, setActiveView] = useState<View | null>(null);
  const [plataToIncasare, setPlataToIncasare] = useState<Plata | null>(null);
  
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
                await fetchUserProfile(session.user.id);
            }
            setLoading(false);
        };
        getSession();

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
        const { data, error } = await supabase.from('sportivi').select('*').eq('user_id', userId).single();
        if (error) {
            console.error("Error fetching user profile:", error);
        } else if (data) {
            setCurrentUser(data as User);
        }
    };
    
    // Fetch all data when user is logged in
    useEffect(() => {
        const fetchAllData = async () => {
            if (!currentUser) return;
            setLoading(true);

            // Supabase client handles camelCase to snake_case mapping
            const [
                sportiviRes, exameneRes, gradeRes, participariRes, 
                grupeRes, programRes, prezenteRes, prezenteSportiviRes,
                familiiRes, platiRes, tranzactiiRes, evenimenteRes, 
                rezultateRes, preturiRes, abonamenteRes
            ] = await Promise.all([
                supabase.from('sportivi').select('*'),
                supabase.from('examene').select('*'),
                supabase.from('grade').select('*'),
                supabase.from('participari').select('*'),
                supabase.from('grupe').select('*'),
                supabase.from('program_antrenamente').select('*'),
                supabase.from('prezente').select('*'),
                supabase.from('prezente_sportivi').select('*'),
                supabase.from('familii').select('*'),
                supabase.from('plati').select('*'),
                supabase.from('tranzactii').select('*'),
                supabase.from('evenimente').select('*'),
                supabase.from('rezultate').select('*'),
                supabase.from('preturi_config').select('*'),
                supabase.from('tipuri_abonament').select('*'),
            ]);

            // Combine grupe with their programs
            const grupeData = grupeRes.data || [];
            // FIX: Cast to any[] to allow access to snake_case properties from the database (e.g., grupa_id)
            // which are not defined on the camelCase ProgramItem type.
            const programData = (programRes.data || []) as any[];
            const combinedGrupe = grupeData.map(g => ({
                ...g,
                program: programData.filter(p => p.grupa_id === g.id).map(p => ({ ziua: p.ziua, oraStart: p.ora_start, oraSfarsit: p.ora_sfarsit }))
            }));
            setGrupe(combinedGrupe as Grupa[]);
            
            // Combine prezente with their athletes
            const prezenteData = prezenteRes.data || [];
            const prezenteSportiviData = prezenteSportiviRes.data as {prezenta_id: string, sportiv_id: string}[] || [];
            const combinedPrezente = prezenteData.map(p => ({
                ...p,
                id: p.id.toString(), // Ensure ID is string
                sportiviPrezentiIds: prezenteSportiviData.filter(ps => ps.prezenta_id.toString() === p.id.toString()).map(ps => ps.sportiv_id)
            }));
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

            setLoading(false);
        };

        if (currentUser) {
            fetchAllData();
        }
    }, [currentUser]);


  const handleIncaseazaAcum = (plata: Plata) => {
    setPlataToIncasare(plata);
    setActiveMenu('financiar');
    setActiveView('jurnal-incasari');
  };
  
  const handleLogout = async () => { 
    await supabase.auth.signOut();
    setCurrentUser(null); 
    setActiveMenu(null); 
    setActiveView(null); 
    // Clear all data states
    setSportivi([]);
    setExamene([]);
    setGrade([]);
    setParticipari([]);
    setPrezente([]);
    setGrupe([]);
    setFamilii([]);
    setPlati([]);
    setTranzactii([]);
    setEvenimente([]);
    setRezultate([]);
    setPreturiConfig([]);
    setTipuriAbonament([]);
  };

  const handleBackToMenu = () => setActiveView(null);
  const handleBackToDashboard = () => setActiveMenu(null);

  const renderAdminContent = () => {
    if (loading) return <div className="text-center p-8">Se încarcă datele...</div>;
    if (activeView) {
      switch (activeView) {
        case 'sportivi': return <SportiviManagement onBack={handleBackToMenu} sportivi={sportivi} setSportivi={setSportivi} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} tipuriAbonament={tipuriAbonament} familii={familii} customFields={customFields} setCustomFields={setCustomFields} setTranzactii={setTranzactii} />;
        case 'examene': return <ExameneManagement onBack={handleBackToMenu} examene={examene} setExamene={setExamene} participari={participari} setParticipari={setParticipari} sportivi={sportivi} grade={grade} setPlati={setPlati} preturi={preturiConfig} />;
        case 'grade': return <GradeManagement onBack={handleBackToMenu} grade={grade} setGrade={setGrade} />;
        case 'prezenta': return <PrezentaManagement onBack={handleBackToMenu} sportivi={sportivi} prezente={prezente} setPrezente={setPrezente} grupe={grupe} plati={plati} />;
        case 'grupe': return <GrupeManagement onBack={handleBackToMenu} grupe={grupe} setGrupe={setGrupe} />;
        case 'raport-prezenta': return <RaportPrezenta onBack={handleBackToMenu} prezente={prezente} sportivi={sportivi} grupe={grupe} />;
        case 'familii': return <FamiliiManagement onBack={handleBackToMenu} familii={familii} setFamilii={setFamilii} />;
        case 'stagii': return <StagiiCompetitiiManagement onBack={handleBackToMenu} type="Stagiu" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} />;
        case 'competitii': return <StagiiCompetitiiManagement onBack={handleBackToMenu} type="Competitie" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} />;
        case 'plati-scadente': return <PlatiScadente onBack={handleBackToMenu} plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} onIncaseazaAcum={handleIncaseazaAcum} />;
        case 'jurnal-incasari': return <JurnalIncasari onBack={handleBackToMenu} plati={plati} setPlati={setPlati} sportivi={sportivi} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} setTranzactii={setTranzactii} plataInitiala={plataToIncasare} onIncasareProcesata={() => setPlataToIncasare(null)} />;
        case 'tipuri-abonament': return <TipuriAbonamentManagement onBack={handleBackToMenu} tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} />;
        case 'configurare-preturi': return <ConfigurarePreturi onBack={handleBackToMenu} preturi={preturiConfig} setPreturi={setPreturiConfig} sportivi={sportivi} />;
        case 'raport-financiar': return <RaportFinanciar onBack={handleBackToMenu} plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} />;
        case 'user-management': return <UserManagement onBack={handleBackToMenu} sportivi={sportivi} setSportivi={setSportivi} currentUser={currentUser!} setCurrentUser={setCurrentUser} />;
        default: setActiveView(null); return null;
      }
    }
    if (activeMenu) {
        return <SubMenu menuKey={activeMenu} onSelectItem={setActiveView} onBack={handleBackToDashboard} currentUser={currentUser!} />
    }
    return <Dashboard onSelectMenu={setActiveMenu} />;
  };

  if (loading && !currentUser) return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>
  if (!session || !currentUser) return <Login />;

  const isAdminOrInstructor = currentUser.rol === 'Admin' || currentUser.rol === 'Instructor';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {isAdminOrInstructor ? (
        <>
          <TopBar onLogout={handleLogout} user={currentUser} />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">{renderAdminContent()}</main>
        </>
      ) : (
        <PortalSportiv sportiv={currentUser} onLogout={handleLogout} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} preturiConfig={preturiConfig} />
      )}
    </div>
  );
}

export default App;