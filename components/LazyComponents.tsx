import { lazy } from 'react';

// Lazy load all major components for code splitting and better mobile performance
export const SportiviManagement = lazy(() => import('./Sportivi').then(m => ({ default: m.Sportivi })));
export const UserProfile = lazy(() => import('./UserProfile').then(m => ({ default: m.UserProfile })));
export const GestiuneExamene = lazy(() => import('./GestiuneExamene').then(m => ({ default: m.GestiuneExamene })));
export const ExameneManagement = lazy(() => import('./GestiuneExamene').then(m => ({ default: m.ExameneManagement })));
export const GradeManagement = lazy(() => import('./Grade/Grade').then(m => ({ default: m.GradeManagement })));
export const PrezentaManagement = lazy(() => import('./Prezenta').then(m => ({ default: m.Prezenta })));
export const GrupeManagement = lazy(() => import('./Grupe').then(m => ({ default: m.Grupe })));
export const RaportPrezenta = lazy(() => import('./Prezenta/RaportPrezenta').then(m => ({ default: m.RaportPrezenta })));
export const StagiiManagement = lazy(() => import('./Competitii/StagiiManagement').then(m => ({ default: m.StagiiManagement })));
export const CompetitiiManagement = lazy(() => import('./Competitii').then(m => ({ default: m.CompetitiiManagement })));
export const CategoriiTemplateManager = lazy(() => import('./Competitii/CategoriiTemplateManager'));
export const PlatiScadente = lazy(() => import('./Plati/PlatiScadente').then(m => ({ default: m.PlatiScadente })));
export const JurnalIncasari = lazy(() => import('./Plati/JurnalIncasari').then(m => ({ default: m.JurnalIncasari })));
export const TipuriAbonamentManagement = lazy(() => import('./Plati/TipuriAbonament').then(m => ({ default: m.TipuriAbonamentManagement })));
export const ConfigurarePreturi = lazy(() => import('./Plati/ConfigurarePreturi').then(m => ({ default: m.ConfigurarePreturi })));
export const RaportFinanciar = lazy(() => import('./Plati/RaportFinanciar').then(m => ({ default: m.RaportFinanciar })));
export const FamiliiManagement = lazy(() => import('./Plati/Familii').then(m => ({ default: m.FamiliiManagement })));
export const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
export const BackupManager = lazy(() => import('./BackupManager').then(m => ({ default: m.BackupManager })));
export const ProgramareActivitati = lazy(() => import('./Activitati').then(m => ({ default: m.ProgramareActivitati })));
export const ClubSettings = lazy(() => import('./ClubSettings').then(m => ({ default: m.ClubSettings })));
export const ReduceriManagement = lazy(() => import('./Plati/Reduceri').then(m => ({ default: m.ReduceriManagement })));
export const Notificari = lazy(() => import('./Notificari').then(m => ({ default: m.Notificari })));
export const TaxeAnuale = lazy(() => import('./Plati/TaxeAnuale').then(m => ({ default: m.TaxeAnuale })));
export const GestionareNomenclatoare = lazy(() => import('./Grade/GestionareNomenclatoare').then(m => ({ default: m.GestionareNomenclatoare })));
export const FinancialDashboard = lazy(() => import('./Plati/FinancialDashboard').then(m => ({ default: m.FinancialDashboard })));
export const GestiuneFacturi = lazy(() => import('./Plati/GestiuneFacturi').then(m => ({ default: m.GestiuneFacturi })));
export const IstoricPlati = lazy(() => import('./Plati/FacturiPersonale').then(m => ({ default: m.IstoricPlati })));
export const CalendarView = lazy(() => import('./CalendarView').then(m => ({ default: m.CalendarView })));
export const RapoarteExamen = lazy(() => import('./GestiuneExamene/RapoarteExamen').then(m => ({ default: m.RapoarteExamen })));
export const CluburiManagement = lazy(() => import('./CluburiManagement').then(m => ({ default: m.CluburiManagement })));
export const FederationStructure = lazy(() => import('./FederationStructure').then(m => ({ default: m.FederationStructure })));
export const FederationInvoices = lazy(() => import('./FederationInvoices').then(m => ({ default: m.FederationInvoices })));
export const MartialAttendance = lazy(() => import('./Prezenta/MartialAttendance').then(m => ({ default: m.MartialAttendance })));
export const AccountSettings = lazy(() => import('./AccountSettings').then(m => ({ default: m.AccountSettings })));
export const FederationDashboard = lazy(() => import('./FederationDashboard').then(m => ({ default: m.FederationDashboard })));
export const FisaDigitalaSportiv = lazy(() => import('./Sportivi/FisaDigitalaSportiv').then(m => ({ default: m.FisaDigitalaSportiv })));
export const FisaCompetitie = lazy(() => import('./Competitii/FisaCompetitie').then(m => ({ default: m.FisaCompetitie })));
export const InstructorPrezentaPage = lazy(() => import('./Prezenta/InstructorPrezentaPage').then(m => ({ default: m.InstructorPrezentaPage })));
export const RaportActivitate = lazy(() => import('./RaportActivitate').then(m => ({ default: m.RaportActivitate })));
export const AdminConsole = lazy(() => import('./AdminConsole').then(m => ({ default: m.AdminConsole })));
export const ArhivaPrezente = lazy(() => import('./Prezenta/ArhivaPrezente').then(m => ({ default: m.ArhivaPrezente })));
export const ProgramAntrenamenteManagement = lazy(() => import('./Grupe/ProgramAntrenamenteManagement').then(m => ({ default: m.ProgramAntrenamenteManagement })));
export const AdminMasterMap = lazy(() => import('./AdminMasterMap').then(m => ({ default: m.AdminMasterMap })));
export const SportivDashboard = lazy(() => import('./SportivDashboard').then(m => ({ default: m.SportivDashboard })));
export const RaportLunarPrezenta = lazy(() => import('./Prezenta/RaportLunarPrezenta').then(m => ({ default: m.RaportLunarPrezenta })));
export const RaportIntervalExamen = lazy(() => import('./Prezenta/RaportIntervalExamen').then(m => ({ default: m.RaportIntervalExamen })));
export const AdminDashboard = lazy(() => import('./AdminDashboard').then(m => ({ default: m.AdminDashboard })));
export const ReportsDashboard = lazy(() => import('./ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
export const LegitimatiiPage = lazy(() => import('./LegitimatiiPage').then(m => ({ default: m.LegitimatiiPage })));
export const ImportSportiviPage = lazy(() => import('./Sportivi/ImportSportiviPage').then(m => ({ default: m.ImportSportiviPage })));
export const IstoricActivitate = lazy(() => import('./IstoricActivitate').then(m => ({ default: m.IstoricActivitate })));
export const DeduplicareSportivi = lazy(() => import('./Sportivi/DeduplicareSportivi').then(m => ({ default: m.DeduplicareSportivi })));
export const CereriInscriere = lazy(() => import('./Sportivi/CereriInscriere').then(m => ({ default: m.CereriInscriere })));
export const ActivitatiNationale = lazy(() => import('./ActivitatiNationale').then(m => ({ default: m.ActivitatiNationale })));
export const InlantuciriAdmin = lazy(() => import('./Grade/InlantuciriAdmin').then(m => ({ default: m.InlantuciriAdmin })));
export const AdminSMS = lazy(() => import('./SMS/AdminSMS').then(m => ({ default: m.AdminSMS })));
export const ButtonCatalog = lazy(() =>
  import('./ButtonCatalog').then(m => ({ default: m.ButtonCatalog }))
);
export const ProduseManagement = lazy(() =>
  import('./Produse').then(m => ({ default: m.ProduseManagement }))
);
