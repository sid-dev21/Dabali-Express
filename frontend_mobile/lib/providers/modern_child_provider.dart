import 'package:flutter/foundation.dart';
import '../data/services/child_service.dart';
import '../data/models/child.dart';
import '../data/services/modern_api_service.dart';

class ModernChildProvider extends ChangeNotifier {
  final ChildService _childService;
  List<Child> _children = [];
  bool _isLoading = false;
  String? _errorMessage;

  ModernChildProvider(this._childService);

  // Getters
  List<Child> get children => List.unmodifiable(_children);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasChildren => _children.isNotEmpty;
  List<Child> get approvedChildren => _children.where((child) => child.isApproved).toList();
  List<Child> get pendingChildren => _children.where((child) => child.isPending).toList();
  int get approvedChildrenCount => approvedChildren.length;
  int get pendingChildrenCount => pendingChildren.length;

  // Charger tous les enfants
  Future<bool> loadChildren() async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _childService.getChildren();

      if (response.success && response.data != null) {
        _children = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du chargement des enfants');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Ajouter un enfant
  Future<bool> addChild({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String className,
    required String schoolId,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _childService.addChild(
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        className: className,
        schoolId: schoolId,
      );

      if (response.success && response.data != null) {
        _children.add(response.data!);
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de l\'ajout de l\'enfant');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mettre à jour un enfant
  Future<bool> updateChild({
    required String childId,
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? className,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _childService.updateChild(
        childId: childId,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        className: className,
      );

      if (response.success && response.data != null) {
        final index = _children.indexWhere((child) => child.id == childId);
        if (index != -1) {
          _children[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la mise à jour');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Supprimer un enfant
  Future<bool> deleteChild(String childId) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _childService.deleteChild(childId);

      if (response.success) {
        _children.removeWhere((child) => child.id == childId);
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la suppression');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mettre à jour la photo d'un enfant
  Future<bool> updateChildPhoto({
    required String childId,
    required String photoUrl,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _childService.updateChildPhoto(
        childId: childId,
        photoUrl: photoUrl,
      );

      if (response.success && response.data != null) {
        final index = _children.indexWhere((child) => child.id == childId);
        if (index != -1) {
          _children[index] = response.data!;
          notifyListeners();
        }
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la mise à jour de la photo');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Obtenir un enfant par son ID
  Child? getChildById(String childId) {
    try {
      return _children.firstWhere((child) => child.id == childId);
    } catch (e) {
      return null;
    }
  }

  // Obtenir les statistiques d'un enfant
  Future<Map<String, dynamic>?> getChildStats(String childId) async {
    try {
      final response = await _childService.getChildStats(childId);
      if (response.success && response.data != null) {
        return response.data!;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Obtenir l'historique de présence d'un enfant
  Future<List<Map<String, dynamic>>?> getChildAttendanceHistory(
    String childId, {
    int? limit,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final response = await _childService.getChildAttendanceHistory(
        childId,
        limit: limit,
        startDate: startDate,
        endDate: endDate,
      );
      if (response.success && response.data != null) {
        return response.data!;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Rafraîchir la liste des enfants
  Future<bool> refreshChildren() async {
    return await loadChildren();
  }

  // Vider la liste des enfants (pour la déconnexion)
  void clearChildren() {
    _children.clear();
    notifyListeners();
  }

  // Méthodes privées
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  String _getErrorMessage(dynamic error) {
    if (error is ApiException) {
      return error.message;
    } else if (error is NetworkException) {
      return 'Erreur de connexion. Vérifiez votre internet.';
    } else if (error is ServerException) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (error is ValidationException) {
      return error.errors?.join(', ') ?? error.message;
    } else {
      return 'Une erreur inattendue est survenue.';
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}
