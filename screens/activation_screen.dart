
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';

class ActivationScreen extends StatefulWidget {
  const ActivationScreen({super.key});

  @override
  State<ActivationScreen> createState() => _ActivationScreenState();
}

class _ActivationScreenState extends State<ActivationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  String? _selectedRole = 'SPORTIV';
  bool _isLoading = false;
  String? _adminClubId;

  @override
  void initState() {
    super.initState();
    _fetchAdminClubId();
  }

  Future<void> _fetchAdminClubId() async {
    // Într-o aplicație reală, acest ID ar fi preluat din starea globală a utilizatorului autentificat.
    // Aici, îl preluăm direct pentru demonstrație.
    if (supabase.auth.currentUser == null) return;
    try {
      final data = await supabase
          .from('sportivi')
          .select('club_id')
          .eq('user_id', supabase.auth.currentUser!.id)
          .single();
      setState(() {
        _adminClubId = data['club_id'];
      });
    } catch (e) {
      if (context.mounted) {
        _showErrorDialog("Eroare de context", "Nu am putut identifica clubul din care faceți parte. Asigurați-vă că aveți un rol de admin activ.");
      }
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
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

  Future<void> _activateAccount() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    if (_adminClubId == null) {
      _showErrorDialog("Eroare de Permisiuni", "Contextul de administrator de club nu a putut fi încărcat.");
      return;
    }
    
    setState(() => _isLoading = true);

    try {
      final result = await supabase.rpc('assign_role_to_user', params: {
        'p_email': _emailController.text.trim(),
        'p_rol_denumire': _selectedRole,
        'p_admin_club_id': _adminClubId,
      });

      if (context.mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF112240),
            title: const Text("Succes", style: TextStyle(color: Colors.white)),
            content: Text(result, style: const TextStyle(color: Color(0xFF94a3b8))),
            actions: [TextButton(child: const Text("OK"), onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            })],
          ),
        );
      }

    } on PostgrestException catch (e) {
      // Interceptăm și traducem erorile custom din funcția RPC
      String errorMessage = e.message;
      if (e.message.contains('USER_NOT_FOUND')) {
        errorMessage = "Nu există un utilizator înregistrat cu acest email. Rugați utilizatorul să-și creeze cont mai întâi.";
      } else if (e.message.contains('PROFILE_NOT_FOUND')) {
        errorMessage = "Utilizatorul există, dar nu are un profil de sportiv creat. Folosiți ecranul 'Înregistrează Sportiv'.";
      } else if (e.message.contains('PERMISSION_DENIED')) {
        errorMessage = "Acțiune nepermisă. Nu puteți asigna roluri pentru sportivi din afara clubului dumneavoastră.";
      } else if (e.message.contains('DUPLICATE_ROLE')) {
        errorMessage = "Acest rol este deja asignat utilizatorului.";
      }
      _showErrorDialog("Eroare la Asignare", errorMessage);
    } catch (e) {
      _showErrorDialog("Eroare Necunoscută", e.toString());
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final roles = ['SPORTIV', 'INSTRUCTOR', 'ADMIN_CLUB'];

    return Scaffold(
      appBar: AppBar(title: const Text('Asignează Rol / Activează Cont')),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Email Utilizator'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty || !value.contains('@')) {
                      return 'Introduceți un email valid';
                    }
                    return null;
                  },
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedRole,
                  decoration: const InputDecoration(labelText: 'Rol de Asignat'),
                  dropdownColor: const Color(0xFF112240),
                  style: const TextStyle(color: Colors.white),
                  items: roles.map((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  }).toList(),
                  onChanged: (newValue) {
                    setState(() {
                      _selectedRole = newValue;
                    });
                  },
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: (_isLoading || _adminClubId == null) ? null : _activateAccount,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Color(0xFF0a192f))
                      : const Text('Asignează Rolul'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
