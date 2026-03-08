import { supabase } from '../supabaseClient';

async function testRLS() {
    console.log("Testing RLS policies...");

    // Test get_user_auth_context
    console.log("Testing get_user_auth_context...");
    const { data: authContext, error: authError } = await supabase.rpc('get_user_auth_context');
    if (authError) {
        console.error("get_user_auth_context failed:", authError);
    } else {
        console.log("get_user_auth_context successful:", authContext);
    }

    // Test link_user_to_sportiv_profile
    // This requires a user ID and a sportiv ID, so testing it might be hard without a real user.
    // I'll just log that it should be tested.
    console.log("link_user_to_sportiv_profile requires a valid user and sportiv ID. Skipping automated test.");
}

testRLS();
