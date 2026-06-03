export interface SportivCard {
    id: string;
    nume: string;
    prenume: string;
    data_nasterii: string | null;
    email: string | null;
    cnp: string | null;
    club_id: string | null;
    grad_actual_id: string | null;
    data_inscrierii: string;
    status: 'Activ' | 'Inactiv';
    user_id: string | null;
}

export interface PereacheDuplicat {
    id: string;
    sportiv_a: SportivCard;
    sportiv_b: SportivCard;
    similarity_score: number;
    motiv: string;
    sursa: 'rpc' | 'local';
}
