import { supabase } from '../supabaseClient';
import { Grad } from '../types';

export interface ImportReport {
  succes: number;
  erori: number;
  detalii_erori: string[];
}

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateCNP = (cnp: string) => /^\d{13}$/.test(cnp);

const generateEmail = (prenume: string, nume: string): string => {
  const sanitize = (s: string) =>
    s.toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
  return `${sanitize(prenume)}.${sanitize(nume)}@frqkd.ro`;
};

export const importSportivi = async (
  dateSportivi: any[],
  activeClubId: string,
  defaultGrupaId: string,
  grade: Grad[]
): Promise<ImportReport> => {
  const report: ImportReport = { succes: 0, erori: 0, detalii_erori: [] };

  // Helper to find grade ID
  const findGradeId = (gradNume: string | null | undefined): string | null => {
    const debutantGrade = grade.find(g => g.ordine === 0 || g.nume.toLowerCase() === 'debutant');

    if (!gradNume || gradNume.trim() === '' || gradNume.trim().toLowerCase() === 'debutant') {
      return debutantGrade ? debutantGrade.id : null;
    }

    const trimmed = gradNume.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) return trimmed;

    const found = grade.find(g => g.nume.toLowerCase() === trimmed.toLowerCase());
    return found ? found.id : (debutantGrade ? debutantGrade.id : null);
  };

  for (let i = 0; i < dateSportivi.length; i++) {
    const row = dateSportivi[i];
    const rowNum = i + 1;
    const numeComplet = `${row.nume || ''} ${row.prenume || ''}`.trim();

    try {
      // 1. Validări de bază
      if (!row.nume || !row.prenume) throw new Error("Lipsesc nume sau prenume");

      if (row.email && !validateEmail(row.email)) throw new Error(`Email invalid: ${row.email}`);
      if (row.cnp && !validateCNP(row.cnp)) throw new Error(`CNP invalid: ${row.cnp}`);

      // 2. Validare și normalizare dată naștere
      let dataNasterii: string | null = null;
      const rawDate = row.data_nasterii?.trim();
      if (rawDate) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          dataNasterii = rawDate;
        } else {
          // Acceptă DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
          const m = rawDate.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
          if (m) {
            const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            const d = new Date(iso);
            if (!isNaN(d.getTime()) && d.getFullYear() === +m[3] && d.getMonth() + 1 === +m[2] && d.getDate() === +m[1]) {
              dataNasterii = iso;
            }
          }
        }
        if (!dataNasterii) throw new Error(`Data nașterii invalidă: ${rawDate}`);
      }

      const normalizeGen = (gen: string | null | undefined): 'Masculin' | 'Feminin' | null => {
        if (!gen) return null;
        const g = gen.trim().toLowerCase();
        if (['m', 'masculin', 'masc', 'barbat', 'bărbat', 'b'].includes(g)) return 'Masculin';
        if (['f', 'feminin', 'fem', 'femeie', 'f'].includes(g)) return 'Feminin';
        return null;
      };

      // 3. Pregătire date - Eliminăm cheile care nu există în schema bazei de date (grad_actual)
      const gradId = findGradeId(row.grad_actual || row.grad_actual_id);
      if (!gradId) throw new Error("Nu s-a găsit gradul specificat și nu există grad implicit (Debutant)");

      const numeClean = row.nume.trim().replace(/[?]/g, '');
      const prenumeClean = row.prenume.trim().replace(/[?]/g, '');
      const emailResolved = row.email?.toLowerCase().trim() || generateEmail(prenumeClean, numeClean);

      const sportivData = {
        nume: numeClean,
        prenume: prenumeClean,
        email: emailResolved,
        cnp: row.cnp?.trim() || null,
        data_nasterii: dataNasterii,
        telefon: row.telefon?.trim() || null,
        adresa: row.adresa?.trim() || null,
        gen: normalizeGen(row.gen),
        data_inscrierii: row.data_inscrierii || new Date().toISOString().split('T')[0],
        club_id: row.club_id || activeClubId,
        status: row.status || 'Activ',
        grupa_id: row.grupa_id || defaultGrupaId,
        grad_actual_id: gradId,
      };

      // 4. Upsert logic — căutare duplicat după email/CNP sau fallback pe nume+dată naștere
      let existingQuery = supabase.from('sportivi').select('id');
      if (sportivData.email && sportivData.cnp) {
        existingQuery = existingQuery.or(`email.eq.${sportivData.email},cnp.eq.${sportivData.cnp}`);
      } else if (sportivData.email) {
        existingQuery = existingQuery.eq('email', sportivData.email);
      } else if (sportivData.cnp) {
        existingQuery = existingQuery.eq('cnp', sportivData.cnp);
      } else if (sportivData.data_nasterii) {
        existingQuery = existingQuery
          .eq('nume', sportivData.nume)
          .eq('prenume', sportivData.prenume)
          .eq('data_nasterii', sportivData.data_nasterii);
      } else {
        existingQuery = existingQuery
          .eq('nume', sportivData.nume)
          .eq('prenume', sportivData.prenume);
      }
      const { data: existing, error: fetchError } = await existingQuery.maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('sportivi')
          .update(sportivData)
          .eq('id', existing.id);
        if (updateError) throw updateError;
        
        // Ensure istoric_grade exists for this grade
        const { error: istoricError } = await supabase
          .from('istoric_grade')
          .upsert({
            sportiv_id: existing.id,
            grad_id: gradId,
            data_obtinere: sportivData.data_inscrierii,
            observatii: 'Import inițial'
          }, { onConflict: 'sportiv_id,grad_id', ignoreDuplicates: true });
        if (istoricError) throw istoricError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('sportivi')
          .insert(sportivData)
          .select('id')
          .single();
        if (insertError) throw insertError;
        
        if (inserted) {
          const { error: istoricError } = await supabase
            .from('istoric_grade')
            .insert({
              sportiv_id: inserted.id,
              grad_id: gradId,
              data_obtinere: sportivData.data_inscrierii,
              observatii: 'Import inițial'
            });
          if (istoricError) throw istoricError;
        }
      }

      report.succes++;
    } catch (err: any) {
      report.erori++;
      report.detalii_erori.push(`Rândul ${rowNum} (${numeComplet || 'Fără nume'}): ${err.message}`);
    }
  }

  return report;
};
