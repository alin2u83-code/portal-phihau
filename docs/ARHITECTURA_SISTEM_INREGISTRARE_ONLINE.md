# Arhitectura Sistem Management Qwan Ki Do — Portal Phi Hau
## Document Master: Deep Research + Plan de Transformare

**Data:** 21 Martie 2026
**Versiune:** 1.1 (actualizat cu cercetare Agent 1 — Jackrabbit, QR Passport, PayU, CNP parsing)
**Scope:** Sistem înregistrare online sportivi + transformare arhitecturală completă

---

## CUPRINS

1. [Situația Actuală (As-Is)](#1-situatia-actuala)
2. [Analiza Comparativă — Top Sisteme Globale](#2-analiza-comparativa)
3. [Arhitectura Propusă — Baza de Date](#3-arhitectura-baza-de-date)
4. [Sistemul de Înregistrare Online](#4-sistem-inregistrare-online)
5. [RBAC & Securitate](#5-rbac-si-securitate)
6. [Automatizare & Comunicare](#6-automatizare-si-comunicare)
7. [GDPR & Conformitate](#7-gdpr-si-conformitate)
8. [Pașaportul Virtual al Sportivului](#8-pasaportul-virtual)
9. [Stack Tehnic Recomandat](#9-stack-tehnic)
10. [Plan de Implementare — Faze](#10-plan-de-implementare)
11. [Estimare Costuri Infrastructură](#11-estimare-costuri)
12. [Insights Suplimentare din Cercetarea Globală](#12-insights-suplimentare)

---

## 1. SITUAȚIA ACTUALĂ (As-Is)

### Ce există deja în Portal Phi Hau

**Stiva tehnologică:** React 18 + TypeScript + Vite + Supabase (PostgreSQL + Auth + RLS)

**Funcționalități implementate:**
- ✅ Gestionare sportivi (profil, grad, grup)
- ✅ Prezență la antrenamente
- ✅ Sistem examene (Cap/Dang) cu istoricul gradelor
- ✅ Plăți și facturi (cotizații, taxe examene, stagii)
- ✅ Sistem familii (abonamente comune)
- ✅ Vize medicale cu tracking expirare
- ✅ Competiții (3 tipuri: tehnica/giao_dau/cvd) — NOU Martie 2026
- ✅ RBAC multi-context (SPORTIV/INSTRUCTOR/ADMIN_CLUB/ADMIN/SUPER_ADMIN_FEDERATIE)
- ✅ Dashboard federație cu vizibilitate multi-club
- ✅ 182 componente React, 47 migrații DB

**Ce lipsește — GAP ANALYSIS:**
- ❌ Înregistrare online self-service (parentele nu poate înscrie copilul singur)
- ❌ Relație explicită Parinte → Copil (există `familii` dar nu este relație guardian)
- ❌ Portal parinte cu vizibilitate datelor propriilor copii
- ❌ Wizard de înregistrare multi-pas cu consimțământ GDPR
- ❌ Scanare CI/certificat naștere (OCR)
- ❌ Contracte digitale cu semnătură electronică
- ❌ Notificări automate WhatsApp/Email
- ❌ Plată online integrată (Stripe/Netopia)
- ❌ Lead management (lecții de probă)
- ❌ Modul re-engagement membri inactivi
- ❌ Timeline/Pașaport Virtual sportiv (vizualizare cronologică)

---

## 2. ANALIZA COMPARATIVĂ — TOP SISTEME GLOBALE

### 2.1 Comparativ Soluții de Top

| Criteriu | **TeamSnap** (SUA) | **Zen Planner** (SUA) | **SportEasy** (EU/FR) | **Portal Phi Hau** (Custom) |
|---|---|---|---|---|
| **Profil familial** | ✅ Parent → N copii | ✅ Family account | ✅ Comptes famille | 🔄 În implementare |
| **Istoricul tehnic separat** | ❌ Nu e arte marțiale | ✅ Belt tracking | ❌ Generic | ✅ Istoric grade |
| **Înregistrare online** | ✅ Self-service | ✅ Self-service | ✅ Self-service | ❌ Admin-driven |
| **GDPR/EU Compliance** | ⚠️ US-centric | ⚠️ US-centric | ✅ RGPD complet | 🔄 Parțial |
| **Plăți online** | ✅ Stripe integrat | ✅ integrat | ✅ integrat | ❌ Lipsă |
| **WhatsApp** | ❌ Nu | ❌ Nu | ❌ Nu | 🔄 Planificat |
| **Federație specifică QKD** | ❌ Nu | ❌ Nu | ❌ Nu | ✅ Da |
| **Ierarhie Cap/Dang** | ❌ Nu | Parțial | ❌ Nu | ✅ Da |
| **Prețuri/lună** | $10-25/echipă | $139-499 | €7-12/club | Custom (hosting) |
| **RBAC granular** | Basic | Medium | Basic | ✅ Complex |
| **Multi-club federație** | ❌ Nu | ❌ Nu | ❌ Nu | ✅ Da |

**Concluzie:** Niciun sistem comercial nu acoperă specificul QKD + cerințele federației române. Soluția custom Portal Phi Hau este corectă strategic — trebuie extinsă, nu înlocuită.

### 2.2 Lecții de la Zen Planner (lider arte marțiale)

**Ce face bine Zen Planner:**
- Cont familie cu „billing contact" separat de „athlete profiles"
- Tracking belt progression cu date și instructori
- Self-service portal pentru elevi/părinți
- Automated billing (recurring payments)

**Ce lipsește la Zen Planner (oportunitate Phi Hau):**
- Nu știe de ierarhia Cap/Dang sau reguli de eligibilitate QKD
- Nu are integrare federație națională
- Nu este GDPR-first (stocat în SUA)
- Nu suportă română / specificul cluburilor românești

### 2.3 Modelul Swapnil Garg — "Database as Source of Truth"

Principii preluate pentru Phi Hau:

1. **Imuabilitatea istoricului** → `istoricul_gradelor` nu se șterge, se adaugă
2. **Household model** → `familii` extins cu relație guardian explicită
3. **Event-driven timeline** → Tabel `sportiv_timeline` cu evenimente cronologice
4. **Check-in rapid** → Modul kiosk pentru tabletă la sala

---

## 3. ARHITECTURA BAZEI DE DATE — PROPUSĂ

### 3.1 Noile Tabele Necesare

```sql
-- ============================================================
-- MIGRAȚIE: Sistem Înregistrare Online & Profil Familial
-- ============================================================

-- 1. PROFIL GUARDIAN (Parinte/Tutore)
-- Extinde sistemul existent de familii cu relatie explicita
CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES cluburi(id),
  -- Date personale
  nume TEXT NOT NULL,
  prenume TEXT NOT NULL,
  email TEXT,
  telefon TEXT,
  -- Date CI
  cnp TEXT, -- ENCRYPTED cu pgcrypto
  serie_ci TEXT,
  numar_ci TEXT,
  -- Adresa (shared pentru toti copiii)
  adresa TEXT,
  oras TEXT,
  judet TEXT,
  -- Status
  email_verificat BOOLEAN DEFAULT FALSE,
  gdpr_consimtit_la TIMESTAMPTZ,
  gdpr_versiune TEXT, -- versiunea politicii GDPR acceptate
  status TEXT DEFAULT 'activ', -- activ, inactiv, suspendat
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RELATIE PARINTE → COPIL
CREATE TABLE guardian_sportiv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID REFERENCES guardians(id),
  sportiv_id UUID REFERENCES sportivi(id),
  relatie TEXT DEFAULT 'parinte', -- parinte, tutore, bunic, alta_ruda
  este_contact_primar BOOLEAN DEFAULT TRUE,
  poate_autoriza_plati BOOLEAN DEFAULT TRUE,
  poate_semna_contracte BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEX UNIC: Previne duplicate sportivi
-- Hash: LOWER(nume) + LOWER(prenume) + data_nastere
CREATE UNIQUE INDEX idx_sportiv_unique_identity
  ON sportivi (LOWER(TRIM(nume)), LOWER(TRIM(prenume)), data_nasterii)
  WHERE status != 'sters'; -- permite re-inregistrare dupa stergere GDPR

-- 3. LEAD-URI (Lectii de Proba)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES cluburi(id),
  -- Date minime cerute (3 campuri = conversie maxima)
  nume TEXT NOT NULL,
  telefon TEXT,
  email TEXT,
  varsta_aproximativa INTEGER,
  -- Tracking
  sursa TEXT, -- 'site_web', 'facebook', 'instagram', 'recomandare', 'walk_in'
  status TEXT DEFAULT 'nou', -- nou, contactat, proba_programata, proba_efectuata, convertit, pierdut
  data_proba DATE,
  instructor_proba_id UUID REFERENCES sportivi(id), -- instructorul care face proba
  -- Conversie
  sportiv_id UUID REFERENCES sportivi(id), -- populated dupa conversie
  convertit_la TIMESTAMPTZ,
  motiv_pierdere TEXT,
  -- Follow-up automation
  data_urmator_followup DATE,
  nr_followup_uri INTEGER DEFAULT 0,
  -- Note
  observatii TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INREGISTRARE ONLINE (Cereri in asteptare)
CREATE TABLE cereri_inregistrare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES cluburi(id),
  token_unic TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  -- Date guardian
  guardian_nume TEXT NOT NULL,
  guardian_prenume TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  guardian_telefon TEXT,
  guardian_cnp TEXT, -- temporar, sterge dupa procesare
  -- Date sportiv
  sportiv_data JSONB, -- { nume, prenume, data_nastere, gen, grad_actual }
  -- Multi-copil
  copii_data JSONB[], -- array pentru mai multi copii
  -- Status flux
  status TEXT DEFAULT 'in_asteptare',
  -- in_asteptare, verificata, aprobata, respinsa, expirata
  token_email_verificare TEXT,
  email_verificat_la TIMESTAMPTZ,
  examinat_de UUID REFERENCES auth.users(id),
  examinat_la TIMESTAMPTZ,
  motiv_respingere TEXT,
  -- GDPR
  gdpr_consimtit BOOLEAN DEFAULT FALSE,
  gdpr_consimtit_la TIMESTAMPTZ,
  gdpr_versiune TEXT,
  -- Documente
  document_urls JSONB, -- { ci_parinte: url, certificat_nastere: url }
  -- Timestamps
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TIMELINE SPORTIV (Pasaportul Virtual)
CREATE TABLE sportiv_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportiv_id UUID REFERENCES sportivi(id),
  -- Tipuri eveniment:
  -- 'inscriere', 'grad_obtinut', 'examen_promovat', 'examen_picat',
  -- 'stagiu_participat', 'competitie_participata', 'viza_medicala',
  -- 'suspendare', 'reactivare', 'titlu_sportiv'
  tip_eveniment TEXT NOT NULL,
  titlu TEXT NOT NULL,
  descriere TEXT,
  data_eveniment DATE NOT NULL,
  -- Referinte la alte tabele
  ref_table TEXT, -- 'inscrieri_examene', 'evenimente', 'competitii', etc.
  ref_id UUID,
  -- Metadate
  metadata JSONB, -- date aditionale specifice tipului
  creat_de UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru cautare rapida pe sportiv+data
CREATE INDEX idx_sportiv_timeline_sportiv_data
  ON sportiv_timeline (sportiv_id, data_eveniment DESC);

-- 6. CONTRACTE DIGITALE
CREATE TABLE contracte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES cluburi(id),
  sportiv_id UUID REFERENCES sportivi(id),
  guardian_id UUID REFERENCES guardians(id),
  -- Tipuri: 'membru', 'reinregistrare', 'stagiu', 'competitie'
  tip TEXT NOT NULL,
  -- Status: 'draft', 'trimis_semnat', 'semnat', 'expirat', 'anulat'
  status TEXT DEFAULT 'draft',
  -- PDF generat
  pdf_url TEXT, -- URL in Supabase Storage (presigned, expira)
  pdf_hash TEXT, -- SHA256 pentru verificare integritate
  -- Semnatura electronica (Eversign/DocuSign)
  provider_semnat TEXT, -- 'eversign', 'docusign', 'semnatura_interna'
  doc_extern_id TEXT, -- ID-ul documentului in sistemul extern
  semnat_la TIMESTAMPTZ,
  semnat_de_guardian_id UUID REFERENCES guardians(id),
  -- Versioning
  versiune_template TEXT, -- e.g., '2026.1'
  continut_snapshot JSONB, -- snapshot date la momentul generarii
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOG (GDPR - Cine, Cand, Ce)
CREATE TABLE audit_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID,
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  -- Ce actiune
  actiune TEXT NOT NULL, -- 'VIEW_PROFIL', 'EDIT_DATE', 'EXPORT_DATE', 'STERGERE_DATE'
  tabel_accesat TEXT,
  inregistrare_id UUID,
  date_accesate JSONB, -- ce campuri au fost vazute (nu valorile!)
  -- Context
  ip_address INET,
  user_agent TEXT,
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitionare pe luna pentru performanta
-- (implementata la scara mare)
```

### 3.2 Modificări la Tabelele Existente

```sql
-- Adauga campuri la sportivi
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS
  duplicate_check TEXT GENERATED ALWAYS AS
  (LOWER(TRIM(nume)) || '|' || LOWER(TRIM(prenume)) || '|' || data_nasterii::TEXT)
  STORED;

-- Adauga camp encrypted CNP (pgcrypto)
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS cnp_encrypted TEXT;
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS gdpr_sters_la TIMESTAMPTZ;

-- Trigger: populeaza timeline la fiecare grad obtinut
CREATE OR REPLACE FUNCTION trigger_timeline_grad()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sportiv_timeline (
    sportiv_id, tip_eveniment, titlu, data_eveniment,
    ref_table, ref_id, metadata
  ) VALUES (
    NEW.sportiv_id,
    'grad_obtinut',
    (SELECT 'Obtinut grad: ' || g.nume FROM grade g WHERE g.id = NEW.grad_id),
    NEW.data_obtinere,
    'istoric_grade',
    NEW.id,
    jsonb_build_object('grad_id', NEW.grad_id, 'sesiune_id', NEW.sesiune_examen_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_grade_obtained
  AFTER INSERT ON istoric_grade
  FOR EACH ROW EXECUTE FUNCTION trigger_timeline_grad();
```

---

## 4. SISTEMUL DE ÎNREGISTRARE ONLINE

### 4.1 Fluxul Complet — Wizard de Înregistrare

```
┌─────────────────────────────────────────────────────────────┐
│              FLUX ÎNREGISTRARE ONLINE SPORTIV               │
│                  (pentru Părinți/Tutori)                    │
└─────────────────────────────────────────────────────────────┘

PAS 1: LANDING PAGE
"Înscrie-ți copilul la Qwan Ki Do"
- Selectare club (dacă sunt mai multe)
- Buton: "Solicită Lecție de Probă GRATUITĂ" sau "Înregistrare Directă"
- Formular minim: Nume parinte | Telefon | Vârsta copilului

                    ↓ (conversie maximă: 3 câmpuri)

PAS 2: DATE PARINTE/TUTORE
- Nume + Prenume
- Email (pentru verificare)
- Telefon
- [Opțional] Scanare CI → OCR completează automat
- GDPR checkbox: "Sunt de acord cu prelucrarea datelor"

                    ↓

PAS 3: VERIFICARE EMAIL
- Email trimis cu link de confirmare (expire 24h)
- "Verifică-ți emailul pentru a continua"
- Resend option după 60 secunde

                    ↓

PAS 4: DATE SPORTIV (unul sau mai mulți copii)
- Copil 1:
  - Nume + Prenume
  - Data nașterii (selectie DD/MM/YYYY)
  - Gen (Masculin/Feminin)
  - [Opțional] Grad actual (dacă a mai practicat)
  - [Opțional] Adăugare certificat naștere (foto/scan)
+ Buton "Adaugă alt copil" (pentru familii cu mai mulți sportivi)

                    ↓

PAS 5: SELECTARE GRUPĂ
- Afișare grupe disponibile cu program și sală
- Filtru auto pe vârstă copilului
- Calendar disponibilitate

                    ↓

PAS 6: ACCEPTARE ACORD & CONTRACT
- Preview contract PDF (generat automat)
- Semnătură digitală sau bifă "Accept termenii"
- GDPR: Consimțământ foto/video la evenimente (opțional)

                    ↓

PAS 7: CONFIRMARE
- Rezumat înregistrare
- "Cererea ta a fost trimisă! Te vom contacta în 24h."
- Instrucțiunile pentru prima ședință

                    ↓

[ADMIN NOTIFICAT] → Revizuire & Aprobare → Sportiv creat în sistem
                    → Email confirmare cu cont acces portal
```

### 4.2 Componentă React — RegistrationWizard

```typescript
// src/components/Registration/RegistrationWizard.tsx
// Structura de implementat:

const STEPS = [
  { id: 'tip', label: 'Tip Înregistrare', component: StepTipInregistrare },
  { id: 'guardian', label: 'Date Parinte', component: StepDateGuardian },
  { id: 'verify-email', label: 'Verificare Email', component: StepVerificareEmail },
  { id: 'sportivi', label: 'Date Copii', component: StepDateSportivi },
  { id: 'grupe', label: 'Selectare Grupă', component: StepSelectareGrupa },
  { id: 'contract', label: 'Contract', component: StepContract },
  { id: 'confirmare', label: 'Confirmare', component: StepConfirmare },
];

// State management cu URL persistence pentru revenire
// (localStorage backup dacă userul refresh-uieste)

// URL publică: /inregistrare?club=<club-slug>
// Poate fi accesată fără autentificare
```

### 4.3 Scanare CI cu OCR

**Soluție recomandată:** AWS Textract AnalyzeID (~$0.01/document)

```typescript
// src/api/ocr-ci.ts
// Supabase Edge Function pentru procesare OCR

export async function scanCICard(imageBase64: string): Promise<CIData> {
  // 1. Trimite la AWS Textract AnalyzeID
  const result = await textract.analyzeID({ image: imageBase64 });

  // 2. Extrage câmpuri structurate
  return {
    nume: result.LAST_NAME,
    prenume: result.FIRST_NAME,
    cnp: result.DOCUMENT_NUMBER, // pentru CI românesc
    dataNastere: result.DATE_OF_BIRTH,
    serieCi: result.ID_TYPE,
    // ...
  };

  // 3. Imaginea originală se ȘTERGE imediat după procesare (GDPR!)
  // Nu se stochează imaginea CI
}
```

**Alternativă gratuită:** Google Vision (raw OCR) + librărie `mrz` pentru parsare MRZ

```typescript
// Parsare MRZ gratuită (fără costuri per-call)
import { parse } from 'mrz';

const mrzLines = extractMRZFromOCR(rawText); // regex pentru linii MRZ
const parsed = parse(mrzLines);
// { documentNumber, nationality, birthDate, sex, expirationDate }
```

### 4.4 Interfața Admin — Aprobare Cereri

```
Dashboard Admin → Cereri Înregistrare
┌─────────────────────────────────────────────────────┐
│  🔴 3 cereri noi | 🟡 1 în verificare | ✅ 12 aprobate │
├─────────────────────────────────────────────────────┤
│ Ion Popescu (parinte)          → [Aprobare] [Respinge]│
│  └ Maria Popescu, 8 ani, Fata  → Grupa Copii A        │
│  └ Alex Popescu, 12 ani, Baiat → Grupa Juniori B      │
│  Email: ✅ verificat | GDPR: ✅ acceptat               │
├─────────────────────────────────────────────────────┤
│ Ana Ionescu (parinte)          → [Aprobare] [Respinge]│
│  └ Daria Ionescu, 10 ani, Fata → Grupa Juniori A      │
└─────────────────────────────────────────────────────┘
```

---

## 5. RBAC & SECURITATE

### 5.1 Matrice de Permisiuni Completă

| Resursă | SUPER_ADMIN | ADMIN | ADMIN_CLUB | INSTRUCTOR | PARINTE | SPORTIV |
|---|---|---|---|---|---|---|
| Toate cluburile | R/W | R/W | — | — | — | — |
| Date club propriu | R/W | R/W | R/W | R | — | — |
| Toți sportivii | R/W | R/W | R/W (club) | R (grupe proprii) | R (copii proprii) | R (propriu) |
| Prezență | R/W | R/W | R/W | R/W | R (copii) | R (proprie) |
| Plăți | R/W | R/W | R/W | R (vizualizare) | R/W (copii) | R (proprii) |
| Date medicale | R/W | R/W | R/W | R | R (copii) | R (proprii) |
| CNP/date sensibile | R/W | R | R (mascat) | ❌ | R (proprii copii) | R (propriu) |
| Contracte | R/W | R/W | R/W | R | R/W (semnare) | — |
| Rapoarte | R/W | R/W | R/W (club) | R (limitat) | — | — |
| Cereri înregistrare | R/W | R/W | R/W | — | R (proprii) | — |
| Audit logs | R/W | R | — | — | — | — |

### 5.2 Row Level Security — Politici Noi

```sql
-- RLS pentru cereri_inregistrare
ALTER TABLE cereri_inregistrare ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_vede_toate_cererile_clubului"
  ON cereri_inregistrare FOR ALL
  USING (
    club_id IN (SELECT club_id FROM utilizator_roluri_multicont
                WHERE user_id = auth.uid()
                AND rol_id IN (SELECT id FROM roluri WHERE denumire IN ('ADMIN_CLUB','ADMIN','SUPER_ADMIN_FEDERATIE')))
  );

-- Guardian vede doar propriile cereri
CREATE POLICY "guardian_vede_propria_cerere"
  ON cereri_inregistrare FOR SELECT
  USING (
    guardian_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS pentru guardians
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guardian_vede_propriul_profil"
  ON guardians FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "admin_vede_guardians_club"
  ON guardians FOR SELECT
  USING (
    club_id IN (SELECT get_my_club_ids())
    AND has_admin_access()
  );

-- RLS pentru sportiv_timeline
ALTER TABLE sportiv_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sportiv_vede_propria_timeline"
  ON sportiv_timeline FOR SELECT
  USING (
    sportiv_id IN (
      -- Sportivul însuși
      SELECT id FROM sportivi WHERE user_id = auth.uid()
      UNION
      -- Copiii guardian-ului logat
      SELECT gs.sportiv_id FROM guardian_sportiv gs
      JOIN guardians g ON g.id = gs.guardian_id
      WHERE g.user_id = auth.uid()
    )
  );
```

### 5.3 Criptarea Datelor Sensibile

```sql
-- Extensie pgcrypto pentru criptare AES-256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Functie de criptare CNP (key stocat in Vault sau env)
CREATE OR REPLACE FUNCTION encrypt_cnp(plaintext TEXT)
RETURNS TEXT AS $$
  SELECT encode(
    pgp_sym_encrypt(plaintext, current_setting('app.encryption_key')),
    'base64'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Functie de decriptare (doar pentru roluri autorizate)
CREATE OR REPLACE FUNCTION decrypt_cnp(ciphertext TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Verificare rol
  IF NOT (SELECT has_admin_access()) THEN
    RAISE EXCEPTION 'Acces neautorizat la date sensibile';
  END IF;

  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-criptare la INSERT/UPDATE CNP
CREATE OR REPLACE FUNCTION auto_encrypt_cnp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cnp IS NOT NULL AND NEW.cnp_encrypted IS NULL THEN
    NEW.cnp_encrypted = encrypt_cnp(NEW.cnp);
    NEW.cnp = NULL; -- sterge plain text
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.4 Data Masking în UI

```typescript
// src/utils/dataMasking.ts

// CNP: afișează doar primele 6 cifre (an + luna + zi)
export function maskCNP(cnp: string): string {
  if (!cnp || cnp.length < 13) return '***';
  return cnp.slice(0, 6) + '*'.repeat(7);
  // Ex: 1990115******* → "1990115" = an/luna/zi vizibil, rest mascat
}

// Telefon: afișează ultimele 4 cifre
export function maskPhone(phone: string): string {
  return '****' + phone.slice(-4);
}

// Email: afișează prima literă și domeniu
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
}
```

---

## 6. AUTOMATIZARE & COMUNICARE

### 6.1 Notificări WhatsApp Business API

**Setup recomandat:** Meta Cloud API (direct) — gratis primele 1.000 conversații/lună

```
Meta Business Manager
    ↓
WhatsApp Business Account (WABA)
    ↓
Număr de telefon dedicat (ex: +40 xxx xxx xxx)
    ↓
Template-uri aprobate (24-48h review Meta)
    ↓
Supabase Edge Functions → Meta Graph API
```

**Template-uri de creat (necesită aprobare Meta):**

```
[1] cotizatie_scadenta (UTILITY)
    "Salut {{1}}, cotizația lunară pentru {{2}} este scadentă pe {{3}}.
    Sumă: {{4}} RON. Plătește rapid: {{5}}"

[2] confirmare_plata (UTILITY)
    "Confirmat! Plata de {{1}} RON pentru {{2}} a fost înregistrată.
    Chitanță: {{3}}"

[3] reamintire_antrenament (UTILITY)
    "Mâine, {{1}}, avem antrenament la {{2}}, ora {{3}}.
    Prezent: DA / NU (răspunde cu 1 sau 2)"

[4] cerere_aprobare (UTILITY)
    "Cererea de înregistrare pentru {{1}} a fost APROBATĂ!
    Primul antrenament: {{2}}. Detalii cont: {{3}}"

[5] reactivare_inactiv (MARKETING)
    "Ne-a fost dor, {{1}}! {{2}} te-a ratat la antrenamente.
    Revino cu 50% reducere în {{3}}."
```

### 6.2 Email Automation (SendGrid + Brevo)

**Flow automat implementat cu pg_cron + Supabase Edge Functions:**

```sql
-- Job: verificare zilnica plati scadente → trigger WhatsApp
SELECT cron.schedule(
  'daily-payment-reminders',
  '0 9 * * *', -- 9 AM zilnic
  $$
    SELECT net.http_post(
      url := 'https://[project].supabase.co/functions/v1/send-payment-reminders',
      headers := '{"Authorization": "Bearer [SERVICE_KEY]"}'::jsonb
    );
  $$
);

-- Job: verificare absente → trigger re-engagement (luni dimineata)
SELECT cron.schedule(
  'weekly-absence-check',
  '0 8 * * 1',
  $$
    SELECT net.http_post(
      url := 'https://[project].supabase.co/functions/v1/check-inactive-members',
      headers := '{"Authorization": "Bearer [SERVICE_KEY]"}'::jsonb
    );
  $$
);
```

### 6.3 Pipeline Lead Management

```
LEAD NOU (formular 3 câmpuri)
    ↓ (Imediat — 0-5 minute)
WhatsApp automat: "Salut! Am primit cererea ta. Te contactăm în 1h."
    ↓ (1-2 ore)
Call manual instructor: confirmare + detalii probă
    ↓
LECȚIE DE PROBĂ
    ↓ (Același zi sau D+1)
WhatsApp: "Cum ți-a plăcut? Ofertă specială: prima lună 50%"
    ↓ (D+3 dacă nu răspunde)
Email: Testimoniale + succes stories club
    ↓ (D+7 dacă nu răspunde)
WhatsApp: "Mai avem 2 locuri disponibile în grupa ta de vârstă"
    ↓ (D+14)
FINAL: "Locul tău e rezervat până pe [D+21]"
    ↓
Dacă NU convertit → PIERDUT (quarterly re-engagement)
```

---

## 7. GDPR & CONFORMITATE

### 7.1 Cerințe Specifice România (ANSPDCP)

**Baze legale de prelucrare date sportivi:**
- `Art. 6(1)(b)` — necesar pentru executarea contractului de membru
- `Art. 6(1)(c)` — obligație legală (transmitere date federație, evidențe sportive)
- `Art. 9(2)(a)` — consimțământ explicit pentru date speciale (CNP minor)

**Perioadă de retenție:**
- Date membre active: pe durata calității de membre + 3 ani (prescripție civilă)
- Audituri financiare: 10 ani (Codul Fiscal)
- Date fotografie/video: durată consimțământ sau până la retragere

**Cerințe ANSPDCP pentru prelucrare CNP:**
- Clauza specifică în Nota de Informare
- Temei legal explicit
- Nu se transmite CNP la terți fără consimțământ separat

### 7.2 Right to Be Forgotten — Implementare

```sql
-- Functie de stergere GDPR
CREATE OR REPLACE FUNCTION gdpr_delete_sportiv(p_sportiv_id UUID)
RETURNS void AS $$
BEGIN
  -- 1. Anonimizare (nu stergere - pastrare date agregate)
  UPDATE sportivi SET
    nume = 'ANONIM',
    prenume = 'ANONIM',
    email = NULL,
    cnp_encrypted = NULL,
    telefon = NULL,
    adresa = NULL,
    foto_url = NULL,
    gdpr_sters_la = NOW(),
    status = 'gdpr_sters'
  WHERE id = p_sportiv_id;

  -- 2. Sterge date guardian legate (dacă nu mai are alți copii)
  -- (logica verificata inainte)

  -- 3. Sterge documente din Storage
  -- (apel catre Edge Function separata)

  -- 4. Pastreaza date anonimizate pentru statistici federatie
  -- grad_id, rezultate examene (anonimizate) se pastreaza

  -- 5. Log audit
  INSERT INTO audit_access_log (actiune, tabel_accesat, inregistrare_id)
  VALUES ('GDPR_STERGERE', 'sportivi', p_sportiv_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.3 Consimțământ Foto/Video la Evenimente

```sql
CREATE TABLE gdpr_consimtaminte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sportiv_id UUID REFERENCES sportivi(id),
  guardian_id UUID REFERENCES guardians(id), -- pentru minori
  -- Tipuri consimțământ
  foto_site_web BOOLEAN DEFAULT FALSE,
  foto_social_media BOOLEAN DEFAULT FALSE,
  video_youtube BOOLEAN DEFAULT FALSE,
  foto_materiale_promotionale BOOLEAN DEFAULT FALSE,
  -- Metadata
  versiune_formular TEXT, -- '2026.1'
  acceptat_la TIMESTAMPTZ,
  retras_la TIMESTAMPTZ, -- populat dacă retrage consimțământul
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. PAȘAPORTUL VIRTUAL AL SPORTIVULUI

### 8.1 Vizualizare Timeline — "Gamer Profile"

```
┌─────────────────────────────────────────────────────────────┐
│              PAȘAPORT VIRTUAL — POPESCU MARIA               │
│           Qwan Ki Do | Club Lotus | Înregistrat: Sep 2022   │
├─────────────────────────────────────────────────────────────┤
│  Progres spre CAP 1 DAN:                                    │
│  ████████████████░░░░ 80%                                   │
│  Mai ai: 4 luni vechime + examen                            │
├─────────────────────────────────────────────────────────────┤
│  TIMELINE:                                                   │
│                                                             │
│  📅 Sep 2022  — Înregistrare club                           │
│  🥋 Dec 2022  — THIÊU KHÍ (Grad alb) ✅                    │
│  🏥 Jan 2023  — Viză medicală obținută (valabilă Ian 2024)  │
│  🥋 Jun 2023  — CAP 9 (Grad galben) ✅                     │
│  🏆 Oct 2023  — Competiție Nată. — Locul 1 Thao Quyen      │
│  ⛺ Nov 2023  — Stagiu Național București                   │
│  🥋 Dec 2023  — CAP 8 (Grad portocaliu) ✅                  │
│  🏥 Feb 2024  — Viză medicală reînnoită (val. Feb 2025)     │
│  ⛺ Jul 2024  — Stagiu Internațional Franța                  │
│  🥋 Dec 2024  — CAP 7 (Grad verde) ✅                      │
│  🏆 Mar 2025  — Campionat European — Loc 3 Giao Dau         │
│  🥋 Dec 2025  — CAP 6 (Grad albastru) ✅                   │
│  ⚠️ Feb 2025  — ATENȚIE: Viză medicală expirată!            │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Calculul Progresului spre Grad Următor

```typescript
// src/utils/progressCalc.ts

interface GradProgress {
  gradCurent: Grad;
  gradUrmator: Grad | null;
  procentaj: number;
  conditiiNeindeplinite: string[];
  dataEstimataExamen: Date | null;
}

export function calculeazaProgressGrad(sportiv: Sportiv, grade: Grad[]): GradProgress {
  const gradCurent = grade.find(g => g.id === sportiv.grad_actual_id);
  const gradUrmator = grade.find(g => g.ordine === (gradCurent?.ordine ?? 0) + 1);

  if (!gradUrmator) return { procentaj: 100, conditiiNeindeplinite: [] };

  const conditii: string[] = [];
  let puncteTotal = 0;
  let puncteAccumulate = 0;

  // Condiție 1: Vârstă minimă
  if (gradUrmator.varsta_minima) {
    puncteTotal += 25;
    const varstaActuala = calculeazaVarsta(sportiv.data_nasterii);
    if (varstaActuala >= gradUrmator.varsta_minima) {
      puncteAccumulate += 25;
    } else {
      conditii.push(`Vârstă minimă: ${gradUrmator.varsta_minima} ani (ai ${varstaActuala})`);
    }
  }

  // Condiție 2: Timp minim de așteptare (luni)
  if (gradUrmator.timp_asteptare) {
    puncteTotal += 50;
    const luniDeLaUltimulGrad = lunaDiferenta(sportiv.data_ultimului_grad, new Date());
    if (luniDeLaUltimulGrad >= gradUrmator.timp_asteptare) {
      puncteAccumulate += 50;
    } else {
      const ramas = gradUrmator.timp_asteptare - luniDeLaUltimulGrad;
      conditii.push(`Vechime minimă: mai ai ${ramas} luni`);
      puncteAccumulate += Math.floor((luniDeLaUltimulGrad / gradUrmator.timp_asteptare) * 50);
    }
  }

  // Condiție 3: Viză medicală valabilă
  puncteTotal += 25;
  if (sportiv.viza_medicala_valabila) {
    puncteAccumulate += 25;
  } else {
    conditii.push('Viză medicală expirată sau lipsă');
  }

  return {
    gradCurent,
    gradUrmator,
    procentaj: Math.floor((puncteAccumulate / puncteTotal) * 100),
    conditiiNeindeplinite: conditii,
    dataEstimataExamen: calculeazaDataExamen(gradUrmator)
  };
}
```

---

## 9. STACK TEHNIC RECOMANDAT

### 9.1 Tehnologii Noi de Adăugat

| Componentă | Soluție | Alternativă | Cost estimat |
|---|---|---|---|
| **PDF Contracte** | `@react-pdf/renderer` | Puppeteer + Browserless | Gratuit |
| **E-semnătură** | Eversign Professional | DocuSign Standard | $40/lună |
| **OCR ID Scanare** | AWS Textract AnalyzeID | Google Vision + mrz lib | $0.01/scan |
| **WhatsApp** | Meta Cloud API (direct) | Twilio | €0-30/lună |
| **SMS Fallback** | SMSLINK.ro | Twilio SMS | €20-50/lună |
| **Email Tranzacțional** | SendGrid (free tier) | Brevo | $0-20/lună |
| **Email Marketing** | Brevo (free tier) | Mailchimp | $0-25/lună |
| **Plată Online** | Netopia Payments (RO) | Stripe | 1.5-2% comision |
| **Storage documente** | Supabase Storage (existent) | AWS S3 | $0.023/GB |
| **Criptare DB** | pgcrypto (PostgreSQL) | Vault by Supabase | Gratuit |

### 9.2 Netopia vs Stripe pentru Plăți Online Românești

**Netopia Payments (Mobilpay):**
- Procesator românesc, integrat cu băncile locale
- Suportă RON nativ, carduri românești, OP bancar
- Cerut de multe instituții publice românești
- Comision: ~1.5% + 0.25 RON/tranzacție
- Timp procesare aprobare cont: 5-10 zile lucrătoare

**Stripe:**
- Standard global, excelentă documentație API
- Suportă RON din 2023
- Comision: 1.4% + €0.25 (card EU) sau 2.9% + €0.25 (non-EU)
- Instant setup, documentație excelentă

**Recomandare:** Netopia pentru clubs românești (acceptanță mai bună la plătitori locali) + Stripe ca fallback pentru stagii/competiții internaționale.

### 9.3 Arhitectura Completă

```
┌────────────────────────────────────────────────────────────┐
│                    PORTAL PHI HAU v2.0                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  FRONTEND (React + TypeScript + Vite)                      │
│  ├── /app — Dashboard (autentificat)                       │
│  ├── /inregistrare — Wizard public (fără auth)             │
│  ├── /portal-parinte — Dashboard parinte                   │
│  └── /proba — Landing lecție probă                         │
│                                                            │
│  BACKEND (Supabase)                                        │
│  ├── PostgreSQL + RLS + pgcrypto                          │
│  ├── Auth (email/password + magic link)                    │
│  ├── Edge Functions:                                       │
│  │   ├── send-whatsapp                                     │
│  │   ├── send-email                                        │
│  │   ├── generate-pdf-contract                             │
│  │   ├── process-ocr-ci                                    │
│  │   ├── send-payment-reminders (cron)                     │
│  │   └── process-registration                              │
│  ├── Storage:                                              │
│  │   ├── contracte/ (presigned URLs, 5 min expiry)         │
│  │   └── avatare-sportivi/                                 │
│  └── pg_cron: jobs automate                               │
│                                                            │
│  EXTERNAL APIs                                             │
│  ├── Meta WhatsApp Business API                            │
│  ├── SendGrid (email tranzacțional)                        │
│  ├── Brevo (email marketing)                               │
│  ├── Eversign (e-semnătură)                                │
│  ├── AWS Textract (OCR CI)                                 │
│  └── Netopia Payments (plăți online)                       │
└────────────────────────────────────────────────────────────┘
```

---

## 10. PLAN DE IMPLEMENTARE — FAZE

### FAZA 1 — Fundația (Săptămânile 1-3)
**Prioritate: Critic**

- [ ] Migrație DB: tabele `guardians`, `guardian_sportiv`, `cereri_inregistrare`, `sportiv_timeline`
- [ ] Index unic anti-duplicate pe sportivi
- [ ] RLS policies pentru noile tabele
- [ ] Criptare CNP cu pgcrypto
- [ ] Tabel `audit_access_log` + trigger-uri

### FAZA 2 — Wizard Înregistrare Online (Săptămânile 4-6)
**Prioritate: Critic**

- [ ] Pagina publică `/inregistrare` (fără autentificare necesară)
- [ ] Componenta `RegistrationWizard` (7 pași)
- [ ] Verificare email cu token
- [ ] Formular multi-copil
- [ ] GDPR consent flow
- [ ] Dashboard admin: "Cereri Înregistrare" cu aprobare/respingere
- [ ] Email de confirmare (SendGrid)

### FAZA 3 — Portal Parinte (Săptămânile 7-9)
**Prioritate: Înalt**

- [ ] Rol `PARINTE` în sistem cu dashboard dedicat
- [ ] Vizibilitate date copii (prezență, plăți, grade)
- [ ] Notificări în aplicație pentru parinte
- [ ] Pașaport Virtual (timeline vizual)
- [ ] Bară de progres spre grad următor

### FAZA 4 — Automatizare Comunicare (Săptămânile 10-12)
**Prioritate: Mediu**

- [ ] Integrare WhatsApp Business API
- [ ] Template-uri mesaje (5 template-uri de bază)
- [ ] pg_cron jobs: payment reminders, absence check
- [ ] Lead management (formular lectie probă)
- [ ] Pipeline follow-up automat (D+0, D+3, D+7, D+14)

### FAZA 5 — Contracte & Plăți Online (Săptămânile 13-16)
**Prioritate: Mediu**

- [ ] Generare PDF contracte (`@react-pdf/renderer`)
- [ ] Integrare Eversign pentru e-semnătură
- [ ] Integrare Netopia Payments pentru plăți online
- [ ] Modul re-engagement (sportivi inactivi 14+ zile)

### FAZA 6 — OCR & Kiosk (Săptămânile 17-20)
**Prioritate: Low/Nice-to-have**

- [ ] Integrare AWS Textract pentru scanare CI
- [ ] Modul "Kiosk Check-in" pentru tabletă la sală
- [ ] QR code personal per sportiv pentru check-in rapid
- [ ] Dashboard Red Alerts (vize expirate, rate neplatite)

---

## 11. ESTIMARE COSTURI INFRASTRUCTURĂ LUNARE

### Club Mic (< 50 membri)

| Serviciu | Cost/lună |
|---|---|
| Supabase Pro | $25 |
| SendGrid (free tier) | $0 |
| WhatsApp (< 1000 conv.) | €0 |
| Eversign Basic | $9.99 |
| **TOTAL** | **~€32/lună** |

### Club Mediu (50-200 membri)

| Serviciu | Cost/lună |
|---|---|
| Supabase Pro | $25 |
| SendGrid Essentials | $19.95 |
| WhatsApp (~500 conv.) | ~€28 |
| Eversign Professional | $39.99 |
| AWS Textract (50 scan/lună) | ~$0.50 |
| SMSLINK.ro (100 SMS) | ~€5 |
| **TOTAL** | **~€105/lună** |

### Federație (500+ membri, multi-club)

| Serviciu | Cost/lună |
|---|---|
| Supabase Pro (2 proiecte) | $50 |
| SendGrid Pro | $89.95 |
| WhatsApp (~2000 conv.) | ~€100 |
| Eversign Enterprise | Custom ~$150 |
| AWS Textract | ~$5 |
| **TOTAL** | **~€380/lună** |

---

## 12. INSIGHTS SUPLIMENTARE DIN CERCETAREA GLOBALĂ

### 12.1 Parsarea CNP Românesc — Soluție Gratuită (Zero API Cost)

CNP-ul românesc conține deja data nașterii și sexul codificate. Nicio nevoie de OCR pentru aceste câmpuri:

```typescript
// src/utils/cnpParser.ts

export interface CNPData {
  sex: 'M' | 'F';
  dataNastere: Date;
  judet: string;
  valid: boolean;
}

export function parseCNP(cnp: string): CNPData | null {
  if (!cnp || cnp.length !== 13 || !/^\d{13}$/.test(cnp)) return null;

  const s = parseInt(cnp[0]);
  const an2 = parseInt(cnp.slice(1, 3));
  const luna = parseInt(cnp.slice(3, 5));
  const zi = parseInt(cnp.slice(5, 7));

  // Calculare secol + sex
  let an: number;
  let sex: 'M' | 'F';

  if (s === 1 || s === 2) { an = 1900 + an2; sex = s === 1 ? 'M' : 'F'; }
  else if (s === 3 || s === 4) { an = 1800 + an2; sex = s === 3 ? 'M' : 'F'; }
  else if (s === 5 || s === 6) { an = 2000 + an2; sex = s === 5 ? 'M' : 'F'; }
  else return null;

  const dataNastere = new Date(an, luna - 1, zi);

  // Validare cifra de control
  const coeficienti = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  const suma = coeficienti.reduce((acc, c, i) => acc + c * parseInt(cnp[i]), 0);
  const rest = suma % 11;
  const cifraControl = rest < 10 ? rest : 1;
  const valid = cifraControl === parseInt(cnp[12]);

  return { sex, dataNastere, judet: cnp.slice(7, 9), valid };
}

// Utilizare în formularul de înregistrare:
// Când parentele introduce CNP-ul copilului → auto-completare DOB + sex
// Reducere cu 2 câmpuri din formular → conversie mai bună
```

### 12.2 Pașaportul Virtual — Verificare Publică prin QR Code

Federația poate emite un QR code pe certificatele fizice care permite verificarea online fără autentificare:

```sql
-- View public (fără autentificare necesară)
CREATE VIEW public_passport_view AS
SELECT
  s.prenume || ' ' || s.nume AS athlete_name,
  g.nume AS grad_curent,
  ig.data_obtinere AS data_grad,
  ig.numar_certificat, -- ex: RFKDA-2026-0042
  c.nume AS club,
  s.numar_wqf -- numărul mondial WQF dacă există
FROM sportivi s
JOIN istoric_grade ig ON ig.sportiv_id = s.id AND ig.is_curent = TRUE
JOIN grade g ON g.id = ig.grad_id
JOIN cluburi c ON c.id = s.club_id
WHERE s.pasaport_public = TRUE; -- opt-in GDPR

-- URL QR: https://portal.rfkda.ro/pasaport/{numar_certificat}
-- Endpoint public (fără auth), citește doar din public_passport_view
```

**Câmpuri de adăugat la tabela `sportivi`:**
```sql
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS pasaport_public BOOLEAN DEFAULT FALSE;
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS numar_wqf TEXT; -- World Qwan Ki Do Federation
ALTER TABLE sportivi ADD COLUMN IF NOT EXISTS numar_rfkda TEXT; -- Federație Română
```

**Câmp de adăugat la `istoric_grade`:**
```sql
ALTER TABLE istoric_grade ADD COLUMN IF NOT EXISTS numar_certificat TEXT;
-- Format: RFKDA-{YYYY}-{NNN} ex: RFKDA-2026-0042
-- Generat automat la finalizarea examenului
ALTER TABLE istoric_grade ADD COLUMN IF NOT EXISTS is_curent BOOLEAN DEFAULT FALSE;
```

### 12.3 PayU vs Netopia vs Stripe — Decizie Finală pentru România

Cercetarea Agent 1 confirmă că pentru România există 3 opțiuni principale:

| Processor | Avantaj Principal | Comision | Setup |
|---|---|---|---|
| **PayU** (Naspers Group) | Cel mai utilizat în RO, integrare cu băncile locale | ~1.5% + 0.30 RON | 5-7 zile |
| **Netopia/Mobilpay** | Acceptat de instituții publice și federații | ~1.5% + 0.25 RON | 5-10 zile |
| **Stripe** | Documentație excelentă, suportă RON din 2023 | 1.4-2.9% + €0.25 | Instant |

**Recomandare finală:** PayU pentru plăți principale (cel mai cunoscut la părinții români) + Stripe ca alternativă pentru eventuale plăți internaționale (stagii, competiții europene).

### 12.4 Cazul Jackrabbit Technologies — Pattern de Implementat

Jackrabbit (lider în arte marțiale SUA) folosește un model care trebuie preluat:

```
families (unitatea de billing)
  └── students[] (profilurile copiilor)
        └── enrollments[] (înscrieri în programe)
  └── contacts[] (parinte1, parinte2, contact_urgenta)
        └── access_level (poate_autoriza_plati, contact_urgenta_only)
  └── transactions[] (plăți la nivel de familie)
        └── allocations[] (defalcate per copil)
```

**Ce înseamnă pentru Portal Phi Hau:**
- Tabela `familii` existentă devine unitatea de billing → rămâne
- Tabela nouă `guardians` = Contacts din Jackrabbit
- Tabela nouă `guardian_sportiv` = join table cu `access_level`
- Tabela `plati` primește `familie_id` ca FK principal (deja există parțial)

### 12.5 Reguli de Eligibilitate QKD — Logica "Progression Graph"

Cele mai bune sisteme pentru arte marțiale modelează gradele ca **graf de progresie**, nu simplu integer:

```sql
-- Extensie la tabela grade existentă
ALTER TABLE grade ADD COLUMN IF NOT EXISTS
  prerequisit_grad_id UUID REFERENCES grade(id); -- grad anterior obligatoriu

ALTER TABLE grade ADD COLUMN IF NOT EXISTS
  luni_asteptare_minime INTEGER DEFAULT 6; -- timp minim între grade

ALTER TABLE grade ADD COLUMN IF NOT EXISTS
  prezente_minime INTEGER; -- prezențe minime obligatorii (dacă se implementează)

-- Funcție: verificare automată eligibilitate pentru examen
CREATE OR REPLACE FUNCTION verifica_eligibilitate_examen(
  p_sportiv_id UUID,
  p_grad_tinta_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_sportiv sportivi%ROWTYPE;
  v_grad_tinta grade%ROWTYPE;
  v_grad_curent grade%ROWTYPE;
  v_data_ultimului_grad DATE;
  v_luni_trecute INTEGER;
  v_varsta INTEGER;
  v_probleme TEXT[] := '{}';
BEGIN
  SELECT * INTO v_sportiv FROM sportivi WHERE id = p_sportiv_id;
  SELECT * INTO v_grad_tinta FROM grade WHERE id = p_grad_tinta_id;
  SELECT * INTO v_grad_curent FROM grade WHERE id = v_sportiv.grad_actual_id;

  -- Verificare: gradul țintă este direct următor?
  IF v_grad_curent.ordine + 1 != v_grad_tinta.ordine THEN
    v_probleme := v_probleme || 'Gradul țintă nu este direct următor gradului curent';
  END IF;

  -- Verificare: vârsta minimă
  v_varsta := DATE_PART('year', AGE(v_sportiv.data_nasterii));
  IF v_grad_tinta.varsta_minima IS NOT NULL AND v_varsta < v_grad_tinta.varsta_minima THEN
    v_probleme := v_probleme || format(
      'Vârstă insuficientă: %s ani (minim %s)', v_varsta, v_grad_tinta.varsta_minima
    );
  END IF;

  -- Verificare: timp de așteptare
  SELECT MAX(data_obtinere) INTO v_data_ultimului_grad
  FROM istoric_grade WHERE sportiv_id = p_sportiv_id;

  v_luni_trecute := DATE_PART('month', AGE(v_data_ultimului_grad));
  IF v_luni_trecute < v_grad_tinta.luni_asteptare_minime THEN
    v_probleme := v_probleme || format(
      'Vechime insuficientă: %s luni (minim %s)', v_luni_trecute, v_grad_tinta.luni_asteptare_minime
    );
  END IF;

  -- Verificare: viză medicală valabilă
  IF NOT EXISTS (
    SELECT 1 FROM vize_medicale
    WHERE sportiv_id = p_sportiv_id
    AND data_expirare > CURRENT_DATE
    AND status = 'valida'
  ) THEN
    v_probleme := v_probleme || 'Viză medicală expirată sau lipsă';
  END IF;

  RETURN jsonb_build_object(
    'eligibil', array_length(v_probleme, 1) = 0,
    'probleme', to_jsonb(v_probleme)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 12.6 ANSPDCP — Documente Obligatorii (Checklist)

Pe baza cercetării Agent 1 + ghidurilor ANSPDCP:

- [ ] **Registrul Activităților de Prelucrare** (obligatoriu per Art. 30 GDPR)
- [ ] **Nota de Informare** în română (afișată la înregistrare, pe site, la sală)
- [ ] **Acord de Prelucrare Date (DPA)** cu Supabase (disponibil pe site-ul lor)
- [ ] **DPA cu SendGrid/Brevo** (procesator email)
- [ ] **DPA cu PayU/Netopia** (procesator plăți)
- [ ] **Procedură Notificare Breșă** (ANSPDCP în max 72h de la descoperire)
- [ ] **Politică de Retenție** pe categorii de date
- [ ] **Formular Cerere Ștergere Date** (Right to be Forgotten — accesibil în portal)

---

## CONCLUZIE & NEXT STEPS

**Prioritatea imediată** este **Faza 1 + 2**: fundația bazei de date și wizard-ul de înregistrare online. Acestea vor transforma complet experiența de onboarding și vor elimina 80% din munca manuală a secretariatului.

**Quick wins (poate fi implementat în < 1 săptămână):**
1. Index anti-duplicate pe sportivi (1 SQL)
2. Tabelul `cereri_inregistrare` + pagina admin de vizualizare
3. Formular simplu `/inregistrare` cu 3 câmpuri → email la admin

**Strategia corectă:** Nu înlocuiți ce funcționează. Adăugați strat cu strat, testând cu utilizatori reali după fiecare fază.

---

*Document generat pe baza cercetării sistemelor de management sportiv globale (TeamSnap, Zen Planner, SportEasy, Martialytics), analizei codebase-ului Portal Phi Hau și bunelor practici de securitate GDPR/EU.*
