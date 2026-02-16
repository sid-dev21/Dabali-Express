import 'package:flutter/foundation.dart';
import '../data/repositories/auth_repository.dart';
import '../data/models/user_model.dart';

class AuthProvider with ChangeNotifier {
  final AuthRepository _authRepository = AuthRepository();

  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;

  // ===== LOGIN =====
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    print('DEBUG: AuthProvider login started'); // Debug temporaire
    final result = await _authRepository.login(email, password);
    print('DEBUG: AuthProvider result: $result'); // Debug temporaire

    _isLoading = false;

    if (result['success'] == true) {
      _currentUser = result['user'];
      print('DEBUG: User set in provider: ${_currentUser?.email}'); // Debug temporaire
      notifyListeners();
      return true;
    } else {
      _errorMessage = result['message'];
      print('DEBUG: Error set in provider: $_errorMessage'); // Debug temporaire
      notifyListeners();
      return false;
    }
  }

  // ===== REGISTER =====
  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _authRepository.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    );

    _isLoading = false;

    if (result['success'] == true) {
      _currentUser = result['user'];
      notifyListeners();
      return true;
    } else {
      _errorMessage = result['message'];
      notifyListeners();
      return false;
    }
  }

  // ===== LOGOUT =====
  Future<void> logout() async {
    await _authRepository.logout();
    _currentUser = null;
    _errorMessage = null;
    notifyListeners();
  }

  // ===== CHECK LOGIN STATUS =====
  Future<void> checkLoginStatus() async {
    final isLoggedIn = await _authRepository.isLoggedIn();
    if (isLoggedIn) {
      _currentUser = await _authRepository.getCurrentUser();
      notifyListeners();
    }
  }

  // ===== UPDATE EMAIL =====
  Future<bool> updateEmail({
    required String newEmail,
    required String currentPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _authRepository.updateCredentials(
      currentPassword: currentPassword,
      newEmail: newEmail,
    );

    _isLoading = false;

    if (result['success'] == true) {
      _currentUser = result['user'] as UserModel?;
      notifyListeners();
      return true;
    }

    _errorMessage = result['message']?.toString() ?? 'Erreur lors de la mise a jour de l\'email';
    notifyListeners();
    return false;
  }

  // ===== UPDATE PASSWORD =====
  Future<bool> updatePassword({
    required String currentPassword,
    required String newPassword,
    required String confirmNewPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _authRepository.updateCredentials(
      currentPassword: currentPassword,
      newPassword: newPassword,
      confirmNewPassword: confirmNewPassword,
    );

    _isLoading = false;

    if (result['success'] == true) {
      _currentUser = result['user'] as UserModel?;
      notifyListeners();
      return true;
    }

    _errorMessage = result['message']?.toString() ?? 'Erreur lors de la mise a jour du mot de passe';
    notifyListeners();
    return false;
  }

  // ===== CLEAR ERROR =====
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
