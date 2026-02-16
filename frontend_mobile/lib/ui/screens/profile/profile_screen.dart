import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  void _showMessage(String message, {Color? backgroundColor}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
      ),
    );
  }

  Future<void> _openUpdateEmailDialog(BuildContext context, String currentEmail) async {
    final formKey = GlobalKey<FormState>();
    final emailController = TextEditingController(text: currentEmail);
    final passwordController = TextEditingController();
    bool obscurePassword = true;
    bool isSubmitting = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Modifier l email'),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CustomTextField(
                      controller: emailController,
                      label: 'Nouvel email',
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      validator: (value) {
                        final normalized = value?.trim() ?? '';
                        if (normalized.isEmpty) return 'Veuillez entrer un email';
                        if (!RegExp(r'^[\w\.-]+@([\w-]+\.)+[\w-]{2,}$').hasMatch(normalized)) {
                          return 'Email invalide';
                        }
                        if (normalized.toLowerCase() == currentEmail.toLowerCase()) {
                          return 'Cet email est deja utilise';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppTheme.md),
                    CustomTextField(
                      controller: passwordController,
                      label: 'Mot de passe actuel',
                      obscureText: obscurePassword,
                      prefixIcon: Icons.lock_outline,
                      suffixIcon: IconButton(
                        icon: Icon(
                          obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        ),
                        onPressed: () {
                          setDialogState(() {
                            obscurePassword = !obscurePassword;
                          });
                        },
                      ),
                      validator: (value) {
                        if ((value ?? '').isEmpty) return 'Mot de passe actuel requis';
                        return null;
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(dialogContext).pop(),
                  child: const Text('Annuler'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;

                          setDialogState(() => isSubmitting = true);
                          final success = await context.read<AuthProvider>().updateEmail(
                                newEmail: emailController.text.trim(),
                                currentPassword: passwordController.text,
                              );

                          if (!mounted) return;

                          if (success) {
                            Navigator.of(dialogContext).pop();
                            _showMessage(
                              'Email mis a jour avec succes.',
                              backgroundColor: AppColors.success,
                            );
                            return;
                          }

                          setDialogState(() => isSubmitting = false);
                          _showMessage(
                            context.read<AuthProvider>().errorMessage ?? 'Erreur lors de la mise a jour',
                            backgroundColor: AppColors.error,
                          );
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enregistrer'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _openUpdatePasswordDialog(BuildContext context) async {
    final formKey = GlobalKey<FormState>();
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool obscureCurrent = true;
    bool obscureNew = true;
    bool obscureConfirm = true;
    bool isSubmitting = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Changer le mot de passe'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CustomTextField(
                        controller: currentPasswordController,
                        label: 'Mot de passe actuel',
                        obscureText: obscureCurrent,
                        prefixIcon: Icons.lock_outline,
                        suffixIcon: IconButton(
                          icon: Icon(
                            obscureCurrent ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setDialogState(() {
                              obscureCurrent = !obscureCurrent;
                            });
                          },
                        ),
                        validator: (value) {
                          if ((value ?? '').isEmpty) return 'Mot de passe actuel requis';
                          return null;
                        },
                      ),
                      const SizedBox(height: AppTheme.md),
                      CustomTextField(
                        controller: newPasswordController,
                        label: 'Nouveau mot de passe',
                        obscureText: obscureNew,
                        prefixIcon: Icons.lock_reset,
                        suffixIcon: IconButton(
                          icon: Icon(
                            obscureNew ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setDialogState(() {
                              obscureNew = !obscureNew;
                            });
                          },
                        ),
                        validator: (value) {
                          final password = value ?? '';
                          if (password.isEmpty) return 'Nouveau mot de passe requis';
                          if (!RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$').hasMatch(password)) {
                            return 'Au moins 8 caracteres avec majuscule, minuscule et chiffre';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppTheme.md),
                      CustomTextField(
                        controller: confirmPasswordController,
                        label: 'Confirmer le nouveau mot de passe',
                        obscureText: obscureConfirm,
                        prefixIcon: Icons.lock_reset,
                        suffixIcon: IconButton(
                          icon: Icon(
                            obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setDialogState(() {
                              obscureConfirm = !obscureConfirm;
                            });
                          },
                        ),
                        validator: (value) {
                          if ((value ?? '').isEmpty) return 'Confirmation requise';
                          if (value != newPasswordController.text) {
                            return 'Les mots de passe ne correspondent pas';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(dialogContext).pop(),
                  child: const Text('Annuler'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;

                          setDialogState(() => isSubmitting = true);
                          final success = await context.read<AuthProvider>().updatePassword(
                                currentPassword: currentPasswordController.text,
                                newPassword: newPasswordController.text,
                                confirmNewPassword: confirmPasswordController.text,
                              );

                          if (!mounted) return;

                          if (success) {
                            Navigator.of(dialogContext).pop();
                            _showMessage(
                              'Mot de passe mis a jour avec succes.',
                              backgroundColor: AppColors.success,
                            );
                            return;
                          }

                          setDialogState(() => isSubmitting = false);
                          _showMessage(
                            context.read<AuthProvider>().errorMessage ?? 'Erreur lors de la mise a jour',
                            backgroundColor: AppColors.error,
                          );
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enregistrer'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          final user = authProvider.currentUser;

          if (user == null) {
            return const Center(
              child: Text('Utilisateur non trouve'),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppTheme.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppTheme.md),
                Center(
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(AppTheme.radiusXLarge),
                    ),
                    child: Icon(
                      Icons.person,
                      color: AppColors.primary,
                      size: 60,
                    ),
                  ),
                ),
                const SizedBox(height: AppTheme.xl),
                Text(
                  'Informations personnelles',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: AppTheme.lg),
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
                    boxShadow: AppColors.cardShadow,
                  ),
                  child: Column(
                    children: [
                      _ProfileItem(
                        icon: Icons.person_outline,
                        label: 'Nom complet',
                        value: user.fullName,
                      ),
                      const Divider(),
                      _ProfileItem(
                        icon: Icons.email_outlined,
                        label: 'Email',
                        value: user.email,
                      ),
                      const Divider(),
                      _ProfileItem(
                        icon: Icons.phone_outlined,
                        label: 'Telephone',
                        value: user.phone ?? '',
                      ),
                      const Divider(),
                      _ProfileItem(
                        icon: Icons.school_outlined,
                        label: 'Role',
                        value: user.role,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTheme.xl),
                Text(
                  'Actions',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: AppTheme.lg),
                CustomButton(
                  text: 'Modifier l email',
                  onPressed: authProvider.isLoading
                      ? null
                      : () => _openUpdateEmailDialog(context, user.email),
                  isLoading: authProvider.isLoading,
                  fullWidth: true,
                ),
                const SizedBox(height: AppTheme.md),
                CustomButton(
                  text: 'Changer le mot de passe',
                  onPressed: authProvider.isLoading
                      ? null
                      : () => _openUpdatePasswordDialog(context),
                  backgroundColor: AppColors.secondary,
                  isLoading: authProvider.isLoading,
                  fullWidth: true,
                ),
                const SizedBox(height: AppTheme.xl),
                CustomButton(
                  text: 'Se deconnecter',
                  onPressed: () async {
                    await authProvider.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                        (route) => false,
                      );
                    }
                  },
                  backgroundColor: AppColors.error,
                  fullWidth: true,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProfileItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ProfileItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTheme.sm),
      child: Row(
        children: [
          Icon(
            icon,
            color: AppColors.textSecondary,
            size: 20,
          ),
          const SizedBox(width: AppTheme.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                ),
                const SizedBox(height: AppTheme.xs),
                Text(
                  value,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
