import { supabase } from '../supabaseClient';

export const invokeEdgeFunction = async (functionName: string, body: any) => {
    try {
        const response = await supabase.functions.invoke(functionName, { body });
        if (response.error) {
            console.error(`DEBUG: Edge function ${functionName} returned error:`, response.error);
            return { error: response.error };
        }
        return { data: response.data };
    } catch (err: any) {
        console.error(`DEBUG: Edge function ${functionName} failed to invoke:`, err);
        return { error: err };
    }
};
