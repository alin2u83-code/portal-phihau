import { useError } from '../components/ErrorProvider';

export const useBackendError = () => {
    const { showError } = useError();
    
    return (title: string, error: any) => {
        // Specific handling for Supabase errors can be added here
        if (error?.code === 'PGRST301') {
            showError(title, "Acces restricționat la această resursă.");
        } else if (error?.code === '23505') {
            showError(title, "Datele introduse există deja în sistem.");
        } else {
            showError(title, error);
        }
    };
};
