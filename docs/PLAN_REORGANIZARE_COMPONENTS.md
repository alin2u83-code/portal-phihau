# Plan Reorganizare `components/`

**Data propunerii:** 11 Apr 2026  
**Status:** Neimplementat — necesită branch separat și testare build

---

## Subdirectoare deja existente (rămân)

- `Grupe/`, `Prezenta/`, `Sportivi/`, `GestiuneExamene/`
- `Competitii/`, `SportivDashboard/`, `UserProfile/`
- `layout/`, `routing/`, `AIAssistant/`, `Tutorial/`, `GhidUtilizator/`

---

## Subdirectoare noi propuse

### `Examene/`
`ExamenRegistrationPreview`, `FinalizeExam`, `GestiuneExamene.tsx`, `HartaExamene`,
`ImportExamenModal`, `IstoricExamene`, `IstoricExameneSportiv`, `ManagementInscrieri`,
`ModulDecizieExamen`, `ModulInscriereExamen`, `RapoarteExamen`, `ValidareRezultate`,
`AddGradeModal`, `Grade`

### `Plati/`
`GestiuneFacturi`, `JurnalIncasari`, `PlatiScadente`, `TaxeAnuale`, `ConfigurarePreturi`,
`FacturaChitantaModal`, `FacturiPersonale`, `FamilyPaymentCard`, `RaportFinanciar`,
`Reduceri`, `TipuriAbonament`, `RevenueBarChart`, `PaymentTypePieChart`, `AgingReport`

### `Auth/`
`LoginPage`, `ResetPasswordPage`, `MandatoryPasswordChange`, `RoleSelectionPage`,
`ProtectedRoute`, `ProtectedGate`, `ClubGuard`, `AccessDenied`

### `Dashboard/`
`AdminDashboard`, `FederationDashboard`, `FederationDashboardMobile`,
`QwanKiDoDashboard`, `UnifiedDashboard`, `ReportsDashboard`, `FinancialDashboard`

### `Familii/`
`FamilieDetail`, `Familii`

### `Rapoarte/`
`RaportActivitate`, `RaportPrezenta`, `RaportLunarPrezenta`, `FederationInvoices`,
`FederationSportiviReport`, `FederationStructure`, `SportivFeedbackReport`, `IstoricActivitate`

### `Settings/`
`AccountSettings`, `ClubSettings`, `CluburiManagement`, `GestionareNomenclatoare`,
`BackupManager`, `AdminConsole`, `DataMaintenancePage`, `DataInspector`,
`DataIntegrityCheck`, `DeduplicareSportivi`

### `Shared/`
`ErrorBoundary`, `ErrorNotification`, `ErrorProvider`, `ConfirmDeleteModal`,
`ResponsiveTable`, `MartialArtsSkeleton`, `MobileSkeletonLoader`, `ui.tsx`,
`icons.tsx`, `Logo`, `BirthDateInput`, `LazyComponents`, `WelcomeHero`

### `Notificari/`
`InAppNotifications`, `NotificationBell`, `Notificari.tsx`, `NotificationPermissionWidget`

### `Debug/`
`BackdoorCheck`, `BackdoorTest`, `DebugPage`, `RLSTester`

---

## Rămân la root `components/`

`AppLayout`, `AppRouter`, `Header`, `Sidebar`, `NavMenu`, `menuConfig.ts`

---

## Risc și cerințe de implementare

- **~200-300 importuri** de actualizat în toată aplicația
- Se face pe **branch separat** (nu direct pe `main`)
- Verificare `tsc --noEmit` după fiecare grup mutat
- Agentul `audit-sistem` verifică după finalizare

---

## Pași de implementare

1. Creare branch: `git checkout -b refactor/reorganizare-components`
2. Creare foldere noi
3. `git mv` fiecare fișier la locul nou
4. Update importuri cu search & replace global
5. `npm run build` — verificare zero erori
6. PR → review → merge în main
