import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/student_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../providers/payment_provider.dart';
import '../../../core/constants/app_colors.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  
  String? selectedStudentId;
  String? selectedSubscriptionId;
  String selectedMethod = 'ORANGE_MONEY';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initStudent();
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
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
    
    // Sélectionner l'abonnement actif par défaut
    final activeSub = subscriptionProvider.getActiveSubscription();
    if (!mounted) return;
    if (activeSub != null) {
      setState(() {
        selectedSubscriptionId = activeSub.id;
      });
    }
  }

  Future<void> _handlePayment() async {
    if (!_formKey.currentState!.validate()) return;
    if (selectedSubscriptionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner un abonnement'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final subscriptionProvider = context.read<SubscriptionProvider>();
    final subscription = subscriptionProvider.subscriptions
        .firstWhere((s) => s.id == selectedSubscriptionId);

    final paymentProvider = context.read<PaymentProvider>();
    
    final success = await paymentProvider.createPayment(
      subscriptionId: selectedSubscriptionId!,
      amount: subscription.price,
      method: selectedMethod,
      phone: _phoneController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Paiement initié avec succès'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(paymentProvider.errorMessage ?? 'Erreur de paiement'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final studentProvider = context.watch<StudentProvider>();
    final subscriptionProvider = context.watch<SubscriptionProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau Paiement'),
      ),
      body: studentProvider.students.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.info_outline, size: 60, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'Ajoutez d\'abord un enfant\navec un abonnement',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Sélection de l'enfant
                    const Text(
                      'Sélectionner un enfant',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: selectedStudentId,
                      decoration: const InputDecoration(
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
                          selectedSubscriptionId = null;
                        });
                        _loadSubscriptions();
                      },
                    ),
                    const SizedBox(height: 24),

                    // Sélection de l'abonnement
                    if (subscriptionProvider.subscriptions.isNotEmpty) ...[
                      const Text(
                        'Abonnement à payer',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedSubscriptionId,
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.card_membership),
                        ),
                        items:
                            subscriptionProvider.subscriptions.map((sub) {
                          return DropdownMenuItem(
                            value: sub.id,
                            child: Text(
                                '${sub.typeLabel} - ${sub.formattedAmount}'),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            selectedSubscriptionId = value;
                          });
                        },
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Méthode de paiement
                    const Text(
                      'Méthode de paiement',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: RadioListTile<String>(
                        value: 'ORANGE_MONEY',
                        groupValue: selectedMethod,
                        onChanged: (value) {
                          setState(() {
                            selectedMethod = value!;
                          });
                        },
                        title: const Text('Orange Money'),
                        secondary: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.orangeMoney.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.phone_android,
                              color: AppColors.orangeMoney),
                        ),
                      ),
                    ),
                    Card(
                      child: RadioListTile<String>(
                        value: 'MOOV_MONEY',
                        groupValue: selectedMethod,
                        onChanged: (value) {
                          setState(() {
                            selectedMethod = value!;
                          });
                        },
                        title: const Text('Moov Money'),
                        secondary: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.moovMoney.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.phone_android,
                              color: AppColors.moovMoney),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Numéro de téléphone
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Numéro de téléphone',
                        prefixIcon: Icon(Icons.phone),
                        hintText: 'Ex: 70123456',
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Veuillez entrer votre numéro';
                        }
                        if (value.length < 8) {
                          return 'Numéro invalide';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 32),

                    // Bouton de paiement
                    Consumer<PaymentProvider>(
                      builder: (context, provider, _) {
                        return SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: provider.isLoading ? null : _handlePayment,
                            icon: provider.isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.payment),
                            label: const Text('Payer maintenant'),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
