import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  // Singleton pattern
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final _secureStorage = const FlutterSecureStorage();
  SharedPreferences? _prefs;

  // Initialiser SharedPreferences
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // ===== TOKEN JWT (Secure Storage) =====
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: 'auth_token', value: token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: 'auth_token');
  }

  Future<void> deleteToken() async {
    await _secureStorage.delete(key: 'auth_token');
  }

  // ===== USER ID (SharedPreferences) =====
  Future<void> saveUserId(int userId) async {
    await _prefs?.setInt('user_id', userId);
  }

  int? getUserId() {
    return _prefs?.getInt('user_id');
  }

  // ===== USER EMAIL (SharedPreferences) =====
  Future<void> saveUserEmail(String email) async {
    await _prefs?.setString('user_email', email);
  }

  String? getUserEmail() {
    return _prefs?.getString('user_email');
  }

  // ===== CLEAR ALL =====
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
    await _prefs?.clear();
  }
}