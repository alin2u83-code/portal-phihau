import { Sportiv, IstoricGrade, Grad, SesiuneExamen } from '../types';
import { getAgeOnDate, parseDurationToMonths } from './eligibility';

// Toleranță pt. atenționări "aproape de limită" - cazuri care au respectat tehnic
// minimul, dar la limită (ex. promovat cu doar 2 sesiuni distanță când minimul e 3).
export const TOLERANTA_ZILE = 30;
export const SESIUNI_MINIME_TOLERANTA = 3;

export type TipAnomalieGrad =
    | 'varsta_debut'
    | 'distanta_insuficienta'
    | 'varsta_sub_minim'
    | 'grad_sarit'
    | 'aproape_limita';

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

const adaugaLuni = (dataStr: string, luni: number): Date => {
    const d = new Date(dataStr);
    d.setMonth(d.getMonth() + luni);
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
    const sesiuniSortate = [...sesiuniExamene].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    const anomalii: AnomalieGrad[] = [];

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
                anomalii.push({
                    sportiv_id: sportiv.id,
                    sportiv_nume: sportivNume,
                    club_id: sportiv.club_id ?? null,
                    tip: 'varsta_sub_minim',
                    severitate: 'critic',
                    mesaj: `A obținut "${curent.grad.nume}" la ${varstaLaCurent} ani, sub vârsta minimă (${curent.grad.varsta_minima} ani).`,
                    grad_relevant: curent.grad.nume,
                    data_relevanta: curent.inreg.data_obtinere,
                });
            }

            // 4. Grad sarit din secventa
            const gapOrdine = curent.grad.ordine - anterior.grad.ordine;
            if (gapOrdine > 1) {
                const lipsa = grade
                    .filter(g => g.ordine > anterior.grad.ordine && g.ordine < curent.grad.ordine)
                    .sort((a, b) => a.ordine - b.ordine)
                    .map(g => g.nume);
                anomalii.push({
                    sportiv_id: sportiv.id,
                    sportiv_nume: sportivNume,
                    club_id: sportiv.club_id ?? null,
                    tip: 'grad_sarit',
                    severitate: 'critic',
                    mesaj: `Salt de la "${anterior.grad.nume}" direct la "${curent.grad.nume}" — lipsește: ${lipsa.join(', ') || 'grad(e) intermediar(e)'}.`,
                    grad_relevant: curent.grad.nume,
                    data_relevanta: curent.inreg.data_obtinere,
                });
            } else if (gapOrdine <= 0) {
                // Istoric neregulat (grad retrogradat/duplicat) - nu intra in scope-ul de distanta/varsta de mai jos
                continue;
            }

            // 2 & 5. Distanta fata de gradul anterior
            const luniNecesare = parseDurationToMonths(curent.grad.timp_asteptare);
            const dataEligibilitate = adaugaLuni(anterior.inreg.data_obtinere, luniNecesare);
            const dataCurenta = new Date(curent.inreg.data_obtinere);

            if (dataCurenta < dataEligibilitate) {
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
            } else {
                const margineZile = zileIntre(dataCurenta, dataEligibilitate);
                const nrSesiuni = sesiuniSortate.filter(s => {
                    const d = new Date(s.data);
                    return d > new Date(anterior.inreg.data_obtinere) && d <= dataCurenta;
                }).length;

                if (margineZile <= TOLERANTA_ZILE || nrSesiuni < SESIUNI_MINIME_TOLERANTA) {
                    anomalii.push({
                        sportiv_id: sportiv.id,
                        sportiv_nume: sportivNume,
                        club_id: sportiv.club_id ?? null,
                        tip: 'aproape_limita',
                        severitate: 'atentie',
                        mesaj: `"${curent.grad.nume}" obținut la limită: ${margineZile} zile peste minimul necesar, ${nrSesiuni} sesiune(i) de examen distanță de "${anterior.grad.nume}".`,
                        grad_relevant: curent.grad.nume,
                        data_relevanta: curent.inreg.data_obtinere,
                    });
                }
            }
        }
    }

    return anomalii;
};
