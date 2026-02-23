import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/child_provider.dart';
import '../../../providers/subscription_provider.dart';
import '../../../data/models/subscription_model.dart';
import '../../../data/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/custom_button.dart';
import '../payments/payment_screen.dart';

class CreateSubscriptionScreen extends StatefulWidget {
  final String childId;
  final String? schoolId;

  const CreateSubscriptionScreen({
    super.key,
    required this.childId,
    this.schoolId,
  });

  @override
  State<CreateSubscriptionScreen> createState() => _CreateSubscriptionScreenState();
}

class _CreateSubscriptionScreenState extends State<CreateSubscriptionScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();

  String? _selectedType;
  double _amount = 0;
  bool _isLoading = false;
  bool _isTariffsLoading = false;

  final Map<String, String> _subscriptionTypes = {
    'MONTHLY': 'Mensuel',
    'QUARTERLY': 'Trimestriel',
    'YEARLY': 'Annuel',
  };

  Map<String, double> _subscriptionPrices = {
    'MONTHLY': 5000,
    'QUARTERLY': 15000,
    'YEARLY': 50000,
  };

  @override
  void initState() {
    super.initState();
    _selectedType = 'MONTHLY';
    _amount = _subscriptionPrices['MONTHLY']!;
    _loadTariffs();
  }

  void _calculateAmount(String type) {
    _amount = _subscriptionPrices[type] ?? 0;
  }

  String _resolveSchoolId() {
    final fromWidget = (widget.schoolId ?? '').trim();
    if (fromWidget.isNotEmpty) return fromWidget;

    try {
      final childProvider = Provider.of<ChildProvider>(context, listen: false);
      final child = childProvider.getChildById(widget.childId);
      final fromChild = (child?.schoolId ?? '').trim();
      if (fromChild.isNotEmpty) return fromChild;
    } catch (_) {
      // ChildProvider may not be available on some navigation stacks.
    }

    return '';
  }

  double _toPositiveAmount(dynamic value, double fallback) {
    final parsed = double.tryParse(value?.toString() ?? '');
    if (parsed == null || parsed <= 0) return fallback;
    return parsed;
  }

  Future<void> _loadTariffs() async {
    final schoolId = _resolveSchoolId();
    if (schoolId.isEmpty) return;

    setState(() => _isTariffsLoading = true);
    try {
      final response = await _apiService.get('/schools/$schoolId/tariffs');
      final body = response.data;
      if (body is! Map<String, dynamic> || body['success'] != true) {
        return;
      }
      final payload = body['data'];
      if (payload is! Map<String, dynamic>) {
        return;
      }
      final rates = payload['rates'];
      if (rates is! Map<String, dynamic>) {
        return;
      }

      final nextPrices = <String, double>{
        'MONTHLY': _toPositiveAmount(rates['monthly'], _subscriptionPrices['MONTHLY'] ?? 5000),
        'QUARTERLY': _toPositiveAmount(rates['quarterly'], _subscriptionPrices['QUARTERLY'] ?? 15000),
        'YEARLY': _toPositiveAmount(rates['yearly'], _subscriptionPrices['YEARLY'] ?? 50000),
      };

      if (!mounted) return;
      setState(() {
        _subscriptionPrices = nextPrices;
        _calculateAmount(_selectedType ?? 'MONTHLY');
      });
    } catch (_) {
      // Keep fallback values when tariffs endpoint is unavailable.
    } finally {
      if (mounted) {
        setState(() => _isTariffsLoading = false);
      }
    }
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
          content: Text('Abonnement cree avec succes!'),
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
      final resolvedSubscriptionId = subscriptionId;

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => PaymentScreen(
            subscriptionId: resolvedSubscriptionId!,
            amount: _amount,
            childId: widget.childId,
          ),
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(subscriptionProvider.errorMessage ?? 'Erreur lors de la creation'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  SubscriptionType _parseSubscriptionType(String type) {
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
        title: const Text('Creer un abonnement'),
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
                const SizedBox(height: AppTheme.sm),
                Text(
                  _isTariffsLoading
                      ? 'Chargement des tarifs de votre ecole...'
                      : 'Les tarifs affiches sont ceux configures par votre ecole.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),

                const SizedBox(height: AppTheme.lg),

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
                  final standardPrice = (_subscriptionPrices['MONTHLY'] ?? 0) * monthsCount;
                  final savings = standardPrice > 0 ? (standardPrice - price) : 0;
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
                        'Recapitulatif',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: AppTheme.md),
                      _SummaryRow(
                        label: 'Type d\'abonnement',
                        value: _subscriptionTypes[_selectedType] ?? 'Non selectionne',
                      ),
                      const SizedBox(height: AppTheme.sm),
                      _SummaryRow(
                        label: 'Montant a payer',
                        value: '${_amount.toStringAsFixed(0)} FCFA',
                        isAmount: true,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppTheme.xl),

                CustomButton(
                  text: 'Continuer',
                  onPressed: _isTariffsLoading ? null : _handleCreateSubscription,
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
