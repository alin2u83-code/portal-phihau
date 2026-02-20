import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/supabase-js';
import { Sidebar } from './components/Sidebar';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} theme="dark" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-900 text-white">
      <Sidebar />
      <main className="flex-1 p-4 md:ml-64">
        <h1 className="text-2xl font-bold">Dashboard Principal</h1>
        <p className="mt-2 text-gray-400">Bine ai venit! Selectează o opțiune din meniu.</p>
        {/* Aici va fi randat conținutul paginilor */}
      </main>
    </div>
  );
}

export default App;
