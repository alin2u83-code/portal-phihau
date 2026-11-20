import type { Plata } from '../types';

/**
 * Denumirea afișată a unei facturi. La taxa de examen, gradul vine din înscriere
 * (descrierea salvată poate fi veche/generică, ex. "Taxa examen C.V. 1 Câp Alb").
 */
export const denumireFactura = (
  plata: Pick<Plata, 'id' | 'tip' | 'descriere'>,
  inscrieriExamene: Array<{ plata_id?: string | null; grad_sustinut_id?: string | null }> | undefined,
  grade: Array<{ id: string; nume: string }> | undefined,
): string => {
  if (plata.tip !== 'Taxa Examen') return plata.descriere;
  const inscriere = (inscrieriExamene || []).find(i => i.plata_id === plata.id);
  const grad = inscriere ? (grade || []).find(g => g.id === inscriere.grad_sustinut_id) : null;
  return grad ? `Taxă Examen - ${grad.nume}` : plata.descriere;
};
