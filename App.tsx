
import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
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
import { Button } from './components/ui';
import { ArrowLeftIcon } from './components/icons';

const ADMIN_USER: User = { id: 'admin', rol: 'Admin', email: 'admin@phihau.ro', parola: 'admin' };

const initialGrupe: Grupa[] = [ { id: 'gr1', denumire: 'Tigri (Copii)', program: [{ziua: 'Marți', oraStart: '17:00', oraSfarsit: '18:00'}, {ziua: 'Joi', oraStart: '17:00', oraSfarsit: '18:00'}], sala: 'Sala principală' }, { id: 'gr2', denumire: 'Dragoni (Avansați)', program: [{ziua: 'Luni', oraStart: '18:00', oraSfarsit: '19:30'}, {ziua: 'Miercuri', oraStart: '18:00', oraSfarsit: '19:30'}], sala: 'Sala principală' }, { id: 'gr3', denumire: 'Maeștri (Adulți)', program: [{ziua: 'Luni', oraStart: '19:30', oraSfarsit: '21:00'}, {ziua: 'Miercuri', oraStart: '19:30', oraSfarsit: '21:00'}, {ziua: 'Vineri', oraStart: '19:30', oraSfarsit: '21:00'}], sala: 'Sala principală' }, ];
const initialFamilii: Familie[] = [ { id: 'fam1', nume: 'Vasilescu'} ];
const initialSportivi: Sportiv[] = [ { id: '1', nume: 'Popescu', prenume: 'Ion', email: 'ion@popescu.ro', parola: 'parola123', dataNasterii: '1990-05-15', inaltime: 180, cnp: '1900515123456', dataInscrierii: '2022-01-10', status: 'Activ', clubProvenienta: 'CS Qwan Ki Do Constanta', grupaId: 'gr3', familieId: null, tipAbonamentId: 'ab1', participaVacanta: false }, { id: '2', nume: 'Ionescu', prenume: 'Maria', email: 'maria@ionescu.ro', parola: 'parola123', dataNasterii: '2015-08-20', inaltime: 135, cnp: '6150820123457', dataInscrierii: '2021-09-01', status: 'Activ', clubProvenienta: 'CS Qwan Ki Do Constanta', grupaId: 'gr2', familieId: null, tipAbonamentId: 'ab1', participaVacanta: true }, { id: '3', nume: 'Georgescu', prenume: 'Andrei', email: 'andrei@georgescu.ro', parola: 'parola123', dataNasterii: '1998-11-02', inaltime: 175, cnp: '1981102123458', dataInscrierii: '2023-03-15', status: 'Inactiv', clubProvenienta: 'CS Tomis', grupaId: 'gr3', familieId: null, tipAbonamentId: 'ab1', participaVacanta: false }, { id: '4', nume: 'Vasilescu', prenume: 'Elena', email: 'elena@vasilescu.ro', parola: 'parola123', dataNasterii: '2017-02-10', inaltime: 125, cnp: '6170210123458', dataInscrierii: '2023-09-05', status: 'Activ', clubProvenienta: 'CS Qwan Ki Do Constanta', grupaId: 'gr1', familieId: 'fam1', tipAbonamentId: null, participaVacanta: true }, { id: '5', nume: 'Vasilescu', prenume: 'Mihai', email: 'mihai@vasilescu.ro', parola: 'parola123', dataNasterii: '2015-02-10', inaltime: 140, cnp: '5150210123458', dataInscrierii: '2023-09-05', status: 'Activ', clubProvenienta: 'CS Qwan Ki Do Constanta', grupaId: 'gr1', familieId: 'fam1', tipAbonamentId: null, participaVacanta: true }, ];
const initialExamene: Examen[] = [ { id: 'ex1', data: '2023-06-25', locatia: 'Sala Sporturilor, Constanta', comisia: 'Maestrul Director Tehnic' }, { id: 'ex2', data: '2023-12-15', locatia: 'Liceul Ovidius, Constanta', comisia: 'Comisia Nationala' }, { id: 'ex3', data: '2024-06-30', locatia: 'Sala Sporturilor, Constanta', comisia: 'Comisia Nationala' }, ];
const initialGrade: Grad[] = [ { id: 'g1', nume: "Debutant", ordine: 1, varstaMinima: 4, timpAsteptare: "0 luni", gradStartId: null }, { id: 'g2', nume: "1 Câp Galben", ordine: 2, varstaMinima: 4, timpAsteptare: "4 luni", gradStartId: 'g1' }, { id: 'g3', nume: "2 Câp Galben", ordine: 3, varstaMinima: 5, timpAsteptare: "6 luni", gradStartId: 'g2' }, { id: 'g4', nume: "3 Câp Galben", ordine: 4, varstaMinima: 5, timpAsteptare: "6 luni", gradStartId: 'g3' }, { id: 'g5', nume: "4 Câp Galben", ordine: 5, varstaMinima: 6, timpAsteptare: "6 luni", gradStartId: 'g4' }, { id: 'g6', nume: "1 Câp Roșu", ordine: 6, varstaMinima: 7, timpAsteptare: "6 luni", gradStartId: 'g5' }, { id: 'g7', nume: "2 Câp Roșu", ordine: 7, varstaMinima: 7, timpAsteptare: "6 luni", gradStartId: 'g6' }, { id: 'g8', nume: "3 Câp Roșu", ordine: 8, varstaMinima: 7, timpAsteptare: "6 luni", gradStartId: 'g7' }, { id: 'g9', nume: "4 Câp Roșu", ordine: 9, varstaMinima: 7, timpAsteptare: "6 luni", gradStartId: 'g8' }, { id: 'g10', nume: "Centura Violet", ordine: 10, varstaMinima: 8, timpAsteptare: "12 luni", gradStartId: 'g9' }, { id: 'g11', nume: "C.V. 1 Câp Alb", ordine: 11, varstaMinima: 9, timpAsteptare: "12 luni", gradStartId: 'g10' }, { id: 'g12', nume: "C.V. 2 Câp Alb", ordine: 12, varstaMinima: 10, timpAsteptare: "12 luni", gradStartId: 'g11' }, { id: 'g13', nume: "C.V. 3 Câp Alb", ordine: 13, varstaMinima: 11, timpAsteptare: "12 luni", gradStartId: 'g12' }, { id: 'g14', nume: "C.V. 4 Câp Alb", ordine: 14, varstaMinima: 12, timpAsteptare: "12 luni", gradStartId: 'g13' }, { id: 'g15', nume: "1 Câp Albastru", ordine: 15, varstaMinima: 13, timpAsteptare: "12 luni", gradStartId: 'g14' }, { id: 'g16', nume: "2 Câp Albastru", ordine: 16, varstaMinima: 13, timpAsteptare: "12 luni", gradStartId: 'g15' }, { id: 'g17', nume: "3 Câp Albastru", ordine: 17, varstaMinima: 14, timpAsteptare: "12 luni", gradStartId: 'g16' }, { id: 'g18', nume: "4 Câp Albastru", ordine: 18, varstaMinima: 15, timpAsteptare: "12 luni", gradStartId: 'g17' }, { id: 'g19', nume: "Centura Neagră", ordine: 19, varstaMinima: 18, timpAsteptare: "12 luni", gradStartId: 'g18' }, { id: 'g20', nume: "C.N. 1 Dang", ordine: 20, varstaMinima: 18, timpAsteptare: "24 luni", gradStartId: 'g19' }, ];
const initialParticipari: Participare[] = [ { id: 'p1', sportivId: '1', examenId: 'ex1', gradSustinutId: 'g1', rezultat: 'Admis', observatii: 'Tehnică bună' }, { id: 'p2', sportivId: '1', examenId: 'ex2', gradSustinutId: 'g2', rezultat: 'Admis' }, { id: 'p3', sportivId: '2', examenId: 'ex1', gradSustinutId: 'g1', rezultat: 'Admis' }, { id: 'p4', sportivId: '2', examenId: 'ex3', gradSustinutId: 'g2', rezultat: 'Respins', observatii: 'Mai multă stabilitate la Thao' }, { id: 'p5', sportivId: '3', examenId: 'ex2', gradSustinutId: 'g1', rezultat: 'Neprezentat' }, ];
const initialPrezente: Prezenta[] = [ {id: '2024-05-20-18:00-gr3-Normal', data: '2024-05-20', ora: '19:30', grupaId: 'gr3', sportiviPrezentiIds: ['1'], tip: 'Normal'}, {id: '2024-05-21-17:00-gr2-Normal', data: '2024-05-21', ora: '18:00', grupaId: 'gr2', sportiviPrezentiIds: ['2'], tip: 'Normal'}, ];
const initialEvenimente: Eveniment[] = [ { id: 'ev1', denumire: 'Stagiu National de Iarna', data: '2024-02-10', locatie: 'Poiana Brasov', organizator: 'FRQKD', tip: 'Stagiu' }, { id: 'ev2', denumire: 'Campionatul National de Copii', data: '2024-04-20', locatie: 'Bucuresti', organizator: 'FRQKD', tip: 'Competitie' }, { id: 'ev3', denumire: 'Stagiu de Vară', data: '2024-08-15', locatie: 'Eforie Nord', organizator: 'Phi Hau Iași', tip: 'Stagiu' } ];
const initialRezultate: Rezultat[] = [ { id: 'res1', sportivId: '2', evenimentId: 'ev2', rezultat: 'Locul 1 Kata' }, { id: 'res2', sportivId: '4', evenimentId: 'ev2', rezultat: 'Mentiune' }, { id: 'res3', sportivId: '1', evenimentId: 'ev1', rezultat: 'Participare' }, ];
const initialPlati: Plata[] = [
    { id: 'pl1', sportivId: '1', familieId: null, suma: 170, data: '2024-05-01', status: 'Achitat', descriere: 'Abonament Standard Mai 2024', tip: 'Abonament', observatii: '', metodaPlata: 'Cash', dataPlatii: '2024-05-01' },
    { id: 'pl2', sportivId: '2', familieId: null, suma: 170, data: '2024-05-01', status: 'Achitat', descriere: 'Abonament Standard Mai 2024', tip: 'Abonament', observatii: '', metodaPlata: 'Transfer Bancar', dataPlatii: '2024-05-03' },
    { id: 'pl3', sportivId: null, familieId: 'fam1', suma: 250, data: '2024-05-01', status: 'Neachitat', descriere: 'Abonament Familie 2 membri Mai 2024', tip: 'Abonament', observatii: 'Pentru Elena si Mihai' },
];
const initialTranzactii: Tranzactie[] = [ { id: 'tr1', plataIds: ['pl1'], sportivId: '1', familieId: null, suma: 170, dataPlatii: '2024-05-01', metodaPlata: 'Cash' }, { id: 'tr2', plataIds: ['pl2'], sportivId: '2', familieId: null, suma: 170, dataPlatii: '2024-05-03', metodaPlata: 'Transfer Bancar' } ];
const initialPreturi: PretConfig[] = [ {id: 'pr1', categorie: 'Taxa Stagiu', denumireServiciu: 'Stagiu National', suma: 250, valabilDeLaData: '2023-01-01'}, {id: 'pr2', categorie: 'Taxa Examen', denumireServiciu: 'Examinare Grad', suma: 120, valabilDeLaData: '2023-01-01'}, {id: 'pr3', categorie: 'Echipament', denumireServiciu: 'Vo Phuc', suma: 150, valabilDeLaData: '2023-01-01', specificatii: { inaltimeMin: 110, inaltimeMax: 130 }}, {id: 'pr4', categorie: 'Echipament', denumireServiciu: 'Vo Phuc', suma: 180, valabilDeLaData: '2023-01-01', specificatii: { inaltimeMin: 131, inaltimeMax: 160 }}, {id: 'pr5', categorie: 'Echipament', denumireServiciu: 'Vo Phuc', suma: 200, valabilDeLaData: '2023-01-01', specificatii: { inaltimeMin: 161 }}, ];
const initialAbonamente: TipAbonament[] = [ {id: 'ab1', denumire: 'Abonament Standard Individual', pret: 170, numarMembri: 1}, {id: 'ab2', denumire: 'Abonament Familie 2 membri', pret: 250, numarMembri: 2}, {id: 'ab3', denumire: 'Abonament Familie 3+ membri', pret: 300, numarMembri: 3}, ];

const TopBar: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
    <header className="bg-slate-800 shadow-md mb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <span className="font-bold text-xl text-white">Phi Hau Iași Admin</span>
            <Button onClick={onLogout} variant="danger" size="sm">Logout</Button>
        </div>
    </header>
);

export type MenuKey = 'sportivi' | 'examene' | 'financiar' | 'antrenamente' | 'stagii' | 'competitii' | null;

const menuConfig: Record<NonNullable<MenuKey>, { title: string, items: { view: View, label: string }[] }> = {
    sportivi: { title: "Meniu Sportivi", items: [ { view: 'sportivi', label: 'Listă Sportivi' }, { view: 'familii', label: 'Gestiune Familii' }, ] },
    examene: { title: "Meniu Examene", items: [ { view: 'examene', label: 'Configurare Examene' }, { view: 'grade', label: 'Tabel Grade' } ] },
    financiar: { title: "Meniu Financiar", items: [ { view: 'plati-scadente', label: 'Facturi (Datorii)' }, { view: 'jurnal-incasari', label: 'Jurnal Încasări' }, { view: 'raport-financiar', label: 'Raport Financiar' }, { view: 'tipuri-abonament', label: 'Configurare Abonamente' }, { view: 'configurare-preturi', label: 'Configurare Alte Prețuri' } ] },
    antrenamente: { title: "Meniu Antrenamente", items: [ { view: 'prezenta', label: 'Înregistrare Prezențe' }, { view: 'grupe', label: 'Orar & Gestiune Grupe' } ] },
    stagii: { title: "Meniu Stagii", items: [ { view: 'stagii', label: 'Listă Stagii & Participanți' } ] },
    competitii: { title: "Meniu Competiții", items: [ { view: 'competitii', label: 'Listă Competiții & Rezultate' } ] },
};

const SubMenu: React.FC<{ menuKey: NonNullable<MenuKey>; onSelectItem: (view: View) => void; onBack: () => void; }> = ({ menuKey, onSelectItem, onBack }) => {
    const { title, items } = menuConfig[menuKey];
    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard</Button>
            <h1 className="text-3xl font-bold text-white mb-6 text-center">{title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {items.map(item => (
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
  const [sportivi, setSportivi] = useLocalStorage<Sportiv[]>('qkd_sportivi', initialSportivi);
  const [examene, setExamene] = useLocalStorage<Examen[]>('qkd_examene', initialExamene);
  const [grade, setGrade] = useLocalStorage<Grad[]>('qkd_grade', initialGrade);
  const [participari, setParticipari] = useLocalStorage<Participare[]>('qkd_participari', initialParticipari);
  const [prezente, setPrezente] = useLocalStorage<Prezenta[]>('qkd_prezente', initialPrezente);
  const [grupe, setGrupe] = useLocalStorage<Grupa[]>('qkd_grupe', initialGrupe);
  const [familii, setFamilii] = useLocalStorage<Familie[]>('qkd_familii', initialFamilii);
  const [plati, setPlati] = useLocalStorage<Plata[]>('qkd_plati', initialPlati);
  const [tranzactii, setTranzactii] = useLocalStorage<Tranzactie[]>('qkd_tranzactii', initialTranzactii);
  const [evenimente, setEvenimente] = useLocalStorage<Eveniment[]>('qkd_evenimente', initialEvenimente);
  const [rezultate, setRezultate] = useLocalStorage<Rezultat[]>('qkd_rezultate', initialRezultate);
  const [preturiConfig, setPreturiConfig] = useLocalStorage<PretConfig[]>('qkd_preturi', initialPreturi);
  const [tipuriAbonament, setTipuriAbonament] = useLocalStorage<TipAbonament[]>('qkd_tipuri_abonament', initialAbonamente);
  const [customFields, setCustomFields] = useLocalStorage<string[]>('qkd_custom_fields', []);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [activeView, setActiveView] = useState<View | null>(null);
  const [plataToIncasare, setPlataToIncasare] = useState<Plata | null>(null);

  const handleIncaseazaAcum = (plata: Plata) => {
    setPlataToIncasare(plata);
    setActiveMenu('financiar');
    setActiveView('jurnal-incasari');
  };

  const handleLogin = (email: string, parola: string): User | null => {
    if (email === ADMIN_USER.email && parola === ADMIN_USER.parola) { setCurrentUser(ADMIN_USER); return ADMIN_USER; }
    const sportivUser = sportivi.find(s => s.email === email && s.parola === parola);
    if (sportivUser) { const user: User = { ...sportivUser, rol: 'Sportiv' }; setCurrentUser(user); return user; }
    return null;
  };

  const handleLogout = () => { setCurrentUser(null); setActiveMenu(null); setActiveView(null); };
  const handleBackToMenu = () => setActiveView(null);
  const handleBackToDashboard = () => setActiveMenu(null);

  const renderAdminContent = () => {
    if (activeView) {
      switch (activeView) {
        case 'sportivi': return <SportiviManagement onBack={handleBackToMenu} sportivi={sportivi} setSportivi={setSportivi} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} tipuriAbonament={tipuriAbonament} familii={familii} customFields={customFields} setCustomFields={setCustomFields} setTranzactii={setTranzactii} />;
        case 'examene': return <ExameneManagement onBack={handleBackToMenu} examene={examene} setExamene={setExamene} participari={participari} setParticipari={setParticipari} sportivi={sportivi} grade={grade} setPlati={setPlati} preturi={preturiConfig} />;
        case 'grade': return <GradeManagement onBack={handleBackToMenu} grade={grade} setGrade={setGrade} />;
        case 'prezenta': return <PrezentaManagement onBack={handleBackToMenu} sportivi={sportivi} prezente={prezente} setPrezente={setPrezente} grupe={grupe} plati={plati} />;
        case 'grupe': return <GrupeManagement onBack={handleBackToMenu} grupe={grupe} setGrupe={setGrupe} />;
        case 'familii': return <FamiliiManagement onBack={handleBackToMenu} familii={familii} setFamilii={setFamilii} />;
        case 'stagii': return <StagiiCompetitiiManagement onBack={handleBackToMenu} type="Stagiu" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} />;
        case 'competitii': return <StagiiCompetitiiManagement onBack={handleBackToMenu} type="Competitie" evenimente={evenimente} setEvenimente={setEvenimente} rezultate={rezultate} setRezultate={setRezultate} sportivi={sportivi} setPlati={setPlati} preturiConfig={preturiConfig} />;
        case 'plati-scadente': return <PlatiScadente onBack={handleBackToMenu} plati={plati} setPlati={setPlati} sportivi={sportivi} familii={familii} tipuriAbonament={tipuriAbonament} onIncaseazaAcum={handleIncaseazaAcum} />;
        case 'jurnal-incasari': return <JurnalIncasari onBack={handleBackToMenu} plati={plati} setPlati={setPlati} sportivi={sportivi} preturiConfig={preturiConfig} tipuriAbonament={tipuriAbonament} setTranzactii={setTranzactii} plataInitiala={plataToIncasare} onIncasareProcesata={() => setPlataToIncasare(null)} />;
        case 'tipuri-abonament': return <TipuriAbonamentManagement onBack={handleBackToMenu} tipuriAbonament={tipuriAbonament} setTipuriAbonament={setTipuriAbonament} />;
        case 'configurare-preturi': return <ConfigurarePreturi onBack={handleBackToMenu} preturi={preturiConfig} setPreturi={setPreturiConfig} />;
        case 'raport-financiar': return <RaportFinanciar onBack={handleBackToMenu} plati={plati} sportivi={sportivi} familii={familii} tranzactii={tranzactii} />;
        default: setActiveView(null); return null;
      }
    }
    if (activeMenu) {
        return <SubMenu menuKey={activeMenu} onSelectItem={setActiveView} onBack={handleBackToDashboard} />
    }
    return <Dashboard onSelectMenu={setActiveMenu} />;
  };

  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {currentUser.rol === 'Admin' ? (
        <>
          <TopBar onLogout={handleLogout} />
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">{renderAdminContent()}</main>
        </>
      ) : (
        <PortalSportiv sportiv={currentUser} onLogout={handleLogout} participari={participari} examene={examene} grade={grade} prezente={prezente} grupe={grupe} plati={plati} setPlati={setPlati} evenimente={evenimente} rezultate={rezultate} setRezultate={setRezultate} preturiConfig={preturiConfig} />
      )}
    </div>
  );
}

export default App;