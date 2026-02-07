import { Sportiv, SesiuneExamen, Grad, InscriereExamen, Examen } from '../types';

export const getAgeOnDate = (birthDateStr: string, onDateStr: string): number => {
    if (!birthDateStr || !onDateStr) return 0;
    const onDate = new Date(onDateStr);
    const birthDate = new Date(birthDateStr);
    let age = onDate.getFullYear() - birthDate.getFullYear();
    const m = onDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export const parseDurationToMonths = (durationStr: string | null | undefined): number => {
    if (!durationStr) return 0;
    const parts = durationStr.split(' ');
    if (parts.length < 2) return 0;
    const value = parseInt(parts[0], 10);
    const unit = parts[1].toLowerCase();
    if (isNaN(value)) return 0;
    if (unit.startsWith('lun')) return value;
    if (unit.startsWith('an')) return value * 12;
    return 0;
};

export interface EligibilityStatus {
  eligible: boolean;
  message: string;
  recommendedGrade: Grad | null;
}

export const calculateExamEligibility = (
    sportiv: Sportiv, 
    sesiune: SesiuneExamen, 
    allGrades: Grad[],
    historicParticipari: InscriereExamen[],
    allExamene: Examen[],
): EligibilityStatus => {
    
    const ageAtExam = getAgeOnDate(sportiv.data_nasterii, sesiune.data);
    const sortedGrades = [...allGrades].sort((a,b) => a.ordine - b.ordine);
    const currentGrade = sportiv.grad_actual_id ? allGrades.find(g => g.id === sportiv.grad_actual_id) : null;
    
    // Logic for Beginners
    if (!currentGrade) {
        let recommendedGrade: Grad | null = null;
        if (ageAtExam < 7) {
            recommendedGrade = sortedGrades.find(g => g.nume.includes('1 Cap Galben')) || null;
        } else if (ageAtExam >= 7 && ageAtExam <= 12) {
            recommendedGrade = sortedGrades.find(g => g.nume.includes('1 Cap Rusu')) || null;
        } else { // Over 12
            recommendedGrade = sortedGrades.find(g => g.nume.includes('1 Cap Albastru')) || null;
        }

        if (!recommendedGrade) {
            return { eligible: false, message: "Grad de începător neconfigurat.", recommendedGrade: null };
        }

        if (ageAtExam < recommendedGrade.varsta_minima) {
            return { eligible: false, message: `Vârsta min. ${recommendedGrade.varsta_minima} ani`, recommendedGrade };
        }
        
        return { eligible: true, message: "Eligibil pentru primul grad.", recommendedGrade };
    }

    // Logic for Progression
    const nextGrade = sortedGrades.find(g => g.ordine === currentGrade.ordine + 1);

    if (!nextGrade) {
        return { eligible: false, message: "Grad maxim atins.", recommendedGrade: null };
    }

    if (ageAtExam < nextGrade.varsta_minima) {
        return { eligible: false, message: `Vârsta min. ${nextGrade.varsta_minima} ani`, recommendedGrade: nextGrade };
    }

    const lastAdmittedParticipation = historicParticipari
        .filter(p => p.sportiv_id === sportiv.id && p.rezultat === 'Admis' && p.grad_vizat_id === currentGrade.id)
        .sort((a,b) => {
            const dateA = allExamene.find(e => e.id === a.sesiune_id)?.data || '1970-01-01';
            const dateB = allExamene.find(e => e.id === b.sesiune_id)?.data || '1970-01-01';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        })[0];
    
    const lastPromotionDate = lastAdmittedParticipation 
        ? new Date(allExamene.find(e => e.id === lastAdmittedParticipation.sesiune_id)!.data)
        : new Date(sportiv.data_inscrierii);
    
    const monthsToWait = parseDurationToMonths(nextGrade.timp_asteptare);
    const eligibilityDate = new Date(lastPromotionDate);
    eligibilityDate.setMonth(eligibilityDate.getMonth() + monthsToWait);
    
    if (new Date(sesiune.data) < eligibilityDate) {
        return { 
            eligible: false, 
            message: `Stagiu minim neîndeplinit. Eligibil după ${eligibilityDate.toLocaleDateString('ro-RO')}.`, 
            recommendedGrade: nextGrade 
        };
    }
    
    return { eligible: true, message: "Eligibil pentru avansare.", recommendedGrade: nextGrade };
};