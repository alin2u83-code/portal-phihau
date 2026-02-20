
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/registration_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/activation_screen.dart'; // Import noul ecran
import 'screens/role_selection_screen.dart'; // Import ecran de selecție rol
import 'widgets/profile_switcher.dart'; // Import noul widget
import 'services/profile_service.dart'; // Import noul serviciu

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
// Creează o instanță a noului serviciu
final profileService = ProfileService(supabase);

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
        '/activate': (context) => const ActivationScreen(), // Adaugă ruta nouă
        '/role-selection': (context) => RoleSelectionScreen(
          userRoles: const [
            // Mock data pentru testare UI
            {
              'id': '1', 'rol_denumire': 'ADMIN', 'club_denumire': 'Club Central',
              'is_primary': true
            },
            {
              'id': '2', 'rol_denumire': 'INSTRUCTOR', 'club_denumire': 'Club Central',
              'is_primary': false
            },
            {
              'id': '3', 'rol_denumire': 'SPORTIV', 'club_denumire': 'Club Central',
              'is_primary': false
            },
          ],
          onRoleSelected: (roleId) async {
            final success = await profileService.switchPrimaryRole(roleId);
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(success ? 'Rolul a fost schimbat cu succes!' : 'Eroare la schimbarea rolului.'),
                  backgroundColor: success ? Colors.green : Colors.red,
                ),
              );
              if (success) {
                // O opțiune ar fi să navighezi înapoi sau să reîncarci datele
                Navigator.pop(context);
              }
            }
          },
        ),
        // Exemplu de rută către profilul unui sportiv specific
        '/profile': (context) {
           final sportivId = ModalRoute.of(context)!.settings.arguments as String?;
           // Dacă nu se primește un ID, afișează un mesaj de eroare
           if (sportivId == null) {
              return const Scaffold(body: Center(child: Text("ID Sportiv lipsă.")));
           }
           return ProfileScreen(sportivId: sportivId);
        },
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  // Funcție pentru a gestiona navigarea către profilul activ
  void _navigateToMyProfile(BuildContext context) async {
    // Afișează un dialog de încărcare
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return const Center(child: CircularProgressIndicator());
      },
    );

    final activeProfile = await profileService.getActiveUserProfile();
    
    // Închide dialogul de încărcare
    if (context.mounted) {
      Navigator.of(context).pop();
    }

    if (context.mounted) {
      if (activeProfile != null) {
        Navigator.pushNamed(context, '/profile', arguments: activeProfile.id);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nu s-a putut încărca profilul activ. Asigură-te că ești autentificat și ai un rol asignat.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

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
              onPressed: () => _navigateToMyProfile(context),
              child: const Text('Vezi Profilul Meu (Activ)'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/register'),
              child: const Text('Înregistrează Sportiv'),
            ),
            const SizedBox(height: 16),
             ElevatedButton(
              onPressed: () => Navigator.pushNamed(context, '/activate'),
              child: const Text('Asignează Rol (Activare Cont)'),
            ),
            const SizedBox(height: 24),
            const Text('Schimbă Contextul Activ:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white70)),
            const SizedBox(height: 12),
            ProfileSwitcher(supabase: supabase, profileService: profileService),
          ],
        ),
      ),
    );
  }
}
