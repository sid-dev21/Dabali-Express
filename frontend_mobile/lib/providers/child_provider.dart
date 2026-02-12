import 'package:flutter/foundation.dart';
import '../data/repositories/child_repository.dart';
import '../data/models/child_model.dart';

class ChildProvider with ChangeNotifier {
  final ChildRepository _childRepository = ChildRepository();

  List<ChildModel> _children = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  List<ChildModel> get children => _children;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  
  List<ChildModel> get approvedChildren => _children.where((child) => child.isApproved).toList();
  List<ChildModel> get pendingChildren => _children.where((child) => child.isPending).toList();
  List<ChildModel> get rejectedChildren => _children.where((child) => child.isRejected).toList();

  // ===== FETCH CHILDREN =====
  Future<void> fetchChildren() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _children = await _childRepository.getChildren();
    } catch (e) {
      _errorMessage = 'Erreur lors de la récupération des enfants: $e';
    }

    _isLoading = false;
    notifyListeners();
  }

  // ===== ADD CHILD =====
  Future<bool> addChild({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String className,
    String? schoolId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _childRepository.addChild(
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        className: className,
        schoolId: schoolId,
      );

      if (result['success'] == true) {
        _children.add(result['child']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors de l\'ajout de l\'enfant';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de l\'ajout de l\'enfant: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== GET CHILD DETAILS =====
  Future<ChildModel?> getChildDetails(String childId) async {
    try {
      return await _childRepository.getChildDetails(childId);
    } catch (e) {
      _errorMessage = 'Erreur lors de la récupération des détails: $e';
      notifyListeners();
      return null;
    }
  }

  // ===== UPDATE CHILD =====
  Future<bool> updateChild(String childId, {
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? className,
    String? schoolId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _childRepository.updateChild(
        childId,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        className: className,
        schoolId: schoolId,
      );

      if (result['success'] == true) {
        final index = _children.indexWhere((child) => child.id == childId);
        if (index != -1) {
          _children[index] = result['child'];
        }
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors de la mise à jour';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de la mise à jour: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== DELETE CHILD =====
  Future<bool> deleteChild(String childId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _childRepository.deleteChild(childId);

      if (result['success'] == true) {
        _children.removeWhere((child) => child.id == childId);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = result['message'] ?? 'Erreur lors de la suppression';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de la suppression: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // ===== REFRESH CHILDREN =====
  Future<void> refreshChildren() async {
    await fetchChildren();
  }

  // ===== CLEAR ERROR =====
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // ===== GET CHILD BY ID =====
  ChildModel? getChildById(String childId) {
    try {
      return _children.firstWhere((child) => child.id == childId);
    } catch (e) {
      return null;
    }
  }

  // ===== SEARCH CHILDREN =====
  List<ChildModel> searchChildren(String query) {
    if (query.isEmpty) return _children;
    
    final lowerQuery = query.toLowerCase();
    return _children.where((child) =>
      child.firstName.toLowerCase().contains(lowerQuery) ||
      child.lastName.toLowerCase().contains(lowerQuery) ||
      child.className.toLowerCase().contains(lowerQuery)
    ).toList();
  }
}
