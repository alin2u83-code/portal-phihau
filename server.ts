import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Supabase Admin client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase environment variables for server.");
  }

  const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/creare-cont", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Serverul nu este configurat corect." });
    }

    const { email, password, userData, roles } = req.body;

    try {
      // 1. Create user in auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData
      });

      if (authError) throw authError;

      // 2. The trigger handle_new_user will handle the creation in public.sportivi
      // 3. Assign roles via RPC
      const { error: rpcError } = await supabaseAdmin.rpc('refactor_create_user_account', {
        p_nume: userData.nume,
        p_prenume: userData.prenume,
        p_email: email,
        p_username: userData.username || null,
        p_club_id: userData.club_id || null,
        p_roles: roles,
        p_user_id: authData.user.id,
        p_additional_data: {
          data_nasterii: userData.data_nasterii,
          cnp: userData.cnp,
          gen: userData.gen,
          telefon: userData.telefon,
          adresa: userData.adresa,
          grad_actual_id: userData.grad_actual_id,
          grupa_id: userData.grupa_id
        }
      });

      if (rpcError) throw rpcError;

      res.json({ success: true, userId: authData.user.id });
    } catch (error: any) {
      console.error("Error creating account:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files
    app.use(express.static("dist"));
    // Fallback for SPA routing
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
