# Split Competitii/index.tsx Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `components/Competitii/index.tsx` (4166 linii) în 15 fișiere focalizate, eliminând blast radius-ul — modificarea unui tab nu poate strica altul.

**Architecture:** Extragere pură — nicio logică nouă. Fiecare componentă devine propriul fișier. `index.tsx` rămâne orchestratorul listei (`CompetitiiManagement`). `CompetitieDetail.tsx` deține tab-urile și fetchData. Fișierele noi importă shared utilities din `constants.ts`.

**Tech Stack:** React 18, TypeScript (strict: false), Tailwind CSS, Supabase, design system intern `components/ui.tsx`

---

## Structura finală

```
components/Competitii/
  index.tsx                   ← MODIFICAT: doar CompetitiiManagement (~250 linii)
  constants.ts                ← NOU: SS helpers, fmtDate, statusLabel, tipBadge, TipuriLabelsContext, areVizaFRAM, WarningVizaFRAM
  CompetitieForm.tsx          ← NOU: modal creare/editare competiție (linii 95-316)
  CompetitieDetail.tsx        ← NOU: container tab-uri + fetchData + header (linii 742-1363)
  RaportInscrieri.tsx         ← NOU: tab Raport (linii 317-465)
  FinanciarView.tsx           ← NOU: tab Financiar (linii 467-741)
  ProbeEditor.tsx             ← NOU: editor probe inline (linii 1365-1444)
  FuzionariPanel.tsx          ← NOU: panel fuzionări (linii 1445-1715)
  SolicitariEchipePanel.tsx   ← NOU: solicitări echipe incomplete (linii 1716-1812)
  GenerareSabloaneModal.tsx   ← NOU: modal generare șabloane (linii 1813-2144)
  AdminPanel.tsx              ← NOU: panel admin (linii 2145-2457)
  ProbaForm.tsx               ← NOU: form probă (linii 2459-2506)
  CategorieForm.tsx           ← NOU: form categorie (linii 2507-2715)
  InscrieriView.tsx           ← NOU: tabel înscrieri (linii 2716-3142)
  InscriereModal.tsx          ← NOU: modal înscriere individuală (linii 3143-3785)
  MigrareModal.tsx            ← NOU: modal migrare legacy (linii 3786-3910)
  InscriereClubWizard/        ← NESCHIMBAT
```

**Regulă generală per task:**
- Citește secțiunea din `index.tsx` cu `Read(offset, limit)`
- Creează fișierul nou cu tot conținutul secțiunii + header imports
- Verifică TypeScript: `npx tsc --noEmit 2>&1 | grep -i "competitii"` — trebuie 0 erori
- Elimină secțiunea din `index.tsx`, înlocuiește cu `import`
- Verifică din nou TypeScript
- Commit

---

## Task 1: Creează `constants.ts`

**Files:**
- Create: `components/Competitii/constants.ts`
- Modify: `components/Competitii/index.tsx` (linii 22-90)

- [ ] **Step 1: Creează `constants.ts`**

```typescript
// components/Competitii/constants.ts
import React from 'react';
import { VizaSportiv } from '../../types';
import { TIP_COMPETITIE_LABELS } from '../../utils/competitiiTemplates';

export const SS_KEY_COMP_ID = 'competitii_selected_comp_id';
export const SS_KEY_TAB = 'competitii_active_tab';

export function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function ssSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* ignorat */ }
}
export function ssDel(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignorat */ }
}

export function areVizaFRAM(sportivId: string, an: number, vizeSportivi: VizaSportiv[]): boolean {
  return vizeSportivi.some(v => v.sportiv_id === sportivId && v.an === an && v.status_viza === 'Activ');
}

export const WarningVizaFRAM: React.FC<{ show: boolean; inline?: boolean }> = ({ show, inline }) => {
  if (!show) return null;
  if (inline) return (
    <span title="Viza FRAM neachitată pentru anul curent"
      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-400 bg-yellow-900/40 border border-yellow-700/50 rounded px-1.5 py-0.5 ml-1 shrink-0">
      ⚠ FRAM
    </span>
  );
  return (
    <div className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-2.5 text-xs text-yellow-300">
      <span className="text-base leading-none shrink-0">⚠</span>
      <span>Viza FRAM <strong>neachitată</strong> pentru anul curent. Sportivul nu va fi acceptat în competiție fără această viză.</span>
    </div>
  );
};

export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('ro-RO') : '-';

export const statusLabel: Record<string, { label: string; color: string }> = {
  draft: { label: 'Schiță', color: 'bg-slate-700 text-slate-300' },
  inscrieri_deschise: { label: 'Înscrieri deschise', color: 'bg-green-800 text-green-200' },
  inscrieri_inchise: { label: 'Înscrieri închise', color: 'bg-yellow-800 text-yellow-200' },
  finalizata: { label: 'Finalizată', color: 'bg-blue-900 text-blue-200' },
};

export const tipBadge: Record<string, string> = {
  tehnica: 'bg-purple-800 text-purple-200',
  giao_dau: 'bg-red-800 text-red-200',
  cvd: 'bg-orange-800 text-orange-200',
};

export const TipuriLabelsContext = React.createContext<Map<string, string>>(
  new Map(Object.entries(TIP_COMPETITIE_LABELS))
);
```

- [ ] **Step 2: Înlocuiește liniile 22-90 din `index.tsx` cu importuri**

Șterge tot blocul de la linia 22 până la linia 90 (inclusiv) din `index.tsx` și adaugă la finalul blocului de imports existent:

```typescript
import {
  SS_KEY_COMP_ID, SS_KEY_TAB, ssGet, ssSet, ssDel,
  areVizaFRAM, WarningVizaFRAM,
  fmtDate, statusLabel, tipBadge, TipuriLabelsContext,
} from './constants';
```

- [ ] **Step 3: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -i "competitii"
```
Rezultat așteptat: nicio linie de eroare.

- [ ] **Step 4: Commit**

```bash
git add components/Competitii/constants.ts components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage constants.ts din index monolitic"
```

---

## Task 2: Extrage `CompetitieForm.tsx`

**Files:**
- Create: `components/Competitii/CompetitieForm.tsx`
- Modify: `components/Competitii/index.tsx` (linii 92-316 după Task 1)

- [ ] **Step 1: Creează `CompetitieForm.tsx`**

Creează fișierul cu header de imports + conținutul liniilor 95-316 din `index.tsx` original (interfața `CompetitieFormProps` + componenta `CompetitieForm`). Adaugă la început:

```typescript
import React, { useState, useEffect } from 'react';
import { Competitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select } from '../ui';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import { TipuriLabelsContext, statusLabel } from './constants';
```

Exportează componenta: `export const CompetitieForm: React.FC<CompetitieFormProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**

Șterge blocul `interface CompetitieFormProps` + `const CompetitieForm` din `index.tsx`. Adaugă import:

```typescript
import { CompetitieForm } from './CompetitieForm';
```

- [ ] **Step 3: Verifică TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -i "competitii"
```
Rezultat așteptat: 0 erori.

- [ ] **Step 4: Commit**

```bash
git add components/Competitii/CompetitieForm.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage CompetitieForm.tsx"
```

---

## Task 3: Extrage `RaportInscrieri.tsx`

**Files:**
- Create: `components/Competitii/RaportInscrieri.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `RaportInscrieri.tsx`**

Conținut: liniile 317-465 din `index.tsx` original (interfața `RaportInscrieriProps` + componenta `RaportInscrieri`). Header imports:

```typescript
import React, { useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { Button } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';
import { fmtDate } from './constants';
```

Exportează: `export const RaportInscrieri: React.FC<RaportInscrieriProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { RaportInscrieri } from './RaportInscrieri';`

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/RaportInscrieri.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage RaportInscrieri.tsx"
```

---

## Task 4: Extrage `FinanciarView.tsx`

**Files:**
- Create: `components/Competitii/FinanciarView.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `FinanciarView.tsx`**

Conținut: liniile 467-741 din `index.tsx` original (interfețele `FinanciarViewProps`, `RandFinanciar`, `ClubSituatie` + componenta `FinanciarView`). Header imports:

```typescript
import React, { useState, useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie } from '../../types';
import { Button } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from '../../utils/taxeCompetitie';
import { fmtDate } from './constants';
```

Exportează: `export const FinanciarView: React.FC<FinanciarViewProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { FinanciarView } from './FinanciarView';`

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/FinanciarView.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage FinanciarView.tsx"
```

---

## Task 5: Extrage `ProbaForm.tsx` și `CategorieForm.tsx`

**Files:**
- Create: `components/Competitii/ProbaForm.tsx`
- Create: `components/Competitii/CategorieForm.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `ProbaForm.tsx`**

Conținut: liniile 2459-2506 din `index.tsx` original. Header imports:

```typescript
import React, { useState } from 'react';
import { ProbaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select } from '../ui';
import { TIP_PROBA_LABELS, DEFAULT_PROBE_PER_TIP } from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';
```

Exportează: `export const ProbaForm: React.FC<ProbaFormProps> = ...`

- [ ] **Step 2: Creează `CategorieForm.tsx`**

Conținut: liniile 2507-2715 din `index.tsx` original (inclusiv `VARSTE_OPTIUNI`, `VARSTE_OPTIONS`, interfața `CategorieFormProps`). Header imports:

```typescript
import React, { useState, useEffect } from 'react';
import { CategorieCompetitie, ProbaCompetitie, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, Input, Select, SearchableSelect } from '../ui';
import { buildCategorieDenumire, ordineToLabel, TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';
```

Exportează: `export const CategorieForm: React.FC<CategorieFormProps> = ...`

- [ ] **Step 3: Înlocuiește în `index.tsx`**

```typescript
import { ProbaForm } from './ProbaForm';
import { CategorieForm } from './CategorieForm';
```

- [ ] **Step 4: Verifică TypeScript** — 0 erori.

- [ ] **Step 5: Commit**
```bash
git add components/Competitii/ProbaForm.tsx components/Competitii/CategorieForm.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage ProbaForm.tsx și CategorieForm.tsx"
```

---

## Task 6: Extrage `ProbeEditor.tsx`, `FuzionariPanel.tsx`, `SolicitariEchipePanel.tsx`

**Files:**
- Create: `components/Competitii/ProbeEditor.tsx`
- Create: `components/Competitii/FuzionariPanel.tsx`
- Create: `components/Competitii/SolicitariEchipePanel.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `ProbeEditor.tsx`**

Conținut: liniile 1365-1444. Header imports:

```typescript
import React, { useState } from 'react';
import { ProbaCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Input } from '../ui';
import { EditIcon, TrashIcon, PlusIcon } from '../icons';
import { useError } from '../ErrorProvider';
import { ProbaForm } from './ProbaForm';
```

Exportează: `export const ProbeEditor: React.FC<{ competitieId: string; probe: ProbaCompetitie[]; setProbe: React.Dispatch<React.SetStateAction<ProbaCompetitie[]>>; probaFormOpen: boolean; setProbaFormOpen: (v: boolean) => void; onRefresh: () => void; }> = ...`

- [ ] **Step 2: Creează `FuzionariPanel.tsx`**

Conținut: liniile 1445-1715 (interfața `MergeSugestie` + componenta `FuzionariPanel`). Header imports:

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';
```

Exportează: `export const FuzionariPanel: React.FC<...> = ...`

- [ ] **Step 3: Creează `SolicitariEchipePanel.tsx`**

Conținut: liniile 1716-1812. Header imports:

```typescript
import React, { useState } from 'react';
import { SolicitareEchipaIncompleta, CategorieCompetitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { useError } from '../ErrorProvider';
```

Exportează: `export const SolicitariEchipePanel: React.FC<...> = ...`

- [ ] **Step 4: Înlocuiește în `index.tsx`**

```typescript
import { ProbeEditor } from './ProbeEditor';
import { FuzionariPanel } from './FuzionariPanel';
import { SolicitariEchipePanel } from './SolicitariEchipePanel';
```

- [ ] **Step 5: Verifică TypeScript** — 0 erori.

- [ ] **Step 6: Commit**
```bash
git add components/Competitii/ProbeEditor.tsx components/Competitii/FuzionariPanel.tsx components/Competitii/SolicitariEchipePanel.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage ProbeEditor, FuzionariPanel, SolicitariEchipePanel"
```

---

## Task 7: Extrage `GenerareSabloaneModal.tsx`

**Files:**
- Create: `components/Competitii/GenerareSabloaneModal.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `GenerareSabloaneModal.tsx`**

Conținut: liniile 1813-2144 (interfața `GenerareSabloaneModalProps` + componenta `GenerareSabloaneModal`). Header imports:

```typescript
import React, { useState, useEffect } from 'react';
import { Competitie, ProbaCompetitie, CategorieCompetitie, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal } from '../ui';
import {
  generateTemplateTehnnica, generateTemplateGiaoDau, generateTemplateCVD,
  buildCategorieDenumire, TemplateCategorieInput, TIP_PROBA_LABELS
} from '../../utils/competitiiTemplates';
import { useError } from '../ErrorProvider';
```

Exportează: `export const GenerareSabloaneModal: React.FC<GenerareSabloaneModalProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { GenerareSabloaneModal } from './GenerareSabloaneModal';`

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/GenerareSabloaneModal.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage GenerareSabloaneModal.tsx"
```

---

## Task 8: Extrage `AdminPanel.tsx`

**Files:**
- Create: `components/Competitii/AdminPanel.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `AdminPanel.tsx`**

Conținut: liniile 2145-2457 (interfața `AdminPanelProps` + componenta `AdminPanel`). Header imports:

```typescript
import React, { useState } from 'react';
import { Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { TrashIcon, EditIcon } from '../icons';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { areVizaFRAM } from './constants';
import { ProbeEditor } from './ProbeEditor';
import { FuzionariPanel } from './FuzionariPanel';
import { SolicitariEchipePanel } from './SolicitariEchipePanel';
import { GenerareSabloaneModal } from './GenerareSabloaneModal';
import { CategorieForm } from './CategorieForm';
```

Exportează: `export const AdminPanel: React.FC<AdminPanelProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { AdminPanel } from './AdminPanel';`

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/AdminPanel.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage AdminPanel.tsx"
```

---

## Task 9: Extrage `InscriereModal.tsx`

**Files:**
- Create: `components/Competitii/InscriereModal.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `InscriereModal.tsx`**

Conținut: liniile 3143-3785 (interfața `InscriereModalProps` + componenta `InscriereModal`). Header imports:

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Sportiv, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal, SearchableSelect } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { filtreazaSportiviEligibili, calculeazaVarstaLaData } from '../../utils/eligibilitateCompetitie';
import { calculeazaTaxaIndividuala, calculeazaTaxaEchipa } from '../../utils/taxeCompetitie';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { areVizaFRAM, WarningVizaFRAM } from './constants';
```

Exportează: `export const InscriereModal: React.FC<InscriereModalProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { InscriereModal } from './InscriereModal';`

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/InscriereModal.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage InscriereModal.tsx"
```

---

## Task 10: Extrage `InscrieriView.tsx`

**Files:**
- Create: `components/Competitii/InscrieriView.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `InscrieriView.tsx`**

Conținut: liniile 2716-3142 (interfața `InscrieriViewProps` + componenta `InscrieriView`). Header imports:

```typescript
import React, { useState, useMemo } from 'react';
import { Competitie, CategorieCompetitie, ProbaCompetitie, InscriereCompetitie, EchipaCompetitie, Sportiv, Grad } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Input, Select } from '../ui';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { areVizaFRAM, WarningVizaFRAM, fmtDate } from './constants';
import { InscriereModal } from './InscriereModal';
```

Exportează: `export const InscrieriView: React.FC<InscrieriViewProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { InscrieriView } from './InscrieriView';`

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/InscrieriView.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage InscrieriView.tsx"
```

---

## Task 11: Extrage `MigrareModal.tsx`

**Files:**
- Create: `components/Competitii/MigrareModal.tsx`
- Modify: `components/Competitii/index.tsx`

- [ ] **Step 1: Creează `MigrareModal.tsx`**

Conținut: liniile 3787-3910 (interfața `EvenimentLegacy` + componenta `MigrareModal`). Header imports:

```typescript
import React, { useState } from 'react';
import { Competitie } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button, Modal } from '../ui';
import { useError } from '../ErrorProvider';
import { fmtDate } from './constants';
```

Exportează și `EvenimentLegacy`:
```typescript
export interface EvenimentLegacy { ... }
export const MigrareModal: React.FC<...> = ...
```

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă:

```typescript
import { MigrareModal, EvenimentLegacy } from './MigrareModal';
```

- [ ] **Step 3: Verifică TypeScript** — 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/MigrareModal.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage MigrareModal.tsx"
```

---

## Task 12: Extrage `CompetitieDetail.tsx`

**Files:**
- Create: `components/Competitii/CompetitieDetail.tsx`
- Modify: `components/Competitii/index.tsx`

Aceasta este cea mai mare extragere — conține tab-urile, `fetchData`, header-ul competiției.

- [ ] **Step 1: Creează `CompetitieDetail.tsx`**

Conținut: liniile 742-1363 (interfața `CompetitieDetailProps` + componenta `CompetitieDetail`). Header imports:

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Permissions, Competitie, ProbaCompetitie, CategorieCompetitie, InscriereCompetitie, EchipaCompetitie, Grad, Sportiv } from '../../types';
import { supabase } from '../../supabaseClient';
import { Button } from '../ui';
import { ArrowLeftIcon } from '../icons';
import { useData } from '../../contexts/DataContext';
import { VizaSportiv } from '../../types';
import { useError } from '../ErrorProvider';
import { TipuriLabelsContext, fmtDate, statusLabel, tipBadge, SS_KEY_TAB, ssGet, ssSet } from './constants';
import { useTipuriCompetitie } from '../../hooks/useTipuriCompetitie';
import { TIP_PROBA_LABELS } from '../../utils/competitiiTemplates';
import { RaportInscrieri } from './RaportInscrieri';
import { FinanciarView } from './FinanciarView';
import { AdminPanel } from './AdminPanel';
import { InscrieriView } from './InscrieriView';
import { CategoriiTemplateManager } from './CategoriiTemplateManager';
import InscriereClubWizard from './InscriereClubWizard';
import { TipuriCompetitieAdmin } from './TipuriCompetitieAdmin';
import { CereriInterclubAdmin } from './CereriInterclubAdmin';
```

Notă: `CategoriiTemplateManager` este deja importat în `index.tsx` ca default import — verifică dacă e named sau default export în `CategoriiTemplateManager.tsx`.

Exportează: `export const CompetitieDetail: React.FC<CompetitieDetailProps> = ...`

- [ ] **Step 2: Înlocuiește în `index.tsx`**, adaugă `import { CompetitieDetail } from './CompetitieDetail';`

- [ ] **Step 3: Curăță `index.tsx`** — după extragere, `index.tsx` conține doar `CompetitiiManagement` (~250 linii). Verifică că toate importurile neutilizate sunt eliminate. Rulează:

```bash
npx tsc --noEmit 2>&1 | grep -i "competitii"
```
Rezultat așteptat: 0 erori.

- [ ] **Step 4: Commit**
```bash
git add components/Competitii/CompetitieDetail.tsx components/Competitii/index.tsx
git commit -m "refactor(competitii): extrage CompetitieDetail.tsx — index.tsx redus la ~250 linii"
```

---

## Task 13: Curățare finală

- [ ] **Step 1: Verifică dimensiunea finală `index.tsx`**

```bash
wc -l components/Competitii/index.tsx
```
Trebuie să fie sub 350 linii.

- [ ] **Step 2: Verifică TypeScript global**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Rezultat așteptat: 0 erori.

- [ ] **Step 3: Verifică că aplicația pornește**

```bash
npm run dev
```
Deschide browserul la pagina Competiții, navighează prin toate tab-urile, verifică că nu apare nicio eroare în consolă.

- [ ] **Step 4: Commit final**
```bash
git add -A
git commit -m "refactor(competitii): split complet — 15 fișiere focalizate din index monolitic"
```

---

## Rezultat final

| Fișier | Linii estimate | Responsabilitate |
|--------|----------------|-----------------|
| `index.tsx` | ~250 | CompetitiiManagement: lista + routing |
| `constants.ts` | ~70 | Shared: SS helpers, formatare, contexte |
| `CompetitieDetail.tsx` | ~620 | Container tab-uri + fetchData + header |
| `AdminPanel.tsx` | ~310 | Panel admin cu statistici și CRUD |
| `InscrieriView.tsx` | ~420 | Tabel înscrieri cu acțiuni |
| `InscriereModal.tsx` | ~640 | Modal înscriere individuală |
| `CompetitieForm.tsx` | ~220 | Modal creare/editare competiție |
| `GenerareSabloaneModal.tsx` | ~330 | Modal generare șabloane categorii |
| `CategorieForm.tsx` | ~210 | Form categorie competiție |
| `FuzionariPanel.tsx` | ~270 | Panel fuzionări categorii |
| `FinanciarView.tsx` | ~275 | View financiar |
| `RaportInscrieri.tsx` | ~150 | Raport înscrieri |
| `SolicitariEchipePanel.tsx` | ~95 | Solicitări echipe incomplete |
| `ProbeEditor.tsx` | ~80 | Editor probe inline |
| `ProbaForm.tsx` | ~45 | Form probă |
| `MigrareModal.tsx` | ~125 | Modal migrare legacy |
