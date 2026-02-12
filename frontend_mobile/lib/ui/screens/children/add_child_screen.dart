import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../providers/child_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/app_colors.dart';
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
  final _schoolController = TextEditingController();

  bool _isLoading = false;
  String? _selectedSchool;

  final List<String> _schools = [
    'Lycée Philippe Zinda Kaboré',
    'Groupe Scolaire Horizon',
    'École Primaire de Bobo',
    'Collège de Koudougou',
  ];

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dateOfBirthController.dispose();
    _classNameController.dispose();
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
      schoolId: _selectedSchool,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Demande d\'ajout envoyée avec succès!'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop();
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(childProvider.errorMessage ?? 'Erreur lors de l\'ajout'),
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
                
                // Nom et Prénom modernes
                Row(
                  children: [
                    Expanded(
                      child: ModernTextField(
                        controller: _firstNameController,
                        label: 'Prénom',
                        hintText: 'Boureima',
                        prefixIcon: Icons.person_outline,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Veuillez entrer le prénom';
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
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
                      firstDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
                      lastDate: DateTime.now().subtract(const Duration(days: 365 * 3)),
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
                    value: _selectedSchool,
                    decoration: InputDecoration(
                      labelText: 'École',
                      hintText: 'Sélectionner une école',
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
                        value: school,
                        child: Text(
                          school,
                          style: GoogleFonts.inter(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedSchool = value;
                        _schoolController.text = value ?? '';
                      });
                    },
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Veuillez sélectionner une école';
                      }
                      return null;
                    },
                  ),
                ),
                
                const SizedBox(height: AppTheme.xl * 2),
                
                // Bouton d'ajout moderne
                ModernButton(
                  text: 'Envoyer la demande',
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
                          'La demande sera envoyée à l\'administrateur de l\'école pour validation.',
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
