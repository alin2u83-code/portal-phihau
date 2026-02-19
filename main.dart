
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/registration_screen.dart';
import 'screens/profile_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Încarcă variabilele de mediu din fișierul .env
  await dotenv.load(fileName: ".env");

  // Inițializează Supabase
  await Supabase.initialize(
    url: dotenv.env['VITE_SUPABASE_URL']!,
    anonKey: dotenv.env['VITE_SUPABASE_ANON_KEY']!,
  );

  runApp(const MyApp());
}

final supabase = Supabase.instance.client;

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Qwan Ki Do Club',
      theme: ThemeData.dark().copyWith(
        primaryColor: const Color(0xFFFFD700), // Auriu specific
        scaffoldBackgroundColor: const Color(0xFF0a192f),
        cardColor: const Color(0xFF112240),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(
            borderSide: BorderSide(color: Color(0xFF334155)),
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(color: Color(0xFF334155)),
          ),
          focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(color: Color(0xFFFFD700)),
          ),
          labelStyle: TextStyle(color: Color(0xFF94a3b8)),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFFD700),
            foregroundColor: const Color(0xFF0a192f),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(vertical: 16),
          ),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF112240),
          elevation: 0,
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const HomeScreen(),
        '/register': (context) => const RegistrationScreen(),
        // Exemplu de rută către profilul unui sportiv specific
        '/profile': (context) {
           final sportivId = ModalRoute.of(context)!.settings.arguments as String? ?? 'd2e2b2f1-5f33-4a11-a8b2-54a487c6c4f0'; // ID de test
           return ProfileScreen(sportivId: sportivId);
        },
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard Principal')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/register'),
              child: const Text('Înregistrează Sportiv'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/profile'),
              child: const Text('Vezi Profil Sportiv (Exemplu)'),
            ),
          ],
        ),
      ),
    );
  }
}
