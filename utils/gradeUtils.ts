import { Grad, Sportiv } from '../types';

export const determineStartingGrade = (
  formData: Partial<Sportiv>,
  grade: Grad[]
): string | null => {
  // Dacă gradul este deja setat, îl păstrăm
  if (formData.grad_actual_id) return formData.grad_actual_id;

  // Dacă nu avem data nașterii, nu putem calcula vârsta
  if (!formData.data_nasterii) return null;

  // Calculăm vârsta
  const birthDate = new Date(formData.data_nasterii);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // 1. Identificăm gradele de start (cele cu cea mai mică ordine)
  const minOrder = Math.min(...grade.map(g => g.ordine));
  const startingGrades = grade.filter(g => g.ordine === minOrder);

  // 2. Filtrăm după vârsta minimă
  const suitableGrades = startingGrades.filter(g => g.varsta_minima <= age);

  // 3. Alegem gradul potrivit (cel cu cea mai mare vârstă minimă care este <= vârsta sportivului)
  if (suitableGrades.length === 0) return startingGrades[0]?.id || null;
  
  return suitableGrades.sort((a, b) => b.varsta_minima - a.varsta_minima)[0].id;
};
