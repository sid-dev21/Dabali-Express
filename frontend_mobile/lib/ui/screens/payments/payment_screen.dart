import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../../providers/subscription_provider.dart';
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
  bool _showCodeInput = false;
  String _enteredCode = '';
  final TextEditingController _codeController = TextEditingController();

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
      'name': 'Especes',
      'icon': Icons.money,
      'color': AppColors.success,
    },
  };

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

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

              Container(
                padding: const EdgeInsets.all(AppTheme.lg),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                ),
                child: Column(
                  children: [
                    Text(
                      'Montant a payer',
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

              Text(
                'Choisissez une methode de paiement',
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
                          if (isSelected)
                            const Icon(
                              Icons.check_circle,
                              color: Colors.white,
                              size: 24,
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),

              const SizedBox(height: AppTheme.xl),

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

              if (!_showCodeInput) ...[
                CustomButton(
                  text: _selectedMethod != null ? 'Confirmer le paiement' : 'Selectionnez une methode',
                  onPressed: _selectedMethod != null ? () => _handlePaymentMethodSelection() : null,
                  isLoading: _isLoading,
                  fullWidth: true,
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    border: Border.all(color: AppColors.textTertiary.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Entrez votre code a 4 chiffres',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: AppTheme.md),
                      TextField(
                        controller: _codeController,
                        keyboardType: TextInputType.number,
                        maxLength: 4,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: 8,
                            ),
                        decoration: InputDecoration(
                          counterText: '',
                          hintText: '1234',
                          hintStyle: TextStyle(
                            color: AppColors.textTertiary,
                            letterSpacing: 8,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            borderSide: BorderSide(color: AppColors.textTertiary.withOpacity(0.3)),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            borderSide: BorderSide(color: AppColors.primary, width: 2),
                          ),
                        ),
                        onChanged: (value) {
                          setState(() {
                            _enteredCode = value;
                          });
                        },
                      ),
                      const SizedBox(height: AppTheme.lg),
                      CustomButton(
                        text: 'Valider',
                        onPressed: _enteredCode.length == 4 ? () => _handleCodeConfirmation() : null,
                        isLoading: _isLoading,
                        fullWidth: true,
                      ),
                      const SizedBox(height: AppTheme.md),
                      CustomButton(
                        text: 'Annuler',
                        onPressed: () => _cancelCodeInput(),
                        fullWidth: true,
                        backgroundColor: AppColors.textSecondary,
                      ),
                    ],
                  ),
                ),
              ],
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
        return 'Paiement en especes a l ecole';
      default:
        return 'Methode de paiement';
    }
  }

  String _getPaymentInstructions(String method) {
    switch (method) {
      case 'ORANGE_MONEY':
      case 'MOOV_MONEY':
      case 'WAVE':
        return '1. Lancez le paiement mobile money\n2. Le paiement sera en attente\n3. L administration validera ensuite l abonnement';
      case 'CASH':
        return '1. Rendez-vous a l administration\n2. Payez en especes\n3. Le paiement reste en attente jusqu a validation admin';
      default:
        return 'Instructions de paiement';
    }
  }

  Future<void> _handlePaymentMethodSelection() async {
    if (_selectedMethod == null) return;

    final provider = context.read<SubscriptionProvider>();
    setState(() => _isLoading = true);

    final result = await provider.initiatePayment(
      subscriptionId: widget.subscriptionId,
      amount: widget.amount,
      paymentMethod: _selectedMethod!,
    );

    setState(() => _isLoading = false);
    if (!mounted) return;

    if (result['success'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Erreur lors de l initialisation du paiement'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result['message'] ?? 'Paiement initialise'),
        backgroundColor: AppColors.info,
      ),
    );

    final needsCode = result['codeRequired'] == true;

    if (!needsCode) {
      await provider.fetchSubscriptionsByChild(widget.childId);
      if (!mounted) return;

      if (widget.onPressed != null) {
        widget.onPressed!();
        return;
      }

      Navigator.of(context).pop();
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
      return;
    }

    setState(() {
      _showCodeInput = true;
    });
  }

  void _cancelCodeInput() {
    setState(() {
      _showCodeInput = false;
      _enteredCode = '';
      _codeController.clear();
    });
  }

  Future<void> _handleCodeConfirmation() async {
    if (_enteredCode.length != 4 || _selectedMethod == null) return;

    final provider = context.read<SubscriptionProvider>();
    setState(() => _isLoading = true);

    final result = await provider.confirmPayment(
      // Backend confirm route uses subscription id: /subscriptions/:subscriptionId/payment/confirm
      paymentId: widget.subscriptionId,
      paymentMethod: _selectedMethod!,
      code: _enteredCode,
    );

    setState(() => _isLoading = false);
    if (!mounted) return;

    if (result['success'] != true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Code invalide'),
          backgroundColor: AppColors.error,
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    await provider.fetchSubscriptionsByChild(widget.childId);
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result['message'] ?? 'Paiement effectue avec succes'),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 3),
      ),
    );

    _cancelCodeInput();

    if (widget.onPressed != null) {
      widget.onPressed!();
      return;
    }

    Navigator.of(context).pop();
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }
}
