import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../widgets/custom_button.dart';

class PaymentScreen extends StatefulWidget {
  final String subscriptionId;
  final VoidCallback? onPressed;
  final double amount;
  final String childId;

  const PaymentScreen({
    super.key,
    required this.subscriptionId,
    this.onPressed,
    required this.amount,
    required this.childId,
  });

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String? _selectedMethod;
  bool _isLoading = false;

  final Map<String, dynamic> _paymentMethods = {
    'ORANGE_MONEY': {
      'name': 'Orange Money',
      'icon': Icons.phone_android,
      'color': AppColors.orangeMoney,
    },
    'MOOV_MONEY': {
      'name': 'Moov Money',
      'icon': Icons.phone_iphone,
      'color': AppColors.moovMoney,
    },
    'WAVE': {
      'name': 'Wave',
      'icon': Icons.account_balance_wallet,
      'color': AppColors.info,
    },
    'CASH': {
      'name': 'Espèces',
      'icon': Icons.money,
      'color': AppColors.success,
    },
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Paiement'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppTheme.md),
              
              // Montant à payer
              Container(
                padding: const EdgeInsets.all(AppTheme.lg),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                ),
                child: Column(
                  children: [
                    Text(
                      'Montant à payer',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: AppTheme.sm),
                    Text(
                      '${widget.amount.toStringAsFixed(0)} FCFA',
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppTheme.xl),
              
              // Méthodes de paiement
              Text(
                'Choisissez une méthode de paiement',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              
              const SizedBox(height: AppTheme.lg),
              
              ..._paymentMethods.entries.map((entry) {
                final method = entry.key;
                final details = entry.value;
                final isSelected = _selectedMethod == method;
                
                return Container(
                  margin: const EdgeInsets.only(bottom: AppTheme.md),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _selectedMethod = method;
                      });
                    },
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    child: Container(
                      padding: const EdgeInsets.all(AppTheme.lg),
                      decoration: BoxDecoration(
                        color: isSelected ? details['color'] : AppColors.surface,
                        borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                        border: Border.all(
                          color: isSelected ? details['color'] : AppColors.textTertiary.withOpacity(0.3),
                          width: isSelected ? 2 : 1,
                        ),
                        boxShadow: isSelected ? AppColors.buttonShadow : AppColors.cardShadow,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 50,
                            height: 50,
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white.withOpacity(0.2) : details['color']?.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            ),
                            child: Icon(
                              details['icon'],
                              color: isSelected ? Colors.white : details['color'],
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: AppTheme.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  details['name'],
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: isSelected ? Colors.white : AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: AppTheme.xs),
                                Text(
                                  _getPaymentDescription(method),
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: isSelected ? Colors.white.withOpacity(0.8) : AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected) ...[
                            Icon(
                              Icons.check_circle,
                              color: Colors.white,
                              size: 24,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
              
              const SizedBox(height: AppTheme.xl),
              
              // Instructions
              if (_selectedMethod != null) ...[
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.info.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    border: Border.all(color: AppColors.info.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: AppColors.info,
                            size: 20,
                          ),
                          const SizedBox(width: AppTheme.sm),
                          Text(
                            'Instructions',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: AppColors.info,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppTheme.md),
                      Text(
                        _getPaymentInstructions(_selectedMethod!),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl),
              ],
              
              // Bouton de paiement
              CustomButton(
                text: _selectedMethod != null ? 'Confirmer le paiement' : 'Sélectionnez une méthode',
                onPressed: _selectedMethod != null ? () => _handlePayment() : null,
                isLoading: _isLoading,
                fullWidth: true,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getPaymentDescription(String method) {
    switch (method) {
      case 'ORANGE_MONEY':
        return 'Paiement via Orange Money';
      case 'MOOV_MONEY':
        return 'Paiement via Moov Money';
      case 'WAVE':
        return 'Paiement via Wave';
      case 'CASH':
        return 'Paiement en espèces à l\'école';
      default:
        return 'Méthode de paiement';
    }
  }

  String _getPaymentInstructions(String method) {
    switch (method) {
      case 'ORANGE_MONEY':
        return '1. Composez *144#* et envoyez à 12345\n2. Entrez le code reçu pour valider\n3. Gardez votre code de transaction';
      case 'MOOV_MONEY':
        return '1. Composez *155#* et envoyez à 12345\n2. Entrez le code reçu pour valider\n3. Gardez votre code de transaction';
      case 'WAVE':
        return '1. Scannez le code QR avec l\'application Wave\n2. Confirmez le paiement dans l\'application\n3. Le paiement sera validé instantanément';
      case 'CASH':
        return '1. Rendez-vous à l\'administration de l\'école\n2. Présentez ce code de paiement\n3. Payez le montant en espèces\n4. Recevez une confirmation immédiate';
      default:
        return 'Instructions de paiement';
    }
  }

  Future<void> _handlePayment() async {
    if (_selectedMethod == null) return;

    setState(() => _isLoading = true);

    // Simuler le traitement du paiement
    await Future.delayed(const Duration(seconds: 3));

    setState(() => _isLoading = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Paiement simulé avec succès!'),
          backgroundColor: AppColors.success,
        ),
      );
      
      // Retourner à l'écran précédent
      Navigator.of(context).pop();
      Navigator.of(context).pop();
    }
  }
}
