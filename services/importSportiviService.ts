import { supabase } from '../supabaseClient';

export interface ImportReport {
  succes: number;
  erori: number;
  detalii_erori: string[];
}

export const importSportivi = async (
  dateSportivi: any[],
  activeClubId: string,
  defaultGrupaId: string
): Promise<ImportReport> => {
  const report: ImportReport = { succes: 0, erori: 0, detalii_erori: [] };

  for (let i = 0; i < dateSportivi.length; i++) {
    const row = dateSportivi[i];
    const rowNum = i + 1;

    try {
      // Validare de bază
      if (!row.nume || !row.prenume || (!row.email && !row.cnp)) {
        throw new Error("Lipsesc date obligatorii (nume, prenume și email/cnp)");
      }

      // Pregătire date
      let dataNasterii = row.data_nasterii?.trim() || null;
      if (dataNasterii) {
        // Simple validation for YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dataNasterii) || isNaN(Date.parse(dataNasterii))) {
          throw new Error(`Data nașterii invalidă: ${dataNasterii}`);
        }
      }

      const sportivData = {
        nume: row.nume?.trim(),
        prenume: row.prenume?.trim(),
        email: row.email?.toLowerCase().trim() || null,
        cnp: row.cnp?.trim() || null,
        data_nasterii: dataNasterii,
        club_id: row.club_id || activeClubId,
        status: 'Activ',
        grupa_id: row.grupa_id || defaultGrupaId
      };

      // Verificare existență (după email sau CNP)
      let query = supabase.from('sportivi').select('id');
      
      if (sportivData.email) {
        query = query.eq('email', sportivData.email);
      } else {
        query = query.eq('cnp', sportivData.cnp);
      }

      const { data: existing, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from('sportivi')
          .update(sportivData)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('sportivi')
          .insert(sportivData);
        if (insertError) throw insertError;
      }

      report.succes++;
    } catch (err: any) {
      report.erori++;
      const numeComplet = `${row.nume || ''} ${row.prenume || ''}`.trim();
      report.detalii_erori.push(`Rândul ${rowNum} (${numeComplet || 'Fără nume'}): ${err.message}`);
    }
  }

  return report;
};
