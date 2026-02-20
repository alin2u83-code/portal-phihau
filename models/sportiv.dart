
import 'grade.dart';

class Sportiv {
  final String id;
  final String nume;
  final String prenume;
  final String? email;
  final String dataNasterii;
  final String? cnp;
  final Grad? grad;

  Sportiv({
    required this.id,
    required this.nume,
    required this.prenume,
    this.email,
    required this.dataNasterii,
    this.cnp,
    this.grad,
  });

  factory Sportiv.fromJson(Map<String, dynamic> json) {
    return Sportiv(
      id: json['id'],
      nume: json['nume'],
      prenume: json['prenume'],
      email: json['email'],
      dataNasterii: json['data_nasterii'],
      cnp: json['cnp'],
      grad: json['grade'] != null ? Grad.fromJson(json['grade']) : null,
    );
  }
}
