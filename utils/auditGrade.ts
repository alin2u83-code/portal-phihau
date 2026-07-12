import { Sportiv, IstoricGrade, Grad, SesiuneExamen } from '../types';
import { getAgeOnDate, parseDurationToMonths } from './eligibility';

// Marja de eroare pt. distanța minimă intre grade - susținerea mai devreme decât minimul,
// dar în limita a 2 luni, ține de data sesiunii de examen (alegerea antrenorului), nu e o anomalie.
export const MARJA_EROARE_LUNI = 2;

export type TipAnomalieGrad =
    | 'varsta_debut'
    | 'distanta_insuficienta'
    | 'varsta_sub_minim'
    | 'grad_sarit'
    | 'incompatibil_varsta_grad';

export interface AnomalieGrad {
    sportiv_id: string;
    sportiv_nume: string;
    club_id: string | null;
    tip: TipAnomalieGrad;
    severitate: 'critic' | 'atentie';
    mesaj: string;
    grad_relevant: string;
    data_relevanta: string;
}

const numeleEsteSerieGalbena = (nume: string): boolean => {
    const n = nume.toLowerCase();
    return n.includes('galben') || n.includes('debutant');
};

type CuloareGrad = 'galben' | 'rosu' | 'violet' | 'albastru' | 'negru' | 'altul';

const culoareGrad = (nume: string): CuloareGrad => {
    const n = nume.toLowerCase();
    if (n.includes('galben') || n.includes('debutant')) return 'galben';
    if (n.includes('roșu') || n.includes('rosu')) return 'rosu';
    if (n.includes('violet') || n.startsWith('c.v.')) return 'violet';
    if (n.includes('albastru')) return 'albastru';
    if (n.includes('neagră') || n.includes('neagra') || n.startsWith('c.n.')) return 'negru';
    return 'altul';
};

// Seriile "de copii" (galben/roșu/violet) nu au plafon propriu de vârstă - dar dacă
// sportivul a ajuns deja la vârsta minimă a seriei Albastru, nu mai are sens sa tina
// un grad din aceste serii - e semn de eroare de date, nu de progresie normala.
const SERII_COPII: CuloareGrad[] = ['galben', 'rosu', 'violet'];

const adaugaLuni = (dataStr: string, luni: number): Date => {
    const d = new Date(dataStr);
    d.setMonth(d.getMonth() + luni);
    return d;
};

const adaugaAni = (dataStr: string, ani: number): Date => {
    const d = new Date(dataStr);
    d.setFullYear(d.getFullYear() + ani);
    return d;
};

const zileIntre = (a: Date, b: Date): number => Math.round((a.getTime() - b.getTime()) / 86400000);

export const computeAnomaliiGrade = (
    sportivi: Sportiv[],
    istoricGrade: IstoricGrade[],
    grade: Grad[],
    sesiuniExamene: SesiuneExamen[],
): AnomalieGrad[] => {
    const gradById = new Map(grade.map(g => [g.id, g]));
    const anomalii: AnomalieGrad[] = [];

    const pragVarstaAlbastru = grade
        .filter(g => culoareGrad(g.nume) === 'albastru')
        .reduce((min, g) => Math.min(min, g.varsta_minima), Infinity);

    const istoricPerSportiv = new Map<string, IstoricGrade[]>();
    for (const inreg of istoricGrade) {
        if (!istoricPerSportiv.has(inreg.sportiv_id)) istoricPerSportiv.set(inreg.sportiv_id, []);
        istoricPerSportiv.get(inreg.sportiv_id)!.push(inreg);
    }

    for (const sportiv of sportivi) {
        const istoric = istoricPerSportiv.get(sportiv.id);
        if (!istoric || istoric.length === 0 || !sportiv.data_nasterii) continue;

        const sortat = [...istoric]
            .map(i => ({ inreg: i, grad: gradById.get(i.grad_id) }))
            .filter((x): x is { inreg: IstoricGrade; grad: Grad } => !!x.grad)
            .sort((a, b) => new Date(a.inreg.data_obtinere).getTime() - new Date(b.inreg.data_obtinere).getTime());

        if (sortat.length === 0) continue;

        const sportivNume = `${sportiv.nume} ${sportiv.prenume}`.trim();

        // 1. Prim examen sub 7 ani -> grad trebuie sa fie din seria galbena/debutant
        const prim = sortat[0];
        const varstaLaPrim = getAgeOnDate(sportiv.data_nasterii, prim.inreg.data_obtinere);
        if (varstaLaPrim < 7 && !numeleEsteSerieGalbena(prim.grad.nume)) {
            anomalii.push({
                sportiv_id: sportiv.id,
                sportiv_nume: sportivNume,
                club_id: sportiv.club_id ?? null,
                tip: 'varsta_debut',
                severitate: 'critic',
                mesaj: `Prim examen la ${varstaLaPrim} ani, dar gradul susținut ("${prim.grad.nume}") nu e din seria galben/debutant.`,
                grad_relevant: prim.grad.nume,
                data_relevanta: prim.inreg.data_obtinere,
            });
        }

        // 2-5. Tranzitii consecutive
        for (let i = 1; i < sortat.length; i++) {
            const anterior = sortat[i - 1];
            const curent = sortat[i];

            // 3. Varsta sub minim la momentul obtinerii gradului
            const varstaLaCurent = getAgeOnDate(sportiv.data_nasterii, curent.inreg.data_obtinere);
            if (varstaLaCurent < curent.grad.varsta_minima) {
                const dataImplinireVarstaMinima = adaugaAni(sportiv.data_nasterii, curent.grad.varsta_minima);
                anomalii.push({
                    sportiv_id: sportiv.id,
                    sportiv_nume: sportivNume,
                    club_id: sportiv.club_id ?? null,
                    tip: 'varsta_sub_minim',
                    severitate: 'critic',
                    mesaj: `A obținut "${curent.grad.nume}" la ${varstaLaCurent} ani, sub vârsta minimă (${curent.grad.varsta_minima} ani) — împlinește vârsta minimă la ${dataImplinireVarstaMinima.toLocaleDateString('ro-RO')}.`,
                    grad_relevant: curent.grad.nume,
                    data_relevanta: curent.inreg.data_obtinere,
                });
            }

            // 4. Grad sarit din secventa
            // Gradele "lipsa" cu varsta_minima <= varsta la primul examen nu erau oricum
            // aplicabile sportivului (a intrat deja prea mare pt acel nivel) - nu se raporteaza.
            const gapOrdine = curent.grad.ordine - anterior.grad.ordine;
            if (gapOrdine > 1) {
                const lipsa = grade
                    .filter(g => g.ordine > anterior.grad.ordine && g.ordine < curent.grad.ordine)
                    .filter(g => g.varsta_minima > varstaLaPrim)
                    .sort((a, b) => a.ordine - b.ordine)
                    .map(g => g.nume);
                if (lipsa.length > 0) {
                    anomalii.push({
                        sportiv_id: sportiv.id,
                        sportiv_nume: sportivNume,
                        club_id: sportiv.club_id ?? null,
                        tip: 'grad_sarit',
                        severitate: 'critic',
                        mesaj: `Salt de la "${anterior.grad.nume}" direct la "${curent.grad.nume}" — lipsește: ${lipsa.join(', ')}.`,
                        grad_relevant: curent.grad.nume,
                        data_relevanta: curent.inreg.data_obtinere,
                    });
                }
            } else if (gapOrdine <= 0) {
                // Istoric neregulat (grad retrogradat/duplicat) - nu intra in scope-ul de distanta/varsta de mai jos
                continue;
            }

            // Incompatibilitate varsta-grad: gradul curent apartine unei serii "de copii"
            // (galben/roșu/violet), dar varsta sportivului la obtinere deja depaseste
            // varsta minima a seriei Albastru - semn de eroare de introducere date.
            if (
                SERII_COPII.includes(culoareGrad(curent.grad.nume)) &&
                pragVarstaAlbastru !== Infinity &&
                varstaLaCurent >= pragVarstaAlbastru
            ) {
                anomalii.push({
                    sportiv_id: sportiv.id,
                    sportiv_nume: sportivNume,
                    club_id: sportiv.club_id ?? null,
                    tip: 'incompatibil_varsta_grad',
                    severitate: 'critic',
                    mesaj: `Eroare probabilă de date: "${curent.grad.nume}" (grad de vârstă mică) obținut la ${varstaLaCurent} ani — vârstă deja peste pragul seriei Albastru (${pragVarstaAlbastru} ani).`,
                    grad_relevant: curent.grad.nume,
                    data_relevanta: curent.inreg.data_obtinere,
                });
                continue;
            }

            // 2 & 5. Distanta fata de gradul anterior
            const luniNecesare = parseDurationToMonths(curent.grad.timp_asteptare);
            const dataEligibilitate = adaugaLuni(anterior.inreg.data_obtinere, luniNecesare);
            const dataPragCuMarja = adaugaLuni(anterior.inreg.data_obtinere, luniNecesare - MARJA_EROARE_LUNI);
            const dataCurenta = new Date(curent.inreg.data_obtinere);

            // In marja de 2 luni fata de termenul minim - considerat alegerea antrenorului
            // pt. data sesiunii de examen, nu o anomalie reala.
            if (dataCurenta < dataPragCuMarja) {
                const zileLipsa = zileIntre(dataEligibilitate, dataCurenta);
                anomalii.push({
                    sportiv_id: sportiv.id,
                    sportiv_nume: sportivNume,
                    club_id: sportiv.club_id ?? null,
                    tip: 'distanta_insuficienta',
                    severitate: 'critic',
                    mesaj: `Distanță insuficientă între "${anterior.grad.nume}" și "${curent.grad.nume}": cu ${zileLipsa} zile mai devreme decât minimul de ${luniNecesare} luni.`,
                    grad_relevant: curent.grad.nume,
                    data_relevanta: curent.inreg.data_obtinere,
                });
            }
        }
    }

    return anomalii;
};
