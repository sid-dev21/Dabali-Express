import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/student_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../screens/subscriptions/new_subscription_screen.dart';

class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({super.key});

  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen> {
  String? selectedStudentId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initStudent();
    });
  }

  void _initStudent() {
    final studentProvider = context.read<StudentProvider>();
    if (studentProvider.students.isNotEmpty) {
      selectedStudentId = studentProvider.students.first.id;
      _loadSubscriptions();
    }
  }

  Future<void> _loadSubscriptions() async {
    if (selectedStudentId == null) return;
    final subscriptionProvider = context.read<SubscriptionProvider>();
    await subscriptionProvider.loadSubscriptions(selectedStudentId!);
  }

  @override
  Widget build(BuildContext context) {
    final studentProvider = context.watch<StudentProvider>();
    final subscriptionProvider = context.watch<SubscriptionProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Abonnements'),
      ),
      floatingActionButton: selectedStudentId != null
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        NewSubscriptionScreen(studentId: selectedStudentId!),
                  ),
                ).then((_) => _loadSubscriptions());
              },
              icon: const Icon(Icons.add),
              label: const Text('Nouvel abonnement'),
            )
          : null,
      body: studentProvider.students.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info_outline, size: 60, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Ajoutez d\'abord un enfant\npour créer des abonnements',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // Sélection de l'enfant
                Container(
                  padding: const EdgeInsets.all(16),
                  color: AppColors.primary.withOpacity(0.05),
                  child: DropdownButtonFormField<String>(
                    value: selectedStudentId,
                    decoration: const InputDecoration(
                      labelText: 'Sélectionner un enfant',
                      prefixIcon: Icon(Icons.child_care),
                    ),
                    items: studentProvider.students.map((student) {
                      return DropdownMenuItem(
                        value: student.id,
                        child: Text(student.fullName),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        selectedStudentId = value;
                      });
                      _loadSubscriptions();
                    },
                  ),
                ),

                // Liste des abonnements
                Expanded(
                  child: subscriptionProvider.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : subscriptionProvider.errorMessage != null
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.error_outline,
                                      size: 60, color: AppColors.error),
                                  const SizedBox(height: 16),
                                  Text(
                                    subscriptionProvider.errorMessage!,
                                    style:
                                        const TextStyle(color: AppColors.error),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: _loadSubscriptions,
                                    child: const Text('Réessayer'),
                                  ),
                                ],
                              ),
                            )
                          : subscriptionProvider.subscriptions.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.card_membership,
                                          size: 80, color: Colors.grey[400]),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Aucun abonnement',
                                        style: TextStyle(
                                          fontSize: 18,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Créez un nouvel abonnement',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey[500],
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              : RefreshIndicator(
                                  onRefresh: _loadSubscriptions,
                                  child: ListView.builder(
                                    padding: const EdgeInsets.all(16),
                                    itemCount:
                                        subscriptionProvider.subscriptions.length,
                                    itemBuilder: (context, index) {
                                      final subscription = subscriptionProvider
                                          .subscriptions[index];
                                      return Card(
                                        margin:
                                            const EdgeInsets.only(bottom: 12),
                                        shape: RoundedRectangleBorder(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                        child: ListTile(
                                          contentPadding:
                                              const EdgeInsets.all(16),
                                          leading: Container(
                                            width: 50,
                                            height: 50,
                                            decoration: BoxDecoration(
                                              color: subscription.isActive
                                                  ? AppColors.success
                                                      .withOpacity(0.1)
                                                  : Colors.grey.withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                            child: Icon(
                                              Icons.card_membership,
                                              color: subscription.isActive
                                                  ? AppColors.success
                                                  : Colors.grey,
                                            ),
                                          ),
                                          title: Text(
                                            subscription.typeLabel,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                            ),
                                          ),
                                          subtitle: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              const SizedBox(height: 4),
                                              Text(
                                                'Du ${subscription.startDate}',
                                              ),
                                              Text(
                                                'Au ${subscription.endDate}',
                                              ),
                                              const SizedBox(height: 8),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 4,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: subscription.isActive
                                                      ? AppColors.success
                                                          .withOpacity(0.1)
                                                      : Colors.grey
                                                          .withOpacity(0.1),
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                ),
                                                child: Text(
                                                  subscription.statusLabel,
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: subscription.isActive
                                                        ? AppColors.success
                                                        : Colors.grey,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          trailing: Text(
                                            subscription.formattedAmount,
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
