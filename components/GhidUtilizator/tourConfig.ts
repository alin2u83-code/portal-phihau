import { TourStep } from './types';

export const TOURS: Record<string, TourStep[]> = {
  sportivi: [
    { target: '[data-tour="sportivi-search"]', title: 'Caută sportivi', description: 'Scrie numele unui sportiv pentru a-l găsi rapid în listă.' },
    { target: '[data-tour="sportivi-filtru-status"]', title: 'Filtrează după status', description: 'Alege să vezi sportivii Activi, Inactivi sau toți.' },
    { target: '[data-tour="sportivi-adauga"]', title: 'Adaugă sportiv nou', description: 'Apasă aici pentru a înregistra un sportiv nou în sistem.' },
    { target: '[data-tour="sportivi-tabel"]', title: 'Lista sportivilor', description: 'Bifează sportivii pentru a-i selecta. Selectați mai mulți și poți efectua acțiuni pe toți deodată (ex: mută în grupă).' },
    { target: '[data-tour="sportivi-paginare"]', title: 'Navigare între pagini', description: 'Folosește săgețile pentru pagini. Poți alege câți sportivi apar pe o pagină din selectorul din dreapta.' },
  ],
  grupe: [
    { target: '[data-tour="grupe-adauga"]', title: 'Crează o grupă nouă', description: 'Apasă butonul verde pentru a crea o grupă de antrenament.' },
    { target: '[data-tour="grupe-lista"]', title: 'Lista grupelor', description: 'Fiecare card reprezintă o grupă. Apasă pe icoane pentru a edita, vedea programul sau adăuga sportivi.' },
  ],
  prezenta: [
    { target: '[data-tour="prezenta-grupa"]', title: 'Selectează grupa', description: 'Primul pas: alege grupa pentru care înregistrezi prezența.' },
    { target: '[data-tour="prezenta-data"]', title: 'Alege data', description: 'Selectează data antrenamentului.' },
    { target: '[data-tour="prezenta-lista"]', title: 'Marchează prezența', description: 'Bifează sportivii prezenți la antrenament.' },
    { target: '[data-tour="prezenta-salveaza"]', title: 'Salvează', description: 'Apasă Salvează după ce ai marcat toți sportivii prezenți.' },
  ],
};
