import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, Examen, Grad, Participare, View, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol } from './types';
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
import { Session } from '@supabase/supabase-js';
import { FamilieDetail } from './components/FamilieDetail';
import { SportivAccountSettings } from './components/SportivAccountSettings';
import { EditareProfilPersonal } from './components/EditareProfilPersonal';

const logoBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAGBQTFRF////AP8A/wAAAI6Oju7u7u7u7v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+7n+64AAAACh0Uk5TBA8YIiwuMTY5PEBITlRYWl9hY2Zpbm9ydHV2eXqAgYKEh4mKjI6PkpOU70F8bAAAAeFJREFUeNrs2u1SgzAMBuAsYFv3v9Z7OndpRyvI+ZByvj+I0KRP0pAm0H9+CBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECHwscG4f+Ezg8vOfz78O3P65P3D8K/B3YPdL4C0wYWAkwD9gwUCA38CAYQE/gQXDAn4BC8YEfAcWzAn4DSyYE/AXWDAf4Cew4DDAf4DDAK8BngM8BngK8BTgKcBTgKcAzwGeAzwGeArwFOApwFOApwDPAZ4DPAd4CvAU4CnAU4DnAKeBAU4DA5wGBjgNDHAaGOA0MMBpYIDTwACngQFOAwOcBgY4DQxwGhjgNDDAaWCA08AAp4EBTgMDnAYGOA0McBoY4DQwwGlggNPAMMDvAb8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvx/w+wG/H/D7Ab8f8PsBvwIMAAInB78Y2Yp2AAAAAElFTkSuQmCC`;

const TopBar: React.FC<{ onLogout: () => void; onHome: () => void; user: User | null; isPortal?: boolean; onViewOwnPortal?: () => void; }> = ({ onLogout, onHome, user, isPortal = false, onViewOwnPortal }) => {
    const userName = user ? (user.roluri?.some(r => r.nume === 'Admin') ? 'Administrator' : `${user.nume} ${user.prenume}`) : '...';
    const isAdmin = user?.roluri?.some(r => r.nume === 'Admin');

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
                     {isAdmin && !isPortal && onViewOwnPortal && (
                        <Button onClick={onViewOwnPortal} variant="secondary" size="sm">
                            Portalul Meu
                        </Button>
                    )}
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

const menuConfig: Record<NonNullable<MenuKey>, { title: string, items: { view: View, label: string, roles?: Rol['nume'][] }[] }> = {
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
    const visibleItems = items.filter(item => !item.roles || item.roles.some(roleName => currentUser.roluri?.some(userRole => userRole.nume === roleName)));
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
  const [allRoles, setAllRoles] = useState<Rol[]>([]);
  const [customFields, setCustomFields] = useState<string[]>([]);

  // App view state
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [activeView, setActiveView] = useState<View | null>(null);
  const [adminViewingPortal, setAdminViewingPortal] = useState(false);
  const [plataToIncasare, setPlataToIncasare] = useState<Plata | null>(null);
  const [selectedSportiv, setSelectedSportiv] = useState<Sportiv | null>(null);
  const [selectedFamilie, setSelectedFamilie] = useState<Familie | null>(null);
  const [viewingAs, setViewingAs] = useState<User | null>(null);
  
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
                setViewingAs(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('sportivi')
            .select('*, sportivi_roluri(roluri(id, nume))')
            .eq('user_id', userId);

        if (error) {
            console.error("Eroare la preluarea profilului utilizator:", error);
            setFetchError(`Eroare la preluarea profilului. Motiv: ${error.message}.`);
            setCurrentUser(null);
            setViewingAs(null);
        } else if (data && data.length > 0) {
             if (data.length > 1) {
                 console.warn(`Atenție: Au fost găsite mai multe profiluri pentru user_id ${userId}. Se va folosi primul.`);
             }
             const userProfile = data[0] as any;
             if (userProfile.sportivi_roluri) {
                userProfile.roluri = userProfile.sportivi_roluri.map((item: any) => item.roluri);
                delete userProfile.sportivi_roluri;
             } else {
                userProfile.roluri = [];
             }
            setCurrentUser(userProfile as User);
            setViewingAs(userProfile as User);
        } else {
            setFetchError(`Profilul dvs. nu a fost găsit în baza de date.`);
            setCurrentUser(null);
            setViewingAs(null);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        const fetchAllData = async () => {
            if (!currentUser || !supabase) return;
            setLoading(true);
            try {
                const results = await Promise.all([
                    supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))'), 
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
                    supabase.from('roluri').select('*'),
                ]);

                const [ sportiviRes, exameneRes, gradeRes, participariRes, grupeRes, programRes, prezenteRes, prezenteSportiviRes, familiiRes, platiRes, tranzactiiRes, evenimenteRes, rezultateRes, preturiRes, abonamenteRes, roluriRes ] = results;
                
                const sportiviData = (sportiviRes.data || []).map((s: any) => {
                    const roluri = s.sportivi_roluri ? s.sportivi_roluri.map((item: any) => item.roluri) : [];
                    delete s.sportivi_roluri;
                    return { ...s, roluri };
                });
                setSportivi(sportiviData as Sportiv[]);

                const grupeData = grupeRes.data || [];
                const programData = (programRes.data || []) as any[];
                const combinedGrupe = grupeData.map(g => ({ ...g, program: programData.filter(p => p.grupa_id === g.id).map(p => ({ ziua: p.ziua, ora_start: p.ora_start, ora_sfarsit: p.ora_sfarsit })) }));
                setGrupe(combinedGrupe as Grupa[]);
                
                const prezenteData = prezenteRes.data || [];
                const prezenteSportiviData = (prezenteSportiviRes.data as any[]) || [];
                const combinedPrezente = prezenteData.map(p => ({ ...p, id: p.id.toString(), sportivi_prezenti_ids: prezenteSportiviData.filter(ps => ps.prezenta_id.toString() === p.id.toString()).map(ps => ps.sportiv_id) }));
                setPrezente(combinedPrezente as Prezenta[]);

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
                setAllRoles(roluriRes.data as Rol[] || []);
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
    setCurrentUser(null); setActiveMenu(null); setActiveView(null); setViewingAs(null);
  };

  const handleBackToDashboard = () => { 
    setActiveMenu(null); 
    setActiveView(null); 
    setSelectedSportiv(null); 
    setSelectedFamilie(null);
    setAdminViewingPortal(false);
    setViewingAs(currentUser);
   };
   
  const handleSwitchViewedMember = (memberId: string) => {
      // FIX: Block-scoped variable 'isAdmin' used before its declaration. Moved declaration up.
      const isAdmin = currentUser?.roluri.some(r => r.nume === 'Admin') ?? false;
      if (!currentUser || (!currentUser.familie_id && !isAdmin)) return;
      const targetMember = sportivi.find(s => s.id === memberId);

      if (targetMember && (targetMember.id === currentUser.id || targetMember.familie_id === currentUser.familie_id || isAdmin)) {
          setViewingAs(targetMember);
      } else {
          console.warn("Încercare de a vizualiza un profil din afara familiei.");
      }
  };

   const handleViewOwnPortal = () => setAdminViewingPortal(true);

  const renderAdminContent = () => {
    if (loading) return <div className="text-center p-8">Se încarcă...</div>;
    
    if(activeView === 'familie-detail' && selectedFamilie) {
        return <FamilieDetail familie={selectedFamilie} membri={sportivi.filter(s => s.familie_id === selectedFamilie.id)} onBack={() => setActiveView('sportivi')} onSelectSportiv={(s) => { setSelectedSportiv(s); setActiveView('sportivi'); }} sportivi={sportivi} setSportivi={setSportivi} />
    }

    if (activeView === 'sportiv-account-settings' && selectedSportiv) {
        return <SportivAccountSettings sportiv={selectedSportiv} onBack={() => setActiveView('sportivi')} setSportivi={setSportivi} allRoles={allRoles} currentUser={currentUser!} />;
    }

    if (activeView) {
      switch (activeView) {
        case 'sportivi': return <SportiviManagement onBack={() => setActiveView(null)} sportivi={sportivi} setSportivi={setSportivi} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} evenimente={evenimente} rezultate={rezultate} tipuriAbonament={tipuriAbonament} familii={familii} customFields={customFields} selectedSportiv={selectedSportiv} onSelectSportiv={setSelectedSportiv} onClearSelectedSportiv={() => setSelectedSportiv(null)} onSelectFamilie={(fid) => { setSelectedFamilie(familii.find(f => f.id === fid) || null); setActiveView('familie-detail'); }} onNavigateToAccountSettings={(s) => { setSelectedSportiv(s); setActiveView('sportiv-account-settings'); }} allRoles={allRoles} />;
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
        case 'user-management': return <UserManagement onBack={() => setActiveView(null)} sportivi={sportivi} setSportivi={setSportivi} currentUser={currentUser!} setCurrentUser={setCurrentUser} allRoles={allRoles} />;
        default: return <Dashboard onSelectMenu={setActiveMenu} />;
      }
    }

    if (activeMenu) {
        return <SubMenu menuKey={activeMenu} onSelectItem={setActiveView} onBack={() => setActiveMenu(null)} currentUser={currentUser!} />;
    }

    return <Dashboard onSelectMenu={setActiveMenu} />;
  };

  const renderPortalContent = () => {
    if (!viewingAs) return <div className="text-center p-8">Se încarcă...</div>;
    
    if (activeView === 'editare-profil-personal') {
        return <EditareProfilPersonal user={currentUser!} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView(null)} />;
    }
    return (
        <PortalSportiv 
            currentUser={currentUser!}
            viewedUser={viewingAs}
            onSwitchView={handleSwitchViewedMember}
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
            onNavigateToDashboard={handleBackToDashboard}
        />
    );
  };

  if (!session) return <Login />;
  if (fetchError) return <div className="min-h-screen flex items-center justify-center p-4"><Card><h2 className="text-red-400 text-xl font-bold mb-4">Eroare Autentificare</h2><p className="mb-6">{fetchError}</p><Button onClick={handleLogout} variant="secondary">Încearcă din nou</Button></Card></div>;
  if (!currentUser) return <div className="min-h-screen flex items-center justify-center">Se încarcă profilul...</div>;

  const isPrivilegedUser = currentUser?.roluri?.some(r => r.nume === 'Admin' || r.nume === 'Instructor');

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <TopBar 
        onLogout={handleLogout} 
        onHome={handleBackToDashboard} 
        user={currentUser} 
        isPortal={adminViewingPortal || !isPrivilegedUser}
        onViewOwnPortal={handleViewOwnPortal}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {adminViewingPortal 
            ? renderPortalContent() 
            : isPrivilegedUser 
                ? renderAdminContent() 
                : renderPortalContent()}
      </main>
    </div>
  );
}

export default App;