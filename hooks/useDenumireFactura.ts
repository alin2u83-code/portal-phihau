import { useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { denumireFactura } from '../utils/denumireFactura';

/** Returnează funcția care dă denumirea afișată a unei facturi (taxa de examen include gradul din înscriere). */
export const useDenumireFactura = () => {
  const { filteredData, grade } = useData();
  const inscrieriExamene = filteredData.inscrieriExamene;
  return useCallback(
    (plata: Parameters<typeof denumireFactura>[0]) => denumireFactura(plata, inscrieriExamene, grade),
    [inscrieriExamene, grade],
  );
};
