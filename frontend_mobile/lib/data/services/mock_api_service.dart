import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

/// Service API mocké pour tester sans backend
/// Retourne des données fictives pour simuler le serveur
class MockApiService {
  final Logger _logger = Logger();
  static int _nextUserId = 1;
  static int _nextStudentId = 1;
  static int _nextSubscriptionId = 1;
  static int _nextPaymentId = 1;

  static int? _currentParentId;
  static final Map<String, int> _userIdsByEmail = {};
  static final Map<int, Map<String, dynamic>> _usersById = {};
  static final Map<int, List<Map<String, dynamic>>> _studentsByParent = {};
  static final Map<int, List<Map<String, dynamic>>> _subscriptionsByStudent = {};
  static final List<Map<String, dynamic>> _payments = [];

  // Simulation d'un délai réseau (500ms)
  Future<void> _simulateDelay() async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  // ===== GET REQUEST =====
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    _logger.d('🔵 MOCK GET => $path');
    await _simulateDelay();

    // Simuler les différentes routes
    if (path.contains('/students/parent/')) {
      return _mockStudentsByParent(path);
    } else if (path.contains('/students/')) {
      return _mockStudentById(path);
    } else if (path.contains('/menus/week')) {
      return _mockWeekMenus();
    } else if (path.contains('/subscriptions/student/')) {
      return _mockSubscriptionsByStudent(path);
    } else if (path.contains('/payments')) {
      return _mockPayments(queryParameters: queryParameters);
    } else if (path == '/auth/me') {
      return _mockCurrentUser();
    }

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 404,
      data: {'success': false, 'message': 'Route non trouvée'},
    );
  }

  // ===== POST REQUEST =====
  Future<Response> post(String path, {dynamic data}) async {
    _logger.d('🔵 MOCK POST => $path');
    _logger.d('📦 Data: $data');
    await _simulateDelay();

    if (path == '/auth/login') {
      return _mockLogin(data);
    } else if (path == '/auth/register') {
      return _mockRegister(data);
    } else if (path == '/students') {
      return _mockCreateStudent(data);
    } else if (path == '/subscriptions') {
      return _mockCreateSubscription(data);
    } else if (path == '/payments') {
      return _mockCreatePayment(data);
    }

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 404,
      data: {'success': false, 'message': 'Route non trouvée'},
    );
  }

  // ===== PUT REQUEST =====
  Future<Response> put(String path, {dynamic data}) async {
    _logger.d('🔵 MOCK PUT => $path');
    await _simulateDelay();

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {'success': true, 'message': 'Mise à jour réussie'},
    );
  }

  // ===== DELETE REQUEST =====
  Future<Response> delete(String path) async {
    _logger.d('🔵 MOCK DELETE => $path');
    await _simulateDelay();

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {'success': true, 'message': 'Suppression réussie'},
    );
  }

  // ========== DONNÉES MOCKÉES ==========

  Response _mockLogin(dynamic data) {
    final email = (data['email'] ?? '').toString().trim().toLowerCase();
    final resolvedEmail = email.isEmpty ? 'parent$_nextUserId@example.com' : email;
    final userId = _ensureUserByEmail(
      email: resolvedEmail,
      firstName: _guessFirstName(resolvedEmail),
      lastName: _guessLastName(resolvedEmail),
      phone: '70000000',
    );
    _currentParentId = userId;

    return Response(
      requestOptions: RequestOptions(path: '/auth/login'),
      statusCode: 200,
      data: {
        'success': true,
        'token': 'mock_jwt_token_12345',
        'data': _usersById[userId],
        'message': 'Connexion réussie',
      },
    );
  }

  Response _mockRegister(dynamic data) {
    final email = (data['email'] ?? '').toString().trim().toLowerCase();
    final resolvedEmail = email.isEmpty ? 'parent$_nextUserId@example.com' : email;
    final userId = _ensureUserByEmail(
      email: resolvedEmail,
      firstName: (data['first_name'] ?? _guessFirstName(resolvedEmail)).toString(),
      lastName: (data['last_name'] ?? _guessLastName(resolvedEmail)).toString(),
      phone: (data['phone'] ?? '70000000').toString(),
    );
    _currentParentId = userId;

    return Response(
      requestOptions: RequestOptions(path: '/auth/register'),
      statusCode: 200,
      data: {
        'success': true,
        'token': 'mock_jwt_token_12345',
        'data': _usersById[userId],
        'message': 'Inscription réussie',
      },
    );
  }

  Response _mockCurrentUser() {
    if (_currentParentId == null || !_usersById.containsKey(_currentParentId)) {
      return Response(
        requestOptions: RequestOptions(path: '/auth/me'),
        statusCode: 401,
        data: {
          'success': false,
          'message': 'Utilisateur non connecté',
        },
      );
    }

    return Response(
      requestOptions: RequestOptions(path: '/auth/me'),
      statusCode: 200,
      data: {
        'success': true,
        'data': _usersById[_currentParentId],
      },
    );
  }

  Response _mockStudentsByParent(String path) {
    final parentId = _extractTrailingId(path) ?? _currentParentId;
    final students = parentId == null ? <Map<String, dynamic>>[] : _studentsByParent[parentId] ?? [];
    final hydratedStudents = students.map((student) {
      final studentId = student['id'] as int;
      final subscriptions = _subscriptionsByStudent[studentId] ?? [];
      Map<String, dynamic>? activeSubscription;
      for (final sub in subscriptions) {
        if (sub['status'] == 'ACTIVE') {
          activeSubscription = {
            'id': sub['id'],
            'type': sub['type'],
            'status': sub['status'],
            'end_date': sub['end_date'],
          };
          break;
        }
      }
      return {
        ...student,
        'school': {
          'id': student['school_id'],
          'name': 'École ${student['school_id']}',
        },
        'active_subscription': activeSubscription,
      };
    }).toList();

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {
        'success': true,
        'data': hydratedStudents,
      },
    );
  }

  Response _mockStudentById(String path) {
    final studentId = _extractTrailingId(path);
    Map<String, dynamic>? student;
    if (studentId != null) {
      for (final entry in _studentsByParent.entries) {
        for (final candidate in entry.value) {
          if (candidate['id'] == studentId) {
            student = candidate;
            break;
          }
        }
      }
    }

    if (student == null) {
      return Response(
        requestOptions: RequestOptions(path: path),
        statusCode: 404,
        data: {
          'success': false,
          'message': 'Élève introuvable',
        },
      );
    }

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {
        'success': true,
        'data': {
          ...student,
          'school': {
            'id': student['school_id'],
            'name': 'École ${student['school_id']}',
          },
        },
      },
    );
  }

  Response _mockWeekMenus() {
    final monday = _startOfWeek(DateTime.now());
    final menuDates = List.generate(
      5,
      (index) => monday.add(Duration(days: index)),
    );

    return Response(
      requestOptions: RequestOptions(path: '/menus/week/1'),
      statusCode: 200,
      data: {
        'success': true,
        'data': {
          'menus': [
            {
              'id': 1,
              'school_id': 1,
              'date': _toIsoDate(menuDates[0]),
              'meal_type': 'LUNCH',
              'description': 'Menu équilibré',
              'items': ['Riz', 'Poulet grillé', 'Légumes', 'Fruit'],
            },
            {
              'id': 2,
              'school_id': 1,
              'date': _toIsoDate(menuDates[1]),
              'meal_type': 'LUNCH',
              'description': 'Menu traditionnel',
              'items': ['Tô', 'Sauce gombo', 'Viande', 'Banane'],
            },
            {
              'id': 3,
              'school_id': 1,
              'date': _toIsoDate(menuDates[2]),
              'meal_type': 'LUNCH',
              'description': 'Menu varié',
              'items': ['Pâtes', 'Sauce tomate', 'Poisson', 'Salade'],
            },
            {
              'id': 4,
              'school_id': 1,
              'date': _toIsoDate(menuDates[3]),
              'meal_type': 'LUNCH',
              'description': 'Menu protéiné',
              'items': ['Semoule', 'Boeuf mijoté', 'Carottes', 'Yaourt'],
            },
            {
              'id': 5,
              'school_id': 1,
              'date': _toIsoDate(menuDates[4]),
              'meal_type': 'LUNCH',
              'description': 'Menu du vendredi',
              'items': ['Attiéké', 'Poisson braisé', 'Crudités', 'Orange'],
            },
          ],
        },
      },
    );
  }

  Response _mockSubscriptionsByStudent(String path) {
    final studentId = _extractTrailingId(path);
    final subscriptions = studentId == null ? <Map<String, dynamic>>[] : _subscriptionsByStudent[studentId] ?? [];

    return Response(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {
        'success': true,
        'data': subscriptions,
      },
    );
  }

  Response _mockCreateStudent(dynamic data) {
    final parentId = _toInt(data['parent_id']) ?? _currentParentId;
    if (parentId == null) {
      return Response(
        requestOptions: RequestOptions(path: '/students'),
        statusCode: 400,
        data: {
          'success': false,
          'message': 'parent_id manquant',
        },
      );
    }

    final student = {
      'id': _nextStudentId++,
      'first_name': (data['first_name'] ?? '').toString(),
      'last_name': (data['last_name'] ?? '').toString(),
      'class_name': data['class_name']?.toString(),
      'school_id': _toInt(data['school_id']) ?? 1,
      'parent_id': parentId,
      'photo_url': null,
    };

    _studentsByParent.putIfAbsent(parentId, () => []).add(student);

    return Response(
      requestOptions: RequestOptions(path: '/students'),
      statusCode: 200,
      data: {
        'success': true,
        'message': 'Enfant ajouté avec succès',
        'data': {
          ...student,
          'school': {
            'id': student['school_id'],
            'name': 'École ${student['school_id']}',
          },
          'active_subscription': null,
        },
      },
    );
  }

  Response _mockCreateSubscription(dynamic data) {
    final studentId = _toInt(data['student_id']);
    if (studentId == null) {
      return Response(
        requestOptions: RequestOptions(path: '/subscriptions'),
        statusCode: 400,
        data: {
          'success': false,
          'message': 'student_id manquant',
        },
      );
    }

    final startDate = (data['start_date'] ?? _toIsoDate(DateTime.now())).toString();
    final start = DateTime.tryParse(startDate) ?? DateTime.now();
    final endDate = _toIsoDate(start.add(const Duration(days: 30)));
    final subscriptions = _subscriptionsByStudent.putIfAbsent(studentId, () => []);
    for (var i = 0; i < subscriptions.length; i++) {
      if (subscriptions[i]['status'] == 'ACTIVE') {
        subscriptions[i] = {
          ...subscriptions[i],
          'status': 'EXPIRED',
        };
      }
    }

    final newSub = {
      'id': _nextSubscriptionId++,
      'student_id': studentId,
      'start_date': startDate,
      'end_date': endDate,
      'type': (data['type'] ?? 'MONTHLY').toString(),
      'amount': _toNum(data['amount']) ?? 0,
      'status': 'ACTIVE',
    };
    subscriptions.insert(0, newSub);

    return Response(
      requestOptions: RequestOptions(path: '/subscriptions'),
      statusCode: 200,
      data: {
        'success': true,
        'data': newSub,
        'message': 'Abonnement créé avec succès',
      },
    );
  }

  Response _mockPayments({Map<String, dynamic>? queryParameters}) {
    final parentId = _toInt(queryParameters?['parent_id']) ?? _currentParentId;
    final payments = parentId == null
        ? <Map<String, dynamic>>[]
        : _payments.where((p) => p['parent_id'] == parentId).toList();

    return Response(
      requestOptions: RequestOptions(path: '/payments'),
      statusCode: 200,
      data: {
        'success': true,
        'data': payments,
      },
    );
  }

  Response _mockCreatePayment(dynamic data) {
    final parentId = _currentParentId ?? _toInt(data['parent_id']) ?? 1;
    final payment = {
      'id': _nextPaymentId++,
      'subscription_id': _toInt(data['subscription_id']) ?? 0,
      'parent_id': parentId,
      'amount': _toNum(data['amount']) ?? 0,
      'method': (data['method'] ?? 'ORANGE_MONEY').toString(),
      'status': 'SUCCESS',
      'reference': 'MOCK${DateTime.now().millisecondsSinceEpoch}',
      'paid_at': DateTime.now().toIso8601String(),
    };
    _payments.insert(0, payment);

    return Response(
      requestOptions: RequestOptions(path: '/payments'),
      statusCode: 200,
      data: {
        'success': true,
        'data': payment,
        'message': 'Paiement effectué avec succès',
      },
    );
  }

  int _ensureUserByEmail({
    required String email,
    required String firstName,
    required String lastName,
    required String phone,
  }) {
    if (_userIdsByEmail.containsKey(email)) {
      return _userIdsByEmail[email]!;
    }

    final userId = _nextUserId++;
    _userIdsByEmail[email] = userId;
    _usersById[userId] = {
      'id': userId,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
      'role': 'PARENT',
    };
    _studentsByParent.putIfAbsent(userId, () => []);
    return userId;
  }

  int? _extractTrailingId(String path) {
    final segments = path.split('/');
    if (segments.isEmpty) return null;
    return int.tryParse(segments.last);
  }

  int? _toInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    return int.tryParse(value.toString());
  }

  num? _toNum(dynamic value) {
    if (value == null) return null;
    if (value is num) return value;
    return num.tryParse(value.toString());
  }

  DateTime _startOfWeek(DateTime date) {
    return date.subtract(Duration(days: date.weekday - 1));
  }

  String _toIsoDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  String _guessFirstName(String email) {
    final localPart = email.split('@').first;
    if (localPart.isEmpty) return 'Parent';
    final first = localPart.split('.').first;
    if (first.isEmpty) return 'Parent';
    return '${first[0].toUpperCase()}${first.substring(1)}';
  }

  String _guessLastName(String email) {
    final localPart = email.split('@').first;
    final parts = localPart.split('.');
    if (parts.length < 2 || parts[1].isEmpty) return 'Utilisateur';
    final last = parts[1];
    return '${last[0].toUpperCase()}${last.substring(1)}';
  }
}
