
import { Sportiv, SesiuneExamen, Grad } from '../types';

export const getAgeOnDate = (birthDateStr: string | null | undefined, onDateStr: string): number => {
    if (!birthDateStr || !onDateStr) return 0;
    const onDate = new Date(onDateStr);
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime()) || isNaN(onDate.getTime())) return 0;
    
    let age = onDate.getFullYear() - birthDate.getFullYear();
    const m = onDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/**
 * Calculates the eligible starting grade for a beginner or the next grade for an advanced student
 * based on Qwan Ki Do age categories.
 * @param sportiv The student profile.
 * @param sesiune The exam session to calculate age against.
 * @param allGrades The list of all available ranks.
 * @returns An object containing the recommended grade and a descriptive message.
 */
export const calculateEligibleGrade = (
    sportiv: Sportiv, 
    sesiune: SesiuneExamen, 
    allGrades: Grad[]
): { recommendedGrade: Grad | null, message: string } => {
    const ageAtExam = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
    const sortedGrades = [...allGrades].sort((a, b) => a.ordine - b.ordine);
    
    // If the student is a beginner (no current grade)
    if (!sportiv.grad_actual_id) {
        if (ageAtExam < 12) {
            // Children (<12 years): Debutant -> 1 Cấp (Yellow/Violet Belt)
            const firstCap = sortedGrades.find(g => g.nume.toLowerCase().includes('1 cấp') || g.ordine === 1);
            return { 
                recommendedGrade: firstCap || null, 
                message: ageAtExam < 7 ? "Program Copii Mici (<7 ani) - Recomandat 1 Cấp" : "Program Copii (7-12 ani) - Recomandat 1 Cấp" 
            };
        } else {
            // Adults (>12 years): Debutant -> Vân-Đai (Blue Belt)
            const vanDai = sortedGrades.find(g => g.nume.toLowerCase().includes('vân-đai') || g.nume.toLowerCase().includes('albastra'));
            return { 
                recommendedGrade: vanDai || null, 
                message: "Program Adulți (>12 ani) - Recomandat Vân-Đai" 
            };
        }
    }

    // For students with an existing grade, determine the next one in the hierarchy
    const currentGrade = allGrades.find(g => g.id === sportiv.grad_actual_id);
    if (!currentGrade) {
        return { recommendedGrade: null, message: "Gradul actual nu a fost găsit. Verificați profilul sportivului." };
    }

    const nextGrade = sortedGrades.find(g => g.ordine === currentGrade.ordine + 1);
    
    if (!nextGrade) {
        return { recommendedGrade: null, message: "Nivel maxim atins (Dang)." };
    }

    return { recommendedGrade: nextGrade, message: `Următorul nivel: ${nextGrade.nume}` };
};
