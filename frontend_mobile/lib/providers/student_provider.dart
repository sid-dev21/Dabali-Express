import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import '../data/repositories/student_repository.dart';
import '../data/models/student_model.dart';

class StudentProvider with ChangeNotifier {
  final StudentRepository _repository = StudentRepository();

  List<StudentModel> _students = [];
  StudentModel? _selectedStudent;
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  List<StudentModel> get students => _students;
  StudentModel? get selectedStudent => _selectedStudent;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasStudents => _students.isNotEmpty;

  void _notifySafely() {
    final phase = SchedulerBinding.instance.schedulerPhase;
    if (phase == SchedulerPhase.persistentCallbacks ||
        phase == SchedulerPhase.transientCallbacks ||
        phase == SchedulerPhase.midFrameMicrotasks) {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return;
    }
    notifyListeners();
  }

  // ===== LOAD STUDENTS BY PARENT =====
  Future<void> loadStudents(String parentId) async {
    _isLoading = true;
    _errorMessage = null;
    _notifySafely();

    try {
      _students = await _repository.getStudentsByParent(parentId);
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Erreur lors du chargement des étudiants';
      _notifySafely();
    }
  }

  // ===== SELECT STUDENT =====
  Future<void> selectStudent(String studentId) async {
    _isLoading = true;
    _notifySafely();

    try {
      _selectedStudent = await _repository.getStudentById(studentId);
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Erreur lors du chargement de l\'étudiant';
      _notifySafely();
    }
  }

  // ===== ADD STUDENT =====
  Future<bool> addStudent({
    required String parentId,
    required String firstName,
    required String lastName,
    String? className,
    required String schoolId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _repository.createStudent(
      parentId: parentId,
      firstName: firstName,
      lastName: lastName,
      className: className,
      schoolId: schoolId,
    );

    _isLoading = false;

    if (result['success'] == true) {
      _students = await _repository.getStudentsByParent(parentId);
      _notifySafely();
      return true;
    }

    _errorMessage = result['message'] ?? 'Erreur lors de l\'ajout de l\'enfant';
    _notifySafely();
    return false;
  }

  // ===== CLEAR SELECTED =====
  void clearSelected() {
    _selectedStudent = null;
    _notifySafely();
  }

  // ===== CLEAR ERROR =====
  void clearError() {
    _errorMessage = null;
    _notifySafely();
  }
}
