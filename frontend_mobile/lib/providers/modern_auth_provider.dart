import 'package:flutter/foundation.dart';
import '../data/services/auth_service.dart';
import '../data/models/user.dart';
import '../data/services/modern_api_service.dart';

class ModernAuthProvider extends ChangeNotifier {
  final AuthService _authService;
  User? _user;
  bool _isLoading = false;
  String? _errorMessage;

  ModernAuthProvider(this._authService);

  // Getters
  User? get currentUser => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  bool get isParent => _user?.isParent ?? false;
  bool get isAdmin => _user?.isAdmin ?? false;
  bool get isSchoolAdmin => _user?.isSchoolAdmin ?? false;

  // Inscription
  Future<bool> registerParent({
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String password,
    required String schoolId,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _authService.registerParent(
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        password: password,
        schoolId: schoolId,
      );

      if (response.success && response.data != null) {
        _user = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de l\'inscription');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Connexion
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _authService.login(
        email: email,
        password: password,
      );

      if (response.success && response.data != null) {
        _user = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la connexion');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Déconnexion
  Future<void> logout() async {
    _setLoading(true);
    _clearError();

    try {
      await _authService.logout();
      _user = null;
      notifyListeners();
    } catch (e) {
      // Même en cas d'erreur, on déconnecte l'utilisateur localement
      _user = null;
      notifyListeners();
    } finally {
      _setLoading(false);
    }
  }

  // Vérifier si l'utilisateur est connecté
  Future<bool> checkAuthStatus() async {
    _setLoading(true);
    _clearError();

    try {
      final isLoggedIn = await _authService.isLoggedIn();
      
      if (isLoggedIn) {
        final response = await _authService.getProfile();
        if (response.success && response.data != null) {
          _user = response.data!;
          notifyListeners();
          return true;
        }
      }
      
      _user = null;
      notifyListeners();
      return false;
    } catch (e) {
      _user = null;
      notifyListeners();
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mettre à jour le profil
  Future<bool> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _authService.updateProfile(
        firstName: firstName,
        lastName: lastName,
        phone: phone,
      );

      if (response.success && response.data != null) {
        _user = response.data!;
        notifyListeners();
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

  // Changer le mot de passe
  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _authService.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );

      if (response.success) {
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors du changement de mot de passe');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mot de passe oublié
  Future<bool> forgotPassword(String email) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _authService.forgotPassword(email);

      if (response.success) {
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de l\'envoi de l\'email');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Réinitialiser le mot de passe
  Future<bool> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final response = await _authService.resetPassword(
        token: token,
        newPassword: newPassword,
      );

      if (response.success) {
        return true;
      } else {
        _setError(response.message ?? 'Erreur lors de la réinitialisation');
        return false;
      }
    } catch (e) {
      _setError(_getErrorMessage(e));
      return false;
    } finally {
      _setLoading(false);
    }
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
    } else if (error is AuthException) {
      return 'Erreur d\'authentification.';
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
