import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../core/constants/app_colors.dart';

class NewSubscriptionScreen extends StatefulWidget {
  final String studentId;

  const NewSubscriptionScreen({super.key, required this.studentId});

  @override
  State<NewSubscriptionScreen> createState() => _NewSubscriptionScreenState();
}

class _NewSubscriptionScreenState extends State<NewSubscriptionScreen> {
  final _formKey = GlobalKey<FormState>();
  String selectedType = 'DAILY';
  DateTime selectedDate = DateTime.now();
  
  final Map<String, double> prices = {
    'DAILY': 1000,
    'WEEKLY': 5000,
    'MONTHLY': 20000,
    'TRIMESTER': 50000,
  };

  final Map<String, String> typeLabels = {
    'DAILY': 'Journalier',
    'WEEKLY': 'Hebdomadaire',
    'MONTHLY': 'Mensuel',
    'TRIMESTER': 'Trimestriel',
  };

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final subscriptionProvider = context.read<SubscriptionProvider>();
    
    final success = await subscriptionProvider.createSubscription(
      studentId: widget.studentId,
      mealPlan: _toMealPlan(selectedType),
      startDate: selectedDate.toIso8601String().split('T')[0],
      price: prices[selectedType]!,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Abonnement créé avec succès'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(subscriptionProvider.errorMessage ?? 'Erreur'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvel Abonnement'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Info carte
              Card(
                color: AppColors.info.withOpacity(0.1),
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: AppColors.info),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Choisissez la durée de l\'abonnement pour votre enfant.',
                          style: TextStyle(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Type d'abonnement
              const Text(
                'Type d\'abonnement',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ...typeLabels.entries.map((entry) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: RadioListTile<String>(
                    value: entry.key,
                    groupValue: selectedType,
                    onChanged: (value) {
                      setState(() {
                        selectedType = value!;
                      });
                    },
                    title: Text(
                      entry.value,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      '${prices[entry.key]!.toStringAsFixed(0)} FCFA',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                );
              }).toList(),
              const SizedBox(height: 24),

              // Date de début
              const Text(
                'Date de début',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.calendar_today),
                  title: Text(
                    '${selectedDate.day}/${selectedDate.month}/${selectedDate.year}',
                  ),
                  trailing: const Icon(Icons.edit),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) {
                      setState(() {
                        selectedDate = date;
                      });
                    }
                  },
                ),
              ),
              const SizedBox(height: 32),

              // Résumé
              Card(
                color: AppColors.primary.withOpacity(0.05),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Résumé',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Type :'),
                          Text(
                            typeLabels[selectedType]!,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Montant total :'),
                          Text(
                            '${prices[selectedType]!.toStringAsFixed(0)} FCFA',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Bouton de soumission
              Consumer<SubscriptionProvider>(
                builder: (context, provider, _) {
                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: provider.isLoading ? null : _handleSubmit,
                      child: provider.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Créer l\'abonnement'),
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

  String _toMealPlan(String uiType) {
    switch (uiType) {
      case 'WEEKLY':
      case 'MONTHLY':
      case 'TRIMESTER':
        return 'PREMIUM';
      default:
        return 'STANDARD';
    }
  }
}
