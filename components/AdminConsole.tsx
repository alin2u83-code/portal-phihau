import React, { useState } from 'react';
import { Rol, View } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';
import { IdentitySwitcher } from './IdentitySwitcher';
import { useError } from './ErrorProvider';
import { supabase } from '../supabaseClient';

const AddBogdanButton = () => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const handleAddBogdan = async () => {
        setLoading(true);
        try {
            if (!supabase) throw new Error("Clientul Supabase nu este disponibil.");

            const sportivId = '1e258577-ebfb-48a7-b669-ded2d4875825';
            const clubId = 'cbb0b228-b3e0-4735-9658-70999eb256c6'; // Asumat din datele despre grupe

            // Upsert the sportiv profile
            const { error: sportivError } = await supabase.from('sportivi').upsert({
                id: sportivId,
                user_id: 'e6f3bcfe-437d-4d84-95c5-22e1140b1878',
                nume: 'Vargolici',
                prenume: 'Bogdan',
                email: 'vargolici.bogdan@phihau.ro',
                data_nasterii: '1983-11-09',
                data_inscrierii: '2026-01-20',
                status: 'Activ',
                familie_id: '11a591d9-5042-44dd-8d80-ec282ba6897b',
                participa_vacanta: true,
                username: 'vargolici.bogdan',
                grad_actual_id: '99aaa7ed-e6bb-4ef4-b678-f96eccc31b54',
                rol_activ_context: 'Sportiv',
                club_id: clubId,
                cnp: null,
                grupa_id: null,
                tip_abonament_id: null,
            }, { onConflict: 'id' });

            if (sportivError) throw sportivError;

            // Fetch role IDs
            let { data: rolesData, error: rolesError } = await supabase.from('roluri').select('id, nume').in('nume', ['Sportiv', 'Admin Club']);
            if (rolesError) throw rolesError;
            
            if (!rolesData || rolesData.length < 2) {
                showError("Roluri Lipsă", "Rolurile 'Sportiv' și/sau 'Admin Club' nu există. Contactați administratorul.");
                setLoading(false);
                return;
            }

            // Clear existing roles for this user and add new ones
            await supabase.from('sportivi_roluri').delete().eq('sportiv_id', sportivId);
            
            const rolesToInsert = rolesData.map(role => ({
                sportiv_id: sportivId,
                rol_id: role.id
            }));

            const { error: roleInsertError } = await supabase.from('sportivi_roluri').insert(rolesToInsert);
            if (roleInsertError) throw roleInsertError;

            showSuccess("Operațiune finalizată", "Utilizatorul Vargolici Bogdan a fost adăugat/actualizat cu rolurile 'Sportiv' și 'Admin Club'.");

        } catch (err: any) {
            showError("Eroare la adăugarea utilizatorului", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleAddBogdan} isLoading={loading} variant="warning">
            Adaugă/Actualizează Utilizator Bogdan Vargolici (Dev)
        </Button>
    );
};

interface AdminConsoleProps {
    onSwitchRole: (roleName: Rol['nume']) => void;
    isSwitchingRole: boolean;
    onBack: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onSwitchRole, isSwitchingRole, onBack }) => {
    return (
        <div className="space-y-8 animate-fade-in-down">
            <Button onClick={onBack} variant="secondary">
                <ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Dashboard
            </Button>
            
            <header className="text-center">
                <h1 className="text-4xl font-black text-white">Consola de Administrare</h1>
                <p className="text-slate-400 mt-2">Comută rapid între contexte de rol pentru testare și execută acțiuni de development.</p>
            </header>

            <IdentitySwitcher onSwitchRole={onSwitchRole} isSwitchingRole={isSwitchingRole} />

            <Card>
                 <h3 className="text-lg font-bold text-white mb-4">Acțiuni Specifice</h3>
                 <div className="text-center">
                    <AddBogdanButton />
                 </div>
            </Card>
        </div>
    );
};