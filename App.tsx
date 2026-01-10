import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, Examen, Grad, Participare, View, Prezenta, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol } from './types';
import { Dashboard } from './components/Dashboard';
import { SportiviManagement } from './components/Sportivi';
import { PrezentaManagement } from './components/Prezenta';
import { GrupeManagement } from './components/Grupe';
import { RaportPrezenta } from './components/RaportPrezenta';
import { PlatiScadente } from './components/PlatiScadente';
import { JurnalIncasari } from './components/JurnalIncasari';
import { TipuriAbonamentManagement } from './components/TipuriAbonament';
import { ConfigurarePreturi } from './components/ConfigurarePreturi';
import { RaportFinanciar } from './components/RaportFinanciar';
import { Login } from './components/Login';
import { PortalSportiv } from './components/PortalSportiv';
import { Button, Card } from './components/ui';
import { Session } from '@supabase/supabase-js';
import { EditareProfilPersonal } from './components/EditareProfilPersonal';
import { EvenimenteleMele } from './components/EvenimenteleMele';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { Activitati } from './components/Activitati';


function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { showError } = useError();

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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [adminViewingPortal, setAdminViewingPortal] = useState(false);
  const [plataToIncasare, setPlataToIncasare] = useState<Plata | null>(null);
  const [viewingAs, setViewingAs] = useState<User | null>(null);
  
  const fetchUserProfile = useCallback(async (userId: string) => {
        if (!supabase) return;
        setLoading(true);
        const { data: userProfiles, error } = await supabase
            .from('sportivi')
            .select('*, sportivi_roluri(roluri(id, nume))')
            .eq('user_id', userId);

        if (error) {
            console.error("DEBUG:", "Eroare la preluarea profilului utilizator:", error);
            const msg = `Eroare la preluarea profilului. Motiv: ${error.message}.`;
            setFetchError(msg);
            showError("Eroare Profil", error);
            setCurrentUser(null);
            setViewingAs(null);
        } else if (userProfiles && userProfiles.length > 0) {
             if (userProfiles.length > 1) {
                console.warn(`Atenție: Au fost găsite mai multe (${userProfiles.length}) profiluri pentru user ID ${userId}. Se va folosi primul găsit.`);
             }
             const userProfile = userProfiles[0];
             const userProfileData = userProfile as any;
             if (userProfileData.sportivi_roluri) {
                userProfileData.roluri = userProfileData.sportivi_roluri.map((item: any) => item.roluri);
                delete userProfileData.sportivi_roluri;
             } else {
                userProfileData.roluri = [];
             }
            setCurrentUser(userProfileData as User);
            setViewingAs(userProfileData as User);
        } else {
            const msg = `Profilul dvs. nu a fost găsit în baza de date.`;
            setFetchError(msg);
            showError("Eroare Profil", msg);
            setCurrentUser(null);
            setViewingAs(null);
        }
        setLoading(false);
    }, [showError]);
    
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
                setActiveView('dashboard');
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchUserProfile]);
    
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

                const errors = results.filter(res => res.error);
                if (errors.length > 0) {
                    throw errors.map(e => e.error!.message).join('\n');
                }

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
                
                const prezenteData = (prezenteRes.data as any[]) || [];
                const prezenteSportiviData = (prezenteSportiviRes.data as any[]) || [];
                const combinedPrezente = prezenteData.map(p => ({
                    ...p,
                    sportivi_prezenti_ids: prezenteSportiviData
                        .filter(ps => ps.prezenta_id === p.id)
                        .map(ps => ps.sportiv_id)
                }));
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
                console.error("DEBUG:", error);
                showError("Eroare la preluarea datelor", error);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchAllData();
        }
    }, [currentUser, showError]);

  const handleLogout = async () => { 
    if (supabase) await supabase.auth.signOut();
    setCurrentUser(null); 
    setViewingAs(null);
    setActiveView('dashboard');
  };

  const handleNavigate = (view: View) => {
    setActiveView(view);
    if(view === 'dashboard' && adminViewingPortal) {
        setAdminViewingPortal(false);
        setViewingAs(currentUser);
    }
  };
   
  const handleSwitchViewedMember = (memberId: string) => {
      const isAdmin = currentUser?.roluri.some(r => r.nume === 'Admin') ?? false;
      if (!currentUser || (!currentUser.familie_id && !isAdmin)) return;
      const targetMember = sportivi.find(s => s.id === memberId);

      if (targetMember && (targetMember.id === currentUser.id || targetMember.familie_id === currentUser.familie_id || isAdmin)) {
          setViewingAs(targetMember);
      } else {
          console.warn("Încercare de a vizualiza un profil din afara familiei.");
      }
  };

   const handleViewOwnPortal = () => {
       setAdminViewingPortal(true);
       setActiveView('dashboard');
   }

  const renderContent = () => {
    if (loading) return <div className="text-center p-8 text-white">Se încarcă...</div>;
    
    const isPrivilegedUser = currentUser?.roluri?.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
    const isPortal = !isPrivilegedUser || adminViewingPortal;

    const handleBackToDashboard = () => setActiveView('dashboard');

    if (isPortal) {
        if (!viewingAs) return <div className="text-center p-8 text-white">Se încarcă profilul de vizualizare...</div>;
        switch(activeView) {
            case 'editare-profil-personal': 
                return <EditareProfilPersonal user={currentUser!} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={handleBackToDashboard} />;
            case 'evenimentele-mele': 
                return <EvenimenteleMele viewedUser={viewingAs} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} onBack={handleBackToDashboard} />;
            case 'dashboard':
            default:
                return <PortalSportiv currentUser={currentUser!} viewedUser={viewingAs} onSwitchView={handleSwitchViewedMember} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} preturiConfig={preturiConfig} onNavigateToEditProfil={() => setActiveView('editare-profil-personal')} onNavigateToEvenimenteleMele={() => setActiveView('evenimentele-mele')} sportivi={sportivi} familii={familii} onNavigateToDashboard={handleBackToDashboard} />;
        }
    } else {
        switch (activeView) {
            case 'sportivi': return <SportiviManagement onBack={handleBackToDashboard} sportivi={sportivi} setSportivi={setSportivi} participari={participari} grupe={grupe} tipuriAbonament={tipuriAbonament} customFields={customFields} setCustomFields={setCustomFields} currentUser={currentUser!} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} familii={familii} setFamilii={setFamilii} />;
            case 'activitati': return <Activitati onBack={handleBackToDashboard} sportivi={sportivi} prezente={prezente} setPrezente={setPrezente} grupe={grupe} examene={examene} setExamene={setExamene} participari={participari} setParticipari={setParticipari} grade={grade} setGrade={setGrade} setPlati={setPlati} preturiConfig={preturiConfig} evenimente={evenimente} rezultate={rezultate} />;
            case 'grupe': return <GrupeManagement onBack={handleBackToDashboard} grupe={grupe} setGrupe={setGrupe} />;
            case 'raport-prezenta': return <RaportPrezenta onBack={handleBackToDashboard} prezente={prezente} sportivi={sportivi} grupe={grupe} />;
            case 'plati-scadente': return <PlatiScadente onBack={handleBackToDashboard} plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} onIncaseazaAcum={(p) => { setPlataToIncasare(p); setActiveView('jurnal-incasari'); }} />;
            case 'jurnal-incasari': return <JurnalIncasari onBack={() => { setActiveView('plati-scadente'); setPlataToIncasare(null); }} plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} setTranzactii={setTranzactii} plataInitiala={plataToIncasare} onIncasareProcesata={() => setPlataToIncasare(null)} />;
            case 'raport-financiar': return <RaportFinanciar onBack={handleBackToDashboard} plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} />;
            case 'tipuri-abonament': return <TipuriAbonamentManagement onBack={handleBackToDashboard} tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} />;
            case 'configurare-preturi': return <ConfigurarePreturi onBack={handleBackToDashboard} preturi={preturiConfig} setPreturi={setPreturiConfig} sportivi={sportivi} />;
            case 'dashboard':
            default: return <Dashboard onNavigate={handleNavigate} />;
        }
    }
  };

  if (!session) return <Login />;
  if (fetchError) return <div className="min-h-screen flex items-center justify-center p-4"><Card><h2 className="text-red-500 text-xl font-bold mb-4">Eroare Autentificare</h2><p className="mb-6">{fetchError}</p><Button onClick={handleLogout} variant="secondary">Încearcă din nou</Button></Card></div>;
  if (!currentUser) return <div className="min-h-screen flex items-center justify-center bg-brand-primary text-white">Se încarcă profilul...</div>;

  const isPrivilegedUser = currentUser?.roluri?.some(r => r.nume === 'Admin' || r.nume === 'Instructor');

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar 
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        activeView={activeView}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isPortalView={!isPrivilegedUser || adminViewingPortal}
        onViewOwnPortal={handleViewOwnPortal}
      />
      <main className={`flex-1 transition-all duration-300 overflow-y-auto bg-brand-primary ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;