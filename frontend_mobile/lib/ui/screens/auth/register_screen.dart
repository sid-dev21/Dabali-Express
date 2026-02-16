import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../data/models/school_model.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/modern_text_field.dart';
import '../../widgets/modern_button.dart';
import '../main_shell.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _schoolController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String? _selectedSchoolId;
  bool _isLoadingSchools = false;
  String? _schoolsError;

  final List<SchoolModel> _schools = [];

  @override
  void initState() {
    super.initState();
    _loadSchools();
  }

  Future<void> _loadSchools() async {
    setState(() {
      _isLoadingSchools = true;
      _schoolsError = null;
    });

    try {
      final response = await ApiService().get(ApiConstants.publicSchools);
      final data = response.data;
      if (data is Map<String, dynamic> && data['success'] == true) {
        final list = (data['data'] as List<dynamic>? ?? [])
            .map((item) => SchoolModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (mounted) {
          setState(() {
            _schools
              ..clear()
              ..addAll(list);
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _schoolsError = data is Map<String, dynamic> ? (data['message'] as String? ?? 'Erreur de chargement des écoles') : 'Erreur de chargement des écoles';
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _schoolsError = 'Impossible de charger la liste des écoles';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingSchools = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _schoolController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Les mots de passe ne correspondent pas'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.register(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      phone: _phoneController.text.trim(),
    );

    setState(() => _isLoading = false);

    if (success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Compte créé avec succès!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const MainShell()),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Erreur d\'inscription'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppTheme.xl),
              
              // Header moderne
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(25),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.person_add,
                        color: Colors.white,
                        size: 50,
                      ),
                    ),
                    const SizedBox(height: AppTheme.lg),
                    Text(
                      'Créer votre compte',
                      style: GoogleFonts.poppins(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: AppTheme.sm),
                    Text(
                      'Rejoignez Dabali Express',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: AppTheme.xl),
              
              // Form
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    // Nom et Prénom modernes
                    Row(
                      children: [
                        Expanded(
                          child: ModernTextField(
                            controller: _firstNameController,
                            label: 'Prénom',
                            hintText: 'Marie',
                            prefixIcon: Icons.person_outline,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Veuillez entrer votre prénom';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: AppTheme.md),
                        Expanded(
                          child: ModernTextField(
                            controller: _lastNameController,
                            label: 'Nom',
                            hintText: 'Zongo',
                            prefixIcon: Icons.person_outline,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Veuillez entrer votre nom';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: AppTheme.md),
                    
                    // Email moderne
                    ModernTextField(
                      controller: _emailController,
                      label: 'Email',
                      hintText: 'zongo@example.com',
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Veuillez entrer votre email';
                        }
                        if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                          return 'Veuillez entrer un email valide';
                        }
                        return null;
                      },
                    ),
                    
                    const SizedBox(height: AppTheme.md),
                    
                    // Téléphone moderne
                    ModernTextField(
                      controller: _phoneController,
                      label: 'Téléphone',
                      hintText: '+226 70 55 55 55',
                      keyboardType: TextInputType.phone,
                      prefixIcon: Icons.phone_outlined,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Veuillez entrer votre numéro de téléphone';
                        }
                        return null;
                      },
                    ),
                    
                    const SizedBox(height: AppTheme.md),
                    
                    // École moderne
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        border: Border.all(
                          color: AppColors.textTertiary.withOpacity(0.3),
                          width: 1,
                        ),
                        boxShadow: AppColors.cardShadow,
                      ),
                      child: DropdownButtonFormField<String>(
                        value: _selectedSchoolId,
                        decoration: InputDecoration(
                          labelText: 'École',
                          hintText: _isLoadingSchools ? 'Chargement...' : 'Sélectionner une école',
                          prefixIcon: const Icon(Icons.school_outlined, color: AppColors.textTertiary),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.md,
                            vertical: AppTheme.md,
                          ),
                          labelStyle: GoogleFonts.inter(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          hintStyle: GoogleFonts.inter(
                            color: AppColors.textTertiary,
                            fontSize: 14,
                          ),
                        ),
                        items: _schools.map((school) {
                          return DropdownMenuItem<String>(
                            value: school.id,
                            child: Text(
                              school.name,
                              style: GoogleFonts.inter(
                                color: AppColors.textPrimary,
                                fontSize: 14,
                              ),
                            ),
                          );
                        }).toList(),
                        onTap: () {
                          if (_schools.isEmpty && !_isLoadingSchools) {
                            _loadSchools();
                          }
                        },
                        onChanged: (value) {
                          setState(() {
                            _selectedSchoolId = value;
                            final selected = _schools.firstWhere(
                              (school) => school.id == value,
                              orElse: () => SchoolModel(
                                id: '',
                                name: '',
                                address: '',
                                city: '',
                                studentCount: 0,
                                status: 'inactive',
                              ),
                            );
                            _schoolController.text = selected.name;
                          });
                        },
                        validator: (value) {
                          if (_schools.isEmpty) {
                            return _schoolsError ?? 'Aucune école disponible';
                          }
                          if (value == null || value.isEmpty) {
                            return 'Veuillez sélectionner une école';
                          }
                          return null;
                        },
                      ),
                    ),
                    
                    const SizedBox(height: AppTheme.md),
                    
                    // Mot de passe moderne
                    ModernTextField(
                      controller: _passwordController,
                      label: 'Mot de passe',
                      hintText: '••••••••',
                      obscureText: _obscurePassword,
                      prefixIcon: Icons.lock_outline,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          color: AppColors.textTertiary,
                        ),
                        onPressed: () {
                          setState(() => _obscurePassword = !_obscurePassword);
                        },
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Veuillez entrer un mot de passe';
                        }
                        if (value.length < 6) {
                          return 'Le mot de passe doit contenir au moins 6 caractères';
                        }
                        return null;
                      },
                    ),
                    
                    const SizedBox(height: AppTheme.md),
                    
                    // Confirmer le mot de passe moderne
                    ModernTextField(
                      controller: _confirmPasswordController,
                      label: 'Confirmer le mot de passe',
                      hintText: '••••••••',
                      obscureText: _obscureConfirmPassword,
                      prefixIcon: Icons.lock_outline,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          color: AppColors.textTertiary,
                        ),
                        onPressed: () {
                          setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                        },
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Veuillez confirmer votre mot de passe';
                        }
                        return null;
                      },
                    ),
                    
                    const SizedBox(height: AppTheme.xl),
                    
                    // Bouton d'inscription moderne
                    ModernButton(
                      text: 'S\'inscrire',
                      onPressed: _handleRegister,
                      isLoading: _isLoading,
                      fullWidth: true,
                      height: 56,
                    ),
                    
                    const SizedBox(height: AppTheme.lg),
                    
                    // Lien de connexion moderne
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Vous avez déjà un compte? ',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(builder: (context) => const LoginScreen()),
                            );
                          },
                          child: Text(
                            'Se connecter',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.secondaryDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


