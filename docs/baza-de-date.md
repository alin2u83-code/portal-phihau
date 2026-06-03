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
