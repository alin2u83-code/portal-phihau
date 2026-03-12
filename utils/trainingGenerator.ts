import { supabase } from '../supabaseClient';

const ZILE_INDEX: Record<string, number> = { 'Duminică': 0, 'Luni': 1, 'Marți': 2, 'Miercuri': 3, 'Joi': 4, 'Vineri': 5, 'Sâmbătă': 6 };

export const generateTrainingsFromSchedule = async (daysInAdvance: number, grupaId?: string) => {
    let query = supabase.from('orar_saptamanal').select('*').eq('is_activ', true);
    if (grupaId) {
        query = query.eq('grupa_id', grupaId);
    }

    const { data: scheduleItems, error: scheduleError } = await query;
    if (scheduleError) throw scheduleError;
    if (!scheduleItems || scheduleItems.length === 0) return { count: 0 };

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysInAdvance);

    const instances: any[] = [];

    // Generate a unique group ID for each schedule item
    const groupIds: Record<string, string> = {};
    scheduleItems.forEach(item => {
        groupIds[item.id] = crypto.randomUUID();
    });

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayIndex = d.getDay(); // 0 = Sunday
        const dateStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        scheduleItems.forEach(item => {
            if (ZILE_INDEX[item.ziua] === dayIndex) {
                instances.push({
                    grupa_id: item.grupa_id,
                    club_id: item.club_id,
                    data: dateStr,
                    ziua: item.ziua,
                    ora_start: item.ora_start,
                    ora_sfarsit: item.ora_sfarsit,
                    is_recurent: true,
                    recurent_group_id: groupIds[item.id],
                    orar_id: item.id
                });
            }
        });
    }

    if (instances.length > 0) {
        // Fetch existing to avoid duplicates
        const { data: existing } = await supabase.from('program_antrenamente')
            .select('data, ora_start, grupa_id')
            .gte('data', new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().split('T')[0])
            .lte('data', new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().split('T')[0]);

        const existingSet = new Set((existing || []).map(e => `${e.grupa_id}-${(e.data || '').toString().slice(0, 10)}-${e.ora_start}`));
        
        const toInsert = instances.filter(i => !existingSet.has(`${i.grupa_id}-${i.data}-${i.ora_start}`));

        if (toInsert.length > 0) {
            const { error: insertError } = await supabase.from('program_antrenamente').insert(toInsert);
            if (insertError) throw insertError;
        }
        return { count: toInsert.length };
    }

    return { count: 0 };
};
