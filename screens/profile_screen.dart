
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart'; // Import pentru clientul Supabase
import '../models/sportiv.dart';
import '../models/grade.dart';

class ProfileScreen extends StatefulWidget {
  final String sportivId;
  const ProfileScreen({super.key, required this.sportivId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Sportiv? _sportiv;
  List<IstoricGrade> _istoricGrade = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Am înlocuit .single() cu .select() și am adăugat o verificare pentru a preveni crash-ul.
      final sportivRes = await supabase
          .from('sportivi')
          .select('*, grad:grad_actual_id(*)')
          .eq('id', widget.sportivId);
      
      if (sportivRes.isEmpty) {
        // Cazul în care sportivul nu este găsit.
        throw const PostgrestException(message: 'Sportivul cu ID-ul specificat nu a fost găsit.');
      }
      
      final istoricRes = await supabase
          .from('istoric_grade')
          .select('*, grad:grad_id(*)')
          .eq('sportiv_id', widget.sportivId)
          .order('data_obtinere', ascending: false);

      setState(() {
        _sportiv = Sportiv.fromJson(sportivRes[0]); // Preluăm primul element din listă
        _istoricGrade = (istoricRes as List)
            .map((item) => IstoricGrade.fromJson(item))
            .toList();
      });
    } on PostgrestException catch(e) {
      setState(() {
        _error = e.message;
      });
    }
     catch (e) {
      setState(() {
        _error = 'A apărut o eroare neașteptată: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Widget _buildInfoCard(String label, String value) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 18, color: Colors.white)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profil Sportiv')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text('Eroare: $_error', style: const TextStyle(color: Colors.red)))
              : _sportiv == null
                  ? const Center(child: Text('Sportivul nu a fost găsit.'))
                  : RefreshIndicator(
                      onRefresh: _fetchData,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _buildInfoCard('Nume Complet', '${_sportiv!.nume} ${_sportiv!.prenume}'),
                          const SizedBox(height: 16),
                          _buildInfoCard('Grad Actual', _sportiv!.grad?.nume ?? 'Începător'),
                          const SizedBox(height: 16),
                          
                          // Istoric Grade
                          Text('Istoric Promovări', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                          const SizedBox(height: 8),
                          _istoricGrade.isEmpty
                            ? const Text('Niciun grad înregistrat.', style: TextStyle(color: Colors.grey))
                            : Card(
                                child: Column(
                                  children: _istoricGrade.map((item) => ListTile(
                                    leading: const Icon(Icons.star, color: Color(0xFFFFD700)),
                                    title: Text(item.grad.nume, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                    subtitle: Text(
                                      'Obținut la data: ${DateTime.parse(item.dataObtinere).toLocaleDateString()}',
                                      style: const TextStyle(color: Colors.grey)
                                    ),
                                  )).toList(),
                                ),
                              ),
                          const SizedBox(height: 16),

                          // Discipline de concurs, cu terminologia corectă
                          Text('Discipline de Concurs', style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                          const SizedBox(height: 8),
                           Card(
                                child: const Column(
                                  children: [
                                    ListTile(
                                      leading: Icon(Icons.menu_book, color: Color(0xFFFFD700)),
                                      title: Text('Thao Quyen', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      subtitle: Text('Tehnici demonstrative individuale sau în grup.', style: TextStyle(color: Colors.grey)),
                                    ),
                                     ListTile(
                                      leading: Icon(Icons.shield, color: Color(0xFFFFD700)),
                                      title: Text('Co Vo Dao', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      subtitle: Text('Lupta cu arme tradiționale.', style: TextStyle(color: Colors.grey)),
                                    ),
                                  ],
                                ),
                              ),
                        ],
                      ),
                    ),
    );
  }
}

// Extensie pentru a folosi toLocaleDateString (simplificat)
extension DateFormatting on DateTime {
  String toLocaleDateString() {
    return "${day.toString().padLeft(2, '0')}/${month.toString().padLeft(2, '0')}/$year";
  }
}
