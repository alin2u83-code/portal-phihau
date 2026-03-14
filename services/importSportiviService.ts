import { supabase } from '../supabaseClient';

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
  defaultGrupaId: string
): Promise<ImportReport> => {
  const report: ImportReport = { succes: 0, erori: 0, detalii_erori: [] };

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

      // 3. Pregătire date
      const sportivData = {
        nume: row.nume.trim(),
        prenume: row.prenume.trim(),
        email: row.email?.toLowerCase().trim() || null,
        cnp: row.cnp?.trim() || null,
        data_nasterii: dataNasterii,
        telefon: row.telefon?.trim() || null,
        adresa: row.adresa?.trim() || null,
        gen: row.gen || null,
        data_inscrierii: row.data_inscrierii || new Date().toISOString().split('T')[0],
        club_id: row.club_id || activeClubId,
        status: row.status || 'Activ',
        grupa_id: row.grupa_id || defaultGrupaId,
        grad_actual_id: row.grad_actual_id || null,
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
