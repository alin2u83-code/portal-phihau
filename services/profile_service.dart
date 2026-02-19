
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/sportiv.dart';

/// Un serviciu dedicat pentru operațiuni legate de profilul utilizatorului.
class ProfileService {
  final SupabaseClient _supabase;

  ProfileService(this._supabase);

  /// Preia profilul de sportiv activ pentru utilizatorul curent.
  ///
  /// Logica de funcționare:
  /// 1. Caută contextul de rol marcat ca `is_primary = true`.
  /// 2. Dacă nu găsește niciunul (folosind `select` pentru a evita erori),
  ///    execută un fallback și caută primul context de rol disponibil pentru utilizator.
  /// 3. Dacă un context este găsit (fie primar, fie prin fallback), folosește `sportiv_id`
  ///    asociat pentru a prelua și returna profilul complet al sportivului.
  /// 4. Returnează `null` dacă utilizatorul nu este autentificat sau nu are niciun rol asignat.
  Future<Sportiv?> getActiveUserProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      // Niciun utilizator autentificat
      return null;
    }

    try {
      // Pas 1: Încearcă să găsească contextul primar folosind .select()
      final primaryContextResponse = await _supabase
          .from('utilizator_roluri_multicont')
          .select('sportiv_id')
          .eq('user_id', user.id)
          .eq('is_primary', true);

      String? sportivId;

      if (primaryContextResponse.isNotEmpty) {
        // Succes: S-a găsit contextul primar
        sportivId = primaryContextResponse[0]['sportiv_id'];
      } else {
        // Pas 2: Fallback - nu s-a găsit un context primar, caută primul context disponibil.
        print('Avertisment: Niciun context primar găsit. Se aplică fallback-ul.');
        final fallbackResponse = await _supabase
            .from('utilizator_roluri_multicont')
            .select('sportiv_id')
            .eq('user_id', user.id)
            .order('created_at', ascending: true)
            .limit(1);

        if (fallbackResponse.isNotEmpty) {
          sportivId = fallbackResponse[0]['sportiv_id'];
        }
      }

      if (sportivId == null) {
        // Eroare critică: utilizatorul este autentificat, dar nu are niciun rol/context asignat.
        print('Eroare: Utilizatorul autentificat nu are niciun context de rol valid.');
        return null;
      }

      // Pas 3: Preia profilul complet al sportivului folosind .select() în loc de .single()
      final sportivProfileResponse = await _supabase
          .from('sportivi')
          .select('*, grad:grad_actual_id(*)')
          .eq('id', sportivId);
      
      if (sportivProfileResponse.isEmpty) {
        print('Eroare: Profilul de sportiv cu ID $sportivId nu a fost găsit, deși contextul există.');
        return null;
      }
      
      // .select() returnează o listă, deci luăm primul element.
      return Sportiv.fromJson(sportivProfileResponse[0]);

    } catch (e) {
      print('Eroare la preluarea profilului activ: $e');
      return null;
    }
  }
}
