# Baza de Date — Schema Supabase

## Tabele principale

### Utilizatori și autentificare
| Tabel | Descriere |
|-------|-----------|
| `users` (Supabase Auth) | Autentificare nativă Supabase |
| `user_profiles` | Profil extins: nume, prenume, club_id, foto |
| `user_roles` | Roluri utilizator — M:N user ↔ rol+club. Un user poate avea roluri la cluburi diferite |
| `roles` | Nomenclator roluri: SPORTIV, INSTRUCTOR, ADMIN_CLUB, SUPER_ADMIN_FEDERATIE |

### Organizare
| Tabel | Descriere |
|-------|-----------|
| `cluburi` | Cluburi afiliate federației. `theme_config` JSON pentru personalizare |
| `federatie` | Date federație (unul singur) |
| `locatii` | Săli de antrenament, locații examene |
| `grupe` | Grupe de antrenament per club. `program` JSONB cu orarul săptămânal |
| `orar_saptamanal` | Alternativ la program JSONB — rânduri per zi+oră |

### Sportivi
| Tabel | Descriere |
|-------|-----------|
| `sportivi` | Profil complet: date personale, grad actual, status, abonament |
| `sportivi_grupe_secundare` | M:N sportiv ↔ grupă (pe lângă grupa primară din sportivi.grupa_id) |
| `familii` | Grupare sportivi în familie pentru abonament family |
| `vizite_medicale` | Vize medicale cu dată expirare |
| `istoricGrade` | Istoria obținerii gradelor per sportiv |

### Examene
| Tabel | Descriere |
|-------|-----------|
| `sesiuni_examene` | Sesiuni programate (Vara/Iarna, locație, comisie) |
| `inscrieri_examene` | Înscrierea unui sportiv la o sesiune + grad susținut + note + rezultat |
| `grade` | Nomenclator grade QwanKiDo (ordine, vârstă minimă, timp așteptare) |

### Antrenamente și prezență
| Tabel | Descriere |
|-------|-----------|
| `antrenamente` | Instanțe fizice de antrenament (dată, oră, grupă) |
| `prezenta` | Prezența unui sportiv la un antrenament (status: prezent/absent/tard) |
| `anunturi_prezenta` | Anunț anticipat sportiv (Confirm/Intarziat/Absent) |

### Financiar
| Tabel | Descriere |
|-------|-----------|
| `plati` | Facturi/datorii per sportiv/familie (status: Achitat/Neachitat/Parțial) |
| `tranzactii` | Plăți efective (cash/transfer). Leagă mai multe plăti.id |
| `tipuri_abonament` | Configurare abonamente per club (preț, nr membri) |
| `reduceri` | Reduceri aplicabile (procent sau sumă fixă) |
| `taxe_anuale_config` | Configurare taxă anuală pe an + club |
| `vize_sportiv` | Taxa anuală achitată per sportiv per an |
| `deconturi_federatie` | Sume club → federație per activitate |
| `decont_sportivi` | Junction: sportivi incluși într-un decont |

### Competiții
| Tabel | Descriere |
|-------|-----------|
| `competitii` | Competiție (tip: tehnica/giao_dau/cvd, status, taxe) |
| `probe_competitie` | Probele dintr-o competiție (thao_quyen, giao_dau etc.) |
| `categorii_competitie` | Categorii per probă (vârstă, gen, grad, tip participare) |
| `inscrieri_competitie` | Înscriere individuală sportiv la categorie |
| `echipe_competitie` | Echipă înscrisă + membri |
| `inlantuiri` | Secvențe tehnice (înlănțuiri) per grad |
| `inlantuiri_grade` | Care înlănțuiri sunt permise per grad + probă |
| `categorii_template` | Template-uri reutilizabile de categorii |

### Alte
| Tabel | Descriere |
|-------|-----------|
| `knowledge_base` | Articole RAG cu embedding vector(768) pentru AI assistant |
| `stagii_cvd_participare` | Participare sportiv la stagiu CVD |
| `evenimente` | Evenimente calendar (stagii, competiții) |
| `anunturi_generale` | Notificări broadcast în aplicație |
| `cereri_inscriere` | Cereri înregistrare online (neimplementat complet) |

## Convenții DB

- Toate tabelele au `id UUID DEFAULT gen_random_uuid()`
- Coloane de timestamp: `created_at TIMESTAMPTZ DEFAULT now()`
- RLS activat pe toate tabelele cu date sensibile
- Funcții SQL helper în `sql/SUPABASE_SQL_FUNCTIONS.md`
- Migrații cronologice în `sql/migrations/`

## Views importante

- `vedere_prezenta_sportiv` — prezențe cu detalii grupă/club (folosit în rapoarte)
- `vizualizare_plati` — plăți cu detalii sportiv (pentru jurnal încasări)
- `istoricPlatiDetaliat` — plăți cu total încasat și rest de plată

## Acces extern la competiții (Faza 36)

| Tabel | Descriere |
|-------|-----------|
| `acces_competitie_extern` | Grant per `user_id` + `competitie_id` + `club_id` (`activ`, `email`, `nume`, `cerere_id`, `creat_de`). RLS: utilizatorul își vede propriile granturi; federația ALL. Nu are FORCE RLS. |
| `cereri_acces_competitie` | Cereri anonime de acces: `competitie_id`, `email`, `nume`, `club_id`, `mesaj`, `status` (`in_asteptare`/`aprobata`/`respinsa`), `motiv_respingere`, `procesat_la`, `procesat_de`. Index unic parțial pe cererile în așteptare. Anonimul nu citește nimic; scrie doar prin RPC. |

Rol nou în `roluri`: `REPREZENTANT_COMPETITIE` (rândul de rol are `club_id` și `sportiv_id` NULL).

**Funcții helper (SECURITY DEFINER, STABLE, fără execuție pentru `anon`):** `este_doar_extern()`, `acces_extern_competitie(competitie, club)`, `acces_extern_la_competitie(competitie)`, `acces_extern_la_club(club)`, `acces_extern_la_sportiv(sportiv)`, `acces_extern_sportiv_competitie`, `competitie_deschisa_inscrieri(competitie)`, `sportiv_apartine_clubului(sportiv, club)`, `categorie_apartine_competitiei(categorie, competitie)`.

**RPC-uri:**
- `get_competitie_publica(p_id)` — anon; teaser (fără draft).
- `trimite_cerere_acces(p_competitie, p_email, p_nume, p_club, p_mesaj)` — anon; întoarce `ok`/`deja_trimisa` sau excepție (`date_invalide`, `competitie_indisponibila`, `club_invalid`, `prea_multe_cereri`).
- `vize_club_competitie(p_competitie, p_club)` — authenticated; vizele clubului din grant.
- `user_id_dupa_email(p_email)` — doar `service_role` (folosit de endpointul de aprobare).

**RLS:** migrațiile `20261106a` (fundație), `20261106b` (scriere club-scoped în inscrieri/echipe/competitii), `20261106c` (politici `ext_p_*`, `ext_r_*`, `ext_r_deny_all` pe 120 tabele, `ext_r_storage_deny`, trigger `trg_extern_protejeaza_campuri`; view-urile `vedere_prezenta_sportiv` și `vedere_istoric_grade_sportiv` trecute pe `security_invoker`).

**Gap cunoscut:** `cluburi` nu poate fi citit de `anon` (listă goală); formularul „Solicită acces" are nevoie de un RPC public `lista_cluburi_publice()` (vezi `36-VERIFICARE.md`).
