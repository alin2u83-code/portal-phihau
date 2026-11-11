// Date FICTIVE pentru zona de test a managementului (D-17). Nu se importă nimic din DB și nu se scrie nimic.

export const CLUB_DEMO = { nume: 'Club Demonstrativ' };

export interface SportivDemo { nume: string; prenume: string; grad: string; grupa: string; status: 'Activ' | 'Inactiv'; }
export interface GrupaDemo { denumire: string; orar: string; nrSportivi: number; instructor: string; }
export interface PlataDemo { sportiv: string; descriere: string; suma: number; status: 'Achitat' | 'Neachitat' | 'Parțial'; }

export const SPORTIVI_DEMO: SportivDemo[] = [
    { nume: 'Exemplu', prenume: 'Ana', grad: 'Cap Albastru', grupa: 'Începători', status: 'Activ' },
    { nume: 'Demonstrație', prenume: 'Mihai', grad: 'Cap Roșu', grupa: 'Intermediari', status: 'Activ' },
    { nume: 'Fictiv', prenume: 'Elena', grad: 'Cap Galben', grupa: 'Începători', status: 'Activ' },
    { nume: 'Test', prenume: 'Andrei', grad: 'Cap Verde', grupa: 'Intermediari', status: 'Activ' },
    { nume: 'Model', prenume: 'Ioana', grad: '1 Dang', grupa: 'Avansați', status: 'Activ' },
    { nume: 'Probă', prenume: 'Radu', grad: 'Cap Albastru', grupa: 'Începători', status: 'Inactiv' },
    { nume: 'Specimen', prenume: 'Maria', grad: '2 Dang', grupa: 'Avansați', status: 'Activ' },
    { nume: 'Ilustrativ', prenume: 'Vlad', grad: 'Cap Roșu', grupa: 'Intermediari', status: 'Inactiv' },
];

export const GRUPE_DEMO: GrupaDemo[] = [
    { denumire: 'Începători', orar: 'Luni și Miercuri, 17:00 – 18:30', nrSportivi: 3, instructor: 'Instructor Exemplu' },
    { denumire: 'Intermediari', orar: 'Marți și Joi, 18:00 – 19:30', nrSportivi: 3, instructor: 'Instructor Demonstrație' },
    { denumire: 'Avansați', orar: 'Miercuri și Vineri, 19:00 – 20:30', nrSportivi: 2, instructor: 'Instructor Fictiv' },
];

export const PLATI_DEMO: PlataDemo[] = [
    { sportiv: 'Ana Exemplu', descriere: 'Abonament luna curentă', suma: 100, status: 'Achitat' },
    { sportiv: 'Mihai Demonstrație', descriere: 'Abonament luna curentă', suma: 100, status: 'Neachitat' },
    { sportiv: 'Elena Fictiv', descriere: 'Abonament luna curentă', suma: 100, status: 'Achitat' },
    { sportiv: 'Andrei Test', descriere: 'Abonament luna curentă', suma: 100, status: 'Parțial' },
    { sportiv: 'Ioana Model', descriere: 'Abonament luna curentă', suma: 120, status: 'Achitat' },
    { sportiv: 'Maria Specimen', descriere: 'Abonament luna curentă', suma: 120, status: 'Neachitat' },
];
