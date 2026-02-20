import 'package:flutter/material.dart';

class RoleSelectionScreen extends StatelessWidget {
  // Presupunem că vom primi o listă de roluri. Structura exactă a datelor va trebui definită.
  final List<Map<String, dynamic>> userRoles;
  final Function(String) onRoleSelected;

  const RoleSelectionScreen({
    Key? key,
    required this.userRoles,
    required this.onRoleSelected,
  }) : super(key: key);

  IconData _getIconForRole(String roleName) {
    switch (roleName.toUpperCase()) {
      case 'ADMIN':
      case 'SUPER ADMIN':
        return Icons.admin_panel_settings;
      case 'INSTRUCTOR':
        return Icons.sports_martial_arts;
      case 'SPORTIV':
        return Icons.person;
      default:
        return Icons.group;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Selectează Rolul'),
        backgroundColor: Colors.blueGrey[900],
      ),
      backgroundColor: Colors.blueGrey[800],
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: userRoles.length,
        itemBuilder: (context, index) {
          final role = userRoles[index];
          // TODO: Asigură-te că aceste chei corespund cu datele reale din Supabase
          final roleName = role['rol_denumire'] as String? ?? 'N/A';
          final clubName = role['club_denumire'] as String?;
          final roleId = role['id'] as String; // ID-ul din utilizator_roluri_multicont
          final isPrimary = role['is_primary'] as bool? ?? false;

          return Card(
            elevation: isPrimary ? 8.0 : 4.0,
            margin: const EdgeInsets.symmetric(vertical: 8.0),
            color: isPrimary ? Colors.blue[800] : Colors.blueGrey[700],
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(15.0),
              side: isPrimary
                  ? BorderSide(color: Colors.lightBlueAccent, width: 2)
                  : BorderSide.none,
            ),
            child: InkWell(
              onTap: () => onRoleSelected(roleId),
              borderRadius: BorderRadius.circular(15.0),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Row(
                  children: [
                    Icon(
                      _getIconForRole(roleName),
                      size: 40.0,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 24.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            roleName,
                            style: const TextStyle(
                              fontSize: 22.0,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          if (clubName != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Text(
                                clubName,
                                style: TextStyle(
                                  fontSize: 16.0,
                                  color: Colors.blueGrey[200],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (isPrimary)
                      const Icon(
                        Icons.check_circle,
                        color: Colors.lightGreenAccent,
                        size: 28.0,
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
