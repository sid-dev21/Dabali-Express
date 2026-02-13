import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../data/models/attendance_model.dart';
import '../../../data/repositories/attendance_repository.dart';
import '../../../data/models/student_model.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/payment_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../subscriptions/new_subscription_screen.dart';

class StudentDetailScreen extends StatefulWidget {
  final StudentModel student;

  const StudentDetailScreen({super.key, required this.student});

  @override
  State<StudentDetailScreen> createState() => _StudentDetailScreenState();
}

class _StudentDetailScreenState extends State<StudentDetailScreen> {
  final AttendanceRepository _attendanceRepository = AttendanceRepository();
  List<AttendanceModel> _attendanceRecords = [];
  bool _isAttendanceLoading = false;
  String? _attendanceError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadStudentData();
    });
  }

  Future<void> _loadStudentData() async {
    await _loadSubscriptions();
    await _loadPayments();
    await _loadAttendance();
  }

  Future<void> _loadSubscriptions() async {
    final subscriptionProvider = context.read<SubscriptionProvider>();
    await subscriptionProvider.loadSubscriptions(widget.student.id);
  }

  Future<void> _loadPayments() async {
    final authProvider = context.read<AuthProvider>();
    final paymentProvider = context.read<PaymentProvider>();
    final userId = authProvider.currentUser?.id;
    if (userId == null) return;
    await paymentProvider.loadPayments(userId);
  }

  Future<void> _loadAttendance() async {
    setState(() {
      _isAttendanceLoading = true;
      _attendanceError = null;
    });

    try {
      final data = await _attendanceRepository.getAttendanceByStudent(widget.student.id);
      if (!mounted) return;
      setState(() {
        _attendanceRecords = data;
        _isAttendanceLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _attendanceRecords = [];
        _attendanceError = e.toString().replaceFirst('Exception: ', '');
        _isAttendanceLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final subscriptionProvider = context.watch<SubscriptionProvider>();
    final paymentProvider = context.watch<PaymentProvider>();
    final subscriptionIds =
        subscriptionProvider.subscriptions.map((sub) => sub.id).toSet();
    final studentPayments = paymentProvider.payments
        .where(
          (payment) =>
              payment.studentId == widget.student.id ||
              subscriptionIds.contains(payment.subscriptionId),
        )
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.student.fullName),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // En-tête avec photo
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: AppColors.primary.withOpacity(0.2),
                    backgroundImage: widget.student.photoUrl != null
                        ? NetworkImage(widget.student.photoUrl!)
                        : null,
                    child: widget.student.photoUrl == null
                        ? const Icon(Icons.child_care,
                            size: 50, color: AppColors.primary)
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.student.fullName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (widget.student.className != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      widget.student.className!,
                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                    ),
                  ],
                ],
              ),
            ),

            // Informations
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoCard(
                    icon: Icons.school,
                    title: 'École',
                    value: widget.student.school?.name ?? 'Non spécifiée',
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    icon: Icons.class_,
                    title: 'Classe',
                    value: widget.student.className ?? 'Non spécifiée',
                  ),
                  const SizedBox(height: 24),

                  // Abonnement actif
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Abonnements',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => NewSubscriptionScreen(
                                studentId: widget.student.id,
                              ),
                            ),
                          ).then((_) => _loadStudentData());
                        },
                        icon: const Icon(Icons.add),
                        label: const Text('Nouveau'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Liste des abonnements
                  if (subscriptionProvider.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (subscriptionProvider.subscriptions.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Text(
                            'Aucun abonnement',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ),
                      ),
                    )
                  else
                    ...subscriptionProvider.subscriptions.map((sub) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: Icon(
                            Icons.card_membership,
                            color: sub.isActive
                                ? AppColors.success
                                : Colors.grey,
                          ),
                          title: Text(sub.typeLabel),
                          subtitle: Text(
                            'Du ${sub.startDate} au ${sub.endDate}',
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                sub.formattedAmount,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: sub.isActive
                                      ? AppColors.success.withOpacity(0.1)
                                      : Colors.grey.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  sub.statusLabel,
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: sub.isActive
                                        ? AppColors.success
                                        : Colors.grey,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  const SizedBox(height: 24),
                  const Text(
                    'Présences',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_isAttendanceLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (_attendanceError != null)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          _attendanceError!,
                          style: const TextStyle(color: AppColors.error),
                        ),
                      ),
                    )
                  else if (_attendanceRecords.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Text(
                            'Aucune présence enregistrée',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ),
                      ),
                    )
                  else
                    ..._attendanceRecords.take(10).map((attendance) {
                      final color = attendance.present ? AppColors.success : AppColors.error;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: Icon(
                            attendance.present ? Icons.check_circle : Icons.cancel,
                            color: color,
                          ),
                          title: Text(attendance.presenceLabel),
                          subtitle: Text(
                            attendance.menuDescription != null && attendance.menuDescription!.isNotEmpty
                                ? '${attendance.formattedDate} - ${attendance.menuDescription}'
                                : attendance.formattedDate,
                          ),
                          trailing: Text(
                            attendance.mealType ?? '',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  const SizedBox(height: 24),
                  const Text(
                    'Historique des paiements',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (paymentProvider.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (studentPayments.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Text(
                            'Aucun paiement pour cet enfant',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ),
                      ),
                    )
                  else
                    ...studentPayments.map((payment) {
                      final statusColor = payment.isSuccess
                          ? AppColors.success
                          : AppColors.error;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          leading: Icon(Icons.payment, color: statusColor),
                          title: Text(payment.methodLabel),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (payment.reference != null)
                                Text('Réf: ${payment.reference}'),
                              if (payment.paidAt != null)
                                Text('Le ${payment.paidAt}'),
                            ],
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                payment.formattedAmount,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                payment.statusLabel,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: statusColor,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
