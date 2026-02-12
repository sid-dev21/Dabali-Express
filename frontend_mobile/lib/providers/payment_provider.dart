import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import '../data/repositories/payment_repository.dart';
import '../data/models/payment_model.dart';

class PaymentProvider with ChangeNotifier {
  final PaymentRepository _repository = PaymentRepository();

  List<PaymentModel> _payments = [];
  PaymentModel? _currentPayment;
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  // Getters
  List<PaymentModel> get payments => _payments;
  PaymentModel? get currentPayment => _currentPayment;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;
  bool get hasPayments => _payments.isNotEmpty;

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

  // ===== LOAD PAYMENTS BY PARENT =====
  Future<void> loadPayments(String parentId) async {
    _isLoading = true;
    _errorMessage = null;
    _notifySafely();

    try {
      final fetchedPayments = await _repository.getPaymentsByParent(parentId);
      _payments = fetchedPayments;
      _isLoading = false;
      _notifySafely();
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _notifySafely();
    }
  }

  // ===== CREATE PAYMENT =====
  Future<bool> createPayment({
    required String subscriptionId,
    required double amount,
    required String method,
    required String phone,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    _successMessage = null;
    _notifySafely();

    final result = await _repository.createPayment(
      subscriptionId: subscriptionId,
      amount: amount,
      method: method,
      phone: phone,
    );

    _isLoading = false;

    if (result['success'] == true) {
      _currentPayment = result['payment'];
      _successMessage = result['message'];
      _notifySafely();
      return true;
    } else {
      _errorMessage = result['message'];
      _notifySafely();
      return false;
    }
  }

  // ===== VERIFY PAYMENT =====
  Future<bool> verifyPayment(String paymentId) async {
    _isLoading = true;
    _notifySafely();

    final result = await _repository.verifyPayment(paymentId);

    _isLoading = false;

    if (result['success'] == true) {
      _currentPayment = result['payment'];
      _notifySafely();
      return _currentPayment?.isSuccess ?? false;
    } else {
      _errorMessage = result['message'];
      _notifySafely();
      return false;
    }
  }

  Future<bool> refreshPaymentStatus({
    required String paymentId,
    required String parentId,
  }) async {
    final ok = await verifyPayment(paymentId);
    await loadPayments(parentId);
    return ok;
  }

  // ===== GET SUCCESSFUL PAYMENTS =====
  List<PaymentModel> get successfulPayments {
    return _payments.where((p) => p.isSuccess).toList();
  }

  // ===== CLEAR MESSAGES =====
  void clearMessages() {
    _errorMessage = null;
    _successMessage = null;
    _currentPayment = null;
    _notifySafely();
  }
}
