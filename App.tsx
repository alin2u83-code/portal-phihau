import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, SesiuneExamen, Grad, InscriereExamen, View, Antrenament, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol, AnuntPrezenta, Reducere, AnuntGeneral, TipPlata, Locatie, Club } from './types';
import { Dashboard } from './components/Dashboard';
import { SportiviManagement } from './components/SportiviManagement';
import { UserProfile } from './components/UserProfile';
import { GestiuneExamene } from './components/Examene';
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
import { Notificari } from './components/Notificari';
import { TaxeAnuale } from './components/TaxeAnuale';
import { GestionareNomenclatoare } from './components/GestionareNomenclatoare';
import { FinancialDashboard } from './components/FinancialDashboard';
import { IstoricExameneSportiv } from './components/IstoricExameneSportiv';
import { FacturiPersonale } from './components/FacturiPersonale';
import { CalendarView } from './components/CalendarView';
import { RapoarteExamen } from './components/RapoarteExamen';
import { SportivFormModal } from './components/Sportivi';
import { PlusIcon } from './components/icons';
import { CluburiManagement } from './components/CluburiManagement';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useError();

  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [sesiuniExamene, setSesiuniExamene] = useState<SesiuneExamen[]>([]);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [inscrieriExamene, setInscrieriExamene] = useState<InscriereExamen[]>([]);
  const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
  const [grupe, setGrupe] = useState<Grupa[]>([]);
  const [cluburi, setCluburi] = useState<Club[]>([]);
  const [familii, setFamilii] = useState<Familie[]>([]);
  const [plati, setPlati] = useState<Plata[]>([]);
  const [tranzactii, setTranzactii] = useState<Tranzactie[]>([]);
  const [evenimente, setEvenimente] = useState<Eveniment[]>([]);
  const [rezultate, setRezultate] = useState<Rezultat[]>([]);
  const [preturiConfig, setPreturiConfig] = useState<PretConfig[]>([]);
  const [tipuriAbonament, setTipuriAbonament] = useState<TipAbonament[]>([]);
  const [tipuriPlati, setTipuriPlati] = useState<TipPlata[]>([]);
  const [locatii, setLocatii] = useState<Locatie[]>([]);
  const [allRoles, setAllRoles] = useState<Rol[]>([]);
  const [anunturi, setAnunturi] = useState<AnuntPrezenta[]>([]);
  const [reduceri, setReduceri] = useState<Reducere[]>([]);
  const [rawGradePrices, setRawGradePrices] = useState<any[]>([]); // For debugging
  
  const [activeView, setActiveView] = useLocalStorage<View>('phi-hau-active-view', 'dashboard');
  const [selectedPlatiForIncasare, setSelectedPlatiForIncasare] = useState<Plata[]>([]);
  const [viewedSportiv, setViewedSportiv] = useState<Sportiv | null>(null);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [isGlobalSportivFormOpen, setIsGlobalSportivFormOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage<boolean>('phi-hau-sidebar-expanded', true);


  const fetchData = useCallback(async (user: User) => {
    if (!supabase) return;
    setLoading(true);
    
    try {
        const [
            { data: sesiuniData }, { data: gData }, { data: grData }, { data: evData },
            { data: cfData }, { data: gradePricesData }, { data: abData }, { data: roData }, { data: progData },
            { data: reduceriData }, { data: tipuriPlatiData }, { data: locatiiData }, { data: cluburiData },
            { data: sData }, { data: inscrieriData }, { data: fData }, { data: plData },
            { data: tData }, { data: rData }, { data: antrenamenteData }, { data: anunturiData }
        ] = await Promise.all([
            // Public/Shared data
            supabase.from('sesiuni_examene').select('*'),
            supabase.from('grade').select('*'),
            supabase.from('grupe').select('*'),
            supabase.from('evenimente').select('*'),
            supabase.from('preturi_config').select('*'),
            supabase.from('grade_preturi_config').select('*'), // Fetch specific grade prices
            supabase.from('tipuri_abonament').select('*'),
            supabase.from('roluri').select('*'),
            supabase.from('program_antrenamente').select('*').is('data', null),
            supabase.from('reduceri').select('*'),
            supabase.from('tipuri_plati').select('*'),
            supabase.from('nom_locatii').select('*'),
            supabase.from('cluburi').select('*'),

            // RLS-protected data
            supabase.from('sportivi').select('*, roluri(id, nume)'),
            supabase.from('inscrieri_examene').select('*, sportivi:sportiv_id(*), grade:grad_vizat_id(*)').order('ordine', { foreignTable: 'grade', ascending: false }),
            supabase.from('familii').select('*'),
            supabase.from('plati').select('*'),
            supabase.from('tranzactii').select('*'),
            supabase.from('rezultate').select('*'),
            supabase.from('program_antrenamente').select('*, prezenta_antrenament!antrenament_id(sportiv_id)').not('data', 'is', null),
            supabase.from('anunturi_prezenta').select('*'),
        ]);
        
        const rawPrices = gradePricesData || [];
        setRawGradePrices(rawPrices); 
        const gradesData = gData || [];
        
        setShowPriceWarning(rawPrices.length === 0 && gradesData.length > 0);

        // Transform grade prices into the generic PretConfig format
        const transformedGradePrices = (gradePricesData || [])
            .filter((p: any) => p.is_activ !== false)
            .map((p: any): PretConfig | null => {
                const grad = gradesData.find(g => g.id === p.grad_id);
                if (!grad) return null;
                return {
                    id: p.id,
                    categorie: 'Taxa Examen',
                    denumire_serviciu: grad.nume,
                    suma: p.suma,
                    valabil_de_la_data: p.data_activare,
                };
            }).filter(Boolean) as PretConfig[];
        
        const otherPrices = cfData ? cfData as PretConfig[] : [];
        const allPrices = [...otherPrices, ...transformedGradePrices];
        
        // Process other data
        const orarAntrenamente = progData || [];
        const formattedGrupe = (grData || []).map(g => ({ ...g, program: orarAntrenamente.filter(p => p.grupa_id === g.id) }));
        const formattedSportivi = (sData || []).map((s: any) => ({ ...s, roluri: s.roluri || [] }));
        
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
        setSesiuniExamene(sesiuniData || []);
        setGrade(gradesData);
        setGrupe(formattedGrupe);
        setCluburi(cluburiData || []);
        setEvenimente(evData || []);
        setPreturiConfig(allPrices);
        setTipuriAbonament(abData || []);
        setTipuriPlati(tipuriPlatiData || []);
        setLocatii(locatiiData || []);
        setAllRoles(roData || []);
        setReduceri(reduceriData || []);
        setSportivi(formattedSportivi);
        setInscrieriExamene((inscrieriData || []) as InscriereExamen[]);
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
  
  const handleGlobalSaveSportiv = async (formData: Partial<Sportiv>) => {
        try {
            const dataToSave = { ...formData };
            if (!dataToSave.familie_id) {
                const individualSubscription = tipuriAbonament.find(ab => ab.numar_membri === 1);
                if (individualSubscription) {
                    dataToSave.tip_abonament_id = individualSubscription.id;
                }
            }
            if (currentUser?.roluri.some(r => r.nume === 'Admin Club') && !dataToSave.club_id) {
                dataToSave.club_id = currentUser.club_id;
            }

            const { data, error } = await supabase.from('sportivi').insert(dataToSave).select().single();
            if (error) throw error;

            let newSportiv = { ...data, roluri: [] } as Sportiv;
            const sportivRole = allRoles.find(r => r.nume === 'Sportiv');
            if (sportivRole) {
                const { error: roleError } = await supabase.from('sportivi_roluri').insert({ sportiv_id: data.id, rol_id: sportivRole.id });
                if (roleError) {
                    showError("Utilizator creat, dar eroare la asignarea rolului", roleError);
                } else {
                    newSportiv.roluri = [sportivRole];
                }
            }
            setSportivi(prev => [...prev, newSportiv]);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err };
        }
    };


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

        const channel = supabase.channel('notificari_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificari' },
                (payload) => {
                    const newAnunt = payload.new as AnuntGeneral;
                    // Nu afișa notificarea pentru utilizatorul care a trimis-o
                    if (newAnunt.sent_by === currentUser.user_id) {
                        return;
                    }
                    
                    if (Notification.permission === "granted") {
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
    const isAdmin = currentUser.roluri.some(r => ['Admin', 'Super Admin', 'Instructor', 'Admin Club'].includes(r.nume));
    const isMyPortalView = activeView === 'my-portal';

    if (!isAdmin || isMyPortalView) {
      const userToView = isMyPortalView ? currentUser : currentUser;
      
      const commonProps = {
        currentUser: currentUser,
        viewedUser: userToView,
        onSwitchView: () => {}, // Simplificat, comutarea se face prin meniu
        participari: inscrieriExamene,
        examene: sesiuniExamene,
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

      const portalBackNav = () => setActiveView(isAdmin ? 'my-portal' : 'dashboard');

      switch (activeView) {
        case 'evenimentele-mele': return <EvenimenteleMele viewedUser={currentUser} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} onBack={portalBackNav} />;
        case 'editare-profil-personal': return <EditareProfilPersonal user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={portalBackNav} />;
        case 'profil-sportiv': return <ProfilSportiv currentUser={currentUser} plati={plati} tranzactii={tranzactii} grade={grade} grupe={grupe} participari={inscrieriExamene} examene={sesiuniExamene} onBack={portalBackNav} onNavigate={setActiveView} />;
        case 'istoric-examene': return <IstoricExameneSportiv viewedUser={currentUser} participari={inscrieriExamene.filter(p=>p.sportiv_id === currentUser.id)} sesiuni={sesiuniExamene} grade={grade} onBack={portalBackNav} />;
        case 'facturi-personale': return <FacturiPersonale viewedUser={currentUser} plati={plati} tranzactii={tranzactii} onBack={portalBackNav} />;
        case 'my-portal':
        default: return <SportivDashboard {...commonProps} />;
      }
    }

    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={setActiveView} showPriceWarning={showPriceWarning} />;
      case 'financial-dashboard': return <FinancialDashboard plati={plati} tranzactii={tranzactii} sportivi={sportivi} onBack={() => setActiveView('dashboard')} />;
      case 'sportivi': 
        return viewedSportiv ? (
            <UserProfile 
                sportiv={viewedSportiv}
                currentUser={currentUser}
                participari={inscrieriExamene}
                examene={sesiuniExamene}
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
            <SportiviManagement onBack={() => setActiveView('dashboard')} sportivi={sportivi} setSportivi={setSportivi} grupe={grupe} setGrupe={setGrupe} tipuriAbonament={tipuriAbonament} familii={familii} setFamilii={setFamilii} allRoles={allRoles} setAllRoles={setAllRoles} currentUser={currentUser} plati={plati} tranzactii={tranzactii} setTranzactii={setTranzactii} onViewSportiv={setViewedSportiv} clubs={cluburi} />
        );
      case 'cluburi': return <CluburiManagement clubs={cluburi} setClubs={setCluburi} onBack={() => setActiveView('dashboard')} />;
      case 'examene': return <GestiuneExamene sesiuni={sesiuniExamene} setSesiuni={setSesiuniExamene} inscrieri={inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={sportivi} setSportivi={setSportivi} grade={grade} locatii={locatii} setLocatii={setLocatii} plati={plati} setPlati={setPlati} preturiConfig={preturiConfig} onBack={() => setActiveView('dashboard')} />;
      case 'rapoarte-examen': return <RapoarteExamen sesiuni={sesiuniExamene} inscrieri={inscrieriExamene} setInscrieri={setInscrieriExamene} sportivi={sportivi} grade={grade} locatii={locatii} plati={plati} onBack={() => setActiveView('dashboard')} />;
      case 'grade': return <GradeManagement grade={grade} setGrade={setGrade} onBack={() => setActiveView('dashboard')} />;
      case 'prezenta': return <PrezentaManagement sportivi={sportivi} setSportivi={setSportivi} antrenamente={antrenamente} setAntrenamente={setAntrenamente} grupe={grupe} onBack={() => setActiveView('dashboard')} setPlati={setPlati} tipuriAbonament={tipuriAbonament} anunturi={anunturi}/>;
      case 'grupe': return <GrupeManagement grupe={grupe} setGrupe={setGrupe} onBack={() => setActiveView('dashboard')} />;
      case 'raport-prezenta': return <RaportPrezenta antrenamente={antrenamente} sportivi={sportivi} grupe={grupe} onBack={() => setActiveView('dashboard')} />;
      case 'stagii': return <StagiiCompetitiiManagement type="Stagiu" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'competitii': return <StagiiCompetitiiManagement type="Competitie" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={inscrieriExamene} examene={sesiuniExamene} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'plati-scadente': return <PlatiScadente plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} tranzactii={tranzactii} reduceri={reduceri} onIncaseazaMultiple={(plist) => { setSelectedPlatiForIncasare(plist); setActiveView('jurnal-incasari'); }} onBack={() => setActiveView('dashboard')} />;
      case 'jurnal-incasari': return <JurnalIncasari currentUser={currentUser} plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} tranzactii={tranzactii} setTranzactii={setTranzactii} reduceri={reduceri} platiInitiale={selectedPlatiForIncasare} onIncasareProcesata={() => { setSelectedPlatiForIncasare([]); fetchData(currentUser); }} onBack={() => setActiveView('plati-scadente')} />;
      case 'configurare-preturi': return <ConfigurarePreturi grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'taxe-anuale': return <TaxeAnuale onBack={() => setActiveView('dashboard')} currentUser={currentUser} sportivi={sportivi} plati={plati} setPlati={setPlati} />;
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
          participari={inscrieriExamene}
          examene={sesiuniExamene}
          plati={plati}
          setPlati={setPlati}
          familii={familii}
          onNavigate={setActiveView}
        />;
      case 'nomenclatoare': return <GestionareNomenclatoare onBack={() => setActiveView('dashboard')} tipuriPlati={tipuriPlati} setTipuriPlati={setTipuriPlati} plati={plati} />;
      case 'activitati': return <ProgramareActivitati grupe={grupe} antrenamente={antrenamente} setAntrenamente={setAntrenamente} onBack={() => setActiveView('dashboard')} />;
      case 'calendar': return <CalendarView antrenamente={antrenamente} sesiuniExamene={sesiuniExamene} grupe={grupe} locatii={locatii} onBack={() => setActiveView('dashboard')} />;
      case 'setari-club': return <ClubSettings onBack={() => setActiveView('dashboard')} />;
      case 'data-inspector': return <DataInspector antrenamente={antrenamente} preturiConfig={preturiConfig} rawGradePrices={rawGradePrices} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'notificari': return <Notificari onBack={() => setActiveView('dashboard')} currentUser={currentUser} />;
      default: return <Dashboard onNavigate={setActiveView} showPriceWarning={showPriceWarning} />;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;
  if (!session) return <Login />;

  const isAdmin = currentUser!.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor' || r.nume === 'Super Admin' || r.nume === 'Admin Club');
  const isMyPortalView = activeView === 'my-portal';
  
  return (
    <div className="min-h-screen flex bg-slate-900">
      <Sidebar 
        currentUser={currentUser!} 
        onNavigate={setActiveView} 
        onLogout={handleLogout} 
        activeView={activeView} 
        isPortalView={!isAdmin || isMyPortalView} 
        plati={plati}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
         {isAdmin && !isMyPortalView && (
            <AdminHeader currentUser={currentUser!} onNavigate={setActiveView} onLogout={handleLogout} plati={plati} />
          )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

       {isAdmin && (
            <>
                <button
                    onClick={() => setIsGlobalSportivFormOpen(true)}
                    className="fixed bottom-6 right-6 bg-brand-secondary hover:bg-sky-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-40 animate-fade-in-down"
                    aria-label="Adaugă Sportiv Nou"
                    title="Adaugă Sportiv Nou"
                >
                    <PlusIcon className="w-8 h-8" />
                </button>
                <SportivFormModal
                    isOpen={isGlobalSportivFormOpen}
                    onClose={() => setIsGlobalSportivFormOpen(false)}
                    onSave={handleGlobalSaveSportiv}
                    sportivToEdit={null}
                    grupe={grupe}
                    setGrupe={setGrupe}
                    familii={familii}
                    setFamilii={setFamilii}
                    tipuriAbonament={tipuriAbonament}
                    clubs={cluburi}
                    currentUser={currentUser}
                />
            </>
        )}
    </div>
  );
}

export default App;