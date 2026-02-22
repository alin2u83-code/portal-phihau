
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart'; // Import pentru clientul Supabase

class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _numeController = TextEditingController();
  final _prenumeController = TextEditingController();
  final _cnpController = TextEditingController();
  final _dataNasteriiController = TextEditingController(); // YYYY-MM-DD
  
  bool _isLoading = false;
  String? _adminClubId;

  @override
  void initState() {
    super.initState();
    _fetchAdminClubId();
  }

  Future<void> _fetchAdminClubId() async {
    if (supabase.auth.currentUser == null) return;
    try {
      // Obține club_id din contextul primar al adminului, folosind .select()
      final contextResponse = await supabase
          .from('utilizator_roluri_multicont')
          .select('club_id')
          .eq('user_id', supabase.auth.currentUser!.id)
          .eq('is_primary', true);
      
      if (contextResponse.isNotEmpty && contextResponse[0]['club_id'] != null) {
        setState(() {
          _adminClubId = contextResponse[0]['club_id'];
        });
      } else {
        // Fallback: dacă nu există context primar, caută primul context de admin club disponibil
        final fallbackResponse = await supabase
          .from('utilizator_roluri_multicont')
          .select('club_id')
          .eq('user_id', supabase.auth.currentUser!.id)
          .in_('rol_denumire', ['ADMIN_CLUB', 'SUPER_ADMIN_FEDERATIE'])
          .limit(1);

        if (fallbackResponse.isNotEmpty && fallbackResponse[0]['club_id'] != null) {
          setState(() {
            _adminClubId = fallbackResponse[0]['club_id'];
          });
        } else {
          if (mounted) {
            _showErrorDialog("Eroare de Context", "Nu am putut identifica un context de club valid pentru contul dumneavoastră. Asigurați-vă că aveți rolul de Admin asignat.");
          }
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorDialog("Eroare Necunoscută", "A apărut o problemă la verificarea permisiunilor: ${e.toString()}");
      }
    }
  }

  void _showErrorDialog(String title, String content) {
    if (!context.mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF112240),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        content: Text(content, style: const TextStyle(color: Color(0xFF94a3b8))),
        actions: [
          TextButton(
            child: const Text("OK", style: TextStyle(color: Color(0xFFFFD700))),
            onPressed: () => Navigator.of(ctx).pop(),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _numeController.dispose();
    _prenumeController.dispose();
    _cnpController.dispose();
    _dataNasteriiController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    if (_adminClubId == null) {
      _showErrorDialog("Acțiune Blocată", "Contextul de club nu a fost încărcat. Nu se poate adăuga sportivul.");
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Verificare proactivă pentru a evita duplicarea, conform constrângerii 'unique_sportiv_identitate'
      final checkResponse = await supabase
          .from('sportivi')
          .select('id')
          .eq('nume', _numeController.text.trim())
          .eq('prenume', _prenumeController.text.trim())
          .eq('data_nasterii', _dataNasteriiController.text.trim())
          .limit(1);

      if (checkResponse.isNotEmpty) {
        _showErrorDialog("Sportiv Duplicat", "Un sportiv cu același nume, prenume și dată de naștere este deja înregistrat.");
        setState(() => _isLoading = false);
        return;
      }

      await supabase.from('sportivi').insert({
        'nume': _numeController.text.trim(),
        'prenume': _prenumeController.text.trim(),
        'cnp': _cnpController.text.trim().isEmpty ? null : _cnpController.text.trim(),
        'data_nasterii': _dataNasteriiController.text.trim(),
        'club_id': _adminClubId, // Folosește ID-ul de club preluat dinamic
        'status': 'Activ',
        'data_inscrierii': DateTime.now().toIso8601String(),
      });

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sportiv înregistrat cu succes!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      }

    } on PostgrestException catch (e) {
      String errorMessage = 'A apărut o eroare necunoscută.';
      
      // GESTIONAREA ERORII SPECIFICE DE CHEIE DUPLICĂ (ca fallback)
      if (e.message.contains('unique_sportiv_identitate')) {
        errorMessage = 'Acest sportiv este deja înregistrat în baza de date a clubului.';
      } else {
        errorMessage = e.message;
      }
      
      _showErrorDialog("Eroare la Salvare", errorMessage);

    } catch (e) {
       _showErrorDialog("Eroare Neprevăzută", e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Înregistrare Sportiv')),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _numeController,
                  decoration: const InputDecoration(labelText: 'Nume de Familie'),
                  validator: (value) => value!.trim().isEmpty ? 'Numele este obligatoriu' : null,
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _prenumeController,
                  decoration: const InputDecoration(labelText: 'Prenume'),
                  validator: (value) => value!.trim().isEmpty ? 'Prenumele este obligatoriu' : null,
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                 TextFormField(
                  controller: _dataNasteriiController,
                  decoration: const InputDecoration(labelText: 'Data Nașterii (YYYY-MM-DD)'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Data nașterii este obligatorie.';
                    }
                    // O validare simplă de format
                    final regex = RegExp(r'^\d{4}-\d{2}-\d{2}$');
                    if (!regex.hasMatch(value)) {
                      return 'Formatul trebuie să fie YYYY-MM-DD.';
                    }
                    return null;
                  },
                  keyboardType: TextInputType.datetime,
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _cnpController,
                  decoration: const InputDecoration(labelText: 'CNP (Opțional)'),
                  keyboardType: TextInputType.number,
                   style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: (_isLoading || _adminClubId == null) ? null : _register,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Color(0xFF0a192f))
                      : const Text('Salvează Sportiv'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
