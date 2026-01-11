


import React, { useState, useEffect, useCallback } from 'react';
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
import { Session } from '@supabase/supabase-js';
import { EditareProfilPersonal } from './components/EditareProfilPersonal';
import { EvenimenteleMele } from './components/EvenimenteleMele';
import { Sidebar } from './components/Sidebar';
import { useError } from './components/ErrorProvider';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useError();

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

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedPlatiForIncasare, setSelectedPlatiForIncasare] = useState<Plata[]>([]);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    try {
      const [
        { data: sData }, { data: eData }, { data: gData }, { data: paData }, 
        { data: prData }, { data: grData }, { data: fData }, { data: plData },
        { data: tData }, { data: evData }, { data: rData }, { data: cfData },
        { data: abData }, { data: roData }, { data: progData }
      ] = await Promise.all([
        supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))'),
        supabase.from('examene').select('*'),
        supabase.from('grade').select('*'),
        supabase.from('participari').select('*'),
        supabase.from('prezente').select('*, prezente_sportivi(sportiv_id)'),
        supabase.from('grupe').select('*'),
        supabase.from('familii').select('*'),
        supabase.from('plati').select('*'),
        supabase.from('tranzactii').select('*'),
        supabase.from('evenimente').select('*'),
        supabase.from('rezultate').select('*'),
        supabase.from('preturi_config').select('*'),
        supabase.from('tipuri_abonament').select('*'),
        supabase.from('roluri').select('*'),
        supabase.from('program_antrenamente').select('*')
      ]);

      const formattedSportivi = (sData || []).map((s: any) => ({
        ...s,
        roluri: s.sportivi_roluri ? s.sportivi_roluri.map((sr: any) => sr.roluri) : []
      }));
      
      const formattedPrezente = (prData || []).map((p: any) => ({
          ...p,
          sportivi_prezenti_ids: p.prezente_sportivi ? p.prezente_sportivi.map((ps: any) => ps.sportiv_id) : []
      }));

      const programAntrenamente = progData || [];
      const formattedGrupe = (grData || []).map(g => ({
          ...g,
          program: programAntrenamente.filter(p => p.grupa_id === g.id)
      }));


      setSportivi(formattedSportivi);
      setExamene(eData || []);
      setGrade(gData || []);
      setParticipari(paData || []);
      setPrezente(formattedPrezente);
      setGrupe(formattedGrupe);
      setFamilii(fData || []);
      setPlati(plData || []);
      setTranzactii(tData || []);
      setEvenimente(evData || []);
      setRezultate(rData || []);
      setPreturiConfig(cfData || []);
      setTipuriAbonament(abData || []);
      setAllRoles(roData || []);
    } catch (err) {
      showError("Eroare la încărcarea datelor", err);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))').eq('user_id', userId).maybeSingle();

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
    user.roluri = user.sportivi_roluri.map((item: any) => item.roluri);
    setCurrentUser(user);
    fetchData();
  }, [fetchData, showError]);

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

  const handleLogout = async () => { await supabase?.auth.signOut(); setActiveView('dashboard'); };

  const renderContent = () => {
    if (!currentUser) return null;
    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');

    if (!isAdmin) {
      switch (activeView) {
        case 'evenimentele-mele': return <EvenimenteleMele viewedUser={currentUser} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} onBack={() => setActiveView('dashboard')} />;
        case 'editare-profil-personal': return <EditareProfilPersonal user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView('dashboard')} />;
        default: return <PortalSportiv currentUser={currentUser} viewedUser={currentUser} onSwitchView={() => {}} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} preturiConfig={preturiConfig} onNavigateToEditProfil={() => setActiveView('editare-profil-personal')} onNavigateToEvenimenteleMele={() => setActiveView('evenimentele-mele')} sportivi={sportivi} familii={familii} onNavigateToDashboard={() => setActiveView('dashboard')} />;
      }
    }

    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={setActiveView} />;
      case 'sportivi': return <SportiviManagement sportivi={sportivi} setSportivi={setSportivi} grupe={grupe} setGrupe={setGrupe} tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} familii={familii} setFamilii={setFamilii} customFields={customFields} setCustomFields={setCustomFields} allRoles={allRoles} onBack={() => setActiveView('dashboard')} />;
      case 'examene': return <ExameneManagement examene={examene} setExamene={setExamene} participari={participari} setParticipari={setParticipari} sportivi={sportivi} grade={grade} setPlati={setPlati} preturi={preturiConfig} onBack={() => setActiveView('dashboard')} />;
      case 'grade': return <GradeManagement grade={grade} setGrade={setGrade} onBack={() => setActiveView('dashboard')} />;
      case 'prezenta': return <PrezentaManagement sportivi={sportivi} prezente={prezente} setPrezente={setPrezente} grupe={grupe} onBack={() => setActiveView('dashboard')} />;
      case 'grupe': return <GrupeManagement grupe={grupe} setGrupe={setGrupe} onBack={() => setActiveView('dashboard')} />;
      case 'raport-prezenta': return <RaportPrezenta prezente={prezente} sportivi={sportivi} grupe={grupe} onBack={() => setActiveView('dashboard')} />;
      case 'stagii': return <StagiiCompetitiiManagement type="Stagiu" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={participari} examene={evenimente as any} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'competitii': return <StagiiCompetitiiManagement type="Competitie" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} participari={participari} examene={evenimente as any} grade={grade} onBack={() => setActiveView('dashboard')} />;
      case 'plati-scadente': return <PlatiScadente plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} onIncaseazaMultiple={(plist) => { setSelectedPlatiForIncasare(plist); setActiveView('jurnal-incasari'); }} onBack={() => setActiveView('dashboard')} />;
      case 'jurnal-incasari': return <JurnalIncasari plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} tranzactii={tranzactii} setTranzactii={setTranzactii} platiInitiale={selectedPlatiForIncasare} onIncasareProcesata={() => { setSelectedPlatiForIncasare([]); fetchData(); }} onBack={() => setActiveView('plati-scadente')} />;
      case 'configurare-preturi': return <ConfigurarePreturi preturi={preturiConfig} setPreturi={setPreturiConfig} sportivi={sportivi} onBack={() => setActiveView('dashboard')} />;
      case 'tipuri-abonament': return <TipuriAbonamentManagement tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} onBack={() => setActiveView('dashboard')} />;
      case 'raport-financiar': return <RaportFinanciar plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} onBack={() => setActiveView('dashboard')} />;
      case 'familii': return <FamiliiManagement familii={familii} setFamilii={setFamilii} onBack={() => setActiveView('dashboard')} />;
      case 'user-management': return <UserManagement sportivi={sportivi} setSportivi={setSportivi} currentUser={currentUser} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} onBack={() => setActiveView('dashboard')} />;
      default: return <Dashboard onNavigate={setActiveView} />;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex bg-slate-900">
      <Sidebar currentUser={currentUser!} onNavigate={setActiveView} onLogout={handleLogout} activeView={activeView} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isPortalView={!currentUser?.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor')} onViewOwnPortal={() => {}} />
      <main className={`flex-1 transition-all duration-300 p-8 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;