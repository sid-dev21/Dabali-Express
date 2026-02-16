import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../data/models/subscription_model.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../payments/payment_screen.dart';

class CreateSubscriptionScreen extends StatefulWidget {
  final String childId;

  const CreateSubscriptionScreen({super.key, required this.childId});

  @override
  State<CreateSubscriptionScreen> createState() => _CreateSubscriptionScreenState();
}

class _CreateSubscriptionScreenState extends State<CreateSubscriptionScreen> {
  final _formKey = GlobalKey<FormState>();
  
  String? _selectedType;
  double _amount = 0;
  bool _isLoading = false;

  final Map<String, String> _subscriptionTypes = {
    'MONTHLY': 'Mensuel',
    'QUARTERLY': 'Trimestriel',
    'YEARLY': 'Annuel',
  };

  final Map<String, double> _subscriptionPrices = {
    'MONTHLY': 5000,
    'QUARTERLY': 15000,
    'YEARLY': 50000,
  };

  @override
  void initState() {
    super.initState();
    _selectedType = 'MONTHLY';
    _amount = _subscriptionPrices['MONTHLY']!;
  }

  void _calculateAmount(String type) {
    setState(() {
      _amount = _subscriptionPrices[type] ?? 0;
    });
  }

  Future<void> _handleCreateSubscription() async {
    if (!_formKey.currentState!.validate() || _selectedType == null) return;

    setState(() => _isLoading = true);

    final subscriptionProvider = Provider.of<SubscriptionProvider>(context, listen: false);
    final success = await subscriptionProvider.createSubscription(
      childId: widget.childId,
      type: _parseSubscriptionType(_selectedType!),
      amount: _amount,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Abonnement créé avec succès!'),
          backgroundColor: AppColors.success,
        ),
      );
      var pending = subscriptionProvider.getPendingSubscriptionForChild(widget.childId);
      var subscriptionId = pending?.id;

      if (subscriptionId == null || subscriptionId.isEmpty) {
        await subscriptionProvider.fetchSubscriptionsByChild(widget.childId);
        pending = subscriptionProvider.getPendingSubscriptionForChild(widget.childId);
        subscriptionId = pending?.id;
      }

      if (subscriptionId == null || subscriptionId.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Impossible de recuperer l abonnement cree.'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
      final resolvedSubscriptionId = subscriptionId!;

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => PaymentScreen(
            subscriptionId: resolvedSubscriptionId,
            amount: _amount,
            childId: widget.childId,
          ),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(subscriptionProvider.errorMessage ?? 'Erreur lors de la création'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  SubscriptionType _parseSubscriptionType(String type) {
    // Cette fonction sera adaptée selon votre modèle de données
    switch (type) {
      case 'MONTHLY':
        return SubscriptionType.monthly;
      case 'QUARTERLY':
        return SubscriptionType.quarterly;
      case 'YEARLY':
        return SubscriptionType.yearly;
      default:
        return SubscriptionType.monthly;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Créer un abonnement'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppTheme.md),
                
                Text(
                  'Choisissez le type d\'abonnement',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                // Types d'abonnement
                ..._subscriptionTypes.entries.map((entry) {
                  final type = entry.key;
                  final label = entry.value;
                  final price = _subscriptionPrices[type] ?? 0;
                  final isSelected = _selectedType == type;
                  final monthsCount = type == 'QUARTERLY'
                      ? 3
                      : type == 'YEARLY'
                          ? 12
                          : 1;
                  final standardPrice = _subscriptionPrices['MONTHLY']! * monthsCount;
                  final savings = standardPrice - price;
                  final hasDiscount = savings > 0;
                  final discountPercent = hasDiscount ? (savings / standardPrice) * 100 : 0;
                  final isWholePercent = discountPercent == discountPercent.roundToDouble();
                  final discountLabel = hasDiscount
                      ? '-${discountPercent.toStringAsFixed(isWholePercent ? 0 : 1)}%'
                      : '';
                  
                  return Container(
                    margin: const EdgeInsets.only(bottom: AppTheme.md),
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _selectedType = type;
                          _calculateAmount(type);
                        });
                      },
                      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                      child: Container(
                        padding: const EdgeInsets.all(AppTheme.lg),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : AppColors.surface,
                          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.textTertiary.withOpacity(0.3),
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: isSelected ? AppColors.buttonShadow : AppColors.cardShadow,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    label,
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: isSelected ? Colors.white : AppColors.textPrimary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                if (hasDiscount) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: AppTheme.sm,
                                      vertical: AppTheme.xs,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isSelected ? Colors.white : AppColors.success,
                                      borderRadius: BorderRadius.circular(AppTheme.radiusSmall),
                                    ),
                                    child: Text(
                                      discountLabel,
                                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: isSelected ? AppColors.primary : Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: AppTheme.sm),
                            Text(
                              '${price.toStringAsFixed(0)} FCFA',
                              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: isSelected ? Colors.white : AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (hasDiscount) ...[
                              const SizedBox(height: AppTheme.xs),
                              Text(
                                'Au lieu de ${standardPrice.toStringAsFixed(0)} FCFA',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: isSelected ? Colors.white.withOpacity(0.8) : AppColors.textSecondary,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
                
                const SizedBox(height: AppTheme.xl),
                
                // Récapitulatif
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    boxShadow: AppColors.cardShadow,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Récapitulatif',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppTheme.md),
                      _SummaryRow(
                        label: 'Type d\'abonnement',
                        value: _subscriptionTypes[_selectedType] ?? 'Non sélectionné',
                      ),
                      const SizedBox(height: AppTheme.sm),
                      _SummaryRow(
                        label: 'Montant à payer',
                        value: '${_amount.toStringAsFixed(0)} FCFA',
                        isAmount: true,
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl),
                
                // Bouton de création
                CustomButton(
                  text: 'Continuer',
                  onPressed: _handleCreateSubscription,
                  isLoading: _isLoading,
                  fullWidth: true,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isAmount;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.isAmount = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: isAmount ? AppColors.primary : AppColors.textPrimary,
            fontWeight: isAmount ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}



