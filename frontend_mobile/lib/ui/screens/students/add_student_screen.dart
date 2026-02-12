import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/school_model.dart';
import '../../../data/repositories/school_repository.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/student_provider.dart';

class AddStudentScreen extends StatefulWidget {
  const AddStudentScreen({super.key});

  @override
  State<AddStudentScreen> createState() => _AddStudentScreenState();
}

class _AddStudentScreenState extends State<AddStudentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _classNameController = TextEditingController();
  final SchoolRepository _schoolRepository = SchoolRepository();

  List<SchoolModel> _schools = [];
  String? _selectedSchoolId;
  bool _isLoadingSchools = true;

  @override
  void initState() {
    super.initState();
    _loadSchools();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _classNameController.dispose();
    super.dispose();
  }

  Future<void> _loadSchools() async {
    setState(() => _isLoadingSchools = true);
    final schools = await _schoolRepository.getSchools();
    if (!mounted) return;
    setState(() {
      _schools = schools;
      _selectedSchoolId = schools.isNotEmpty ? schools.first.id : null;
      _isLoadingSchools = false;
    });
  }

  Future<void> _saveStudent() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = context.read<AuthProvider>();
    final studentProvider = context.read<StudentProvider>();
    final user = authProvider.currentUser;

    if (user == null) return;

    final success = await studentProvider.addStudent(
      parentId: user.id,
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      className: _classNameController.text.trim().isEmpty
          ? null
          : _classNameController.text.trim(),
      schoolId: _selectedSchoolId!,
    );

    if (!mounted) return;

    if (success) {
      Navigator.pop(context, true);
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(studentProvider.errorMessage ?? 'Erreur lors de l\'ajout'),
        backgroundColor: AppColors.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ajouter un enfant')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _firstNameController,
                  decoration: const InputDecoration(
                    labelText: 'Prénom',
                    prefixIcon: Icon(Icons.person),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Prénom requis';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _lastNameController,
                  decoration: const InputDecoration(
                    labelText: 'Nom',
                    prefixIcon: Icon(Icons.badge),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Nom requis';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _classNameController,
                  decoration: const InputDecoration(
                    labelText: 'Classe (optionnel)',
                    prefixIcon: Icon(Icons.class_),
                  ),
                ),
                const SizedBox(height: 12),
                _isLoadingSchools
                    ? const LinearProgressIndicator()
                    : DropdownButtonFormField<String>(
                        value: _selectedSchoolId,
                        decoration: const InputDecoration(
                          labelText: 'École',
                          prefixIcon: Icon(Icons.school),
                        ),
                        items: _schools.map((school) {
                          final subtitle = school.city?.isNotEmpty == true
                              ? ' - ${school.city}'
                              : '';
                          return DropdownMenuItem<String>(
                            value: school.id,
                            child: Text('${school.name}$subtitle'),
                          );
                        }).toList(),
                        validator: (value) =>
                            value == null || value.isEmpty ? 'École requise' : null,
                        onChanged: (value) {
                          setState(() {
                            _selectedSchoolId = value;
                          });
                        },
                      ),
                if (!_isLoadingSchools && _schools.isEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Aucune école disponible. Contacte l\'admin.',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
                const SizedBox(height: 24),
                Consumer<StudentProvider>(
                  builder: (context, provider, _) {
                    return SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: provider.isLoading || _schools.isEmpty
                            ? null
                            : _saveStudent,
                        icon: provider.isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.save),
                        label: const Text('Enregistrer'),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
