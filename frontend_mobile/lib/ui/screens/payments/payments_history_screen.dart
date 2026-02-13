import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/payment_provider.dart';
import '../../../providers/student_provider.dart';
import '../../../core/constants/app_colors.dart';
import 'payment_screen.dart';

class PaymentHistoryScreen extends StatefulWidget {
  const PaymentHistoryScreen({super.key});

  @override
  State<PaymentHistoryScreen> createState() => _PaymentHistoryScreenState();
}

class _PaymentHistoryScreenState extends State<PaymentHistoryScreen> {
  String? _selectedStudentId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPayments();
    });
  }

  Future<void> _loadPayments() async {
    final authProvider = context.read<AuthProvider>();
    final paymentProvider = context.read<PaymentProvider>();

    if (authProvider.currentUser != null) {
      await paymentProvider.loadPayments(authProvider.currentUser!.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final paymentProvider = context.watch<PaymentProvider>();
    final studentProvider = context.watch<StudentProvider>();
    final hasPayments = paymentProvider.payments.isNotEmpty;
    final hasError = paymentProvider.errorMessage != null;
    final filteredPayments = _selectedStudentId == null
        ? paymentProvider.payments
        : paymentProvider.payments
            .where((p) => p.studentId == _selectedStudentId)
            .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Historique des paiements'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const PaymentScreen()),
          ).then((_) => _loadPayments());
        },
        icon: const Icon(Icons.add),
        label: const Text('Nouveau paiement'),
      ),
      body: paymentProvider.isLoading && !hasPayments
          ? const Center(child: CircularProgressIndicator())
          : !hasPayments
              ? (hasError
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline,
                              size: 60, color: AppColors.error),
                          const SizedBox(height: 16),
                          Text(
                            paymentProvider.errorMessage!,
                            style: const TextStyle(color: AppColors.error),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadPayments,
                            child: const Text('Réessayer'),
                          ),
                        ],
                      ),
                    )
                  : Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.payment,
                              size: 80, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'Aucun paiement enregistré',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ))
              : Column(
                  children: [
                    if (studentProvider.students.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        color: Colors.white,
                        child: DropdownButtonFormField<String?>(
                          value: _selectedStudentId,
                          decoration: const InputDecoration(
                            labelText: 'Filtrer par enfant',
                            prefixIcon: Icon(Icons.child_care),
                          ),
                          items: [
                            const DropdownMenuItem<String?>(
                              value: null,
                              child: Text('Tous les enfants'),
                            ),
                            ...studentProvider.students.map(
                              (student) => DropdownMenuItem<String?>(
                                value: student.id,
                                child: Text(student.fullName),
                              ),
                            ),
                          ],
                          onChanged: (value) {
                            setState(() {
                              _selectedStudentId = value;
                            });
                          },
                        ),
                      ),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _loadPayments,
                        child: filteredPayments.isEmpty
                            ? ListView(
                                children: [
                                  const SizedBox(height: 120),
                                  Center(
                                    child: Column(
                                      children: [
                                        Icon(Icons.search_off,
                                            size: 64, color: Colors.grey[400]),
                                        const SizedBox(height: 12),
                                        Text(
                                          'Aucun paiement pour ce filtre',
                                          style: TextStyle(
                                            fontSize: 16,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              )
                            : ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: filteredPayments.length,
                                itemBuilder: (context, index) {
                                  final payment = filteredPayments[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              color: payment.isSuccess
                                  ? AppColors.success.withOpacity(0.1)
                                  : AppColors.error.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              payment.isSuccess
                                  ? Icons.check_circle
                                  : Icons.error,
                              color: payment.isSuccess
                                  ? AppColors.success
                                  : AppColors.error,
                            ),
                          ),
                          title: Text(
                            payment.methodLabel,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (payment.studentName != null)
                                Text('Enfant: ${payment.studentName}'),
                              const SizedBox(height: 4),
                              if (payment.reference != null)
                                Text('Réf: ${payment.reference}'),
                              if (payment.paidAt != null)
                                Text('Le ${payment.paidAt}'),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: payment.isSuccess
                                      ? AppColors.success.withOpacity(0.1)
                                      : AppColors.error.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  payment.statusLabel,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: payment.isSuccess
                                        ? AppColors.success
                                        : AppColors.error,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              if (index == 0 && hasError) ...[
                                const SizedBox(height: 8),
                                Text(
                                  paymentProvider.errorMessage!,
                                  style: const TextStyle(
                                    color: AppColors.warning,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          trailing: Text(
                            payment.formattedAmount,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      );
                                },
                              ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
