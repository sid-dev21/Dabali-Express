import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/child_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_constants.dart';
import '../../../data/models/school_model.dart';
import '../../../data/services/api_service.dart';
import '../../widgets/modern_button.dart';
import '../../widgets/modern_text_field.dart';

class AddChildScreen extends StatefulWidget {
  const AddChildScreen({super.key});

  @override
  State<AddChildScreen> createState() => _AddChildScreenState();
}

class _AddChildScreenState extends State<AddChildScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dateOfBirthController = TextEditingController();
  final _classNameController = TextEditingController();
  final _studentCodeController = TextEditingController();
  final _schoolController = TextEditingController();

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
            _schoolsError = data is Map<String, dynamic>
                ? (data['message'] as String? ?? 'Erreur de chargement des Ã©coles')
                : 'Erreur de chargement des Ã©coles';
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _schoolsError = 'Impossible de charger la liste des Ã©coles';
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
  bool _isInvalidCredentialsError(String? message) {
    final lower = (message ?? '').toLowerCase();
    return lower.contains('pdf') ||
        (lower.contains('identifiant') &&
            (lower.contains('incorrect') || lower.contains('invalide')));
  }

  String _formatAddChildError(String? message) {
    if (_isInvalidCredentialsError(message)) {
      return 'Identifiants de l\'enfant incorrects.';
    }
    return message ?? 'Erreur lors de l\'ajout';
  }

  void _resetForm() {
    _formKey.currentState?.reset();
    _firstNameController.clear();
    _lastNameController.clear();
    _dateOfBirthController.clear();
    _classNameController.clear();
    _studentCodeController.clear();
    _schoolController.clear();
    setState(() {
      _selectedSchoolId = null;
    });
  }
  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dateOfBirthController.dispose();
    _classNameController.dispose();
    _studentCodeController.dispose();
    _schoolController.dispose();
    super.dispose();
  }

  Future<void> _handleAddChild() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final childProvider = Provider.of<ChildProvider>(context, listen: false);
    final success = await childProvider.addChild(
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      dateOfBirth: _dateOfBirthController.text,
      className: _classNameController.text.trim(),
      studentCode: _studentCodeController.text.trim().isEmpty
          ? null
          : _studentCodeController.text.trim(),
      schoolId: _selectedSchoolId,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enfant ajouté avec succès!'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop();
    } else if (mounted) {
      final rawErrorMessage = childProvider.errorMessage;
      if (_isInvalidCredentialsError(rawErrorMessage)) {
        _resetForm();
        await childProvider.fetchChildren();
        if (!mounted) return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_formatAddChildError(rawErrorMessage)),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Ajouter un enfant',
          style: GoogleFonts.poppins(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(
          color: AppColors.textPrimary,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppTheme.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header moderne
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.3),
                              blurRadius: 15,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.child_care,
                          color: Colors.white,
                          size: 40,
                        ),
                      ),
                      const SizedBox(height: AppTheme.lg),
                      Text(
                        'Informations de l\'enfant',
                        style: GoogleFonts.poppins(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: AppTheme.sm),
                      Text(
                        'Remplissez les informations pour ajouter votre enfant',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl),
                
                // Nom et PrÃ©nom modernes
                Row(
                  children: [
                    Expanded(
                      child: ModernTextField(
                        controller: _firstNameController,
                        label: 'PrÃ©nom',
                        hintText: 'Boureima',
                        prefixIcon: Icons.person_outline,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Veuillez entrer le prÃ©nom';
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
                            return 'Veuillez entrer le nom';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                // Date de naissance moderne
                ModernTextField(
                  controller: _dateOfBirthController,
                  label: 'Date de naissance',
                  hintText: '2014-05-10',
                  prefixIcon: Icons.calendar_today_outlined,
                  readOnly: true,
                  onTap: () async {
                    final now = DateTime.now();
                    final firstDate = DateTime(now.year - 18, 1, 1);
                    final lastDate = DateTime(now.year - 3, 12, 31);
                    final initialDate = DateTime(now.year - 5, 6, 15);

                    final date = await showDatePicker(
                      context: context,
                      initialDate: initialDate,
                      firstDate: firstDate,
                      lastDate: lastDate,
                    );
                    if (date != null) {
                      _dateOfBirthController.text = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
                    }
                  },
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer la date de naissance';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                // Classe moderne
                ModernTextField(
                  controller: _classNameController,
                  label: 'Classe',
                  hintText: 'CM1',
                  prefixIcon: Icons.school_outlined,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Veuillez entrer la classe';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: AppTheme.lg),

                // Code Ã©lÃ¨ve (matricule)
                ModernTextField(
                  controller: _studentCodeController,
                  label: 'Code Ã©lÃ¨ve (matricule)',
                  hintText: 'EX: CM1-025',
                  prefixIcon: Icons.badge_outlined,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Veuillez entrer le code Ã©lÃ¨ve';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                // Ã‰cole moderne
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
                      labelText: 'Ã‰cole',
                      hintText: _isLoadingSchools ? 'Chargement...' : 'SÃ©lectionner une Ã©cole',
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
                        return _schoolsError ?? 'Aucune Ã©cole disponible';
                      }
                      if (value == null || value.isEmpty) {
                        return 'Veuillez sÃ©lectionner une Ã©cole';
                      }
                      return null;
                    },
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl * 2),
                
                // Bouton d'ajout moderne
                ModernButton(
                  text: 'Ajouter l\'enfant',
                  onPressed: _handleAddChild,
                  isLoading: _isLoading,
                  fullWidth: true,
                  height: 56,
                ),
                
                const SizedBox(height: AppTheme.lg),
                
                // Information moderne
                Container(
                  padding: const EdgeInsets.all(AppTheme.lg),
                  decoration: BoxDecoration(
                    color: AppColors.info.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    border: Border.all(color: AppColors.info.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.info.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.info_outline,
                          color: AppColors.info,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: AppTheme.md),
                      Expanded(
                        child: Text(
                          'L\'enfant sera lié à votre compte parent.',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: AppColors.info,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


