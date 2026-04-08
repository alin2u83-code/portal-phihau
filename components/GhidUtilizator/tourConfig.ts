import { TourStep } from './types';

export const TOURS: Record<string, TourStep[]> = {
  sportivi: [
    { target: '[data-tour="sportivi-search"]', title: 'Caută sportivi', description: 'Scrie numele unui sportiv pentru a-l găsi rapid în listă.', scrollBlock: 'start' },
    { target: '[data-tour="sportivi-filtru-status"]', title: 'Filtrează după status', description: 'Alege să vezi sportivii Activi, Inactivi sau toți.', scrollBlock: 'start' },
    { target: '[data-tour="sportivi-adauga"]', title: 'Adaugă sportiv nou', description: 'Apasă aici pentru a înregistra un sportiv nou în sistem.', scrollBlock: 'start' },
    // Pasul 4: tintim ancora de sus a tabelului (element cu inaltime mica) nu intregul div al listei,
    // astfel spotlight-ul si popoverul raman in viewport indiferent de lungimea listei.
    { target: '[data-tour="sportivi-tabel-ancora"]', title: 'Lista sportivilor', description: 'Bifează sportivii pentru a-i selecta. Selectați mai mulți și poți efectua acțiuni pe toți deodată (ex: mută în grupă).', scrollBlock: 'start' },
    // Pasul 5: paginarea e la baza paginii — folosim 'nearest' pentru scroll minim vizibil.
    { target: '[data-tour="sportivi-paginare"]', title: 'Navigare între pagini', description: 'Folosește săgețile pentru pagini. Poți alege câți sportivi apar pe o pagină din selectorul din dreapta.', scrollBlock: 'nearest' },
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
