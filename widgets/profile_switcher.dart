import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/profile_service.dart';

class ProfileSwitcher extends StatefulWidget {
  final SupabaseClient supabase;
  final ProfileService profileService;

  const ProfileSwitcher({Key? key, required this.supabase, required this.profileService}) : super(key: key);

  @override
  _ProfileSwitcherState createState() => _ProfileSwitcherState();
}

class _ProfileSwitcherState extends State<ProfileSwitcher> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _animation;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _switchRole(String roleId) async {
    setState(() {
      _isLoading = true;
    });
    await _controller.reverse();

    final success = await widget.profileService.switchPrimaryRole(roleId);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Context schimbat cu succes!' : 'Eroare la schimbarea contextului.'),
          backgroundColor: success ? Colors.green[600] : Colors.red[600],
        ),
      );
      setState(() {
        _isLoading = false;
      });
      _controller.forward();
    }
  }

  @override
  Widget build(BuildContext context) {
    final userId = widget.supabase.auth.currentUser?.id;
    if (userId == null) {
      return const Center(child: Text('Utilizator neautentificat.'));
    }

    final stream = widget.supabase
        .from('utilizator_roluri_multicont')
        .stream(primaryKey: ['id'])
        .eq('user_id', userId)
        .order('created_at', ascending: true);

    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: stream,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting || _isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Eroare: ${snapshot.error}'));
        }
        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Nu s-au găsit roluri.'));
        }

        final roles = snapshot.data!;
        final primaryRole = roles.firstWhere((r) => r['is_primary'] == true, orElse: () => roles.first);
        final otherRoles = roles.where((r) => r['id'] != primaryRole['id']).toList();

        return FadeTransition(
          opacity: _animation,
          child: Column(
            children: [
              _buildRoleCard(primaryRole, true),
              if (otherRoles.isNotEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16.0, horizontal: 8.0),
                  child: Divider(color: Colors.blueGrey, thickness: 1),
                ),
              ...otherRoles.map((role) => _buildRoleCard(role, false)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRoleCard(Map<String, dynamic> role, bool isPrimary) {
    final roleName = role['rol_denumire'] as String? ?? 'N/A';
    final clubName = role['club_denumire'] as String? ?? 'Fără club';
    final roleId = role['id'] as String;

    return Card(
      elevation: isPrimary ? 6.0 : 2.0,
      color: isPrimary ? Colors.blue[900] : Colors.blueGrey[800],
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isPrimary ? BorderSide(color: Colors.blueAccent, width: 1.5) : BorderSide.none,
      ),
      child: InkWell(
        onTap: isPrimary ? null : () => _switchRole(roleId),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
          child: Row(
            children: [
              const Text('🥋', style: TextStyle(fontSize: 32)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(roleName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    Text(clubName, style: TextStyle(fontSize: 14, color: Colors.grey[300])),
                  ],
                ),
              ),
              if (isPrimary)
                const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 24),
            ],
          ),
        ),
      ),
    );
  }
}
