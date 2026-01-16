import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, Examen, Grad, Participare, View, Antrenament, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol, AnuntPrezenta, Reducere, AnuntGeneral } from './types';
import { Dashboard } from './components/Dashboard';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
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
import { SportivDashboard } from './components/SportivDashboard';
import { UserManagement } from './components/UserManagement';
import { Session } from '@supabase/supabase-js';
import { EditareProfilPersonal } from './components/EditareProfilPersonal';
import { EvenimenteleMele } from './components/EvenimenteleMele';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';
import { DataMaintenancePage } from './components/BackupManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ProgramareActivitati } from './components/Activitati';
import { ClubSettings } from './components/ClubSettings';
import { AdminHeader } from './components/AdminHeader';
import { DataInspector } from './components/DataInspector';
import { ProfilSportiv } from './components/Financiar';
import { ReduceriManagement } from './components/Reduceri';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useError();

  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [examene, setExamene] = useState<Examen[]>([]);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [participari, setParticipari] = useState<Participare[]>([]);
  const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
  const [grupe, setGrupe] = useState<Grupa[]>([]);
  const [familii, setFamilii] = useState<Familie[]>([]);
  const [plati, setPlati] = useState<Plata[]>([]);
  const [tranzactii, setTranzactii] = useState<Tranzactie[]>([]);
  const [evenimente, setEvenimente] = useState<Eveniment[]>([]);
  const [rezultate, setRezultate] = useState<Rezultat[]>([]);
  const [preturiConfig, setPreturiConfig] = useState<PretConfig[]>([]);
  const [tipuriAbonament, setTipuriAbonament] = useState<TipAbonament[]>([]);
  const [allRoles, setAllRoles] = useState<Rol[]>([]);
  const [anunturi, setAnunturi] = useState<AnuntPrezenta[]>([]);
  const [reduceri, setReduceri] = useState<Reducere[]>([]);
  
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('phi-hau-sidebar-expanded', true);
  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'sportivi');
  const [selectedPlatiForIncasare, setSelectedPlatiForIncasare] = useState<Plata[]>([]);
  const [viewedSportiv, setViewedSportiv] = useState<Sportiv | null>(null);


  const fetchData = useCallback(async (user: User) => {
    if (!supabase) return;
    setLoading(true);
    
    try {
        const [
            { data: eData }, { data: gData }, { data: grData }, { data: evData },
            { data: cfData }, { data: abData }, { data: roData }, { data: progData },
            { data: reduceriData },
            { data: sData }, { data: paData }, { data: fData }, { data: plData },
            { data: tData }, { data: rData }, { data: antrenamenteData }, { data: anunturiData }
        ] = await Promise.all([
            // Public/Shared data
            supabase.from('examene').select('*'),
            supabase.from('grade').select('*'),
            supabase.from('grupe').select('*'),
            supabase.from('evenimente').select('*'),
            supabase.from('preturi_config').select('*'),
            supabase.from('tipuri_abonament').select('*'),
            supabase.from('roluri').select('*'),
            supabase.from('program_antrenamente').select('*').is('data', null),
            supabase.from('reduceri').select('*'),

            // RLS-protected data
            supabase.from('sportivi').select('*, roluri(id, nume)'),
            supabase.from('participari').select('*'),
            supabase.from('familii').select('*'),
            supabase.from('plati').select('*'),
            supabase.from('tranzactii').select('*'),
            supabase.from('rezultate').select('*'),
            supabase.from('program_antrenamente').select('*, prezenta_antrenament!antrenament_id(sportiv_id)').not('data', 'is', null),
            supabase.from('anunturi_prezenta').select('*')
        ]);

        // Process data
        const orarAntrenamente = progData || [];
        const formattedGrupe = (grData || []).map(g => ({ ...g, program: orarAntrenamente.filter(p => p.grupa_id === g.id) }));
        const formattedSportivi = (sData || []).map((s: any) => ({ ...s, roluri: s.roluri || [] }));
        
        const gradeDataForTransform = gData || [];
        const transformedCfData = (cfData || []).map((p: any): PretConfig | null => {
            if (p.grad_id && p.hasOwnProperty('pret')) { // Heuristic to detect grade-price schema
                if (p.is_activ === false) return null; // Ignore inactive prices
                const grad = gradeDataForTransform.find(g => g.id === p.grad_id);
                return {
                    id: p.id,
                    categorie: 'Taxa Examen',
                    denumire_serviciu: grad ? grad.nume : `Grad ID ${p.grad_id}`,
                    suma: p.pret,
                    valabil_de_la_data: p.data_activare,
                };
            }
            return p as PretConfig; // Assume old schema otherwise
        }).filter(Boolean) as PretConfig[];

        const isAdmin = user.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
        const formattedAntrenamente = (antrenamenteData || []).map((a: any) => {
            const allPresentIds = a.prezenta_antrenament 
                ? a.prezenta_antrenament.map((p: any) => p.sportiv_id) 
                : [];

            return {
                ...a,
                sportivi_prezenti_ids: isAdmin ? allPresentIds : (allPresentIds.includes(user.id) ? [user.id] : [])
            };
        });


        // Set state for all data
        setExamene(eData || []);
        setGrade(gData || []);
        setGrupe(formattedGrupe);
        setEvenimente(evData || []);
        setPreturiConfig(transformedCfData);
        setTipuriAbonament(abData || []);
        setAllRoles(roData || []);
        setReduceri(reduceriData || []);
        setSportivi(formattedSportivi);
        setParticipari(paData || []);
        setFamilii(fData || []);
        setPlati(plData || []);
        setTranzactii(tData || []);
        setRezultate(rData || []);
        setAntrenamente(formattedAntrenamente);
        setAnunturi(anunturiData || []);
        
    } catch (err) {
        showError("Eroare la încărcarea datelor", err);
    } finally {
        setLoading(false);
    }
  }, [showError]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('sportivi').select('*, roluri(id, nume)').eq('user_id', userId).maybeSingle();

    if (error) {
      showError("Eroare la preluarea profilului", error);
      return;
    }

    if (!data) {
      showError("Profil Inexistent", "Profilul de sportiv asociat acestui cont nu a fost găsit. Veți fi deconectat. Vă rugăm contactați administratorul.");
      await supabase?.auth.signOut();
      return;
    }

    const user = data as any;
    user.roluri = user.roluri || [];
    setCurrentUser(user);
    fetchData(user); // Pass user object to fetch data according to roles
  }, [fetchData, showError]);
  
  useEffect(() => {
    if (activeView !== 'sportivi') {
      setViewedSportiv(null);
    }
  }, [activeView]);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else { setCurrentUser(null); setLoading(false); }
    }) || { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, [fetchUserProfile]);
  
    useEffect(() => {
        if (!('Notification' in window)) {
            console.log("Acest browser nu suportă notificări.");
            return;
        }
        if (!supabase || !currentUser) return;

        /*
        // The 'notificari' table is not found in the schema, this feature is temporarily disabled to prevent a crash.
        const channel = supabase.channel('notificari_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificari' },
                (payload) => {
                    const newAnunt = payload.new as AnuntGeneral;
                    if (newAnunt.sent_by === currentUser.id) {
                        return;
                    }
                    const allowNotifications = currentUser.notificari_anunturi ?? true;
                    if (Notification.permission === "granted" && allowNotifications) {
                        new Notification(newAnunt.title, {
                            body: newAnunt.body,
                            icon: '/vite.svg'
                        });
                    }
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        */
    }, [currentUser]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && currentUser && !loading) {
        fetchData(currentUser);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, session, currentUser, loading]);

  const handleLogout = async () => { await supabase?.auth.signOut(); setActiveView('dashboard'); };

  const renderContent = () => {
    if (!currentUser) return null;
    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
    const isMyPortalView = activeView === 'my-portal';

    if (!isAdmin || isMyPortalView) {
      const userToView = isMyPortalView ? currentUser : currentUser;
      
      const commonProps = {
        currentUser: currentUser,
        viewedUser: userToView,
        onSwitchView: () => {}, // Simplificat, comutarea se face prin meniu
        participari: participari,
        examene: examene,
        grade: grade,
        antrenamente: antrenamente,
        grupe: grupe,
        plati: plati,
        tranzactii: tranzactii,
        setPlati: setPlati,
        evenimente: evenimente,
        rezultate: rezultate,
        setRezultate: setRezultate,
        preturiConfig: preturiConfig,
        onNavigateToEditProfil: () => setActiveView('editare-profil-personal'),
        onNavigateToEvenimenteleMele: () => setActiveView('evenimentele-mele'),
        sportivi: sportivi,
        familii: familii,
        tipuriAbonament: tipuriAbonament,
        onNavigate: setActiveView,
        onNavigateToDashboard: () => setActiveView('dashboard'),
        anunturi: anunturi,
        setAnunturi: setAnunturi,
      };

      switch (activeView) {
        case 'evenimentele-mele': return <EvenimenteleMele viewedUser={currentUser} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} onBack={() => setActiveView(isAdmin ? 'my-portal' : 'dashboard')} />;
        case 'editare-profil-personal': return <EditareProfilPersonal user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView(isAdmin ? 'my-portal' : 'dashboard')} />;
        case 'profil-sportiv': return <ProfilSportiv currentUser={currentUser} plati={plati} tranzactii={tranzactii} grade={grade} grupe={grupe} participari={participari} examene={examene} onBack={() => setActiveView(isAdmin ? 'my-portal' : 'dashboard')} reduceri={reduceri} />;
        case 'my-portal':
        default: return <SportivDashboard {...commonProps} />;
      }
    }

    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={setActiveView} />;
      case 'sportivi': 
        return viewedSportiv ? (
            <UserProfile 
                sportiv={viewedSportiv}
                currentUser={currentUser}
                participari={participari}
                examene={examene}
                grade={grade}
                antrenamente={antrenamente}
                plati={plati}
                tranzactii={tranzactii}
                grupe={grupe}
                familii={familii}
                tipuriAbonament={tipuriAbonament}
                allRoles={allRoles}
                setSportivi={setSportivi}
                setPlati={setPlati}
                setTranzactii={setTranzactii}
                onBack={() => setViewedSportiv(null)}
                reduceri={reduceri}
            />
        ) : (
            <SportiviManagement onBack={() => setActiveView('dashboard')} sportivi={sportivi} setSportivi={setSportivi} grupe={grupe} setGrupe={setGrupe} tipuriAbonament={tipuriAbonament} familii={familii} setFamilii={setFamilii} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={currentUser} plati={plati} tranzactii={tranzactii} setTranzactii={setTranzactii} onViewSportiv={setViewedSportiv} />
        );
      case 'examene': return <ExameneManagement examene={examene} setExamene={setExamene} participari={participari} setParticipari={setParticipari} sportivi={sportivi} grade={grade} setPlati={setPlati} preturi={preturiConfig} onBack={() => setActiveView('dashboard')} />;
      case 'grade': return <GradeManagement grade={grade} setGrade={setGrade} onBack={() => setActiveView('dashboard')} />;
      case 'prezenta': return <PrezentaManagement sportivi={sportivi} setSportivi={setSportivi} antrenamente={antrenamente} setAntrenamente={setAntrenamente} grupe={grupe} onBack={() => setActiveView('dashboard')} setPlati={setPlati} tipuriAbonament={tipuriAbonament} anunturi={anunturi}/>;
      case 'grupe': return <GrupeManagement grupe={grupe} setGrupe={setGrupe} onBack={() => setActiveView('dashboard')} />;
      case 'raport-prezenta': return <RaportPrezenta antrenamente={antrenamente} sportivi={sportivi} grupe={grupe} onBack={() => setActiveView('dashboard')} />;
      case 'stagii': return <StagiiCompetitiiManagement type="Stagiu" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={participari} examene={evenimente as any} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'competitii': return <StagiiCompetitiiManagement type="Competitie" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={participari} examene={evenimente as any} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'plati-scadente': return <PlatiScadente plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} tranzactii={tranzactii} reduceri={reduceri} onIncaseazaMultiple={(plist) => { setSelectedPlatiForIncasare(plist); setActiveView('jurnal-incasari'); }} onBack={() => setActiveView('dashboard')} />;
      case 'jurnal-incasari': return <JurnalIncasari plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} tranzactii={tranzactii} setTranzactii={setTranzactii} reduceri={reduceri} platiInitiale={selectedPlatiForIncasare} onIncasareProcesata={() => { setSelectedPlatiForIncasare([]); fetchData(currentUser); }} onBack={() => setActiveView('plati-scadente')} />;
      case 'configurare-preturi': return <ConfigurarePreturi preturi={preturiConfig} setPreturi={setPreturiConfig} sportivi={sportivi} onBack={() => setActiveView('dashboard')} grade={grade} />;
      case 'tipuri-abonament': return <TipuriAbonamentManagement tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} onBack={() => setActiveView('dashboard')} />;
      case 'reduceri': return <ReduceriManagement reduceri={reduceri} setReduceri={setReduceri} onBack={() => setActiveView('dashboard')} />;
      case 'raport-financiar': return <RaportFinanciar plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} onBack={() => setActiveView('dashboard')} />;
      case 'familii': return <FamiliiManagement familii={familii} setFamilii={setFamilii} sportivi={sportivi} onBack={() => setActiveView('dashboard')} tipuriAbonament={tipuriAbonament} />;
      case 'user-management': return <UserManagement sportivi={sportivi} setSportivi={setSportivi} currentUser={currentUser} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} onBack={() => setActiveView('dashboard')} />;
      case 'editare-profil-personal': return <EditareProfilPersonal user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView('dashboard')} />;
      case 'data-maintenance': return <DataMaintenancePage 
          onBack={() => setActiveView('dashboard')} 
          onDataRestored={() => fetchData(currentUser)}
          sportivi={sportivi}
          setSportivi={setSportivi}
          grade={grade}
          preturiConfig={preturiConfig}
          participari={participari}
          examene={examene}
          plati={plati}
          setPlati={setPlati}
          familii={familii}
          onNavigate={setActiveView}
        />;
      case 'activitati': return <ProgramareActivitati grupe={grupe} antrenamente={antrenamente} setAntrenamente={setAntrenamente} onBack={() => setActiveView('dashboard')} />;
      case 'setari-club': return <ClubSettings onBack={() => setActiveView('dashboard')} />;
      case 'data-inspector': return <DataInspector antrenamente={antrenamente} onBack={() => setActiveView('dashboard')} />;
      default: return <Dashboard onNavigate={setActiveView} />;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;
  if (!session) return <Login />;

  const isAdmin = currentUser!.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
  const isMyPortalView = activeView === 'my-portal';
  
  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* FIX: Corrected typo from isMyportalView to isMyPortalView */}
      <Sidebar currentUser={currentUser!} onNavigate={setActiveView} onLogout={handleLogout} activeView={activeView} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isPortalView={!isAdmin || isMyPortalView} plati={plati} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
         {isAdmin && !isMyPortalView && (
            <AdminHeader currentUser={currentUser!} onNavigate={setActiveView} onLogout={handleLogout} plati={plati} />
          )}
        <main className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;