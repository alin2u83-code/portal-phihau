import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl ? "Set" : "Not Set");
console.log("Service Key:", supabaseServiceKey ? "Set" : "Not Set");
console.log("Anon Key:", supabaseAnonKey ? "Set" : "Not Set");

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
    console.log("--- Începere Testare RLS ---");

    try {
        // Create a test user
        const testEmail = `test_admin_${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        console.log(`Creare utilizator test: ${testEmail}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // Assign SUPER_ADMIN_FEDERATIE role
        console.log("Atribuire rol SUPER_ADMIN_FEDERATIE...");
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: userId,
                role: 'SUPER_ADMIN_FEDERATIE',
                status: 'ACTIVE'
            });

        if (roleError) throw roleError;

        // Get the role context ID
        const { data: roleContexts, error: contextError } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .eq('role', 'SUPER_ADMIN_FEDERATIE');

        if (contextError) throw contextError;
        const contextId = roleContexts[0].id;

        // Now authenticate as the test user
        console.log("Autentificare ca utilizator test...");
        
        // Create a custom fetch to inject the active-role-context-id header
        const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
            const headers = new Headers(options.headers || {});
            headers.set('active-role-context-id', contextId);
            return fetch(url, { ...options, headers });
        };

        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { fetch: customFetch }
        });

        const { error: signInError } = await supabaseUser.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signInError) throw signInError;

        // 1. Test Super Admin access to all clubs
        console.log("\n--- Scenariu 1: Super Admin accesează toate cluburile ---");
        const { data: clubs, error: clubsError } = await supabaseUser
            .from('cluburi')
            .select('*');

        if (clubsError) {
            console.error("Eroare RLS cluburi:", clubsError.message);
        } else {
            console.log(`Succes! Super Admin a preluat ${clubs.length} cluburi.`);
        }

        // 2. Test Super Admin access to all sportivi
        console.log("\n--- Scenariu 2: Super Admin accesează toți sportivii ---");
        const { data: sportivi, error: sportiviError } = await supabaseUser
            .from('sportivi')
            .select('*');

        if (sportiviError) {
            console.error("Eroare RLS sportivi:", sportiviError.message);
        } else {
            console.log(`Succes! Super Admin a preluat ${sportivi.length} sportivi.`);
        }

        // Cleanup
        console.log("\nCurățare date test...");
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log("Utilizator test șters cu succes.");

    } catch (err) {
        console.error("Eroare neașteptată:", err);
    }
}

runTests();
