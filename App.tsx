import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Sportiv, Examen, Grad, Participare, View, Grupa, Plata, Eveniment, Rezultat, PretConfig, TipAbonament, Familie, User, Tranzactie, Rol } from './types';
import { Dashboard } from './components/Dashboard';
import { SportiviManagement } from './components/Sportivi';
import { GradeManagement } from './components/Grade';
import { ActivitatiManagement } from './components/Activitati';
import { GrupeManagement } from './components/Grupe';
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
import { useError } from './components/ErrorProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Layout } from './components/Layout';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError } = useError();

  const [sportivi, setSportivi] = useState<Sportiv[]>([]);
  const [examene, setExamene] = useState<Examen[]>([]);
  const [grade, setGrade] = useState<Grad[]>([]);
  const [participari, setParticipari] = useState<Participare[]>([]);
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

  const [isSidebarExpanded, setIsSidebarExpanded] = useLocalStorage('sidebarExpanded', true);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedPlatiForIncasare, setSelectedPlatiForIncasare] = useState<Plata[]>([]);

  const fetchSportivData = useCallback(async (user: User) => {
     if (!supabase) return;
     try {
       const familyId = user.familie_id;
       const userIds = familyId 
         ? (await supabase.from('sportivi').select('id').eq('familie_id', familyId)).data?.map(s => s.id) || [user.id]
         : [user.id];

       const [
         { data: sData }, { data: eData }, { data: gData }, { data: paData }, 
         { data: grData }, { data: fData }, { data: plData },
         { data: evData }, { data: rData }, { data: cfData },
         { data: abData }, { data: roData }, { data: progAntrenamenteData}
       ] = await Promise.all([
         supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))').in('id', userIds),
         supabase.from('examene').select('*'),
         supabase.from('grade').select('*'),
         supabase.from('participari').select('*').in('sportiv_id', userIds),
         supabase.from('grupe').select('*'),
         supabase.from('familii').select('*').eq('id', familyId),
         supabase.from('plati').select('*').or(`sportiv_id.in.(${userIds.join(',')}),familie_id.eq.${familyId}`),
         supabase.from('evenimente').select('*'),
         supabase.from('rezultate').select('*').in('sportiv_id', userIds),
         supabase.from('preturi_config').select('*'),
         supabase.from('tipuri_abonament').select('*'),
         supabase.from('roluri').select('id, nume'),
         supabase.from('program_antrenamente').select('*')
       ]);
       
        const formattedSportivi = (sData || []).map((s: any) => ({ ...s, roluri: s.sportivi_roluri ? s.sportivi_roluri.map((sr: any) => sr.roluri) : [] }));
        const formattedGrupe = (grData || []).map(g => ({ ...g, program: (progAntrenamenteData || []).filter(p => p.grupa_id === g.id) }));

        setSportivi(formattedSportivi);
        setExamene(eData || []);
        setGrade(gData || []);
        setParticipari(paData || []);
        setGrupe(formattedGrupe);
        setFamilii(fData || []);
        setPlati(plData || []);
        setEvenimente(evData || []);
        setRezultate(rData || []);
        setPreturiConfig(cfData || []);
        setTipuriAbonament(abData || []);
        setAllRoles(roData || []);
     } catch(err) {
        showError("Eroare la încărcarea datelor", err);
     } finally {
        setLoading(false);
     }
  }, [showError]);
  
  const fetchAdminData = useCallback(async () => {
    if (!supabase) return;
    try {
      const [
        { data: sData }, { data: eData }, { data: gData }, { data: paData }, 
        { data: grData }, { data: fData }, { data: plData },
        { data: tData }, { data: evData }, { data: rData }, { data: cfData },
        { data: abData }, { data: roData }, { data: progData }
      ] = await Promise.all([
        supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))'),
        supabase.from('examene').select('*'),
        supabase.from('grade').select('*'),
        supabase.from('participari').select('*'),
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

      const formattedSportivi = (sData || []).map((s: any) => ({ ...s, roluri: s.sportivi_roluri ? s.sportivi_roluri.map((sr: any) => sr.roluri) : [] }));
      const programAntrenamente = progData || [];
      const formattedGrupe = (grData || []).map(g => ({ ...g, program: programAntrenamente.filter(p => p.grupa_id === g.id) }));

      setSportivi(formattedSportivi);
      setExamene(eData || []);
      setGrade(gData || []);
      setParticipari(paData || []);
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
    setLoading(true);
    const { data, error } = await supabase.from('sportivi').select('*, sportivi_roluri(roluri(id, nume))').eq('user_id', userId).maybeSingle();

    if (error) { showError("Eroare la preluarea profilului", error); setLoading(false); return; }

    if (!data) {
      showError("Profil Inexistent", "Profilul asociat acestui cont nu a fost găsit. Contactați administratorul.");
      await supabase?.auth.signOut();
      setLoading(false);
      return;
    }

    const user = data as any;
    user.roluri = user.sportivi_roluri.map((item: any) => item.roluri);
    setCurrentUser(user);

    const isAdmin = user.roluri.some((r: Rol) => r.nume === 'Admin' || r.nume === 'Instructor');
    if (isAdmin) await fetchAdminData(); else await fetchSportivData(user);
  }, [fetchAdminData, fetchSportivData, showError]);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id); else setLoading(false);
    });

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id); else { setCurrentUser(null); setLoading(false); }
    }) || { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, [fetchUserProfile]);

  const handleLogout = async () => { await supabase?.auth.signOut(); setActiveView('dashboard'); };

  const renderContent = () => {
    if (!currentUser) return null;
    const isAdmin = currentUser.roluri.some(r => r.nume === 'Admin' || r.nume === 'Instructor');
    const activitatiProps = {
        sportivi, setSportivi,
        examene, setExamene,
        grade, setGrade,
        participari, setParticipari,
        grupe, setGrupe,
        plati, setPlati,
        evenimente, setEvenimente,
        rezultate, setRezultate,
        preturiConfig, setPreturiConfig,
        onBack: () => setActiveView('dashboard'),
    };

    if (!isAdmin) {
      switch (activeView) {
        case 'evenimentele-mele': return <EvenimenteleMele viewedUser={currentUser} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} onBack={() => setActiveView('dashboard')} />;
        case 'editare-profil-personal': return <EditareProfilPersonal user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView('dashboard')} />;
        default: return <PortalSportiv currentUser={currentUser} viewedUser={currentUser} onSwitchView={() => {}} participari={participari} examene={examene} grade={grade} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} preturiConfig={preturiConfig} onNavigateToEditProfil={() => setActiveView('editare-profil-personal')} onNavigateToEvenimenteleMele={() => setActiveView('evenimentele-mele')} sportivi={sportivi} familii={familii} onNavigateToDashboard={() => setActiveView('dashboard')} />;
      }
    }

    switch (activeView) {
      case 'dashboard': return <Dashboard onNavigate={setActiveView} currentUser={currentUser} />;
      case 'portal-personal': return <PortalSportiv currentUser={currentUser} viewedUser={currentUser} onSwitchView={() => {}} participari={participari} examene={examene} grade={grade} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} preturiConfig={preturiConfig} onNavigateToEditProfil={() => setActiveView('editare-profil-personal')} onNavigateToEvenimenteleMele={() => setActiveView('evenimentele-mele')} sportivi={sportivi} familii={familii} onNavigateToDashboard={() => setActiveView('dashboard')} />;
      case 'editare-profil-personal': return <EditareProfilPersonal user={currentUser} setSportivi={setSportivi} setCurrentUser={setCurrentUser} onBack={() => setActiveView('portal-personal')} />;
      case 'evenimentele-mele': return <EvenimenteleMele viewedUser={currentUser} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} onBack={() => setActiveView('portal-personal')} />;
      case 'sportivi': return <SportiviManagement sportivi={sportivi} setSportivi={setSportivi} grupe={grupe} setGrupe={setGrupe} tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} familii={familii} setFamilii={setFamilii} customFields={customFields} setCustomFields={setCustomFields} allRoles={allRoles} onBack={() => setActiveView('dashboard')} />;
      
      case 'prezenta': return <ActivitatiManagement {...activitatiProps} initialTab="antrenamente" />;
      case 'examene': return <ActivitatiManagement {...activitatiProps} initialTab="examene" />;
      case 'grade': return <GradeManagement grade={grade} setGrade={setGrade} onBack={() => setActiveView('dashboard')} preturiConfig={preturiConfig} setPreturiConfig={setPreturiConfig} />; // Keep separate for now
      case 'stagii': return <ActivitatiManagement {...activitatiProps} initialTab="evenimente" />;
      case 'competitii': return <ActivitatiManagement {...activitatiProps} initialTab="evenimente" />;
      
      case 'grupe': return <GrupeManagement grupe={grupe} setGrupe={setGrupe} onBack={() => setActiveView('dashboard')} />;
      case 'plati-scadente': return <PlatiScadente plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} onIncaseazaMultiple={(plist) => { setSelectedPlatiForIncasare(plist); setActiveView('jurnal-incasari'); }} onBack={() => setActiveView('dashboard')} />;
      case 'jurnal-incasari': return <JurnalIncasari plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} tranzactii={tranzactii} setTranzactii={setTranzactii} platiInitiale={selectedPlatiForIncasare} onIncasareProcesata={() => { setSelectedPlatiForIncasare([]); fetchAdminData(); }} onBack={() => setActiveView('plati-scadente')} />;
      case 'configurare-preturi': return <ConfigurarePreturi preturi={preturiConfig} setPreturi={setPreturiConfig} sportivi={sportivi} onBack={() => setActiveView('dashboard')} />;
      case 'tipuri-abonament': return <TipuriAbonamentManagement tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} onBack={() => setActiveView('dashboard')} />;
      case 'raport-financiar': return <RaportFinanciar plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} onBack={() => setActiveView('dashboard')} />;
      case 'familii': return <FamiliiManagement familii={familii} setFamilii={setFamilii} onBack={() => setActiveView('dashboard')} />;
      case 'user-management': return <UserManagement sportivi={sportivi} setSportivi={setSportivi} currentUser={currentUser} setCurrentUser={setCurrentUser} allRoles={allRoles} setAllRoles={setAllRoles} onBack={() => setActiveView('dashboard')} />;
      default: return <Dashboard onNavigate={setActiveView} currentUser={currentUser} />;
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">Se încarcă...</div>;
  if (!session) return <Login />;
  if (!currentUser) return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">Se încarcă profilul utilizatorului...</div>;

  return (
      <Layout 
        currentUser={currentUser} 
        onNavigate={setActiveView} 
        onLogout={handleLogout} 
        activeView={activeView}
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
      >
        {renderContent()}
      </Layout>
  );
}

export default App;