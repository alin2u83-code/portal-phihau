import { supabase } from '../supabaseClient';
import { Grad } from '../types';

export interface ImportReport {
  succes: number;
  erori: number;
  detalii_erori: string[];
}

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateCNP = (cnp: string) => /^\d{13}$/.test(cnp);

export const importSportivi = async (
  dateSportivi: any[],
  activeClubId: string,
  defaultGrupaId: string,
  grade: Grad[]
): Promise<ImportReport> => {
  const report: ImportReport = { succes: 0, erori: 0, detalii_erori: [] };

  // Helper to find grade ID
  const findGradeId = (gradNume: string | null | undefined): string | null => {
    if (!gradNume) return grade.find(g => g.ordine === 0)?.id || null;
    const found = grade.find(g => g.nume.toLowerCase() === gradNume.trim().toLowerCase());
    return found ? found.id : (grade.find(g => g.ordine === 0)?.id || null);
  };

  for (let i = 0; i < dateSportivi.length; i++) {
    const row = dateSportivi[i];
    const rowNum = i + 1;
    const numeComplet = `${row.nume || ''} ${row.prenume || ''}`.trim();

    try {
      // 1. Validări de bază
      if (!row.nume || !row.prenume) throw new Error("Lipsesc nume sau prenume");
      if (!row.email && !row.cnp) throw new Error("Lipsesc email și CNP");
      
      if (row.email && !validateEmail(row.email)) throw new Error(`Email invalid: ${row.email}`);
      if (row.cnp && !validateCNP(row.cnp)) throw new Error(`CNP invalid: ${row.cnp}`);

      // 2. Validare dată naștere
      let dataNasterii = row.data_nasterii?.trim() || null;
      if (dataNasterii) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNasterii) || isNaN(Date.parse(dataNasterii))) {
          throw new Error(`Data nașterii invalidă: ${dataNasterii}`);
        }
      }

      const normalizeGen = (gen: string | null | undefined): 'Masculin' | 'Feminin' | null => {
        if (!gen) return null;
        const g = gen.trim().toLowerCase();
        if (['m', 'masculin', 'masc'].includes(g)) return 'Masculin';
        if (['f', 'feminin', 'fem'].includes(g)) return 'Feminin';
        return null;
      };

      // 3. Pregătire date
      const sportivData = {
        nume: row.nume.trim().replace(/[?]/g, ''),
        prenume: row.prenume.trim().replace(/[?]/g, ''),
        email: row.email?.toLowerCase().trim() || null,
        cnp: row.cnp?.trim() || null,
        data_nasterii: dataNasterii,
        telefon: row.telefon?.trim() || null,
        adresa: row.adresa?.trim() || null,
        gen: normalizeGen(row.gen),
        data_inscrierii: row.data_inscrierii || new Date().toISOString().split('T')[0],
        club_id: row.club_id || activeClubId,
        status: row.status || 'Activ',
        grupa_id: row.grupa_id || defaultGrupaId,
        grad_actual_id: findGradeId(row.grad_actual),
      };

      // 4. Upsert logic
      const { data: existing, error: fetchError } = await supabase
        .from('sportivi')
        .select('id')
        .or(`email.eq.${sportivData.email},cnp.eq.${sportivData.cnp}`)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('sportivi')
          .update(sportivData)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('sportivi')
          .insert(sportivData);
        if (insertError) throw insertError;
      }

      report.succes++;
    } catch (err: any) {
      report.erori++;
      report.detalii_erori.push(`Rândul ${rowNum} (${numeComplet || 'Fără nume'}): ${err.message}`);
    }
  }

  return report;
};
