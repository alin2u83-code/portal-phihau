import { supabase } from '../supabaseClient';

export const invokeEdgeFunction = async (functionName: string, body: any) => {
    try {
        const response = await supabase.functions.invoke(functionName, { body });
        if (response.error) {
            console.error(`DETALII EROARE: Edge function ${functionName} returned error:`, JSON.stringify(response.error, null, 2));
            return { error: response.error };
        }
        return { data: response.data };
    } catch (err: any) {
        console.error(`DETALII EROARE: Edge function ${functionName} failed to invoke:`, JSON.stringify(err, null, 2));
        return { error: err };
    }
};
