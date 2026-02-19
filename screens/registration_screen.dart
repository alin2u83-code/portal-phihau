
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

    setState(() {
      _isLoading = true;
    });

    try {
      // Hardcodat pentru clubul Phi Hau Iași, conform structurii existente
      const clubId = 'cbb0b228-b3e0-4735-9658-70999eb256c6';

      final response = await supabase.from('sportivi').insert({
        'nume': _numeController.text.trim(),
        'prenume': _prenumeController.text.trim(),
        'cnp': _cnpController.text.trim(),
        'data_nasterii': _dataNasteriiController.text.trim(),
        'club_id': clubId,
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
      
      // GESTIONAREA ERORII SPECIFICE DE CHEIE DUPLICĂ
      if (e.message.contains('unique_sportiv_identitate')) {
        errorMessage = 'Acest sportiv este deja înregistrat în baza de date a clubului.';
      } else {
        errorMessage = e.message;
      }
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } catch (e) {
       if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Eroare: ${e.toString()}'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
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
                  validator: (value) => value!.isEmpty ? 'Numele este obligatoriu' : null,
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _prenumeController,
                  decoration: const InputDecoration(labelText: 'Prenume'),
                  validator: (value) => value!.isEmpty ? 'Prenumele este obligatoriu' : null,
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _cnpController,
                  decoration: const InputDecoration(labelText: 'CNP (Opțional)'),
                  keyboardType: TextInputType.number,
                   style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _dataNasteriiController,
                  decoration: const InputDecoration(labelText: 'Data Nașterii (YYYY-MM-DD) (Opțional)'),
                   style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading ? null : _register,
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
