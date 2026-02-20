
class Grad {
  final String id;
  final String nume;
  final int ordine;

  Grad({
    required this.id,
    required this.nume,
    required this.ordine,
  });

  factory Grad.fromJson(Map<String, dynamic> json) {
    return Grad(
      id: json['id'],
      nume: json['nume'],
      ordine: json['ordine'] ?? 99,
    );
  }
}

class IstoricGrade {
  final String id;
  final String sportivId;
  final String dataObtinere;
  final Grad grad;

  IstoricGrade({
    required this.id,
    required this.sportivId,
    required this.dataObtinere,
    required this.grad,
  });

  factory IstoricGrade.fromJson(Map<String, dynamic> json) {
    return IstoricGrade(
      id: json['id'],
      sportivId: json['sportiv_id'],
      dataObtinere: json['data_obtinere'],
      grad: Grad.fromJson(json['grad']),
    );
  }
}
